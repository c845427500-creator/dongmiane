# 懂面鹅 AI 升级规格说明

## 一、项目背景

懂面鹅是一个 AI 面试互动体验产品，面向对 AI 面试感到焦虑的求职者。产品通过「用 AI 拆解 AI 面试黑箱」的方式消除用户恐惧。

- 技术栈：Next.js 16 + TypeScript + Tailwind CSS v4 + Shadcn UI + Framer Motion + DeepSeek API
- 部署：Vercel (https://dongmiane.vercel.app)
- API Key 存储：localStorage（用户自带 Key）

---

## 二、当前 AI 使用情况

```
模块一：担忧收集 + 词云         AI：❌ 无
模块二：黑箱爆破
  ① 预测投票                    AI：❌ 无
  ② 辩论                        AI：✅ generateDebate
  ③ 实测                        AI：✅ scoreAnswer（旧版3维度）
  ④ 反转                        AI：❌ 用 data.ts 写死文案
  ⑤ 爆破                        AI：❌ 无
模块三：干货手册                 AI：❌ 无
```

仅 2 处用了 AI，均为单次调用，无上下文关联。

---

## 三、升级一：评分模型重构（腾讯 BBSI 体系）

### 3.1 当前问题

旧版 `buildScorePrompt` 只有随意 3 维度（逻辑/内容/表达）+ 一句话 system prompt。无学术依据、无行为锚定、无法解释。

### 3.2 新评分体系

完全采用腾讯 TVM + BBSI 方法论：

**四维评分体系（0-3-6-10 BARS 锚定，总分 40）：**

| 维度 | 来源 | 考察内容 |
|------|------|----------|
| 逻辑思维 | 腾讯 BBSI | 分析推理、结构化表达、因果判断 |
| 问题解决 | 腾讯 BBSI | 独立攻关、方案设计、落地执行 |
| 沟通协作 | 腾讯 BBSI | 有效沟通、团队合作、跨角色协调 |
| 价值观匹配 | 腾讯五大价值观 | 正直、进取、协作、创造、共赢 |

每个维度 4 级 BARS 行为锚定：

```
10分（卓越）：框架化思考 + 量化数据 + 可验证结论
6分（良好）：有层次结构 + 具体步骤，缺量化
3分（基础）：有结构意识但停留在描述层
0分（不足）：散乱、无逻辑、答非所问
```

具体 BARS 描述见 [plan file](file:///Users/cailin/.claude/plans/precious-herding-forest.md) 第四章 system prompt。

**STAR 约束规则（关键）：**
- 缺 A（行动）→ 所有维度封顶 3 分
- 缺 R（结果）→ 所有维度封顶 6 分
- 原则："没有行为 = 没有证据，没有结果 = 没有验证"

### 3.3 新 Prompt 结构

见 plan file 第四章 system prompt。核心要求：
- 每维度只能取 0/3/6/10
- 必须引用原文作为行为证据
- 必须独立评估 STAR 四要素
- temperature 改为 0.1
- max_tokens 改为 1500

### 3.4 输出 JSON 结构

```typescript
interface ScoreResult {
  dimensions: {
    logical_thinking: DimensionScore;
    problem_solving: DimensionScore;
    communication_collaboration: DimensionScore;
    value_alignment: DimensionScore;
  };
  star_assessment: {
    has_situation: boolean;
    has_task: boolean;
    has_action: boolean;
    has_result: boolean;
    completeness: "完整" | "部分" | "缺失";
    star_constraint_applied: "none" | "action_missing_capped_3" | "result_missing_capped_6";
  };
  total_score: number; // 0-40
  tencent_fit: "高度匹配" | "基本匹配" | "需观察" | "不匹配";
  overall_comment: string; // 80-120字
  improvement_suggestions: [string, string];
  truth: string; // 80-150字
  mechanism: string; // 80-150字
}

interface DimensionScore {
  score: 0 | 3 | 6 | 10;
  evidence: string; // 从回答中引用的原文
  bars_match: string; // 匹配到的BARS等级描述
}
```

### 3.5 涉及文件

- `lib/prompts.ts` — 替换 `buildScorePrompt` 为腾讯 BBSI 版本
- `lib/deepseek-client.ts` — 更新 `ScoreResult` 类型、temperature=0.1、max_tokens=1500

---

## 四、升级二：新增 AI 功能

### 4.1 智能话题匹配（模块一入口）

**位置：** 用户输入担忧后、提交前

**功能：** 调用 DeepSeek 实时分析用户输入的语义，匹配最相关的黑箱话题，给出个性化引导文字。

**输入：** 用户输入的担忧文本 + 11 个话题列表

**Prompt 要点：**
```
你是一个面试焦虑分析助手。用户表达了对 AI 面试的担忧。
从以下话题中选择最相关的 1-2 个：歧视、双非、公平、内向、算法、申诉、紧张、透明、偏见、长相、能力。
返回 JSON：{ "matched_topics": ["topic1"], "guidance": "<个性化引导语，30字内>" }
```

**输出：** 匹配到的黑箱话题 + 引导语，替代当前的 `extractKeywords()` 硬匹配。

**涉及文件：** `lib/deepseek-client.ts`（新增函数）、模块一页面调用处

---

### 4.2 AI 追问链（模块二实测阶段）

**位置：** 用户提交第一轮回答后

**功能：** 基于用户回答内容，AI 自动生成 1-2 个 BBSI 风格的追问，模拟腾讯面试的「穷追猛打」。用户可选答或不答。追问 + 回答一起进入最终评分。

**Prompt 要点：**
```
你是腾讯 BBSI 面试官。候选人的回答如下：{answer}
基于回答中的模糊点、未量化点、缺少的具体行动，生成 1-2 个追问。
追问原则：追问 A（行动细节）、追问 R（量化结果）
返回 JSON：{ "followups": [{"question": "...", "targets": "action"|"result"}] }
```

**涉及文件：** `lib/deepseek-client.ts`（新增 `generateFollowups` 函数）、实测阶段组件

---

### 4.3 AI 改写教练（模块二实测阶段）

**位置：** AI 评分结果展示后

**功能：** 把用户的回答改写为高分版本，逐句标注改了什么、为什么。用户能看到"从 X 分到满分"的具体差距。

**Prompt 要点：**
```
你是 AI 面试回答教练。原回答得分 {score}/10（维度：{dimension}）。
请改写为满分版本，并逐句标注与原文的差异。

返回 JSON：
{
  "rewritten": "<改写后的完整回答>",
  "diff": [
    { "original": "<原文句子>", "rewritten": "<改写句子>", "reason": "<为什么这样改>" }
  ]
}
```

**涉及文件：** `lib/deepseek-client.ts`（新增 `rewriteToHighScore` 函数）、评分类组件

---

### 4.4 个性化黑箱拆解（模块二反转阶段）

**位置：** 实测评分完成后，进入反转阶段

**功能：** 当前用 `data.ts` 写死的 `truth` 文本揭示真相。改为 AI 基于用户回答原文，逐维度解读：
- 用户的哪些内容被 AI 读取了
- 哪些信号没有被捕捉到
- 每个维度丢分的原因

让用户亲眼看到自己的回答被"拆解"——比固定文案更有说服力。

**Prompt 要点：**
```
你是 AI 面试透明化解释引擎。用户的评分结果如下：{scoreResult}
请生成个性化黑箱拆解报告：
1. 每个维度：用户做了什么（+分项）、没做什么（-分项）
2. 和 AI 面试系统的真实评估逻辑对比
3. 用第二人称「你」叙述，语气像朋友揭秘

返回 JSON：
{
  "dimension_breakdowns": [
    {
      "dimension": "逻辑思维",
      "what_ai_saw": ["<从回答中提取到的正面信号>"],
      "what_ai_missed": ["<AI 没读到的缺失信号>"],
      "reveal": "<该维度的黑箱揭秘，结合用户具体回答，80字内>"
    }
  ],
  "overall_reveal": "<整体黑箱揭秘总结，150字内>"
}
```

**涉及文件：** `lib/deepseek-client.ts`（新增 `generateBlackBoxReveal` 函数）、反转阶段组件

---

### 4.5 个性化通关手册（模块三）

**位置：** 用户完成所有话题后，进入干货手册

**功能：** 基于用户在所有话题下的得分+表现，AI 生成一份个性化总结：
- 优势维度排名
- 短板维度排名
- 针对短板的训练建议（STAR 话术模板、逻辑框架推荐）
- 一句定制化的鼓励金句

**Prompt 要点：**
```
你是腾讯 BBSI 面试教练。用户完成了 {n} 个黑箱话题的实测，得分汇总：{scores}
请生成个性化通关手册：
1. 优势维度（最高分维度 + 表现分析）
2. 短板维度（最低分维度 + 具体改进方案 + STAR 话术模板）
3. 价值观评估（进取心/协作/成长型思维表现）
4. 定制鼓励语（一句，呼应腾讯价值观）
```

**涉及文件：** `lib/deepseek-client.ts`（新增 `generateHandbook` 函数）、模块三组件

---

## 五、实现优先级

### 第一批（核心体验闭环）
1. **评分模型重构**（3.1-3.5）— 底层能力升级，所有功能依赖
2. **个性化黑箱拆解**（4.4）— 产品核心叙事：用 AI 拆 AI 黑箱
3. **AI 追问链**（4.2）— 最体现腾讯 BBSI 特色

### 第二批（增值体验）
4. **AI 改写教练**（4.3）— 给用户可操作的价值
5. **智能话题匹配**（4.1）— 入口体验优化

### 第三批（锦上添花）
6. **个性化通关手册**（4.5）— 收尾价值

---

## 六、技术约束

- 所有 API 调用均为客户端直连 DeepSeek（`api.deepseek.com/chat/completions`）
- API Key 从 `localStorage.getItem("ds_api_key")` 获取
- 所有新增函数放在 `lib/deepseek-client.ts`（与现有代码风格一致）
- Prompt 模板统一放在 `lib/prompts.ts`
- TypeScript 类型定义更新 `lib/deepseek-client.ts` 中的接口
- 每个函数都需要 fallback 逻辑（API Key 缺失时返回模拟数据或优雅降级提示）
- Temperature：评分类 0.1，生成类 0.7
- 所有返回的 JSON 需做正则提取 + 解析容错处理

---

## 七、参考文件

- 当前 LLM 客户端：`lib/deepseek-client.ts`
- 当前 Prompt：`lib/prompts.ts`
- 当前类型定义：`lib/data.ts`
- 详细 BARS 锚定 + 完整 system prompt：见 `/Users/cailin/.claude/plans/precious-herding-forest.md`
