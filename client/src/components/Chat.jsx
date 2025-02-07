import React, { useState, useEffect } from 'react';

const Chat = ({ socketRef, roomId }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on('message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    return () => {
      socketRef.current.off('message');
    };
  }, [socketRef]);

  const sendMessage = () => {
    if (message.trim()) {
      socketRef.current.emit('message', { roomId, message });
      setMessage('');
    }
  };

  return (
    <div className="chat bg-lightGray p-4 h-96 overflow-auto">
      <div className="messages mb-4">
        {messages.map((msg, index) => (
          <div key={index} className="message p-2 mb-2 bg-white rounded-md">
            <span className="font-semibold">{msg.username}: </span>{msg.message}
          </div>
        ))}
      </div>
      <div className="input flex">
        <input
          type="text"
          className="flex-grow p-2 border rounded-md"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button
          className="ml-2 bg-primary text-white p-2 rounded-md"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
