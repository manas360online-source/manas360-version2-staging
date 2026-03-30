import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, ClipboardList, FileSignature, Loader2, Pill, Stethoscope, Video } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { assignPatientItem, scheduleNextSession } from '../../../../api/provider';
import { useAuth } from '../../../../context/AuthContext';
import { usePatientOverview } from '../../../../hooks/usePatientOverview';

type ProviderKind = 'THERAPIST' | 'PSYCHIATRIST' | 'COACH' | 'PSYCHOLOGIST';

type ScoreTone = {
  label: string;
  className: string;
};

type ContextItem = {
  title: string;
  subtitle: string;
};

const psychiatristContext: ContextItem[] = [
  { title: 'Sertraline 50 mg', subtitle: 'Daily morning dose • adherence stable for 4 weeks' },
  { title: 'Clonazepam 0.25 mg', subtitle: 'PRN for acute sleep disruption • last refill 8 days ago' },
  { title: 'Vitamin D3 2000 IU', subtitle: 'Adjunct supplement • monitored under shared care plan' },
];

const therapyContext: ContextItem[] = [
  { title: 'Challenge cognitive distortions', subtitle: 'Track all-or-nothing thoughts in post-session worksheet' },
  { title: 'Behavioral activation target', subtitle: 'Complete 3 restorative activities this week and log energy shift' },
  { title: 'Sleep routine stabilization', subtitle: 'Maintain wind-down routine before 11 PM on 5 of 7 nights' },
];

const coachContext: ContextItem[] = [
  { title: 'Morning walk streak', subtitle: '6-day streak • average completion 24 minutes' },
  { title: 'Hydration habit', subtitle: 'Goal hit on 5 of last 7 days • consistency improving' },
  { title: 'Breathing reset practice', subtitle: 'Logged 2 resets today • strongest adherence after lunch' },
];

const normalizeRole = (role: string | undefined): ProviderKind => {
  const normalized = String(role || 'THERAPIST').toUpperCase();
  if (normalized === 'PSYCHIATRIST' || normalized === 'COACH' || normalized === 'PSYCHOLOGIST') {
    return normalized;
  }
  return 'THERAPIST';
};

const getScoreTone = (score: number, kind: 'PHQ-9' | 'GAD-7'): ScoreTone => {
  if (kind === 'PHQ-9') {
    if (score >= 20) return { label: 'Severe', className: 'bg-red-50 text-red-700' };
    if (score >= 15) return { label: 'Moderately Severe', className: 'bg-orange-50 text-orange-700' };
    if (score >= 10) return { label: 'Moderate', className: 'bg-amber-50 text-amber-700' };
    if (score >= 5) return { label: 'Mild', className: 'bg-[#E8EFE6] text-[#4A6741]' };
    return { label: 'Minimal', className: 'bg-slate-100 text-slate-700' };
  }

  if (score >= 15) return { label: 'Severe', className: 'bg-red-50 text-red-700' };
  if (score >= 10) return { label: 'Moderate', className: 'bg-amber-50 text-amber-700' };
  if (score >= 5) return { label: 'Mild', className: 'bg-[#E8EFE6] text-[#4A6741]' };
  return { label: 'Minimal', className: 'bg-slate-100 text-slate-700' };
};

const assessmentNarrative = (kind: 'PHQ-9' | 'GAD-7', score: number | null): string => {
  if (score === null) return `No recent ${kind} assessment available yet.`;
  if (kind === 'PHQ-9') {
    if (score >= 15) return 'Depressive symptom burden is currently elevated and needs close follow-up.';
    if (score >= 10) return 'Depressive symptoms are in moderate range with room for clinical improvement.';
    return 'Depressive symptoms are currently mild to minimal.';
  }
  if (score >= 10) return 'Anxiety symptoms are clinically significant and should be monitored closely.';
  return 'Anxiety remains in a manageable range based on recent screening.';
};

const readLatestScore = (
  recentAssessments: Array<{ type: 'PHQ-9' | 'GAD-7'; score: number }>,
  type: 'PHQ-9' | 'GAD-7',
): number | null => {
  const item = recentAssessments.find((entry) => entry.type === type);
  return item ? item.score : null;
};

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>
    <div className="space-y-4 lg:col-span-2">
      <section className="h-56 animate-pulse rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm" />
      <section className="h-64 animate-pulse rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm" />
      <section className="h-72 animate-pulse rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm" />
    </div>
    <div className="space-y-4 lg:col-span-1">
      <section className="h-64 animate-pulse rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm" />
      <section className="h-64 animate-pulse rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm" />
    </div>
  </div>
);

export default function ChartOverview() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingDuration, setBookingDuration] = useState(50);
  const [upcomingSessionOverride, setUpcomingSessionOverride] = useState<{ id: string; dateTime: string } | null>(null);

  const providerRole = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const { data: overview, isLoading, isError } = usePatientOverview(patientId);

  const { mutate: assignAssessment, isPending: isAssigning } = useMutation({
    mutationFn: () => assignPatientItem(patientId!, { assignmentType: 'ASSESSMENT', title: 'PHQ-9 Assessment' }),
    onSuccess: () => toast.success('PHQ-9 assessment assigned successfully.'),
    onError: () => toast.error('Failed to assign assessment. Please try again.'),
  });

  const { mutate: scheduleSession, isPending: isSchedulingSession } = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error('Patient id is required');
      if (!bookingDate || !bookingTime) throw new Error('Please select date and time');

      const startTimeIso = new Date(`${bookingDate}T${bookingTime}`).toISOString();
      return scheduleNextSession(patientId, {
        startTime: startTimeIso,
        duration: bookingDuration,
      });
    },
    onSuccess: async (result) => {
      const readableDate = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(result.startTime));

      setUpcomingSessionOverride({
        id: result.sessionId,
        dateTime: readableDate,
      });

      setIsBookingModalOpen(false);
      toast.success('Session scheduled successfully. Patient has been notified.');
      await queryClient.invalidateQueries({ queryKey: ['patientOverview', patientId] });
    },
    onError: (error: any) => {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to schedule session.'));
    },
  });

  const contextTitle =
    providerRole === 'PSYCHIATRIST'
      ? 'Active Medications'
      : providerRole === 'COACH'
        ? 'Active Habits & Streaks'
        : 'Active Treatment Plan / CBT Goals';

  const contextItems =
    providerRole === 'PSYCHIATRIST'
      ? psychiatristContext
      : providerRole === 'COACH'
        ? coachContext
        : therapyContext;

  if (isLoading) {
    return <SkeletonGrid />;
  }

  if (isError || !overview) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <p className="font-sans text-sm font-bold">Unable to load patient overview right now.</p>
        <p className="mt-1 text-sm">Please try again from the patient chart in a moment.</p>
      </div>
    );
  }

  const phq9 = readLatestScore(overview.recentAssessments, 'PHQ-9');
  const gad7 = readLatestScore(overview.recentAssessments, 'GAD-7');
  const effectiveUpcomingSession = upcomingSessionOverride || overview.upcomingSession;

  const phqTone = getScoreTone(phq9 ?? 0, 'PHQ-9');
  const gadTone = getScoreTone(gad7 ?? 0, 'GAD-7');

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="space-y-4 lg:col-span-2">
        <section className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4A6741]">Clinical Summary</p>
              <h2 className="mt-2 font-sans text-xl font-bold text-[#2D4128]">Patient Snapshot</h2>
              <p className="mt-1 text-sm text-slate-500">Patient ID {overview.patient.id} • Current role view: {providerRole}</p>
            </div>
            <div className="rounded-full bg-[#E8EFE6] px-3 py-1 text-xs font-semibold text-[#4A6741]">
              {effectiveUpcomingSession ? 'Upcoming Session Scheduled' : 'No Upcoming Session'}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Primary Diagnosis</p>
              <p className="mt-2 font-sans text-base font-bold text-[#2D4128]">{overview.patient.diagnosis}</p>
            </div>
            <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Last Session Date</p>
              <p className="mt-2 font-sans text-base font-bold text-[#2D4128]">{overview.lastSession?.dateTime || 'No completed sessions yet'}</p>
            </div>
            <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Next Scheduled Session</p>
              <p className="mt-2 font-sans text-base font-bold text-[#2D4128]">{effectiveUpcomingSession?.dateTime || 'No upcoming sessions scheduled'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#4A6741]" />
            <h3 className="font-sans text-lg font-bold text-[#2D4128]">Assessment Trends</h3>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">PHQ-9</p>
                  <p className="mt-2 font-sans text-3xl font-bold text-[#2D4128]">{phq9 ?? '-'}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${phqTone.className}`}>
                  {phq9 === null ? 'Pending' : phqTone.label}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{assessmentNarrative('PHQ-9', phq9)}</p>
            </div>

            <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">GAD-7</p>
                  <p className="mt-2 font-sans text-3xl font-bold text-[#2D4128]">{gad7 ?? '-'}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${gadTone.className}`}>
                  {gad7 === null ? 'Pending' : gadTone.label}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{assessmentNarrative('GAD-7', gad7)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#4A6741]" />
            <h3 className="font-sans text-lg font-bold text-[#2D4128]">Recent Activity Timeline</h3>
          </div>

          <div className="mt-5 space-y-5">
            {overview.recentActivity.map((event, idx) => (
              <div key={`${event.title}-${idx}`} className="relative pl-6">
                <div className="absolute left-[7px] top-0 h-full w-px bg-[#E5E5E5]" aria-hidden="true" />
                <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-[#4A6741] shadow-sm" aria-hidden="true" />
                <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-sans text-sm font-bold text-[#2D4128]">{event.title}</p>
                    <span className="text-xs text-slate-500">{event.time}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{event.description}</p>
                </div>
              </div>
            ))}
            {overview.recentActivity.length === 0 && (
              <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] p-4 text-sm text-slate-600">
                No recent activity available yet.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="space-y-4 lg:col-span-1">
        <section className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-[#4A6741]" />
            <h3 className="font-sans text-lg font-bold text-[#2D4128]">Quick Actions</h3>
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                if (effectiveUpcomingSession?.id) {
                  navigate(`/video-session/${effectiveUpcomingSession.id}`);
                } else {
                  toast.error('No session scheduled for today.');
                }
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2D4128] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Video className="h-4 w-4" />
              Start Video Session
            </button>
            <button
              type="button"
              onClick={() => setIsBookingModalOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8]"
            >
              <Video className="h-4 w-4" />
              Schedule Next Session
            </button>
            <button
              type="button"
              onClick={() => navigate(`../notes?action=new_note`)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileSignature className="h-4 w-4" />
              Write Session Note
            </button>
            <button
              type="button"
              onClick={() => assignAssessment()}
              disabled={isAssigning}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              {isAssigning ? 'Assigning...' : 'Assign Assessment'}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-[#4A6741]" />
            <h3 className="font-sans text-lg font-bold text-[#2D4128]">{contextTitle}</h3>
          </div>

          <div className="mt-4 space-y-3">
            {contextItems.map((item) => (
              <div key={item.title} className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] p-4">
                <p className="font-sans text-sm font-bold text-[#2D4128]">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {isBookingModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-xl">
            <h3 className="font-sans text-lg font-bold text-[#2D4128]">Schedule Next Session</h3>
            <p className="mt-1 text-sm text-slate-500">Choose the exact slot. This session will be locked for the patient.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setBookingDate(event.target.value)}
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2D4128] outline-none focus:border-[#4A6741]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Time</label>
                <input
                  type="time"
                  value={bookingTime}
                  onChange={(event) => setBookingTime(event.target.value)}
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2D4128] outline-none focus:border-[#4A6741]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Duration (minutes)</label>
                <select
                  value={bookingDuration}
                  onChange={(event) => setBookingDuration(Number(event.target.value))}
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2D4128] outline-none focus:border-[#4A6741]"
                >
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                  <option value={50}>50</option>
                  <option value={60}>60</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => scheduleSession()}
                disabled={isSchedulingSession || !bookingDate || !bookingTime}
                className="inline-flex items-center gap-2 rounded-lg bg-[#4A6741] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSchedulingSession ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
