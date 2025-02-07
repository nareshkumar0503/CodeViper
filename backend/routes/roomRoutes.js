const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.post('/join', roomController.joinRoom);
router.get('/:roomId/users', roomController.getRoomUsers);

module.exports = router;