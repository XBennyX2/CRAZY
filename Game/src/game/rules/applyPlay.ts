// DEPRECATED: game rule effects are now centralized on the server (`server/gameEngine`).
// Keep a small stub to avoid import errors in the frontend; the client should call
// server APIs to apply game effects instead of running authoritative logic locally.

import type { GameState } from "../models/GameState";
import type { Card } from "../models/Card";

export function applyCardEffects(
  state: GameState,
  card: Card,
  chosenSuit?: string
): GameState {
  // reference params to avoid unused variable errors in TypeScript builds
  void state; void card; void chosenSuit;
  throw new Error('applyCardEffects is deprecated on the client; call the server API instead');
}
