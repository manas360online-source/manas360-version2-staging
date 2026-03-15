import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import CBTActivityPlayer, {
  type CbtAnswerValue,
  type CbtInputType,
  type CbtWizardStep,
} from '../../components/patient/CBTActivityPlayer';
import { patientApi } from '../../api/patient';
import { ArrowLeft } from 'lucide-react';

const normalizeInputType = (value: string): CbtInputType => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'slider' || normalized === 'range') return 'slider';
  if (normalized === 'radio' || normalized === 'select' || normalized === 'choice') return 'radio';
  if (normalized === 'proscons' || normalized === 'pros_cons' || normalized === 'comparison') return 'comparison';
  return 'text';
};

export default function CbtAssignmentPlayerPage() {
  const navigate = useNavigate();
  const { assignmentId } = useParams();

  const detailQuery = useQuery({
    queryKey: ['cbt-assignment-detail', assignmentId],
    queryFn: async () => {
      if (!assignmentId) throw new Error('Missing assignment id');
      return patientApi.getCbtAssignmentDetail(assignmentId);
    },
    enabled: Boolean(assignmentId),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { responses: Record<string, CbtAnswerValue>; currentStep: number; status: 'IN_PROGRESS' | 'COMPLETED' }) => {
      if (!assignmentId) throw new Error('Missing assignment id');
      return patientApi.saveCbtAssignmentProgress(assignmentId, payload);
    },
  });

  const steps: CbtWizardStep[] = useMemo(() => {
    const source = detailQuery.data?.steps || [];
    return source.map((step) => ({
      id: String(step.id),
      title: String(step.title || 'Reflection Step'),
      prompt: String(step.prompt || ''),
      inputType: normalizeInputType(step.inputType),
      options: Array.isArray(step.options) ? step.options.map((item) => String(item)) : undefined,
      min: typeof step.min === 'number' ? step.min : undefined,
      max: typeof step.max === 'number' ? step.max : undefined,
      required: true,
    }));
  }, [detailQuery.data?.steps]);

  const initialAnswers = useMemo(() => {
    const responses = detailQuery.data?.responses || {};
    const mapped: Record<string, CbtAnswerValue> = {};
    for (const step of steps) {
      if (Object.prototype.hasOwnProperty.call(responses, step.id)) {
        mapped[step.id] = responses[step.id] as CbtAnswerValue;
      }
    }
    return mapped;
  }, [detailQuery.data?.responses, steps]);

  const initialStepIndex = useMemo(() => {
    const value = Number((detailQuery.data?.responses as Record<string, unknown> | undefined)?.currentStep || 0);
    if (Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(value, Math.max(0, steps.length - 1)));
  }, [detailQuery.data?.responses, steps.length]);

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-6">
        <div className="h-20 animate-pulse rounded-2xl bg-calm-sage/10" />
        <div className="h-96 animate-pulse rounded-2xl bg-calm-sage/10" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-rose-700">Unable to load this CBT assignment</h2>
        <p className="mt-2 text-sm text-rose-700/80">Please try again from your dashboard.</p>
        <button
          type="button"
          onClick={() => navigate('/patient/dashboard')}
          className="mt-4 inline-flex items-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const assignment = detailQuery.data;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-20 lg:pb-6">
      <div className="rounded-2xl border border-calm-sage/15 bg-white/85 p-4">
        <button
          type="button"
          onClick={() => navigate('/patient/dashboard')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal/70 transition hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <h1 className="mt-3 text-2xl font-semibold text-charcoal">Interactive CBT Task</h1>
        <p className="mt-1 text-sm text-charcoal/65">{assignment.description || 'Complete your guided practice and submit it to your provider.'}</p>
      </div>

      <CBTActivityPlayer
        assignmentTitle={assignment.title}
        steps={steps}
        initialAnswers={initialAnswers}
        initialStepIndex={initialStepIndex}
        saveForLaterBusy={saveMutation.isPending}
        onSaveForLater={async (payload) => {
          await saveMutation.mutateAsync({
            responses: payload.answers,
            currentStep: payload.currentStep,
            status: 'IN_PROGRESS',
          });
          toast.success('Progress saved. You can resume anytime.');
        }}
        onSubmit={async (payload) => {
          await saveMutation.mutateAsync({
            responses: payload.answers,
            currentStep: steps.length,
            status: 'COMPLETED',
          });
          toast.success('Great work. Your assignment was submitted to your provider.');
          navigate('/patient/dashboard');
        }}
        submitting={saveMutation.isPending}
      />
    </div>
  );
}
