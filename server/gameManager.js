const { validateMove } = require('./gameEngine/validateMove');
const { playCard } = require('./gameEngine/playCard');
const { advanceTurn } = require('./gameEngine/advanceTurn');
const { drawStack } = require('./gameEngine/drawStack');

// Generate a shuffled CRAZY deck
function generateDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
  const deck = [];

  // Create cards for each suit and rank
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        id: `${suit}_${rank}_${Math.random()}`,
        suit,
        rank
      });
    });
  });

  // Add jokers if enabled
  if (false) { // TODO: make this configurable
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: `joker_${i}`,
        suit: 'joker',
        rank: 'JOKER'
      });
    }
  }

  // Shuffle the deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// Deal initial hands
function dealCards(game) {
  const cardsPerPlayer = 7;

  game.players.forEach(player => {
    player.hand = [];
    for (let i = 0; i < cardsPerPlayer; i++) {
      const card = game.deck.pop();
      if (card) player.hand.push(card);
    }
  });

  // Set up initial discard pile
  const firstCard = game.deck.pop();
  if (firstCard) {
    game.discardPile = [firstCard];
    game.currentSuit = firstCard.suit;
  }
}

// In-memory storage for games
const games = {};
const players = {}; // socketId -> { gameId, playerId }

function createGame(gameId) {
  if (games[gameId]) return false; // Game already exists

  const deck = generateDeck();

  games[gameId] = {
    players: [],
    currentPlayerIndex: 0,
    direction: 1,
    deck,
    discardPile: [],
    currentSuit: null,
    suitChangeLock: false,
    drawStack: 0,
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

  return true;
}

function joinGame(gameId, playerName, socketId) {
  if (!games[gameId]) {
    createGame(gameId);
  }

  const game = games[gameId];

  // Check if player already in game
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
  if (!playerInfo) return;

  const { gameId, playerId } = playerInfo;
  const game = games[gameId];
  if (!game) return;

  game.players = game.players.filter(p => p.id !== playerId);
  delete players[socketId];

  // If no players left, delete game
  if (game.players.length === 0) {
    delete games[gameId];
  }

  return game;
}

function startGame(gameId) {
  const game = games[gameId];
  if (!game || game.players.length < 2) return false;

  dealCards(game);
  return game;
}

function handlePlayCard(gameId, socketId, move) {
  const game = games[gameId];
  if (!game) return { error: 'Game not found' };

  const playerInfo = players[socketId];
  if (!playerInfo || playerInfo.gameId !== gameId) {
    return { error: 'Player not in game' };
  }

  try {
    // Validate move
    validateMove(game, { ...move, playerId: playerInfo.playerId });

    // Apply move
    const newGameState = playCard(game, { ...move, playerId: playerInfo.playerId });

    // Update game state
    games[gameId] = newGameState;

    return { success: true, gameState: newGameState };
  } catch (error) {
    return { error: error.message };
  }
}

function handleDrawCard(gameId, socketId) {
  const game = games[gameId];
  if (!game) return { error: 'Game not found' };

  const playerInfo = players[socketId];
  if (!playerInfo || playerInfo.gameId !== gameId) {
    return { error: 'Player not in game' };
  }

  try {
    let newGameState = game;

    if (game.drawStack > 0) {
      newGameState = drawStack(game);
    } else {
      // Voluntary draw - advance turn
      newGameState = advanceTurn(game);
    }

    games[gameId] = newGameState;

    return { success: true, gameState: newGameState };
  } catch (error) {
    return { error: error.message };
  }
}

function getGameState(gameId, socketId) {
  const game = games[gameId];
  if (!game) return null;

  const playerInfo = players[socketId];
  if (!playerInfo || playerInfo.gameId !== gameId) return null;

  return game;
}

module.exports = {
  createGame,
  joinGame,
  leaveGame,
  startGame,
  handlePlayCard,
  handleDrawCard,
  getGameState,
  games,
  players
};