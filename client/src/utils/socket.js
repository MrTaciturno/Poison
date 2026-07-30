import { io } from 'socket.io-client';

// Use same host or fallback window location
const SOCKET_URL = window.location.origin;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});
