const { canStackDrawCard } = require('./rules');

function advanceTurn(state) {
  const newState = {
    ...state,
    players: state.players.map(p => ({ ...p, hand: [...p.hand] }))
  };

  const playerCount = newState.players.length;
  let nextIndex = newState.currentPlayerIndex;
  let safety = 0;

  while (true) {
    safety++;
    if (safety > playerCount * 2) {
      throw new Error('No valid next player');
    }

    nextIndex =
      (nextIndex + newState.direction + playerCount) % playerCount;

    const player = newState.players[nextIndex];

    // skip finished players
    if (newState.finishedPlayers.includes(player.id)) {
      continue;
    }

    // consume skipped turn
    if (player.skippedTurns > 0) {
      player.skippedTurns -= 1;
      continue;
    }

    break;
  }

  newState.currentPlayerIndex = nextIndex;

  // resolve draw stack automatically
  if (newState.drawStack > 0) {
    const player = newState.players[nextIndex];
    const topCard =
      newState.discardPile[newState.discardPile.length - 1];

    const canStack = player.hand.some(card =>
      canStackDrawCard(card, topCard, newState.drawStack)
    );

    if (!canStack) {
      for (let i = 0; i < newState.drawStack; i++) {
        if (newState.deck.length === 0) {
          throw new Error('Deck empty — reshuffle not implemented');
        }
        player.hand.push(newState.deck.pop());
      }
      newState.drawStack = 0;

      // player loses turn → advance again ONCE
      return advanceTurn({
        ...newState,
        currentPlayerIndex: nextIndex
      });
    }
  }

  return newState;
}

module.exports = advanceTurn;
