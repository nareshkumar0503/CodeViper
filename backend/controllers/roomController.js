// /server/controllers/roomController.js
const rooms = {}; // In-memory storage for rooms

const createRoom = (roomId) => {
  if (!rooms[roomId]) {
    rooms[roomId] = { users: [] };
    return true;
  }
  return false;
};

const getUsersInRoom = (roomId) => {
  return rooms[roomId]?.users || [];
};

module.exports = { createRoom, getUsersInRoom };
