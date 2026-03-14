import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type StartVideoSessionPayload = {
  sessionId: string;
  roomName: string;
  jitsiJwt?: string | null;
};

type VideoSessionContextValue = {
  isActiveSession: boolean;
  sessionId: string | null;
  roomName: string | null;
  jitsiJwt: string | null;
  isMinimized: boolean;
  sessionStartedAt: number | null;
  elapsedSeconds: number;
  startSession: (payload: StartVideoSessionPayload) => void;
  setIsMinimized: (value: boolean) => void;
  endSession: () => void;
};

const VideoSessionContext = createContext<VideoSessionContextValue | null>(null);

export const VideoSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [isActiveSession, setIsActiveSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [jitsiJwt, setJitsiJwt] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const activeSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isActiveSession || !sessionStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)));
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isActiveSession, sessionStartedAt]);

  const startSession = useCallback((payload: StartVideoSessionPayload) => {
    const incomingSessionId = String(payload.sessionId || '').trim();
    const incomingRoomName = String(payload.roomName || '').trim();
    if (!incomingSessionId || !incomingRoomName) return;

    const isSameSession = activeSessionIdRef.current === incomingSessionId;

    setIsActiveSession(true);
    setSessionId(incomingSessionId);
    setRoomName(incomingRoomName);
    setJitsiJwt(payload.jitsiJwt ? String(payload.jitsiJwt) : null);
    setIsMinimized(false);
    if (!isSameSession) {
      const startedAt = Date.now();
      setSessionStartedAt(startedAt);
      setElapsedSeconds(0);
    }
    activeSessionIdRef.current = incomingSessionId;
  }, []);

  const endSession = useCallback(() => {
    setIsActiveSession(false);
    setSessionId(null);
    setRoomName(null);
    setJitsiJwt(null);
    setIsMinimized(false);
    setSessionStartedAt(null);
    setElapsedSeconds(0);
    activeSessionIdRef.current = null;
  }, []);

  const value = useMemo<VideoSessionContextValue>(() => ({
    isActiveSession,
    sessionId,
    roomName,
    jitsiJwt,
    isMinimized,
    sessionStartedAt,
    elapsedSeconds,
    startSession,
    setIsMinimized,
    endSession,
  }), [isActiveSession, sessionId, roomName, jitsiJwt, isMinimized, sessionStartedAt, elapsedSeconds]);

  return <VideoSessionContext.Provider value={value}>{children}</VideoSessionContext.Provider>;
};

export const useVideoSession = (): VideoSessionContextValue => {
  const context = useContext(VideoSessionContext);
  if (!context) {
    throw new Error('useVideoSession must be used within VideoSessionProvider');
  }
  return context;
};
