const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const { joinRoom, leaveRoom } = require("./socket/rooms");

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("joinRoom", (roomCode, username) => {
    socket.join(roomCode);
    const players = joinRoom(roomCode, username, socket.id);
    io.to(roomCode).emit("message", `${username} has joined the room`);
    io.to(roomCode).emit("roomData", players);
  });

  socket.on("leaveRoom", (roomCode) => {
    const players = leaveRoom(roomCode, socket.id);
    socket.leave(roomCode);
    io.to(roomCode).emit("roomData", players);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    // Clean up player from any room
    for (const roomCode in rooms) {
      const players = leaveRoom(roomCode, socket.id);
      if (players.length > 0) {
        io.to(roomCode).emit("roomData", players);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
