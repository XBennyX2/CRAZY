const { canStack, shuffle } = require('./rules');

function advanceTurn(state) {
  // 1. Deep copy
  const newState = {
    ...state,
    players: state.players.map(p => ({ ...p, hand: [...p.hand] })),
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    finishedPlayers: [...state.finishedPlayers]
  };

  const playerCount = newState.players.length;
  let nextIndex = newState.currentPlayerIndex;

  // 2. MOVE POINTER TO NEXT PLAYER
  let safety = 0;
  while (true) {
    safety++;
    if (safety > playerCount * 2) break; 

    nextIndex = (nextIndex + newState.direction + playerCount) % playerCount;
    const player = newState.players[nextIndex];

    if (newState.finishedPlayers.includes(player.id)) continue;

    if (player.skippedTurns > 0) {
      player.skippedTurns -= 1;
      continue; 
    }
    break; 
  }
  newState.currentPlayerIndex = nextIndex;

  // 3. Resolve Suit Lock
  if (newState.suitChangeLock) {
    newState.suitChangeLockCounter = Math.max(0, (newState.suitChangeLockCounter || 0) - 1);
    if (newState.suitChangeLockCounter === 0) newState.suitChangeLock = false;
  }

  // 4. PENALTY CHECK
  if (newState.drawStack > 0) {
    const activePlayer = newState.players[nextIndex];
    const topCard = newState.discardPile[newState.discardPile.length - 1];

    // Can they counter/stack?
    const canContinueStack = activePlayer.hand.some(card => canStack(card, topCard));

    if (!canContinueStack) {
      // --- AUTO-DRAW LOGIC ---
      console.log(`Player ${activePlayer.name} takes penalty of ${newState.drawStack} cards`);
      
      for (let i = 0; i < newState.drawStack; i++) {
        if (newState.deck.length === 0) {
          if (newState.discardPile.length <= 1) break;
          const top = newState.discardPile.pop();
          newState.deck = shuffle([...newState.discardPile]);
          newState.discardPile = [top];
        }
        const drawn = newState.deck.pop();
        if (drawn) activePlayer.hand.push(drawn);
      }

      // Reset the stack so they can now play a normal card
      newState.drawStack = 0;

      // --- THE FIX IS HERE ---
      // Previously: return advanceTurn(newState); // <--- This was skipping their turn
      // Now: We just return. The turn POINTER stays on them, but stack is gone.
      return newState; 
    }
  }

  return newState;
}

module.exports = advanceTurn;