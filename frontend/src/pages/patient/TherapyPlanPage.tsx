
import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '../../api/patient';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, ClipboardCheck, UserPlus, Quote } from 'lucide-react';

type GoalItem = {
  id: string;
  title: string;
  category: string;
  todayCheckInDone: boolean;
  startDate: string;
  weekNumber?: number;
};

type ExerciseItem = {
  id: string;
  sessionId?: string;
  type: string;
  title: string;
  status: 'New' | 'In Progress' | 'Completed';
  completed: boolean;
  assignedAt: string;
  completedAt: string | null;
  weekNumber?: number;
  therapistFeedback?: string;
};

type FeedbackItem = {
  id: string;
  feedback: string;
  providerName: string;
  providerInitials: string;
  source: 'session-note' | 'cbt-review';
  createdAt: string;
};

type TherapyPlanPayload = {
  dailyTasks: Array<Record<string, unknown>>;
  goals: GoalItem[];
  cbtExercises: ExerciseItem[];
  recentFeedback: FeedbackItem[];
  weekContext?: {
    selectedWeek: number;
    currentWeek: number;
    totalWeeks: number;
  };
};

const asPayload = <T,>(value: any): T => (value?.data ?? value) as T;

const getWeekFromDate = (dateLike: string | Date | null | undefined): number | null => {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  const millisPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = Math.max(0, Date.now() - date.getTime());
  return Math.floor(diff / millisPerWeek) + 1;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date(value));

const categoryClass = (category: string) => {
  if (category === 'Sleep') return 'bg-[#E8F2FF] text-[#2B5EA7]';
  if (category === 'Mindfulness') return 'bg-[#E9F7F1] text-[#2F7A5F]';
  if (category === 'Nutrition') return 'bg-[#FFF4E5] text-[#A56A1F]';
  return 'bg-[#F2F5F7] text-[#51606B]';
};

const exerciseStatusClass = (status: ExerciseItem['status']) => {
  if (status === 'Completed') return 'bg-[#E9F7F1] text-[#2F7A5F]';
  if (status === 'In Progress') return 'bg-[#FFF4E5] text-[#A56A1F]';
  return 'bg-[#E8F2FF] text-[#2B5EA7]';
};

export default function TherapyPlanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [completingTaskIds, setCompletingTaskIds] = useState<string[]>([]);

  const profileQuery = useQuery(['patient-profile-for-week'], async () => {
    const response = await patientApi.getMyProfile();
    return asPayload<{ createdAt?: string } | null>(response);
  }, {
    retry: false,
  });

  const weekFromProfile = getWeekFromDate(profileQuery.data?.createdAt);
  const weekFromSignup = getWeekFromDate((user as any)?.createdAt);
  const derivedCurrentWeek = Math.max(1, Number(weekFromProfile || weekFromSignup || 1));

  const therapyPlanQuery = useQuery(['patient-therapy-plan', derivedCurrentWeek], async () => {
    const response = await patientApi.getTherapyPlan(derivedCurrentWeek);
    return asPayload<TherapyPlanPayload | null>(response);
  }, {
    retry: false,
    enabled: derivedCurrentWeek > 0,
  });

  const planData = therapyPlanQuery.data ?? null;
  const queryError = therapyPlanQuery.error as any;
  const queryStatus = Number(queryError?.response?.status || 0);
  const queryMessage = String(queryError?.response?.data?.message || queryError?.message || '');
  const connectionRequired = queryStatus === 404 && queryMessage.toLowerCase().includes('connected with a provider');
  const error = actionError || (connectionRequired ? null : (queryMessage || null));
  const loading = therapyPlanQuery.isLoading || (therapyPlanQuery.isFetching && !therapyPlanQuery.data);

  const completeTask = async (taskId: string) => {
    setActionError(null);
    setCompletingTaskIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));

    try {
      await patientApi.completeTherapyPlanTask(taskId);
      toast.success('Great job staying consistent! 🔥');
      await therapyPlanQuery.refetch();
    } catch {
      setActionError('Unable to mark activity as complete.');
      await therapyPlanQuery.refetch();
    } finally {
      setCompletingTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const activeWeek = Number(planData?.weekContext?.selectedWeek || derivedCurrentWeek || planData?.weekContext?.currentWeek || 1);
  const currentWeek = Number(planData?.weekContext?.currentWeek || derivedCurrentWeek || activeWeek);
  const totalWeeks = Number(planData?.weekContext?.totalWeeks || currentWeek);
  const nextWeek = currentWeek + 1;
  const goals = useMemo(
    () => (Array.isArray(planData?.goals) ? planData.goals.filter((goal) => Number(goal.weekNumber || activeWeek) === activeWeek) : []),
    [planData, activeWeek],
  );
  const exercises = useMemo(
    () => (Array.isArray(planData?.cbtExercises)
      ? planData.cbtExercises.filter((exercise) => Number(exercise.weekNumber || activeWeek) === activeWeek)
      : []),
    [planData, activeWeek],
  );
  const recentFeedback = useMemo(() => (Array.isArray(planData?.recentFeedback) ? planData.recentFeedback : []), [planData]);
  const featuredFeedback = recentFeedback[0] ?? null;
  const hasPlan = goals.length > 0 || exercises.length > 0;
  const totalWeeklyTasks = goals.length + exercises.length;
  const completedWeeklyTasks = goals.filter((goal) => goal.todayCheckInDone).length + exercises.filter((exercise) => exercise.completed).length;
  const weeklyProgressPercent = totalWeeklyTasks > 0 ? Math.round((completedWeeklyTasks / totalWeeklyTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-20 lg:pb-8">
        <div className="h-40 animate-pulse rounded-[2rem] bg-[#EEF6F3]" />
        <div className="h-32 animate-pulse rounded-[1.75rem] bg-white/80 shadow-wellness-sm" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-[1.75rem] bg-white/80 shadow-wellness-sm" />
          <div className="h-64 animate-pulse rounded-[1.75rem] bg-white/80 shadow-wellness-sm" />
        </div>
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
    <div className="mx-auto max-w-5xl space-y-8 pb-20 lg:pb-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#EFF9F5_0%,#F4FBFF_100%)] p-8 shadow-wellness-md">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/50">
            My Plan
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-charcoal md:text-4xl">
            Calm progress, one task at a time
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-charcoal/70">
            Your daily goals and therapist-assigned exercises are organized here so you can check in and keep momentum without friction.
          </p>
          <p className="mt-4 inline-flex rounded-full bg-white/75 px-4 py-2 text-sm font-semibold text-charcoal/80">
            You are in Week {activeWeek} of your journey{totalWeeks > 0 ? ` (${Math.min(activeWeek, totalWeeks)}/${totalWeeks})` : ''}
          </p>

          <div className="mt-5 rounded-2xl bg-white/80 p-4 shadow-wellness-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-charcoal">{completedWeeklyTasks} of {totalWeeklyTasks} tasks completed this week</p>
              <span className="text-xs font-bold text-charcoal/55">{weeklyProgressPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E5ECE9]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#79C7A2_0%,#5DAE8B_100%)] transition-all duration-500"
                style={{ width: `${weeklyProgressPercent}%` }}
              />
            </div>
          </div>

          <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#E4EAF4] bg-white/75 p-4">
            <div className="absolute inset-0 bg-white/35 backdrop-blur-[2px]" />
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-charcoal/45">Next Week Preview</p>
              <p className="mt-1 text-sm font-semibold text-charcoal/80">Week {nextWeek} is being prepared by your provider</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.4rem] bg-white/78 p-4 shadow-wellness-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/45">Daily Goals</p>
              <p className="mt-2 text-2xl font-semibold text-charcoal">{goals.length}</p>
            </div>
            <div className="rounded-[1.4rem] bg-white/78 p-4 shadow-wellness-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/45">Assigned Exercises</p>
              <p className="mt-2 text-2xl font-semibold text-charcoal">{exercises.length}</p>
            </div>
            <div className="rounded-[1.4rem] bg-white/78 p-4 shadow-wellness-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/45">Completed Today</p>
              <p className="mt-2 text-2xl font-semibold text-charcoal">
                {goals.filter((goal) => goal.todayCheckInDone).length + exercises.filter((exercise) => exercise.completed).length}
              </p>
            </div>
          </div>
        </div>

        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#DDF3EC] blur-3xl" />
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {!hasPlan && !connectionRequired ? (
        <div className="rounded-[1.6rem] border border-dashed border-wellness-border bg-white/70 p-6 text-center">
          <p className="text-sm font-medium text-charcoal/70">Your provider is currently preparing your next steps. Check back soon! ✨</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <section className="space-y-4 md:w-1/2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-charcoal">Daily Goals</h2>
            <span className="flex h-5 items-center rounded-full bg-[#E7F6F0] px-2 text-[10px] font-bold uppercase tracking-wider text-[#2F7A5F]">
              Check In
            </span>
          </div>
          {goals.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {goals.map((goal) => {
                const isCompleting = completingTaskIds.includes(goal.id);
                return (
                  <div key={goal.id} className="min-w-[260px] rounded-[1.6rem] bg-white/92 p-5 shadow-wellness-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${categoryClass(goal.category)}`}>
                          {goal.category}
                        </span>
                        <h3 className="mt-3 text-base font-semibold text-charcoal">{goal.title}</h3>
                      </div>
                      <Sparkles className="h-5 w-5 text-[#77BFA3]" />
                    </div>
                    <p className="mt-3 text-xs text-charcoal/55">Started {formatDate(goal.startDate)}</p>
                    <button
                      type="button"
                      onClick={() => void completeTask(goal.id)}
                      disabled={goal.todayCheckInDone || isCompleting}
                      className="mt-5 inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-[#D8F0E7] px-5 text-base font-semibold text-charcoal transition hover:bg-[#BFE4D6] disabled:cursor-not-allowed disabled:bg-[#EEF4F1] disabled:text-charcoal/40 md:min-h-[42px] md:px-4 md:text-sm"
                    >
                      {goal.todayCheckInDone ? 'Checked In' : isCompleting ? 'Saving...' : 'Check In'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-wellness-border p-8 text-center">
              <p className="text-sm text-charcoal/50">No daily goals assigned right now.</p>
            </div>
          )}
        </section>

        <section className="space-y-4 md:w-1/2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-charcoal">Assigned Exercises</h2>
            <span className="flex h-5 items-center rounded-full bg-[#E8F2FF] px-2 text-[10px] font-bold uppercase tracking-wider text-[#2B5EA7]">
              CBT
            </span>
          </div>
          <div className="rounded-[1.6rem] border border-blue-100 bg-blue-50 p-5 shadow-wellness-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#2B5EA7] shadow-sm">
                {featuredFeedback?.providerInitials || 'CT'}
              </div>
              <div className="min-w-0 flex-1 break-words">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2B5EA7]">
                  <Quote className="h-4 w-4" />
                  Insights from your Care Team
                </div>
                {featuredFeedback ? (
                  <>
                    <p className="mt-3 text-sm font-semibold text-charcoal md:text-base">
                      {featuredFeedback.providerName} says:
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-charcoal/80 md:text-base">
                      &ldquo;{featuredFeedback.feedback}&rdquo;
                    </p>
                    {recentFeedback.length > 1 ? (
                      <div className="mt-4 space-y-2 border-t border-blue-100 pt-3">
                        {recentFeedback.slice(1).map((item) => (
                          <div key={item.id} className="rounded-2xl bg-white/70 px-3 py-2">
                            <p className="text-xs font-semibold text-charcoal/70">{item.providerName}</p>
                            <p className="mt-1 text-xs leading-relaxed text-charcoal/65">&ldquo;{item.feedback}&rdquo;</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-relaxed text-charcoal/70 md:text-base">
                    Your provider’s guidance and exercise feedback will appear here as your care team reviews your progress.
                  </p>
                )}
              </div>
            </div>
          </div>
          {exercises.length > 0 ? (
            <div className="space-y-3">
              {exercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => {
                    if (!exercise.completed && exercise.sessionId) {
                      navigate(`/patient/cbt/${exercise.sessionId}`);
                    }
                  }}
                  className="group flex w-full items-center justify-between rounded-[1.5rem] bg-white/92 p-4 text-left shadow-wellness-sm transition hover:shadow-wellness-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ECF5FF] text-[#2B5EA7]">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-charcoal">{exercise.title}</p>
                      <p className="mt-0.5 text-xs text-charcoal/55">{exercise.type} • Assigned {formatDate(exercise.assignedAt)}</p>
                      {exercise.therapistFeedback ? (
                        <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-charcoal/65">
                          Latest feedback: &ldquo;{exercise.therapistFeedback}&rdquo;
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${exerciseStatusClass(exercise.status)}`}>
                      {exercise.status}
                    </span>
                    {!exercise.completed ? (
                      <span className="inline-flex min-h-[44px] items-center rounded-full bg-[#E8F2FF] px-4 text-sm font-semibold text-[#2B5EA7] md:min-h-[34px] md:px-3 md:text-xs">
                        Start Exercise
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-wellness-border p-8 text-center">
              <p className="text-sm text-charcoal/50">No CBT exercises assigned yet.</p>
            </div>
          )}
        </section>
      </div>

    </div>
  );
}
