const validateMove = require('./gameEngine/validateMove');
const playCard = require('./gameEngine/playCard');

function makeCard(id, suit, rank) {
  return { id, suit, rank };
}

function makeGameWithPlayers() {
  return {
    players: [
      { id: 'p1', name: 'A', hand: [], skippedTurns: 0 },
      { id: 'p2', name: 'B', hand: [], skippedTurns: 0 }
    ],
    currentPlayerIndex: 0,
    direction: 1,
    deck: [],
    discardPile: [],
    currentSuit: null,
    suitChangeLock: false,
    drawStack: 0,
    finishedPlayers: [],
    settings: {
      decks: 1,
      includeJokers: false,
      finishPlayersCount: 1,
      reverseCard: 7,
      skipCard: 5,
      allowStacking: true
    }
  };
}

function testStacking() {
  console.log('--- Test: 2 stacking on 2 ---');
  const game = makeGameWithPlayers();
  game.discardPile = [makeCard('d1', 'hearts', 2)];
  game.currentSuit = 'hearts';
  game.players[0].hand.push(makeCard('c1', 'spades', 2));

  try {
    validateMove(game, { playerId: 'p1', cards: [game.players[0].hand[0]] });
    const ns = playCard(game, { playerId: 'p1', cards: [game.players[0].hand[0]] });
    console.log('Stacking played successfully. drawStack =', ns.drawStack);
  } catch (e) {
    console.error('Stacking test failed:', e.message);
  }
}

function testAce2SpadesStack() {
  console.log('--- Test: Ace of spades and 2 of spades stacking ---');
  const game = makeGameWithPlayers();
  game.discardPile = [makeCard('d1', 'spades', 'A')];
  game.currentSuit = 'spades';
  game.players[0].hand.push(makeCard('c1', 'spades', 2));

  try {
    validateMove(game, { playerId: 'p1', cards: [game.players[0].hand[0]] });
    const ns = playCard(game, { playerId: 'p1', cards: [game.players[0].hand[0]] });
    console.log('Ace/2 spades stacking played successfully. drawStack =', ns.drawStack);
  } catch (e) {
    console.error('Ace/2 spades test failed:', e.message);
  }
}

function testMultiDropSeven() {
  console.log('--- Test: Multi-drop with 7 at bottom ---');
  const game = makeGameWithPlayers();
  game.discardPile = [makeCard('d1', 'hearts', 5)];
  game.currentSuit = 'hearts';

  // hand: 2 of hearts, 3 hearts, 7 hearts (must be bottom)
  const c2 = makeCard('c2', 'hearts', 2);
  const c3 = makeCard('c3', 'hearts', 3);
  const s7 = makeCard('s7', 'hearts', 7);
  game.players[0].hand.push(c2, c3, s7);

  try {
    // play order: c2, c3, s7 (7 must be included)
    validateMove(game, { playerId: 'p1', cards: [c2, c3, s7] });
    const ns = playCard(game, { playerId: 'p1', cards: [c2, c3, s7] });
    console.log('Multi-drop applied. last discard rank =', ns.discardPile[ns.discardPile.length-1].rank);
  } catch (e) {
    console.error('Multi-drop test failed:', e.message);
  }
}

function runAll() {
  testStacking();
  testAce2SpadesStack();
  testMultiDropSeven();
}

runAll();
