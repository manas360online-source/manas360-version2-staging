import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updatePatientWeeklyPlan, type WeeklyPlanActivityPayload } from '../../../../api/provider';

type PublishState = 'DRAFT' | 'PUBLISHED';

type LibraryResource = {
  id: string;
  title: string;
  activityType: WeeklyPlanActivityPayload['activityType'];
  category: string;
  frequency: WeeklyPlanActivityPayload['frequency'];
  estimatedMinutes: number;
};

type StagedActivity = WeeklyPlanActivityPayload & { id: string };

const weeks = [1, 2, 3, 4];

const libraryResources: LibraryResource[] = [
  {
    id: 'lib-phq9',
    title: 'PHQ-9',
    activityType: 'CLINICAL_ASSESSMENT',
    category: 'Core',
    frequency: 'WEEKLY_MILESTONE',
    estimatedMinutes: 10,
  },
  {
    id: 'lib-gad7',
    title: 'GAD-7',
    activityType: 'CLINICAL_ASSESSMENT',
    category: 'Core',
    frequency: 'WEEKLY_MILESTONE',
    estimatedMinutes: 8,
  },
  {
    id: 'lib-thought-record',
    title: 'Thought Record',
    activityType: 'EXERCISE',
    category: 'Core',
    frequency: 'DAILY_RITUAL',
    estimatedMinutes: 15,
  },
  {
    id: 'lib-morning-walk',
    title: 'Morning Walk',
    activityType: 'EXERCISE',
    category: 'Relapse Prevention',
    frequency: 'DAILY_RITUAL',
    estimatedMinutes: 20,
  },
];

const statusBadgeClass = (status: PublishState) => {
  if (status === 'PUBLISHED') return 'bg-[#E8EFE6] text-[#2D4128]';
  return 'bg-amber-50 text-amber-700';
};

export default function PlanBuilder() {
  const { patientId = '' } = useParams();
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [weekActivities, setWeekActivities] = useState<Record<number, StagedActivity[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
  });
  const [weekStatus, setWeekStatus] = useState<Record<number, PublishState>>({
    1: 'DRAFT',
    2: 'DRAFT',
    3: 'DRAFT',
    4: 'DRAFT',
  });

  const stagedActivities = useMemo(
    () => weekActivities[selectedWeek] || [],
    [weekActivities, selectedWeek],
  );

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error('Patient id is required');

      const payloadActivities = (weekActivities[selectedWeek] || []).map((item, index) => ({
        title: String(item.title || '').trim(),
        activityType: item.activityType || 'EXERCISE',
        frequency: item.frequency || 'ONE_TIME',
        category: item.category || 'Core',
        estimatedMinutes: item.estimatedMinutes ?? 10,
        referenceId: item.referenceId,
        orderIndex: Number.isInteger(item.orderIndex) ? item.orderIndex : index,
      }));

      return updatePatientWeeklyPlan(patientId, {
        weekNumber: selectedWeek,
        activities: payloadActivities,
      });
    },
    onSuccess: (response) => {
      setWeekStatus((prev) => ({
        ...prev,
        [selectedWeek]: response.insertedCount > 0 ? 'PUBLISHED' : 'DRAFT',
      }));
      toast.success(`Week ${selectedWeek} published to patient`);
    },
    onError: (error: any) => {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to publish weekly plan'));
    },
  });

  const addResource = (resource: LibraryResource) => {
    const staged: StagedActivity = {
      id: `${resource.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: resource.title,
      activityType: resource.activityType,
      frequency: resource.frequency,
      estimatedMinutes: resource.estimatedMinutes,
      category: resource.category,
    };

    setWeekActivities((prev) => ({
      ...prev,
      [selectedWeek]: [...(prev[selectedWeek] || []), staged],
    }));

    setWeekStatus((prev) => ({ ...prev, [selectedWeek]: 'DRAFT' }));
  };

  const removeStagedActivity = (activityId: string) => {
    setWeekActivities((prev) => ({
      ...prev,
      [selectedWeek]: (prev[selectedWeek] || []).filter((item) => item.id !== activityId),
    }));
    setWeekStatus((prev) => ({ ...prev, [selectedWeek]: 'DRAFT' }));
  };

  const clearWeek = () => {
    setWeekActivities((prev) => ({ ...prev, [selectedWeek]: [] }));
    setWeekStatus((prev) => ({ ...prev, [selectedWeek]: 'DRAFT' }));
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#2D4128]">Plan Builder</h2>
            <p className="mt-1 text-sm text-slate-500">Build patient journey week-by-week and publish activities to the selected week.</p>
          </div>
          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(weekStatus[selectedWeek])}`}>
            Week {selectedWeek}: {weekStatus[selectedWeek]}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {weeks.map((week) => (
            <button
              key={week}
              type="button"
              onClick={() => setSelectedWeek(week)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                selectedWeek === week
                  ? 'border-[#4A6741] bg-[#E8EFE6] text-[#2D4128]'
                  : 'border-[#E5E5E5] bg-white text-slate-600 hover:bg-[#FAFAF8]'
              }`}
            >
              Week {week}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold text-[#2D4128]">Activity Library</p>
              <p className="text-sm text-slate-500">Click to add into Week {selectedWeek} staging area</p>
            </div>
          </div>

          <div className="space-y-3">
            {libraryResources.map((resource) => (
              <button
                key={resource.id}
                type="button"
                onClick={() => addResource(resource)}
                className="w-full rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4 text-left transition hover:bg-[#f2f7ef]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold text-[#2D4128]">{resource.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {resource.category} • {resource.frequency} • {resource.estimatedMinutes} min
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#E8EFE6] px-2 py-1 text-xs font-semibold text-[#2D4128]">
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold text-[#2D4128]">Staging Area</p>
              <p className="text-sm text-slate-500">Week {selectedWeek} draft activities</p>
            </div>
            <button
              type="button"
              onClick={clearWeek}
              disabled={stagedActivities.length === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5E5] px-2.5 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>

          <div className="space-y-3">
            {stagedActivities.map((activity, index) => (
              <div key={activity.id} className="rounded-xl border border-[#E5E5E5] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-semibold text-[#2D4128]">{index + 1}. {activity.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {activity.category || 'Core'} • {activity.frequency || 'ONE_TIME'} • {activity.estimatedMinutes || 10} min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStagedActivity(activity.id)}
                    className="rounded-lg border border-[#E5E5E5] px-2 py-1 text-xs font-semibold text-slate-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {stagedActivities.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] p-6 text-center text-sm text-slate-500">
                No activities staged for Week {selectedWeek}. Add resources from the library.
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-[#E5E5E5] pt-4">
            <button
              type="button"
              onClick={() => void publishMutation.mutateAsync()}
              disabled={publishMutation.isPending || stagedActivities.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128] disabled:opacity-60"
            >
              {publishMutation.isPending ? (
                'Publishing...'
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Publish to Patient
                </>
              )}
            </button>
            {weekStatus[selectedWeek] === 'PUBLISHED' && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2D4128]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Week {selectedWeek} was published successfully.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
