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
const axios = require("axios");
const rateLimit = require("express-rate-limit");

const ACTIONS = {
  JOIN: "join",
  JOINED: "joined",
  DISCONNECTED: "disconnected",
  CODE_CHANGE: "code-change",
  SYNC_CODE: "sync-code",
  LEAVE: "leave",
  FETCH_USERS: "fetch-users",
  USERS_FETCHED: "users-fetched",
  CREATE_ROOM: "create-room",
  ROOM_CREATED: "room-created",
  FETCH_ROOMS: "fetch-rooms",
  ROOMS_FETCHED: "rooms-fetched",
};

const ANALYTICS_ACTIONS = {
  TRACKING_STARTED: "TRACKING_STARTED",
  TRACKING_STOPPED: "TRACKING_STOPPED",
  CODE_CHANGE: "CODE_CHANGE",
  TYPING: "TYPING",
  FILE_CREATED: "FILE_CREATED",
  MESSAGE_SENT: "MESSAGE_SENT",
  DRAWING_UPDATE: "DRAWING_UPDATE",
  COMPILER_STATUS: "COMPILER_STATUS",
  ANALYTICS_RESET: "ANALYTICS_RESET",
};

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const User = require("./models/userModel");
const Room = require("./models/room");
const Analytics = require("./models/analyticsModel");
require("./config/passport");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI || !JWT_SECRET) {
  console.error("❌ Missing critical environment variables (MONGO_URI or JWT_SECRET)");
  process.exit(1);
}

const executeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: "Too many execution requests from this IP, please try again later.",
});

app.use(cors());
app.use(express.json());
const session = require("express-session");

app.use(
  session({
    secret: process.env.SESSION_SECRET || "someSecretKey",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, "build")));

const userSocketMap = {};
const roomCodeMap = {};
const sessionStartTimes = {};

app.use("/api", authRoutes);
app.use("/api", roomRoutes);

app.post("/api/execute", executeLimiter, async (req, res) => {
  try {
    const { script, language, stdin } = req.body;
    if (!script || !language) {
      return res.status(400).json({ error: "Script and language are required" });
    }
    if (!process.env.JDOODLE_CLIENT_ID || !process.env.JDOODLE_CLIENT_SECRET) {
      return res.status(500).json({ error: "JDoodle API credentials are missing" });
    }
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script,
      language,
      versionIndex: "0",
      stdin,
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    });
    res.json(response.data);
  } catch (error) {
    console.error("JDoodle API error:", error.response?.data || error.message);
    if (error.response?.status === 429) {
      res.status(429).json({ error: "JDoodle API rate limit exceeded. Please wait and try again later." });
    } else if (error.response?.status) {
      res.status(error.response.status).json({
        error: error.response.data?.error || "JDoodle API error",
      });
    } else {
      res.status(500).json({ error: "Internal server error: " + error.message });
    }
  }
});

app.get("/api/jdoodle-usage", async (req, res) => {
  try {
    const response = await axios.post("https://api.jdoodle.com/v1/credit-spent", {
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    });
    res.json(response.data);
  } catch (error) {
    console.error("JDoodle usage error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/rooms/:roomId/active-users", async (req, res) => {
  try {
    const { roomId } = req.params;
    const clients = Object.entries(userSocketMap)
      .filter(([_, user]) => user.roomId === roomId)
      .map(([socketId, user]) => ({ socketId, username: user.username }));
    res.status(200).json(clients);
  } catch (error) {
    console.error("Error fetching active users:", error);
    res.status(500).json({ error: "Failed to fetch active users" });
  }
});

app.delete("/api/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const result = await Room.deleteOne({ roomId });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Room not found" });
    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ error: "Failed to delete room" });
  }
});

app.patch("/api/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Room name is required" });
    const updatedRoom = await Room.findOneAndUpdate({ roomId }, { name }, { new: true });
    if (!updatedRoom) return res.status(404).json({ error: "Room not found" });
    res.status(200).json(updatedRoom);
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ error: "Failed to update room" });
  }
});

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

const validateDrawingData = (data, eventType) => {
  const requiredFields = {
    DRAWING_UPDATE: ["roomId", "username", "type", "data"],
    SHAPE_ADD: ["roomId", "username", "shape", "page"],
    TEXT_ADD: ["roomId", "username", "textObject", "page"],
    IMAGE_ADD: ["roomId", "username", "imageObject", "page"],
    ELEMENT_MOVE: ["roomId", "username", "elementId", "newPosition", "page"],
    CANVAS_RESET: ["roomId", "username", "bgColor", "page"],
  };
  const fields = requiredFields[eventType];
  if (!fields) return false;
  return fields.every((field) => data[field] !== undefined && data[field] !== null);
};

function getAllConnectedClients(roomId) {
  return Object.entries(userSocketMap)
    .filter(([_, user]) => user.roomId === roomId)
    .map(([socketId, user]) => ({ socketId, username: user.username }));
}

async function calculateRoomMetrics(clients, roomId) {
  const analytics = await Analytics.findOne({ roomId });

  console.log(`Calculating metrics for room ${roomId}, clients: ${clients.length}, analytics: ${!!analytics}`);

  if (!analytics || !analytics.data) {
    return {
      activeUsers: clients.length,
      actionsPerMinute: 0,
      collaborationEvents: 0,
      avgSessionTime: 0,
      peakActivityTime: null,
      totalSessionHours: 0,
      linesOfCode: 0,
      compilationFrequency: 0,
    };
  }

  const data = Object.fromEntries(analytics.data);
  const minuteAgo = new Date(Date.now() - 60000).toISOString();
  let actionsLastMinute = 0;
  let collaborationEvents = 0;

  for (const userData of Object.values(data)) {
    if (userData.events) {
      actionsLastMinute += userData.events.filter((e) => e.timestamp > minuteAgo).length;
      collaborationEvents += userData.events.filter((e) =>
        [ANALYTICS_ACTIONS.MESSAGE_SENT, ANALYTICS_ACTIONS.DRAWING_UPDATE].includes(e.actionType)
      ).length;
    }
  }

  const activeUserCount = Math.max(clients.length, 1);
  const avgSessionMinutes = analytics.totalSessionHours > 0 ? (analytics.totalSessionHours / activeUserCount) * 60 : 0;

  const timeSlots = {};
  let peakActivityTime = null;
  let maxActions = 0;

  for (const userData of Object.values(data)) {
    if (userData.events) {
      userData.events.forEach((event) => {
        const hour = new Date(event.timestamp).getHours();
        timeSlots[hour] = (timeSlots[hour] || 0) + 1;
        if (timeSlots[hour] > maxActions) {
          maxActions = timeSlots[hour];
          peakActivityTime = `${hour}:00`;
        }
      });
    }
  }

  console.log(`Metrics for ${roomId}: activeUsers=${clients.length}, actionsPerMinute=${actionsLastMinute}, collaborationEvents=${collaborationEvents}, avgSessionTime=${avgSessionMinutes}`);

  return {
    activeUsers: clients.length,
    actionsPerMinute: actionsLastMinute,
    collaborationEvents,
    avgSessionTime: avgSessionMinutes,
    peakActivityTime: peakActivityTime || "N/A",
    totalSessionHours: analytics.totalSessionHours || 0,
    linesOfCode: analytics.linesOfCode || 0,
    compilationFrequency: analytics.compilationFrequency || 0,
  };
}

io.on("connection", (socket) => {
  console.log(`🟢 New socket connection: ${socket.id}`);

  socket.on("connect_error", (error) => console.error("Socket connect_error:", error));

  socket.on(ACTIONS.CREATE_ROOM, async ({ roomId, username, name }) => {
    try {
      if (!roomId || !username) {
        socket.emit("ERROR", { message: "Room ID and username are required" });
        return;
      }
      const existingRoom = await Room.findOne({ roomId });
      if (!existingRoom) {
        const room = new Room({
          roomId,
          name: name || `Room ${roomId.slice(0, 8)}`,
          createdBy: username,
          isActive: true,
        });
        await room.save();
        socket.emit(ACTIONS.ROOM_CREATED, { room });
        console.log(`🏠 New room created: ${roomId} by ${username}`);
      } else {
        socket.emit(ACTIONS.ROOM_CREATED, { room: existingRoom });
        console.log(`🏠 Using existing room: ${roomId}`);
      }
      const clients = getAllConnectedClients(roomId);
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);
    } catch (error) {
      console.error("❌ Error creating room:", error);
      socket.emit("ERROR", { message: "Failed to create room" });
    }
  });

  socket.on(ACTIONS.FETCH_ROOMS, async ({ username }) => {
    try {
      if (!username) {
        socket.emit("ERROR", { message: "Username is required" });
        return;
      }
      const rooms = await Room.find({ createdBy: username, isActive: true }).sort({ lastActive: -1 });
      socket.emit(ACTIONS.ROOMS_FETCHED, { rooms });
      console.log(`📋 Fetched ${rooms.length} rooms for ${username}`);
    } catch (error) {
      console.error("❌ Error fetching rooms:", error);
      socket.emit("ERROR", { message: "Failed to fetch rooms" });
    }
  });

  socket.on(ACTIONS.FETCH_USERS, async ({ roomId }) => {
    try {
      if (!roomId) {
        socket.emit("ERROR", { message: "Room ID is required" });
        return;
      }
      const clients = getAllConnectedClients(roomId);
      socket.emit(ACTIONS.USERS_FETCHED, { clients });
      console.log(`👥 Fetched ${clients.length} users for room ${roomId}`);
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);
    } catch (error) {
      console.error("❌ Error in FETCH_USERS handler:", error);
      socket.emit("ERROR", { message: "Failed to fetch users" });
    }
  });

  socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
    try {
      if (!username || !roomId) {
        socket.emit("ERROR", { message: "Username and Room ID are required" });
        return;
      }

      let room = await Room.findOne({ roomId });
      if (!room) {
        room = new Room({
          roomId,
          name: `Room ${roomId.slice(0, 8)}`,
          createdBy: username,
          isActive: true,
        });
        await room.save();
        console.log(`🏠 Created new room during join: ${roomId}`);
      } else {
        await Room.findOneAndUpdate({ roomId }, { lastActive: new Date() });
      }

      const existingSession = Object.entries(userSocketMap).find(
        ([_, user]) => user.username === username && user.roomId === roomId
      );
      if (existingSession) {
        const oldSocketId = existingSession[0];
        io.to(oldSocketId).emit(ACTIONS.DISCONNECTED, {
          socketId: oldSocketId,
          username,
          clients: getAllConnectedClients(roomId),
        });
        delete userSocketMap[oldSocketId];
        delete sessionStartTimes[oldSocketId];
        console.log(`Removed existing session for ${username} in room ${roomId}`);
      }

      userSocketMap[socket.id] = { username, roomId };
      socket.join(roomId);
      sessionStartTimes[socket.id] = new Date();

      const clients = getAllConnectedClients(roomId);
      io.to(roomId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });

      if (roomCodeMap[roomId]) {
        io.to(socket.id).emit(ACTIONS.CODE_CHANGE, { code: roomCodeMap[roomId] });
      }

      io.to(roomId).emit("USER_ACTION", {
        timestamp: new Date().toISOString(),
        user: username,
        roomId,
        actionType: ANALYTICS_ACTIONS.JOIN,
      });
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);
      console.log(`👤 ${username} joined room ${roomId} with ${clients.length} clients`);
    } catch (error) {
      console.error(`❌ Error in JOIN handler:`, error);
      socket.emit("ERROR", { message: "Failed to join room" });
    }
  });

  socket.on(ACTIONS.CODE_CHANGE, async ({ roomId, code, fileName, username }) => {
    try {
      console.log(`CODE_CHANGE received: roomId=${roomId}, fileName=${fileName}, username=${username}, codeLength=${code?.length || 0}`);

      if (!roomId) {
        console.warn(`Missing required field in CODE_CHANGE: roomId=${roomId}`);
        socket.emit("ERROR", { message: "Room ID is required" });
        return;
      }

      const effectiveUsername = username || (userSocketMap[socket.id]?.username || "Unknown");
      console.log(`Using username: ${effectiveUsername}`);

      const effectiveFileName = fileName || "defaultFile.js";
      console.log(`Using fileName: ${effectiveFileName}`);

      if (!roomCodeMap[roomId]) roomCodeMap[roomId] = {};
      roomCodeMap[roomId][effectiveFileName] = code;
      socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code, fileName: effectiveFileName });
      io.to(roomId).emit("USER_ACTION", {
        timestamp: new Date().toISOString(),
        user: effectiveUsername,
        roomId,
        actionType: ANALYTICS_ACTIONS.CODE_CHANGE,
        details: { file: effectiveFileName, linesChanged: (code.match(/\n/g) || []).length + 1 },
      });
      const clients = getAllConnectedClients(roomId);
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);
      console.log(`📝 Code updated in room ${roomId} for file ${effectiveFileName} by ${effectiveUsername}`);
    } catch (error) {
      console.error(`❌ Error in CODE_CHANGE handler:`, error);
      socket.emit("ERROR", { message: "Failed to update code" });
    }
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    try {
      if (!socketId) {
        socket.emit("ERROR", { message: "Socket ID is required" });
        return;
      }
      io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
      console.log(`🔄 Code synced with socket ${socketId}`);
    } catch (error) {
      console.error(`❌ Error in SYNC_CODE handler:`, error);
      socket.emit("ERROR", { message: "Failed to sync code" });
    }
  });

  socket.on(ACTIONS.LEAVE, async ({ roomId, username }) => {
    try {
      const user = userSocketMap[socket.id];
      if (!user) {
        socket.emit("ERROR", { message: "User not found in socket map" });
        return;
      }
      username = username || user.username;
      const sessionDuration = (new Date() - (sessionStartTimes[socket.id] || new Date())) / (1000 * 60 * 60);
      delete userSocketMap[socket.id];
      delete sessionStartTimes[socket.id];
      await Room.findOneAndUpdate({ roomId }, { lastActive: new Date() });
      socket.leave(roomId);
      const clients = getAllConnectedClients(roomId);
      io.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username,
        clients,
      });
      io.to(roomId).emit("USER_ACTION", {
        timestamp: new Date().toISOString(),
        user: username,
        roomId,
        actionType: ANALYTICS_ACTIONS.LEAVE,
      });
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);
      console.log(`👤 ${username} left room ${roomId} with ${clients.length} remaining clients`);
    } catch (error) {
      console.error(`❌ Error in LEAVE handler:`, error);
      socket.emit("ERROR", { message: "Failed to leave room" });
    }
  });

  socket.on("file_created", async ({ roomId, file, username }) => {
    try {
      if (!roomId || !file || !username) {
        socket.emit("ERROR", { message: "Room ID, file, and username are required" });
        return;
      }
      socket.to(roomId).emit("file_created", { file, username });
      io.to(roomId).emit("USER_ACTION", {
        timestamp: new Date().toISOString(),
        user: username,
        roomId,
        actionType: ANALYTICS_ACTIONS.FILE_CREATED,
        details: { fileName: file.name },
      });
      const clients = getAllConnectedClients(roomId);
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);
      console.log(`📄 File created in room ${roomId}: ${file.name} by ${username}`);
    } catch (error) {
      console.error(`❌ Error in file_created handler:`, error);
      socket.emit("ERROR", { message: "Failed to create file" });
    }
  });

  socket.on("file_deleted", ({ roomId, fileName, username }) => {
    try {
      if (!roomId || !fileName || !username) {
        socket.emit("ERROR", { message: "Room ID, file name, and username are required" });
        return;
      }
      socket.to(roomId).emit("file_deleted", { fileName, username });
      console.log(`🗑️ File deleted in room ${roomId}: ${fileName} by ${username}`);
    } catch (error) {
      console.error(`❌ Error in file_deleted handler:`, error);
      socket.emit("ERROR", { message: "Failed to delete file" });
    }
  });

  socket.on("file_renamed", ({ roomId, oldFileName, newFileName, language, username }) => {
    try {
      if (!roomId || !oldFileName || !newFileName || !username) {
        socket.emit("ERROR", { message: "Room ID, old file name, new file name, and username are required" });
        return;
      }
      socket.to(roomId).emit("file_renamed", { oldFileName, newFileName, language, username });
      console.log(`✏️ File renamed in room ${roomId}: ${oldFileName} to ${newFileName} by ${username}`);
    } catch (error) {
      console.error(`❌ Error in file_renamed handler:`, error);
      socket.emit("ERROR", { message: "Failed to rename file" });
    }
  });

  socket.on("disconnecting", async () => {
    try {
      const user = userSocketMap[socket.id];
      if (user) {
        const { roomId, username } = user;
        const analytics = await Analytics.findOne({ roomId });
        if (analytics && sessionStartTimes[socket.id]) {
          const sessionDuration = (new Date() - sessionStartTimes[socket.id]) / (1000 * 60 * 60);
          analytics.totalSessionHours += sessionDuration;
          analytics.data = Object.fromEntries(analytics.data);
          await analytics.save();
        }
        delete userSocketMap[socket.id];
        delete sessionStartTimes[socket.id];
        await Room.findOneAndUpdate({ roomId }, { lastActive: new Date() });
        socket.leave(roomId);
        const clients = getAllConnectedClients(roomId);
        io.to(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username,
          clients,
        });
        const metrics = await calculateRoomMetrics(clients, roomId);
        io.to(roomId).emit("UPDATE_METRICS", metrics);
        console.log(`👤 ${username} disconnected from room ${roomId} with ${clients.length} remaining clients`);
      }
    } catch (error) {
      console.error(`❌ Error in disconnecting handler:`, error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Socket disconnected: ${socket.id}`);
  });

  socket.on("send_message", async (messageData) => {
    try {
      if (!messageData.roomId || !messageData.message || !messageData.username) {
        socket.emit("ERROR", { message: "Room ID, message, and username are required" });
        return;
      }
      const message = {
        ...messageData,
        time: new Date().toLocaleTimeString(),
      };
      socket.to(messageData.roomId).emit("receive_message", message);
      io.to(messageData.roomId).emit("USER_ACTION", {
        timestamp: new Date().toISOString(),
        user: messageData.username,
        roomId: messageData.roomId,
        actionType: ANALYTICS_ACTIONS.MESSAGE_SENT,
        details: { message: messageData.message },
      });
      const clients = getAllConnectedClients(messageData.roomId);
      const metrics = await calculateRoomMetrics(clients, messageData.roomId);
      io.to(messageData.roomId).emit("UPDATE_METRICS", metrics);
      console.log(`💬 Message sent in room ${messageData.roomId} by ${messageData.username}`);
    } catch (error) {
      console.error(`❌ Error in send_message handler:`, error);
      socket.emit("ERROR", { message: "Failed to send message" });
    }
  });

  socket.on("user_typing_start", async ({ roomId, username }) => {
    try {
      if (!roomId || !username) {
        socket.emit("ERROR", { message: "Room ID and username are required" });
        return;
      }
      socket.to(roomId).emit("user_typing_start", { username });
      io.to(roomId).emit("USER_ACTION", {
        timestamp: new Date().toISOString(),
        user: username,
        roomId,
        actionType: ANALYTICS_ACTIONS.TYPING,
        details: { duration: 10 },
      });
      const clients = getAllConnectedClients(roomId);
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);
      console.log(`⌨️ ${username} started typing in room ${roomId}`);
    } catch (error) {
      console.error(`❌ Error in user_typing_start handler:`, error);
      socket.emit("ERROR", { message: "Failed to process typing start" });
    }
  });

  socket.on("user_typing_end", ({ roomId, username }) => {
    try {
      if (!roomId || !username) {
        socket.emit("ERROR", { message: "Room ID and username are required" });
        return;
      }
      socket.to(roomId).emit("user_typing_end", { username });
      console.log(`⌨️ ${username} stopped typing in room ${roomId}`);
    } catch (error) {
      console.error(`❌ Error in user_typing_end handler:`, error);
      socket.emit("ERROR", { message: "Failed to process typing end" });
    }
  });

  socket.on("compiler_test_cases_update", ({ roomId, testCases }) => {
    try {
      if (!roomId || !testCases) {
        socket.emit("ERROR", { message: "Room ID and test cases are required" });
        return;
      }
      socket.to(roomId).emit("compiler_test_cases_update", { testCases });
      console.log(`📊 Test cases updated in room ${roomId}`);
    } catch (error) {
      console.error(`❌ Error in compiler_test_cases_update handler:`, error);
      socket.emit("ERROR", { message: "Failed to update test cases" });
    }
  });

  socket.on("compiler_status_change", async ({ roomId, isRunning, username }) => {
    try {
      if (!roomId || isRunning === undefined) {
        console.warn(`Missing required fields in compiler_status_change: roomId=${roomId}, isRunning=${isRunning}`);
        socket.emit("ERROR", { message: "Room ID and compiler status are required" });
        return;
      }
      const effectiveUsername = username || (userSocketMap[socket.id]?.username || "Unknown");
      socket.to(roomId).emit("compiler_status_change", { isRunning });
      io.to(roomId).emit("USER_ACTION", {
        timestamp: new Date().toISOString(),
        user: effectiveUsername,
        roomId,
        actionType: ANALYTICS_ACTIONS.COMPILER_STATUS,
        details: { isRunning },
      });
      const clients = getAllConnectedClients(roomId);
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);
      console.log(`⚙️ Compiler status updated in room ${roomId}: ${isRunning} by ${effectiveUsername}`);
    } catch (error) {
      console.error(`❌ Error in compiler_status_change handler:`, error);
      socket.emit("ERROR", { message: "Failed to update compiler status" });
    }
  });

  socket.on("input_only_update", ({ roomId, input }) => {
    try {
      if (!roomId || input === undefined) {
        socket.emit("ERROR", { message: "Room ID and input are required" });
        return;
      }
      socket.to(roomId).emit("input_only_update", { input });
      console.log(`📝 Input-Only input updated in room ${roomId}`);
    } catch (error) {
      console.error(`❌ Error in input_only_update handler:`, error);
      socket.emit("ERROR", { message: "Failed to update input-only input" });
    }
  });

  socket.on("input_only_output_update", ({ roomId, output }) => {
    try {
      if (!roomId || output === undefined) {
        socket.emit("ERROR", { message: "Room ID and output are required" });
        return;
      }
      socket.to(roomId).emit("input_only_output_update", { output });
      console.log(`📝 Input-Only output updated in room ${roomId}`);
    } catch (error) {
      console.error(`❌ Error in input_only_output_update handler:`, error);
      socket.emit("ERROR", { message: "Failed to update input-only output" });
    }
  });

  socket.on("DRAWING_UPDATE", async (data) => {
    try {
      if (!validateDrawingData(data, "DRAWING_UPDATE")) {
        socket.emit("ERROR", { message: "Invalid drawing update data" });
        return;
      }
      socket.to(data.roomId).emit("DRAWING_UPDATE", data);
      io.to(data.roomId).emit("USER_ACTION", {
        timestamp: new Date().toISOString(),
        user: data.username,
        roomId: data.roomId,
        actionType: ANALYTICS_ACTIONS.DRAWING_UPDATE,
        details: { tool: data.type },
      });
      const clients = getAllConnectedClients(data.roomId);
      const metrics = await calculateRoomMetrics(clients, data.roomId);
      io.to(data.roomId).emit("UPDATE_METRICS", metrics);
      console.log(`✏️ Broadcasted DRAWING_UPDATE to room ${data.roomId}`);
    } catch (error) {
      console.error(`❌ Error in DRAWING_UPDATE handler:`, error);
      socket.emit("ERROR", { message: "Failed to process drawing update" });
    }
  });

  socket.on("SHAPE_ADD", (data) => {
    try {
      if (!validateDrawingData(data, "SHAPE_ADD")) {
        socket.emit("ERROR", { message: "Invalid shape add data" });
        return;
      }
      socket.to(data.roomId).emit("SHAPE_ADD", data);
      console.log(`✏️ Broadcasted SHAPE_ADD to room ${data.roomId}`);
    } catch (error) {
      console.error(`❌ Error in SHAPE_ADD handler:`, error);
      socket.emit("ERROR", { message: "Failed to process shape add" });
    }
  });

  socket.on("TEXT_ADD", (data) => {
    try {
      if (!validateDrawingData(data, "TEXT_ADD")) {
        socket.emit("ERROR", { message: "Invalid text add data" });
        return;
      }
      socket.to(data.roomId).emit("TEXT_ADD", data);
      console.log(`✏️ Broadcasted TEXT_ADD to room ${data.roomId}`);
    } catch (error) {
      console.error(`❌ Error in TEXT_ADD handler:`, error);
      socket.emit("ERROR", { message: "Failed to process text add" });
    }
  });

  socket.on("IMAGE_ADD", (data) => {
    try {
      if (!validateDrawingData(data, "IMAGE_ADD")) {
        socket.emit("ERROR", { message: "Invalid image add data" });
        return;
      }
      socket.to(data.roomId).emit("IMAGE_ADD", data);
      console.log(`✏️ Broadcasted IMAGE_ADD to room ${data.roomId}`);
    } catch (error) {
      console.error(`❌ Error in IMAGE_ADD handler:`, error);
      socket.emit("ERROR", { message: "Failed to process image add" });
    }
  });

  socket.on("ELEMENT_MOVE", (data) => {
    try {
      if (!validateDrawingData(data, "ELEMENT_MOVE")) {
        socket.emit("ERROR", { message: "Invalid element move data" });
        return;
      }
      socket.to(data.roomId).emit("ELEMENT_MOVE", data);
      console.log(`✏️ Broadcasted ELEMENT_MOVE to room ${data.roomId}`);
    } catch (error) {
      console.error(`❌ Error in ELEMENT_MOVE handler:`, error);
      socket.emit("ERROR", { message: "Failed to process element move" });
    }
  });

  socket.on("CANVAS_RESET", (data) => {
    try {
      if (!validateDrawingData(data, "CANVAS_RESET")) {
        socket.emit("ERROR", { message: "Invalid canvas reset data" });
        return;
      }
      socket.to(data.roomId).emit("CANVAS_RESET", data);
      console.log(`✏️ Broadcasted CANVAS_RESET to room ${data.roomId}`);
    } catch (error) {
      console.error(`❌ Error in CANVAS_RESET handler:`, error);
      socket.emit("ERROR", { message: "Failed to process canvas reset" });
    }
  });

  socket.on("START_TRACKING", async ({ roomId, username }, callback) => {
    try {
      if (!roomId || !username) {
        socket.emit("ERROR", { message: "Room ID and username are required" });
        if (callback) callback({ error: "Room ID and username are required" });
        return;
      }

      socket.join(roomId); // Ensure the socket is in the room

      let analytics = await Analytics.findOne({ roomId });
      if (!analytics) {
        analytics = new Analytics({
          roomId,
          data: new Map(),
          totalSessionHours: 0,
          totalActions: 0,
          linesOfCode: 0,
          compilationFrequency: 0,
        });
      }

      sessionStartTimes[socket.id] = new Date();
      analytics.data = Object.fromEntries(analytics.data);
      await analytics.save();

      io.to(roomId).emit("ACTION_LOG", {
        timestamp: new Date().toISOString(),
        user: username,
        roomId,
        actionType: ANALYTICS_ACTIONS.TRACKING_STARTED,
      });

      const clients = getAllConnectedClients(roomId);
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);

      // Emit acknowledgment to the client
      socket.emit("START_TRACKING_ACK");
      if (callback) callback();

      console.log(`📊 Analytics tracking started for room ${roomId} by ${username}`);
    } catch (error) {
      console.error("❌ Error starting tracking:", error);
      socket.emit("ERROR", { message: "Failed to start tracking" });
      if (callback) callback({ error: "Failed to start tracking" });
    }
  });

  socket.on("STOP_TRACKING", async ({ roomId, username }, callback) => {
    try {
      if (!roomId || !username) {
        socket.emit("ERROR", { message: "Room ID and username are required" });
        if (callback) callback({ error: "Room ID and username are required" });
        return;
      }

      const analytics = await Analytics.findOne({ roomId });
      if (analytics && sessionStartTimes[socket.id]) {
        const sessionDuration = (new Date() - sessionStartTimes[socket.id]) / (1000 * 60 * 60);
        analytics.totalSessionHours += sessionDuration;
        analytics.data = Object.fromEntries(analytics.data);
        await analytics.save();
        delete sessionStartTimes[socket.id];
      }

      io.to(roomId).emit("ACTION_LOG", {
        timestamp: new Date().toISOString(),
        user: username,
        roomId,
        actionType: ANALYTICS_ACTIONS.TRACKING_STOPPED,
      });

      const clients = getAllConnectedClients(roomId);
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);
      console.log(`📊 Analytics tracking stopped for room ${roomId} by ${username}`);

      if (callback) callback();
    } catch (error) {
      console.error("❌ Error stopping tracking:", error);
      socket.emit("ERROR", { message: "Failed to stop tracking" });
      if (callback) callback({ error: "Failed to stop tracking" });
    }
  });

  socket.on("USER_ACTION", async (action, callback) => {
    try {
      console.log(`📝 User action received: ${action.actionType}, roomId: ${action.roomId}`);

      if (!action.roomId || !action.user || !action.actionType) {
        socket.emit("ERROR", { message: "Room ID, username, and action type are required" });
        if (callback) callback({ error: "Room ID, username, and action type are required" });
        return;
      }
      if (!Object.values(ANALYTICS_ACTIONS).includes(action.actionType)) {
        socket.emit("ERROR", { message: "Invalid action type" });
        if (callback) callback({ error: "Invalid action type" });
        return;
      }

      let analytics = await Analytics.findOne({ roomId: action.roomId });
      if (!analytics) {
        analytics = new Analytics({
          roomId: action.roomId,
          data: new Map(),
          totalSessionHours: 0,
          totalActions: 0,
          linesOfCode: 0,
          compilationFrequency: 0,
        });
      }

      const data = Object.fromEntries(analytics.data);
      if (!data[action.user]) {
        data[action.user] = {
          events: [],
          totalActions: 0,
          linesOfCode: 0,
          compilations: 0,
          lastActive: new Date().toISOString(),
        };
      }

      const userData = data[action.user];
      const userAction = {
        actionType: action.actionType,
        user: action.user,
        details: action.details,
        timestamp: action.timestamp || new Date().toISOString(),
      };

      userData.events.push(userAction);
      userData.totalActions += 1;
      userData.lastActive = userAction.timestamp;

      analytics.totalActions += 1;

      if (action.actionType === ANALYTICS_ACTIONS.CODE_CHANGE && action.details?.linesChanged) {
        userData.linesOfCode += action.details.linesChanged;
        analytics.linesOfCode += action.details.linesChanged;
      }

      if (action.actionType === ANALYTICS_ACTIONS.COMPILER_STATUS && action.details?.isRunning) {
        userData.compilations += 1;
        analytics.compilationFrequency += 1;
      }

      analytics.data = new Map(Object.entries(data));
      analytics.data = Object.fromEntries(analytics.data);
      await analytics.save();

      io.to(action.roomId).emit("ACTION_LOG", userAction);
      const clients = getAllConnectedClients(action.roomId);
      const metrics = await calculateRoomMetrics(clients, action.roomId);
      io.to(action.roomId).emit("UPDATE_METRICS", metrics);

      console.log(`📊 Action logged for ${action.user} in room ${action.roomId}: ${action.actionType}, details: ${JSON.stringify(action.details)}`);
      if ([ANALYTICS_ACTIONS.MESSAGE_SENT, ANALYTICS_ACTIONS.DRAWING_UPDATE].includes(action.actionType)) {
        console.log(`Collaboration event recorded: ${action.actionType} by ${action.user} in room ${action.roomId}`);
      }

      if (callback) callback();
    } catch (error) {
      console.error("❌ Error logging user action:", error);
      socket.emit("ERROR", { message: "Failed to log action" });
      if (callback) callback({ error: "Failed to log action" });
    }
  });

  socket.on("GET_WEEKLY_REPORT", async ({ roomId, startDate, endDate }) => {
    try {
      if (!roomId || !startDate || !endDate) {
        socket.emit("ERROR", { message: "Room ID, start date, and end date are required" });
        return;
      }

      const analytics = await Analytics.findOne({ roomId });
      if (!analytics) {
        io.to(roomId).emit("WEEKLY_REPORT", {
          totalActions: 0,
          totalSessionHours: 0,
          peakDay: "N/A",
          linesOfCode: 0,
          collaborationEvents: 0,
          startDate,
          endDate,
        });
        return;
      }

      const data = Object.fromEntries(analytics.data);
      const events = [];
      for (const userData of Object.values(data)) {
        if (userData.events) {
          events.push(
            ...userData.events.filter(
              (e) => e.timestamp >= startDate && e.timestamp <= endDate
            )
          );
        }
      }

      const dayCounts = {};
      events.forEach((event) => {
        const day = new Date(event.timestamp).toLocaleDateString();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });

      let peakDay = "N/A";
      let collaborationEvents = 0;
      if (Object.keys(dayCounts).length > 0) {
        peakDay = Object.keys(dayCounts).reduce((a, b) => (dayCounts[a] > dayCounts[b] ? a : b));
        collaborationEvents = events.filter((e) =>
          [ANALYTICS_ACTIONS.MESSAGE_SENT, ANALYTICS_ACTIONS.DRAWING_UPDATE].includes(e.actionType)
        ).length;
      }

      io.to(roomId).emit("WEEKLY_REPORT", {
        totalActions: events.length,
        totalSessionHours: analytics.totalSessionHours,
        peakDay,
        linesOfCode: analytics.linesOfCode,
        collaborationEvents,
        startDate,
        endDate,
      });
      console.log(`📅 Weekly report generated for room ${roomId}: totalActions=${events.length}, peakDay=${peakDay}, collaborationEvents=${collaborationEvents}`);
    } catch (error) {
      console.error("❌ Error generating weekly report:", error);
      socket.emit("ERROR", { message: "Failed to generate weekly report" });
    }
  });

  socket.on("GET_CUSTOM_REPORT", async ({ roomId, startDate, endDate }) => {
    try {
      if (!roomId || !startDate || !endDate) {
        socket.emit("ERROR", { message: "Room ID, start date, and end date are required" });
        return;
      }

      const analytics = await Analytics.findOne({ roomId });
      if (!analytics) {
        io.to(roomId).emit("CUSTOM_REPORT", {
          totalActions: 0,
          totalSessionHours: 0,
          linesOfCode: 0,
          compilationFrequency: 0,
          startDate,
          endDate,
        });
        return;
      }

      const data = Object.fromEntries(analytics.data);
      const events = [];
      for (const userData of Object.values(data)) {
        if (userData.events) {
          events.push(
            ...userData.events.filter(
              (e) => e.timestamp >= startDate && e.timestamp <= endDate
            )
          );
        }
      }

      io.to(roomId).emit("CUSTOM_REPORT", {
        totalActions: events.length,
        totalSessionHours: analytics.totalSessionHours,
        linesOfCode: analytics.linesOfCode,
        compilationFrequency: analytics.compilationFrequency,
        startDate,
        endDate,
      });
      console.log(`📅 Custom report generated for room ${roomId}`);
    } catch (error) {
      console.error("❌ Error generating custom report:", error);
      socket.emit("ERROR", { message: "Failed to generate custom report" });
    }
  });

  socket.on("RESET_ANALYTICS", async ({ roomId }) => {
    try {
      if (!roomId) {
        socket.emit("ERROR", { message: "Room ID is required" });
        return;
      }

      await Analytics.findOneAndDelete({ roomId });
      for (const [socketId, user] of Object.entries(userSocketMap)) {
        if (user.roomId === roomId) {
          delete sessionStartTimes[socketId];
        }
      }

      io.to(roomId).emit("ACTION_LOG", {
        timestamp: new Date().toISOString(),
        user: userSocketMap[socket.id]?.username || "Unknown",
        roomId,
        actionType: ANALYTICS_ACTIONS.ANALYTICS_RESET,
      });

      const clients = getAllConnectedClients(roomId);
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);
      console.log(`🗑️ Analytics reset for room ${roomId}`);
    } catch (error) {
      console.error("❌ Error resetting analytics:", error);
      socket.emit("ERROR", { message: "Failed to reset analytics" });
    }
  });

  socket.on("FETCH_ANALYTICS", async ({ roomId }) => {
    try {
      if (!roomId) {
        socket.emit("ERROR", { message: "Room ID is required" });
        return;
      }

      const analytics = await Analytics.findOne({ roomId });
      const userStats = {};

      if (analytics) {
        const data = Object.fromEntries(analytics.data);
        for (const [user, userData] of Object.entries(data)) {
          userStats[user] = {
            actions: userData.totalActions,
            lastActive: userData.lastActive,
            sessionDuration: 0,
            linesOfCode: userData.linesOfCode,
            compilations: userData.compilations,
          };
        }
      }

      const userActivity = analytics
        ? Array.from(Object.values(Object.fromEntries(analytics.data)))
            .flatMap((userData) => userData.events || [])
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        : [];

      socket.emit("INITIAL_ANALYTICS", {
        userActivity,
        userStats,
      });
      console.log(`📊 Fetched analytics for room ${roomId}: userActivity=${userActivity.length}`);
      const clients = getAllConnectedClients(roomId);
      const metrics = await calculateRoomMetrics(clients, roomId);
      io.to(roomId).emit("UPDATE_METRICS", metrics);
    } catch (error) {
      console.error("❌ Error fetching analytics:", error);
      socket.emit("ERROR", { message: "Failed to fetch analytics" });
    }
  });
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));