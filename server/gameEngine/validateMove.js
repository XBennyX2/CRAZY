const { canStack, isSuitChangeCard, matches } = require('./rules');

function validateMove(state, move) {
  const { playerId, cards, suit } = move;

  // 1. Basic Presence Validation
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    throw new Error('No cards played');
  }

  // 2. Player/Turn Validation
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) throw new Error('Player not found');
  if (playerIndex !== state.currentPlayerIndex) throw new Error('Not your turn');

  const player = state.players[playerIndex];

  // 3. Ownership Validation (Security check)
  const hasAllCards = cards.every(c => player.hand.some(h => h.id === c.id));
  if (!hasAllCards) throw new Error('One or more cards not in hand');

  // 4. Identify the Game State
  const isFirstMoveOfGame = state.discardPile.length === 0;
  const topCard = isFirstMoveOfGame ? null : state.discardPile[state.discardPile.length - 1];

  // --- SCENARIO A: FIRST MOVE OF THE GAME (Empty Pile) ---
  if (isFirstMoveOfGame) {
    if (cards.length > 1) {
      const seven = cards.find(c => String(c.rank) === '7');
      if (!seven) throw new Error('To drop multiple cards at once, you must include a 7');

      const baseSuit = seven.suit;
      if (!cards.every(c => c.suit === baseSuit)) {
        throw new Error('All cards in a multi-drop must be the same suit');
      }
    }

    // Wild card check for first move
    if (cards.some(c => isSuitChangeCard(c)) && !suit) {
      throw new Error('Must choose a suit for wild card');
    }
    return; // Valid start
  }

  // --- SCENARIO B: PENALTY STACK (+2, +5) ---
  if (state.drawStack > 0) {
    // Note: Usually, you can only play 1 card to counter a penalty
    if (cards.length !== 1) throw new Error('Must play exactly one card to counter a penalty');
    
    const card = cards[0];
    const canCounter = canStack(card, topCard) || isSuitChangeCard(card);
    
    if (!canCounter) {
      throw new Error(`You must play a draw card to counter the +${state.drawStack}`);
    }
    
    if (isSuitChangeCard(card) && !suit) throw new Error('Suit selection required');
    return;
  }

  // --- SCENARIO C: STANDARD PLAY (Single or Multi-drop) ---
  if (cards.length === 1) {
    // Standard single card match logic
    const card = cards[0];
    if (!matches(card, state.currentSuit, topCard, state.suitChangeLock)) {
      throw new Error(`Invalid move: ${card.rank} of ${card.suit} does not match the current suit (${state.currentSuit})`);
    }
  } else {
    // MULTI-DROP LOGIC (The 7 Rule)
    const seven = cards.find(c => String(c.rank) === '7');
    if (!seven) throw new Error('Multi-drop requires a 7');

    // Rule: Every card in the drop must match the suit of the 7
    const suitOfSeven = seven.suit;
    if (!cards.every(c => c.suit === suitOfSeven)) {
      throw new Error('In a multi-drop, all cards must match the suit of the 7');
    }

    // Rule: The 7 itself must be a legal move (matches suit or rank of the pile)
    if (!matches(seven, state.currentSuit, topCard, state.suitChangeLock)) {
      throw new Error('The 7 in your multi-drop must match the current pile/suit');
    }
  }

  // Final catch-all for Wild Cards (8, J, Joker)
  const containsWild = cards.some(c => isSuitChangeCard(c));
  if (containsWild && !suit) {
    throw new Error('Must choose a suit for wild card selection');
  }
}

module.exports = validateMove;