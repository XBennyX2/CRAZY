const validateMove = require('./gameEngine/validateMove');
const { playCard } = require('./gameEngine/playCard');
const advanceTurn = require('./gameEngine/advanceTurn');
const drawStack = require('./gameEngine/drawStack');
const { matches, shuffle, isDrawCard } = require('./gameEngine/rules');

/**
 * Generates a deck based on game settings.
 */
function generateDeck(settings) {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
  let deck = [];

  for (let d = 0; d < (settings.decks || 1); d++) {
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push({
          id: `${suit}_${rank}_${d}_${Math.random()}`,
          suit,
          rank
        });
      });
    });

    if (settings.includeJokers) {
      for (let i = 0; i < 2; i++) {
        deck.push({
          id: `joker_${d}_${i}`,
          suit: 'joker',
          rank: 'JOKER'
        });
      }
    }
  }

  return shuffle(deck);
}

// In-memory storage
const games = {};
const players = {}; // socketId -> { gameId, playerId }

function createGame(gameId) {
  if (games[gameId]) return false;

  const settings = {
    decks: 1,
    includeJokers: true,
    finishPlayersCount: 1,
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
    suitChangeLockCounter: 0,
    drawStack: 0,
    finishedPlayers: [],
    lastWinner: null,
    settings: settings
  };

  return true;
}

function joinGame(gameId, playerName, socketId) {
  if (!games[gameId]) {
    createGame(gameId);
  }

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

function dealCards(game) {
  const cardsPerPlayer = 7;

  game.players.forEach((player, index) => {
    player.hand = [];
    player.skippedTurns = 0;

    // Standard rule: current player (starter) gets 1 extra card to play first
    const isStarter = (index === game.currentPlayerIndex);
    const countToDeal = isStarter ? cardsPerPlayer + 1 : cardsPerPlayer;

    for (let i = 0; i < countToDeal; i++) {
      const card = game.deck.pop();
      if (card) player.hand.push(card);
    }
  });

  // Initial discard pile
  const firstCard = game.deck.pop();
  if (firstCard) {
    game.discardPile = [firstCard];
    game.currentSuit = firstCard.suit;

    // If first card is a 2 or Ace of Spades, set the stack immediately
    if (isDrawCard(firstCard)) {
      const rankStr = String(firstCard.rank);
      if (rankStr === '2') game.drawStack = 2;
      if (rankStr === 'A' && firstCard.suit === 'spades') game.drawStack = 5;
    }
  }
}

function startGame(gameId, socketId) {
  const game = games[gameId];
  if (!game) return { error: 'Game not found' };

  const playerInRoom = game.players.find(p => p.socketId === socketId);
  if (!playerInRoom) return { error: 'Only players in the room can start the game' };
  if (game.players.length < 2) return { error: 'Need at least 2 players to start' };

  // Set starting player
  if (game.lastWinner) {
    const idx = game.players.findIndex(p => p.id === game.lastWinner);
    game.currentPlayerIndex = (idx !== -1) ? idx : 0;
  } else {
    game.currentPlayerIndex = Math.floor(Math.random() * game.players.length);
  }

  // Reset core state
  game.deck = generateDeck(game.settings);
  game.discardPile = [];
  game.finishedPlayers = [];
  game.drawStack = 0;
  game.suitChangeLock = false;
  game.direction = 1;
  
  dealCards(game);

  return game;
}

function handlePlayCard(gameId, socketId, move) {
  const game = games[gameId];
  if (!game) return { error: 'Game not found' };

  const playerInfo = players[socketId];
  if (!playerInfo) return { error: 'Player info not found' };

  try {
    // 1. Validate the move
    validateMove(game, { ...move, playerId: playerInfo.playerId });

    // 2. Process the card and move to the next turn automatically
    const newGameState = playCard(game, { ...move, playerId: playerInfo.playerId });

    // 3. Track winner
    if (!game.finishedPlayers.includes(playerInfo.playerId) && newGameState.finishedPlayers.includes(playerInfo.playerId)) {
      newGameState.lastWinner = playerInfo.playerId;
    }

    games[gameId] = newGameState;
    return { success: true, gameState: newGameState };
  } catch (error) {
    console.error("PlayCard Error:", error.message);
    return { error: error.message };
  }
}

function handleDrawCard(gameId, socketId) {
  const game = games[gameId];
  if (!game) return { error: 'Game not found' };

  const playerInfo = players[socketId];
  if (!playerInfo) return { error: 'Player info not found' };

  try {
    const playerIndex = game.players.findIndex(p => p.id === playerInfo.playerId);
    if (playerIndex !== game.currentPlayerIndex) throw new Error("Not your turn");
    
    const player = game.players[playerIndex];
    const topCard = game.discardPile[game.discardPile.length - 1];

    // CASE A: Penalty Resolution
    if (game.drawStack > 0) {
      const newGameState = drawStack(game);
      games[gameId] = newGameState;
      return { success: true, gameState: newGameState };
    }

    // CASE B: Manual Draw
    // House Rule: Only allowed to draw if you can't play
    const hasPlayable = player.hand.some(c => matches(c, game.currentSuit, topCard, game.suitChangeLock));
    if (hasPlayable) throw new Error('You have playable cards');

    // Reshuffle if deck empty
    if (game.deck.length === 0) {
      if (game.discardPile.length <= 1) throw new Error("No cards left in game");
      const top = game.discardPile.pop();
      game.deck = shuffle([...game.discardPile]);
      game.discardPile = [top];
    }

    const drawn = game.deck.pop();
    if (drawn) player.hand.push(drawn);

    // After a manual draw, the turn advances
    const newState = advanceTurn(game);
    games[gameId] = newState;
    return { success: true, gameState: newState };
  } catch (error) {
    return { error: error.message };
  }
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