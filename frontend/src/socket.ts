import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './lib/runtimeEnv';

const apiBaseUrl = getApiBaseUrl();
const SOCKET_URL = /^https?:\/\//i.test(apiBaseUrl)
  ? apiBaseUrl.replace(/\/api\/?$/i, '')
  : window.location.origin;

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
