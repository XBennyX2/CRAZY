import type { GameState } from "../models/GameState";
import { getNextPlayerIndex } from "./turn";


export function drawCards(
  state: GameState,
  count: number
): GameState {

  const next = structuredClone(state);
  const player = next.players[next.currentPlayerIndex];

  for (let i = 0; i < count; i++) {
    const card = next.deck.pop();
    if (card) player.hand.push(card);
  }

  next.drawStack = 0;
  next.currentPlayerIndex = getNextPlayerIndex(next);

  return next;
}

export function drawOrPass(state: GameState): GameState {
  const next = structuredClone(state);
  const player = next.players[next.currentPlayerIndex];

  const drawnCard = next.deck.pop();
  if (drawnCard) player.hand.push(drawnCard);

  return getNextPlayerIndex(next) === next.currentPlayerIndex
    ? next
    : { ...next, currentPlayerIndex: getNextPlayerIndex(next) };
}
