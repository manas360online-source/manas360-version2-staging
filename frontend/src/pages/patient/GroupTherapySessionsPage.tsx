import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { groupTherapyApi } from '../../api/groupTherapy';
import { useAuth } from '../../context/AuthContext';

type StatusChip = 'LIVE' | 'TODAY' | 'UPCOMING' | 'FULL';

type SessionBadge = {
  text: string;
  variant: 'live' | 'today' | 'upcoming' | 'full';
};

const normalizeTopicKey = (value: string): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

const getTopicEmoji = (topic: string, title: string): string => {
  const key = `${topic} ${title}`.toLowerCase();
  if (key.includes('anxiety')) return '😰';
  if (key.includes('depression')) return '🌧️';
  if (key.includes('couple') || key.includes('relationship')) return '💞';
  if (key.includes('work') || key.includes('burnout')) return '🏢';
  if (key.includes('student') || key.includes('exam')) return '📚';
  if (key.includes('trauma') || key.includes('ptsd')) return '🕊️';
  if (key.includes('addiction') || key.includes('screen')) return '📱';
  return '👥';
};

const getTopicAccent = (topic: string, title: string): string => {
  const key = `${topic} ${title}`.toLowerCase();
  if (key.includes('anxiety')) return 'bg-blue-500';
  if (key.includes('depression')) return 'bg-amber-500';
  if (key.includes('couple') || key.includes('relationship')) return 'bg-pink-500';
  if (key.includes('work') || key.includes('burnout')) return 'bg-orange-500';
  if (key.includes('student') || key.includes('exam')) return 'bg-cyan-500';
  if (key.includes('trauma') || key.includes('ptsd')) return 'bg-violet-500';
  return 'bg-emerald-500';
};

const buildSessionBadge = (row: any, nowTs: number): SessionBadge => {
  const status = buildSessionStatus(row, nowTs);
  if (status === 'LIVE') {
    return { text: 'LIVE NOW', variant: 'live' };
  }
  if (status === 'FULL') {
    return { text: 'FULL', variant: 'full' };
  }

  const scheduledAt = new Date(String(row?.scheduledAt || ''));
  if (Number.isNaN(scheduledAt.getTime())) {
    return { text: 'UPCOMING', variant: 'upcoming' };
  }

  if (status === 'TODAY') {
    return {
      text: `TODAY ${scheduledAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
      variant: 'today',
    };
  }

  return {
    text: scheduledAt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
    variant: 'upcoming',
  };
};

const badgeClass = (badge: SessionBadge): string => {
  if (badge.variant === 'live') return 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse';
  if (badge.variant === 'today') return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
  if (badge.variant === 'full') return 'bg-slate-700/70 text-slate-300 border border-slate-600';
  return 'bg-blue-500/20 text-blue-300 border border-blue-500/40';
};

const buildSessionStatus = (row: any, nowTs?: number): StatusChip => {
  const maxMembers = Number(row?.maxMembers || 0);
  const joinedCount = Number(row?.joinedCount || 0);
  if (maxMembers > 0 && joinedCount >= maxMembers) return 'FULL';

  const scheduledAt = new Date(String(row?.scheduledAt || ''));
  if (Number.isNaN(scheduledAt.getTime())) return 'UPCOMING';

  const duration = Math.max(1, Number(row?.durationMinutes || 60));
  const now = nowTs || Date.now();
  const start = scheduledAt.getTime();
  const end = start + duration * 60 * 1000;
  if (now >= start && now <= end) return 'LIVE';

  const today = new Date();
  const sameDate =
    scheduledAt.getFullYear() === today.getFullYear()
    && scheduledAt.getMonth() === today.getMonth()
    && scheduledAt.getDate() === today.getDate();
  if (sameDate) return 'TODAY';

  return 'UPCOMING';
};

export default function GroupTherapySessionsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [publicSessions, setPublicSessions] = useState<any[]>([]);
  const [privateInvites, setPrivateInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [nowTs, setNowTs] = useState<number>(Date.now());

  const load = async () => {
    setLoading(true);
    try {
      const [sessions, invites] = await Promise.all([
        groupTherapyApi.listPublicSessions(),
        groupTherapyApi.listMyPrivateInvites(),
      ]);
      setPublicSessions(Array.isArray(sessions.items) ? sessions.items : []);
      setPrivateInvites(Array.isArray(invites.items) ? invites.items : []);
    } catch {
      setPublicSessions([]);
      setPrivateInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTs(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const topicFilters = useMemo(() => {
    const topics = Array.from(
      new Set(
        publicSessions
          .map((row) => String(row?.topic || '').trim())
          .filter(Boolean),
      ),
    );

    return topics.map((topic) => ({
      key: normalizeTopicKey(topic),
      label: topic,
    }));
  }, [publicSessions]);

  const filteredSessions = useMemo(() => {
    return publicSessions.filter((row) => {
      const status = buildSessionStatus(row, nowTs);
      const topicKey = normalizeTopicKey(String(row?.topic || ''));

      if (activeFilter === 'all') return true;
      if (activeFilter === 'live') return status === 'LIVE';
      if (activeFilter === 'today') return status === 'LIVE' || status === 'TODAY';
      return topicKey === activeFilter;
    });
  }, [activeFilter, publicSessions, nowTs]);

  const liveNowSessions = useMemo(() => publicSessions.filter((row) => buildSessionStatus(row, nowTs) === 'LIVE'), [publicSessions, nowTs]);

  const handlePublicJoin = async (sessionId: string) => {
    if (!isAuthenticated) {
      toast('Login or register to join and complete payment.');
      navigate('/auth/login?next=/group-therapy');
      return;
    }

    try {
      const result = await groupTherapyApi.createPublicJoinPaymentIntent(sessionId);
      if (!result.redirectUrl) throw new Error('Payment link not available');
      window.location.href = result.redirectUrl;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to start payment');
    }
  };

  const handleInviteAction = async (inviteId: string, action: 'accept' | 'decline') => {
    try {
      await groupTherapyApi.respondPrivateInvite(inviteId, action);
      toast.success(action === 'accept' ? 'Invite accepted. Complete payment to join.' : 'Invite declined.');
      void load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Action failed');
    }
  };

  const handlePrivatePayment = async (inviteId: string) => {
    try {
      const result = await groupTherapyApi.createPrivateInvitePaymentIntent(inviteId);
      if (!result.redirectUrl) throw new Error('Payment link not available');
      window.location.href = result.redirectUrl;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to start payment');
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading group sessions...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 [font-family:'DM_Sans',ui-sans-serif,system-ui,sans-serif]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#001a4d] via-[#012464] to-[#11439a] px-4 py-10 md:px-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-lime-200/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-cyan-200/10" />
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl [font-family:'Outfit',ui-sans-serif,system-ui,sans-serif]">Group Therapy Sessions</h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100/80 md:text-base">
            Healing in community with therapist-led groups. Live and upcoming sessions are synced from real platform data.
          </p>
          <div className="mt-6 flex flex-wrap gap-6 text-xs md:text-sm">
            <div><span className="font-bold text-lime-300">{publicSessions.length}</span> total published sessions</div>
            <div><span className="font-bold text-lime-300">{liveNowSessions.length}</span> live now</div>
            <div><span className="font-bold text-lime-300">₹299+</span> affordable group access</div>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap ${activeFilter === 'all' ? 'bg-blue-700 text-white' : 'border border-slate-700 text-slate-300'}`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('live')}
            className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap ${activeFilter === 'live' ? 'bg-red-700 text-white' : 'border border-slate-700 text-slate-300'}`}
          >
            Live Now
          </button>
          <button
            onClick={() => setActiveFilter('today')}
            className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap ${activeFilter === 'today' ? 'bg-amber-700 text-white' : 'border border-slate-700 text-slate-300'}`}
          >
            Today
          </button>
          {topicFilters.map((topic) => (
            <button
              key={topic.key}
              onClick={() => setActiveFilter(topic.key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap ${activeFilter === topic.key ? 'bg-blue-700 text-white' : 'border border-slate-700 text-slate-300'}`}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </section>

      {liveNowSessions[0] && (
        <section className="mx-auto mt-4 max-w-6xl px-4 md:px-6">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 animate-pulse">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-red-300">Running Now</p>
              <p className="mt-1 truncate text-sm font-semibold text-red-100">{liveNowSessions[0].title}</p>
              <p className="mt-1 text-xs text-slate-300">{liveNowSessions[0].hostName || 'MANAS360 Expert'} • {Number(liveNowSessions[0].joinedCount || 0)}/{Number(liveNowSessions[0].maxMembers || 0)} joined</p>
            </div>
            <button onClick={() => void handlePublicJoin(String(liveNowSessions[0].id))} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500">Join Now</button>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSessions.length === 0 && (
            <div className="col-span-full rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
              No sessions available for this filter.
            </div>
          )}

          {filteredSessions.map((row: any) => {
            const status = buildSessionStatus(row, nowTs);
            const badge = buildSessionBadge(row, nowTs);
            const joined = Number(row?.joinedCount || 0);
            const capacity = Math.max(0, Number(row?.maxMembers || 0));
            const seatsLeft = Math.max(0, capacity - joined);
            const progress = capacity > 0 ? Math.min(100, Math.round((joined / capacity) * 100)) : 0;
            const isDisabled = status === 'FULL';
            const topic = String(row?.topic || 'General');
            const title = String(row?.title || 'Group Therapy Session');
            const accent = getTopicAccent(topic, title);
            const emoji = getTopicEmoji(topic, title);

            return (
              <article key={row.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-slate-700">
                <div className={`h-1 ${accent}`} />
                <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label={topic}>{emoji}</span>
                    <div>
                      <p className="text-lg font-bold text-slate-100 [font-family:'Outfit',ui-sans-serif,system-ui,sans-serif]">{title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{topic}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${badgeClass(badge)}`}>{badge.text}</span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-slate-300">{row.description || 'Therapist-led group support session.'}</p>

                <div className="mt-3 rounded-lg bg-slate-950/70 p-3 text-xs text-slate-300">
                  <p className="font-semibold text-slate-100">{row.hostName || 'MANAS360 Expert'}</p>
                  <p className="mt-1">{row.language || 'English'} • {Number(row.durationMinutes || 60)} mins</p>
                  <p className="mt-1">{new Date(String(row.scheduledAt || '')).toLocaleString()}</p>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{joined}/{capacity} joined</span>
                    <span>{seatsLeft} seats left</span>
                  </div>
                  <div className="h-1.5 rounded bg-slate-800">
                    <div className="h-1.5 rounded bg-blue-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <button
                  onClick={() => void handlePublicJoin(String(row.id))}
                  disabled={isDisabled}
                  className={`mt-4 w-full rounded-xl px-4 py-2 text-sm font-bold ${isDisabled ? 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-blue-700 to-blue-600 text-white hover:from-blue-600 hover:to-blue-500'}`}
                >
                  {isDisabled ? 'Session Full' : `Pay & Join • ₹${Math.round(Number(row.priceMinor || 0) / 100)}`}
                </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mb-6 max-w-6xl rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-6">
        <h2 className="text-lg font-bold text-slate-100">Private Invites</h2>
        <p className="mt-1 text-sm text-slate-400">Therapist-invited private sessions require acceptance and payment.</p>

        <div className="mt-4 space-y-3">
          {privateInvites.length === 0 && (
            <div className="text-sm text-slate-400">No private invites yet.</div>
          )}
          {privateInvites.map((invite: any) => (
            <div key={invite.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="font-bold text-slate-100">{invite.session?.title || 'Private Session Invite'}</p>
              <p className="mt-1 text-xs text-slate-400">From: {invite.invitedBy?.firstName} {invite.invitedBy?.lastName}</p>
              <p className="text-xs text-slate-400">Status: {invite.status}</p>
              <p className="mt-2 text-sm font-semibold text-emerald-400">Fee: ₹{Math.round(Number(invite.amountMinor || 0) / 100)}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {invite.status === 'INVITED' && (
                  <>
                    <button onClick={() => void handleInviteAction(invite.id, 'accept')} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold">Accept</button>
                    <button onClick={() => void handleInviteAction(invite.id, 'decline')} className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold">Decline</button>
                  </>
                )}
                {(invite.status === 'PAYMENT_PENDING' || invite.status === 'ACCEPTED') && (
                  <button onClick={() => void handlePrivatePayment(invite.id)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Pay to Join</button>
                )}
                {invite.status === 'PAID' && (
                  <span className="text-xs font-semibold text-emerald-400">Payment completed. Join unlocked.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
