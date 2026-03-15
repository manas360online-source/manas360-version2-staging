import { useCallback, useMemo, useState } from 'react';
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type CbtInputType = 'text' | 'slider' | 'radio' | 'prosCons' | 'comparison' | 'voiceText' | 'dynamicList';

export type CbtWizardStep = {
  id: string;
  title: string;
  prompt: string;
  inputType: CbtInputType;
  options?: string[];
  min?: number;
  max?: number;
  placeholder?: string;
  addButtonText?: string;
  dynamicItems?: number; // For dynamic lists like exposure ladder
};

type ProsConsValue = {
  pros: string[];
  cons: string[];
};

export type CbtAnswerValue = string | number | ProsConsValue | string[];

export type CbtActivitySubmission = {
  answers: Record<string, CbtAnswerValue>;
  completedAt: string;
};

type CbtActivityPlayerProps = {
  assignmentTitle?: string;
  templateType?: 'thought-record' | 'activity-scheduler' | 'worry-postponement' | 'socratic-navigator' | 'exposure-ladder';
  steps?: CbtWizardStep[];
  initialAnswers?: Record<string, CbtAnswerValue>;
  initialStepIndex?: number;
  onSaveForLater?: (payload: { answers: Record<string, CbtAnswerValue>; currentStep: number }) => Promise<void> | void;
  saveForLaterBusy?: boolean;
  onSubmit?: (payload: CbtActivitySubmission) => Promise<void> | void;
  submitting?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
};

const thoughtRecordSteps: CbtWizardStep[] = [
  {
    id: 'situation',
    title: 'Step 1: Situation',
    prompt: 'What just happened? Where were you?',
    inputType: 'voiceText',
    placeholder: 'Describe the situation...',
  },
  {
    id: 'emotion_intensity',
    title: 'Step 2: Initial Emotion',
    prompt: 'How intense is this feeling (1–10)?',
    inputType: 'slider',
    min: 1,
    max: 10,
  },
  {
    id: 'automatic_thought',
    title: 'Step 3: Automatic Thought',
    prompt: 'What is the one thought stuck in your head?',
    inputType: 'voiceText',
    placeholder: 'What were you thinking?',
  },
  {
    id: 'evidence_chart',
    title: 'Step 4: Evidence Chart',
    prompt: 'What facts support this? What facts contradict it?',
    inputType: 'prosCons',
  },
  {
    id: 'balanced_thought',
    title: 'Step 5: Balanced Thought',
    prompt: 'What is a more balanced way to see this?',
    inputType: 'voiceText',
    placeholder: 'Write a healthier, balanced thought...',
  },
  {
    id: 'outcome',
    title: 'Step 6: Outcome',
    prompt: 'How do you feel now (1–10)?',
    inputType: 'slider',
    min: 1,
    max: 10,
  },
];

const activitySchedulerSteps: CbtWizardStep[] = [
  {
    id: 'task',
    title: 'Step 1: The Task',
    prompt: 'What small activity will you do today?',
    inputType: 'voiceText',
    placeholder: 'e.g., Walk for 5 mins, Call a friend...',
  },
  {
    id: 'predicted_pleasure',
    title: 'Step 2: Prediction',
    prompt: 'On a scale of 0–10, how much pleasure do you expect to get?',
    inputType: 'slider',
    min: 0,
    max: 10,
  },
  {
    id: 'actual_pleasure',
    title: 'Step 3: Post-Task Log',
    prompt: 'How much pleasure did you actually feel?',
    inputType: 'slider',
    min: 0,
    max: 10,
  },
  {
    id: 'mastery',
    title: 'Step 4: Mastery Check',
    prompt: 'How difficult was it to complete (0–10)?',
    inputType: 'slider',
    min: 0,
    max: 10,
  },
  {
    id: 'insight',
    title: 'Step 5: Insight',
    prompt: 'Did the action change your mood more than you expected?',
    inputType: 'radio',
    options: ['Yes, much better than expected', 'About what I expected', 'Less than expected', 'Not sure yet'],
  },
];

const worryPostponementSteps: CbtWizardStep[] = [
  {
    id: 'worry_list',
    title: 'Step 1: Worry List',
    prompt: 'Speak your current worries freely.',
    inputType: 'voiceText',
    placeholder: 'What worries are on your mind?',
  },
  {
    id: 'classification',
    title: 'Step 2: Classification',
    prompt: 'Is this a Real-World Problem or Hypothetical Worry?',
    inputType: 'radio',
    options: ['Real-World Problem (I have a bill due)', 'Hypothetical Worry (What if they don\'t like me?)'],
  },
  {
    id: 'action_plan',
    title: 'Step 3: Action Plan',
    prompt: 'What is Step 1 to solve this?',
    inputType: 'voiceText',
    placeholder: 'What will you do first?',
  },
  {
    id: 'scheduled_time',
    title: 'Step 4: Scheduled Time',
    prompt: 'Schedule 15 minutes of "Worry Time" for later today.',
    inputType: 'voiceText',
    placeholder: 'When will you worry about this?',
  },
  {
    id: 'release',
    title: 'Step 5: Release',
    prompt: 'Now, let this thought go until your scheduled time.',
    inputType: 'text',
    placeholder: 'Write a release statement...',
  },
];

const socraticNavigatorSteps: CbtWizardStep[] = [
  {
    id: 'belief',
    title: 'Step 1: The Belief',
    prompt: 'What is a belief you have about yourself?',
    inputType: 'voiceText',
    placeholder: 'e.g., I am not good enough',
  },
  {
    id: 'friend_mirror',
    title: 'Step 2: Friend Mirror',
    prompt: 'If your best friend had this exact thought, what would you say to them?',
    inputType: 'voiceText',
    placeholder: 'What would you tell your friend?',
  },
  {
    id: 'fact_vs_opinion',
    title: 'Step 3: Fact vs. Opinion',
    prompt: 'Is this belief a proven fact or a feeling-based opinion?',
    inputType: 'radio',
    options: ['Proven Fact', 'Feeling-Based Opinion'],
  },
  {
    id: 'new_perspective',
    title: 'Step 4: New Perspective',
    prompt: 'Based on your advice to your friend, what is a kinder truth?',
    inputType: 'voiceText',
    placeholder: 'What is a more balanced view?',
  },
];

const exposureLadderSteps: CbtWizardStep[] = [
  {
    id: 'fear',
    title: 'Step 1: The Fear',
    prompt: 'What is the situation you are avoiding?',
    inputType: 'voiceText',
    placeholder: 'Describe the feared situation...',
  },
  {
    id: 'ladder',
    title: 'Step 2: Build the Ladder',
    prompt: 'List 5 steps from easiest (1) to hardest (5).',
    inputType: 'dynamicList',
    dynamicItems: 5,
  },
  {
    id: 'current_step',
    title: 'Step 3: Current Step',
    prompt: 'Which step are you trying today?',
    inputType: 'radio',
    options: ['Step 1 (Easiest)', 'Step 2', 'Step 3', 'Step 4', 'Step 5 (Hardest)'],
  },
  {
    id: 'anxiety_before',
    title: 'Step 4: Before',
    prompt: 'Before starting, what is your anxiety level (0–10)?',
    inputType: 'slider',
    min: 0,
    max: 10,
  },
  {
    id: 'anxiety_after',
    title: 'Step 5: After',
    prompt: 'After staying in the situation, what is your level now?',
    inputType: 'slider',
    min: 0,
    max: 10,
  },
];

const getTemplateSteps = (templateType?: string): CbtWizardStep[] => {
  switch (templateType) {
    case 'thought-record':
      return thoughtRecordSteps;
    case 'activity-scheduler':
      return activitySchedulerSteps;
    case 'worry-postponement':
      return worryPostponementSteps;
    case 'socratic-navigator':
      return socraticNavigatorSteps;
    case 'exposure-ladder':
      return exposureLadderSteps;
    default:
      return thoughtRecordSteps; // fallback
  }
};

const getTemplateTitle = (templateType?: string): string => {
  switch (templateType) {
    case 'thought-record':
      return 'Thought Record';
    case 'activity-scheduler':
      return 'Activity Scheduler';
    case 'worry-postponement':
      return 'Worry Postponement';
    case 'socratic-navigator':
      return 'Socratic Navigator';
    case 'exposure-ladder':
      return 'Exposure Ladder';
    default:
      return 'CBT Activity';
  }
};

const emptyProsCons = (): ProsConsValue => ({ pros: [''], cons: [''] });

const moodEmoji = (value: number): string => {
  if (value <= 2) return '😟';
  if (value <= 4) return '😕';
  if (value <= 6) return '😐';
  if (value <= 8) return '🙂';
  return '😌';
};

// Voice input hook
function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  return { isListening, transcript, startListening, stopListening, setTranscript };
}

export default function CBTActivityPlayer({
  assignmentTitle,
  templateType,
  steps: customSteps,
  initialAnswers,
  initialStepIndex = 0,
  onSaveForLater,
  saveForLaterBusy = false,
  onSubmit,
  submitting = false,
  isOpen = true,
  onClose,
}: CbtActivityPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, initialStepIndex));
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, CbtAnswerValue>>(initialAnswers || {});

  const steps = useMemo(() => customSteps || getTemplateSteps(templateType), [customSteps, templateType]);
  const displayTitle = assignmentTitle || getTemplateTitle(templateType);

  const totalSteps = steps.length;
  const isSummaryStep = currentIndex >= totalSteps;
  const activeStep = !isSummaryStep ? steps[currentIndex] : null;

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 p-4">
            <h2 className="text-lg font-semibold text-gray-900">{displayTitle}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Progress */}
          <div className="border-b border-gray-100 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                {isSummaryStep ? 'Summary' : `Step ${currentIndex + 1} of ${totalSteps}`}
              </span>
              <span className="text-gray-500">{Math.round((currentIndex / totalSteps) * 100)}% Complete</span>
            </div>
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 flex-1 rounded-full ${
                    index < currentIndex ? 'bg-green-500' : index === currentIndex ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={isSummaryStep ? 'summary' : activeStep?.id}
                custom={direction}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {!isSummaryStep && activeStep ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                        {activeStep.title}
                      </p>
                      <p className="mt-2 text-base font-medium text-gray-900">{activeStep.prompt}</p>
                    </div>
                    {renderStepInput()}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-green-50 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800">Activity Complete</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Review your responses</h3>
                    <div className="space-y-3">
                      {steps.map((step) => {
                        const value = answers[step.id];
                        let output = '—';

                        if (typeof value === 'string') output = value || '—';
                        if (typeof value === 'number') output = `${value}/10`;
                        if (Array.isArray(value)) output = value.filter(v => v.trim()).join(', ') || '—';
                        if (value && typeof value === 'object' && 'pros' in value && 'cons' in value) {
                          const pros = value.pros.filter((item) => item.trim().length > 0);
                          const cons = value.cons.filter((item) => item.trim().length > 0);
                          output = `For: ${pros.join('; ') || '—'} | Against: ${cons.join('; ') || '—'}`;
                        }

                        return (
                          <div key={`summary-${step.id}`} className="rounded-lg bg-gray-50 p-3">
                            <p className="text-sm font-medium text-gray-600">{step.title}</p>
                            <p className="mt-1 text-sm text-gray-900">{output}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-4">
            {!isSummaryStep ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveForLater()}
                  disabled={submitting || saveForLaterBusy}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {saveForLaterBusy ? 'Saving...' : 'Save for Later'}
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canMoveNext || submitting}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {currentIndex === totalSteps - 1 ? 'Review' : 'Next'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
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

  if (step.inputType === 'voiceText') {
    const value = typeof answers[step.id] === 'string' ? (answers[step.id] as string) : '';
    return (
      <VoiceTextInput
        value={value}
        onChange={(newValue) => setAnswer(step.id, newValue)}
        placeholder={step.placeholder || "Speak or type your response..."}
      />
    );
  }

  if (step.inputType === 'dynamicList') {
    const items = Array.isArray(answers[step.id]) ? (answers[step.id] as string[]) : [];
    return (
      <DynamicListInput
        items={items}
        onChange={(newItems) => setAnswer(step.id, newItems)}
        placeholder={step.placeholder || "Add an item..."}
        addButtonText={step.addButtonText || "+ Add item"}
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

type VoiceTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function VoiceTextInput({ value, onChange, placeholder }: VoiceTextInputProps) {
  const { transcript, isListening, startListening, stopListening } = useVoiceInput();

  React.useEffect(() => {
    if (transcript) {
      onChange(transcript);
    }
  }, [transcript, onChange]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="w-full resize-none rounded-xl border border-calm-sage/20 bg-white px-4 py-3 pr-12 text-sm text-charcoal outline-none transition focus:border-calm-sage/45"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          className={`absolute bottom-3 right-3 rounded-full p-2 transition ${
            isListening
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-calm-sage text-white hover:bg-calm-sage/90'
          }`}
          title={isListening ? 'Stop recording' : 'Start voice input'}
        >
          {isListening ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          )}
        </button>
      </div>
      {isListening && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Listening...
        </div>
      )}
    </div>
  );
}

type DynamicListInputProps = {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addButtonText?: string;
};

function DynamicListInput({ items, onChange, placeholder, addButtonText }: DynamicListInputProps) {
  const addItem = () => {
    onChange([...items, '']);
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={item}
            onChange={(event) => updateItem(index, event.target.value)}
            className="flex-1 rounded-lg border border-calm-sage/20 px-3 py-2 text-sm outline-none transition focus:border-calm-sage/45"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 transition hover:bg-red-100"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="text-sm font-semibold text-calm-sage hover:underline"
      >
        {addButtonText}
      </button>
    </div>
  );
}
