import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { patientApi } from '../../api/patient';

const weekPlan = [
  {
    week: 'Week 1',
    goals: ['Daily mood check-in', 'Breathing exercise (5 min)', 'Complete daily assessment'],
    status: 'In Progress',
  },
  {
    week: 'Week 2',
    goals: ['Thought reframing worksheet', 'Session reflection notes', 'CBT grounding practice'],
    status: 'Upcoming',
  },
];

export default function TherapyPlanPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [completingTaskIds, setCompletingTaskIds] = useState<string[]>([]);

  const loadPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientApi.getTherapyPlan();
      setPlanData((response as any)?.data ?? response ?? null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load therapy plan.');
      setPlanData(null);
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId: string) => {
    setError(null);
    setCompletingTaskIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));

    setPlanData((prev: any) => {
      if (!prev || !Array.isArray(prev.tasks)) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((task: any) =>
          String(task.id) === taskId
            ? {
                ...task,
                status: 'completed',
                completedAt: new Date().toISOString(),
              }
            : task,
        ),
      };
    });

    try {
      await patientApi.completeTherapyPlanTask(taskId);
      await loadPlan();
    } catch {
      setError('Unable to mark task as complete.');
      await loadPlan();
    } finally {
      setCompletingTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  useEffect(() => {
    void loadPlan();
  }, []);

  const tasks = Array.isArray(planData?.tasks) ? planData.tasks : [];
  const completedTaskCount = tasks.filter((task: any) => String(task?.status || '').toLowerCase() === 'completed').length;
  const displayedAdherence = tasks.length
    ? Number(((completedTaskCount / tasks.length) * 100).toFixed(1))
    : Number(planData?.plan?.adherencePercent ?? 0);
  const recommendationList = Array.isArray(planData?.plan?.recommendationSnapshot?.recommendations)
    ? planData.plan.recommendationSnapshot.recommendations
    : [];
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (Math.max(0, Math.min(100, displayedAdherence)) / 100) * ringCircumference;

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <section className="rounded-2xl border border-calm-sage/15 bg-white/90 p-5 shadow-soft-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55">My Therapy Plan</p>
        <h1 className="mt-1 font-serif text-3xl font-light md:text-4xl">Guided Recovery Journey</h1>
        <p className="mt-2 text-sm text-charcoal/70">
          Your assessments, sessions, and exercises are now organized into one weekly care plan.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-calm-sage/15 bg-white/85 p-4">
          <p className="text-xs text-charcoal/60">Active Plan</p>
          <p className="mt-1 text-lg font-semibold text-charcoal">{planData?.plan?.name || 'Guided Recovery Plan'}</p>
        </div>
        <div className="rounded-2xl border border-calm-sage/15 bg-white/85 p-4">
          <p className="text-xs text-charcoal/60">Current Week</p>
          <p className="mt-1 text-lg font-semibold text-charcoal">Week {planData?.plan?.weekNumber || 1} of {planData?.plan?.totalWeeks || 8}</p>
        </div>
        <div className="rounded-2xl border border-calm-sage/15 bg-white/85 p-4">
          <p className="text-xs text-charcoal/60">Adherence</p>
          <p className="mt-1 text-lg font-semibold text-charcoal">{displayedAdherence}%</p>
        </div>
      </section>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/90 p-5 shadow-soft-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55">Care Plan Progress</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-20 w-20">
            <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
              <circle cx="36" cy="36" r={ringRadius} fill="none" stroke="rgba(95, 138, 119, 0.2)" strokeWidth="8" />
              <circle
                cx="36"
                cy="36"
                r={ringRadius}
                fill="none"
                stroke="#5f8a77"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-charcoal">{Math.round(displayedAdherence)}%</div>
          </div>
          <div>
            <p className="text-sm font-semibold text-charcoal">{completedTaskCount} of {tasks.length || 0} milestones complete</p>
            <p className="text-xs text-charcoal/65">Keep momentum with one activity today.</p>
          </div>
        </div>
      </section>

      {error ? <section className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</section> : null}
      {loading ? <section className="rounded-xl border border-calm-sage/15 bg-white/90 p-3 text-sm text-charcoal/70">Loading treatment plan...</section> : null}

      {recommendationList.length > 0 ? (
        <section className="rounded-2xl border border-calm-sage/15 bg-white/90 p-5 shadow-soft-sm">
          <h2 className="text-base font-semibold text-charcoal">Latest Recommendations</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-charcoal/75">
            {recommendationList.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-calm-sage/15 bg-white/90 p-5 shadow-soft-sm">
        <h2 className="text-base font-semibold text-charcoal">Weekly Milestones</h2>
        <div className="mt-4 space-y-3">
          {tasks.length > 0
            ? tasks.map((task: any) => {
                const done = String(task.status || '').toLowerCase() === 'completed';
                const isCompleting = completingTaskIds.includes(String(task.id));
                return (
                  <div key={task.id} className="rounded-xl border border-calm-sage/15 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-charcoal">{task.title}</p>
                      <span className="rounded-full bg-calm-sage/15 px-2 py-0.5 text-[11px] font-semibold text-calm-sage">
                        {String(task.status || 'pending').toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-charcoal/60">Type: {task.type}</p>
                    {!done ? (
                      <button
                        type="button"
                        onClick={() => void completeTask(task.id)}
                        disabled={isCompleting}
                        className="mt-2 inline-flex min-h-[34px] items-center rounded-full border border-calm-sage/25 px-3 text-xs"
                      >
                        {isCompleting ? 'Completing...' : 'Mark Complete'}
                      </button>
                    ) : null}
                  </div>
                );
              })
            : weekPlan.map((item) => (
                <div key={item.week} className="rounded-xl border border-calm-sage/15 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-charcoal">{item.week}</p>
                    <span className="rounded-full bg-calm-sage/15 px-2 py-0.5 text-[11px] font-semibold text-calm-sage">{item.status}</span>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-charcoal/75">
                    {item.goals.map((goal) => (
                      <li key={goal}>{goal}</li>
                    ))}
                  </ul>
                </div>
              ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/patient/exercises" className="inline-flex min-h-[36px] items-center rounded-full border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/80">
            Open Assigned Exercises
          </Link>
          <Link to="/patient/sessions" className="inline-flex min-h-[36px] items-center rounded-full border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/80">
            View Session Schedule
          </Link>
        </div>
      </section>
    </div>
  );
}
