import type { Player } from './Player';
import type { Card, Suit } from './Card';
import type { GameSettings } from './GameSettings';

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1;

  deck: Card[];
  discardPile: Card[];

  currentSuit: Suit;
  suitChangeLock: boolean;

  drawStack: number;

  finishedPlayers: string[];

  settings: GameSettings;
}
