const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db"); // optional if using MongoDB
connectDB?.();

const gameManager = require("./gameManager");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Join game
  socket.on("joinGame", ({ gameId, playerName }) => {
    try {
      const { game, player } = gameManager.joinGame(gameId, playerName, socket.id);
      socket.join(gameId);

      // Send current game state to the joining player
      socket.emit("gameStateUpdate", game);

      // Notify others in the room
      socket.to(gameId).emit("playerJoined", { player });

      console.log(`${playerName} joined game ${gameId}`);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // Start game
  socket.on("startGame", ({ gameId }) => {
    try {
      const gameState = gameManager.startGame(gameId);
      if (gameState) {
        io.to(gameId).emit("gameStateUpdate", gameState);
        console.log(`Game ${gameId} started`);
      } else {
        socket.emit("error", { message: "Cannot start game - need at least 2 players" });
      }
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // Play card
  socket.on("playCard", ({ gameId, move }) => {
    try {
      const result = gameManager.handlePlayCard(gameId, socket.id, move);
      if (result.success) {
        io.to(gameId).emit("gameStateUpdate", result.gameState);
        console.log(`Card played in game ${gameId}`);
      } else {
        socket.emit("error", { message: result.error });
      }
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // Draw card
  socket.on("drawCard", ({ gameId }) => {
    try {
      const result = gameManager.handleDrawCard(gameId, socket.id);
      if (result.success) {
        io.to(gameId).emit("gameStateUpdate", result.gameState);
        console.log(`Card drawn in game ${gameId}`);
      } else {
        socket.emit("error", { message: result.error });
      }
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    const game = gameManager.leaveGame(socket.id);
    if (game) {
      io.to(game.id).emit("gameStateUpdate", game);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
