import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from './game/models/GameState';
import type { Card } from './game/models/Card';

const SERVER_URL = 'http://localhost:5000';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<string>('hearts');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    // Game events
    newSocket.on('gameStateUpdate', (state: GameState) => {
      setGameState(state);
      setError('');
      console.log('Game state updated:', state);
    });

    newSocket.on('playerJoined', (data) => {
      console.log('Player joined:', data.player);
    });

    newSocket.on('error', (data) => {
      setError(data.message);
      console.error('Server error:', data.message);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinGame = () => {
    if (!socket || !gameId.trim() || !playerName.trim()) return;
    socket.emit('joinGame', { gameId: gameId.trim(), playerName: playerName.trim() });
  };

  const startGame = () => {
    if (!socket || !gameId) return;
    socket.emit('startGame', { gameId });
  };

  const playCard = (card: Card) => {
    if (!socket || !gameId) return;

    // For wild cards, show suit selection
    if (card.rank === 8 || card.rank === 'J' || card.rank === 'JOKER') {
      setSelectedCard(card);
      setSelectedSuit('hearts');
    } else {
      socket.emit('playCard', {
        gameId,
        move: { cards: [card] }
      });
    }
  };

  const confirmPlayCard = () => {
    if (!socket || !gameId || !selectedCard) return;

    socket.emit('playCard', {
      gameId,
      move: { cards: [selectedCard], suit: selectedSuit }
    });

    setSelectedCard(null);
  };

  const drawCard = () => {
    if (!socket || !gameId) return;
    socket.emit('drawCard', { gameId });
  };

  if (!isConnected) {
    return (
      <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
        <h1>Connecting to CRAZY Game Server...</h1>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
        <h1>CRAZY Card Game</h1>

        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Game ID"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            style={{ marginRight: 10, padding: 5 }}
          />
          <input
            type="text"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{ marginRight: 10, padding: 5 }}
          />
          <button onClick={joinGame} style={{ padding: 5 }}>Join Game</button>
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: 10 }}>
            Error: {error}
          </div>
        )}

        <div>
          <h3>How to Play:</h3>
          <ul>
            <li>Create or join a game with a Game ID</li>
            <li>Wait for at least 2 players to join</li>
            <li>Click "Start Game" to begin</li>
            <li>Play cards that match suit or rank</li>
            <li>8s and Jacks are wild - choose a suit when playing them</li>
          </ul>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const myPlayer = gameState.players.find(p => p.socketId === socket?.id);

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>CRAZY – Multiplayer Game</h1>

      <div style={{ marginBottom: 20 }}>
        <strong>Game ID:</strong> {gameId} |
        <strong> Current Suit:</strong> {gameState.currentSuit} |
        <strong> Draw Stack:</strong> {gameState.drawStack}
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: 10, padding: 10, border: '1px solid red' }}>
          {error}
        </div>
      )}

      <h3>Players:</h3>
      <ul>
        {gameState.players.map((player, index) => (
          <li key={player.id} style={{
            fontWeight: index === gameState.currentPlayerIndex ? 'bold' : 'normal',
            color: player.socketId === socket?.id ? 'blue' : 'black'
          }}>
            {player.name} {index === gameState.currentPlayerIndex ? '(Current Turn)' : ''}
            {player.socketId === socket?.id ? ' (You)' : ''}
            - {player.hand.length} cards
          </li>
        ))}
      </ul>

      {myPlayer && (
        <>
          <h3>Your Hand:</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {myPlayer.hand.map(card => (
              <button
                key={card.id}
                onClick={() => playCard(card)}
                style={{
                  padding: 10,
                  minWidth: 80,
                  backgroundColor: gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === myPlayer.id) ? 'lightgreen' : 'white'
                }}
                disabled={gameState.currentPlayerIndex !== gameState.players.findIndex(p => p.id === myPlayer.id)}
              >
                {card.rank} of {card.suit}
              </button>
            ))}
          </div>
        </>
      )}

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
            onClick={confirmPlayCard}
            style={{ marginTop: 10, padding: 10 }}
          >
            Play Card
          </button>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <button
          onClick={drawCard}
          disabled={gameState.currentPlayerIndex !== gameState.players.findIndex(p => p.id === myPlayer?.id)}
          style={{ padding: 10, marginRight: 10 }}
        >
          Draw Card
        </button>

        {gameState.players.length >= 2 && gameState.players.every(p => p.hand.length === 0) && (
          <button onClick={startGame} style={{ padding: 10 }}>
            Start New Game
          </button>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Discard Pile:</h3>
        {gameState.discardPile.length > 0 && (
          <div style={{ padding: 10, border: '1px solid gray', display: 'inline-block' }}>
            {gameState.discardPile[gameState.discardPile.length - 1].rank} of {gameState.discardPile[gameState.discardPile.length - 1].suit}
          </div>
        )}
      </div>
    </div>
  );
}
