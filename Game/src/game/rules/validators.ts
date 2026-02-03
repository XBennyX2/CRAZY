import type { GameState } from "../models/GameState";
import type { Card } from "../models/Card";
import type { RuleResult } from "./types";

export function canPlayCard(
  state: GameState,
  card: Card
): RuleResult {

  const topCard = state.discardPile[state.discardPile.length - 1];

  // 1️⃣ DRAW STACK RULES (CHECK FIRST)
  if (state.drawStack > 0) {

  // Ace of spades ↔ 2 of spades stacking
  if (
    ((topCard.rank === "A" && topCard.suit === "spades" && card.rank === 2 && card.suit === "spades") ||
     (topCard.rank === 2 && topCard.suit === "spades" && card.rank === "A" && card.suit === "spades"))
  ) {
    return { valid: true };
  }

  // Stack 2s (numeric guard REQUIRED)
  if (card.rank === 2) {
    return { valid: true };
  }

  // Wild cards can be played during draw stack (allows calling crazy)
  if (
    card.rank === 8 ||
    card.rank === "J" ||
    card.rank === "JOKER"
  ) {
    return { valid: true };
  }

  return { valid: false, reason: "Must stack or draw" };
}


  // 2️⃣ SUIT CHANGE LOCK
  if (state.suitChangeLock) {
    if (
      card.rank === 8 ||
      card.rank === "J" ||
      card.rank === "JOKER"
    ) {
      return { valid: false, reason: "Suit change locked" };
    }
  }

  // 3️⃣ WILD CARDS
  if (
    card.rank === 8 ||
    card.rank === "J" ||
    card.rank === "JOKER"
  ) {
    return { valid: true };
  }

  // 4️⃣ NORMAL MATCH RULE
  if (
    card.suit === state.currentSuit ||
    card.rank === topCard.rank
  ) {
    return { valid: true };
  }

  return { valid: false, reason: "Card not playable" };
}
