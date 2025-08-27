// routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const Room = require('../models/room');

// Create new room
router.post('/rooms', async (req, res) => {
    try {
        const { roomId, name, username } = req.body;
        const room = new Room({
            roomId,
            name: name || `Room ${roomId.slice(0, 8)}`,
            createdBy: username
        });
        await room.save();
        res.status(201).json(room);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// Get user's rooms
router.get('/rooms/user/:username', async (req, res) => {
    try {
        const rooms = await Room.find({ 
            createdBy: req.params.username,
            isActive: true 
        }).sort({ lastActive: -1 });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// Get room details
router.get('/rooms/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch room' });
    }
});

module.exports = router;