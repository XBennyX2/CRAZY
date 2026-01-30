import type { GameState } from "../models/GameState";

export function checkWinners(state: GameState): GameState {

  const next = structuredClone(state);

  for (const p of next.players) {
    if (p.hand.length === 0 && !next.finishedPlayers.includes(p.id)) {
      next.finishedPlayers.push(p.id);
    }
  }

  return next;
}
