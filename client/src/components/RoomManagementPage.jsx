import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Use useNavigate hook
import socketIOClient from "socket.io-client";

const RoomManagementPage = () => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState(""); // Room ID state
  const [generatedRoomId, setGeneratedRoomId] = useState("");
  const navigate = useNavigate(); // Use useNavigate hook

  // Create a unique room ID
  const generateRoomId = () => {
    const newRoomId = "room-" + Math.random().toString(36).substr(2, 9);
    setGeneratedRoomId(newRoomId); // Update the generated room ID
    setRoomId(newRoomId); // Automatically set roomId state with the generated ID
  };

  // Handle Join Room
  const handleJoinRoom = () => {
    if (!username || !roomId) {
      alert("Please provide both username and room ID!");
      return;
    }
    // Initialize socket connection
    const socket = socketIOClient("http://localhost:5000"); // Make sure the backend is running
    socket.emit("joinRoom", { username, roomId });
    
    // Redirect to main page after joining room
    navigate("/main-page"); // Use navigate instead of history.push
  };

  return (
    <div className="flex min-h-screen w-full bg-bgPrimary text-gray-300 relative">
      <div className="hidden lg:block flex-1">
        <img
          src="/cdcollab.png"
          alt="Collaboration"
          className="w-full h-full object-cover opacity-90"
        />
      </div>

      <div className="flex flex-1 items-center justify-center bg-bgPrimary p-8">
        <div className="w-full max-w-sm bg-darkGray rounded-xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-greenHighlight mb-8 text-center">Room Management</h2>

          <form className="space-y-6">
            {/* Username input */}
            <div className="flex items-center border border-gray-500 rounded-xl p-2">
              <input
                type="text"
                placeholder="Enter your username"
                className="w-full p-3 bg-darkGray border-none text-gray-100 focus:outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {/* Room ID input */}
            <div className="flex items-center border border-gray-500 rounded-xl p-2">
              <input
                type="text"
                placeholder="Enter or generate Room ID"
                className="w-full p-3 bg-darkGray border-none text-gray-100 focus:outline-none"
                value={roomId || generatedRoomId} // Use roomId or generatedRoomId
                onChange={(e) => setRoomId(e.target.value)} // Update roomId manually if needed
              />
            </div>

            <div className="space-x-4">
              <button
                type="button"
                onClick={generateRoomId}
                className="w-full bg-greenHighlight text-white font-semibold py-3 rounded-xl hover:bg-green-600 transition duration-300"
              >
                Generate Room ID
              </button>

              <button
                type="button"
                onClick={handleJoinRoom}
                className="w-full bg-greenHighlight text-white font-semibold py-3 rounded-xl hover:bg-green-600 transition duration-300"
              >
                Join Room
              </button>
            </div>

            {generatedRoomId && (
              <div className="mt-4">
                <p className="text-center text-gray-100">Room ID: {generatedRoomId}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(generatedRoomId)}
                  className="w-full mt-4 bg-white border-2 border-gray-500 text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-4 hover:bg-gray-100 transition duration-300"
                >
                  Copy Room ID
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomManagementPage;
