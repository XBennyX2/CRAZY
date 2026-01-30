import type { Card } from "../models/Card";

export type PlayAction =
  | { type: "PLAY_CARD"; card: Card; chosenSuit?: string }
  | { type: "DRAW_CARD" }
  | { type: "PASS" };

export interface RuleResult {
  valid: boolean;
  reason?: string;
}
