import type { Card } from "../models/Card";

export function canMultiDropSeven(
  cards: Card[]
): boolean {

  if (cards.length < 2) return false;

  const baseSuit = cards[0].suit;
  const hasSeven = cards.some(
    c => c.rank === 7
  );

  return hasSeven && cards.every(c => c.suit === baseSuit);
}
