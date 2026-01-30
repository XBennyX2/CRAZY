import type { GameState } from "../models/GameState";
import type { Card } from "../models/Card";

export function applyCardEffects(
  state: GameState,
  card: Card,
  chosenSuit?: string
): GameState {

  const next = structuredClone(state);
  next.discardPile.push(card);
  next.currentSuit = card.suit;

  // Wild cards
  if (card.rank === 8 || card.rank === "J" || card.rank === "JOKER") {
    if (!chosenSuit) throw new Error("Suit must be chosen");
    next.currentSuit = chosenSuit as any;
    next.suitChangeLock = true;
  } else {
    next.suitChangeLock = false;
  }

  // Draw rules
  if (card.rank === 2) {
    next.drawStack += 2;
  }

  if (card.rank === "A" && card.suit === "spades") {
    next.drawStack += 5;
  }

  // Skip / reverse
  if (card.rank === next.settings.skipCard) {
    next.currentPlayerIndex =
      (next.currentPlayerIndex + next.direction) % next.players.length;
  }

  if (card.rank === next.settings.reverseCard) {
    next.direction *= -1;
  }

  return next;
}
