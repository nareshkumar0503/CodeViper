import React, { useState, useEffect } from "react";
import socketIOClient from "socket.io-client";

const MainPage = () => {
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [roomId, setRoomId] = useState("room-abc123"); // Replace with dynamic roomId as needed

  // Initialize socket connection
  useEffect(() => {
    const socket = socketIOClient("http://localhost:5000");

    // Listen for updates when users join or leave
    socket.on("userJoined", (user) => {
      setUsersInRoom((prevUsers) => [...prevUsers, user]);
    });

    socket.on("userLeft", (username) => {
      setUsersInRoom((prevUsers) => prevUsers.filter((user) => user !== username));
    });

    // Join the room (replace with actual room ID)
    socket.emit("joinRoom", { username: "JohnDoe", roomId });

    return () => {
      socket.emit("leaveRoom", { username: "JohnDoe", roomId });
      socket.disconnect();
    };
  }, [roomId]);

  return (
    <div className="flex min-h-screen bg-bgPrimary text-gray-300">
      {/* Sidebar */}
      <div className="w-64 bg-darkGray p-6 flex flex-col justify-between">
        <h2 className="text-3xl font-bold text-greenHighlight mb-8">Room Modules</h2>
        <ul className="space-y-4">
          <li>
            <button className="w-full bg-gray-800 text-white font-semibold py-3 rounded-xl hover:bg-gray-600 transition duration-300">
              Code Editor
            </button>
          </li>
          <li>
            <button className="w-full bg-gray-800 text-white font-semibold py-3 rounded-xl hover:bg-gray-600 transition duration-300">
              Chat
            </button>
          </li>
          <li>
            <button className="w-full bg-gray-800 text-white font-semibold py-3 rounded-xl hover:bg-gray-600 transition duration-300">
              Drawing Tool
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <h2 className="text-3xl font-bold text-greenHighlight">Welcome to the Room</h2>
        <p className="text-xl mb-6">Room ID: {roomId}</p>

        {/* Users in Room */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold">Users in Room:</h3>
          <ul className="space-y-2">
            {usersInRoom.map((user, index) => (
              <li key={index} className="text-lg">{user}</li>
            ))}
          </ul>
        </div>

        {/* Modules Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Code Editor */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-2xl font-semibold text-white mb-4">Code Editor</h3>
            {/* Add code editor here */}
            <div className="bg-black h-60 rounded-xl text-white p-4">Code Editor Here</div>
          </div>

          {/* Chat */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-2xl font-semibold text-white mb-4">Chat</h3>
            {/* Add chat functionality here */}
            <div className="bg-gray-900 h-60 rounded-xl text-white p-4">Chat Here</div>
          </div>

          {/* Drawing Tool */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg col-span-1 lg:col-span-2">
            <h3 className="text-2xl font-semibold text-white mb-4">Drawing Tool</h3>
            {/* Add drawing tool here */}
            <div className="bg-gray-900 h-60 rounded-xl text-white p-4">Drawing Tool Here</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
