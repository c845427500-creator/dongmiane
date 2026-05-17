"use client";

import type { Worry, TestResult, BlackBox } from "./data";

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
}

const STORAGE_KEY = "dongmiane_state";
const CHANNEL_NAME = "dongmiane_sync";

function generateUserId(): string {
  return "u_" + Math.random().toString(36).slice(2, 10);
}

export function defaultState(): GameState {
  return {
    worries: [],
    activeKeyword: null,
    phase: "pre_vote",
    rounds: {},
    scores: { pro: 0, con: 0 },
    testResults: {},
    handbookClaimed: [],
    activeBoxes: [],
    userId: generateUserId(),
  };
}

export function loadState(): GameState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed.userId) parsed.userId = generateUserId();
    if (!parsed.handbookClaimed) parsed.handbookClaimed = [];
    if (!parsed.activeBoxes) parsed.activeBoxes = [];
    return parsed;
  } catch {
    return defaultState();
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
