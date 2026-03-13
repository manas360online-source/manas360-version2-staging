/**
 * Patient Live Session Page
 * ──────────────────────────
 * Embeds a Jitsi Meet video call for the patient (no GPS overlay).
 * Replaces the former Agora-based implementation.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { JitsiSessionManager } from '../../lib/jitsi/JitsiSessionManager';

const JITSI_DOMAIN = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si';

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

export default function LiveSessionPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'ended'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<JitsiSessionManager | null>(null);
  const leftRef = useRef(false);

  const leave = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    if (managerRef.current) {
      managerRef.current.destroy();
      managerRef.current = null;
    }
    setStatus('ended');
  }, []);

  useEffect(() => {
    if (!id) {
      setErrorMsg('No session ID provided.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    const join = async () => {
      try {
        await loadJitsiScript(JITSI_DOMAIN);
        if (cancelled) return;
        if (!containerRef.current) throw new Error('Container not mounted');

        const mgr = new JitsiSessionManager({
          domain: JITSI_DOMAIN,
          roomName: `manas360-session-${id}`,
          container: containerRef.current!,
          displayName: 'Patient',
          isTherapist: false,
          sessionId: id,
        });

        managerRef.current = mgr;
        await mgr.init();

        if (cancelled) {
          mgr.destroy();
          return;
        }

        setStatus('ready');
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg(e?.message || 'Unable to join live session');
          setStatus('error');
        }
      }
    };

    void join();

    return () => {
      cancelled = true;
      leave();
    };
  }, [id, leave]);

  const handleLeave = useCallback(() => {
    leave();
    navigate('/patient/sessions');
  }, [leave, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto" />
          <p className="text-sm text-slate-300">Joining session…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center px-6">
          <p className="mb-2 text-lg font-semibold text-rose-400">Unable to join session</p>
          <p className="mb-6 text-sm text-slate-300">{errorMsg}</p>
          <button
            onClick={() => navigate('/patient/sessions')}
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
          <p className="mb-4 text-lg font-semibold text-emerald-400">Session ended</p>
          <button
            onClick={() => navigate('/patient/sessions')}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Jitsi iframe fills the whole screen */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* Leave button */}
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
