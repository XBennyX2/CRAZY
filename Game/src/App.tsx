import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: '🃏'
};

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<any | null>(null);
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // NEW: Deck count state
  const [deckCount, setDeckCount] = useState<number>(1);
  const [selectedCards, setSelectedCards] = useState<any[]>([]);
  const [showSuitModal, setShowSuitModal] = useState(false);
  const [selectedSuit, setSelectedSuit] = useState<string>('hearts');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const s: Socket = io(SERVER_URL);
    setSocket(s);

    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));
    s.on('gameStateUpdate', (state: any) => {
      setGameState(state);
      setError('');
      setSelectedCards([]); 
    });
    s.on('error', (data: any) => setError(data?.message || String(data)));

    return () => { s.close(); };
  }, []);

  const joinGame = () => {
    if (!socket || !gameId.trim() || !playerName.trim()) return;
    // UPDATED: Sending deckCount to the server
    socket.emit('joinGame', { 
      gameId: gameId.trim(), 
      playerName: playerName.trim(),
      deckCount: deckCount 
    });
  };

  const startGame = () => {
    if (socket && gameId) socket.emit('startGame', { gameId });
  };

  const toggleCard = (card: any) => {
    if (!isMyTurn) return;
    const isSelected = selectedCards.find(c => c.id === card.id);
    if (isSelected) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      if (selectedCards.length > 0) {
        const firstCard = selectedCards[0];
        if (card.suit !== firstCard.suit && card.rank !== 'JOKER' && firstCard.rank !== 'JOKER') {
          setError("Multi-drop cards must be the same suit!");
          return;
        }
      }
      setSelectedCards([...selectedCards, card]);
      setError('');
    }
  };

  const handlePlayMove = () => {
    if (!socket || !gameId || selectedCards.length === 0) return;
    const sortedCards = [...selectedCards].sort((a, b) => {
      if (String(a.rank) === '7') return -1;
      if (String(b.rank) === '7') return 1;
      return 0;
    });
    const topCard = sortedCards[sortedCards.length - 1];
    const isWild = ['8', 'J', 'JOKER'].includes(String(topCard.rank));
    if (isWild) {
      setShowSuitModal(true);
      return;
    }
    socket.emit('playCard', { gameId, move: { cards: sortedCards } });
  };

  const confirmWildPlay = () => {
    if (!socket || !gameId || selectedCards.length === 0) return;
    const sortedCards = [...selectedCards].sort((a, b) => String(a.rank) === '7' ? -1 : 0);
    socket.emit('playCard', { gameId, move: { cards: sortedCards, suit: selectedSuit } });
    setShowSuitModal(false);
    setSelectedCards([]);
  };

  const drawCard = () => { if (socket && gameId) socket.emit('drawCard', { gameId }); };

  if (!isConnected) return <div style={styles.loading}>Connecting to Server...</div>;

  if (!gameState) {
    return (
      <div style={styles.fullTabLobby}>
        <h1 style={{fontSize: '4rem', color: '#1b5e20', marginBottom: '20px'}}>🃏 CRAZY 7s</h1>
        <div style={styles.loginBox}>
          <input placeholder="Room ID" style={styles.input} value={gameId} onChange={e => setGameId(e.target.value)} />
          <input placeholder="Your Name" style={styles.input} value={playerName} onChange={e => setPlayerName(e.target.value)} />
          
          {/* NEW: Deck Selection UI */}
          <div style={{ marginBottom: 20, textAlign: 'left' }}>
            <label style={{ color: 'black', fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Number of Decks:</label>
            <select 
              value={deckCount} 
              onChange={(e) => setDeckCount(Number(e.target.value))}
              style={styles.select}
            >
              <option value={1}>1 Deck (54 cards)</option>
              <option value={2}>2 Decks (108 cards)</option>
              <option value={3}>3 Decks (162 cards)</option>
            </select>
          </div>

          <button onClick={joinGame} style={styles.primaryBtn}>Join Game</button>
        </div>
        {error && <p style={{ color: 'red', marginTop: 20, fontWeight: 'bold' }}>{error}</p>}
      </div>
    );
  }

  const myPlayer = gameState.players.find((p: any) => p.socketId === socket?.id);
  const isMyTurn = gameState.currentPlayerIndex === gameState.players.findIndex((p: any) => p.socketId === socket?.id);
  const gameHasStarted = gameState.discardPile?.length > 0 || gameState.currentSuit !== null;

  return (
    <div style={styles.fullTabContainer}>
      {gameState.isGameOver && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2>🏆 Round Over!</h2>
            <h3 style={{color: 'black'}}>Winner: {gameState.rankings[0].name}</h3>
            <button onClick={startGame} style={styles.restartBtn}>New Game</button>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <div style={{color: 'black', fontWeight: 'bold'}}>ROOM: {gameId} ({gameState.settings?.decks} Deck{gameState.settings?.decks > 1 ? 's' : ''})</div>
        {!gameHasStarted && isMyTurn && <button onClick={startGame} style={styles.startBtn}>START GAME</button>}
        {error && <span style={{color: 'red', fontWeight: 'bold'}}>{error}</span>}
      </div>

      <div style={styles.mainLayout}>
        <div style={styles.sidebar}>
          <h3 style={{color: 'black', borderBottom: '2px solid #ddd', paddingBottom: 10}}>Players</h3>
          {gameState.players.map((p: any, idx: number) => (
            <div key={p.id} style={{
              ...styles.playerItem,
              backgroundColor: idx === gameState.currentPlayerIndex ? '#c8e6c9' : '#f0f0f0',
              border: idx === gameState.currentPlayerIndex ? '2px solid #2e7d32' : '2px solid transparent',
              opacity: gameState.finishedPlayers.includes(p.id) ? 0.5 : 1
            }}>
              <div style={{fontWeight: 'bold', color: 'black'}}>{p.name} {p.id === myPlayer?.id && '(You)'}</div>
              <div style={{fontSize: '0.9rem', color: '#333'}}>
                {p.hand.length} cards {gameState.finishedPlayers.includes(p.id) && ' - DONE'}
              </div>
            </div>
          ))}
          {gameState.drawStack > 0 && (
            <div style={styles.drawStackWarning}>
              <div style={{fontWeight: 'bold'}}>PENALTY</div>
              <div style={{fontSize: '2rem'}}>+{gameState.drawStack}</div>
            </div>
          )}
        </div>

        <div style={styles.tableCenter}>
          <div style={styles.cardArea}>
            <div style={styles.deck} onClick={drawCard}>
              <div style={styles.cardBackPattern}></div>
              {/* NEW: Remaining cards indicator */}
              <div style={styles.deckCountLabel}>{gameState.deck?.length || 0}</div>
              <span style={{zIndex: 2, fontWeight: 'bold', color: 'white'}}>DRAW</span>
            </div>
            
            <div style={styles.discard}>
              {gameState.topCard ? (
                <div style={{
                    ...styles.cardFace, 
                    color: ['hearts', 'diamonds'].includes(gameState.topCard.suit) ? '#d32f2f' : '#000'
                }}>
                  <div style={styles.cardRank}>{gameState.topCard.rank}</div>
                  <div style={styles.cardSuit}>{SUIT_SYMBOLS[gameState.topCard.suit]}</div>
                </div>
              ) : <div style={{color: '#999'}}>PILE</div>}
            </div>
          </div>

          <div style={styles.suitIndicator}>
            <span style={{color: '#eee', marginRight: 10}}>SUIT TO MATCH:</span>
            <strong style={{
                fontSize: '1.8rem',
                color: ['hearts', 'diamonds'].includes(gameState.currentSuit) ? '#ff8a80' : '#4fc3f7'
            }}>
              {SUIT_SYMBOLS[gameState.currentSuit] || '-'} {gameState.currentSuit?.toUpperCase() || 'ANY'}
            </strong>
          </div>
        </div>
      </div>

      <div style={styles.handArea}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
          <h3 style={{color: 'black', margin: 0}}>Your Hand ({myPlayer?.hand.length})</h3>
          {selectedCards.length > 0 && (
            <button onClick={handlePlayMove} style={styles.playActionBtn}>
              Play {selectedCards.length} Selected
            </button>
          )}
        </div>
        <div style={styles.handScroll}>
          {myPlayer?.hand.map((card: any) => {
             const isSelected = selectedCards.some(c => c.id === card.id);
             return (
                <button 
                  key={card.id} 
                  onClick={() => toggleCard(card)} 
                  disabled={!isMyTurn || gameState.isGameOver}
                  style={{
                    ...styles.handCard,
                    transform: isSelected ? 'translateY(-25px)' : 'none',
                    border: isSelected ? '3px solid #1e88e5' : '1px solid #bbb',
                    color: ['hearts', 'diamonds'].includes(card.suit) ? '#d32f2f' : '#000',
                  }}
                >
                  <div style={styles.cardRankSmall}>{card.rank}</div>
                  <div style={styles.cardSuitLarge}>{SUIT_SYMBOLS[card.suit]}</div>
                </button>
             );
          })}
        </div>
      </div>

      {showSuitModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{color: 'black'}}>Pick New Suit</h3>
            <div style={styles.suitGrid}>
              {['hearts', 'diamonds', 'clubs', 'spades'].map(s => (
                <button key={s} onClick={() => setSelectedSuit(s)} style={{
                  ...styles.suitBtn,
                  backgroundColor: selectedSuit === s ? '#1e88e5' : '#fff',
                  color: selectedSuit === s ? 'white' : 'black',
                }}>
                  <div style={{fontSize: '2.5rem'}}>{SUIT_SYMBOLS[s]}</div>
                </button>
              ))}
            </div>
            <button onClick={confirmWildPlay} style={styles.primaryBtn}>Play</button>
            <button onClick={() => setShowSuitModal(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: any = {
  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', backgroundColor: '#f0f0f0' },
  fullTabLobby: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f5e9', margin: 0 },
  loginBox: { padding: 50, backgroundColor: 'white', borderRadius: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.15)', textAlign: 'center' },
  input: { display: 'block', width: 300, marginBottom: 20, padding: 15, fontSize: '1.1rem', borderRadius: 10, border: '1px solid #ccc' },
  select: { display: 'block', width: '100%', padding: 10, fontSize: '1rem', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer' },
  fullTabContainer: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 0, backgroundColor: 'white' },
  header: { height: '60px', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ddd', backgroundColor: '#fafafa' },
  mainLayout: { flex: 1, display: 'flex', overflow: 'hidden' },
  sidebar: { width: '300px', backgroundColor: '#f5f5f5', borderRight: '1px solid #ddd', padding: 20, overflowY: 'auto' },
  playerItem: { padding: 15, marginBottom: 12, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  drawStackWarning: { marginTop: 20, padding: 20, backgroundColor: '#d32f2f', color: 'white', borderRadius: 15, textAlign: 'center' },
  tableCenter: { flex: 1, backgroundColor: '#1b5e20', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  cardArea: { display: 'flex', gap: 50 },
  deck: { width: 120, height: 180, backgroundColor: '#004d40', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '4px solid white', position: 'relative' },
  deckCountLabel: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: '0.8rem' },
  cardBackPattern: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2, background: 'repeating-linear-gradient(135deg, #fff, #fff 10px, #000 10px, #000 20px)' },
  discard: { width: 120, height: 180, backgroundColor: 'white', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  cardFace: { textAlign: 'center' },
  cardRank: { fontSize: '2.5rem', fontWeight: 'bold' },
  cardSuit: { fontSize: '4rem' },
  suitIndicator: { marginTop: 40, padding: '15px 40px', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 40 },
  handArea: { height: '280px', padding: '10px 30px', borderTop: '2px solid #ddd', backgroundColor: '#fff' },
  handScroll: { display: 'flex', gap: 15, overflowX: 'auto', padding: '30px 10px' },
  handCard: { minWidth: 100, height: 150, backgroundColor: 'white', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', flexShrink: 0 },
  cardRankSmall: { position: 'absolute', top: 5, left: 10, fontSize: '1.4rem', fontWeight: 'bold' },
  cardSuitLarge: { fontSize: '3rem' },
  playActionBtn: { padding: '12px 30px', backgroundColor: '#1e88e5', color: 'white', border: 'none', borderRadius: 30, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'white', padding: 50, borderRadius: 25, textAlign: 'center', minWidth: 450 },
  suitGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, margin: '30px 0' },
  suitBtn: { padding: 20, border: '2px solid #ddd', borderRadius: 15, cursor: 'pointer' },
  primaryBtn: { padding: '15px 40px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: 10, fontSize: '1.1rem', cursor: 'pointer' },
  cancelBtn: { marginLeft: 20, background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' },
  restartBtn: { marginTop: 20, padding: '15px 40px', backgroundColor: '#1e88e5', color: 'white', border: 'none', borderRadius: 10, fontSize: '1.2rem' },
  startBtn: { padding: '10px 25px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }
};