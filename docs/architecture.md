# 懂面鹅 · 架构审计报告

> 生成时间：2026-05-17
> 用途：作为所有 agent 接手项目时的共享上下文。改动代码前先读本文。

## 技术栈

Next.js 16.2.6（App Router，`output: "export"` 静态导出）+ React 19.2 + TypeScript 5 + Tailwind v4 + Shadcn UI（Radix）+ Framer Motion 12 + DeepSeek（前端直连 `api.deepseek.com`，前端持有 Key）。

> **注意**：`AGENTS.md` 提示 Next 16 有破坏性变更。编码前查 `node_modules/next/dist/docs/`。

## 文件树与职责

```
app/
  layout.tsx          根布局：metadata + viewport + TooltipProvider + Sonner Toaster
  page.tsx            首页：词云 + 担忧输入 + 智能匹配 + 黑箱话题入口
  qa/page.tsx         5 阶段爆破流程：pre_vote → debating → testing → post_vote → blasted
  handbook/page.tsx   干货手册：解锁卡片列表 + AI 个性化通关总结
  screen/             大屏模式（page.tsx + qa/page.tsx）
  globals.css         Tailwind v4 入口

components/
  BlackBoxCard / BlackBoxReveal / DebateView / ScoreCard / VoteBars /
  FollowupQuestions / HandbookCard / WordCloud / WorryTicker /
  ExplosionAnimation / BottomNav        业务组件
  ui/                                   Shadcn 原语（button/card/dialog/tabs…）

lib/
  data.ts             领域常量：BLACK_BOX_BANK（11 个黑箱）、KEYWORD_BANK、
                      PRESET_POOL、DEMO_WORRIES + 关键词频次/匹配工具
  client-state.ts     localStorage 持久化 + BroadcastChannel 跨标签同步 + 全部 state mutator
  deepseek-client.ts  浏览器直调 DeepSeek（fetch + SSE 流式），含 BBSI 本地 fallbackScore
  prompts.ts          动态导入的 prompt 模板（matchTopic/score/followups/rewrite/reveal/handbook）
  state.ts / deepseek.ts   服务端版本镜像，静态导出场景未启用
  utils.ts            cn() 等

next.config.ts        output:"export" + basePath（env 注入）+ images.unoptimized
```

## 数据流

### 单一数据源

`GameState`：
- `worries` —— 担忧列表
- `activeKeyword` —— 当前主题词
- `phase` —— 5 阶段枚举
- `rounds` —— `{ pre, post, revealed }` 投票/揭示数据
- `scores` —— BBSI 评分
- `testResults` —— 实测结果
- `handbookClaimed` —— 解锁的手册卡片
- `activeBoxes` —— 当前激活的黑箱
- `userId` —— 用户标识

### 持久化

`localStorage["dongmiane_state"]`。首访自动跑 `buildSeedState()` 注入 demo 数据：
- 10 条 worry
- 5 轮随机投票
- 2 条预置 BBSI 评分
- 2 张解锁手册

保证 demo 首屏即丰满。

### 跨标签同步

`BroadcastChannel("dongmiane_sync")`。机制：
1. 每次 mutator（`addWorry` / `setPhase` / `addPreVote`…）调用 `saveState()` 后 `broadcast({type:"state_update"})`
2. 各页面 `useEffect(() => onStateChange(...))` 订阅
3. 回调内 `loadState()` 重读 localStorage 并 `setState`

这是「主屏输入 → 大屏实时刷新」的机制。

### AI 调用流

`scoreAnswerStream` 用 `fetch` 直接拿 SSE，逐 chunk yield `delta.content`，UI 累积后 `JSON.parse` 第一个 `{...}` 块。

失败时回退 `fallbackScore`（本地规则引擎，正则识 STAR + 结构词/数据/团队/价值观信号，应用 `action_missing_capped_3` / `result_missing_capped_6` STAR 上限）。

API Key 存 `localStorage["ds_api_key"]`，无 Key 抛 `NO_API_KEY` → 静默 fallback。

## 路由结构

静态导出，全客户端组件：

- `/` —— 首页
- `/qa` —— 5 阶段状态机，单页内 phase 切换不换路由
- `/handbook` —— 干货手册
- `/screen` + `/screen/qa` —— 投屏视图

`BottomNav` 全局底栏。

## 关键扩展点

### 新增黑箱话题
1. `lib/data.ts` 的 `BLACK_BOX_BANK` 追加 entry
2. `KEYWORD_BANK` 加关键词
3. `deepseek-client.ts:212` 的 `matchTopic` 的 topics 数组同步

### 新增 AI 能力
1. `lib/prompts.ts` 加 builder
2. `deepseek-client.ts` 加 export 函数，复用 `fetchDeepSeek` + `parseJson<T>`

### 新阶段
1. 扩展 `GameState.phase` 联合类型
2. 改 `app/qa/page.tsx` 的 `phases` 数组、进度条分母、阶段渲染分支

### 替换模型 / 加服务端
当前直连 DeepSeek + 静态导出。若要隐藏 Key 需关掉 `output:"export"` 走 Route Handler 代理。

### 状态字段扩展
1. `GameState` 加字段
2. `loadState` 加兼容兜底（参照 `handbookClaimed`、`activeBoxes` 的写法）
3. 配套 mutator

## 已知风险

1. **代码重复**：`lib/state.ts` 与 `client-state.ts`、`lib/deepseek.ts` 与 `deepseek-client.ts` 双份并存，易漂移
2. **Key 安全**：API Key 明文存 localStorage 并直连第三方。Demo 场景可接受，生产需代理
3. **SSR 兼容性**：`loadState` 在 SSR 路径会跑 `buildSeedState()`，但页面均 `"use client"` 且静态导出，影响小
4. **微浪费**：`BroadcastChannel` 在每次 `broadcast()` 都新建并立即 close，可用，但多写场景稍浪费
