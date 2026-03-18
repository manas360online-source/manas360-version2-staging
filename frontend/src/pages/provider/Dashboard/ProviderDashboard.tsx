import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useProviderDashboard } from '../../../hooks/useProviderDashboard';
import type { SmartAlertItem } from '../../../api/provider';

type ProviderKind = 'THERAPIST' | 'PSYCHIATRIST' | 'COACH' | 'PSYCHOLOGIST';

type StatItem = {
  key: string;
  label: string;
  fallbackValue: string;
  hint: string;
  tone?: 'default' | 'alert' | 'success';
};

type AlertItem = {
  id?: string;
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
};

const roleStats: Record<ProviderKind, StatItem[]> = {
  PSYCHIATRIST: [
    { key: 'consultsToday', label: 'Consults', fallbackValue: '12', hint: 'Today', tone: 'default' },
    { key: 'activePrescriptions', label: 'Active Prescriptions', fallbackValue: '47', hint: 'Current panel', tone: 'success' },
    { key: 'interactionWarnings', label: 'Drug Interactions', fallbackValue: '3', hint: 'Needs review', tone: 'alert' },
    { key: 'cbtAdherence', label: 'Adherence Rate', fallbackValue: '81%', hint: 'Last 7 days', tone: 'default' },
  ],
  COACH: [
    { key: 'checkInsToday', label: 'Check-ins', fallbackValue: '19', hint: 'Today', tone: 'default' },
    { key: 'activeGoals', label: 'Active Goals', fallbackValue: '34', hint: 'Across clients', tone: 'success' },
    { key: 'habitStreaks', label: 'Habit Streaks', fallbackValue: '26', hint: 'At least 7 days', tone: 'default' },
    { key: 'cbtAdherence', label: 'Adherence Rate', fallbackValue: '85%', hint: 'Last 7 days', tone: 'default' },
  ],
  THERAPIST: [
    { key: 'totalSessions', label: 'Sessions', fallbackValue: '9', hint: 'Scheduled today', tone: 'default' },
    { key: 'patientAlerts', label: 'Patient Alerts', fallbackValue: '4', hint: 'Needs follow-up', tone: 'alert' },
    { key: 'pendingNotes', label: 'Pending Notes', fallbackValue: '5', hint: 'To be completed', tone: 'default' },
    { key: 'activePatients', label: 'Active Patients', fallbackValue: '28', hint: 'Current caseload', tone: 'success' },
  ],
  PSYCHOLOGIST: [
    { key: 'totalSessions', label: 'Sessions', fallbackValue: '8', hint: 'Scheduled today', tone: 'default' },
    { key: 'patientAlerts', label: 'Patient Alerts', fallbackValue: '3', hint: 'Risk flagged', tone: 'alert' },
    { key: 'pendingNotes', label: 'Pending Notes', fallbackValue: '6', hint: 'Evaluation notes', tone: 'default' },
    { key: 'activePatients', label: 'Active Patients', fallbackValue: '24', hint: 'Current caseload', tone: 'success' },
  ],
};

const alertsByRole: Record<ProviderKind, AlertItem[]> = {
  PSYCHIATRIST: [
    { title: 'Drug interaction risk', detail: 'Ananya Kapoor has a moderate interaction warning in today\'s prescription draft.', priority: 'high' },
    { title: 'Missed follow-up', detail: 'Ravi Menon missed yesterday\'s medication follow-up.', priority: 'medium' },
    { title: 'Adherence dip', detail: 'Two patients fell below 60% adherence this week.', priority: 'medium' },
  ],
  COACH: [
    { title: 'Missed check-in', detail: 'Nikhil Thomas missed the morning accountability check-in.', priority: 'high' },
    { title: 'Goal drift', detail: 'Three clients are behind weekly goal targets.', priority: 'medium' },
    { title: 'Streak milestone', detail: 'Priya Verma reached a 21-day mindfulness streak.', priority: 'low' },
  ],
  THERAPIST: [
    { title: 'High PHQ-9 score', detail: 'Riya Krishnan recorded PHQ-9 score of 18 in latest assessment.', priority: 'high' },
    { title: 'Pending session notes', detail: '5 notes are pending signature from yesterday.', priority: 'medium' },
    { title: 'Missed session', detail: 'Vivek Kumar requested reschedule after no-show.', priority: 'medium' },
  ],
  PSYCHOLOGIST: [
    { title: 'Risk escalation', detail: 'Pooja L triggered a high-risk marker in mood analytics.', priority: 'high' },
    { title: 'Pending diagnostic report', detail: '2 report drafts are awaiting final review.', priority: 'medium' },
    { title: 'Test battery incomplete', detail: 'Harish R has one pending cognitive battery module.', priority: 'low' },
  ],
};

const toProviderKind = (role: string | undefined): ProviderKind => {
  const normalized = String(role || 'THERAPIST').toUpperCase();
  if (normalized === 'PSYCHIATRIST' || normalized === 'COACH' || normalized === 'PSYCHOLOGIST') {
    return normalized;
  }
  return 'THERAPIST';
};

const statToneClass = (tone: StatItem['tone']): string => {
  if (tone === 'alert') return 'text-rose-700 bg-rose-50 border-rose-100';
  if (tone === 'success') return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  return 'text-slate-700 bg-white border-slate-200';
};

const alertToneClass = (priority: AlertItem['priority']): string => {
  if (priority === 'high') return 'border-rose-200 bg-rose-50';
  if (priority === 'medium') return 'border-amber-200 bg-amber-50';
  return 'border-slate-200 bg-slate-50';
};

const smartAlertToUi = (item: SmartAlertItem): AlertItem => {
  const titleByTrigger: Record<SmartAlertItem['trigger'], string> = {
    mood_decline: 'Mood decline detected',
    stress_spike: 'High stress pattern',
    sleep_risk: 'Sleep risk pattern',
  };

  return {
    id: `${item.patientId}-${item.trigger}`,
    title: `${titleByTrigger[item.trigger]} • ${item.patientName}`,
    detail: item.message,
    priority: item.severity,
  };
};

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useProviderDashboard();

  const providerRole = useMemo(() => toProviderKind(user?.role), [user?.role]);
  const stats = roleStats[providerRole];
  const dynamicStats = stats.map((item) => {
    const raw = data?.stats?.[item.key];
    return {
      ...item,
      value: raw !== undefined && raw !== null ? String(raw) : item.fallbackValue,
    };
  });

  const adherenceDipCount = Number(data?.stats?.adherenceDipCount ?? 0);
  const smartAlertsFromApi = Array.isArray(data?.smartAlerts) ? data.smartAlerts : [];
  const alerts = useMemo(() => {
    if (smartAlertsFromApi.length > 0) {
      return smartAlertsFromApi.map(smartAlertToUi);
    }
    const base = alertsByRole[providerRole].filter((item) => item.title.toLowerCase() !== 'adherence dip');
    const dynamicAdherenceAlert: AlertItem = {
      title: 'Adherence dip',
      detail: adherenceDipCount > 0
        ? `${adherenceDipCount} patient${adherenceDipCount === 1 ? '' : 's'} fell below 60% adherence this week.`
        : 'No patients are below 60% adherence this week.',
      priority: adherenceDipCount > 0 ? 'medium' : 'low',
    };
    return [dynamicAdherenceAlert, ...base];
  }, [adherenceDipCount, providerRole, smartAlertsFromApi]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-8 h-14 w-80 animate-pulse rounded-lg bg-gray-200" />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`stats-skeleton-${idx}`} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="h-72 animate-pulse rounded-xl border border-gray-200 bg-gray-100 xl:col-span-2" />
          <div className="h-72 animate-pulse rounded-xl border border-gray-200 bg-gray-100 xl:col-span-1" />
        </section>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="text-sm font-semibold">Unable to load provider dashboard right now.</p>
        <p className="mt-1 text-sm">Please try again in a moment.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  const todaySessions = data?.todaySessions || [];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Good morning, Dr. {user?.firstName || 'Provider'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here is your practice overview for today.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dynamicStats.map((item) => (
          <article
            key={item.label}
            className={`rounded-xl border p-4 shadow-sm ${statToneClass(item.tone)}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{item.label}</p>
            <p className="mt-2 text-2xl font-bold leading-tight">{item.value}</p>
            <p className="mt-1 text-xs opacity-80">{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Today\'s Schedule</h2>
            <span className="text-xs font-medium text-slate-500">{providerRole}</span>
          </div>

          <div className="space-y-3">
            {todaySessions.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[90px_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3"
              >
                <p className="text-xs font-semibold text-slate-600">{item.time}</p>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8EFE6] text-xs font-bold text-[#2D4128]">
                    {item.patientInitials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.patientName}</p>
                    <p className="text-xs text-slate-500">{item.type}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/video-session/${item.id}`)}
                  className="rounded-md bg-[#4A6741] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3d5736]"
                >
                  Start Session
                </button>
              </div>
            ))}
            {todaySessions.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No sessions scheduled for today.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Action Items / Alerts</h2>

          <div className="space-y-3">
            {alerts.map((item) => (
              <div key={item.id || item.title} className={`rounded-lg border p-3 ${alertToneClass(item.priority)}`}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.priority}</span>
                </div>
                <p className="text-xs text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
