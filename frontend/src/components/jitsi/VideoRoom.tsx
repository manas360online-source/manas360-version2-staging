import { useEffect, useRef, useState } from 'react';
import { JitsiSessionManager } from '../../lib/jitsi/JitsiSessionManager';

type VideoRoomProps = {
  sessionId: string;
  roomName: string;
  displayName: string;
  jitsiJwt?: string | null;
  className?: string;
  onEndCall?: () => void;
  isTherapist?: boolean;
  aiEngineUrl?: string;
  onTranscriptUpdate?: (transcript: Record<string, unknown>) => void;
  onGPSUpdate?: (metrics: Record<string, unknown>) => void;
};

const loadJitsiScript = (domain: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load Jitsi script from ${domain}`));
    document.head.appendChild(script);
  });
};

export default function VideoRoom({ sessionId, roomName, displayName, jitsiJwt, className, onEndCall, isTherapist, aiEngineUrl, onTranscriptUpdate, onGPSUpdate }: VideoRoomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<JitsiSessionManager | null>(null);
  const jitsiApiRef = useRef<{ dispose: () => void; addEventListeners?: (listeners: Record<string, () => void>) => void } | null>(null);
  const initGenerationRef = useRef(0);
  const leftEventHandledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const disposeActiveRoom = () => {
    const manager = managerRef.current;
    if (jitsiApiRef.current) {
      try {
        jitsiApiRef.current.dispose();
      } catch {
        // ignore already-disposed API errors during teardown
      }
      jitsiApiRef.current = null;
    }

    if (manager) {
      manager.destroy();
      managerRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const generation = ++initGenerationRef.current;
    leftEventHandledRef.current = false;

    const mountRoom = async () => {
      try {
        // Never initialize a second iframe if one is already active.
        if (jitsiApiRef.current) return;

        const domain = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si';
        await loadJitsiScript(domain);
        if (cancelled || generation !== initGenerationRef.current) return;
        if (!containerRef.current) throw new Error('Video container not mounted');
        if (jitsiApiRef.current) return;

        const manager = new JitsiSessionManager({
          domain,
          roomName,
          container: containerRef.current,
          displayName,
          jitsiJwt: jitsiJwt || undefined,
          isTherapist: !!isTherapist,
          sessionId,
          aiEngineUrl,
          onTranscriptUpdate,
          onGPSUpdate,
        });

        managerRef.current = manager;
        await manager.init();
        if (cancelled || generation !== initGenerationRef.current) {
          manager.destroy();
          managerRef.current = null;
          return;
        }

        const api = manager.getApi() as { dispose: () => void; addEventListeners?: (listeners: Record<string, () => void>) => void } | null;
        jitsiApiRef.current = api;

        api?.addEventListeners?.({
          videoConferenceLeft: () => {
            if (leftEventHandledRef.current) return;
            leftEventHandledRef.current = true;
            disposeActiveRoom();
            onEndCall?.();
          },
        });
      } catch (mountError: any) {
        if (!cancelled) {
          setError(String(mountError?.message || 'Unable to start video room'));
        }
      }
    };

    void mountRoom();

    return () => {
      cancelled = true;
      disposeActiveRoom();
    };
    // Do not include displayName: auth/user refresh can change it and force unnecessary iframe remounts.
  }, [jitsiJwt, roomName, sessionId]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p className="text-sm font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="video-room-shell h-full w-full">
      <style>{`
        @media (max-width: 768px) {
          .video-room-shell {
            width: 100vw;
            max-width: 100vw;
          }

          .video-room-shell iframe {
            width: 100% !important;
            max-width: 100% !important;
            height: calc(100dvh - 84px) !important;
          }

          .video-session-sidebar {
            display: none !important;
          }

          .video-session-main {
            grid-column: 1 / -1;
          }
        }
      `}</style>
      <div ref={containerRef} className={className || 'h-full w-full'} />
      {onEndCall ? (
        <button
          type="button"
          onClick={onEndCall}
          className="fixed bottom-4 left-4 right-4 z-50 inline-flex min-h-[50px] items-center justify-center rounded-full bg-rose-600 px-5 text-sm font-semibold text-white shadow-lg md:hidden"
        >
          End Call
        </button>
      ) : null}
    </div>
  );
}
