import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Search, Plus, Send, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  publishPatientWeeklyPlan,
  updatePatientWeeklyPlan,
  type WeeklyPlanActivityPayload,
} from '../../../../api/provider';

type WeekState = 'DRAFT' | 'PUBLISHED';

type TemplateItem = {
  id: string;
  title: string;
  activityType: WeeklyPlanActivityPayload['activityType'];
  category: string;
  frequency: WeeklyPlanActivityPayload['frequency'];
  estimatedMinutes: number;
};

type StagedActivity = WeeklyPlanActivityPayload & { id: string };

const weekRibbon = Array.from({ length: 12 }, (_, idx) => idx + 1);

const masterTemplates: TemplateItem[] = [
  {
    id: 'tpl-phq9',
    title: 'PHQ-9',
    activityType: 'CLINICAL_ASSESSMENT',
    category: 'Clinical Assessment',
    frequency: 'WEEKLY_MILESTONE',
    estimatedMinutes: 10,
  },
  {
    id: 'tpl-gad7',
    title: 'GAD-7',
    activityType: 'CLINICAL_ASSESSMENT',
    category: 'Clinical Assessment',
    frequency: 'WEEKLY_MILESTONE',
    estimatedMinutes: 8,
  },
  {
    id: 'tpl-meditation-5m',
    title: '5-min Meditation',
    activityType: 'AUDIO_THERAPY',
    category: 'Daily Habit',
    frequency: 'DAILY_RITUAL',
    estimatedMinutes: 5,
  },
  {
    id: 'tpl-thought-record',
    title: 'Thought Record',
    activityType: 'EXERCISE',
    category: 'Core Recovery',
    frequency: 'DAILY_RITUAL',
    estimatedMinutes: 15,
  },
  {
    id: 'tpl-breathwork',
    title: 'Box Breathing',
    activityType: 'AUDIO_THERAPY',
    category: 'Daily Habit',
    frequency: 'DAILY_RITUAL',
    estimatedMinutes: 6,
  },
  {
    id: 'tpl-journaling',
    title: 'Cognitive Journaling',
    activityType: 'EXERCISE',
    category: 'Core Recovery',
    frequency: 'WEEKLY_MILESTONE',
    estimatedMinutes: 20,
  },
];

const toStatusBadge = (state: WeekState) => {
  if (state === 'PUBLISHED') {
    return 'bg-[#E9F7F1] text-[#2F7A5F] border border-[#CDEBDD]';
  }
  return 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]';
};

export default function PlanStudio() {
  const { patientId = '' } = useParams();
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [weekActivities, setWeekActivities] = useState<Record<number, StagedActivity[]>>({});
  const [weekStatus, setWeekStatus] = useState<Record<number, WeekState>>({});
  const [draggingActivityId, setDraggingActivityId] = useState<string | null>(null);

  const stagedActivities = useMemo(() => weekActivities[selectedWeek] || [], [weekActivities, selectedWeek]);

  const visibleTemplates = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return masterTemplates;

    return masterTemplates.filter((item) => {
      const haystack = `${item.title} ${item.category} ${item.activityType}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [searchTerm]);

  const saveAndPublishMutation = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error('Patient id is required');

      const payloadActivities = stagedActivities.map((activity, index) => ({
        id: activity.id.startsWith('draft-') ? undefined : activity.id,
        title: String(activity.title || '').trim(),
        activityType: activity.activityType || 'EXERCISE',
        frequency: activity.frequency || 'ONE_TIME',
        category: activity.category,
        estimatedMinutes: activity.estimatedMinutes ?? 10,
        referenceId: activity.referenceId,
        orderIndex: Number.isInteger(activity.orderIndex) ? Number(activity.orderIndex) : index,
      }));

      await updatePatientWeeklyPlan(patientId, {
        weekNumber: selectedWeek,
        activities: payloadActivities,
      });

      return publishPatientWeeklyPlan(patientId, { weekNumber: selectedWeek });
    },
    onSuccess: (result) => {
      setWeekStatus((prev) => ({ ...prev, [selectedWeek]: 'PUBLISHED' }));
      toast.success(`Week ${selectedWeek} is now live for patient (${result.publishedCount} activities published).`);
    },
    onError: (error: any) => {
      toast.error(String(error?.response?.data?.message || error?.message || 'Unable to publish this week right now.'));
    },
  });

  const addTemplate = (template: TemplateItem) => {
    const draftId = `draft-${template.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const draft: StagedActivity = {
      id: draftId,
      title: template.title,
      activityType: template.activityType,
      frequency: template.frequency,
      category: template.category,
      estimatedMinutes: template.estimatedMinutes,
    };

    setWeekActivities((prev) => ({
      ...prev,
      [selectedWeek]: [...(prev[selectedWeek] || []), draft],
    }));

    setWeekStatus((prev) => ({ ...prev, [selectedWeek]: 'DRAFT' }));
    toast.success(`${template.title} added to Week ${selectedWeek}`);
  };

  const removeActivity = (activityId: string) => {
    setWeekActivities((prev) => ({
      ...prev,
      [selectedWeek]: (prev[selectedWeek] || []).filter((item) => item.id !== activityId),
    }));
    setWeekStatus((prev) => ({ ...prev, [selectedWeek]: 'DRAFT' }));
  };

  const clearWeek = () => {
    setWeekActivities((prev) => ({ ...prev, [selectedWeek]: [] }));
    setWeekStatus((prev) => ({ ...prev, [selectedWeek]: 'DRAFT' }));
    toast.success(`Week ${selectedWeek} draft cleared.`);
  };

  const reorderActivities = (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;

    setWeekActivities((prev) => {
      const current = [...(prev[selectedWeek] || [])];
      const fromIndex = current.findIndex((item) => item.id === fromId);
      const toIndex = current.findIndex((item) => item.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;

      const [moved] = current.splice(fromIndex, 1);
      current.splice(toIndex, 0, moved);

      return {
        ...prev,
        [selectedWeek]: current,
      };
    });

    setWeekStatus((prev) => ({ ...prev, [selectedWeek]: 'DRAFT' }));
  };

  const currentWeekState = weekStatus[selectedWeek] || 'DRAFT';

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Plan Studio</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#1E293B]">Clinical Curriculum Workspace</h2>
            <p className="mt-1 text-sm text-slate-500">Build week-by-week patient programs from master templates and publish when ready.</p>
          </div>
          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${toStatusBadge(currentWeekState)}`}>
            {currentWeekState === 'PUBLISHED' ? 'Live for Patient' : 'Draft'}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2">
            {weekRibbon.map((week) => (
              <button
                key={week}
                type="button"
                onClick={() => setSelectedWeek(week)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${selectedWeek === week
                  ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                  : 'border-[#E5E7EB] bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Week {week}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[#1E293B]">Master Templates</h3>
            <span className="text-xs text-slate-500">{visibleTemplates.length} items</span>
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search templates"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#60A5FA] focus:ring-2 focus:ring-[#DBEAFE]"
            />
          </div>

          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {visibleTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => addTemplate(template)}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3 text-left transition hover:border-[#BFDBFE] hover:bg-[#F8FBFF]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1E293B]">{template.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{template.category} • {template.estimatedMinutes} min</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#EFF6FF] px-2 py-1 text-xs font-semibold text-[#1D4ED8]">
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </span>
                </div>
              </button>
            ))}

            {visibleTemplates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E5E7EB] p-4 text-center text-xs text-slate-500">
                No templates match your search.
              </div>
            ) : null}
          </div>
        </aside>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#1E293B]">Week {selectedWeek} Drop Zone</h3>
              <p className="text-sm text-slate-500">Activities assigned to this week</p>
            </div>
            <button
              type="button"
              onClick={clearWeek}
              disabled={stagedActivities.length === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Week
            </button>
          </div>

          <div className="space-y-2">
            {stagedActivities.map((activity, index) => (
              <div
                key={activity.id}
                draggable
                onDragStart={() => setDraggingActivityId(activity.id)}
                onDragEnd={() => setDraggingActivityId(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={() => {
                  if (draggingActivityId) {
                    reorderActivities(draggingActivityId, activity.id);
                  }
                  setDraggingActivityId(null);
                }}
                className={`rounded-xl border border-[#E5E7EB] bg-white p-3 ${draggingActivityId === activity.id ? 'opacity-60' : 'opacity-100'} cursor-move`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{index + 1}. {activity.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {activity.category || 'Core Recovery'} • {activity.frequency || 'ONE_TIME'} • {activity.estimatedMinutes || 10} min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeActivity(activity.id)}
                    className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-xs font-semibold text-slate-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {stagedActivities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-8 text-center text-sm text-slate-500">
                Week {selectedWeek} is empty. Add templates from the sidebar library.
              </div>
            ) : null}
          </div>

          <div className="mt-5 border-t border-[#E5E7EB] pt-4">
            <button
              type="button"
              onClick={() => void saveAndPublishMutation.mutateAsync()}
              disabled={saveAndPublishMutation.isPending || stagedActivities.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1E40AF] disabled:opacity-60"
            >
              {saveAndPublishMutation.isPending ? 'Publishing Week...' : (
                <>
                  <Send className="h-4 w-4" />
                  Publish Week
                </>
              )}
            </button>

            {currentWeekState === 'PUBLISHED' ? (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2F7A5F]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Week {selectedWeek} is live for patient.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
