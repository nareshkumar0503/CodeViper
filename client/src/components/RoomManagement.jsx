import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
const RoomManagement = () => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const socket = useSocket(); // Socket.IO connection

  // Join the room when the form is submitted
  const joinRoom = () => {
    if (username && roomId) {
      socket.emit("joinRoom", { username, roomId });
    }
  };

  // Update the user list when new users join
  useEffect(() => {
    socket.on("userListUpdate", (users) => {
      setUsersInRoom(users);
    });

    socket.on("newUserJoined", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on("userLeft", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      socket.off("userListUpdate");
      socket.off("newUserJoined");
      socket.off("userLeft");
    };
  }, [socket]);

  // Leave the room
  const leaveRoom = () => {
    if (username && roomId) {
      socket.emit("leaveRoom", { username, roomId });
    }
  };

  return (
    <div className="room-management">
      <h2>Room Management</h2>

      <div>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="text"
          placeholder="Enter room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={joinRoom}>Join Room</button>
      </div>

      {usersInRoom.length > 0 && (
        <div>
          <h3>Users in Room:</h3>
          <ul>
            {usersInRoom.map((user, index) => (
              <li key={index}>{user}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <button onClick={leaveRoom}>Leave Room</button>
      </div>

      <div>
        <h3>Messages</h3>
        <ul>
          {messages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RoomManagement;
