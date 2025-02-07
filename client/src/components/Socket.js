// src/components/Socket.js
import { io } from 'socket.io-client';

export const socket = io('http://localhost:5000');  // Socket server URL
