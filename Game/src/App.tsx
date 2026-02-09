import React, { useState, useEffect } from 'react';
import type { JSX } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from './game/models/GameState';
import type { Card } from './game/models/Card';

const SERVER_URL = 'http://localhost:5000';

export default function App(): JSX.Element {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<string>('hearts');
  const [error, setError] = useState<string>('');
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const s: Socket = io(SERVER_URL);
    setSocket(s);

    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));
    s.on('gameStateUpdate', (state: GameState) => {
      console.log("State Update:", state); // Debug log
      setGameState(state);
      setError(''); 
    });
    s.on('error', (data: any) => setError(data?.message || String(data)));

    return () => { s.close(); };
  }, []);

  // --- Actions ---
  const joinGame = () => {
    if (!socket || !gameId.trim() || !playerName.trim()) return;
    socket.emit('joinGame', { gameId: gameId.trim(), playerName: playerName.trim() });
  };

  const startGame = () => { 
    if (socket && gameId) socket.emit('startGame', { gameId }); 
  };

  const playCard = (card: Card) => {
    if (!socket || !gameId) return;
    if (card.rank === 8 || card.rank === 'J' || card.rank === 'JOKER') {
      setSelectedCard(card);
      return;
    }
    socket.emit('playCard', { gameId, move: { cards: [card] } });
  };

  const confirmPlayCard = () => {
    if (!socket || !gameId || !selectedCard) return;
    socket.emit('playCard', { gameId, move: { cards: [selectedCard], suit: selectedSuit } });
    setSelectedCard(null);
  };

  const drawCard = () => { if (socket && gameId) socket.emit('drawCard', { gameId }); };
  const passTurn = () => { if (socket && gameId) socket.emit('pass', { gameId }); };
  
  const callCrazy = () => {
    const sel = document.getElementById('crazyTarget') as HTMLSelectElement;
    const targetPlayerId = sel?.value;
    if (socket && gameId && targetPlayerId) {
        socket.emit('callCrazy', { gameId, targetPlayerId });
    }
  };

  // --- UI Logic Helpers ---
  if (!isConnected) return <div style={{ padding: 20 }}>Connecting to Server...</div>;

  // 1. LOBBY VIEW (Before joining any room)
  if (!gameState) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h1>🃏 CRAZY Card Game</h1>
        <div style={{ display: 'inline-block', textAlign: 'left', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block' }}>Game ID:</label>
            <input style={{ padding: 8, width: '100%' }} value={gameId} onChange={e => setGameId(e.target.value)} />
          </div>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block' }}>Your Name:</label>
            <input style={{ padding: 8, width: '100%' }} value={playerName} onChange={e => setPlayerName(e.target.value)} />
          </div>
          <button onClick={joinGame} style={{ width: '100%', padding: 10, cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 4 }}>
            Join Game Room
          </button>
        </div>
        {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      </div>
    );
  }

  // 2. SAFETY GUARD: Ensure players list exists before trying to read it
  // This prevents the "Cannot read properties of undefined (reading 'find')" error
  if (!gameState.players || !Array.isArray(gameState.players)) {
    return <div style={{ padding: 20 }}>Initializing Game Data...</div>;
  }

  // 3. GAME ROOM VARIABLES (Now safe to access)
  const myPlayer = gameState.players.find(p => p.socketId === socket?.id);
  
  const viewingPlayer = viewingPlayerId 
    ? gameState.players.find(p => p.id === viewingPlayerId) 
    : myPlayer;

  const gameHasStarted = gameState.discardPile && gameState.discardPile.length > 0;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: 10 }}>
        <h1>CRAZY — Room: {gameId}</h1>
        {/* START BUTTON: Only shows if game hasn't started */}
        {!gameHasStarted && (
          <button 
            onClick={startGame} 
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
          >
            Start Game (Min 2)
          </button>
        )}
      </header>

      {error && <div style={{ color: 'white', backgroundColor: '#ff4444', padding: 10, borderRadius: 4, margin: '10px 0' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
        {/* Left Side: Players List */}
        <div style={{ flex: 1 }}>
          <h3>Players</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {gameState.players.map((p, idx) => (
              <li key={p.id} style={{ 
                padding: 10,
                marginBottom: 5,
                borderRadius: 4,
                backgroundColor: idx === gameState.currentPlayerIndex ? '#e8f5e9' : '#f8f9fa',
                borderLeft: idx === gameState.currentPlayerIndex ? '5px solid #4caf50' : '5px solid #dee2e6'
              }}>
                <strong>{p.name}</strong> {p.socketId === socket?.id && '(You)'}
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  {p.hand.length} cards {idx === gameState.currentPlayerIndex && '• ACTIVE TURN'}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Side: Table State */}
        <div style={{ flex: 1, textAlign: 'center', backgroundColor: '#fcfcfc', border: '1px dashed #ccc', padding: 20 }}>
          <h4>Discard Pile</h4>
          {gameHasStarted ? (
            <div style={{ fontSize: '1.5rem', padding: '30px 20px', border: '2px solid #333', borderRadius: 10, display: 'inline-block', backgroundColor: 'white' }}>
              {gameState.discardPile[gameState.discardPile.length - 1].rank} 
              <span style={{ display: 'block', fontSize: '1rem' }}>of {gameState.discardPile[gameState.discardPile.length - 1].suit}</span>
            </div>
          ) : (
            <div style={{ color: '#999', padding: '40px 0' }}>Waiting for host to start...</div>
          )}
          
          <div style={{ marginTop: 15 }}>
            <strong>Active Suit:</strong> {gameState.currentSuit || 'None'}
          </div>
        </div>
      </div>

      <hr style={{ margin: '20px 0' }} />

      {/* Hand Section */}
      <h3>{viewingPlayer?.name || 'Spectating'}'s Hand</h3>
      <div style={{ marginBottom: 12 }}>
        <select value={viewingPlayerId || ''} onChange={e => setViewingPlayerId(e.target.value || null)}>
          <option value="">View: Me (Auto)</option>
          {gameState.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', minHeight: 100, padding: 15, backgroundColor: '#eee', borderRadius: 8 }}>
        {viewingPlayer?.hand.map(card => {
          const isMyTurn = gameState.currentPlayerIndex === gameState.players.findIndex(p => p.socketId === socket?.id);
          const isViewingSelf = viewingPlayer.socketId === socket?.id;
          
          return (
            <button 
              key={card.id} 
              onClick={() => playCard(card)} 
              disabled={!isMyTurn || !isViewingSelf || !gameHasStarted}
              style={{ 
                padding: '15px 10px', 
                minWidth: 80,
                cursor: (isMyTurn && isViewingSelf && gameHasStarted) ? 'pointer' : 'not-allowed',
                boxShadow: '2px 2px 5px rgba(0,0,0,0.1)'
              }}
            >
              {card.rank}<br/>{card.suit}
            </button>
          );
        })}
      </div>

      {/* Wild Card Modal */}
      {selectedCard && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: 30, borderRadius: 12, boxShadow: '0 0 20px rgba(0,0,0,0.3)', zIndex: 100 }}>
          <h3>Wild Card! Choose a Suit</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {['hearts', 'diamonds', 'clubs', 'spades'].map(s => (
              <button 
                key={s} 
                onClick={() => setSelectedSuit(s)} 
                style={{ padding: 10, backgroundColor: selectedSuit === s ? '#4caf50' : '#f0f0f0', color: selectedSuit === s ? 'white' : 'black', cursor: 'pointer' }}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={confirmPlayCard} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>Confirm Move</button>
          <button onClick={() => setSelectedCard(null)} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {/* Controls */}
      <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={drawCard} disabled={!gameHasStarted} style={{ padding: '10px 15px' }}>Draw Card</button>
        <button onClick={passTurn} disabled={!gameHasStarted} style={{ padding: '10px 15px' }}>Pass Turn</button>
        
        <div style={{ marginLeft: 'auto', border: '1px solid #ccc', padding: 10, borderRadius: 4 }}>
          <label>Call Crazy on: </label>
          <select id="crazyTarget">
            <option value="">-- Player --</option>
            {gameState.players.filter(p => p.socketId !== socket?.id).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={callCrazy} style={{ marginLeft: 5 }}>Call!</button>
        </div>
      </div>
    </div>
  );
}