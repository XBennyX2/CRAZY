// In-memory store for rooms (for dev/testing)
const rooms = {};

/**
 * Create or join a room
 * @param {string} roomCode
 * @param {string} username
 * @param {string} socketId
 * @returns current players in room
 */
function joinRoom(roomCode, username, socketId) {
  if (!rooms[roomCode]) {
    rooms[roomCode] = {
      players: [],
      deck: [],
      discardPile: [],
      currentTurn: 0,
      direction: 1,
      status: "waiting",
    };
  }

  // Add player if not already in room
  if (!rooms[roomCode].players.find((p) => p.socketId === socketId)) {
    rooms[roomCode].players.push({ username, socketId });
  }

  return rooms[roomCode].players;
}

function leaveRoom(roomCode, socketId) {
  if (!rooms[roomCode]) return [];
  rooms[roomCode].players = rooms[roomCode].players.filter(
    (p) => p.socketId !== socketId
  );

  // If room empty, delete it
  if (rooms[roomCode].players.length === 0) {
    delete rooms[roomCode];
    return [];
  }

  return rooms[roomCode].players;
}

module.exports = { rooms, joinRoom, leaveRoom };
