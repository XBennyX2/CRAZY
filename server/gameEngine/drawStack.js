const { shuffle } = require('./rules');

function drawStack(state) {
  if (state.drawStack <= 0) return state;

  const newState = {
    ...state,
    players: state.players.map(p => ({ ...p, hand: [...p.hand] })),
    deck: [...state.deck],
    discardPile: [...state.discardPile]
  };

  const player = newState.players[newState.currentPlayerIndex];

  for (let i = 0; i < newState.drawStack; i++) {
    if (newState.deck.length === 0) {
      if (newState.discardPile.length <= 1) {
        throw new Error('Cannot reshuffle: not enough cards');
      }

      const topCard = newState.discardPile[newState.discardPile.length - 1];
      const toShuffle = newState.discardPile.slice(0, -1);

      newState.deck = shuffle(toShuffle);
      newState.discardPile = [topCard];
    }

    player.hand.push(newState.deck.pop());
  }

  newState.drawStack = 0;
  return newState;
}

module.exports = drawStack;
