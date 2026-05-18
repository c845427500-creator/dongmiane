"use client";

// Tencent BBSI Dimension Score
export interface DimensionScore {
  score: 0 | 3 | 6 | 10;
  evidence: string;
  bars_match: string;
}

// STAR Assessment
export interface StarAssessment {
  has_situation: boolean;
  has_task: boolean;
  has_action: boolean;
  has_result: boolean;
  completeness: "完整" | "部分" | "缺失";
  star_constraint_applied: "none" | "action_missing_capped_3" | "result_missing_capped_6";
}

// BBSI Score Result
export interface BBSIScoreResult {
  dimensions: {
    logical_thinking: DimensionScore;
    problem_solving: DimensionScore;
    communication_collaboration: DimensionScore;
    value_alignment: DimensionScore;
  };
  star_assessment: StarAssessment;
  total_score: number; // 0-40
  tencent_fit: string;
  overall_comment: string;
  improvement_suggestions: string[];
  truth?: string;
  mechanism?: string;
}

// Topic match result
export interface TopicMatchResult {
  matched_topics: string[];
  guidance: string;
}

// Follow-up question
export interface FollowupItem {
  question: string;
  targets: "action" | "result";
}

// Rewrite result
export interface RewriteResult {
  rewritten: string;
  diff: { original: string; rewritten: string; reason: string }[];
}

// Black box reveal result
export interface BlackBoxRevealResult {
  dimension_breakdowns: {
    dimension: string;
    what_ai_saw: string[];
    what_ai_missed: string[];
    reveal: string;
  }[];
  overall_reveal: string;
}

// Personalized handbook result
export interface HandbookResult {
  strength_dimension: string;
  strength_analysis: string;
  weakness_dimension: string;
  weakness_analysis: string;
  improvement_plan: string;
  value_assessment: string;
  encouragement: string;
}

// Interview scoring result (flexible, non-template)
export interface InterviewScoreDimension {
  name: string;
  score: number;
  comment: string;
}

export interface InterviewScoreResult {
  score: number;
  dimensions: InterviewScoreDimension[];
  overall: string;
  strengths: string[];
  improvements: string[];
}

// Legacy score result (for backwards compat in TestResult)
export interface LegacyScoreResult {
  logic: number;
  content: number;
  fluency: number;
  comment: string;
  truth?: string;
  mechanism?: string;
}

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ds_api_key");
}

export function setApiKey(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ds_api_key", key);
}

async function fetchDeepSeek(
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number,
  stream = false
) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  return response;
}

function parseJson<T>(raw: string): T {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Parse error: " + raw.slice(0, 200));
  return JSON.parse(jsonMatch[0]);
}

// ========== Scoring (BBSI 4-dimension) ==========

export async function scoreAnswer(
  text: string,
  keyword: string,
  _context: string
): Promise<BBSIScoreResult> {
  const { buildScorePrompt } = await import("./prompts");
  const { systemPrompt, userPrompt } = buildScorePrompt(text, keyword);

  const response = await fetchDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.1,
    1500
  );

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return parseJson<BBSIScoreResult>(raw);
}

export async function* scoreAnswerStream(
  text: string,
  keyword: string,
  _context: string
): AsyncGenerator<{ comment?: string }> {
  const { buildScorePrompt } = await import("./prompts");
  const { systemPrompt, userPrompt } = buildScorePrompt(text, keyword);

  const response = await fetchDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.1,
    1500,
    true
  );

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const chunk = line.slice(6);
        if (chunk === "[DONE]") return;
        try {
          const parsed = JSON.parse(chunk);
          const delta = parsed.choices?.[0]?.delta?.content || "";
          yield { comment: delta };
        } catch {
          // skip unparseable chunks
        }
      }
    }
  }
}

// ========== Smart Topic Matching (4.1) ==========

export async function matchTopic(worry: string): Promise<TopicMatchResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const { buildMatchTopicPrompt } = await import("./prompts");
  const topics = ["歧视", "双非", "公平", "内向", "算法", "申诉", "紧张", "透明", "偏见", "长相", "能力"];
  const { systemPrompt, userPrompt } = buildMatchTopicPrompt(worry, topics);

  const response = await fetchDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.3,
    200
  );

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return parseJson<TopicMatchResult>(raw);
}

// ========== Follow-up Questions (4.2) ==========

export async function generateFollowups(answer: string): Promise<{ followups: FollowupItem[] }> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const { buildFollowupsPrompt } = await import("./prompts");
  const { systemPrompt, userPrompt } = buildFollowupsPrompt(answer);

  const response = await fetchDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.7,
    400
  );

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return parseJson<{ followups: FollowupItem[] }>(raw);
}

// ========== AI Rewrite Coach (4.3) ==========

export async function rewriteToHighScore(
  answer: string,
  dimensionName: string,
  dimensionScore: number
): Promise<RewriteResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const { buildRewritePrompt } = await import("./prompts");
  const { systemPrompt, userPrompt } = buildRewritePrompt(answer, dimensionName, dimensionScore);

  const response = await fetchDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.7,
    1000
  );

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return parseJson<RewriteResult>(raw);
}

// ========== Personalized Black Box Reveal (4.4) ==========

export async function generateBlackBoxReveal(
  keyword: string,
  answer: string,
  scoreResult: Record<string, unknown>
): Promise<BlackBoxRevealResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const { buildBlackBoxRevealPrompt } = await import("./prompts");
  const { systemPrompt, userPrompt } = buildBlackBoxRevealPrompt(keyword, answer, scoreResult);

  const response = await fetchDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.7,
    1200
  );

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return parseJson<BlackBoxRevealResult>(raw);
}

// ========== Personalized Handbook (4.5) ==========

export async function generateHandbook(
  completedTopics: { keyword: string; score?: number }[],
  allScores: Record<string, number>
): Promise<HandbookResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const { buildHandbookPrompt } = await import("./prompts");
  const { systemPrompt, userPrompt } = buildHandbookPrompt(completedTopics, allScores);

  const response = await fetchDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.7,
    800
  );

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return parseJson<HandbookResult>(raw);
}

// ========== AI Debate Generation ==========

export async function generateDebate(
  topic: string,
  proStance: string,
  conStance: string
): Promise<{ pro: string; con: string; goldenQuote: string }> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `你是一个专业的辩论教练，帮助用户了解 AI 面试的真实情况。生成一场关于以下话题的微型辩论：

**辩论规则：**
- 正方（pro）：${proStance}
- 反方（con）：${conStance}

请严格按照以下 JSON 格式返回（不要包含其他文字）：
{
  "pro": "<正方核心论点，40-60字>",
  "con": "<反方核心论点，40-60字>",
  "goldenQuote": "<一句引人深思的金句，15-25字>"
}`,
        },
        {
          role: "user",
          content: `话题：${topic}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return parseJson<{ pro: string; con: string; goldenQuote: string }>(raw);
}

// ========== Empathy Response (4.6) ==========

export async function generateEmpathy(worry: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return "";

  try {
    const { buildEmpathyPrompt } = await import("./prompts");
    const { systemPrompt, userPrompt } = buildEmpathyPrompt(worry);

    const response = await fetchDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.8,
      200
    );

    const data = await response.json();
    return (data.choices?.[0]?.message?.content || "").trim();
  } catch {
    return "";
  }
}

// ========== Box Match Reason (4.7) ==========

export async function generateMatchReason(worry: string, topic: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return "";

  try {
    const { buildMatchReasonPrompt } = await import("./prompts");
    const { systemPrompt, userPrompt } = buildMatchReasonPrompt(worry, topic);

    const response = await fetchDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.3,
      80
    );

    const data = await response.json();
    return (data.choices?.[0]?.message?.content || "").trim();
  } catch {
    return "";
  }
}

// ========== Post-Blast AI Debrief (4.7) ==========

export interface DebriefResult {
  insight: string;
  journey: string;
  takeaway: string;
}

export async function generateDebrief(
  keyword: string,
  answer: string,
  preVote: number,
  postVote: number | undefined,
  correct: number,
  scoreResult: Record<string, unknown> | null
): Promise<DebriefResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const { buildDebriefPrompt } = await import("./prompts");
    const { systemPrompt, userPrompt } = buildDebriefPrompt(keyword, answer, preVote, postVote, correct, scoreResult);

    const response = await fetchDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.7,
      400
    );

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    return parseJson<DebriefResult>(raw);
  } catch {
    return null;
  }
}

// ========== AI Interview Chat (4.8) ==========

export async function generateInterviewMessage(
  history: { role: "user" | "assistant"; content: string }[],
  userProfile: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const { buildInterviewChatMessages } = await import("./prompts");
  const messages = buildInterviewChatMessages(history, userProfile);

  const response = await fetchDeepSeek(messages, 0.8, 300);

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ========== Dynamic Black Box Generation (4.10) ==========

export interface DynamicBlackBoxRaw {
  keyword: string;
  question: string;
  emoji: string;
  options: string[];
  correct: number;
  option_lean: string[];
  proStance: string;
  conStance: string;
  test_question: string;
  test_conclusion: string;
  truth: string;
}

export async function generateDynamicBlackBox(
  worry: string
): Promise<DynamicBlackBoxRaw | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const { buildDynamicBlackBoxPrompt } = await import("./prompts");
    const { systemPrompt, userPrompt } = buildDynamicBlackBoxPrompt(worry);

    const response = await fetchDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.7,
      800
    );

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    return parseJson<DynamicBlackBoxRaw>(raw);
  } catch {
    return null;
  }
}

// ========== Interview Question Generation (4.11) ==========

export async function generateInterviewQuestion(
  keyword: string,
  topicQuestion: string
): Promise<{ question: string } | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const { buildInterviewQuestionPrompt } = await import("./prompts");
    const { systemPrompt, userPrompt } = buildInterviewQuestionPrompt(keyword, topicQuestion);

    const response = await fetchDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.8,
      300
    );

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    return parseJson<{ question: string }>(raw);
  } catch {
    return null;
  }
}

// ========== Interview Answer Scoring (4.12) ==========

export async function scoreInterviewAnswer(
  topic: string,
  originalAnswer: string,
  followupQAs: { question: string; answer: string }[]
): Promise<InterviewScoreResult> {
  const { buildInterviewScorePrompt } = await import("./prompts");
  const { systemPrompt, userPrompt } = buildInterviewScorePrompt(topic, originalAnswer, followupQAs);

  const response = await fetchDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.6,
    1200
  );

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return parseJson<InterviewScoreResult>(raw);
}

// ========== Interview Scoring Fallback (local) ==========

export function fallbackInterviewScore(
  originalAnswer: string,
  followupAnswers: string[]
): InterviewScoreResult {
  const allText = originalAnswer + " " + followupAnswers.join(" ");
  const len = allText.length;

  // Heuristics for 6 BBSI dimensions (local fallback)
  const hasStructure = /首先|其次|最后|第一|第二|第三|因为|所以|综上|一方面|另一方面/.test(allText);
  const hasDecomposition = /拆解|步骤|方案|优先级|核心问题|关键在|首先.*然后|第一步|第二步/.test(allText);
  const hasSpecifics = /\d+%|\d+个|\d+万|具体|例如|比如|案例|经历|数据/.test(allText);
  const hasSelfAction = /我做了|我决定|我主动|我提出|我组织|我推动|我参与|我负责/.test(allText);
  const hasReflection = /学到|反思|复盘|成长|总结|提升|改进|认知|意识到/.test(allText);
  const hasValueSignal = /团队|帮助|诚实|责任|担当|主动|学习|创新|合作|共赢/.test(allText);

  // Six dimension scores
  const logicScore = Math.min(95, 50 + (hasStructure ? 20 : 0) + Math.min(len / 20, 15) + Math.floor(Math.random() * 10));
  const decompScore = Math.min(95, 48 + (hasDecomposition ? 22 : 0) + (hasSelfAction ? 10 : 0) + Math.floor(Math.random() * 10));
  const expressScore = Math.min(95, 52 + (hasSpecifics ? 18 : 0) + Math.min(len / 25, 12) + Math.floor(Math.random() * 10));
  const evidenceScore = Math.min(95, 45 + (hasSelfAction ? 20 : 0) + (hasSpecifics ? 15 : 0) + Math.floor(Math.random() * 10));
  const reflectScore = Math.min(95, 42 + (hasReflection ? 25 : 0) + (hasValueSignal ? 10 : 0) + Math.floor(Math.random() * 10));
  const valueScore = Math.min(95, 50 + (hasValueSignal ? 20 : 0) + (hasReflection ? 10 : 0) + Math.floor(Math.random() * 10));

  const score = Math.round((logicScore + decompScore + expressScore + evidenceScore + reflectScore + valueScore) / 6);

  const dimensions: InterviewScoreDimension[] = [
    { name: "逻辑框架", score: logicScore, comment: hasStructure ? "回答有层次感，论证链条比较清晰" : "可以试着用第一、第二来组织思路，让逻辑更清楚" },
    { name: "问题拆解", score: decompScore, comment: hasDecomposition ? "能把问题拆开来看，有步骤意识" : "下次可以试着把大问题拆成小步骤来回答" },
    { name: "表达说服", score: expressScore, comment: hasSpecifics ? "有具体的例子或数据支撑，说服力不错" : "加上一两个真实的例子会让表达更有分量" },
    { name: "经验实证", score: evidenceScore, comment: hasSelfAction ? "能看到你自己的行动，不只是在说团队做了什么" : "多说我做了什么，让面试官看到你的个人贡献" },
    { name: "反思深度", score: reflectScore, comment: hasReflection ? "能从经历中提炼出思考和成长" : "面试官想看到的不仅是经历，还有你从中学到了什么" },
    { name: "价值导向", score: valueScore, comment: hasValueSignal ? "回答中透露出了积极的价值观倾向" : "试着在回答中自然地展现你的团队协作或主动担当" },
  ];

  const overallTemplates = [
    "整体来看，你的回答有亮点也有成长空间。你能把自己的想法讲清楚这点很好——很多人在面试中一紧张就乱了。AI 评分主要看的是你说了什么内容，不是你怎么说的，所以有具体的例子和清晰的逻辑比华丽的表达更重要。",
    "读你的回答能感觉到你是认真对待这次面试的。你展现出的思考习惯不错。AI 面试评分系统会关注你的逻辑框架和经验实证——也就是你有没有真正做过、能不能说清楚。下次多说我做了X结果Y，分数会更亮眼。",
    "你的回答让我觉得你是一个能沉下心思考的人。不过在竞争激烈的面试场景里，AI 会在多个维度上同时打分——逻辑、内容、反思、价值观都在看。试着在每个维度上都给出一些证据，让评分有据可依。",
    "看得出你对这个话题有自己的理解，不是背模板的。这种真实感本身就是加分项——AI 面试要的就是这个。如果能把你的观点再往前推一步：不仅说是什么，还多说我因此做了什么、带来了什么改变，整个评分会明显提升。",
  ];

  return {
    score,
    dimensions,
    overall: overallTemplates[Math.floor(Math.random() * overallTemplates.length)],
    strengths: hasSpecifics
      ? ["能用具体案例支撑观点，让回答有说服力"]
      : ["表达了自己的真实想法，不是套话"],
    improvements: hasStructure
      ? ["可以在回答中增加量化结果的描述，让 STAR 更完整"]
      : ["建议使用更清晰的结构来组织回答，让面试官更容易抓住重点"],
  };
}

// ========== Personalized Card Conclusion (Handbook) ==========

export async function generateCardConclusion(
  keyword: string,
  topic: string,
  testResult: {
    original_answer?: string;
    followup_answers?: string[];
    followup_qa_pairs?: { question: string; answer: string }[];
    score?: number;
    comment?: string;
  }
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const { buildCardConclusionPrompt } = await import("./prompts");
    const { systemPrompt, userPrompt } = buildCardConclusionPrompt(keyword, topic, testResult);

    const response = await fetchDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.7,
      500
    );

    const data = await response.json();
    return (data.choices?.[0]?.message?.content || "").trim();
  } catch {
    return null;
  }
}

// ========== BBSI Fallback Scorer (local rule engine) ==========

function detectStar(text: string): {
  has_situation: boolean;
  has_task: boolean;
  has_action: boolean;
  has_result: boolean;
} {
  const s = /当|那时|有一次|项目|背景下|情境|经历/.test(text);
  const t = /需要|目标|挑战|负责|要求|任务/.test(text);
  const a = /我做了|我采取了|我决定|我主动|我提出|我组织|我设计|我推动/.test(text);
  const r = /结果|最终|提升|降低|完成|增长|减少|达到|\d+%|\d+个|数据/.test(text);
  return { has_situation: s, has_task: t, has_action: a, has_result: r };
}

export function fallbackScore(text: string): BBSIScoreResult {
  const star = detectStar(text);
  const len = text.length;

  // Detect signals for each dimension
  const hasFramework = /首先|其次|最后|第一|第二|第三|因为|所以|归纳|综上|[①-⑩]/.test(text);
  const hasData = /\d+%|\d+个|\d+万|\d+元|数据|指标|增长|下降/.test(text);

  const hasSolution = /方案|方法|步骤|解决|措施|计划|策略/.test(text);
  const hasConstraints = /时间|资源|成本|预算|风险|边界/.test(text);

  const hasTeamwork = /团队|合作|协调|沟通|跨部门|同事|配合/.test(text);
  const hasSelfExpression = /我(?!们)/.test(text);

  const hasGrowth = /主动|挑战|学习|成长|复盘|进步|从中学到|进取/.test(text);
  const hasNegativity = /无所谓|没办法|只能|被迫|随便|放弃/.test(text);

  // STAR constraints
  let starCap = 10;
  if (!star.has_action) starCap = 3;
  else if (!star.has_result) starCap = 6;

  function capped(score: number) {
    return Math.min(score, starCap) as 0 | 3 | 6 | 10;
  }

  function toBars(v: number): 0 | 3 | 6 | 10 {
    if (v >= 8) return 10;
    if (v >= 5) return 6;
    if (v >= 2) return 3;
    return 0;
  }

  // Logical thinking
  let logicRaw = 0;
  if (len < 30) logicRaw = 0;
  else if (hasFramework && hasData) logicRaw = 10;
  else if (hasFramework) logicRaw = 6;
  else if (len > 50) logicRaw = 3;

  // Problem solving
  let psRaw = 0;
  if (hasSolution && hasConstraints) psRaw = 10;
  else if (hasSolution) psRaw = 6;
  else if (len > 50) psRaw = 3;

  // Communication
  let commRaw = 0;
  if (hasTeamwork && hasSelfExpression) commRaw = 10;
  else if (hasTeamwork) commRaw = 6;
  else if (len > 40) commRaw = 3;

  // Values
  let valRaw = 0;
  if (hasGrowth) valRaw = hasNegativity ? 3 : (hasSelfExpression ? 10 : 6);
  else if (!hasNegativity && len > 40) valRaw = 3;

  const logicScore = capped(toBars(logicRaw));
  const psScore = capped(toBars(psRaw));
  const commScore = capped(toBars(commRaw));
  const valScore = capped(toBars(valRaw));

  const starCompleteness =
    star.has_action && star.has_result ? "完整" :
    star.has_action ? "部分" : "缺失";

  const starConstraint =
    !star.has_action ? "action_missing_capped_3" :
    !star.has_result ? "result_missing_capped_6" : "none";

  const comments = [
    "你的回答展现出结构化的思维，建议用更具体的案例和数据来支撑观点。",
    "回答逻辑清晰，但在个人行动细节和量化结果方面还可以加强。",
    "分析维度较为全面，体现了积极进取的态度。建议多展现团队协作的具体场景。",
    "你的回答有层次感，如果能把解决方案拆得更细、加上时间节点，会更有说服力。",
  ];

  return {
    dimensions: {
      logical_thinking: {
        score: logicScore,
        evidence: hasFramework ? "回答包含结构化表达" : "未检测到结构化信号",
        bars_match: logicScore >= 10 ? "卓越" : logicScore >= 6 ? "良好" : logicScore >= 3 ? "基础" : "不足",
      },
      problem_solving: {
        score: psScore,
        evidence: hasSolution ? "提出了解决方案思路" : "未检测到明确的解决方案",
        bars_match: psScore >= 10 ? "卓越" : psScore >= 6 ? "良好" : psScore >= 3 ? "基础" : "不足",
      },
      communication_collaboration: {
        score: commScore,
        evidence: hasTeamwork ? "提及团队合作经验" : "未体现协作沟通",
        bars_match: commScore >= 10 ? "卓越" : commScore >= 6 ? "良好" : commScore >= 3 ? "基础" : "不足",
      },
      value_alignment: {
        score: valScore,
        evidence: hasGrowth ? "展现出进取心和成长型思维" : "未体现明确的价值观信号",
        bars_match: valScore >= 10 ? "卓越" : valScore >= 6 ? "良好" : valScore >= 3 ? "基础" : "不足",
      },
    },
    star_assessment: {
      ...star,
      completeness: starCompleteness as "完整" | "部分" | "缺失",
      star_constraint_applied: starConstraint as "none" | "action_missing_capped_3" | "result_missing_capped_6",
    },
    total_score: logicScore + psScore + commScore + valScore,
    tencent_fit: valScore >= 10 ? "高度匹配" : valScore >= 6 ? "基本匹配" : valScore >= 3 ? "需观察" : "不匹配",
    overall_comment: comments[Math.floor(Math.random() * comments.length)],
    improvement_suggestions: [
      "使用「首先/其次/最后」等结构化连接词提升逻辑清晰度",
      "在回答中加入具体的量化结果（如「提升了30%效率」）来增强说服力",
    ],
    truth: "⚠️ 本地估算，非 AI 评分。配置 DeepSeek API Key 以获得真实的 BBSI 四维评估。",
    mechanism: "本评分基于 BBSI 规则引擎（本地），检测结构词、方案词、协作词、价值观信号，并应用 STAR 约束规则。仅供参考。",
  };
}
