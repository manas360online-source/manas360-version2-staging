import { FormEvent, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getPatientProgress,
  submitAssessment,
  type AssessmentType,
  type MdcProgressApiError,
  type PatientProgressItem,
} from '../../api/mdcProgress.api';

type Question = {
  id: string;
  text: string;
};

const PHQ9_QUESTIONS: Question[] = [
  { id: 'phq_q1', text: 'Little interest or pleasure in doing things' },
  { id: 'phq_q2', text: 'Feeling down, depressed, or hopeless' },
  { id: 'phq_q3', text: 'Trouble falling/staying asleep, or sleeping too much' },
  { id: 'phq_q4', text: 'Feeling tired or having little energy' },
  { id: 'phq_q5', text: 'Poor appetite or overeating' },
  { id: 'phq_q6', text: 'Feeling bad about yourself' },
  { id: 'phq_q7', text: 'Trouble concentrating on things' },
  { id: 'phq_q8', text: 'Moving or speaking slowly or being fidgety/restless' },
  { id: 'phq_q9', text: 'Thoughts that you would be better off dead or self-harm' },
];

const GAD7_QUESTIONS: Question[] = [
  { id: 'gad_q1', text: 'Feeling nervous, anxious, or on edge' },
  { id: 'gad_q2', text: 'Not being able to stop or control worrying' },
  { id: 'gad_q3', text: 'Worrying too much about different things' },
  { id: 'gad_q4', text: 'Trouble relaxing' },
  { id: 'gad_q5', text: 'Being so restless that it is hard to sit still' },
  { id: 'gad_q6', text: 'Becoming easily annoyed or irritable' },
  { id: 'gad_q7', text: 'Feeling afraid as if something awful might happen' },
];

const ANSWER_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
] as const;

const getErrorMessage = (error: unknown): string => {
  const apiError = error as MdcProgressApiError;
  return apiError?.message || 'Unable to process progress tracking request.';
};

const getSeverity = (type: AssessmentType, score: number): string => {
  if (type === 'PHQ-9') {
    if (score <= 4) return 'Minimal';
    if (score <= 9) return 'Mild';
    if (score <= 14) return 'Moderate';
    if (score <= 19) return 'Moderately Severe';
    return 'Severe';
  }

  if (score <= 4) return 'Minimal';
  if (score <= 9) return 'Mild';
  if (score <= 14) return 'Moderate';
  return 'Severe';
};

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const getTrend = (items: PatientProgressItem[], type: AssessmentType): 'improving' | 'worsening' | 'stable' | 'insufficient-data' => {
  const filtered = items
    .filter((item) => item.type === type)
    .sort((a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime());

  if (filtered.length < 2) {
    return 'insufficient-data';
  }

  const previous = filtered[filtered.length - 2].score;
  const latest = filtered[filtered.length - 1].score;

  if (latest < previous) return 'improving';
  if (latest > previous) return 'worsening';
  return 'stable';
};

export default function ProgressTrackingExample() {
  const [patientId, setPatientId] = useState('');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('PHQ-9');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<PatientProgressItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const questions = assessmentType === 'PHQ-9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;

  const score = useMemo(() => {
    return questions.reduce((total, question) => total + (answers[question.id] ?? 0), 0);
  }, [answers, questions]);

  const severity = useMemo(() => getSeverity(assessmentType, score), [assessmentType, score]);

  const chartData = useMemo(() => {
    return progress
      .filter((item) => item.type === assessmentType)
      .sort((a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime())
      .map((item) => ({
        date: formatDate(item.assessedAt),
        score: item.score,
        severity: item.severity,
      }));
  }, [assessmentType, progress]);

  const trend = useMemo(() => getTrend(progress, assessmentType), [progress, assessmentType]);

  const loadProgress = async () => {
    if (!patientId.trim()) {
      setProgressError('Patient ID is required to load progress.');
      return;
    }

    setIsLoadingProgress(true);
    setProgressError(null);

    try {
      const items = await getPatientProgress(patientId.trim());
      setProgress(items);
    } catch (error) {
      setProgressError(getErrorMessage(error));
    } finally {
      setIsLoadingProgress(false);
    }
  };

  const onSubmitAssessment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!patientId.trim()) {
      setSubmitError('Patient ID is required to submit assessment.');
      return;
    }

    const missing = questions.some((question) => answers[question.id] === undefined);
    if (missing) {
      setSubmitError('Please answer all questions before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setStatusMessage(null);

    try {
      await submitAssessment({
        patientId: patientId.trim(),
        type: assessmentType,
        answers: questions.map((question) => ({
          questionId: question.id,
          score: answers[question.id] ?? 0,
        })),
        score,
        severity,
        assessedAt: new Date().toISOString(),
      });

      setStatusMessage('Assessment submitted successfully.');
      await loadProgress();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const trendLabel = trend === 'insufficient-data' ? 'Insufficient data' : trend;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Progress Tracking (PHQ-9 / GAD-7)</h2>
        <p className="mt-1 text-sm text-slate-500">Submit assessments and monitor patient trends over time.</p>

        <form className="mt-4 space-y-4" onSubmit={onSubmitAssessment}>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Patient ID
              <input
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                placeholder="Enter patient ID"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Assessment Type
              <select
                value={assessmentType}
                onChange={(event) => {
                  setAssessmentType(event.target.value as AssessmentType);
                  setAnswers({});
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="PHQ-9">PHQ-9</option>
                <option value="GAD-7">GAD-7</option>
              </select>
            </label>
          </div>

          <div className="space-y-3">
            {questions.map((question, index) => (
              <div key={question.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-800">
                  {index + 1}. {question.text}
                </p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {ANSWER_OPTIONS.map((option) => (
                    <label key={option.value} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700">
                      <input
                        type="radio"
                        name={question.id}
                        checked={answers[question.id] === option.value}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [question.id]: option.value,
                          }))
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Score:</span> {score}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Severity:</span> {severity}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Trend:</span> {trendLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
            <button
              type="button"
              onClick={() => void loadProgress()}
              disabled={isLoadingProgress}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoadingProgress ? 'Loading...' : 'Load Progress'}
            </button>
          </div>

          {submitError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}
          {progressError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{progressError}</p>}
          {statusMessage && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusMessage}</p>}
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Progress Chart</h3>
        <p className="mt-1 text-sm text-slate-500">Line chart for {assessmentType} scores over time.</p>

        {chartData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No progress data available yet for this assessment type.</p>
        ) : (
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`Score: ${value}`, assessmentType]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
