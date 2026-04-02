import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { initSocket, disconnectSocket } from '../socket';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  liveMetrics: any | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  liveMetrics: null,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<any | null>(null);

  const getStoredToken = (): string | null => {
    try {
      const storage = globalThis?.localStorage as { getItem?: (key: string) => string | null } | undefined;
      return typeof storage?.getItem === 'function' ? storage.getItem('token') : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // If user is authenticated, initialize socket
    // AuthContext usually provides user object after successful login
    // we need the token too. 
    // AuthContext sometimes stores it in localStorage.
    const token = getStoredToken();
    
    if (user && token) {
      const s = initSocket(token);
      setSocket(s);

      s.on('connect', () => {
        setConnected(true);
      });

      s.on('disconnect', () => {
        setConnected(false);
      });

      // === PHASE 5: REAL-TIME LISTENERS ===
      s.on('metrics-update', (metrics: any) => {
        setLiveMetrics(metrics);
        console.info('[Socket] Received live metrics', metrics);
      });

      s.on('crisis-alert', (alert: any) => {
        console.warn('[Socket] CRISIS DETECTED', alert);
        // Crisis banners are handled in AdminShellLayout, but here we could trigger global state
      });

      s.on('offer-published', () => {
        // toast.info('Offers updated');
      });

      return () => {
        disconnectSocket();
        setSocket(null);
        setConnected(false);
      };
    } else {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected, liveMetrics }}>
      {children}
    </SocketContext.Provider>
  );
};
