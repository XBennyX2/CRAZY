import type { GameState } from "../models/GameState";

export function getNextPlayerIndex(state: GameState): number {
  const total = state.players.length;
  let next = state.currentPlayerIndex + state.direction;

  if (next < 0) next = total - 1;
  if (next >= total) next = 0;

  return next;
}
