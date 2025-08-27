// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const Message = require("../models/messageModel");

router.get("/messages/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId }).sort({ timestamp: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;

// server.js (add this line)
app.use("/api", require("./routes/messageRoutes"));