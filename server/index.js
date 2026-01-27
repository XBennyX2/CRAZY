const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db"); // optional if using MongoDB
connectDB?.();

const { rooms, joinRoom, leaveRoom, dealCards, playCard } = require("./socket/rooms");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Join room
  socket.on("joinRoom", (roomCode, username) => {
    socket.join(roomCode);
    const players = joinRoom(roomCode, username, socket.id);

    io.to(roomCode).emit("message", `${username} has joined the room`);
    io.to(roomCode).emit("roomData", players);

    // Start game if >=2 players
    if (players.length >= 2 && rooms[roomCode].status === "waiting") {
      dealCards(roomCode);
      rooms[roomCode].status = "playing";
      io.to(roomCode).emit("startGame", rooms[roomCode]);
    }
  });

  // Leave room
  socket.on("leaveRoom", (roomCode) => {
    const players = leaveRoom(roomCode, socket.id);
    socket.leave(roomCode);
    io.to(roomCode).emit("roomData", players);
  });

  // Play card
  socket.on("playCard", (roomCode, card, chosenColor) => {
    const result = playCard(roomCode, socket.id, card, chosenColor);

    if (result) {
      io.to(roomCode).emit("cardPlayed", {
        playedCard: result.playedCard,
        nextPlayerId: result.nextPlayerId,
        room: result.room,
        winner: result.winner,
      });
    } else {
      socket.emit("invalidPlay", "Invalid move or not your turn");
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    for (const roomCode in rooms) {
      const players = leaveRoom(roomCode, socket.id);
      if (players.length > 0) io.to(roomCode).emit("roomData", players);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
