import { Brain, CheckCircle2, Info, Minimize2, Sparkles, StickyNote, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createPatientNote,
  fetchCbtAssignmentTemplates,
  fetchPatientOverview,
  quickAssignCbtTemplate,
  type CbtAssignmentTemplateOption,
  type PatientOverviewData,
  updatePatientNote,
} from '../../api/provider';
import { therapistApi, type AiClinicalSummary } from '../../api/therapist.api';
import { generateMeetingLink, type MeetingLinkResponse } from '../../api/videoSession';
import VideoRoom from '../../components/jitsi/VideoRoom';
import { useAuth } from '../../context/AuthContext';
import { useVideoSession } from '../../context/VideoSessionContext';

const providerRoles = new Set(['therapist', 'psychiatrist', 'psychologist', 'coach']);
const MIN_AUDIO_CAPTURE_SECONDS = 300;
type WorkspaceTab = 'patient-info' | 'clinical-notes' | 'ai-insights';

const formatSessionDate = (value?: string | null): string => {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not available';
  return parsed.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function VideoSessionPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startSession, endSession, setIsMinimized, elapsedSeconds } = useVideoSession();

  const [meetingData, setMeetingData] = useState<MeetingLinkResponse | null>(null);
  const [patientOverview, setPatientOverview] = useState<PatientOverviewData | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasAuthError, setHasAuthError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickNotes, setQuickNotes] = useState('');
  const [objectiveNotes, setObjectiveNotes] = useState('');
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [planNotes, setPlanNotes] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState(false);
  const [aiInsights, setAiInsights] = useState<AiClinicalSummary | null>(null);
  const [cbtTemplateOptions, setCbtTemplateOptions] = useState<CbtAssignmentTemplateOption[]>([]);
  const [selectedTemplateType, setSelectedTemplateType] = useState('');
  const [isAssigningCbtTemplate, setIsAssigningCbtTemplate] = useState(false);
  const [quickAssignFeedback, setQuickAssignFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('patient-info');
  const [isOverviewOverlayOpen, setIsOverviewOverlayOpen] = useState(false);

  const saveInFlightRef = useRef(false);
  const lastSavedPayloadRef = useRef('');
  const savedIndicatorTimerRef = useRef<number | null>(null);

  const normalizedRole = String(user?.role || '').toLowerCase();
  const isProvider = providerRoles.has(normalizedRole);
  const displayName = useMemo(() => {
    const full = `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim();
    return full || String(user?.email || 'Provider');
  }, [user?.email, user?.firstName, user?.lastName]);

  useEffect(() => {
    let active = true;

    if (hasAuthError) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

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
        }
        const initialSnapshot = JSON.stringify({
          subjective: response.noteSubjective || '',
          objective: '',
          assessment: '',
          plan: '',
        });
        lastSavedPayloadRef.current = initialSnapshot;

        startSession({
          sessionId,
          roomName: response.meetingRoomName,
          jitsiJwt: response.jitsiJwt,
        });
      } catch (requestError: any) {
        if (!active) return;
        if (requestError?.response?.status === 401) {
          setHasAuthError(true);
          setError(null);
          return;
        }
        setError(String(requestError?.response?.data?.message || requestError?.message || 'Unable to load meeting room'));
      } finally {
        if (active) setLoading(false);
      }
    };

    if (sessionId && isProvider) {
      void fetchMeetingData();
    } else {
      setLoading(false);
      setError('Session id is missing or role is not supported for provider video workspace');
    }

    return () => {
      active = false;
    };
  }, [hasAuthError, isProvider, sessionId, startSession]);

  useEffect(() => {
    let active = true;

    if (hasAuthError) {
      setIsLoadingOverview(false);
      return () => {
        active = false;
      };
    }

    const loadPatientOverview = async () => {
      if (!meetingData?.patientId) return;

      setIsLoadingOverview(true);
      try {
        const overview = await fetchPatientOverview(meetingData.patientId);
        if (!active) return;
        setPatientOverview(overview);
      } catch (requestError: any) {
        if (!active) return;
        if (requestError?.response?.status === 401) {
          setHasAuthError(true);
          return;
        }
        setPatientOverview(null);
      } finally {
        if (active) setIsLoadingOverview(false);
      }
    };

    void loadPatientOverview();

    return () => {
      active = false;
    };
  }, [hasAuthError, meetingData?.patientId]);

  useEffect(() => {
    return () => {
      if (savedIndicatorTimerRef.current) {
        window.clearTimeout(savedIndicatorTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (hasAuthError || !isProvider) {
      return () => {
        active = false;
      };
    }

    const loadTemplateOptions = async () => {
      try {
        const templates = await fetchCbtAssignmentTemplates();
        if (!active) return;
        const options = Array.isArray(templates) ? templates : [];
        setCbtTemplateOptions(options);
        setSelectedTemplateType((current) => current || options[0]?.templateType || '');
      } catch {
        if (!active) return;
        setCbtTemplateOptions([]);
      }
    };

    void loadTemplateOptions();

    return () => {
      active = false;
    };
  }, [hasAuthError, isProvider]);

  const autosaveNotes = useCallback(async () => {
    if (hasAuthError) return;
    if (!isProvider) return;
    if (!meetingData?.patientId) return;

    const notePayload = {
      subjective: quickNotes.trim(),
      objective: objectiveNotes.trim(),
      assessment: assessmentNotes.trim(),
      plan: planNotes.trim(),
    };
    const snapshot = JSON.stringify(notePayload);

    if (!notePayload.subjective && !notePayload.objective && !notePayload.assessment && !notePayload.plan) return;
    if (saveInFlightRef.current) return;
    if (snapshot === lastSavedPayloadRef.current) return;

    saveInFlightRef.current = true;

    try {
      const payload = {
        subjective: quickNotes,
        objective: objectiveNotes,
        assessment: assessmentNotes,
        plan: planNotes,
        sessionDate: new Date().toISOString(),
        sessionType: 'Video Session',
        duration: '50',
        status: 'Draft' as const,
      };

      try {
        if (noteId) {
          await updatePatientNote(meetingData.patientId, noteId, payload);
        } else {
          const created = await createPatientNote(meetingData.patientId, {
            ...payload,
            sessionId,
          });
          setNoteId(created.id);
        }
      } catch (requestError: any) {
        if (requestError?.response?.status === 401) {
          setHasAuthError(true);
          return;
        }
        throw requestError;
      }

      lastSavedPayloadRef.current = snapshot;
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
  }, [assessmentNotes, hasAuthError, isProvider, meetingData?.patientId, noteId, objectiveNotes, planNotes, quickNotes, sessionId]);

  useEffect(() => {
    if (!isProvider) return;

    if (!quickNotes.trim() && !objectiveNotes.trim() && !assessmentNotes.trim() && !planNotes.trim()) {
      return;
    }

    const timer = window.setInterval(() => {
      void autosaveNotes();
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [assessmentNotes, autosaveNotes, isProvider, objectiveNotes, planNotes, quickNotes]);

  const aiUnlockCountdown = Math.max(0, MIN_AUDIO_CAPTURE_SECONDS - elapsedSeconds);
  const canGenerateAiDraft = isProvider && aiUnlockCountdown === 0 && Boolean(sessionId);
  const isMoodAnalyzing = aiUnlockCountdown > 0 || isGeneratingAiDraft;
  const latestPhq9 = useMemo(
    () => patientOverview?.recentAssessments?.find((item) => item.type === 'PHQ-9') || null,
    [patientOverview?.recentAssessments],
  );

  const moodMonitorLabel = useMemo(() => {
    if (aiUnlockCountdown > 0) {
      return 'Analyzing tone...';
    }

    const primaryMood = String(
      aiInsights?.moodSentiment?.primaryEmotionalState || aiInsights?.moodAnalysis?.emotionalTone || '',
    ).trim();
    if (primaryMood) {
      return `Sentiment: ${primaryMood}`;
    }

    if (isGeneratingAiDraft) {
      return 'Analyzing tone...';
    }

    return 'Analyzing tone...';
  }, [aiInsights, aiUnlockCountdown, isGeneratingAiDraft]);

  const moodMonitorToneClass = useMemo(() => {
    const normalized = moodMonitorLabel.toLowerCase();
    if (normalized.includes('anx')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (normalized.includes('depress') || normalized.includes('low')) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (normalized.includes('calm') || normalized.includes('stable')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (normalized === 'analyzing tone...') return 'bg-slate-100 text-slate-700 border-slate-200';
    return 'bg-sky-100 text-sky-700 border-sky-200';
  }, [moodMonitorLabel]);

  const handleGenerateAiDraft = async () => {
    if (hasAuthError) return;
    if (!canGenerateAiDraft || !sessionId) return;

    setIsGeneratingAiDraft(true);
    setError(null);
    try {
      const summary = await therapistApi.generateAiSessionNote(sessionId);
      setAiInsights(summary);
    } catch (requestError: any) {
      if (requestError?.response?.status === 401) {
        setHasAuthError(true);
        setError(null);
        return;
      }
      setError(String(requestError?.response?.data?.message || requestError?.message || 'Unable to generate AI draft'));
    } finally {
      setIsGeneratingAiDraft(false);
    }
  };

  const handleQuickAssignTemplate = async () => {
    if (hasAuthError) return;
    if (!meetingData?.patientId) {
      setQuickAssignFeedback('Unable to identify patient for assignment.');
      return;
    }
    if (!selectedTemplateType || isAssigningCbtTemplate) {
      return;
    }

    setIsAssigningCbtTemplate(true);
    setQuickAssignFeedback(null);
    try {
      const result = await quickAssignCbtTemplate(meetingData.patientId, selectedTemplateType);
      setQuickAssignFeedback(`Assigned: ${result.title} to the patient Daily Check-in Hub.`);
    } catch (requestError: any) {
      if (requestError?.response?.status === 401) {
        setHasAuthError(true);
        return;
      }
      setQuickAssignFeedback(String(requestError?.response?.data?.message || requestError?.message || 'Failed to assign template.'));
    } finally {
      setIsAssigningCbtTemplate(false);
    }
  };

  const handleOpenDashboardInPip = () => {
    setIsMinimized(true);
    navigate('/provider/dashboard');
  };

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
        <p className="text-base font-semibold text-rose-700">Unable to open session workspace</p>
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

  return (
    <div className="grid h-[calc(100vh-2rem)] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,65%)_minmax(0,35%)]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-white">
          <div>
            <p className="text-sm font-semibold">Live Session</p>
            <p className="text-[11px] text-slate-300">Room: {meetingData.meetingRoomName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenDashboardInPip}
              className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Open Dashboard (PiP)
            </button>
            <button
              type="button"
              onClick={() => {
                endSession();
                navigate('/provider/dashboard');
              }}
              className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              <X className="h-3.5 w-3.5" />
              End Call
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <VideoRoom
            sessionId={sessionId}
            roomName={meetingData.meetingRoomName}
            displayName={displayName}
            jitsiJwt={meetingData.jitsiJwt}
            className="h-full w-full"
            onEndCall={() => {
              endSession();
              navigate('/provider/dashboard');
            }}
          />
        </div>
      </section>

      <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Clinical Workspace</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {canGenerateAiDraft ? 'AI draft unlocked' : `AI draft unlocks in ${aiUnlockCountdown}s`}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('patient-info')}
              className={`rounded-md px-2.5 py-2 text-xs font-semibold transition ${
                activeTab === 'patient-info' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              Patient Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('clinical-notes')}
              className={`rounded-md px-2.5 py-2 text-xs font-semibold transition ${
                activeTab === 'clinical-notes' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              Clinical Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai-insights')}
              className={`rounded-md px-2.5 py-2 text-xs font-semibold transition ${
                activeTab === 'ai-insights' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              AI Insights
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {hasAuthError ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Session data refresh paused because your login expired. Video stays active; re-authenticate in a new tab to resume patient data sync.
            </div>
          ) : null}

          {activeTab === 'patient-info' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <Info className="h-3.5 w-3.5" />
                Live patient context for quick reference.
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-[180px] flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Session Protocol Tips</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
                      <li>Reflect and validate first before reframing.</li>
                      <li>Anchor one practical CBT task before ending session.</li>
                    </ul>
                  </div>
                  <div className="w-full max-w-[240px] space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Quick Assign</label>
                    <select
                      value={selectedTemplateType}
                      onChange={(event) => setSelectedTemplateType(event.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"
                    >
                      {cbtTemplateOptions.map((template) => (
                        <option key={template.templateType} value={template.templateType}>
                          {template.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleQuickAssignTemplate()}
                      disabled={!selectedTemplateType || isAssigningCbtTemplate}
                      className="w-full rounded-md bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAssigningCbtTemplate ? 'Assigning...' : 'Quick Assign'}
                    </button>
                  </div>
                </div>
                {quickAssignFeedback ? (
                  <p className="mt-2 text-[11px] text-slate-600">{quickAssignFeedback}</p>
                ) : null}
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-700">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Clinical Summary</p>
                <p><span className="font-semibold">Diagnosis:</span> {patientOverview?.patient?.diagnosis || 'Not documented'}</p>
                <p><span className="font-semibold">Last Session:</span> {formatSessionDate(patientOverview?.lastSession?.dateTime)}</p>
                <p>
                  <span className="font-semibold">PHQ-9:</span>{' '}
                  {latestPhq9 ? `${latestPhq9.score} (${latestPhq9.severity})` : 'No recent PHQ-9 score'}
                </p>
                <p><span className="font-semibold">Patient:</span> {patientOverview?.patient?.name || meetingData.patientId}</p>
                <p><span className="font-semibold">Session:</span> {sessionId}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Chart Navigation</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOverviewOverlayOpen(true)}
                    className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    My Patients {'>'} Overview
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDashboardInPip}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Open Dashboard (PiP)
                  </button>
                </div>
                {isLoadingOverview ? <p className="mt-2 text-[11px] text-slate-500">Loading latest clinical summary...</p> : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'clinical-notes' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <StickyNote className="h-4 w-4" />
                  Session Notes
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  {showSavedIndicator ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                    </span>
                  ) : null}
                  {lastSavedAt ? <span>Saved at {lastSavedAt}</span> : null}
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="text-xs font-semibold text-slate-700">Subjective</label>
                <textarea
                  value={quickNotes}
                  onChange={(event) => setQuickNotes(event.target.value)}
                  placeholder="Patient's self-reported symptoms and concerns..."
                  className="h-24 w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
                />
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="text-xs font-semibold text-slate-700">Objective</label>
                <textarea
                  value={objectiveNotes}
                  onChange={(event) => setObjectiveNotes(event.target.value)}
                  placeholder="Observed behaviors, MSE findings, measurable indicators..."
                  className="h-24 w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
                />
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="text-xs font-semibold text-slate-700">Assessment</label>
                <textarea
                  value={assessmentNotes}
                  onChange={(event) => setAssessmentNotes(event.target.value)}
                  placeholder="Clinical interpretation, diagnosis progress, risk assessment..."
                  className="h-24 w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
                />
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="text-xs font-semibold text-slate-700">Plan</label>
                <textarea
                  value={planNotes}
                  onChange={(event) => setPlanNotes(event.target.value)}
                  placeholder="Interventions, homework, next-session plan..."
                  className="h-24 w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
                />
              </div>
            </div>
          ) : null}

          {activeTab === 'ai-insights' ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Mood Monitor</p>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${moodMonitorToneClass}`}>
                    <Brain className={`mr-1 h-3.5 w-3.5 ${isMoodAnalyzing ? 'animate-pulse' : ''}`} />
                    {moodMonitorLabel}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-600">
                    {canGenerateAiDraft
                      ? 'At least 5 minutes captured. AI draft ready.'
                      : `AI draft unlocks in ${aiUnlockCountdown}s`}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleGenerateAiDraft()}
                    disabled={!canGenerateAiDraft || isGeneratingAiDraft}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                      canGenerateAiDraft
                        ? 'border border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-500'
                        : 'border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-50'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isGeneratingAiDraft ? 'Generating...' : 'Generate AI Draft'}
                  </button>
                </div>
              </div>

              {aiInsights ? (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                  <p className="font-semibold text-slate-800">Manas AI Insights</p>
                  {aiInsights.moodSentiment ? (
                    <div className="space-y-1">
                      <p><span className="font-semibold">Sentiment:</span> {aiInsights.moodSentiment.primaryEmotionalState || 'n/a'}</p>
                      <p><span className="font-semibold">Volatility:</span> {aiInsights.moodSentiment.emotionalVolatilityScore}/10</p>
                      <p><span className="font-semibold">Anxiety:</span> {aiInsights.moodSentiment.anxietyLevelScore}/10</p>
                    </div>
                  ) : null}
                  <div className="space-y-1 border-t border-slate-100 pt-2">
                    <p><span className="font-semibold">S:</span> {aiInsights.soapNote.subjective || 'n/a'}</p>
                    <p><span className="font-semibold">O:</span> {aiInsights.soapNote.objective || 'n/a'}</p>
                    <p><span className="font-semibold">A:</span> {aiInsights.soapNote.assessment || 'n/a'}</p>
                    <p><span className="font-semibold">P:</span> {aiInsights.soapNote.plan || 'n/a'}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {isOverviewOverlayOpen ? (
          <div className="absolute inset-0 z-20 flex flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">My Patients {'>'} Overview</p>
                <p className="text-[11px] text-slate-500">Slide-over preview without leaving this video workspace.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOverviewOverlayOpen(false)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Clinical Summary</p>
                  <p className="mt-2"><span className="font-semibold">Diagnosis:</span> {patientOverview?.patient?.diagnosis || 'Not documented'}</p>
                  <p><span className="font-semibold">Last Session:</span> {formatSessionDate(patientOverview?.lastSession?.dateTime)}</p>
                  <p>
                    <span className="font-semibold">PHQ-9:</span>{' '}
                    {latestPhq9 ? `${latestPhq9.score} (${latestPhq9.severity})` : 'No recent PHQ-9 score'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Recent Activity</p>
                  {patientOverview?.recentActivity?.length ? (
                    <ul className="mt-2 space-y-2">
                      {patientOverview.recentActivity.slice(0, 5).map((activity, index) => (
                        <li key={`${activity.title}-${index}`} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                          <p className="font-semibold text-slate-800">{activity.title}</p>
                          <p className="text-slate-600">{activity.description}</p>
                          <p className="text-[11px] text-slate-500">{activity.time}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-slate-500">No recent activity available.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Need full workspace navigation?</p>
                  <p className="mt-1 text-xs text-slate-600">Switch to dashboard while keeping this call live in PiP.</p>
                  <button
                    type="button"
                    onClick={handleOpenDashboardInPip}
                    className="mt-2 inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                    Open Dashboard (PiP)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
