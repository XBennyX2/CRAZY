const { isDrawCard, isSkipCard, isReverseCard, isSuitChangeCard } = require('./rules');
const advanceTurn = require('./advanceTurn'); // <--- CRITICAL IMPORT

/**
 * Helper to find who the "next" person is specifically for applying 
 * effects like "Skip" before the turn officially advances.
 */
function getNextValidPlayer(state, currentIndex) {
  let nextIndex = currentIndex;
  const totalPlayers = state.players.length;

  for (let i = 0; i < totalPlayers; i++) {
    nextIndex = (nextIndex + state.direction + totalPlayers) % totalPlayers;
    const targetPlayer = state.players[nextIndex];
    if (!state.finishedPlayers.includes(targetPlayer.id)) {
      return nextIndex;
    }
  }
  return currentIndex;
}

function playCard(state, move) {
  const { playerId, cards, suit } = move;

  if (!cards || cards.length === 0) throw new Error('No cards played');

  // 1. Deep copy state
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
  if (playerIndex === -1) throw new Error('Invalid player');
  const player = newState.players[playerIndex];

  let playedCard;

  // 2. Multi-drop Logic (The "7" Rule)
  if (cards.length > 1) {
    const sevenIndex = cards.findIndex(c => String(c.rank) === '7');
    if (sevenIndex === -1) throw new Error('Multi-drop requires a 7');
    
    const seven = cards[sevenIndex];
    const otherCards = cards.filter((_, idx) => idx !== sevenIndex);

    // Validate suit match
    if (!otherCards.every(c => c.suit === seven.suit)) {
      throw new Error('All cards in multi-drop must have same suit');
    }

    // Remove from hand
    const playedIds = cards.map(c => c.id);
    player.hand = player.hand.filter(c => !playedIds.includes(c.id));

    // Add to discard
    newState.discardPile.push(...otherCards, seven);
    playedCard = seven;
  } else {
    // Single card play
    const card = cards[0];
    player.hand = player.hand.filter(c => c.id !== card.id);
    newState.discardPile.push(card);
    playedCard = card;
  }

  // 3. Apply Card Effects

  // Draw Stack
  if (isDrawCard(playedCard)) {
    const rankStr = String(playedCard.rank);
    if (rankStr === '2') {
      newState.drawStack += 2;
    } else if (rankStr === 'A' && playedCard.suit === 'spades') {
      newState.drawStack += 5;
    }
  }

  // Skip (Rank 5)
  if (isSkipCard(playedCard, newState.settings)) {
    const nextIdx = getNextValidPlayer(newState, playerIndex);
    newState.players[nextIdx].skippedTurns += 1;
  }

  // Reverse (Rank 7 or Settings)
  if (isReverseCard(playedCard, newState.settings)) {
    newState.direction *= -1;
    // In 2-player games, Reverse acts as a Skip
    const activePlayers = newState.players.filter(p => !newState.finishedPlayers.includes(p.id));
    if (activePlayers.length === 2) {
      const nextIdx = getNextValidPlayer(newState, playerIndex);
      newState.players[nextIdx].skippedTurns += 1;
    }
  }

  // Suit Change (8, Jack, Joker)
  if (isSuitChangeCard(playedCard)) {
    if (!suit) throw new Error('Suit selection required for this card');
    newState.currentSuit = suit;
    newState.suitChangeLock = true;
    newState.suitChangeLockCounter = 1; 
  } else {
    newState.currentSuit = playedCard.suit;
    newState.suitChangeLock = false;
  }

  // 4. Win Condition
  if (player.hand.length === 0 && !newState.finishedPlayers.includes(playerId)) {
    newState.finishedPlayers.push(playerId);
  }

  // 5. TURN ADVANCE (This fixes your issue!)
  return advanceTurn(newState);
}

module.exports = { playCard };