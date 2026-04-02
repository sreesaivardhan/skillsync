// Initializes and exports the Socket.io client connection to the server
// Singleton — import this same instance everywhere in the app

import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  autoConnect: false, // Connect manually after login
});

export default socket;
