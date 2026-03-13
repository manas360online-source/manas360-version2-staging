import { CheckCircle2, Minimize2, Maximize2, StickyNote, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPatientNote, updatePatientNote } from '../../api/provider';
import { generateMeetingLink, type MeetingLinkResponse } from '../../api/videoSession';
import VideoRoom from '../../components/jitsi/VideoRoom';
import { useAuth } from '../../context/AuthContext';

const providerRoles = new Set(['therapist', 'psychiatrist', 'psychologist', 'coach']);

export default function VideoSessionPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [meetingData, setMeetingData] = useState<MeetingLinkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [quickNotes, setQuickNotes] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const saveInFlightRef = useRef(false);
  const lastSavedPayloadRef = useRef('');
  const savedIndicatorTimerRef = useRef<number | null>(null);

  const normalizedRole = String(user?.role || '').toLowerCase();
  const isProvider = providerRoles.has(normalizedRole);
  const displayName = useMemo(() => {
    const full = `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim();
    return full || String(user?.email || (isProvider ? 'Provider' : 'Patient'));
  }, [isProvider, user?.email, user?.firstName, user?.lastName]);

  useEffect(() => {
    let active = true;

    const fetchMeetingData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await generateMeetingLink(sessionId);
        if (!active) return;
        setMeetingData(response);
        setNoteId(response.noteId || null);
        if (response.noteSubjective) {
          setQuickNotes(response.noteSubjective);
          lastSavedPayloadRef.current = response.noteSubjective.trim();
        }
      } catch (requestError: any) {
        if (!active) return;
        setError(String(requestError?.response?.data?.message || requestError?.message || 'Unable to load meeting room'));
      } finally {
        if (active) setLoading(false);
      }
    };

    if (sessionId) {
      void fetchMeetingData();
    } else {
      setLoading(false);
      setError('Session id is missing');
    }

    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (savedIndicatorTimerRef.current) {
        window.clearTimeout(savedIndicatorTimerRef.current);
      }
    };
  }, []);

  const autosaveNotes = useCallback(async () => {
    if (!isProvider) return;
    if (!meetingData?.patientId) return;

    const trimmed = quickNotes.trim();
    if (!trimmed || saveInFlightRef.current) return;
    if (trimmed === lastSavedPayloadRef.current) return;

    saveInFlightRef.current = true;

    try {
      const payload = {
        subjective: quickNotes,
        objective: '',
        assessment: '',
        plan: '',
        sessionDate: new Date().toISOString(),
        sessionType: 'Video Session',
        duration: '50',
        status: 'Draft' as const,
      };

      if (noteId) {
        await updatePatientNote(meetingData.patientId, noteId, payload);
      } else {
        const created = await createPatientNote(meetingData.patientId, {
          ...payload,
          sessionId,
        });
        setNoteId(created.id);
      }

      lastSavedPayloadRef.current = trimmed;
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setShowSavedIndicator(true);
      if (savedIndicatorTimerRef.current) {
        window.clearTimeout(savedIndicatorTimerRef.current);
      }
      savedIndicatorTimerRef.current = window.setTimeout(() => {
        setShowSavedIndicator(false);
      }, 2000);
    } finally {
      saveInFlightRef.current = false;
    }
  }, [isProvider, meetingData?.patientId, noteId, quickNotes, sessionId]);

  useEffect(() => {
    if (!isProvider || !quickNotes.trim()) return;

    const timer = window.setInterval(() => {
      void autosaveNotes();
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [autosaveNotes, isProvider, quickNotes]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <p className="text-sm font-semibold text-slate-600">Preparing secure video room...</p>
      </div>
    );
  }

  if (error || !meetingData) {
    return (
      <div className="flex h-[calc(100vh-2rem)] flex-col items-center justify-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-base font-semibold text-rose-700">Unable to start video session</p>
        <p className="text-sm text-rose-700/80">{error || 'Meeting room could not be loaded.'}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-rose-700"
        >
          Back
        </button>
      </div>
    );
  }

  const videoSurface = (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-black">
      <VideoRoom
        sessionId={sessionId}
        roomName={meetingData.meetingRoomName}
        displayName={displayName}
        jitsiJwt={meetingData.jitsiJwt}
        onEndCall={() => navigate(-1)}
        className="h-full w-full"
      />
    </div>
  );

  return (
    <div className="relative h-[calc(100vh-2rem)]">
      {!isProvider ? (
        <div className="h-full w-full">{videoSurface}</div>
      ) : (
        <div className="video-session-layout grid h-full grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className={`video-session-main ${isMinimized ? 'hidden lg:block' : ''}`}>{videoSurface}</div>

          <section className="video-session-sidebar relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {showSavedIndicator ? (
              <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-700">
                <StickyNote className="h-4 w-4" />
                <p className="text-sm font-semibold">Session Notes</p>
                {lastSavedAt ? <span className="text-[11px] text-slate-500">Saved at {lastSavedAt}</span> : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMinimized((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                  title={isMinimized ? 'Restore video' : 'Minimize to PiP'}
                >
                  {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                  {isMinimized ? 'Restore' : 'Minimize (PiP)'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                >
                  <X className="h-3.5 w-3.5" /> Leave
                </button>
              </div>
            </div>

            <textarea
              value={quickNotes}
              onChange={(event) => setQuickNotes(event.target.value)}
              placeholder="Write quick session notes while in the call..."
              className="mt-3 h-[calc(100%-56px)] min-h-[320px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-slate-400"
            />
          </section>
        </div>
      )}

      {isProvider && isMinimized ? (
        <div className="fixed bottom-6 right-6 z-40 h-56 w-[380px] rounded-2xl shadow-xl">
          {videoSurface}
        </div>
      ) : null}

    </div>
  );
}
