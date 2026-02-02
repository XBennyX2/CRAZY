import type { GameState } from "../models/GameState";
import { getNextPlayerIndex } from "./turn";

// Fisher-Yates shuffle
function shuffle(array: any[]): any[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawCards(
  state: GameState,
  count: number
): GameState {

  const next = structuredClone(state);
  const player = next.players[next.currentPlayerIndex];

  for (let i = 0; i < count; i++) {
    if (next.deck.length === 0) {
      // Reshuffle discard pile (except top card)
      if (next.discardPile.length <= 1) {
        // Cannot reshuffle - not enough cards
        break;
      }
      const topCard = next.discardPile[next.discardPile.length - 1];
      const toShuffle = next.discardPile.slice(0, -1);
      next.deck = shuffle(toShuffle);
      next.discardPile = [topCard];
    }
    
    const card = next.deck.pop();
    if (card) player.hand.push(card);
  }

  next.drawStack = 0;
  
  // Only advance turn if we were resolving a draw stack
  if (state.drawStack > 0) {
    next.currentPlayerIndex = getNextPlayerIndex(next);
  }

  return next;
}

export function drawOrPass(state: GameState): GameState {
  const next = structuredClone(state);
  const player = next.players[next.currentPlayerIndex];

  if (next.deck.length === 0) {
    // Reshuffle discard pile (except top card)
    if (next.discardPile.length > 1) {
      const topCard = next.discardPile[next.discardPile.length - 1];
      const toShuffle = next.discardPile.slice(0, -1);
      next.deck = shuffle(toShuffle);
      next.discardPile = [topCard];
    }
  }

  const drawnCard = next.deck.pop();
  if (drawnCard) player.hand.push(drawnCard);

  return getNextPlayerIndex(next) === next.currentPlayerIndex
    ? next
    : { ...next, currentPlayerIndex: getNextPlayerIndex(next) };
}
