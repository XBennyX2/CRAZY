const validateMove = require('./gameEngine/validateMove');
const { playCard } = require('./gameEngine/playCard');
const advanceTurn = require('./gameEngine/advanceTurn');
const { matches, shuffle } = require('./gameEngine/rules');

// --- HELPER: Generate Deck ---
function generateDeck(settings) {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
  let deck = [];

  // Use settings.decks to loop the generation process
  for (let d = 0; d < (settings.decks || 1); d++) {
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push({
          id: `${suit}_${rank}_deck${d}_${Math.random()}`,
          suit,
          rank
        });
      });
    });

    if (settings.includeJokers) {
      for (let i = 0; i < 2; i++) {
        deck.push({ id: `joker_deck${d}_${i}`, suit: 'joker', rank: 'JOKER' });
      }
    }
  }
  return shuffle(deck);
}

const games = {};
const players = {}; // socketId -> { gameId, playerId }

// --- GAME LIFECYCLE ---

/**
 * Creates the game object with the specified number of decks.
 */
function createGame(gameId, deckCount = 1) {
  if (games[gameId]) return false; // Game already exists
  
  const settings = {
    decks: parseInt(deckCount) || 1, // Store the user's choice
    includeJokers: true,
    reverseCard: 7, 
    skipCard: 5,
    allowStacking: true
  };

  games[gameId] = {
    id: gameId,
    players: [],
    currentPlayerIndex: 0,
    direction: 1,
    deck: [],
    discardPile: [],
    currentSuit: null,
    suitChangeLock: false,
    drawStack: 0,
    finishedPlayers: [],
    settings: settings,
    status: 'LOBBY'
  };
  return true;
}

function joinGame(gameId, playerName, socketId) {
  // If game doesn't exist, create it with default 1 deck
  if (!games[gameId]) createGame(gameId, 1);
  const game = games[gameId];

  let player = game.players.find(p => p.socketId === socketId);
  if (!player) {
    player = {
      id: `player_${Date.now()}_${Math.random()}`,
      name: playerName,
      socketId,
      hand: [],
      skippedTurns: 0
    };
    game.players.push(player);
  }

  players[socketId] = { gameId, playerId: player.id };
  return { game, player };
}

function leaveGame(socketId) {
  const playerInfo = players[socketId];
  if (!playerInfo) return null;
  const { gameId, playerId } = playerInfo;
  const game = games[gameId];
  if (!game) return null;

  game.players = game.players.filter(p => p.id !== playerId);
  delete players[socketId];
  
  if (game.players.length === 0) {
    delete games[gameId];
    return null;
  }
  return game;
}

function dealCards(game) {
  game.players.forEach((player, index) => {
    player.hand = [];
    player.skippedTurns = 0;
    // Multi-deck games often require more cards, but we'll stick to 7/8 for now
    const countToDeal = (index === game.currentPlayerIndex) ? 8 : 7; 
    for (let i = 0; i < countToDeal; i++) {
      const card = game.deck.pop();
      if (card) player.hand.push(card);
    }
  });

  game.discardPile = [];
  game.currentSuit = null;
  game.drawStack = 0;
}

function startGame(gameId) {
  const game = games[gameId];
  if (!game || game.players.length < 2) return { error: 'Need at least 2 players' };

  game.isGameOver = false;
  game.rankings = null;
  game.status = 'IN_PROGRESS';
  game.finishedPlayers = [];
  
  // The magic happens here: generateDeck uses game.settings.decks
  game.deck = generateDeck(game.settings);
  game.direction = 1;
  
  dealCards(game);
  game.topCard = null; 
  return game;
}

// --- CORE ACTIONS ---

function handlePlayCard(gameId, socketId, move) {
  const game = games[gameId];
  const playerInfo = players[socketId];
  if (!game || !playerInfo) return { error: 'Game not found' };

  try {
    validateMove(game, { ...move, playerId: playerInfo.playerId });
    const newGameState = playCard(game, { ...move, playerId: playerInfo.playerId });
    
    newGameState.topCard = newGameState.discardPile[newGameState.discardPile.length - 1];
    games[gameId] = newGameState;

    return { success: true, gameState: newGameState, gameOver: !!newGameState.isGameOver };
  } catch (error) {
    return { error: error.message };
  }
}

function handleDrawCard(gameId, socketId) {
  const game = games[gameId];
  const playerInfo = players[socketId];
  if (!game || !playerInfo) return { error: 'Game/Player not found' };

  try {
    const pIdx = game.players.findIndex(p => p.id === playerInfo.playerId);
    if (game.currentPlayerIndex !== pIdx) throw new Error("Not your turn");

    const player = game.players[pIdx];
    const topCard = game.discardPile[game.discardPile.length - 1];

    if (game.drawStack > 0) {
      for (let i = 0; i < game.drawStack; i++) {
        if (game.deck.length === 0) {
          // Reshuffle if deck empty during penalty draw
          if (game.discardPile.length > 1) {
            const top = game.discardPile.pop();
            game.deck = shuffle([...game.discardPile]);
            game.discardPile = [top];
          } else break;
        }
        player.hand.push(game.deck.pop());
      }
      game.drawStack = 0;
      const newState = advanceTurn(game);
      newState.topCard = newState.discardPile[newState.discardPile.length - 1];
      games[gameId] = newState;
      return { success: true, gameState: newState };
    }

    const hasPlayable = topCard && player.hand.some(c => 
        matches(c, game.currentSuit, topCard, game.suitChangeLock)
    );
    if (hasPlayable) throw new Error('You already have playable cards!');

    if (game.deck.length === 0) {
      const top = game.discardPile.pop();
      game.deck = shuffle([...game.discardPile]);
      game.discardPile = [top];
    }

    const drawnCard = game.deck.pop();
    if (drawnCard) player.hand.push(drawnCard);

    const canPlayDrawn = drawnCard && topCard && matches(drawnCard, game.currentSuit, topCard, game.suitChangeLock);

    let newState;
    if (canPlayDrawn) {
      newState = { ...game };
    } else {
      newState = advanceTurn(game);
    }

    newState.topCard = newState.discardPile[newState.discardPile.length - 1];
    games[gameId] = newState;

    return { success: true, gameState: newState, canPlayImmediately: canPlayDrawn };
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = {
  createGame,
  joinGame,
  leaveGame,
  startGame,
  handlePlayCard,
  handleDrawCard,
  games,
  players
};