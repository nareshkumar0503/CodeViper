import { io } from 'socket.io-client';

export const initSocket = async () => {
  if (typeof process === 'undefined') {
    global.process = { env: {} };
  }

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  console.log('🌐 Attempting to connect to:', BACKEND_URL);

  const socket = io(BACKEND_URL, {
    forceNew: true,
    reconnectionAttempts: 5,
    timeout: 10000,
    transports: ['websocket'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomize: true,
    autoConnect: false,
  });

  return new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully to:', BACKEND_URL);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      reject(error);
    });

    socket.on('connect_timeout', (timeout) => {
      console.error('⏳ Connection timeout:', timeout);
      reject(new Error('Connection timeout'));
    });

    socket.connect();

    setTimeout(() => {
      if (!socket.connected) {
        socket.close();
        reject(new Error('❌ Connection timeout exceeded'));
      }
    }, 11000);
  });
};