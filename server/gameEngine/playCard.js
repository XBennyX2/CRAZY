const { isDrawCard, isSkipCard, isReverseCard, isSuitChangeCard } = require('./rules');
const advanceTurn = require('./advanceTurn');

/**
 * Utility: Find the next player index who hasn't finished the game.
 */
function getNextValidPlayer(state, currentIndex) {
  let nextIndex = currentIndex;
  const totalPlayers = state.players.length;
  // Loop to find the next active player based on direction
  for (let i = 0; i < totalPlayers; i++) {
    nextIndex = (nextIndex + state.direction + totalPlayers) % totalPlayers;
    if (!state.finishedPlayers.includes(state.players[nextIndex].id)) {
      return nextIndex;
    }
  }
  return currentIndex;
}

/**
 * Utility: Calculate rankings based on hand size (used when someone wins).
 */
function calculateRankings(players) {
  return [...players]
    .sort((a, b) => a.hand.length - b.hand.length)
    .map((p, index) => ({
      rank: index + 1,
      name: p.name,
      playerId: p.id,
      cardsLeft: p.hand.length,
      isWinner: p.hand.length === 0
    }));
}

function playCard(state, move) {
  const { playerId, cards, suit } = move;
  if (!cards || cards.length === 0) throw new Error('No cards played');

  // 1. Deep copy for state immutability
  const newState = {
    ...state,
    players: state.players.map(p => ({ 
        ...p, 
        hand: [...p.hand], 
        skippedTurns: p.skippedTurns || 0 
    })),
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    finishedPlayers: [...state.finishedPlayers]
  };

  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  const player = newState.players[playerIndex];

  // 2. Multi-Drop Sanity Check
  // (Your validateMove handles strict rules, this is a safety net)
  if (cards.length > 1) {
    const hasSeven = cards.some(c => String(c.rank) === '7');
    if (!hasSeven) throw new Error('Multi-drop requires at least one 7');
  }

  // 3. Move Cards: Remove from Hand -> Add to Discard Pile
  const playedIds = cards.map(c => c.id);
  player.hand = player.hand.filter(c => !playedIds.includes(c.id));
  
  // Important: The LAST card in the array becomes the visual "Top Card"
  newState.discardPile.push(...cards);
  const topPlayedCard = cards[cards.length - 1];

  // 4. Apply Penalties (Accumulate Draw Stack)
  // Logic: If you drop a 7 and two 2s, the next player gets +4
  cards.forEach(c => {
    if (isDrawCard(c)) {
      const rank = String(c.rank);
      if (rank === '2') newState.drawStack += 2;
      else if (rank === 'A' && c.suit === 'spades') newState.drawStack += 5;
    }
  });

  // 5. Apply Effect Cards (Skip / Reverse)
  // Usually applies based on the CARD ON TOP of the stack you just played
  if (isSkipCard(topPlayedCard, newState.settings)) {
    const nextIdx = getNextValidPlayer(newState, playerIndex);
    newState.players[nextIdx].skippedTurns += 1;
  }
  
  if (isReverseCard(topPlayedCard, newState.settings)) {
    newState.direction *= -1;
    // In a 2-player game, Reverse acts as a Skip
    const activeCount = newState.players.filter(p => !newState.finishedPlayers.includes(p.id)).length;
    if (activeCount === 2) {
      const nextIdx = getNextValidPlayer(newState, playerIndex);
      newState.players[nextIdx].skippedTurns += 1;
    }
  }

  // 6. Suit Management
  // If ANY card played is a Wild (8, J, Joker), the player controls the suit.
  const containsWild = cards.some(c => isSuitChangeCard(c));

  if (containsWild) {
    if (!suit) throw new Error('A suit must be selected for wild cards');
    newState.currentSuit = suit;       // Set to user's choice
    newState.suitChangeLock = true;    // Lock it so next player must match suit
  } else {
    // Normal play: The suit follows the TOP CARD of the drop
    newState.currentSuit = topPlayedCard.suit; 
    newState.suitChangeLock = false;
  }

  // 7. Win Condition Check
  if (player.hand.length === 0) {
    // Add to finished list if not already there
    if (!newState.finishedPlayers.includes(playerId)) {
      newState.finishedPlayers.push(playerId);
    }
    
    newState.isGameOver = true;
    newState.status = 'FINISHED';
    newState.lastWinner = playerId;
    
    // Generate Final Leaderboard
    newState.rankings = calculateRankings(newState.players);
    
    return newState; // Return immediately, do not advance turn
  }

  // 8. Advance Turn
  return advanceTurn(newState);
}

module.exports = { playCard };