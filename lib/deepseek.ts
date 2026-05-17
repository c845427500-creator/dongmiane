import OpenAI from "openai";

let client: OpenAI | null = null;

export function getDeepSeekClient(): OpenAI {
  if (!client) {
    const apiKey =
      process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY_ALT || "";
    client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
    });
  }
  return client;
}

export function setDeepSeekApiKey(key: string) {
  client = new OpenAI({
    apiKey: key,
    baseURL: "https://api.deepseek.com",
  });
}
