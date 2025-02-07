// models/room.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  participants: [String],  // List of usernames
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
