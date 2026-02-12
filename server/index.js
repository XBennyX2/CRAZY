const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db"); // optional
connectDB?.();

// Make sure this path is correct!
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

  // --- JOIN GAME (UPDATED FOR DECK SELECTION) ---
  socket.on("joinGame", ({ gameId, playerName, deckCount }) => {
    try {
      // 1. Create the game if it doesn't exist, passing the deckCount (default to 1)
      // Note: If the game already exists, createGame should return false/ignore.
      gameManager.createGame(gameId, deckCount || 1);

      // 2. Add the player to the game
      const result = gameManager.joinGame(gameId, playerName, socket.id);
      
      if (!result || !result.game) {
        socket.emit("error", { message: "Failed to join game" });
        return;
      }

      const { game } = result;
      socket.join(gameId);

      // Send the full game state to the person joining and everyone else
      io.to(gameId).emit("gameStateUpdate", game);

      console.log(`${playerName} joined game ${gameId} with ${game.settings.decks} deck(s)`);
    } catch (error) {
      console.error("Join Error:", error);
      socket.emit("error", { message: error.message });
    }
  });

  // --- START GAME ---
  socket.on("startGame", ({ gameId }) => {
    console.log(`Start request for ${gameId} from ${socket.id}`);
    try {
      const result = gameManager.startGame(gameId, socket.id);

      if (result.error) {
        console.error("Start Game Failed:", result.error);
        socket.emit("error", { message: result.error });
      } else {
        io.to(gameId).emit("gameStateUpdate", result);
        console.log(`Game ${gameId} started successfully`);
      }
    } catch (error) {
      console.error("Start Game Crash:", error);
      socket.emit("error", { message: "Server error starting game" });
    }
  });

  // --- PLAY CARD ---
  socket.on("playCard", ({ gameId, move }) => {
    try {
      const result = gameManager.handlePlayCard(gameId, socket.id, move);
      if (result.success) {
        io.to(gameId).emit("gameStateUpdate", result.gameState);
      } else {
        socket.emit("error", { message: result.error });
      }
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // --- DRAW CARD ---
  socket.on("drawCard", ({ gameId }) => {
    try {
      const result = gameManager.handleDrawCard(gameId, socket.id);
      if (result.success) {
        io.to(gameId).emit("gameStateUpdate", result.gameState);
      } else {
        socket.emit("error", { message: result.error });
      }
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
  
  // --- PASS TURN ---
  socket.on("pass", ({ gameId }) => {
    try {
      const result = gameManager.handlePass(gameId, socket.id);
      if (result.success) {
        io.to(gameId).emit("gameStateUpdate", result.gameState);
      } else {
        socket.emit("error", { message: result.error });
      }
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // --- CALL CRAZY ---
  socket.on("callCrazy", ({ gameId, targetPlayerId }) => {
    try {
        const result = gameManager.handleCallCrazy(gameId, socket.id, targetPlayerId);
        if (result.success) {
            io.to(gameId).emit("gameStateUpdate", result.gameState);
        } else {
            socket.emit("error", { message: result.error || result.reason });
        }
    } catch (error) {
        socket.emit("error", { message: error.message });
    }
  });

  // --- DISCONNECT ---
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