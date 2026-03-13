import { Calendar, Flame, Send, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePatientGoals, useSendGoalMessage } from '../../../../hooks/usePatientGoals';

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

const categoryClass = (category: string) => {
  if (category === 'Sleep') return 'bg-blue-50 text-blue-700';
  if (category === 'Mindfulness') return 'bg-purple-50 text-purple-700';
  if (category === 'Nutrition') return 'bg-amber-50 text-amber-700';
  return 'bg-[#f0f5ee] text-[#2D4128]';
};

export default function GoalsAndHabits() {
  const { patientId } = useParams();
  const { data: goals = [], isLoading, isError, refetch } = usePatientGoals(patientId);
  const sendMessageMutation = useSendGoalMessage();
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!goals.length) {
      setSelectedGoalId('');
      return;
    }

    const hasSelected = goals.some((goal) => goal.id === selectedGoalId);
    if (!hasSelected) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? goals[0],
    [goals, selectedGoalId],
  );

  useEffect(() => {
    setMessage('');
  }, [selectedGoal?.id]);

  const handleSendMessage = async () => {
    if (!patientId || !selectedGoal) return;
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    await sendMessageMutation.mutateAsync({
      patientId,
      goalId: selectedGoal.id,
      message: trimmedMessage,
    });

    setMessage('');
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="flex flex-col gap-3 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2D4128]">Goals & Habit Tracking</h2>
          <p className="mt-1 text-sm text-slate-500">Coach accountability workspace for patient ID {patientId || '123'}.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128]"
        >
          <Target className="h-4 w-4" />
          Create New Goal
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
              <div>
                <p className="font-display text-lg font-semibold text-[#2D4128]">Active Goals</p>
                <p className="text-sm text-slate-500">Current coaching commitments</p>
              </div>
              <div className="rounded-full bg-[#FAFAF8] px-3 py-1 text-xs font-semibold text-slate-500">
                {isLoading ? 'Loading...' : `${goals.length} goals`}
              </div>
            </div>

            <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1">
              {isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`goal-skeleton-${index}`} className="h-24 animate-pulse rounded-xl border border-[#E5E5E5] bg-[#FAFAF8]" />
                  ))}
                </div>
              )}

              {!isLoading && goals.map((goal) => {
                const isActive = goal.id === selectedGoal?.id;

                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setSelectedGoalId(goal.id)}
                    className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-[#E5E5E5] border-l-4 border-l-[#4A6741] bg-[#E8EFE6]'
                        : 'border-[#E5E5E5] bg-white hover:bg-[#FAFAF8]'
                    }`}
                  >
                    <p className="font-display text-sm font-semibold text-[#2D4128]">{goal.title}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryClass(goal.category)}`}>
                        {goal.category}
                      </span>
                    </div>
                    <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#4A6741]">
                      <Flame className="h-4 w-4" />
                      {`🔥 ${goal.streak} Day Streak`}
                    </div>
                  </button>
                );
              })}

              {!isLoading && !isError && goals.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-8 text-center">
                  <p className="font-display text-sm font-semibold text-[#2D4128]">No goals found</p>
                  <p className="mt-1 text-xs text-slate-500">Assigned goals and habits will appear here once available.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="lg:col-span-2">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
            {isLoading && (
              <div className="space-y-4">
                <div className="h-20 animate-pulse rounded-xl bg-[#FAFAF8]" />
                <div className="h-36 animate-pulse rounded-xl bg-[#FAFAF8]" />
                <div className="h-24 animate-pulse rounded-xl bg-[#FAFAF8]" />
              </div>
            )}

            {!isLoading && isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <p className="font-display text-sm font-semibold">Unable to load goals</p>
                <p className="mt-1 text-sm">Please retry in a moment.</p>
                <button
                  type="button"
                  onClick={() => { void refetch(); }}
                  className="mt-3 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !isError && selectedGoal && (
              <>
                <div className="flex flex-col gap-4 border-b border-[#E5E5E5] pb-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-[#2D4128]">{selectedGoal.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryClass(selectedGoal.category)}`}>
                        {selectedGoal.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-4 w-4" />
                        Start Date: {formatDate(selectedGoal.startDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
                  <p className="font-display text-base font-semibold text-[#2D4128]">Weekly Habit Tracker</p>
                  <div className="mt-4 grid grid-cols-7 gap-2">
                    {selectedGoal.weeklyTracker.map((dayStatus, index) => (
                      <div key={`${selectedGoal.id}-${WEEK_LABELS[index]}-${index}`} className="space-y-2 text-center">
                        <p className="text-xs font-semibold text-slate-500">{WEEK_LABELS[index]}</p>
                        <div
                          className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold ${
                            dayStatus === 'completed' ? 'bg-[#4A6741] text-white' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {dayStatus === 'completed' ? '✓' : '•'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completion Rate</p>
                    <p className="mt-2 font-display text-2xl font-semibold text-[#2D4128]">{selectedGoal.completionRate}%</p>
                  </div>
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Streak</p>
                    <p className="mt-2 font-display text-2xl font-semibold text-[#2D4128]">{selectedGoal.streak} Days</p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
                  <label htmlFor="coach-feedback" className="font-display text-base font-semibold text-[#2D4128]">
                    Encouragement / Feedback
                  </label>
                  <textarea
                    id="coach-feedback"
                    rows={5}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="mt-3 w-full rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#2D4128] outline-none transition focus:border-[#4A6741] focus:bg-[#FAFAF8] focus:ring-2 focus:ring-[#4A6741]/10"
                  />
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8]"
                    >
                      Adjust Goal
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleSendMessage(); }}
                      disabled={sendMessageMutation.isPending || !message.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {!isLoading && !isError && !selectedGoal && (
              <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-10 text-center">
                <p className="font-display text-base font-semibold text-[#2D4128]">No goal selected</p>
                <p className="mt-1 text-sm text-slate-500">Select a goal to review progress and send coaching feedback.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}