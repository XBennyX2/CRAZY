import type  { GameState } from "../models/GameState";
import type { Player } from "../models/Player";
import type { Card } from "../models/Card";

export function createTestGame(): GameState {
  const players: Player[] = [
    { id: "p1", name: "Alice", hand: [], skippedTurns: 0 },
    { id: "p2", name: "Bob", hand: [], skippedTurns: 0 },
  ];

  const deck: Card[] = [
    { id: "1", suit: "hearts", rank: 2 },
    { id: "2", suit: "spades", rank: 8 },
    { id: "3", suit: "hearts", rank: 7 },
    { id: "4", suit: "clubs", rank: 5 },
  ];

  players[0].hand.push(deck[0]);
  players[1].hand.push(deck[1]);

  return {
    players,
    currentPlayerIndex: 0,
    direction: 1,

    deck: deck.slice(2),
    discardPile: [{ id: "start", suit: "hearts", rank: 7 }],

    currentSuit: "hearts",
    suitChangeLock: false,
    drawStack: 0,

    finishedPlayers: [],

    settings: {
      decks: 1,
      includeJokers: false,
      finishPlayersCount: 1,
      reverseCard: 7,
      skipCard: 5,
      allowStacking: true,
    },
  };
}
