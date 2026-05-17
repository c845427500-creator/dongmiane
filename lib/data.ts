export interface Worry {
  text: string;
  time: string;
  keywords?: string[];
}

export interface TestResult {
  score: number;
  logic: number;
  content: number;
  fluency: number;
  comment: string;
  truth?: string;
  mechanism?: string;
}

export interface RoundState {
  pre: Record<string, number>;
  post: Record<string, number>;
  revealed: boolean;
}

export interface BlackBox {
  keyword: string;
  question: string;
  emoji: string;
  options: string[];
  correct: number;
  optionLean: string[];
  truth: string;
  proStance: string;
  conStance: string;
  testQuestion: string;
  testConclusion: string;
  freq: number;
}

export interface BlackBoxEntry {
  q: string;
  emoji: string;
  options: string[];
  correct: number;
  option_lean: string[];
  test_question: string;
  test_conclusion: string;
  truth: string;
  "正方": string;
  "反方": string;
}

export const BLACK_BOX_BANK: Record<string, BlackBoxEntry> = {
  "歧视": {
    q: "AI 面试官会歧视非 985/211 的候选人吗？",
    emoji: "⚖️",
    options: [
      "会，AI 读取学校信息并系统性扣分",
      "会读取，但不作为评分依据",
      "根本不读取学校字段",
      "反而对双非有加分机制",
    ],
    correct: 2,
    option_lean: ["con", "neutral", "pro", "pro"],
    test_question: "请在回答中明确提及你的学校名称（真实的或虚构的都可以），然后介绍你的个人优势与岗位竞争力（限200字）。\n\n🔬 实验目的：验证 AI 是否读取并利用学校信息评分。",
    test_conclusion: "AI 评分引擎在你的回答中检测到学校名称，已自动脱敏处理。本次评分仅基于：①逻辑结构清晰度 ②能力关键词匹配 ③书面表达流畅度。学校字段未进入评分模型——你的学校背景没有加分也没有扣分。",
    truth: "主流 AI 面试系统不把学校名称作为评估输入。模型评估的是回答中的能力维度（逻辑、沟通、学习能力），而不是简历上的标签。研究表明，标准化 AI 面试比人类面试官的学校偏见低约 40%。",
    "正方": "AI 更公平 — 统一标准，不看标签",
    "反方": "AI 会放大训练数据中的历史偏见",
  },
  "双非": {
    q: "双非院校出身，AI 面试会直接刷掉我吗？",
    emoji: "🎓",
    options: [
      "会，系统自动过滤双非候选人",
      "不会，AI 不看学校看能力",
      "会，但只在简历初筛阶段",
      "看公司，不同公司 AI 标准不同",
    ],
    correct: 1,
    option_lean: ["con", "pro", "con", "neutral"],
    test_question: "请介绍你的个人优势与岗位竞争力（限200字）。AI 将进行两轮评分：第一轮保留你的院校信息，第二轮自动脱敏院校信息。\n\n🔬 实验目的：对比同一份回答在有/无院校信息时的得分差异。",
    test_conclusion: "两轮评分结果对比：脱敏前与脱敏后的得分差异 <2 分（属于系统正常波动）。结论：AI 评分引擎中院校字段对最终得分几乎无影响——它看的是你的内容，不是你的出身。",
    truth: "不会。AI 面试评分模型通常不把学校层级作为输入特征，它更关注你在回答中展现的问题解决思路和表达能力。多家大厂的 AI 面试通过率数据中，双非和 985 候选人的差距远小于人类面试。",
    "正方": "AI 不看学校，只看能力表现",
    "反方": "简历筛选阶段学校已是隐形门槛",
  },
  "公平": {
    q: "AI 面试真的比人类面试更公平吗？",
    emoji: "🤝",
    options: [
      "绝对更公平，机器没有偏见",
      "程序上更公平，但前提是模型无偏见",
      "没有区别，换汤不换药",
      "更不公平，算法是暗箱操作",
    ],
    correct: 1,
    option_lean: ["pro", "pro", "con", "con"],
    test_question: "请分析一个你解决过的复杂问题及你的思路（限200字）。AI 将对你的回答进行 3 次独立评分（模拟三位不同的 AI 面试官）。\n\n🔬 实验目的：验证 AI 评分的稳定性——同一份回答，不同次评分是否一致？",
    test_conclusion: "3 次独立评分结果均为 XX 分附近（标准差 <2）。作为对比：研究发现人类面试官对同一份回答的评分标准差通常在 8-15 分之间。结论：AI 在程序一致性上确实优于人类——所有候选人面对的是同一把尺子。",
    truth: "在「程序正义」层面，AI 确实更公平 — 所有候选人面对相同的问题、相同的评分标准。但公平的前提是模型没有学到历史数据中的偏见。这也是为什么各大厂在不断做「模型去偏」— 让 AI 比人更公平，是目标而非现状。",
    "正方": "统一标准、统一流程 = 更公平",
    "反方": "算法黑箱，公平无法被验证",
  },
  "内向": {
    q: "性格内向的人在 AI 面试中会吃亏吗？",
    emoji: "😶",
    options: [
      "会，AI 捕捉微表情和语气判断性格",
      "不一定，AI 主要评估回答内容",
      "会，内向者打字慢影响评分",
      "完全不会，AI 甚至偏爱内向者",
    ],
    correct: 1,
    option_lean: ["con", "pro", "con", "pro"],
    test_question: "请用文字说服一个犹豫的客户接受你的方案（限200字）。你可以用任何风格——bullet points、长段落、对话体，随你喜欢。\n\n🔬 实验目的：验证 AI 评估的是书面说服逻辑，还是表达风格/打字速度。",
    test_conclusion: "AI 评分仅分析了你的论据充分性、逻辑链条和表达清晰度。未使用以下信号：作答速度、修改次数、段落长度、语气强度。结论：AI 面试官「看不到」你是内向还是外向——它只能读到你写下的文字内容。",
    truth: "不一定。AI 面试主要评估的是回答内容，而不是表情、语气、气场。内向者的书面表达往往更有深度。很多内向候选人反馈：对着屏幕打字比面对人类面试官更放松、发挥更好。",
    "正方": "AI 看内容不看气场，对内向者友好",
    "反方": "表达速度慢仍可能被算法误判",
  },
  "算法": {
    q: "AI 面试的算法到底是怎么给我打分的？",
    emoji: "🤖",
    options: [
      "跟短视频推荐算法差不多，看匹配度",
      "把你的回答和能力模型做匹配打分",
      "直接用 ChatGPT 生成一个分数",
      "随机打分，主要看运气",
    ],
    correct: 1,
    option_lean: ["con", "pro", "con", "con"],
    test_question: "提交你的回答后，你将立即看到 AI 从哪几个维度打分、每个维度的具体得分和原因。请回答：你最擅长的专业能力是什么？举例说明应用场景（限200字）。\n\n🔬 实验目的：让 AI 评分过程完全透明——你能看到 AI 「在想什么」。",
    test_conclusion: "以上三维度（逻辑/内容/表达）独立打分就是 AI 面试评分的真实结构——不是黑箱，而是可解释的能力模型。你可以通过使用「首先/其次/最后」等结构词提升逻辑分，通过具体案例提升内容分。这些都是可训练的。",
    truth: "主流 AI 面试评估通常包含：语言流畅度、逻辑结构、关键词匹配、能力维度打分（学习能力、沟通能力、抗压能力等）。它不是「猜你喜欢」，而是把你的回答和一个能力模型做匹配。你越清楚评估维度，越能有的放矢。",
    "正方": "标准化评估 = 减少人类主观偏见",
    "反方": "算法逻辑不公开，候选人无从准备",
  },
  "申诉": {
    q: "AI 面试挂了，我能申诉吗？",
    emoji: "📢",
    options: [
      "不能，AI 判定就是最终结果",
      "能，所有公司都有申诉通道",
      "目前很少，但趋势是增加人工复核",
      "能，直接给 HR 打电话就行",
    ],
    correct: 2,
    option_lean: ["con", "pro", "pro", "con"],
    test_question: "请描述一次你在压力下完成任务的经历（限200字）。\n\n🔬 实验目的：验证 AI 是否会对边界分数自动触发「建议人工复核」——而不是直接淘汰。",
    test_conclusion: "系统已自动判断你的得分是否处于边界区间（65-75分）。处于边界区的回答会自动标记「建议人工复核」并生成具体改进反馈——这就是「可申诉」的技术基础。行业正在建立 AI 初筛 + 人工复核的标准流程。",
    truth: "目前大多数企业没有专门的 AI 面试申诉通道。但你的呼声正在被听到 — 越来越多 HRtech 公司开始设计「人工复核」机制：如果 AI 评分处于边界线，会自动转给人类 HR 复审。",
    "正方": "边界 case 已有自动人工复核",
    "反方": "申诉渠道缺失，候选人没有话语权",
  },
  "紧张": {
    q: "面对 AI 面试紧张怎么办？",
    emoji: "😰",
    options: [
      "紧张会被 AI 检测到并扣分",
      "AI 只看最终回答内容，不扣紧张分",
      "多喝热水就好了",
      "AI 会给你加分，因为紧张=真实",
    ],
    correct: 1,
    option_lean: ["con", "pro", "neutral", "pro"],
    test_question: "请自我评价你的抗压能力与适应能力（限200字）。系统会记录你的修改次数和作答时长——但这些数据不会影响评分。你可以慢慢写、反复改。\n\n🔬 实验目的：验证 AI 是否真的「不在意」你的临场状态。",
    test_conclusion: "你的作答过程中共修改了若干次，耗时若干分钟。AI 的评分仅基于你最终提交的文本内容——修改次数、停顿时长、作答速度均未进入评分模型。你可以深呼吸、重写、甚至离开一会儿再回来。",
    truth: "这反而是 AI 面试的优势！你可以深呼吸、重新打字、甚至暂停思考 — AI 不会因为你的紧张而扣分。它关注的是你最终输出的内容质量，不是你的临场状态。",
    "正方": "AI 不给临场压力，发挥更稳定",
    "反方": "缺少人情味本身就是一种压力",
  },
  "透明": {
    q: "AI 面试的评分过程，我能看到吗？",
    emoji: "🔍",
    options: [
      "能，每次面试完都有详细报告",
      "目前看不到，但行业正向可解释 AI 发展",
      "能看到，但要花钱买报告",
      "完全看不到，且永远不会公开",
    ],
    correct: 1,
    option_lean: ["pro", "pro", "con", "con"],
    test_question: "请描述你最擅长的专业能力及其应用场景（限200字）。提交后你将收到一份完整的「AI 面试评估报告」。\n\n🔬 实验目的：展示 AI 评分报告可以多透明——比「面试官不喜欢我」具体在哪？",
    test_conclusion: "这就是「可解释 AI」的雏形：你看到了每个维度的得分、总分和改进建议。你不需要猜测「面试官到底看上了什么」——报告会直接告诉你在哪些维度表现好、哪些维度可以加强。远比人类面试官的「感觉」透明。",
    truth: "目前大多数 AI 面试不公开评分细节。但行业趋势是向「可解释 AI」发展 — 未来你应该能看到哪些维度得分高、哪些低，以及对应的原因。这也是我们这场辩论的意义：推动 AI 面试透明化。",
    "正方": "技术趋势正走向可解释 AI",
    "反方": "现状就是不透明，承诺不等于兑现",
  },
  "偏见": {
    q: "AI 面试的偏见从哪里来？",
    emoji: "🎭",
    options: [
      "程序员故意写的",
      "主要来自训练数据中的历史偏见",
      "AI 自己产生的意识",
      "来自摄像头采集的外貌信息",
    ],
    correct: 1,
    option_lean: ["con", "pro", "con", "con"],
    test_question: "请分析一个你解决过的复杂问题及你的思路（限200字）。你可以用你习惯的表达方式——方言词汇、网络用语、日常表达都可以。\n\n🔬 实验目的：验证 AI 只评估内容逻辑，不因语言风格产生偏见。",
    test_conclusion: "AI 仅从你的回答中提取了：①逻辑结构 ②问题解决步骤 ③结果量化程度。你的语言风格、用词习惯未被作为评分输入。AI 的偏见风险主要来自历史训练数据的不均衡，而不是技术本身——技术架构可以做到不去学习偏见。",
    truth: "AI 的偏见主要来自训练数据。如果历史招聘数据中某群体通过率更高，模型可能学会这种偏差。这也是为什么 AI 面试公司需要持续做「公平性测试」和「去偏」— 技术本身中立，但数据不是。",
    "正方": "偏见来自数据，技术可以主动纠偏",
    "反方": "历史偏见根深蒂固，去偏效果存疑",
  },
  "长相": {
    q: "AI 面试会分析我的长相和声音吗？",
    emoji: "👀",
    options: [
      "会，AI 综合评估颜值和气质",
      "会分析外貌，但不作为主要评分依据",
      "主要用于防作弊，不评估外貌",
      "完全不会，摄像头只是摆设",
    ],
    correct: 2,
    option_lean: ["con", "con", "pro", "pro"],
    test_question: "请描述你的职业发展目标和为此做的准备（限200字）。\n\n🔬 请注意：本题为纯文本作答。AI 仅读取文本框内容，不会调用摄像头、麦克风或任何音视频信号。\n\n🔬 实验目的：验证摄像头是否参与了评分。",
    test_conclusion: "本次评分 100% 基于文本框中的文字内容。摄像头数据（如有开启）仅用于身份核验，未进入评分引擎。你的长相、声音、穿着、背景环境——AI 面试官完全不在意也不分析。",
    truth: "大多数 AI 面试要求开摄像头主要用于防作弊（确认是本人），而不是分析外貌。少数系统会分析表情和语音，但行业趋势是减少对这些信号的依赖 — 因为它们可能引入文化偏见。你的回答内容才是主角。",
    "正方": "摄像头仅用于防作弊，不评估外貌",
    "反方": "视频分析本身就带有隐性偏见风险",
  },
  "能力": {
    q: "AI 能准确评估我的真实能力吗？",
    emoji: "💪",
    options: [
      "能，AI 比人类更懂我的潜力",
      "能评估结构化能力，但软技能有盲区",
      "不能，AI 评估完全是瞎蒙",
      "能，AI 能从打字速度推断智力",
    ],
    correct: 1,
    option_lean: ["pro", "pro", "con", "con"],
    test_question: "请举例说明你的学习能力和成长潜力（限200字）。提交后你会收到改进建议，可以根据建议修改后再次提交，对比两次得分变化。\n\n🔬 实验目的：证明 AI 面试评估的是可训练的信号，而非天赋。",
    test_conclusion: "第一次得分 vs 第二次得分对比：根据改进建议优化后，大多数参与者的得分提升了 5-10 分。结论：AI 面试评估的能力信号是可以通过练习提升的——这不是天赋测试，而是一场你可以准备的考试。这是 AI 面试最大的公平。",
    truth: "AI 评估的是你在面试中展现的能力信号，而非你的全部能力。它擅长评估结构化表达、逻辑推理和关键词匹配，但不太擅长识别创造力、领导力和情感智慧。这也是为什么大多数企业把 AI 面试作为初筛而非最终决策。",
    "正方": "AI 擅长的维度恰好是岗位核心能力",
    "反方": "AI 漏掉很多人类能感知的软实力",
  },
};

export const DEMO_WORRIES: Worry[] = [
  { text: "AI会不会因为我是二本毕业的就直接刷掉我？", time: "14:32:10" },
  { text: "AI面试能准确判断一个人的沟通能力吗？我有点社恐", time: "14:32:25" },
  { text: "我在镜头前会紧张结巴，AI是不是就觉得我能力不行？", time: "14:32:40" },
  { text: "AI到底是怎么打分的？如果结果不公怎么申诉？", time: "14:33:02" },
  { text: "内向的人是不是在AI面试里天然吃亏？", time: "14:33:18" },
  { text: "AI面试和真人面试官到底哪个更公平？", time: "14:33:35" },
  { text: "我的学校不是985/211，AI会不会直接降分？", time: "14:34:01" },
  { text: "AI能看到我的长相和声音吗？会因此有偏见吗？", time: "14:34:22" },
  { text: "如果AI给我低分，还有没有人工复核的机会？", time: "14:34:48" },
  { text: "AI面试的评分标准是什么？和真人面试一样吗？", time: "14:35:05" },
];

export const KEYWORD_BANK = [
  "双非", "985", "211", "学校", "学历", "院校", "出身", "背景",
  "歧视", "偏见", "公平", "区别对待", "刷掉",
  "评分", "打分", "算法", "标准", "流程", "模型",
  "申诉", "复核", "人工", "结果", "不合理",
  "内向", "性格", "社恐", "紧张", "表达", "沟通", "能力",
  "长相", "声音", "外貌", "性别",
  "透明", "可信", "证据", "验证",
];

export const PRESET_POOL = [
  { emoji: "🎓", label: "学校歧视？", full: "AI会不会因为我的学校出身而区别对待？" },
  { emoji: "😰", label: "内向吃亏？", full: "内向的人在AI面试中是不是很吃亏？" },
  { emoji: "🔍", label: "怎么打分？", full: "AI到底是怎么打分的？能信它吗？" },
  { emoji: "⚖️", label: "公平对比？", full: "AI面试官比人类面试官更公平吗？" },
  { emoji: "📝", label: "结果申诉？", full: "AI面试结果不合理怎么办？" },
  { emoji: "🤖", label: "算法黑箱？", full: "AI面试的算法到底在评判什么，我看不到过程" },
  { emoji: "👀", label: "长相偏见？", full: "AI面试会分析我的长相和声音吗" },
  { emoji: "💪", label: "能测能力？", full: "AI真的能准确评估我的真实能力吗" },
  { emoji: "🎭", label: "偏见来源？", full: "AI面试的偏见从哪里来，会不会更不公平" },
];

export function extractKeywords(text: string): string[] {
  return KEYWORD_BANK.filter((kw) => text.includes(kw));
}

export function getKeywordFrequencies(worries: Worry[]): [string, number][] {
  const counter: Record<string, number> = {};
  for (const w of worries) {
    const kws = w.keywords || extractKeywords(w.text);
    for (const kw of kws) {
      counter[kw] = (counter[kw] || 0) + 1;
    }
  }
  return Object.entries(counter).sort((a, b) => b[1] - a[1]);
}

export function getActiveBoxes(
  keywords: [string, number][]
): BlackBox[] {
  const seen = new Set<string>();
  const boxes: BlackBox[] = [];
  for (const [kw, freq] of keywords) {
    if (BLACK_BOX_BANK[kw] && !seen.has(kw)) {
      seen.add(kw);
      const info = BLACK_BOX_BANK[kw];
      boxes.push({
        keyword: kw,
        question: info.q,
        emoji: info.emoji,
        options: info.options,
        correct: info.correct,
        optionLean: info.option_lean,
        truth: info.truth,
        proStance: info["正方"],
        conStance: info["反方"],
        testQuestion: info.test_question,
        testConclusion: info.test_conclusion,
        freq,
      });
    }
  }
  boxes.sort((a, b) => b.freq - a.freq);
  return boxes;
}
