import { useState } from 'react';
import type { GameState } from './game/models/GameState';
import type { Card } from './game/models/Card';
import { drawCards } from './game/engine/draw';
import { canPlayCard } from './game/rules/validators';
import { applyCardEffects } from './game/rules/applyPlay';

const initialState: GameState = {
  players: [
    {
      id: 'p1',
      name: 'Alice',
      hand: [
        { id: '3', suit: 'hearts', rank: 7 },
        { id: '8', suit: 'spades', rank: 8 }
      ],
      skippedTurns: 0
    },
    {
      id: 'p2',
      name: 'Bob',
      hand: [
        { id: '2', suit: 'spades', rank: 8 },
        { id: '4', suit: 'clubs', rank: 5 }
      ],
      skippedTurns: 0
    }
  ],
  currentPlayerIndex: 0,
  direction: 1,
  deck: [
    { id: '5', suit: 'diamonds', rank: 3 },
    { id: '6', suit: 'hearts', rank: 4 },
    { id: '7', suit: 'spades', rank: 6 },
    { id: '8', suit: 'clubs', rank: 9 },
    { id: '9', suit: 'diamonds', rank: 10 },
    { id: '10', suit: 'hearts', rank: 'A' },
  ],
  discardPile: [
    { id: 'start', suit: 'hearts', rank: 7 },
    { id: '1', suit: 'hearts', rank: 2 }
  ],
  currentSuit: 'hearts',
  suitChangeLock: false,
  drawStack: 2,
  finishedPlayers: [],
  settings: {
    decks: 1,
    includeJokers: false,
    finishPlayersCount: 1,
    reverseCard: 7,
    skipCard: 5,
    allowStacking: true
  }
};

export default function App() {
  const [state, setState] = useState<GameState>(initialState);
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const currentPlayer = state.players[state.currentPlayerIndex];

  function playCard(card: Card, chosenSuit?: string) {
    setState(s => {
      const validation = canPlayCard(s, card);
      if (!validation.valid) {
        alert(validation.reason);
        return s;
      }

      const players = [...s.players];
      players[s.currentPlayerIndex] = {
        ...players[s.currentPlayerIndex],
        hand: players[s.currentPlayerIndex].hand.filter(c => c.id !== card.id)
      };

      const stateAfterRemoval = { ...s, players };

      const stateAfterEffects = applyCardEffects(stateAfterRemoval, card, chosenSuit);

      // Advance turn after effects
      const nextIndex = (stateAfterEffects.currentPlayerIndex + stateAfterEffects.direction + stateAfterEffects.players.length) % stateAfterEffects.players.length;

      return { ...stateAfterEffects, currentPlayerIndex: nextIndex };
    });
    setSelectedSuit(null);
    setSelectedCard(null);
  }

  function handleCardClick(card: Card) {
    if (card.rank === 8 || card.rank === 'J' || card.rank === 'JOKER') {
      setSelectedCard(card);
      setSelectedSuit('hearts'); // Default selection
    } else {
      playCard(card);
    }
  }

  function confirmSuitSelection() {
    if (selectedCard && selectedSuit) {
      playCard(selectedCard, selectedSuit);
    }
  }

  function drawCard() {
    setState(s => drawCards(s, s.drawStack > 0 ? s.drawStack : 1));
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>CRAZY – Dev Test Mode</h1>

      <h3>Current Player: {currentPlayer.name}</h3>
      <p>Current Suit: {state.currentSuit}</p>
      <p>Draw Stack: {state.drawStack}</p>

      <h2>Hand</h2>
      {currentPlayer.hand.map(card => (
        <button
          key={card.id}
          onClick={() => handleCardClick(card)}
          style={{ margin: 6, padding: 10 }}
        >
          {card.rank} of {card.suit}
        </button>
      ))}

      {selectedCard && (
        <div style={{ marginTop: 20, border: '1px solid black', padding: 10 }}>
          <h3>Choose a suit for your {selectedCard.rank} of {selectedCard.suit}:</h3>
          {['hearts', 'diamonds', 'clubs', 'spades'].map(suit => (
            <button
              key={suit}
              onClick={() => setSelectedSuit(suit)}
              style={{
                margin: 5,
                padding: 10,
                backgroundColor: selectedSuit === suit ? 'lightblue' : 'white'
              }}
            >
              {suit}
            </button>
          ))}
          <br />
          <button
            onClick={confirmSuitSelection}
            style={{ marginTop: 10, padding: 10 }}
          >
            Play Card
          </button>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <button onClick={drawCard}>Draw</button>
      </div>

    </div>
  );
}
