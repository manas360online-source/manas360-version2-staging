import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';

export type CbtInputType = 'text' | 'slider' | 'radio' | 'prosCons' | 'comparison';

export type CbtWizardStep = {
  id: string;
  title: string;
  prompt: string;
  inputType: CbtInputType;
  options?: string[];
  min?: number;
  max?: number;
};

type ProsConsValue = {
  pros: string[];
  cons: string[];
};

export type CbtAnswerValue = string | number | ProsConsValue;

export type CbtActivitySubmission = {
  answers: Record<string, CbtAnswerValue>;
  completedAt: string;
};

type CbtActivityPlayerProps = {
  assignmentTitle?: string;
  steps?: CbtWizardStep[];
  initialAnswers?: Record<string, CbtAnswerValue>;
  initialStepIndex?: number;
  onSaveForLater?: (payload: { answers: Record<string, CbtAnswerValue>; currentStep: number }) => Promise<void> | void;
  saveForLaterBusy?: boolean;
  onSubmit?: (payload: CbtActivitySubmission) => Promise<void> | void;
  submitting?: boolean;
};

const defaultSteps: CbtWizardStep[] = [
  {
    id: 'situation',
    title: 'Step 1: Situation',
    prompt: 'What was the situation?',
    inputType: 'text',
  },
  {
    id: 'emotion_intensity',
    title: 'Step 2: Emotion Tracking',
    prompt: 'How intense was the emotion?',
    inputType: 'slider',
    min: 0,
    max: 10,
  },
  {
    id: 'evidence',
    title: 'Step 3: Evidence Building',
    prompt: 'List evidence for and against your automatic thought.',
    inputType: 'prosCons',
  },
  {
    id: 'balanced_thought',
    title: 'Step 4: Balanced Thought',
    prompt: 'Write a healthier, balanced thought.',
    inputType: 'text',
  },
];

const emptyProsCons = (): ProsConsValue => ({ pros: [''], cons: [''] });

const moodEmoji = (value: number): string => {
  if (value <= 2) return '😟';
  if (value <= 4) return '😕';
  if (value <= 6) return '😐';
  if (value <= 8) return '🙂';
  return '😌';
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 320, damping: 28 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -50 : 50,
    opacity: 0,
    transition: { duration: 0.2 },
  }),
};

export default function CBTActivityPlayer({
  assignmentTitle = 'CBT Activity',
  steps = defaultSteps,
  initialAnswers,
  initialStepIndex = 0,
  onSaveForLater,
  saveForLaterBusy = false,
  onSubmit,
  submitting = false,
}: CbtActivityPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, initialStepIndex));
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, CbtAnswerValue>>(initialAnswers || {});

  const totalSteps = steps.length;
  const isSummaryStep = currentIndex >= totalSteps;
  const activeStep = !isSummaryStep ? steps[currentIndex] : null;

  const progressPercent = useMemo(() => {
    if (totalSteps === 0) return 100;
    const completedSteps = Math.min(currentIndex, totalSteps);
    return Math.round((completedSteps / totalSteps) * 100);
  }, [currentIndex, totalSteps]);

  const setAnswer = (stepId: string, value: CbtAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [stepId]: value }));
  };

  const getProsConsValue = (stepId: string): ProsConsValue => {
    const value = answers[stepId];
    if (value && typeof value === 'object' && 'pros' in value && 'cons' in value) {
      return value as ProsConsValue;
    }
    return emptyProsCons();
  };

  const updateProsCons = (stepId: string, key: 'pros' | 'cons', index: number, value: string) => {
    const current = getProsConsValue(stepId);
    const nextItems = [...current[key]];
    nextItems[index] = value;
    setAnswer(stepId, {
      ...current,
      [key]: nextItems,
    });
  };

  const addProsConsRow = (stepId: string, key: 'pros' | 'cons') => {
    const current = getProsConsValue(stepId);
    setAnswer(stepId, {
      ...current,
      [key]: [...current[key], ''],
    });
  };

  const canMoveNext = useMemo(() => {
    if (isSummaryStep || !activeStep) return true;
    const value = answers[activeStep.id];

    if (activeStep.inputType === 'text') {
      return typeof value === 'string' && value.trim().length > 0;
    }

    if (activeStep.inputType === 'slider') {
      return typeof value === 'number';
    }

    if (activeStep.inputType === 'radio') {
      return typeof value === 'string' && value.trim().length > 0;
    }

    if (activeStep.inputType === 'prosCons') {
      const pc = getProsConsValue(activeStep.id);
      const hasPro = pc.pros.some((item) => item.trim().length > 0);
      const hasCon = pc.cons.some((item) => item.trim().length > 0);
      return hasPro && hasCon;
    }

    return false;
  }, [activeStep, answers, isSummaryStep]);

  const goNext = () => {
    if (!canMoveNext) return;
    setDirection(1);
    setCurrentIndex((value) => Math.min(value + 1, totalSteps));
  };

  const goBack = () => {
    setDirection(-1);
    setCurrentIndex((value) => Math.max(0, value - 1));
  };

  const submit = async () => {
    if (!onSubmit) return;
    await onSubmit({
      answers,
      completedAt: new Date().toISOString(),
    });
  };

  const saveForLater = async () => {
    if (!onSaveForLater) return;
    await onSaveForLater({ answers, currentStep: currentIndex });
  };

  const renderStepInput = () => {
    if (!activeStep) return null;
    return (
      <StepRenderer
        step={activeStep}
        answers={answers}
        setAnswer={setAnswer}
        getProsConsValue={getProsConsValue}
        updateProsCons={updateProsCons}
        addProsConsRow={addProsConsRow}
      />
    );
  };

  return (
    <section className="rounded-3xl border border-calm-sage/20 bg-white/95 p-5 shadow-soft-sm md:p-6">
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-charcoal">{assignmentTitle}</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/50">
            {isSummaryStep ? 'Summary' : `Step ${currentIndex + 1} of ${totalSteps}`}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-1">
          {steps.map((step, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;
            return (
              <span
                key={`step-dot-${step.id}`}
                className={`h-2.5 flex-1 rounded-full ${done ? 'bg-calm-sage' : active ? 'bg-calm-sage/55' : 'bg-calm-sage/15'}`}
              />
            );
          })}
        </div>

        <div className="h-2 w-full rounded-full bg-calm-sage/15">
          <motion.div
            className="h-2 rounded-full bg-calm-sage"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={isSummaryStep ? 'summary' : activeStep?.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {!isSummaryStep && activeStep ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-calm-sage">{activeStep.title}</p>
                <p className="mt-2 text-base font-medium text-charcoal">{activeStep.prompt}</p>
              </div>
              {renderStepInput()}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-calm-sage/10 px-3 py-1 text-xs font-semibold text-calm-sage">
                <CheckCircle2 className="h-4 w-4" />
                Summary Ready
              </div>
              <h3 className="text-xl font-semibold text-charcoal">Review your work</h3>

              <div className="space-y-3 rounded-2xl border border-calm-sage/20 bg-[#f8fbfa] p-4">
                {steps.map((step) => {
                  const value = answers[step.id];
                  let output = '—';

                  if (typeof value === 'string') output = value || '—';
                  if (typeof value === 'number') output = `${value}/10`;
                  if (value && typeof value === 'object' && 'pros' in value && 'cons' in value) {
                    const pros = value.pros.filter((item) => item.trim().length > 0);
                    const cons = value.cons.filter((item) => item.trim().length > 0);
                    output = `Pros: ${pros.join('; ') || '—'} | Cons: ${cons.join('; ') || '—'}`;
                  }

                  return (
                    <div key={`summary-${step.id}`} className="rounded-xl bg-white px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/50">{step.title}</p>
                      <p className="mt-1 text-sm text-charcoal">{output}</p>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-charcoal px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit to Provider'}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={currentIndex === 0 || submitting}
          className="inline-flex items-center gap-1 rounded-full border border-calm-sage/25 px-4 py-2 text-sm font-semibold text-charcoal/75 transition hover:bg-calm-sage/5 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {!isSummaryStep ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void saveForLater()}
              disabled={submitting || saveForLaterBusy}
              className="inline-flex items-center gap-1 rounded-full border border-calm-sage/25 px-4 py-2 text-sm font-semibold text-charcoal/75 transition hover:bg-calm-sage/5 disabled:opacity-40"
            >
              {saveForLaterBusy ? 'Saving...' : 'Save for Later'}
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canMoveNext || submitting}
              className="inline-flex items-center gap-1 rounded-full bg-calm-sage px-4 py-2 text-sm font-semibold text-white transition hover:bg-calm-sage/90 disabled:opacity-40"
            >
              {currentIndex === totalSteps - 1 ? 'Review Summary' : 'Next'}
              {currentIndex === totalSteps - 1 ? <ListChecks className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={goBack}
            disabled={submitting}
            className="inline-flex items-center gap-1 rounded-full bg-calm-sage px-4 py-2 text-sm font-semibold text-white transition hover:bg-calm-sage/90 disabled:opacity-40"
          >
            Edit Responses
          </button>
        )}
      </div>
    </section>
  );
}

type StepRendererProps = {
  step: CbtWizardStep;
  answers: Record<string, CbtAnswerValue>;
  setAnswer: (stepId: string, value: CbtAnswerValue) => void;
  getProsConsValue: (stepId: string) => ProsConsValue;
  updateProsCons: (stepId: string, key: 'pros' | 'cons', index: number, value: string) => void;
  addProsConsRow: (stepId: string, key: 'pros' | 'cons') => void;
};

function StepRenderer({
  step,
  answers,
  setAnswer,
  getProsConsValue,
  updateProsCons,
  addProsConsRow,
}: StepRendererProps) {
  if (step.inputType === 'text') {
    const value = typeof answers[step.id] === 'string' ? (answers[step.id] as string) : '';
    return (
      <textarea
        value={value}
        onChange={(event) => setAnswer(step.id, event.target.value)}
        rows={4}
        className="w-full resize-none rounded-xl border border-calm-sage/20 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-calm-sage/45"
        placeholder="Type your response..."
      />
    );
  }

  if (step.inputType === 'slider') {
    const min = step.min ?? 0;
    const max = step.max ?? 10;
    const hasValue = typeof answers[step.id] === 'number';
    const value = hasValue ? (answers[step.id] as number) : Math.round((min + max) / 2);
    return (
      <div className="rounded-xl border border-calm-sage/20 bg-white p-4">
        <div className="mb-3 flex items-center justify-between text-xs text-charcoal/60">
          <span>Low</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-calm-sage/10 px-2.5 py-1 text-sm font-semibold text-charcoal">
            <span>{moodEmoji(value)}</span>
            {value}/10
          </span>
          <span>High</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => setAnswer(step.id, Number(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-calm-sage/20 accent-calm-sage"
        />
      </div>
    );
  }

  if (step.inputType === 'radio') {
    return (
      <div className="space-y-2">
        {(step.options || []).map((option) => {
          const selected = answers[step.id] === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setAnswer(step.id, option)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                selected
                  ? 'border-calm-sage bg-calm-sage/10 text-charcoal'
                  : 'border-calm-sage/20 bg-white text-charcoal/80 hover:border-calm-sage/40'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  if (step.inputType === 'prosCons' || step.inputType === 'comparison') {
    const value = getProsConsValue(step.id);
    return (
      <ComparisonView
        stepId={step.id}
        value={value}
        updateProsCons={updateProsCons}
        addProsConsRow={addProsConsRow}
      />
    );
  }

  return null;
}

type ComparisonViewProps = {
  stepId: string;
  value: ProsConsValue;
  updateProsCons: (stepId: string, key: 'pros' | 'cons', index: number, value: string) => void;
  addProsConsRow: (stepId: string, key: 'pros' | 'cons') => void;
};

function ComparisonView({ stepId, value, updateProsCons, addProsConsRow }: ComparisonViewProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-calm-sage/20 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Evidence For</p>
        <div className="space-y-2">
          {value.pros.map((item, index) => (
            <input
              key={`pro-${index}`}
              value={item}
              onChange={(event) => updateProsCons(stepId, 'pros', index, event.target.value)}
              className="w-full rounded-lg border border-calm-sage/15 px-3 py-2 text-sm outline-none transition focus:border-calm-sage/45"
              placeholder="Add supporting evidence"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => addProsConsRow(stepId, 'pros')}
          className="mt-3 text-xs font-semibold text-calm-sage hover:underline"
        >
          + Add evidence
        </button>
      </div>

      <div className="rounded-xl border border-calm-sage/20 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Evidence Against</p>
        <div className="space-y-2">
          {value.cons.map((item, index) => (
            <input
              key={`con-${index}`}
              value={item}
              onChange={(event) => updateProsCons(stepId, 'cons', index, event.target.value)}
              className="w-full rounded-lg border border-calm-sage/15 px-3 py-2 text-sm outline-none transition focus:border-calm-sage/45"
              placeholder="Add challenging evidence"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => addProsConsRow(stepId, 'cons')}
          className="mt-3 text-xs font-semibold text-calm-sage hover:underline"
        >
          + Add evidence
        </button>
      </div>
    </div>
  );
}
