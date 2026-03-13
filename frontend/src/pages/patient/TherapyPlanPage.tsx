
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientApi } from '../../api/patient';
import { CheckCircle2, PlayCircle, StickyNote, Activity, FileText, Calendar, UserPlus } from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  frequency: 'DAILY_RITUAL' | 'WEEKLY_MILESTONE' | 'ONE_TIME';
  activityType: 'MOOD_CHECKIN' | 'EXERCISE' | 'AUDIO_THERAPY' | 'CLINICAL_ASSESSMENT' | 'READING_MATERIAL' | 'SESSION_BOOKING';
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  completedAt?: string;
  estimatedMinutes?: number;
}

export default function TherapyPlanPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionRequired, setConnectionRequired] = useState(false);
  const [planData, setPlanData] = useState<any>(null);
  const [completingTaskIds, setCompletingTaskIds] = useState<string[]>([]);

  const loadPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientApi.getTherapyPlan();
      setPlanData((response as any)?.data ?? response ?? null);
      setConnectionRequired(false);
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      const message = String(err?.response?.data?.message || err?.message || '');
      const requiresProvider = status === 404 && message.toLowerCase().includes('connected with a provider');
      setConnectionRequired(requiresProvider);
      setError(requiresProvider ? null : (message || 'Unable to load your Guided Recovery Journey.'));
      setPlanData(null);
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId: string) => {
    setError(null);
    setCompletingTaskIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));

    setPlanData((prev: any) => {
      if (!prev || !Array.isArray(prev.activities)) return prev;
      return {
        ...prev,
        activities: prev.activities.map((task: any) =>
          String(task.id) === taskId
            ? { ...task, status: 'COMPLETED', completedAt: new Date().toISOString() }
            : task,
        ),
      };
    });

    try {
      await patientApi.completeTherapyPlanTask(taskId);
      await loadPlan(); // Re-sync to get official adherence percentage
    } catch {
      setError('Unable to mark activity as complete.');
      await loadPlan();
    } finally {
      setCompletingTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  useEffect(() => {
    void loadPlan();
  }, []);

  const activities: ActivityItem[] = Array.isArray(planData?.activities) ? planData.activities : [];
  const plan = planData?.plan;
  const hasPlan = Boolean(plan && Array.isArray(planData?.activities));

  // Auto-complete MOOD_CHECKIN tasks when daily check-in is submitted from Dashboard
  useEffect(() => {
    const handler = async () => {
      const checkinTasks = activities
        .filter((a) => a.activityType === 'MOOD_CHECKIN' && a.status !== 'COMPLETED')
        .map((a) => a.id);
      if (checkinTasks.length === 0) return;
      // Optimistic update
      setPlanData((prev: any) => {
        if (!prev || !Array.isArray(prev.activities)) return prev;
        return {
          ...prev,
          activities: prev.activities.map((task: any) =>
            task.activityType === 'MOOD_CHECKIN'
              ? { ...task, status: 'COMPLETED', completedAt: new Date().toISOString() }
              : task,
          ),
        };
      });
      try {
        await Promise.all(checkinTasks.map((id) => patientApi.completeTherapyPlanTask(id)));
        await loadPlan();
      } catch {/* silently re-sync */
        await loadPlan();
      }
    };
    window.addEventListener('check-in-complete', handler as EventListener);
    return () => window.removeEventListener('check-in-complete', handler as EventListener);
  }, [activities]);

  // Audio completion loop: mark AUDIO_THERAPY tasks done when SoundTherapyPage finishes a track
  useEffect(() => {
    const handler = async () => {
      const audioTasks = activities
        .filter((a) => a.activityType === 'AUDIO_THERAPY' && a.status !== 'COMPLETED')
        .map((a) => a.id);
      if (audioTasks.length === 0) return;
      setPlanData((prev: any) => {
        if (!prev || !Array.isArray(prev.activities)) return prev;
        return {
          ...prev,
          activities: prev.activities.map((task: any) =>
            task.activityType === 'AUDIO_THERAPY'
              ? { ...task, status: 'COMPLETED', completedAt: new Date().toISOString() }
              : task,
          ),
        };
      });
      try {
        await Promise.all(audioTasks.map((id) => patientApi.completeTherapyPlanTask(id)));
        await loadPlan();
      } catch {
        await loadPlan();
      }
    };
    window.addEventListener('audio-complete', handler as EventListener);
    return () => window.removeEventListener('audio-complete', handler as EventListener);
  }, [activities]);

  const dailyRituals = activities.filter((a) => a.frequency === 'DAILY_RITUAL');
  const weeklyMilestones = activities.filter((a) => a.frequency === 'WEEKLY_MILESTONE');
  const totalWeeks = Math.max(Number(plan?.totalWeeks || plan?.durationWeeks || 8), Number(plan?.weekNumber || 1), 4);
  const weeks = Array.from({ length: totalWeeks }, (_, index) => index + 1);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'AUDIO_THERAPY': return <PlayCircle className="h-5 w-5 text-calm-sage" />;
      case 'CLINICAL_ASSESSMENT': return <Activity className="h-5 w-5 text-calm-sage" />;
      case 'READING_MATERIAL': return <FileText className="h-5 w-5 text-calm-sage" />;
      case 'SESSION_BOOKING': return <Calendar className="h-5 w-5 text-calm-sage" />;
      default: return <CheckCircle2 className="h-5 w-5 text-calm-sage" />;
    }
  };

  const renderActivityCard = (task: ActivityItem) => {
    const isDone = task.status === 'COMPLETED';
    const isCompleting = completingTaskIds.includes(task.id);

    return (
      <div 
        key={task.id} 
        className={`group flex items-center justify-between rounded-[1.5rem] p-4 transition-all duration-300 ${isDone ? 'bg-white/65 shadow-wellness-sm' : 'bg-white/92 shadow-wellness-sm hover:shadow-wellness-md'}`}
      >
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${isDone ? 'bg-wellness-aqua' : 'bg-wellness-card'}`}>
            {getActivityIcon(task.activityType)}
          </div>
          <div>
            <p className={`font-medium transition-all ${isDone ? 'text-charcoal/40 line-through' : 'text-charcoal'}`}>
              {task.title}
            </p>
            {task.estimatedMinutes ? (
              <p className={`mt-0.5 text-xs ${isDone ? 'text-charcoal/30' : 'text-charcoal/60'}`}>
                {task.estimatedMinutes} mins
              </p>
            ) : null}
          </div>
        </div>

        <div>
          {!isDone ? (
            <button
              type="button"
              onClick={() => void completeTask(task.id)}
              disabled={isCompleting}
              className="inline-flex h-10 items-center justify-center rounded-full bg-wellness-aqua px-4 text-xs font-semibold text-charcoal transition-all hover:bg-wellness-sky hover:text-white disabled:opacity-50"
            >
              {isCompleting ? 'Completing...' : 'Mark Done'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-wellness-aqua px-3 py-1 text-xs font-semibold text-charcoal/80">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Done
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-sm font-medium text-charcoal/60">Loading your journey...</div>
      </div>
    );
  }

  if (!hasPlan && connectionRequired) {
    return (
      <div className="mx-auto max-w-3xl pb-20 pt-6 lg:pb-8">
        <div className="wellness-panel p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-wellness-mist text-wellness-sky">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-charcoal">Therapy Plan Unlocks After Provider Connection</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-charcoal/70">
            Your therapy plan is created only after you connect with a provider. Book or request a provider first, then your provider will create and manage your plan here.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/patient/sessions"
              className="wellness-primary-btn inline-flex items-center justify-center px-5 py-2.5 text-sm"
            >
              Connect With A Provider
            </Link>
            <Link
              to="/patient/provider-messages"
              className="wellness-secondary-btn inline-flex items-center justify-center px-5 py-2.5 text-sm"
            >
              Open Provider Messages
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-20 lg:pb-8">
      
      {/* 1. Journey Header */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-wellness-hero p-8 shadow-wellness-md">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/50">
            Guided Recovery Pathway
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-charcoal md:text-4xl">
            {plan?.title || 'Therapy Plan'}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-charcoal/70">
            Provider-guided activities and milestones for your recovery progress.
          </p>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between text-sm font-medium">
              <span className="text-charcoal/80">Recovery Roadmap</span>
              <span className="text-wellness-sky">Week {plan?.weekNumber || 1} of {totalWeeks}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {weeks.map((week) => {
                const completed = week < Number(plan?.weekNumber || 1);
                const current = week === Number(plan?.weekNumber || 1);
                return (
                  <div key={week} className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition ${completed ? 'bg-[#dff0ea] text-charcoal' : current ? 'bg-[#1E90FF] text-white shadow-wellness-sm' : 'bg-white/82 text-charcoal/55'}`}>
                      {completed ? <CheckCircle2 className="h-4 w-4" /> : week}
                    </div>
                    {week < weeks.length ? <div className={`h-1.5 w-10 rounded-full ${completed ? 'bg-[#bfded3]' : 'bg-white/75'}`} /> : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded-full bg-white/76 px-4 py-3 text-sm text-charcoal/72 shadow-wellness-sm">
              <span className="font-semibold text-charcoal">Weekly momentum:</span> {plan?.adherencePercent || 0}% complete
            </div>
          </div>
        </div>
        
        {/* Decorative background element */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-wellness-aqua blur-3xl" />
      </section>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* 2. Provider Note (Sticky Note UI) */}
      {plan?.providerNote && (
        <section className="relative overflow-hidden rounded-[1.75rem] bg-[#fff9ee] p-6 shadow-wellness-sm">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-[#8ec9be]" />
          <div className="pl-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/55"><StickyNote className="h-4 w-4 text-[#8ec9be]" /> Note from your provider</p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal/78">
            {plan.providerNote}
          </p>
          </div>
        </section>
      )}

      {/* 3. Action Items */}
      <div className="grid gap-8 lg:grid-cols-2">
        
        {/* Daily Rituals */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-charcoal">Daily Rituals</h2>
            <span className="flex h-5 items-center rounded-full bg-calm-sage/15 px-2 text-[10px] font-bold uppercase tracking-wider text-calm-sage">
              Habit Builder
            </span>
          </div>
          {dailyRituals.length > 0 ? (
            <div className="space-y-3">
              {dailyRituals.map(renderActivityCard)}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-wellness-border p-8 text-center">
              <p className="text-sm text-charcoal/50">No daily rituals assigned for this week.</p>
            </div>
          )}
        </section>

        {/* Weekly Milestones */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-charcoal">Weekly Milestones</h2>
            <span className="flex h-5 items-center rounded-full bg-blue-500/10 px-2 text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Deep Work
            </span>
          </div>
          {weeklyMilestones.length > 0 ? (
            <div className="space-y-3">
              {weeklyMilestones.map(renderActivityCard)}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-wellness-border p-8 text-center">
              <p className="text-sm text-charcoal/50">No weekly milestones assigned for this week.</p>
            </div>
          )}
        </section>

      </div>

    </div>
  );
}
