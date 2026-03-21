/**
 * Therapist Live Session Page
 * ────────────────────────────
 * Embeds Jitsi Meet for the video call and overlays the GPS Dashboard
 * (therapeutic AI analytics) for the therapist only.
 *
 * Flow:
 *   1. Load Jitsi External API script dynamically
 *   2. Call POST /v1/gps/sessions/:id/start to get monitoringId
 *   3. Init JitsiSessionManager (starts audio capture + AI engine)
 *   4. Render GPSDashboard overlay (Socket.io therapist-only room)
 *   5. On leave/unmount: destroy session + call POST /v1/gps/sessions/:id/end
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GPSDashboard from '../../components/therapist/GPSDashboard';
import { JitsiSessionManager } from '../../lib/jitsi/JitsiSessionManager';
import useAuthToken from '../../hooks/useAuthToken';
import { http } from '../../lib/http';

const JITSI_DOMAIN = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si';
const AI_ENGINE_WS_URL = import.meta.env.VITE_AI_ENGINE_WS_URL || 'ws://localhost:8765';

function loadJitsiScript(domain: string): Promise<void> {
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
}

type Status = 'loading' | 'ready' | 'error' | 'ended';

export default function TherapistLiveSessionPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { token: accessToken } = useAuthToken();

  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [monitoringId, setMonitoringId] = useState<string>('');

  const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<JitsiSessionManager | null>(null);
  const endCalledRef = useRef(false);

  const endSession = useCallback(async () => {
    if (endCalledRef.current) return;
    endCalledRef.current = true;

    if (managerRef.current) {
      managerRef.current.destroy();
      managerRef.current = null;
    }

    if (sessionId) {
      try {
        await http.post(`/v1/gps/sessions/${sessionId}/end`);
      } catch {
        // non-critical — session analytics may still be partial
      }
    }

    setStatus('ended');
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setErrorMsg('No session ID provided.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        // 1. Load Jitsi External API
        await loadJitsiScript(JITSI_DOMAIN);
        if (cancelled) return;

        // 2. Start GPS monitoring
        const res = await http.post<{ monitoringId: string }>(
          `/v1/gps/sessions/${sessionId}/start`,
        );
        const mId: string = res.data?.monitoringId ?? '';
        if (cancelled) return;
        setMonitoringId(mId);

        // 3. Initialise Jitsi + AI engine
        if (!jitsiContainerRef.current) throw new Error('Jitsi container not mounted');

        const mgr = new JitsiSessionManager({
          domain: JITSI_DOMAIN,
          roomName: `manas360-session-${sessionId}`,
          container: jitsiContainerRef.current,
          displayName: 'Therapist',
          isTherapist: true,
          aiEngineUrl: AI_ENGINE_WS_URL,
          sessionId,
          monitoringId: mId,
        });

        managerRef.current = mgr;
        await mgr.init();

        if (cancelled) {
          mgr.destroy();
          return;
        }

        setStatus('ready');
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message || 'Failed to start live session');
          setStatus('error');
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
      void endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleLeave = useCallback(async () => {
    await endSession();
    navigate('/therapist/sessions');
  }, [endSession, navigate]);

  if (status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center px-6">
          <p className="mb-2 text-lg font-semibold text-rose-400">Unable to start session</p>
          <p className="mb-6 text-sm text-slate-300">{errorMsg}</p>
          <button
            onClick={() => navigate('/therapist/sessions')}
            className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center px-6">
          <p className="mb-2 text-lg font-semibold text-emerald-400">Session ended</p>
          <p className="mb-6 text-sm text-slate-300">Audio capture and AI monitoring have stopped.</p>
          <button
            onClick={() => navigate(`/therapist/sessions/${sessionId}`)}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            View Session Summary
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Jitsi iframe container */}
      <div ref={jitsiContainerRef} className="absolute inset-0 h-full w-full" />

      {/* Loading overlay while Jitsi + monitoring start */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/92 text-white">
          <div className="text-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto" />
            <p className="text-sm text-slate-300">Starting live session…</p>
          </div>
        </div>
      )}

      {/* GPS Dashboard overlay — therapist only, top-right */}
      {monitoringId && accessToken && (
        <div className="absolute right-4 top-4 z-20 w-80 xl:w-96">
          <GPSDashboard
            sessionId={sessionId}
            monitoringId={monitoringId}
            accessToken={accessToken}
          />
        </div>
      )}

      {/* Leave session button — bottom-centre */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center">
        <button
          onClick={handleLeave}
          className="rounded-full bg-rose-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          Leave Session
        </button>
      </div>
    </div>
  );
}
