// DEPRECATED: validation logic centralized on the server. Frontend should call
// server `/validate` endpoint to determine playability. Keep a stub to avoid
// import errors during build; it will throw if called.

import type { GameState } from "../models/GameState";
import type { Card } from "../models/Card";
import type { RuleResult } from "./types";

export function canPlayCard(state: GameState, card: Card): RuleResult {
  // reference params to avoid unused parameter errors
  void state; void card;
  throw new Error('canPlayCard is deprecated on the client; call the server API instead');
}
