const rooms = {};

/** Generate a standard CRAZY/UNO deck */
function generateDeck() {
  const colors = ["red", "green", "blue", "yellow"];
  const numbers = Array.from({ length: 10 }, (_, i) => i.toString());
  const actions = ["skip", "reverse", "+2"];
  const wilds = ["wild", "wild+4"];

  let deck = [];

  // Colored cards
  for (const color of colors) {
    for (const num of numbers) {
      deck.push({ color, value: num });
      if (num !== "0") deck.push({ color, value: num }); // two of each except 0
    }
    for (const action of actions) {
      deck.push({ color, value: action });
      deck.push({ color, value: action }); // two of each
    }
  }

  // Wild cards
  for (const wild of wilds) {
    for (let i = 0; i < 4; i++) deck.push({ color: "wild", value: wild });
  }

  return deck;
}

/** Shuffle array */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Join a room */
function joinRoom(roomCode, username, socketId) {
  if (!rooms[roomCode]) {
    rooms[roomCode] = {
      players: [],
      deck: shuffle(generateDeck()),
      discardPile: [],
      currentTurn: 0,
      direction: 1, // 1 = clockwise, -1 = counterclockwise
      status: "waiting",
    };
  }

  if (!rooms[roomCode].players.find((p) => p.socketId === socketId)) {
    rooms[roomCode].players.push({ username, socketId, hand: [] });
  }

  return rooms[roomCode].players;
}

/** Leave a room */
function leaveRoom(roomCode, socketId) {
  if (!rooms[roomCode]) return [];
  rooms[roomCode].players = rooms[roomCode].players.filter(
    (p) => p.socketId !== socketId
  );

  if (rooms[roomCode].players.length === 0) {
    delete rooms[roomCode];
    return [];
  }

  return rooms[roomCode].players;
}

/** Deal 7 cards to each player */
function dealCards(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  room.players.forEach((player) => {
    player.hand = [];
    for (let i = 0; i < 7; i++) {
      const card = room.deck.pop();
      if (card) player.hand.push(card);
    }
  });

  // Start discard pile with one card
  room.discardPile.push(room.deck.pop());
}

/** Validate card play */
function isValidPlay(card, topCard) {
  return card.color === topCard.color || card.value === topCard.value || card.color === "wild";
}

/** Play a card with CRAZY rules */
function playCard(roomCode, socketId, card, chosenColor = null) {
  const room = rooms[roomCode];
  if (!room) return null;

  const playerIndex = room.players.findIndex((p) => p.socketId === socketId);
  if (playerIndex === -1) return null;

  const player = room.players[playerIndex];

  if (room.currentTurn !== playerIndex) return null; // not player's turn

  const cardIndex = player.hand.findIndex(
    (c) => c.color === card.color && c.value === card.value
  );
  if (cardIndex === -1) return null; // card not in hand

  const topCard = room.discardPile[room.discardPile.length - 1];
  if (!isValidPlay(card, topCard)) return null; // invalid play

  // Remove card from hand and place on discard pile
  const playedCard = player.hand.splice(cardIndex, 1)[0];

  // Handle wild color choice
  if (playedCard.color === "wild" && chosenColor) {
    playedCard.color = chosenColor;
  }

  room.discardPile.push(playedCard);

  // Special cards
  let skipNext = false;
  let drawCount = 0;

  switch (playedCard.value) {
    case "skip":
      skipNext = true;
      break;
    case "reverse":
      room.direction *= -1;
      break;
    case "+2":
      drawCount = 2;
      skipNext = true;
      break;
    case "wild+4":
      drawCount = 4;
      skipNext = true;
      break;
  }

  // Determine next turn
  let nextTurn =
    (room.currentTurn + room.direction + room.players.length) % room.players.length;

  if (skipNext) {
    nextTurn =
      (nextTurn + room.direction + room.players.length) % room.players.length;
  }

  room.currentTurn = nextTurn;

  // Make next player draw cards if needed
  if (drawCount > 0) {
    const nextPlayer = room.players[room.currentTurn];
    for (let i = 0; i < drawCount; i++) {
      const c = room.deck.pop();
      if (c) nextPlayer.hand.push(c);
    }
  }

  // Check for winner
  let winner = null;
  if (player.hand.length === 0) {
    winner = player.username;
    room.status = "finished";
  }

  return { playedCard, nextPlayerId: room.players[room.currentTurn].socketId, winner, room };
}

module.exports = {
  rooms,
  joinRoom,
  leaveRoom,
  dealCards,
  playCard,
};
