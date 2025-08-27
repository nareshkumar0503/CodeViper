// /server/sockets/socketHandler.js
const { createRoom, getUsersInRoom } = require("../controllers/roomController");

const handleSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected");

    socket.on("joinRoom", ({ username, roomId }) => {
      if (!createRoom(roomId)) {
        socket.emit("error", "Room ID already exists");
        return;
      }

      socket.join(roomId);
      const usersInRoom = getUsersInRoom(roomId);
      usersInRoom.push({ id: socket.id, username });
      io.to(roomId).emit("roomUsers", usersInRoom);
      io.to(roomId).emit("userJoined", { id: socket.id, username });

      socket.on("disconnect", () => {
        const usersInRoom = getUsersInRoom(roomId);
        const userIndex = usersInRoom.findIndex((user) => user.id === socket.id);
        if (userIndex > -1) {
          usersInRoom.splice(userIndex, 1);
        }
        io.to(roomId).emit("roomUsers", usersInRoom);
        io.to(roomId).emit("userLeft", { id: socket.id, username });
      });
    });
  });
};

module.exports = { handleSocketEvents };
