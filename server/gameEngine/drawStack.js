const { shuffle } = require('./rules');

function drawStack(state) {
  // 1. Safety check
  if (state.drawStack <= 0) return state;

  // 2. Deep copy to maintain immutability
  const newState = {
    ...state,
    players: state.players.map(p => ({ ...p, hand: [...p.hand] })),
    deck: [...state.deck],
    discardPile: [...state.discardPile]
  };

  const player = newState.players[newState.currentPlayerIndex];

  // 3. Draw cards based on the stack count
  for (let i = 0; i < newState.drawStack; i++) {
    if (newState.deck.length === 0) {
      // Handle reshuffling if the deck runs dry during the penalty draw
      if (newState.discardPile.length <= 1) break; // No more cards available anywhere

      const topCard = newState.discardPile.pop();
      newState.deck = shuffle([...newState.discardPile]);
      newState.discardPile = [topCard];
    }

    const drawnCard = newState.deck.pop();
    if (drawnCard) player.hand.push(drawnCard);
  }

  // 4. Reset the stack
  newState.drawStack = 0;

  // 5. CRITICAL: Advance the turn to the next player
  // We manually advance here because drawStack is an alternative to playCard/advanceTurn
  const totalPlayers = newState.players.length;
  let nextIndex = (newState.currentPlayerIndex + newState.direction + totalPlayers) % totalPlayers;

  // Skip players who have already finished
  while (newState.finishedPlayers.includes(newState.players[nextIndex].id)) {
    nextIndex = (nextIndex + newState.direction + totalPlayers) % totalPlayers;
  }

  newState.currentPlayerIndex = nextIndex;

  return newState;
}

module.exports = drawStack;