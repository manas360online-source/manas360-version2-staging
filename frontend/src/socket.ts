import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './lib/runtimeEnv';

const apiBaseUrl = getApiBaseUrl();
const resolveSocketUrl = (): string => {
  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/?$/i, '');
  }

  const explicitBackend = String(import.meta.env.VITE_BACKEND_URL || '').trim();
  if (/^https?:\/\//i.test(explicitBackend)) {
    return explicitBackend.replace(/\/$/, '');
  }

  // In local Vite dev, /api is proxied to backend:3000, but socket.io is not.
  // Route websocket directly to backend to avoid ws://localhost:5173/socket.io failures.
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return window.location.origin.replace(/:\d+$/, ':3000');
  }

  return window.location.origin;
};

const SOCKET_URL = resolveSocketUrl();

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
