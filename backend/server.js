const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const ACTIONS = require('./src/Actions');  // Ensure correct path

// Load environment variables
dotenv.config();

// Import routes and models
const authRoutes = require("./routes/authRoutes");
const User = require("./models/userModel");
require("./config/passport");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Environment Variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());
app.use(express.static(path.join(__dirname, 'build')));

// Routes
app.use("/api", authRoutes);

// ✅ MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// ✅ Authentication Routes
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required", type: "error" });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!", type: "error" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    return res.status(201).json({ message: "Signup successful!", type: "success" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", type: "error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required", type: "error" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid email or password", type: "error" });
    }
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, {
      expiresIn: "1h"
    });
    return res.status(200).json({
      message: "Login successful",
      type: "success",
      token,
      username: user.username
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", type: "error" });
  }
});

// ✅ Health check route
app.get("/health", (req, res) => {
  res.send("✅ Server is up and running");
});

// Serve the React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// ✅ Socket.IO Setup
const userSocketMap = {};  // { socketId: { username, roomId } }

function getAllConnectedClients(roomId) {
  const clients = Object.entries(userSocketMap)
    .filter(([_, user]) => user.roomId === roomId)
    .map(([socketId, user]) => ({
      socketId,
      username: user.username,
    }));

  // Remove duplicate users
  const uniqueClients = clients.filter((client, index, self) =>
    index === self.findIndex((c) => c.username === client.username)
  );

  return uniqueClients;
}

io.on('connection', (socket) => {
  console.log(`🟢 New socket connection: ${socket.id}`);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    if (!username || !roomId) {
      console.warn(`⚠️ Missing username or roomId:`, { roomId, username });
      return;
    }

    // Prevent duplicate user entries in the same room
    const isAlreadyInRoom = Object.values(userSocketMap).some(
      (user) => user.username === username && user.roomId === roomId
    );

    if (isAlreadyInRoom) {
      console.log(`🚫 User ${username} is already in the room.`);
      return;
    }

    console.log(`👤 User ${username} joining room ${roomId}`);

    userSocketMap[socket.id] = { username, roomId };
    socket.join(roomId);

    const clients = getAllConnectedClients(roomId);
    console.log(`👥 Clients in room ${roomId}:`, clients);

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    console.log(`✍️ Code change in room ${roomId}:`, code);
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    console.log(`🔄 Sync code for socket ${socketId}`);
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // ✅ Handle user leaving the room
  socket.on(ACTIONS.LEAVE, ({ roomId, username, socketId }) => {
    console.log(`🚪 ${username} is leaving room ${roomId}`);

    // Remove user from tracking object
    if (userSocketMap[socketId]) {
      delete userSocketMap[socketId];
    }

    // Notify other users
    socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
      socketId,
      username,
    });

    // Leave the room
    socket.leave(roomId);
  });

  socket.on('disconnecting', () => {
    console.log(`❌ User disconnecting: ${socket.id}`);

    if (!userSocketMap[socket.id]) return;

    const { roomId, username } = userSocketMap[socket.id];

    if (roomId) {
      socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: username,
      });
    }

    delete userSocketMap[socket.id];
    socket.leave();
  });

  socket.on('disconnect', () => {
    console.log(`🔴 User fully disconnected: ${socket.id}`);
    delete userSocketMap[socket.id];
  });
});

// ✅ Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
