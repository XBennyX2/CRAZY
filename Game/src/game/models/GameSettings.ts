export interface GameSettings {
  decks: number;
  includeJokers: boolean;

  finishPlayersCount: number;

  reverseCard: 5 | 7;
  skipCard: 5 | 7;

  allowStacking: boolean;
}
