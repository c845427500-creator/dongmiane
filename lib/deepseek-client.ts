"use client";

interface ScoreResult {
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

export async function scoreAnswer(
  text: string,
  keyword: string,
  context: string
): Promise<ScoreResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const { buildScorePrompt } = await import("./prompts");
  const { systemPrompt, userPrompt } = buildScorePrompt(text, keyword);

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Parse error: " + raw.slice(0, 200));

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    logic: parsed.logic || 0,
    content: parsed.content || 0,
    fluency: parsed.fluency || 0,
    comment: parsed.comment || "",
    truth: parsed.truth,
    mechanism: parsed.mechanism,
  };
}

export async function* scoreAnswerStream(
  text: string,
  keyword: string,
  context: string
): AsyncGenerator<Partial<ScoreResult>> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const { buildScorePrompt } = await import("./prompts");
  const { systemPrompt, userPrompt } = buildScorePrompt(text, keyword);

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

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
        if (chunk === "[DONE]") {
          return;
        }
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
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Parse error: " + raw.slice(0, 200));

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    pro: parsed.pro || "",
    con: parsed.con || "",
    goldenQuote: parsed.goldenQuote || "",
  };
}

function fallbackScore(text: string): ScoreResult {
  const len = text.length;
  const hasStructure = /首先|其次|最后|第一|第二|第三|[①-⑩]/.test(text);
  const hasDetail = /例如|举例|案例|具体|实际|经历/.test(text);
  const hasKeywords = /逻辑|能力|沟通|学习|团队|数据|分析|思考|解决|方案/.test(text);

  const logic = Math.min(100, 40 + (hasStructure ? 30 : 0) + Math.min(30, Math.floor(len / 30)));
  const content = Math.min(100, 35 + (hasDetail ? 30 : 0) + (hasKeywords ? 15 : 0) + Math.min(20, Math.floor(len / 40)));
  const fluency = Math.min(100, 50 + Math.min(50, Math.floor(len / 20)));

  const avg = Math.round((logic + content + fluency) / 3);

  const comments = [
    "你的回答展现了清晰的逻辑思考能力，继续加油！",
    "回答结构完整，如果能多举一些具体例子会更有说服力。",
    "语言表达流畅自然，内容深度还可以再加强。",
    "你的回答很有条理，展现出了较强的分析能力。",
  ];

  return {
    logic,
    content,
    fluency,
    comment: comments[Math.floor(Math.random() * comments.length)],
  };
}
