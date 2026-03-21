import { Minimize2, Maximize2, PhoneOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import VideoRoom from '../jitsi/VideoRoom';
import { useVideoSession } from '../../context/VideoSessionContext';
import { useAuth } from '../../context/AuthContext';

type PersistentVideoLayoutProps = {
  children: React.ReactNode;
};

const buildDisplayName = (firstName?: string | null, lastName?: string | null, email?: string | null): string => {
  const full = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
  return full || String(email || 'Provider');
};

export default function PersistentVideoLayout({ children }: PersistentVideoLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isActiveSession,
    sessionId,
    roomName,
    jitsiJwt,
    isMinimized,
    setIsMinimized,
    endSession,
  } = useVideoSession();

  const displayName = buildDisplayName(user?.firstName, user?.lastName, user?.email);
  const isProviderLiveSessionRoute = /^\/provider\/live-session\/.+/.test(location.pathname);

  const handleMaximizeFromPip = () => {
    // Provider shell owns persistent video state, so always restore the provider live-session route.
    if (sessionId && location.pathname !== `/provider/live-session/${sessionId}`) {
      navigate(`/provider/live-session/${sessionId}`);
    }
    setIsMinimized(false);
  };

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full">{children}</div>

      {isActiveSession && sessionId && roomName ? (
        isMinimized ? (
          <div className="fixed bottom-6 right-6 z-50 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-2xl" style={{ width: 320, height: 180 }}>
            <div className="flex h-8 items-center justify-between bg-slate-900/90 px-2 text-white">
              <p className="text-[10px] font-semibold">Live Session</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleMaximizeFromPip}
                  className="rounded bg-white/10 p-1 hover:bg-white/20"
                  title="Maximize"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={endSession}
                  className="rounded bg-rose-600/90 p-1 hover:bg-rose-500"
                  title="End call"
                >
                  <PhoneOff className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="h-[calc(100%-32px)] w-full">
              <VideoRoom
                sessionId={sessionId}
                roomName={roomName}
                displayName={displayName}
                jitsiJwt={jitsiJwt}
                className="h-full w-full"
                onEndCall={endSession}
              />
            </div>
          </div>
        ) : !isProviderLiveSessionRoute ? (
          <div className="fixed inset-0 z-50 bg-black">
            <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                title="Minimize video"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                Minimize
              </button>
              <button
                type="button"
                onClick={endSession}
                className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                title="End call"
              >
                <PhoneOff className="h-3.5 w-3.5" />
                End Call
              </button>
            </div>
            <VideoRoom
              sessionId={sessionId}
              roomName={roomName}
              displayName={displayName}
              jitsiJwt={jitsiJwt}
              className="h-full w-full"
              onEndCall={endSession}
            />
          </div>
        ) : null
      ) : null}
    </div>
  );
}
