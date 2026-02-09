import type { Card } from './Card';

export interface Player {
  id: string;
  name: string;
  hand: Card[];

  skippedTurns: number;
  // optional socket id when connected via websocket
  socketId?: string;
}
