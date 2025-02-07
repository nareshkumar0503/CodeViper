// controllers/socketController.js
const Room = require('../models/room');

exports.setupSocket = (socket, io) => {
  socket.on('joinRoom', async ({ roomId, username }) => {
    let room = await Room.findOne({ roomId });
    if (!room) {
      return socket.emit('error', 'Room does not exist');
    }

    // Add user to room
    room.participants.push(username);
    await room.save();

    socket.join(roomId); // Join the room

    io.to(roomId).emit('roomData', { participants: room.participants }); // Update participants list
  });

  socket.on('leaveRoom', async ({ roomId, username }) => {
    let room = await Room.findOne({ roomId });
    if (!room) return;

    // Remove user from room
    room.participants = room.participants.filter(user => user !== username);
    await room.save();

    socket.leave(roomId); // Leave the room
    io.to(roomId).emit('roomData', { participants: room.participants }); // Update participants list
  });
};
