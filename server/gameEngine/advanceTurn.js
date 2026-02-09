const { canStack, shuffle } = require('./rules');

function advanceTurn(state) {
  // 1. Deep copy state to maintain immutability
  const newState = {
    ...state,
    players: state.players.map(p => ({ ...p, hand: [...p.hand] })),
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    finishedPlayers: [...state.finishedPlayers]
  };

  const playerCount = newState.players.length;
  let nextIndex = newState.currentPlayerIndex;
  let safety = 0;

  // 2. Find the next valid player (Handling Winners and Skipped Turns)
  while (true) {
    safety++;
    if (safety > playerCount * 2) break; // Emergency break

    // Move index based on current direction (1 or -1)
    nextIndex = (nextIndex + newState.direction + playerCount) % playerCount;
    const player = newState.players[nextIndex];

    // SKIP CONDITION A: Player has already won/finished
    if (newState.finishedPlayers.includes(player.id)) continue;

    // SKIP CONDITION B: Player was skipped (e.g., by a 5)
    if (player.skippedTurns > 0) {
      player.skippedTurns -= 1;
      continue; // Keep moving to the next person
    }

    break; // Found a valid player!
  }

  newState.currentPlayerIndex = nextIndex;

  // 3. Manage Suit-Change Lock expiration
  // The lock should only last for the turn immediately following the Wild card play
  if (newState.suitChangeLock) {
    if (newState.suitChangeLockCounter > 0) {
      newState.suitChangeLockCounter -= 1;
    }
    
    // If the counter hits 0, the lock is officially lifted
    if (newState.suitChangeLockCounter === 0) {
      newState.suitChangeLock = false;
    }
  }

  // 4. Resolve Draw Stack (Auto-pickup if no stackable cards)
  if (newState.drawStack > 0) {
    const activePlayer = newState.players[nextIndex];
    const topCard = newState.discardPile[newState.discardPile.length - 1];

    // Check if the NEW current player has any card that can stack (e.g., another 2)
    const canContinueStack = activePlayer.hand.some(card => canStack(card, topCard));

    if (!canContinueStack) {
      console.log(`${activePlayer.name} has no cards to stack. Auto-drawing ${newState.drawStack} cards.`);
      
      // Force draw
      for (let i = 0; i < newState.drawStack; i++) {
        if (newState.deck.length === 0) {
          if (newState.discardPile.length <= 1) break;
          const currentTop = newState.discardPile.pop();
          newState.deck = shuffle([...newState.discardPile]);
          newState.discardPile = [currentTop];
        }
        
        const drawnCard = newState.deck.pop();
        if (drawnCard) activePlayer.hand.push(drawnCard);
      }

      newState.drawStack = 0;

      // After auto-picking up, the turn is forfeit. Recurse to find the NEXT player.
      return advanceTurn(newState);
    }
  }

  return newState;
}

module.exports = advanceTurn;