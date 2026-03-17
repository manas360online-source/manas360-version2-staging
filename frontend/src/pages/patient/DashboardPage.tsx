import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  CalendarDays, 
  MessageSquare, 
  ArrowRight, 
  Check, 
  Sparkles,
  Search,
  CheckCircle2,
  Bell,
  Activity,
  SunMedium,
  CloudSun,
  MoonStar
} from 'lucide-react';
import { isOnboardingRequiredError, patientApi } from '../../api/patient';
import type { ActiveCbtAssignment } from '../../api/patient';
import { DashboardSkeletons } from '../../components/ui/Skeleton';
import DashboardCard from '../../components/ui/DashboardCard';
import { useTherapyData } from '../../hooks/useTherapyData';

const moodEmojiMap: Record<number, string> = {
  1: '😢',
  2: '😔',
  3: '😐',
  4: '🙂',
  5: '😊',
};

const formatDateTime = (value?: string | Date) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
};

const localDateKey = (value: Date = new Date()) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameLocalDay = (value: unknown, dayKey: string) => {
  if (!value) return false;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return false;
  return localDateKey(date) === dayKey;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [moodValue, setMoodValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAssignments, setActiveAssignments] = useState<ActiveCbtAssignment[]>([]);

  // Use shared therapy data hook for streak synchronization
  const { streak } = useTherapyData();

  const fetchDashboardData = async () => {
    const dashboardRes = await patientApi.getDashboardV2();
    const dashboardData = dashboardRes?.data ?? dashboardRes;

    setDashboard(dashboardData || null);

    const todayStr = localDateKey();
    const todaysMood = dashboardData?.moodTrend?.find((m: any) => isSameLocalDay(m.date, todayStr));
    if (todaysMood) {
      setMoodValue(todaysMood.score);
    }

    try {
      const assignments = await patientApi.getActiveCbtAssignments();
      setActiveAssignments(Array.isArray(assignments) ? assignments : []);
    } catch (err) {
      console.warn('Failed to load CBT assignments:', err);
      setActiveAssignments([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await fetchDashboardData();
      } catch (err: any) {
        if (isOnboardingRequiredError(err)) {
          navigate('/patient/onboarding?next=/patient/sessions', { replace: true });
          return;
        }
        setError(err?.response?.data?.message || err?.message || 'Unable to load dashboard right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const userName = dashboard?.user?.name?.split(' ')[0] || 'there';
  const upcomingSession = dashboard?.upcomingSession || null;
  const moodTrend = Array.isArray(dashboard?.moodTrend) ? dashboard.moodTrend : [];
  const recentActivity = Array.isArray(dashboard?.recentActivity) ? dashboard.recentActivity : [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const welcomeMessage = `${greeting}, ${userName}. Take a deep breath, you're doing great.`;
  const TimeIcon = hour < 12 ? SunMedium : hour < 18 ? CloudSun : MoonStar;

  const normalizedMoodTrend = useMemo(() => {
    if (!moodTrend.length) return Array.from({length: 7}, (_, i) => ({ day: String(i), score: 3 }));
    return moodTrend.slice(-7).map((item: any) => ({
      day: new Date(item.date).toLocaleDateString(undefined, { weekday: 'short' }),
      score: Number(item.score || 0),
    }));
  }, [moodTrend]);

  const avgMood = useMemo(() => {
    const total = normalizedMoodTrend.reduce((sum: number, point: any) => sum + Number(point.score || 0), 0);
    return Number((total / normalizedMoodTrend.length).toFixed(1)) || 0;
  }, [normalizedMoodTrend]);
  const quickPrompts = avgMood <= 3
    ? ['I feel anxious today', 'Help me ground quickly']
    : ['Reflect on today', 'Help me protect this momentum'];

  if (loading) return <DashboardSkeletons />;
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error}</div>;

  const moodChecked = Boolean(moodValue);
  const actionPlanTasksRemaining = activeAssignments.length + (moodChecked ? 0 : 1);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-20 lg:pb-6">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-wellness-hero p-6 shadow-wellness-md sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(133,167,154,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(30,144,255,0.12),transparent_36%)]" />
        <div className="absolute -right-12 -top-10 h-40 w-40 rounded-full bg-white/55 blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-charcoal/55 shadow-wellness-sm">
              <TimeIcon className="h-4 w-4 text-wellness-sky" />
              Daily Pulse
            </div>
            <h1 className="mt-4 max-w-2xl font-serif text-4xl font-semibold tracking-tight text-wellness-deep sm:text-5xl">{welcomeMessage}</h1>
            <p className="mt-3 text-base text-charcoal/68 sm:text-lg">How are you feeling right now?</p>
            
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => navigate(`/patient/daily-checkin?initialMood=${value * 2}`)}
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-[1.35rem] text-[1.8rem] transition-all duration-300 sm:h-16 sm:w-16 sm:text-[2rem] ${
                    moodValue === value 
                      ? 'bg-wellness-aqua ring-2 ring-wellness-sky/30 shadow-wellness-sm' 
                      : 'bg-white/88 shadow-wellness-sm hover:bg-white'
                  }`}
                >
                  <span>{moodEmojiMap[value]}</span>
                </button>
              ))}
              
            </div>
            <p className="mt-4 text-sm text-charcoal/55">Tap once to open the full Daily Check-in flow.</p>
          </div>
          
          <div className="hidden md:block">
            <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-white/72 shadow-wellness-md">
              <div className="absolute inset-4 rounded-full bg-[linear-gradient(135deg,rgba(224,244,242,0.95),rgba(237,246,255,0.95))]" />
              <TimeIcon className="relative h-20 w-20 text-wellness-sky stroke-[1.5]" />
              <Sparkles className="absolute right-9 top-10 h-6 w-6 text-[#7fb6e8]" />
            </div>
          </div>
        </div>
      </section>

      {/* MID ROW: Up Next & Action Plan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* 2. UP NEXT CARD (Therapy & Appointments) */}
        <DashboardCard as="section" className="flex flex-col transition-shadow hover:shadow-wellness-md">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-calm-sage" />
            <h2 className="text-lg font-semibold text-charcoal">Up Next</h2>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            {upcomingSession ? (
              <div className="rounded-[1.75rem] bg-white/84 p-5 shadow-wellness-sm">
                <p className="text-sm font-medium text-calm-sage uppercase tracking-wide">Upcoming Session</p>
                <h3 className="mt-1 text-xl font-semibold text-charcoal">{upcomingSession.provider?.name || 'Dr. Sharma'}</h3>
                <p className="mt-1 text-ink-600">{formatDateTime(upcomingSession.scheduledAt)}</p>
                
                <div className="mt-5 flex gap-3">
                  <button disabled className="inline-flex flex-1 items-center justify-center rounded-full bg-charcoal/40 px-4 py-2.5 text-sm font-semibold text-white cursor-not-allowed">
                    Join Video
                  </button>
                  <Link to="/patient/sessions" className="wellness-secondary-btn min-h-[42px] px-4 py-2.5">
                    Manage
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-calm-sage/10">
                  <Search className="h-6 w-6 text-calm-sage" />
                </div>
                <h3 className="text-lg font-semibold text-charcoal">Ready for your next step?</h3>
                <p className="mt-2 text-sm text-ink-500 max-w-xs mx-auto">Book a session with a therapist or coach when you feel ready to talk.</p>
                <Link to="/patient/sessions" className="wellness-primary-btn mt-5 gap-2 px-5 py-2.5">
                  Find a provider <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* 3. TODAY'S ACTION PLAN (Homework & Milestones) */}
        <DashboardCard as="section" className="flex flex-col transition-shadow hover:shadow-wellness-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-calm-sage" />
              <h2 className="text-lg font-semibold text-charcoal">Your Action Plan</h2>
            </div>
            <span className="text-sm font-medium text-ink-400">
              {actionPlanTasksRemaining} tasks remaining
            </span>
          </div>

          <div className="flex-1 space-y-3">
            <Link to="/patient/check-in?tab=daily-mood" className={`group flex items-center justify-between rounded-[1.4rem] p-4 transition-all ${moodChecked ? 'bg-wellness-aqua shadow-wellness-sm' : 'bg-white/90 shadow-wellness-sm hover:bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full ${moodChecked ? 'bg-wellness-sky text-white' : 'border-2 border-wellness-border group-hover:border-wellness-sky/40'}`}>
                  {moodChecked && <Check className="h-3.5 w-3.5" />}
                </div>
                <span className={`font-medium ${moodChecked ? 'text-ink-400 line-through' : 'text-charcoal'}`}>Daily Check-in</span>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-300 group-hover:text-charcoal transition-colors" />
            </Link>

            {activeAssignments.length > 0 ? (
               activeAssignments.slice(0, 3).map((assignment) => (
                <Link
                  key={assignment.id}
                  to={`/patient/cbt-assignment/${assignment.id}`}
                  className="group flex items-center justify-between rounded-[1.4rem] bg-white/90 p-4 shadow-wellness-sm transition-all hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-wellness-border group-hover:border-wellness-sky/35" />
                    <div>
                      <p className="font-medium text-charcoal">{assignment.title}</p>
                      <p className="text-xs text-ink-500">Interactive CBT Task • Start Practice</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-calm-sage">
                    Start Practice <ArrowRight className="h-4 w-4 text-calm-sage transition-colors" />
                  </span>
                </Link>
               ))
            ) : (
              <div className="rounded-[1.4rem] bg-white/90 p-4 shadow-wellness-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-wellness-border" />
                  <span className="font-medium text-charcoal">No interactive tasks assigned yet</span>
                </div>
              </div>
            )}
          </div>
        </DashboardCard>

      </div>

      {/* BOTTOM ROW: Progress & AI Nudge */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-3">
        
        {/* 4. AI NUDGE (Proactive Engagement) */}
        <DashboardCard as="section" className="md:col-span-1 flex flex-col transition-shadow hover:shadow-wellness-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warm-terracotta/20">
              <Sparkles className="h-5 w-5 text-warm-terracotta" />
            </div>
            <h2 className="text-lg font-semibold text-charcoal">Anytime Buddy</h2>
          </div>
          
          <div className="flex-1 relative">
             <div className="wellness-bubble rounded-tl-[0.6rem] text-charcoal/76">
               {avgMood <= 3 ? (
                 <>Hi {userName}! I noticed your mood score was a bit lower recently. I found a quick 3-minute grounding exercise for you to help reset. Want to try it together?</>
               ) : (
                 <>Hi {userName}! Your streak is looking great. Would you like to do a quick reflection exercise to capture this positive momentum?</>
               )}
             </div>
             <div className="mt-4 flex flex-wrap gap-2">
               {quickPrompts.map((prompt) => (
                 <Link
                   key={prompt}
                   to="/patient/messages"
                   className="rounded-full bg-wellness-aqua px-3.5 py-2 text-xs font-semibold text-charcoal/80 transition hover:bg-wellness-sky hover:text-white"
                 >
                   {prompt}
                 </Link>
               ))}
             </div>
          </div>
          
          <Link to="/patient/messages" className="wellness-secondary-btn mt-5 w-full gap-2 px-4 py-2.5">
            Chat with Anytime Buddy <MessageSquare className="h-4 w-4" />
          </Link>
        </DashboardCard>

        {/* 5. PROGRESS SNAPSHOT (Metrics & Chart) */}
        <DashboardCard as="section" className="md:col-span-2 grid grid-cols-1 transition-shadow hover:shadow-wellness-md sm:grid-cols-2">
          <div className="flex flex-col border-b border-white/70 pb-4 sm:border-b-0 sm:border-r sm:border-r-white/70 sm:pb-0 sm:pr-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-calm-sage" />
              <h2 className="text-lg font-semibold text-charcoal">Progress Snapshot</h2>
            </div>
            
            <div className="flex items-center gap-8 mt-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal/50 font-semibold mb-1">Streak</p>
                <p className="text-3xl font-display font-bold text-charcoal flex items-center gap-2">
                  <span className="text-warm-terracotta">🔥</span> {streak}
                </p>
                <p className="text-xs text-ink-400 mt-1">Days active</p>
              </div>
              
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal/50 font-semibold mb-1">Wellness</p>
                <p className="text-3xl font-display font-bold text-calm-sage">
                  {dashboard?.wellnessScore || 65}
                </p>
                <p className="text-xs text-ink-400 mt-1">Out of 100</p>
              </div>
            </div>
            
            <Link to="/patient/progress" className="mt-auto pt-6 text-sm font-semibold text-calm-sage hover:text-sage-700 inline-flex items-center gap-1">
              View detailed analytics <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="pt-4 sm:pt-0 sm:pl-6 flex flex-col h-full min-h-[160px]">
            <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50 mb-3">7-Day Mood Trend</p>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={normalizedMoodTrend} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A8B5A0" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#A8B5A0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, borderColor: 'rgba(168,181,160,0.15)', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    formatter={(value: number) => [`${moodEmojiMap[value] || ''} (${value}/5)`, 'Mood']}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#1E90FF" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    dot={{ r: 4, fill: '#ffffff', stroke: '#1E90FF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DashboardCard>
        
      </div>

      {/* 6. QUICK ALERTS & NOTIFICATIONS */}
      {recentActivity.length > 0 && (
        <DashboardCard as="section" className="flex items-center gap-4 p-5 transition-colors hover:shadow-wellness-md">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
             <Bell className="h-5 w-5 text-amber-600" />
             <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-sm font-semibold text-charcoal truncate">You have {Math.min(recentActivity.length, 3)} new updates</p>
             <p className="text-xs text-ink-500 truncate mt-0.5">Clinical reports are ready for review. Check your messages for details.</p>
          </div>
          <Link to="/patient/reports" className="wellness-primary-btn shrink-0 min-h-[38px] px-4 py-2 text-xs">
            View Updates
          </Link>
        </DashboardCard>
      )}

    </div>
  );
}
