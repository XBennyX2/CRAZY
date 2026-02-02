const { isDrawCard, isSkipCard, isReverseCard, isSuitChangeCard } = require('./rules');

function playCard(state, move) {
  const { playerId, cards, suit } = move;

  if (!cards || cards.length === 0) throw new Error('No cards played');

  // deep copy state
  const newState = {
    ...state,
    players: state.players.map(p => ({ ...p, hand: [...p.hand] })),
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    finishedPlayers: [...state.finishedPlayers]
  };

  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) throw new Error('Invalid player');

  const player = newState.players[playerIndex];

  // --- Validate multi-drop (7 rule)
  if (cards.length > 1) {
    const sevenIndex = cards.findIndex(c => c.rank === 7);
    if (sevenIndex === -1) throw new Error('Multi-drop requires a 7');
    const seven = cards[sevenIndex];
    const otherCards = cards.filter((_, idx) => idx !== sevenIndex);

    // verify same suit for remaining cards
    const suitMatch = otherCards.every(c => c.suit === seven.suit);
    if (!suitMatch) throw new Error('All cards in multi-drop must have same suit');

    // remove cards from hand
    const playedIds = cards.map(c => c.id);
    player.hand = player.hand.filter(c => !playedIds.includes(c.id));

    // add to discard pile: other cards first, 7 at bottom
    newState.discardPile.push(...otherCards, seven);

    // last played card for effects
    var playedCard = seven;
  } else {
    // single card
    const card = cards[0];
    player.hand = player.hand.filter(c => c.id !== card.id);
    newState.discardPile.push(card);
    var playedCard = card;
  }

  // --- Apply effects
  // Draw cards
  if (isDrawCard(playedCard)) {
    if (playedCard.rank === 2) newState.drawStack += 2;
    else if (playedCard.rank === 'A' && playedCard.suit === 'spades') newState.drawStack += 5;
  }

  // Skip next valid player
  if (isSkipCard(playedCard, newState.settings)) {
    const nextPlayer = getNextValidPlayer(newState, playerIndex);
    newState.players[nextPlayer].skippedTurns += 1;
  }

  // Reverse
  if (isReverseCard(playedCard, newState.settings)) {
    newState.direction *= -1;
    if (newState.players.length === 2) {
      const nextPlayer = getNextValidPlayer(newState, playerIndex);
      newState.players[nextPlayer].skippedTurns += 1;
    }
  }

  // Suit change
  if (isSuitChangeCard(playedCard)) {
    if (!suit) throw new Error('Suit required for suit change card');
    if (!newState.suitChangeLock) {
      newState.currentSuit = suit;
      newState.suitChangeLock = true;
    }
  } else {
    // update current suit to played card suit if not suit-change
    newState.currentSuit = playedCard.suit;
  }

  // --- Check if player finished
  if (player.hand.length === 0 && !newState.finishedPlayers.includes(playerId)) {
    newState.finishedPlayers.push(playerId);
  }

  return newState;
}

// helper: find next valid player index (skips finished players)
function getNextValidPlayer(state, fromIndex) {
  const count = state.players.length;
  let idx = fromIndex;
  let safety = 0;
  do {
    idx = (idx + state.direction + count) % count;
    safety++;
    if (safety > count) throw new Error('No valid next player');
  } while (state.finishedPlayers.includes(state.players[idx].id));
  return idx;
}

module.exports = playCard;
