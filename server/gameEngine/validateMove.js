const { canStack, isSuitChangeCard, matches } = require('./rules');

function validateMove(state, move) {
  const { playerId, cards, suit } = move;

  if (!cards || cards.length === 0) throw new Error('No cards played');

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex !== state.currentPlayerIndex) throw new Error('Not your turn');

  const player = state.players[playerIndex];
  const topCard = state.discardPile[state.discardPile.length - 1];

  // --- DRAW STACK MUST BE RESOLVED
  if (state.drawStack > 0) {
    if (cards.length !== 1) throw new Error('Must play one card when stacking');
    const card = cards[0];
    if (!player.hand.some(c => c.id === card.id)) throw new Error('Card not in hand');
    if (!canStack(card, topCard) && !isSuitChangeCard(card)) throw new Error('Cannot stack this card');
    return; // valid
  }

  // --- NORMAL PLAY
  if (cards.length === 1) {
    const card = cards[0];
    if (!player.hand.some(c => c.id === card.id)) throw new Error('Card not in hand');
    if (!matches(card, state.currentSuit, topCard, state.suitChangeLock))
      throw new Error('Card does not match current suit or rank');
    if (isSuitChangeCard(card) && !suit) throw new Error('Must choose suit for wild card');
  } else {
    // MULTI-DROP
    if (!cards.some(c => c.rank === 7)) throw new Error('Multi-drop must include a 7');
    if (state.drawStack > 0) throw new Error('Cannot multi-drop when draw stack is active');

    const seven = cards.find(c => c.rank === 7);
    if (!matches(seven, state.currentSuit, topCard, state.suitChangeLock))
      throw new Error('7 does not match current suit or rank');

    const suit7 = seven.suit;
    if (!cards.every(c => c.suit === suit7))
      throw new Error('All cards in multi-drop must have the same suit as 7');

    if (!cards.every(c => player.hand.some(h => h.id === c.id)))
      throw new Error('Some cards are not in hand');
  }
}

module.exports = validateMove;
