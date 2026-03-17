import { Target, Plus, Edit3, MessageSquare, Pause, Play, CheckCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { usePatientGoals } from '../../../../hooks/usePatientGoals';
import { createGoal, updateGoal, sendGoalMessage } from '../../../../api/provider';
import type { CreateGoalPayload } from '../../../../api/provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const statusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'bg-[#f0f5ee] text-[#2D4128]';
    case 'PAUSED': return 'bg-amber-50 text-amber-700';
    default: return 'bg-blue-50 text-blue-700';
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'Completed';
    case 'PAUSED': return 'Paused';
    case 'IN_PROGRESS': return 'In Progress';
    default: return status;
  }
};

type ModalType = 'create' | 'edit' | 'message' | null;

export default function GoalsAndHabits() {
  const { patientId } = useParams();
  const queryClient = useQueryClient();
  const { data: goals = [], isLoading, isError, refetch } = usePatientGoals(patientId);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedGoalId, setSelectedGoalId] = useState('');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Wellness');
  const [formMessage, setFormMessage] = useState('');

  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['patientGoals', patientId] }); };

  const createMutation = useMutation({
    mutationFn: (payload: CreateGoalPayload) => createGoal(patientId!, payload),
    onSuccess: () => { toast.success('Goal created'); invalidate(); setModalType(null); },
    onError: () => { toast.error('Failed to create goal'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ goalId, title, category }: { goalId: string; title: string; category: string }) =>
      updateGoal(patientId!, goalId, { title, category }),
    onSuccess: () => { toast.success('Goal updated'); invalidate(); setModalType(null); },
    onError: () => { toast.error('Failed to update goal'); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ goalId, status }: { goalId: string; status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' }) =>
      updateGoal(patientId!, goalId, { status }),
    onSuccess: () => { toast.success('Goal status updated'); invalidate(); },
    onError: () => { toast.error('Failed to update status'); },
  });

  const messageMutation = useMutation({
    mutationFn: ({ goalId, message }: { goalId: string; message: string }) =>
      sendGoalMessage(patientId!, goalId, message),
    onSuccess: () => { toast.success('Encouragement sent!'); setModalType(null); },
    onError: () => { toast.error('Failed to send message'); },
  });

  const openCreateModal = () => {
    setFormTitle(''); setFormCategory('Wellness');
    setModalType('create');
  };

  const openEditModal = (goal: { id: string; title: string; category: string }) => {
    setSelectedGoalId(goal.id); setFormTitle(goal.title); setFormCategory(goal.category);
    setModalType('edit');
  };

  const openMessageModal = (goalId: string) => {
    setSelectedGoalId(goalId); setFormMessage('');
    setModalType('message');
  };

  const handleCreateSubmit = () => {
    if (!formTitle.trim()) { toast.error('Title is required'); return; }
    createMutation.mutate({ title: formTitle.trim(), category: formCategory.trim() || 'Wellness' });
  };

  const handleEditSubmit = () => {
    if (!formTitle.trim() || !selectedGoalId) return;
    updateMutation.mutate({ goalId: selectedGoalId, title: formTitle.trim(), category: formCategory.trim() });
  };

  const handleMessageSubmit = () => {
    if (!formMessage.trim() || !selectedGoalId) return;
    messageMutation.mutate({ goalId: selectedGoalId, message: formMessage.trim() });
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="flex flex-col gap-3 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2D4128]">Goals & Habit Tracking</h2>
          <p className="mt-1 text-sm text-slate-500">Patient therapeutic goals and daily habit progress.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128]"
        >
          <Plus className="h-4 w-4" />
          Create New Goal
        </button>
      </header>

      <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
        {isLoading && (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`goal-skeleton-${i}`} className="h-28 animate-pulse rounded-xl bg-[#FAFAF8]" />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="p-5">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="font-display text-sm font-semibold">Unable to load goals</p>
              <button type="button" onClick={() => { void refetch(); }} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                Retry
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && goals.length === 0 && (
          <div className="p-5 text-center">
            <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-10">
              <Target className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 font-display text-sm font-semibold text-[#2D4128]">No goals set</p>
              <p className="mt-1 text-xs text-slate-500">Create a therapeutic goal for the patient.</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && goals.length > 0 && (
          <div className="divide-y divide-[#E5E5E5]">
            {goals.map((goal) => (
              <div key={goal.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-[#4A6741]" />
                    <h3 className="font-display text-base font-semibold text-[#2D4128]">{goal.title}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(goal.status)}`}>
                      {statusLabel(goal.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Category: {goal.category} • Started: {new Date(goal.startDate).toLocaleDateString()}</p>

                  {goal.weeklyTracker && goal.weeklyTracker.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <p className="mr-2 text-xs font-semibold text-slate-500">Weekly:</p>
                      {goal.weeklyTracker.map((day, i) => (
                        <div
                          key={i}
                          className={`h-5 w-5 rounded-full border ${
                            day === 'completed' ? 'border-[#4A6741] bg-[#4A6741]' :
                            day === 'missed' ? 'border-red-300 bg-red-100' :
                            'border-[#E5E5E5] bg-[#FAFAF8]'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                    <span>🔥 Streak: {goal.streak} days</span>
                    <span>✅ {goal.completionRate}% completion</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(goal)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-semibold text-[#2D4128] hover:bg-[#FAFAF8]"
                  >
                    <Edit3 className="h-4 w-4" />
                    Adjust
                  </button>

                  {goal.status === 'IN_PROGRESS' && (
                    <>
                      <button
                        type="button"
                        onClick={() => statusMutation.mutate({ goalId: goal.id, status: 'PAUSED' })}
                        disabled={statusMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                      >
                        <Pause className="h-4 w-4" /> Pause
                      </button>
                      <button
                        type="button"
                        onClick={() => statusMutation.mutate({ goalId: goal.id, status: 'COMPLETED' })}
                        disabled={statusMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#d4e3cf] bg-white px-3 py-2 text-sm font-semibold text-[#2D4128] hover:bg-[#f0f5ee] disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" /> Complete
                      </button>
                    </>
                  )}

                  {goal.status === 'PAUSED' && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ goalId: goal.id, status: 'IN_PROGRESS' })}
                      disabled={statusMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" /> Resume
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openMessageModal(goal.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-semibold text-[#2D4128] hover:bg-[#FAFAF8]"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Encourage
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit / Message Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
              <h3 className="font-display text-xl font-semibold text-[#2D4128]">
                {modalType === 'create' ? 'Create New Goal' : modalType === 'edit' ? 'Adjust Goal' : 'Send Encouragement'}
              </h3>
              <button type="button" onClick={() => setModalType(null)} className="rounded-lg p-1 text-slate-400 hover:bg-[#FAFAF8] hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {(modalType === 'create' || modalType === 'edit') && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#2D4128]">Goal Title *</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                      placeholder="e.g. Practice mindfulness 10min daily"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#2D4128]">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                    >
                      <option value="Wellness">Wellness</option>
                      <option value="Mindfulness">Mindfulness</option>
                      <option value="Exercise">Exercise</option>
                      <option value="Sleep">Sleep</option>
                      <option value="Social">Social</option>
                      <option value="Nutrition">Nutrition</option>
                      <option value="Coping Skills">Coping Skills</option>
                    </select>
                  </div>
                </>
              )}
              {modalType === 'message' && (
                <div>
                  <label className="block text-sm font-semibold text-[#2D4128]">Encouragement Message *</label>
                  <textarea
                    rows={4}
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                    placeholder="Great progress this week! Keep it up..."
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-[#E5E5E5] pt-4">
              <button type="button" onClick={() => setModalType(null)} className="rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] hover:bg-[#FAFAF8]">
                Cancel
              </button>
              <button
                type="button"
                onClick={
                  modalType === 'create' ? handleCreateSubmit :
                  modalType === 'edit' ? handleEditSubmit :
                  handleMessageSubmit
                }
                disabled={createMutation.isPending || updateMutation.isPending || messageMutation.isPending}
                className="rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2D4128] disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending || messageMutation.isPending) ? 'Saving...' :
                 modalType === 'create' ? 'Create Goal' :
                 modalType === 'edit' ? 'Save Changes' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}