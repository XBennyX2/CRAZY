const { canStack, isSuitChangeCard, matches } = require('./rules');

function validateMove(state, move) {
  const { playerId, cards, suit } = move;

  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    throw new Error('No cards played');
  }

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) throw new Error('Player not found');
  if (playerIndex !== state.currentPlayerIndex) throw new Error('Not your turn');

  const player = state.players[playerIndex];
  const topCard = state.discardPile[state.discardPile.length - 1];

  // --- CASE A: DRAW STACK IS ACTIVE (> 0) ---
  if (state.drawStack > 0) {
    if (cards.length !== 1) throw new Error('Must play exactly one card when stacking');
    
    const card = cards[0];
    // Security check: Does the player actually have this card?
    if (!player.hand.some(c => c.id === card.id)) throw new Error('Card not in hand');

    // Logic: To play during a stack, it must be a "stackable" card (another 2/Ace)
    // OR a Wild Card (Suit Change) if your rules allow escaping a stack with a Wild.
    const canIStack = canStack(card, topCard);
    const isWild = isSuitChangeCard(card);

    if (!canIStack && !isWild) {
      throw new Error(`Cannot stack ${card.rank} on a draw penalty. Play a draw card or draw from deck.`);
    }
    
    if (isWild && !suit) throw new Error('Must choose a suit for wild card');
    
    return; // Valid move
  }

  // --- CASE B: NORMAL PLAY (SINGLE CARD) ---
  if (cards.length === 1) {
    const card = cards[0];
    if (!player.hand.some(c => c.id === card.id)) throw new Error('Card not in hand');

    // Use the matches rule from your rules engine
    if (!matches(card, state.currentSuit, topCard, state.suitChangeLock)) {
      throw new Error(`Invalid move: ${card.rank} of ${card.suit} doesn't match ${state.currentSuit}`);
    }

    if (isSuitChangeCard(card) && !suit) {
      throw new Error('Must choose a suit for wild card');
    }
  } 
  // --- CASE C: MULTI-DROP (THE "7" RULE) ---
  else {
    // 1. Cannot multi-drop during a penalty stack
    if (state.drawStack > 0) throw new Error('Cannot multi-drop when draw stack is active');

    // 2. Must contain at least one 7
    const seven = cards.find(c => c.rank === 7 || c.rank === '7');
    if (!seven) throw new Error('Multi-drop must include a 7');

    // 3. The 7 itself must be a valid play on the current top card
    if (!matches(seven, state.currentSuit, topCard, state.suitChangeLock)) {
      throw new Error('The 7 in your multi-drop does not match the pile');
    }

    // 4. All other cards must match the suit of that 7
    const suit7 = seven.suit;
    if (!cards.every(c => c.suit === suit7)) {
      throw new Error('All cards in a multi-drop must be the same suit');
    }

    // 5. Ensure player has all these cards
    const hasAllCards = cards.every(c => player.hand.some(h => h.id === c.id));
    if (!hasAllCards) throw new Error('One or more cards not in hand');
  }
}

module.exports = validateMove;