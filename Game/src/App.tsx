import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000"); // persistent socket outside component

function App() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Only add listeners once
    socket.on("connect", () => {
      console.log("Connected with id:", socket.id);
      socket.emit("joinRoom", "room123", "Benny"); // emit after connection
    });

    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      // Only remove listeners, DON'T disconnect socket
      socket.off("message");
      socket.off("connect");
    };
  }, []);

  return (
    <div>
      <h1>CRAZY GAME</h1>
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
