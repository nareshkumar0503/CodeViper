import React, { useState, useEffect, useRef } from "react";
import { FaPaperPlane } from "react-icons/fa";

const Chat = ({ socketRef, roomId, username }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // ✅ Load messages when joining a new room
  useEffect(() => {
    if (!roomId) return;
  
    // ✅ Clear previous room messages immediately before setting new ones
    setMessages([]);
  
    // ✅ Load only messages for the new room
    const savedMessages = JSON.parse(localStorage.getItem(`chat_${roomId}`)) || [];
    
    setMessages(savedMessages);
  
    if (socketRef.current) {
      socketRef.current.on("receive_message", (message) => {
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages, message];
  
          // ✅ Store messages only for the current room
          localStorage.setItem(`chat_${roomId}`, JSON.stringify(updatedMessages));
  
          return updatedMessages;
        });
      });
    }
  
    return () => {
      socketRef.current?.off("receive_message");
  
      // ✅ Remove messages from localStorage on unmount (optional)
      // localStorage.removeItem(`chat_${roomId}`);
    };
  }, [socketRef, roomId]); // ✅ Now listens to roomId changes
  


  // ✅ Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (newMessage.trim() === "") return;

    const messageData = {
      roomId,
      username,
      message: newMessage,
      time: new Date().toLocaleTimeString(),
    };

    // ✅ Emit message to server
    socketRef.current.emit("send_message", messageData);

    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, messageData];

      // ✅ Save sent messages to localStorage
      localStorage.setItem(`chat_${roomId}`, JSON.stringify(updatedMessages));

      return updatedMessages;
    });

    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-800 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white">Group Chat</h2>
        <p className="text-sm text-gray-400">Room: {roomId}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              msg.username === username ? "items-end" : "items-start"
            }`}
          >
            <span className="text-sm text-gray-400 mb-1 px-2">
              {msg.username === username ? "You" : msg.username}
            </span>
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.username === username
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-100"
              }`}
            >
              <p className="text-sm">{msg.message}</p>
              <span className="text-xs opacity-75 mt-1 block">{msg.time}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-gray-800 border-t border-gray-700"
      >
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
          >
            <FaPaperPlane size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
