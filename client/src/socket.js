// Initializes and exports the Socket.io client connection to the server
// Singleton — import this same instance everywhere in the app

import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
const socket = io(SERVER_URL, {
  autoConnect: false, // Connect manually after login
});

export default socket;
