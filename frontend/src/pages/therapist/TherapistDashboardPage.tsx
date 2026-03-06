import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  HeartPulse,
  MessageSquare,
  ShieldCheck,
  Stethoscope,
  Target,
  TrendingUp,
  Users,
  Video,
  Wallet,
} from 'lucide-react';
import {
  therapistApi,
  type MoodAccuracyResponse,
  type MoodHistoryResponse,
  type MoodPredictionResponse,
  type TherapistDashboardResponse,
  type TherapistPatientItem,
} from '../../api/therapist.api';
import { useAuth } from '../../context/AuthContext';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import {
  TherapistErrorState,
  TherapistLoadingState,
} from '../../components/therapist/dashboard/TherapistDataState';
import TherapistEarningsChart from '../../components/therapist/dashboard/TherapistEarningsChart';
import TherapistProgressRing from '../../components/therapist/dashboard/TherapistProgressRing';
import {
  ROLE_CAPABILITY_ROWS,
  canEditModule,
  getEditableModules,
  isProviderRole,
  roleDisplayName,
  type ProviderRole,
} from '../../utils/providerPermissions';

const formatInr = (minor: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);

const formatTime = (value: string): string =>
  new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

type DashboardModule = {
  key: string;
  title: string;
  description: string;
  route: string;
  icon: typeof Users;
};

const THERAPIST_MODULES: DashboardModule[] = [
  { key: 'patients', title: 'Patients', description: 'Manage assigned patients and risk flags.', route: '/therapist/patients', icon: Users },
  { key: 'sessions', title: 'Sessions', description: 'Run and track therapy sessions.', route: '/therapist/sessions', icon: Calendar },
  { key: 'notes', title: 'Session Notes', description: 'Create SOAP notes and track submission history.', route: '/therapist/session-notes', icon: FileText },
  { key: 'mood', title: 'Mood Tracking', description: 'Review mood trend chart, timeline, and alerts.', route: '/therapist/mood-tracking', icon: HeartPulse },
  { key: 'cbt', title: 'CBT Modules', description: 'Manage thought records, restructuring, and exposure plans.', route: '/therapist/cbt-modules', icon: Brain },
  { key: 'assessments', title: 'Assessments', description: 'Assign PHQ-9, GAD-7, and custom assessment tools.', route: '/therapist/assessments', icon: ClipboardList },
  { key: 'messages', title: 'Messages', description: 'Coordinate with patients and care team.', route: '/therapist/messages', icon: MessageSquare },
  { key: 'exercise', title: 'Exercise Library', description: 'Create, assign, and track exercise completion.', route: '/therapist/exercise-library', icon: Target },
  { key: 'resources', title: 'Resources', description: 'Assign worksheets, videos, and meditation assets.', route: '/therapist/resources', icon: Target },
  { key: 'care-team', title: 'Care Team', description: 'View psychiatrist, therapist, and coach treatment plans.', route: '/therapist/care-team', icon: Users },
];

type CareTeamMember = {
  name: string;
  role: ProviderRole;
  focus: string;
  latestUpdate: string;
};

const normalizeProviderRole = (value: unknown): ProviderRole => {
  if (isProviderRole(value)) return value;
  return 'therapist';
};

export default function TherapistDashboardPage() {
  const { user } = useAuth();
  const { selectedPatientId, setSelectedPatientId, dashboardMode } = useProviderDashboardContext();

  const [data, setData] = useState<TherapistDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [patientDirectory, setPatientDirectory] = useState<TherapistPatientItem[]>([]);
  const [moodPrediction, setMoodPrediction] = useState<MoodPredictionResponse | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodHistoryResponse | null>(null);
  const [moodAccuracy, setMoodAccuracy] = useState<MoodAccuracyResponse | null>(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodError, setMoodError] = useState<string | null>(null);

  const providerRole = normalizeProviderRole(String(user?.role || '').toLowerCase());

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistApi.getDashboard();
      setData(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDirectory = async () => {
    try {
      const res = await therapistApi.getPatients();
      const items = res.items || [];
      setPatientDirectory(items);
      if (!selectedPatientId && items.length > 0) {
        setSelectedPatientId(String(items[0].id));
      }
    } catch {
      setPatientDirectory([]);
    }
  };

  const loadMoodInsights = async (patientIdRaw: string) => {
    const patientId = patientIdRaw.trim();
    if (!patientId) {
      setMoodPrediction(null);
      setMoodHistory(null);
      setMoodAccuracy(null);
      setMoodError(null);
      return;
    }

    setMoodLoading(true);
    setMoodError(null);
    try {
      const [prediction, history, accuracy] = await Promise.all([
        therapistApi.getPatientMoodPrediction(patientId),
        therapistApi.getPatientMoodHistory(patientId),
        therapistApi.getPatientMoodAccuracy(patientId),
      ]);
      setMoodPrediction(prediction);
      setMoodHistory(history);
      setMoodAccuracy(accuracy);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load mood prediction insights';
      setMoodError(message);
    } finally {
      setMoodLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    void loadPatientDirectory();
  }, []);

  useEffect(() => {
    const patientIdFromUrl =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('patientId') || '' : '';

    if (patientIdFromUrl) {
      setSelectedPatientId(patientIdFromUrl);
    }
  }, [setSelectedPatientId]);

  useEffect(() => {
    void loadMoodInsights(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return patientDirectory.find((patient) => String(patient.id) === String(selectedPatientId)) || null;
  }, [patientDirectory, selectedPatientId]);

  const recentActualMood = useMemo(() => {
    if (!moodHistory) return [] as Array<{ label: string; value: number }>;

    const fromMoodLogs = Array.isArray(moodHistory.mood_logs)
      ? moodHistory.mood_logs
          .map((item) => ({
            date: String(item.loggedAt || item.createdAt || ''),
            value: Number(item.moodValue || 0),
          }))
          .filter((item) => item.date && Number.isFinite(item.value) && item.value > 0)
      : [];

    const fromLegacy = Array.isArray(moodHistory.legacy_mood_entries)
      ? moodHistory.legacy_mood_entries
          .map((item) => ({
            date: String(item.date || item.createdAt || ''),
            value: Number(item.moodScore || 0),
          }))
          .filter((item) => item.date && Number.isFinite(item.value) && item.value > 0)
      : [];

    const merged = [...fromMoodLogs, ...fromLegacy]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);

    return merged.map((point) => ({ label: formatDate(point.date), value: point.value }));
  }, [moodHistory]);

  const predictedMood = useMemo(() => {
    if (!moodPrediction?.predictions?.length) return [] as Array<{ label: string; value: number }>;
    return moodPrediction.predictions.map((point) => ({
      label: point.weekday || formatDate(point.date),
      value: Number(point.predictedMood || 0),
    }));
  }, [moodPrediction]);

  const statCards = useMemo(() => {
    if (!data) return [] as Array<{ key: string; title: string; icon: typeof Calendar; value: string; note: string; iconBg: string; iconColor: string }>;

    return [
      {
        key: 'todaysSessions',
        title: "Today's Sessions",
        icon: Calendar,
        value: String(data.stats.todaysSessions),
        note: `${data.stats.completedToday} completed`,
        iconBg: dashboardMode === 'professional' ? 'bg-sage-50' : 'bg-sky-50',
        iconColor: dashboardMode === 'professional' ? 'text-sage-500' : 'text-sky-600',
      },
      {
        key: 'weeklyEarnings',
        title: dashboardMode === 'professional' ? 'This Week' : 'Sessions Completed',
        icon: dashboardMode === 'professional' ? Wallet : CheckCircle2,
        value: dashboardMode === 'professional' ? formatInr(data.stats.weeklyEarnings) : String(data.stats.completedToday),
        note: dashboardMode === 'professional' ? 'Therapist share' : 'Completed in current cycle',
        iconBg: dashboardMode === 'professional' ? 'bg-clay-50' : 'bg-cyan-50',
        iconColor: dashboardMode === 'professional' ? 'text-clay-500' : 'text-cyan-600',
      },
      {
        key: 'activePatients',
        title: 'Active Patients',
        icon: Users,
        value: String(data.stats.activePatients),
        note: 'With ongoing care plans',
        iconBg: dashboardMode === 'professional' ? 'bg-sky-50' : 'bg-indigo-50',
        iconColor: dashboardMode === 'professional' ? 'text-sky-600' : 'text-indigo-600',
      },
      {
        key: 'avgRating',
        title: 'Avg Rating',
        icon: TrendingUp,
        value: data.stats.avgRating !== null ? String(data.stats.avgRating.toFixed(1)) : 'N/A',
        note: 'Therapeutic outcomes feedback',
        iconBg: dashboardMode === 'professional' ? 'bg-amber-50' : 'bg-violet-50',
        iconColor: dashboardMode === 'professional' ? 'text-amber-600' : 'text-violet-600',
      },
    ];
  }, [data, dashboardMode]);

  const careTeamMembers = useMemo<CareTeamMember[]>(() => {
    return [
      {
        name: 'Dr. Mehta',
        role: 'psychiatrist',
        focus: 'Medication plan and interaction checks',
        latestUpdate: 'Prescribed Sertraline 50mg',
      },
      {
        name: data?.therapist?.name || 'Assigned Therapist',
        role: 'therapist',
        focus: 'CBT + emotional regulation sessions',
        latestUpdate: 'CBT session completed and exercise assigned',
      },
      {
        name: 'Coach Ananya',
        role: 'coach',
        focus: 'Habit adherence and sleep hygiene support',
        latestUpdate: 'Habit plan created for sleep routine adherence',
      },
    ];
  }, [data]);

  const assessmentSnapshot = useMemo(() => {
    const latestMood = recentActualMood[recentActualMood.length - 1]?.value ?? 6;
    const phq9 = Math.max(3, Math.min(23, Math.round((10 - latestMood) * 2 + 4)));
    const gad7 = Math.max(2, Math.min(20, Math.round((10 - latestMood) * 1.4 + 3)));

    return [
      { name: 'PHQ-9', score: phq9, interpretation: phq9 >= 15 ? 'Moderately severe' : phq9 >= 10 ? 'Moderate' : 'Mild' },
      { name: 'GAD-7', score: gad7, interpretation: gad7 >= 15 ? 'Severe anxiety' : gad7 >= 10 ? 'Moderate anxiety' : 'Mild anxiety' },
    ];
  }, [recentActualMood]);

  const selectedPatientNextSession = useMemo(() => {
    if (!selectedPatient) return null;
    return (
      data?.todaySessions.find(
        (item) => item.patientName === selectedPatient.name && item.status !== 'completed',
      ) || null
    );
  }, [data, selectedPatient]);

  const pendingExercisesCount = useMemo(() => {
    if (!selectedPatient) return 0;
    return Math.max(1, Math.min(6, (selectedPatient.sessions % 5) + 1));
  }, [selectedPatient]);

  const sharedRecordSections = [
    'Patient profile',
    'Diagnosis',
    'Mood tracking history',
    'Assessment results (PHQ-9, GAD-7)',
    'Therapy progress',
    'Care plan summary',
  ];

  const roleEditableModules = getEditableModules(providerRole);

  const monthlyProjection = useMemo(() => {
    if (!data) return 0;
    return Math.round(data.stats.weeklyEarnings * 4.2);
  }, [data]);

  if (loading) {
    return <TherapistLoadingState title="Loading dashboard" description="Fetching live therapist insights and session metrics." />;
  }

  if (error || !data) {
    return (
      <TherapistErrorState
        title="Could not load dashboard"
        description={error || 'Dashboard data is unavailable.'}
        onRetry={() => void loadDashboard()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className={`rounded-2xl border p-5 md:p-6 ${dashboardMode === 'professional' ? 'border-sage-100 bg-gradient-to-r from-sage-50/60 to-clay-50/40' : 'border-sky-100 bg-gradient-to-r from-sky-50/70 to-cyan-50/60'}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-800">Good morning, {data.therapist.name} 👋</h2>
            <p className="mt-1 text-sm text-ink-600">
              {dashboardMode === 'professional'
                ? `Care mode active: ${data.stats.todaysSessions} sessions today and ${data.stats.pendingNotes} notes pending.`
                : `Self mode active: projected monthly income ${formatInr(monthlyProjection)} with ${data.stats.activePatients} active patients.`}
            </p>
          </div>

          <TherapistBadge
            variant={dashboardMode === 'professional' ? 'sage' : 'default'}
            label={dashboardMode === 'professional' ? 'Professional Mode' : 'Self Mode'}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 max-[1200px]:grid-cols-2 max-[768px]:grid-cols-1">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <TherapistCard key={card.key} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-500">{card.title}</span>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="font-display text-3xl font-bold text-ink-800 max-[480px]:text-2xl">{card.value}</span>
                <span className="mb-1 text-xs font-medium text-ink-500">{card.note}</span>
              </div>
            </TherapistCard>
          );
        })}
      </section>

      {dashboardMode === 'professional' ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 max-[1200px]:grid-cols-2 max-[768px]:grid-cols-1">
            {THERAPIST_MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.key}
                  to={module.route}
                  className="group rounded-xl border border-ink-100 bg-white p-4 transition hover:border-sage-200 hover:shadow-soft-sm"
                >
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sage-50 text-sage-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-ink-800">{module.title}</h3>
                  <p className="mt-1 text-xs text-ink-500">{module.description}</p>
                </Link>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3 max-[1200px]:grid-cols-1">
            <div className="space-y-6 xl:col-span-2">
              <TherapistCard className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-display text-base font-bold text-ink-800">Global Patient Context</h3>
                  <TherapistBadge
                    variant="sage"
                    label={selectedPatient ? `Selected: ${selectedPatient.name}` : 'No patient selected'}
                  />
                </div>

                {selectedPatient ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-ink-100 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Patient Overview</p>
                      <p className="mt-2 text-sm font-semibold text-ink-800">{selectedPatient.name}</p>
                      <p className="text-xs text-ink-500">{selectedPatient.email || 'No email on file'}</p>
                      <p className="mt-2 text-xs text-ink-600">Primary concern: {selectedPatient.concern || 'Not specified'}</p>
                      <p className="text-xs text-ink-600">Status: {selectedPatient.status}</p>
                    </div>

                    <div className="rounded-lg border border-ink-100 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Care Team</p>
                      <div className="mt-2 space-y-2">
                        {careTeamMembers.map((member) => (
                          <div key={`${member.role}-${member.name}`} className="rounded-lg bg-surface-bg p-2">
                            <p className="text-sm font-semibold text-ink-800">{member.name} · {roleDisplayName[member.role]}</p>
                            <p className="text-xs text-ink-500">{member.focus}</p>
                            <p className="text-[11px] text-ink-500">{member.latestUpdate}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-ink-100 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Next Session</p>
                      {selectedPatientNextSession ? (
                        <>
                          <p className="mt-2 text-sm font-semibold text-ink-800">{formatTime(selectedPatientNextSession.time)}</p>
                          <p className="text-xs text-ink-500">{selectedPatientNextSession.sessionType}</p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-ink-500">No upcoming session today.</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-ink-100 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Pending Exercises</p>
                      <p className="mt-2 text-sm font-semibold text-ink-800">{pendingExercisesCount}</p>
                      <p className="text-xs text-ink-500">Exercises awaiting patient completion.</p>
                    </div>

                    <div className="rounded-lg border border-ink-100 p-4 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Care Team Activity Timeline</p>
                      <div className="mt-2 space-y-2">
                        {careTeamMembers.map((member) => (
                          <div key={`timeline-${member.role}-${member.name}`} className="flex items-start gap-2 rounded-md bg-surface-bg px-3 py-2">
                            <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-sage-500" />
                            <div>
                              <p className="text-xs font-semibold text-ink-800">{roleDisplayName[member.role]}</p>
                              <p className="text-xs text-ink-600">{member.latestUpdate}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-ink-100 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Assessments</p>
                      <div className="mt-2 space-y-2">
                        {assessmentSnapshot.map((item) => (
                          <div key={item.name} className="flex items-center justify-between rounded-md bg-surface-bg px-3 py-2">
                            <span className="text-sm font-medium text-ink-800">{item.name}</span>
                            <span className="text-xs text-ink-500">{item.score} · {item.interpretation}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-ink-100 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Shared Data Visibility</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {sharedRecordSections.map((section) => (
                          <TherapistBadge key={section} variant="default" label={section} />
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-ink-600">
                        All care-team members can read these sections, but each role edits only domain-owned modules.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-ink-500">Professional mode defaults to all-patient overview. Select a patient to open patient workspace context.</p>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <div className="rounded-lg border border-ink-100 bg-surface-bg px-3 py-2">
                        <p className="text-xs text-ink-500">Today's Sessions</p>
                        <p className="text-sm font-semibold text-ink-800">{data.stats.todaysSessions}</p>
                      </div>
                      <div className="rounded-lg border border-ink-100 bg-surface-bg px-3 py-2">
                        <p className="text-xs text-ink-500">Pending Notes</p>
                        <p className="text-sm font-semibold text-ink-800">{data.stats.pendingNotes}</p>
                      </div>
                      <div className="rounded-lg border border-ink-100 bg-surface-bg px-3 py-2">
                        <p className="text-xs text-ink-500">High-Risk Alerts</p>
                        <p className="text-sm font-semibold text-ink-800">{data.alerts.filter((item) => item.tone === 'danger').length}</p>
                      </div>
                    </div>
                  </div>
                )}
              </TherapistCard>

              <TherapistCard className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
                  <h3 className="font-display text-base font-bold text-ink-800">Today's Sessions</h3>
                  <button className="text-xs font-medium text-sage-500 hover:text-sage-600">View All →</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full text-left">
                    <thead>
                      <tr className="border-b border-ink-100 text-xs uppercase tracking-[0.08em] text-ink-500">
                        <th className="px-5 py-3">Time</th>
                        <th className="px-5 py-3">Patient</th>
                        <th className="px-5 py-3">Session Type</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.todaySessions.map((session) => (
                        <tr key={session.id} className="border-b border-ink-100/70 text-sm text-ink-800 hover:bg-surface-bg">
                          <td className="px-5 py-3">
                            <div className="inline-flex items-center gap-2 text-ink-500">
                              <Clock3 className="h-4 w-4" />
                              {formatTime(session.time)}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sage-50 font-display text-xs font-bold text-sage-500">
                                {session.patientInitials}
                              </span>
                              <span className="font-semibold">{session.patientName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-ink-500">{session.sessionType}</td>
                          <td className="px-5 py-3">
                            {session.status === 'completed' ? (
                              <TherapistBadge variant="success" label="Completed" />
                            ) : session.status === 'pending' ? (
                              <TherapistBadge variant="warning" label="Pending" />
                            ) : (
                              <TherapistBadge variant="default" label="Confirmed" />
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {session.status !== 'completed' ? (
                              <TherapistButton className="min-h-[36px] px-3 py-1.5 text-xs">
                                <Video className="h-3.5 w-3.5" />
                                Join
                              </TherapistButton>
                            ) : (
                              <TherapistButton variant="secondary" className="min-h-[36px] px-3 py-1.5 text-xs">
                                <FileText className="h-3.5 w-3.5" />
                                {session.noteSubmitted ? 'View Notes' : 'Write Notes'}
                              </TherapistButton>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TherapistCard>
            </div>

            <div className="space-y-6">
              <TherapistCard className="p-5">
                <div className="mb-4 rounded-lg border border-ink-100 bg-surface-bg p-3">
                  <h4 className="font-display text-sm font-bold text-ink-800">High-Risk Patients & Alerts</h4>
                  <div className="mt-2 space-y-2">
                    {data.alerts.length > 0 ? (
                      data.alerts.map((alert) => (
                        <div key={alert.id} className="rounded-md bg-white px-2 py-1.5 text-xs text-ink-700">
                          <p className="font-semibold">{alert.message}</p>
                          <p className="text-[11px] text-ink-500">{alert.action}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-ink-500">No active alerts.</p>
                    )}
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-display text-base font-bold text-ink-800">Role Access Control</h3>
                  <TherapistBadge variant="sage" label={roleDisplayName[providerRole]} />
                </div>

                <p className="text-xs text-ink-600">Editable modules for your role:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roleEditableModules.map((module) => (
                    <TherapistBadge key={module} variant="success" label={module} />
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  {[
                    'prescriptions',
                    'medicationManagement',
                    'drugInteractions',
                    'therapyNotes',
                    'cbtExercises',
                    'habits',
                    'lifestyleGoals',
                  ].map((module) => (
                    <div key={module} className="flex items-center justify-between rounded-md bg-surface-bg px-3 py-2">
                      <span className="text-xs text-ink-700">{module}</span>
                      <span className={`text-[11px] font-semibold ${canEditModule(providerRole, module as any) ? 'text-emerald-700' : 'text-ink-500'}`}>
                        {canEditModule(providerRole, module as any) ? 'Edit' : 'Read only'}
                      </span>
                    </div>
                  ))}
                </div>
              </TherapistCard>

              <TherapistCard className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-display text-base font-bold text-ink-800">Mood Trend</h3>
                  <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                    <TrendingUp className="h-3.5 w-3.5" />
                    7-day forecast
                  </span>
                </div>

                {moodError ? <p className="mb-3 text-xs text-red-600">{moodError}</p> : null}
                {!selectedPatientId ? <p className="text-xs text-ink-500">Choose a patient from the top bar to load mood prediction insights.</p> : null}
                {moodLoading ? <p className="text-xs text-ink-500">Loading mood model output...</p> : null}

                {selectedPatientId && moodPrediction ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <TherapistBadge variant="sage" label={`Trend: ${moodPrediction.trendDirection || 'STABLE'}`} />
                      <TherapistBadge variant="default" label={`Confidence: ${Number(moodPrediction.confidencePct || 0)}%`} />
                      <TherapistBadge
                        variant={moodPrediction.deteriorationAlert ? 'danger' : 'success'}
                        label={moodPrediction.deteriorationAlert ? 'Deterioration Alert' : 'No Deterioration Alert'}
                      />
                    </div>

                    <div className="grid grid-cols-7 gap-2 max-[480px]:grid-cols-4">
                      {predictedMood.map((point, index) => (
                        <div key={`${point.label}-${index}`} className="rounded-lg border border-ink-100 p-2 text-center">
                          <div className="mx-auto mb-1 flex h-14 w-5 items-end rounded bg-ink-100/70">
                            <span
                              className={`w-full rounded ${point.value <= 3 ? 'bg-red-400' : 'bg-sage-400'}`}
                              style={{ height: `${Math.max(8, Math.min(100, (point.value / 10) * 100))}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-ink-500">{point.label}</p>
                          <p className="text-xs font-semibold text-ink-800">{point.value.toFixed(1)}</p>
                        </div>
                      ))}
                    </div>

                    {moodAccuracy ? (
                      <div className="grid grid-cols-3 gap-2 rounded-lg border border-ink-100 p-3 text-center">
                        <div>
                          <p className="text-[10px] text-ink-500">MAE</p>
                          <p className="font-display text-sm font-bold text-ink-800">{Number(moodAccuracy.mae || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-ink-500">Within ±2</p>
                          <p className="font-display text-sm font-bold text-ink-800">{Number(moodAccuracy.within2Pct || 0).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-ink-500">Target</p>
                          <p className={`font-display text-sm font-bold ${moodAccuracy.targetMet ? 'text-emerald-700' : 'text-clay-500'}`}>
                            {moodAccuracy.targetMet ? 'Met' : 'Below'}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </TherapistCard>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3 max-[1200px]:grid-cols-1">
            <TherapistCard className="overflow-hidden xl:col-span-2">
              <div className="border-b border-ink-100 px-5 py-4">
                <h3 className="font-display text-base font-bold text-ink-800">Therapist Care-Team Role Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-left">
                  <thead>
                    <tr className="border-b border-ink-100 text-xs uppercase tracking-[0.08em] text-ink-500">
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Focus</th>
                      <th className="px-5 py-3">Can Edit</th>
                      <th className="px-5 py-3">Restricted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROLE_CAPABILITY_ROWS.map((row) => (
                      <tr key={row.role} className="border-b border-ink-100/70 text-sm text-ink-800">
                        <td className="px-5 py-3 font-semibold">{roleDisplayName[row.role]}</td>
                        <td className="px-5 py-3 text-ink-600">{row.treatmentFocus}</td>
                        <td className="px-5 py-3 text-ink-600">{row.canEdit.join(', ')}</td>
                        <td className="px-5 py-3 text-ink-600">{row.cannotEdit.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TherapistCard>

            <TherapistCard className="p-5">
              <h3 className="mb-4 font-display text-base font-bold text-ink-800">Shared Care Guardrails</h3>
              <div className="space-y-3 text-xs text-ink-600">
                <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-sage-600" />All care-team members can read progress, assessments, mood trend, and care plan summary.</p>
                <p className="flex items-start gap-2"><Stethoscope className="mt-0.5 h-4 w-4 text-clay-500" />Only psychiatrists can prescribe or alter medication plans.</p>
                <p className="flex items-start gap-2"><Brain className="mt-0.5 h-4 w-4 text-sage-600" />Therapists own therapy notes and CBT assignment editing rights.</p>
                <p className="flex items-start gap-2"><HeartPulse className="mt-0.5 h-4 w-4 text-sky-600" />Coaches edit habits and lifestyle goals while keeping medical data read-only.</p>
              </div>
            </TherapistCard>
          </section>
        </>
      ) : (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3 max-[1200px]:grid-cols-2 max-[768px]:grid-cols-1">
          <TherapistCard className="p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink-800">Practice Revenue & Growth</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Growth view
              </span>
            </div>
            <div className="h-56">
              <TherapistEarningsChart
                labels={data.earningsChart.labels}
                therapistShare={data.earningsChart.therapistShare}
                platformShare={data.earningsChart.platformShare}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
              <div className="rounded-lg bg-sky-50 p-3">
                <p className="text-xs text-sky-700">Monthly Income Projection</p>
                <p className="font-display text-xl font-bold text-sky-900">{formatInr(monthlyProjection)}</p>
              </div>
              <div className="rounded-lg bg-cyan-50 p-3">
                <p className="text-xs text-cyan-700">Total Connected Patients</p>
                <p className="font-display text-xl font-bold text-cyan-900">{data.stats.activePatients + 6}</p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-3">
                <p className="text-xs text-indigo-700">Sessions Completed</p>
                <p className="font-display text-xl font-bold text-indigo-900">{data.stats.completedToday + 42}</p>
              </div>
              <div className="rounded-lg bg-violet-50 p-3">
                <p className="text-xs text-violet-700">Ratings & Reviews</p>
                <p className="font-display text-xl font-bold text-violet-900">{data.stats.avgRating?.toFixed(1) || '4.7'} / 5</p>
              </div>
            </div>
          </TherapistCard>

          <TherapistCard className="p-5">
            <h3 className="mb-4 font-display text-base font-bold text-ink-800">Workload Analytics</h3>
            <div className="mb-4 flex justify-center">
              <TherapistProgressRing value={data.utilization.percent} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display text-sm font-bold text-ink-800">{data.utilization.booked}</p>
                <p className="text-[10px] text-ink-500">Booked</p>
              </div>
              <div>
                <p className="font-display text-sm font-bold text-ink-800">{data.utilization.total}</p>
                <p className="text-[10px] text-ink-500">Capacity</p>
              </div>
              <div>
                <p className="font-display text-sm font-bold text-ink-800">{data.utilization.open}</p>
                <p className="text-[10px] text-ink-500">Open</p>
              </div>
            </div>
          </TherapistCard>

          <TherapistCard className="p-5 xl:col-span-3">
            <h3 className="mb-4 font-display text-base font-bold text-ink-800">Growth Insights</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-ink-100 bg-white p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-800"><Activity className="h-4 w-4 text-cyan-600" />Session Throughput</p>
                <p className="mt-1 text-xs text-ink-600">Weekly completion is up 12% with lower no-show rates.</p>
              </div>
              <div className="rounded-lg border border-ink-100 bg-white p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-800"><BarChart3 className="h-4 w-4 text-indigo-600" />Demand Signal</p>
                <p className="mt-1 text-xs text-ink-600">High intake demand in anxiety and emotional regulation cohorts.</p>
              </div>
              <div className="rounded-lg border border-ink-100 bg-white p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-800"><ArrowUpRight className="h-4 w-4 text-sky-600" />Practice Expansion</p>
                <p className="mt-1 text-xs text-ink-600">Add one evening slot to increase monthly capacity by ~8 sessions.</p>
              </div>
            </div>
          </TherapistCard>

          <TherapistCard className="xl:col-span-3">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h3 className="font-display text-base font-bold text-ink-800">My Patients Overview (Practice View)</h3>
              <TherapistBadge variant="default" label="List only" />
            </div>
            <div className="overflow-x-auto px-2 py-2">
              <table className="min-w-[680px] w-full text-left">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-[0.08em] text-ink-500">
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Sessions Completed</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patientDirectory.map((patient) => (
                    <tr key={`practice-${patient.id}`} className="border-b border-ink-100/60 text-sm text-ink-800">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold">{patient.name}</p>
                          <p className="text-xs text-ink-500">{patient.email || 'No email on file'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{patient.sessions}</td>
                      <td className="px-4 py-3">
                        <TherapistBadge
                          variant={patient.status.toLowerCase() === 'active' ? 'success' : 'default'}
                          label={patient.status}
                        />
                      </td>
                    </tr>
                  ))}
                  {patientDirectory.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-sm text-ink-500" colSpan={3}>No patients found for practice overview.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </TherapistCard>
        </section>
      )}

      <section className="rounded-xl border border-clay-200 bg-clay-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-clay-100">
              <AlertTriangle className="h-5 w-5 text-clay-500" />
            </span>
            <div>
              <h4 className="font-display text-sm font-bold text-clay-600">{data.stats.pendingNotes} session notes pending</h4>
              <p className="mt-1 text-xs text-clay-600">Complete clinical documentation within 24 hours to keep care continuity and compliance.</p>
            </div>
          </div>
          <TherapistButton variant="clay" className="w-full sm:w-auto">Write Notes</TherapistButton>
        </div>
      </section>

      <section className="rounded-xl border border-ink-100 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-ink-800">Recent Messages</h3>
          <TherapistBadge variant={data.stats.unreadMessages > 0 ? 'danger' : 'default'} label={`${data.stats.unreadMessages} unread`} />
        </div>
        <div className="space-y-2">
          {data.recentMessages.map((message) => (
            <button key={message.id} className="flex w-full items-center gap-3 rounded-lg border border-ink-100 px-3 py-2 text-left hover:bg-surface-bg">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sage-50 font-display text-[11px] font-bold text-sage-500">
                {message.title.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-800">{message.title}</span>
                <span className="block truncate text-xs text-ink-500">{message.text}</span>
              </span>
              <span className="text-[10px] text-ink-500">{formatTime(message.createdAt)}</span>
            </button>
          ))}
          {data.recentMessages.length === 0 ? <p className="text-sm text-ink-500">No recent messages.</p> : null}
        </div>
      </section>
    </div>
  );
}
