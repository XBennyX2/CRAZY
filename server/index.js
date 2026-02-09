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

  // --- JOIN GAME ---
  socket.on("joinGame", ({ gameId, playerName }) => {
    try {
      const result = gameManager.joinGame(gameId, playerName, socket.id);
      
      // Check if joinGame returned an error (if your logic supports that) or the object
      if (!result || !result.game) {
        socket.emit("error", { message: "Failed to join game" });
        return;
      }

      const { game, player } = result;

      socket.join(gameId);

      // 1. Send the full game state to the person joining
      socket.emit("gameStateUpdate", game);

      // 2. Notify everyone else in the room that a player joined
      // We send the UPDATED GAME STATE to everyone, not just a notification
      socket.to(gameId).emit("gameStateUpdate", game);

      console.log(`${playerName} joined game ${gameId}`);
    } catch (error) {
      console.error("Join Error:", error);
      socket.emit("error", { message: error.message });
    }
  });

  // --- START GAME ---
  socket.on("startGame", ({ gameId }) => {
    console.log(`Start request for ${gameId} from ${socket.id}`);
    try {
      // Pass socket.id so gameManager can verify the user is in the room
      const result = gameManager.startGame(gameId, socket.id);

      // CRITICAL FIX: Check if the result is an error object
      if (result.error) {
        console.error("Start Game Failed:", result.error);
        socket.emit("error", { message: result.error });
      } else {
        // If success, 'result' is the Game Object
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
            // Optional: Emit a specific message saying who was caught
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
      // If a player leaves, update the room so their name disappears
      io.to(game.id).emit("gameStateUpdate", game);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));