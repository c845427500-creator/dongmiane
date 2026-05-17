import type { GameState } from "./client-state";

let state: GameState | null = null;

export function getState(): GameState | null {
  return state;
}

export function setState(s: GameState) {
  state = s;
}

export function clearState() {
  state = null;
}
