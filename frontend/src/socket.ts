import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin);

export const createSocket = (token: string): Socket => {
  return io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: false,
  });
};

export let socket: Socket | null = null;

export const initSocket = (token: string) => {
  if (socket) {
    socket.disconnect();
  }
  socket = createSocket(token);
  socket.connect();
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
