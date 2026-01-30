import type { GameState } from "../models/GameState";

export function applyCrazyPenalty(
  state: GameState,
  offenderId: string
): GameState {

  const next = structuredClone(state);
  const player = next.players.find(p => p.id === offenderId);
  if (!player) return next;

  for (let i = 0; i < 5; i++) {
    const card = next.deck.pop();
    if (card) player.hand.push(card);
  }

  return next;
}
