import { Brain, CheckCircle, MessageSquare, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignPatientItem } from '../../../../api/provider';
import { usePatientCBTModules, useReviewCBTModule } from '../../../../hooks/usePatientCBTModules';

type ModuleStatus = 'Completed' | 'In Progress' | 'Pending';

const statusClass = (status: ModuleStatus) => {
  if (status === 'Completed') return 'bg-[#f0f5ee] text-[#2D4128]';
  if (status === 'In Progress') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-600';
};

const formatDate = (value: string | null): string => {
  if (!value) return 'Pending completion';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

type ResponseBlockProps = {
  label: string;
  value: string;
};

function ResponseBlock({ label, value }: ResponseBlockProps) {
  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
      <p className="font-display text-sm font-semibold text-[#2D4128]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

export default function CBTModules() {
  const { patientId } = useParams();
  const { data: modules = [], isLoading } = usePatientCBTModules(patientId);
  const reviewMutation = useReviewCBTModule();
  const queryClient = useQueryClient();
  const assignCbtMutation = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error('Patient id is required');
      return assignPatientItem(patientId, {
        assignmentType: 'CBT',
        title: 'Assigned CBT Exercise',
        frequency: 'ONE_TIME',
        estimatedMinutes: 15,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['patientCBTModules', patientId] });
      toast.success('CBT exercise assigned to patient');
    },
    onError: (error: any) => {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to assign CBT exercise'));
    },
  });
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!modules.length) {
      setSelectedModuleId('');
      return;
    }

    const hasSelected = modules.some((module) => module.id === selectedModuleId);
    if (!hasSelected) {
      setSelectedModuleId(modules[0].id);
    }
  }, [modules, selectedModuleId]);

  const selectedModule = useMemo(
    () => modules.find((module) => module.id === selectedModuleId) ?? modules[0],
    [modules, selectedModuleId],
  );

  useEffect(() => {
    setFeedback(selectedModule?.therapistFeedback || '');
  }, [selectedModule?.id, selectedModule?.therapistFeedback]);

  const handleSendFeedback = async () => {
    if (!patientId || !selectedModule) return;
    const trimmedFeedback = feedback.trim();
    if (!trimmedFeedback) return;

    await reviewMutation.mutateAsync({
      patientId,
      moduleId: selectedModule.id,
      feedback: trimmedFeedback,
    });
    toast.success('Feedback sent to patient ✉️');
    setFeedback('');
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="flex flex-col gap-3 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2D4128]">CBT & Exercises</h2>
          <p className="mt-1 text-sm text-slate-500">Review assigned homework and respond to patient entries for patient ID {patientId || '123'}.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void assignCbtMutation.mutateAsync();
          }}
          disabled={assignCbtMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128]"
        >
          <Plus className="h-4 w-4" />
          {assignCbtMutation.isPending ? 'Assigning...' : 'Assign Exercise'}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
              <div>
                <p className="font-display text-lg font-semibold text-[#2D4128]">Assigned Modules</p>
                <p className="text-sm text-slate-500">Active CBT homework and exercises</p>
              </div>
              <div className="rounded-full bg-[#FAFAF8] px-3 py-1 text-xs font-semibold text-slate-500">
                {isLoading ? 'Loading...' : `${modules.length} active`}
              </div>
            </div>

            <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1">
              {isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`cbt-module-skeleton-${index}`} className="h-24 animate-pulse rounded-xl border border-[#E5E5E5] bg-[#FAFAF8]" />
                  ))}
                </div>
              )}

              {!isLoading && modules.map((module) => {
                const isActive = module.id === selectedModule?.id;

                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => setSelectedModuleId(module.id)}
                    className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-[#E5E5E5] border-l-4 border-l-[#4A6741] bg-[#E8EFE6]'
                        : 'border-[#E5E5E5] bg-white hover:bg-[#FAFAF8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-semibold text-[#2D4128]">{module.moduleType}</p>
                        <p className="mt-1 text-xs text-slate-500">Assigned {formatDate(module.assignmentDate)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(module.status as ModuleStatus)}`}>
                        {module.status}
                      </span>
                    </div>
                  </button>
                );
              })}

              {!isLoading && modules.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-8 text-center">
                  <p className="font-display text-sm font-semibold text-[#2D4128]">No CBT modules yet</p>
                  <p className="mt-1 text-xs text-slate-500">Assigned CBT homework will appear here once available.</p>
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
                <div className="h-40 animate-pulse rounded-xl bg-[#FAFAF8]" />
                <div className="h-48 animate-pulse rounded-xl bg-[#FAFAF8]" />
              </div>
            )}

            {!isLoading && selectedModule && (
              <>
                <div className="flex flex-col gap-4 border-b border-[#E5E5E5] pb-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[#4A6741]">
                      <Brain className="h-5 w-5" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Patient Response</p>
                    </div>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-[#2D4128]">{selectedModule.moduleType}</h3>
                    <p className="mt-1 text-sm text-slate-500">Date completed: {formatDate(selectedModule.completedAt)}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => { void handleSendFeedback(); }}
                    disabled={reviewMutation.isPending || !feedback.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark as Reviewed
                  </button>
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-[#4A6741]" />
                    <h4 className="font-display text-lg font-semibold text-[#2D4128]">Submitted Answers</h4>
                  </div>

                  {selectedModule.submittedAnswers.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedModule.submittedAnswers.map((answer) => (
                        <ResponseBlock key={answer.id} label={answer.question} value={answer.answer} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-8 text-center">
                      <p className="font-display text-sm font-semibold text-[#2D4128]">No submitted answers yet</p>
                      <p className="mt-1 text-xs text-slate-500">The patient has not submitted responses for this CBT module.</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-[#4A6741]" />
                    <label htmlFor="therapist-comments" className="font-display text-base font-semibold text-[#2D4128]">
                      Therapist Comments (Visible to Patient)
                    </label>
                  </div>
                  <textarea
                    id="therapist-comments"
                    rows={5}
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    className="mt-3 w-full rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#2D4128] outline-none transition focus:border-[#4A6741] focus:bg-[#FAFAF8] focus:ring-2 focus:ring-[#4A6741]/10"
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => { void handleSendFeedback(); }}
                      disabled={reviewMutation.isPending || !feedback.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {reviewMutation.isPending ? 'Sending...' : 'Send Feedback'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {!isLoading && !selectedModule && (
              <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-10 text-center">
                <p className="font-display text-base font-semibold text-[#2D4128]">No CBT module selected</p>
                <p className="mt-1 text-sm text-slate-500">Select an assigned module to review patient submissions and provide therapist feedback.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}