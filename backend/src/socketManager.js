const Room = require('./models/roomModel');

module.exports = (io) => {
  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', async ({ roomId, username }) => {
      try {
        socket.join(roomId);
        
        // Add user to room in memory
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(username);
        
        // Update room in database
        await Room.findOneAndUpdate(
          { roomId },
          { $push: { users: { username, socketId: socket.id } } }
        );

        // Emit updated users list to all clients in room
        const users = Array.from(rooms.get(roomId));
        io.to(roomId).emit('user_joined', { users });
        
        console.log(`${username} joined room ${roomId}`);
      } catch (error) {
        console.error('Error in join_room:', error);
      }
    });

    socket.on('disconnecting', async () => {
      try {
        const socketRooms = Array.from(socket.rooms);
        
        for (const roomId of socketRooms) {
          if (roomId !== socket.id) {
            const room = await Room.findOne({ roomId });
            if (room) {
              const user = room.users.find(u => u.socketId === socket.id);
              if (user) {
                // Remove user from room in memory
                rooms.get(roomId)?.delete(user.username);
                
                // Remove user from room in database
                await Room.findOneAndUpdate(
                  { roomId },
                  { $pull: { users: { socketId: socket.id } } }
                );

                // Emit updated users list
                const users = Array.from(rooms.get(roomId) || []);
                io.to(roomId).emit('user_left', { users });
                
                console.log(`${user.username} left room ${roomId}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in disconnecting:', error);
      }
    });
  });
};