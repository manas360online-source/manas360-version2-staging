import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';
import LeaderboardSection from './dashboard/LeaderboardSection';
import RoiStatsSection from './dashboard/RoiStatsSection';
import WellnessChallengesSection from './dashboard/WellnessChallengesSection';
import type { LeaderboardEntry, RoiStat, WellnessChallenge } from './dashboard/CorporateDashboard.types';
import { corporateApi } from '../../api/corporate.api';

type ChallengeApiItem = {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  summary?: string;
  participants?: number;
  participantCount?: number;
  duration?: string;
  durationLabel?: string;
  streakDays?: number;
  streak?: number;
  currentStreak?: number;
};

type ChallengeApiResponse = {
  success?: boolean;
  message?: string;
  data?: ChallengeApiItem[];
};

type RoiApiPayload = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

type LeaderboardApiItem = {
  id?: string | number;
  userId?: string | number;
  name?: string;
  employeeName?: string;
  department?: string;
  team?: string;
  points?: number;
  score?: number;
  streakDays?: number;
  streak?: number;
};

type DashboardApiPayload = {
  success?: boolean;
  message?: string;
  data?: {
    leaderboard?: LeaderboardApiItem[];
    topPerformers?: LeaderboardApiItem[];
  };
};

type EapQrAnalytics = {
  companyKey?: string;
  companyName?: string;
  qrCount?: number;
  totals?: {
    scans?: number;
    screenings?: number;
    bookings?: number;
    revenue?: number;
  };
  breakdown?: Array<{
    code?: string;
    location?: string;
    scans?: number;
    screenings?: number;
    bookings?: number;
    revenue?: number;
  }>;
};

export default function CorporateDashboard() {
  const [wellnessChallenges, setWellnessChallenges] = useState<WellnessChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [challengesError, setChallengesError] = useState<string | null>(null);
  const [enrolledChallengeIds, setEnrolledChallengeIds] = useState<Set<string>>(new Set());
  const [enrollingChallengeIds, setEnrollingChallengeIds] = useState<Set<string>>(new Set());
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [checkingInChallengeIds, setCheckingInChallengeIds] = useState<Set<string>>(new Set());
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [roiStats, setRoiStats] = useState<RoiStat[]>([]);
  const [roiLoading, setRoiLoading] = useState(true);
  const [roiError, setRoiError] = useState<string | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [eapAnalytics, setEapAnalytics] = useState<EapQrAnalytics | null>(null);
  const [eapLoading, setEapLoading] = useState(true);
  const [eapError, setEapError] = useState<string | null>(null);
  const [eapGenerating, setEapGenerating] = useState(false);

  const fetchChallenges = useCallback(async () => {
    setChallengesLoading(true);
    setChallengesError(null);

    try {
      const payload = await corporateApi.getPrograms();
      const rawChallenges = Array.isArray(payload)
        ? (payload as ChallengeApiItem[])
        : Array.isArray((payload as ChallengeApiResponse | null)?.data)
          ? ((payload as ChallengeApiResponse).data || [])
          : [];

      const mappedChallenges: WellnessChallenge[] = rawChallenges.reduce<WellnessChallenge[]>((acc, item, index) => {
        const title = String(item.title || item.name || '').trim();
        if (!title) {
          return acc;
        }

        acc.push({
          id: String(item.id || `challenge-${index}`),
          title,
          description: String(item.description || item.summary || 'No description available.'),
          participants: Number(item.participants ?? item.participantCount ?? 0),
          duration: String(item.duration || item.durationLabel || 'Ongoing'),
          streakDays: Number(item.streakDays ?? item.streak ?? item.currentStreak ?? 0),
        });

        return acc;
      }, []);

      setWellnessChallenges(mappedChallenges);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load wellness challenges.';
      setChallengesError(message);
      setWellnessChallenges([]);
    } finally {
      setChallengesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchChallenges();
  }, [fetchChallenges]);

  const fetchRoi = useCallback(async () => {
    setRoiLoading(true);
    setRoiError(null);

    try {
      const payload = await corporateApi.getRoi();
      const roiSource = (
        (payload as RoiApiPayload | null)?.data && typeof (payload as RoiApiPayload).data === 'object'
          ? (payload as RoiApiPayload).data
          : (payload && typeof payload === 'object' ? payload : {})
      ) as Record<string, unknown>;

      const toNumber = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim().length > 0) {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) return parsed;
        }
        return null;
      };

      const participation =
        toNumber(roiSource.participationPct) ??
        toNumber(roiSource.participationRate) ??
        toNumber(roiSource.participationPercentage);
      const sessions =
        toNumber(roiSource.sessionsCount) ??
        toNumber(roiSource.totalSessions) ??
        toNumber(roiSource.sessionsUsed);
      const roiValue =
        toNumber(roiSource.roiMultiple) ??
        toNumber(roiSource.roiValue) ??
        toNumber(roiSource.roi) ??
        toNumber(roiSource.roiPercent);

      const mappedStats: RoiStat[] = [];

      if (participation !== null) {
        mappedStats.push({
          id: 'participation',
          label: 'Participation %',
          value: `${Math.round(participation)}%`,
          note: 'Employees participating in wellness programs.',
        });
      }

      if (sessions !== null) {
        mappedStats.push({
          id: 'sessions-count',
          label: 'Sessions Count',
          value: String(Math.round(sessions)),
          note: 'Total sessions recorded in the selected period.',
        });
      }

      if (roiValue !== null) {
        mappedStats.push({
          id: 'roi-value',
          label: 'ROI Value',
          value: `${roiValue.toFixed(1)}x`,
          note: 'Return generated from corporate wellness investment.',
        });
      }

      const reserved = new Set([
        'participationPct',
        'participationRate',
        'participationPercentage',
        'sessionsCount',
        'totalSessions',
        'sessionsUsed',
        'roiValue',
        'roi',
        'roiPercent',
      ]);

      Object.entries(roiSource)
        .filter(([key, value]) => !reserved.has(key) && (typeof value === 'number' || typeof value === 'string'))
        .slice(0, 3)
        .forEach(([key, value], index) => {
          const label = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_-]+/g, ' ')
            .trim()
            .replace(/^./, (ch) => ch.toUpperCase());

          mappedStats.push({
            id: `extra-${index}-${key}`,
            label,
            value: String(value),
            note: 'Additional ROI metric',
          });
        });

      setRoiStats(mappedStats);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load ROI metrics.';
      setRoiError(message);
      setRoiStats([]);
    } finally {
      setRoiLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRoi();
  }, [fetchRoi]);

  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);

    try {
      const payload = await corporateApi.getDashboard();

      const source = ((payload as DashboardApiPayload | null)?.data ?? payload ?? {}) as {
        leaderboard?: LeaderboardApiItem[];
        topPerformers?: LeaderboardApiItem[];
        departmentBreakdown?: Array<{
          department?: string;
          active?: number;
          utilizationPct?: number;
          sessionsUsed?: number;
        }>;
      };

      const raw: LeaderboardApiItem[] = Array.isArray(source.departmentBreakdown) && source.departmentBreakdown.length > 0
        ? source.departmentBreakdown.map((row, index): LeaderboardApiItem => ({
            id: String(index + 1),
            userId: `dept-${index + 1}`,
            name: String(row.department || '').trim(),
            department: 'Department',
            points: Number(row.utilizationPct ?? row.sessionsUsed ?? 0),
            streakDays: Number(row.active ?? 0),
          }))
        : Array.isArray(source.leaderboard)
          ? source.leaderboard
          : Array.isArray(source.topPerformers)
            ? source.topPerformers
            : [];

      const mapped: LeaderboardEntry[] = raw.reduce<LeaderboardEntry[]>((acc, item, index) => {
        const name = String(item.name || item.employeeName || '').trim();
        if (!name) return acc;

        acc.push({
          id: String(item.id || item.userId || `leader-${index}`),
          name,
          department: String(item.department || item.team || 'Unassigned'),
          points: Number(item.points ?? item.score ?? 0),
          streakDays: Number(item.streakDays ?? item.streak ?? 0),
        });

        return acc;
      }, []);

      setLeaderboardEntries(mapped);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load leaderboard.';
      setLeaderboardError(message);
      setLeaderboardEntries([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  const fetchEapAnalytics = useCallback(async () => {
    setEapLoading(true);
    setEapError(null);

    try {
      const payload = await corporateApi.getEapQrAnalytics('techcorp-india');
      const data = ((payload as { data?: EapQrAnalytics } | null)?.data ?? payload ?? {}) as EapQrAnalytics;
      setEapAnalytics(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load EAP QR analytics.';
      setEapError(message);
      setEapAnalytics(null);
    } finally {
      setEapLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEapAnalytics();
  }, [fetchEapAnalytics]);

  const handleCreateEapQr = async () => {
    const location = window.prompt('Enter EAP standee location', 'blr-campus-1')?.trim() || 'blr-campus-1';
    setEapGenerating(true);
    try {
      await corporateApi.createEapQr({ location }, 'techcorp-india');
      toast.success('EAP QR generated');
      await fetchEapAnalytics();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create EAP QR.';
      toast.error(message);
    } finally {
      setEapGenerating(false);
    }
  };

  const totalParticipants = useMemo(
    () => wellnessChallenges.reduce((sum, challenge) => sum + challenge.participants, 0),
    [wellnessChallenges]
  );

  const handleEnroll = async (challengeId: string) => {
    if (enrolledChallengeIds.has(challengeId) || enrollingChallengeIds.has(challengeId)) {
      return;
    }

    setEnrollError(null);
    setEnrollingChallengeIds((current) => {
      const next = new Set(current);
      next.add(challengeId);
      return next;
    });

    try {
      const response = await fetch('/api/corporate/enroll', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challengeId }),
      });

      let payload: { message?: string; error?: { message?: string } } | null = null;
      try {
        payload = (await response.json()) as { message?: string; error?: { message?: string } };
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message = payload?.message || payload?.error?.message || 'Unable to enroll in challenge.';
        throw new Error(message);
      }

      setEnrolledChallengeIds((current) => {
        const next = new Set(current);
        next.add(challengeId);
        return next;
      });

      const challenge = wellnessChallenges.find((item) => item.id === challengeId);
      toast.success(challenge ? `Enrolled in ${challenge.title}` : 'Enrollment successful');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to enroll in challenge.';
      setEnrollError(message);
      toast.error(message);
    } finally {
      setEnrollingChallengeIds((current) => {
        const next = new Set(current);
        next.delete(challengeId);
        return next;
      });
    }
  };

  const handleCheckIn = async (challengeId: string) => {
    if (checkingInChallengeIds.has(challengeId)) {
      return;
    }

    setCheckInError(null);
    setCheckingInChallengeIds((current) => {
      const next = new Set(current);
      next.add(challengeId);
      return next;
    });

    try {
      const response = await fetch('/api/corporate/check-in', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challengeId }),
      });

      let payload: {
        message?: string;
        error?: { message?: string };
        data?: { streakDays?: number; streak?: number; currentStreak?: number };
      } | null = null;
      try {
        payload = (await response.json()) as {
          message?: string;
          error?: { message?: string };
          data?: { streakDays?: number; streak?: number; currentStreak?: number };
        };
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message = payload?.message || payload?.error?.message || 'Unable to complete daily check-in.';
        throw new Error(message);
      }

      const streakFromResponse = payload?.data?.streakDays ?? payload?.data?.streak ?? payload?.data?.currentStreak;
      if (typeof streakFromResponse === 'number' && Number.isFinite(streakFromResponse)) {
        setWellnessChallenges((current) =>
          current.map((challenge) =>
            challenge.id === challengeId
              ? { ...challenge, streakDays: streakFromResponse }
              : challenge
          )
        );
      }

      const challenge = wellnessChallenges.find((item) => item.id === challengeId);
      const streakSuffix = typeof streakFromResponse === 'number' ? ` · Streak: ${streakFromResponse} day${streakFromResponse === 1 ? '' : 's'}` : '';
      toast.success(`${challenge ? `${challenge.title} check-in completed` : 'Daily check-in completed'}${streakSuffix}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete daily check-in.';
      setCheckInError(message);
      toast.error(message);
    } finally {
      setCheckingInChallengeIds((current) => {
        const next = new Set(current);
        next.delete(challengeId);
        return next;
      });
    }
  };

  return (
    <CorporateShellLayout
      title="Corporate Dashboard"
      subtitle="Drive healthier teams with challenge participation, check-ins, and measurable outcomes."
    >
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-ink-100 bg-slate-950 p-5 text-white xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Corporate EAP QR</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">Anonymous screening standees</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Generate branded QR standees for campuses, cafeterias, and HR offices. Employees scan into an anonymous screening flow; HR only sees aggregate scans, screenings, and bookings.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void handleCreateEapQr();
              }}
              disabled={eapGenerating}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {eapGenerating ? 'Generating...' : 'Generate standee QR'}
            </button>
            <button
              type="button"
              onClick={() => {
                void fetchEapAnalytics();
              }}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Refresh analytics
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Current snapshot</p>
          {eapLoading ? (
            <p className="mt-3 text-sm text-ink-600">Loading EAP metrics...</p>
          ) : eapError ? (
            <p className="mt-3 text-sm text-rose-600">{eapError}</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-ink-700">
              <p><span className="font-semibold">Standees:</span> {eapAnalytics?.qrCount ?? 0}</p>
              <p><span className="font-semibold">Scans:</span> {eapAnalytics?.totals?.scans ?? 0}</p>
              <p><span className="font-semibold">Screenings:</span> {eapAnalytics?.totals?.screenings ?? 0}</p>
              <p><span className="font-semibold">Bookings:</span> {eapAnalytics?.totals?.bookings ?? 0}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-ink-100 bg-white p-5 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Program Snapshot</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink-900">{totalParticipants} challenge enrollments</p>
          <p className="mt-1 text-sm text-ink-600">Momentum is strongest in movement and mindfulness initiatives this month.</p>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-ink-900">Daily Check-In</h2>
          <p className="mt-2 text-sm text-ink-600">Encourage employees to submit today&apos;s mood and wellness status.</p>
          <Link
            to="/patient/check-in"
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
          >
            Daily check-in
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {challengesLoading ? (
            <section className="rounded-xl border border-ink-100 bg-white p-5">
              <div className="mb-4 h-5 w-44 animate-pulse rounded bg-ink-100" />
              <div className="space-y-3">
                {[0, 1, 2].map((skeleton) => (
                  <div key={skeleton} className="rounded-lg border border-ink-100 bg-ink-50 p-4">
                    <div className="h-4 w-3/5 animate-pulse rounded bg-ink-100" />
                    <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-ink-100" />
                    <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-ink-100" />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {!challengesLoading && challengesError ? (
            <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
              <h2 className="font-display text-lg font-semibold text-rose-800">Wellness Challenges</h2>
              <p className="mt-2 text-sm text-rose-700">{challengesError}</p>
              <button
                type="button"
                onClick={() => {
                  void fetchChallenges();
                }}
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
              >
                Retry
              </button>
            </section>
          ) : null}

          {!challengesLoading && !challengesError ? (
            wellnessChallenges.length > 0 ? (
              <>
                <WellnessChallengesSection
                  challenges={wellnessChallenges}
                  onEnroll={(challengeId) => {
                    void handleEnroll(challengeId);
                  }}
                  onCheckIn={(challengeId) => {
                    void handleCheckIn(challengeId);
                  }}
                  enrolledChallengeIds={enrolledChallengeIds}
                  enrollingChallengeIds={enrollingChallengeIds}
                  checkingInChallengeIds={checkingInChallengeIds}
                />
                {enrollError ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{enrollError}</p>
                ) : null}
                {checkInError ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{checkInError}</p>
                ) : null}
              </>
            ) : (
              <section className="rounded-xl border border-ink-100 bg-white p-5">
                <h2 className="font-display text-lg font-semibold text-ink-900">Wellness Challenges</h2>
                <p className="mt-2 text-sm text-ink-600">No active challenges available right now.</p>
              </section>
            )
          ) : null}

          {roiLoading ? (
            <section className="rounded-xl border border-ink-100 bg-white p-5">
              <div className="mb-4 h-5 w-32 animate-pulse rounded bg-ink-100" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[0, 1, 2].map((skeleton) => (
                  <div key={skeleton} className="rounded-lg border border-ink-100 bg-ink-50 p-4">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100" />
                    <div className="mt-2 h-6 w-1/2 animate-pulse rounded bg-ink-100" />
                    <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-ink-100" />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {!roiLoading && roiError ? (
            <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
              <h2 className="font-display text-lg font-semibold text-rose-800">ROI Stats</h2>
              <p className="mt-2 text-sm text-rose-700">{roiError}</p>
              <button
                type="button"
                onClick={() => {
                  void fetchRoi();
                }}
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
              >
                Retry
              </button>
            </section>
          ) : null}

          {!roiLoading && !roiError ? (
            roiStats.length > 0 ? (
              <RoiStatsSection stats={roiStats} />
            ) : (
              <section className="rounded-xl border border-ink-100 bg-white p-5">
                <h2 className="font-display text-lg font-semibold text-ink-900">ROI Stats</h2>
                <p className="mt-2 text-sm text-ink-600">No ROI metrics available right now.</p>
              </section>
            )
          ) : null}
        </div>

        {leaderboardLoading ? (
          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <div className="mb-4 h-5 w-28 animate-pulse rounded bg-ink-100" />
            <div className="space-y-2">
              {[0, 1, 2].map((skeleton) => (
                <div key={skeleton} className="rounded-lg border border-ink-100 px-3 py-3">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-ink-100" />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {!leaderboardLoading && leaderboardError ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
            <h2 className="font-display text-lg font-semibold text-rose-800">Leaderboard</h2>
            <p className="mt-2 text-sm text-rose-700">{leaderboardError}</p>
            <button
              type="button"
              onClick={() => {
                void fetchLeaderboard();
              }}
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
            >
              Retry
            </button>
          </section>
        ) : null}

        {!leaderboardLoading && !leaderboardError ? (
          leaderboardEntries.length > 0 ? (
            <LeaderboardSection entries={leaderboardEntries} />
          ) : (
            <section className="rounded-xl border border-ink-100 bg-white p-5">
              <h2 className="font-display text-lg font-semibold text-ink-900">Leaderboard</h2>
              <p className="mt-2 text-sm text-ink-600">No leaderboard data available right now.</p>
            </section>
          )
        ) : null}
      </div>
    </CorporateShellLayout>
  );
}
