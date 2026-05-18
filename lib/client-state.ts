"use client";

import type { Worry, TestResult, BlackBox } from "./data";
import { DEMO_WORRIES, getActiveBoxes, getKeywordFrequencies } from "./data";

export interface GameState {
  worries: Worry[];
  activeKeyword: string | null;
  phase: "pre_vote" | "debating" | "testing" | "post_vote" | "blasted";
  rounds: Record<string, RoundState>;
  scores: { pro: number; con: number };
  testResults: Record<string, TestResult>;
  handbookClaimed: string[];
  activeBoxes: BlackBox[];
  userId: string;
}

export interface RoundState {
  pre: Record<string, number>;
  post: Record<string, number>;
  revealed: boolean;
  userVote?: number;
}

const STORAGE_KEY = "dongmiane_state";
const VERSION_KEY = "dongmiane_state_version";
const STATE_VERSION = 2; // bump to clear old state across all tabs
const CHANNEL_NAME = "dongmiane_sync";

function generateUserId(): string {
  return "u_" + Math.random().toString(36).slice(2, 10);
}

function randomVotes(): Record<string, number> {
  const votes: Record<string, number> = {};
  for (let i = 0; i < 4; i++) {
    votes[i] = Math.floor(Math.random() * 30) + 5;
  }
  return votes;
}

function buildSeedState(): GameState {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const times = DEMO_WORRIES.map((_, i) => {
    const d = new Date(now.getTime() - i * 45000);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  });

  const worries = DEMO_WORRIES.map((w, i) => ({
    text: w.text,
    time: times[i] || w.time,
  }));

  const keywords = getKeywordFrequencies(worries);
  const boxes = getActiveBoxes(keywords);

  // Pre-seed some rounds with random votes
  const rounds: Record<string, RoundState> = {};
  for (const box of boxes.slice(0, 5)) {
    rounds[box.keyword] = {
      pre: randomVotes(),
      post: randomVotes(),
      revealed: false,
    };
  }

  // Pre-seed demo test results for a couple topics
  const demoTestResults: Record<string, TestResult> = {};
  if (boxes.length >= 2) {
    demoTestResults[boxes[0].keyword] = {
      score: 28,
      logic: 6,
      content: 6,
      fluency: 6,
      comment: "回答展现了较好的逻辑思维和问题解决能力，建议在量化结果和团队协作方面加强。",
      truth: boxes[0].truth,
      mechanism: "AI 评分引擎基于 BBSI 四维体系自动评估，重点关注 STAR 行为完整性。",
      dimensions: {
        logical_thinking: { score: 6, evidence: "回答使用了结构化表达", bars_match: "良好" },
        problem_solving: { score: 6, evidence: "提出了具体方案思路", bars_match: "良好" },
        communication_collaboration: { score: 6, evidence: "表达清晰流畅", bars_match: "良好" },
        value_alignment: { score: 10, evidence: "展现了强烈的进取心", bars_match: "卓越" },
      },
      star_assessment: {
        has_situation: true,
        has_task: true,
        has_action: true,
        has_result: false,
        completeness: "部分",
        star_constraint_applied: "result_missing_capped_6",
      },
      total_score: 28,
      tencent_fit: "基本匹配",
      improvement_suggestions: ["多用具体数字量化成果", "增加团队协作的案例"],
    };
    demoTestResults[boxes[1].keyword] = {
      score: 18,
      logic: 3,
      content: 6,
      fluency: 6,
      comment: "回答表达了积极的求职态度，但在逻辑结构和个人具体行动方面还有提升空间。",
      truth: boxes[1].truth,
      mechanism: "AI 面试主要评估回答内容而非临场状态，文字表达比面试气场更重要。",
      dimensions: {
        logical_thinking: { score: 3, evidence: "回答有分段但未展开因果分析", bars_match: "基础" },
        problem_solving: { score: 6, evidence: "提出了解决方案", bars_match: "良好" },
        communication_collaboration: { score: 6, evidence: "表达基本通顺", bars_match: "良好" },
        value_alignment: { score: 3, evidence: "态度端正但回答模式化", bars_match: "基础" },
      },
      star_assessment: {
        has_situation: true,
        has_task: true,
        has_action: false,
        has_result: false,
        completeness: "缺失",
        star_constraint_applied: "action_missing_capped_3",
      },
      total_score: 18,
      tencent_fit: "需观察",
      improvement_suggestions: ["加入你个人做了什么的具体描述", "使用「首先/其次/最后」结构化表达"],
    };
  }

  // Pre-unlock a couple handbook entries
  const handbookClaimed = boxes.slice(0, 2).map((b) => b.keyword);

  return {
    worries,
    activeKeyword: null,
    phase: "pre_vote",
    rounds,
    scores: { pro: 45, con: 55 },
    testResults: demoTestResults,
    handbookClaimed,
    activeBoxes: [],
    userId: generateUserId(),
  };
}

export function defaultState(): GameState {
  // Return seeded demo state on first visit
  return buildSeedState();
}

let seedStateCache: GameState | null = null;

export function loadState(): GameState {
  if (typeof window === "undefined") return buildSeedState();
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);

    // Auto-reset if version bumped or no state
    if (!raw || storedVersion !== String(STATE_VERSION)) {
      if (!seedStateCache) seedStateCache = buildSeedState();
      saveState(seedStateCache);
      localStorage.setItem(VERSION_KEY, String(STATE_VERSION));
      broadcast();
      return { ...seedStateCache };
    }

    const parsed = JSON.parse(raw) as GameState;
    if (!parsed.userId) parsed.userId = generateUserId();
    if (!parsed.handbookClaimed) parsed.handbookClaimed = [];
    if (!parsed.activeBoxes) {
      const keywords = getKeywordFrequencies(parsed.worries);
      parsed.activeBoxes = getActiveBoxes(keywords);
    }
    return parsed;
  } catch {
    return buildSeedState();
  }
}

export function saveState(state: GameState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or localStorage disabled
  }
}

export function onStateChange(callback: (state: GameState) => void) {
  if (typeof window === "undefined") return () => {};

  const bc = new BroadcastChannel(CHANNEL_NAME);
  bc.onmessage = (e) => {
    if (e.data?.type === "state_update") {
      callback(loadState());
    }
  };

  return () => bc.close();
}

export function broadcast() {
  if (typeof window === "undefined") return;
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: "state_update" });
    bc.close();
  } catch {
    // BroadcastChannel not supported
  }
}

export function addWorry(state: GameState, text: string): GameState {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  const newState = { ...state, worries: [{ text, time }, ...state.worries] };
  saveState(newState);
  broadcast();
  return newState;
}

export function setActiveKeyword(state: GameState, keyword: string): GameState {
  const newState = { ...state, activeKeyword: keyword };
  saveState(newState);
  broadcast();
  return newState;
}

export function setPhase(state: GameState, phase: GameState["phase"]): GameState {
  const newState = { ...state, phase };
  saveState(newState);
  broadcast();
  return newState;
}

export function addPreVote(state: GameState, keyword: string, optionIndex: number): GameState {
  const newState = { ...state };
  if (!newState.rounds[keyword]) {
    newState.rounds[keyword] = { pre: {}, post: {}, revealed: false };
  }
  newState.rounds[keyword] = {
    ...newState.rounds[keyword],
    pre: { ...newState.rounds[keyword].pre, [optionIndex]: (newState.rounds[keyword].pre[optionIndex] || 0) + 1 },
    userVote: optionIndex,
  };
  saveState(newState);
  broadcast();
  return newState;
}

export function addPostVote(state: GameState, keyword: string, optionIndex: number): GameState {
  const newState = { ...state };
  if (!newState.rounds[keyword]) {
    newState.rounds[keyword] = { pre: {}, post: {}, revealed: false };
  }
  newState.rounds[keyword] = {
    ...newState.rounds[keyword],
    post: { ...newState.rounds[keyword].post, [optionIndex]: (newState.rounds[keyword].post[optionIndex] || 0) + 1 },
  };
  saveState(newState);
  broadcast();
  return newState;
}

export function revealRound(state: GameState, keyword: string): GameState {
  const newState = { ...state };
  if (!newState.rounds[keyword]) {
    newState.rounds[keyword] = { pre: {}, post: {}, revealed: false };
  }
  newState.rounds[keyword] = { ...newState.rounds[keyword], revealed: true };
  saveState(newState);
  broadcast();
  return newState;
}

export function addTestResult(state: GameState, keyword: string, result: TestResult): GameState {
  const newState = {
    ...state,
    testResults: { ...state.testResults, [keyword]: result },
  };
  saveState(newState);
  broadcast();
  return newState;
}

export function claimHandbook(state: GameState, keyword: string): GameState {
  if (state.handbookClaimed.includes(keyword)) return state;
  const newState = {
    ...state,
    handbookClaimed: [...state.handbookClaimed, keyword],
  };
  saveState(newState);
  broadcast();
  return newState;
}

export function setActiveBoxes(state: GameState, boxes: BlackBox[]): GameState {
  const newState = { ...state, activeBoxes: boxes };
  saveState(newState);
  broadcast();
  return newState;
}

export function resetState(): GameState {
  const fresh = defaultState();
  fresh.userId = loadState().userId;
  saveState(fresh);
  broadcast();
  return fresh;
}
