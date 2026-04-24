import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme/theme';
import { patientApi } from '../api/patient';

interface AssessmentProps {
  onSubmit: (data: any, isCritical: boolean) => void;
}

const FREE_SCREENING_TEMPLATE_KEY = 'free-mental-health-screening-v1';

export const Assessment: React.FC<AssessmentProps> = ({ onSubmit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Array<{
    questionId: string;
    prompt: string;
    sectionKey: string;
    options: Array<{ optionIndex: number; label: string }>;
  }>>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attemptId, setAttemptId] = useState<string>('');
  const [attemptToken, setAttemptToken] = useState<string>('');

  useEffect(() => {
    const loadAssessment = async () => {
      setLoading(true);
      setError('');
      try {
        const started = await patientApi.startFreeScreening({
          templateKey: FREE_SCREENING_TEMPLATE_KEY,
        });

        setAttemptId(String(started.attemptId || ''));
        setAttemptToken(String(started.attemptToken || ''));
        setQuestions(
          (started.questions || []).map((question) => ({
            questionId: String(question.questionId),
            prompt: String(question.prompt || ''),
            sectionKey: String(question.sectionKey || 'general'),
            options: (question.options || []).map((option) => ({
              optionIndex: Number(option.optionIndex),
              label: String(option.label || ''),
            })),
          })),
        );
        setCurrentQuestionIndex(0);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Unable to load assessment. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    void loadAssessment();
  }, []);

  const setAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));

    setCurrentQuestionIndex((prev) => {
      const lastIndex = Math.max(questions.length - 1, 0);
      return prev < lastIndex ? prev + 1 : prev;
    });
  };

  const handleFinish = async () => {
    if (questions.length === 0) {
      setError('Assessment is not ready yet. Please refresh and try again.');
      return;
    }

    if (!attemptId) {
      setError('Unable to submit this assessment attempt. Please restart the screening.');
      return;
    }

    const answersPayload = questions.map((question) => ({
      questionId: question.questionId,
      optionIndex: Number(answers[question.questionId]),
    }));

    const hasMissing = answersPayload.some((answer) => Number.isNaN(answer.optionIndex));
    if (hasMissing) {
      setError('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await patientApi.submitFreeScreening(attemptId, {
        attemptToken: attemptToken || undefined,
        answers: answersPayload,
      });

      const isCritical = String(result.severityLevel || '').toLowerCase() === 'severe';

      onSubmit(
        {
          ...result,
          action: result.actionLabel,
        },
        isCritical,
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercent = questions.length > 0
    ? ((currentQuestionIndex + 1) / questions.length) * 100
    : 0;

  return (
    <div className="responsive-page bg-wellness-bg animate-fadeIn">
      <div className="responsive-container section-stack py-8 sm:py-12">
      {/* Header */}
      <div className="w-full max-w-screen-lg mx-auto flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div className="font-serif text-2xl font-normal text-wellness-text tracking-wide cursor-pointer hover:opacity-80 transition-smooth" onClick={() => navigate('/')}>
          MANAS<span className="font-semibold text-calm-sage">360</span>
        </div>
        <div className="text-sm font-medium text-wellness-text bg-calm-sage/15 px-5 py-2 rounded-full">
          Assessment
        </div>
      </div>

      <div className="w-full max-w-screen-md mx-auto section-stack gap-12 sm:gap-16 lg:gap-20">
        {loading ? (
          <section>
            <h2 className="font-serif text-2xl sm:text-3xl text-wellness-text mb-2 leading-tight font-light">Loading your assessment...</h2>
            <p className="text-sm text-wellness-muted">Preparing questions</p>
          </section>
        ) : null}

        {!loading && currentQuestion ? (
          <section key={currentQuestion.questionId}>
            <div className="mb-6">
              <p className="text-sm font-medium text-wellness-muted">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
              <div className="mt-2 h-2 w-full rounded-full bg-calm-sage/15">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%`, backgroundColor: theme.colors.brandTopbar }}
                />
              </div>
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl text-wellness-text mb-8 leading-tight font-light">
              {currentQuestionIndex + 1}. {currentQuestion.prompt}
            </h2>

            <div className="flex flex-col gap-3 max-w-xl w-full">
              {currentQuestion.options.map((option) => {
                const isSelected = answers[currentQuestion.questionId] === option.optionIndex;
                return (
                  <button
                    key={`${currentQuestion.questionId}-${option.optionIndex}`}
                    onClick={() => setAnswer(currentQuestion.questionId, option.optionIndex)}
                    className={`
                      w-full px-7 py-4 rounded-2xl text-base font-medium transition-smooth border-2 text-left flex justify-between items-center
                      ${isSelected
                        ? 'text-white shadow-soft-md'
                        : 'bg-white text-wellness-text border-calm-sage/20 hover:border-calm-sage/40 hover:bg-calm-sage/5'
                      }
                    `}
                    style={isSelected ? { backgroundColor: theme.colors.brandTopbar, borderColor: theme.colors.brandTopbar } : undefined}
                  >
                    {option.label}
                    {isSelected && <span className="text-xl">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between max-w-xl">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
                disabled={currentQuestionIndex === 0}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-smooth ${
                  currentQuestionIndex === 0
                    ? 'bg-wellness-surface text-wellness-muted cursor-not-allowed'
                    : 'bg-white border border-calm-sage/30 text-wellness-text hover:bg-calm-sage/5'
                }`}
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                disabled={currentQuestionIndex >= questions.length - 1}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-smooth ${
                  currentQuestionIndex >= questions.length - 1
                    ? 'bg-wellness-surface text-wellness-muted cursor-not-allowed'
                    : 'text-white hover:opacity-90'
                }`}
                style={currentQuestionIndex >= questions.length - 1 ? undefined : { backgroundColor: theme.colors.brandTopbar }}
              >
                Next
              </button>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Submit */}
        <div className="pt-8 pb-20">
          <button
            onClick={handleFinish}
            disabled={loading || submitting || questions.length === 0 || Object.keys(answers).length !== questions.length}
            className={`
              responsive-action-btn w-full rounded-full text-lg font-semibold tracking-wide transition-smooth shadow-soft-md
              ${(loading || submitting || questions.length === 0 || Object.keys(answers).length !== questions.length)
                ? 'bg-wellness-surface text-wellness-muted cursor-not-allowed'
                : 'bg-gradient-calm text-white hover:shadow-soft-lg hover:-translate-y-1'
              }
            `}
          >
            {submitting ? 'Submitting...' : 'Submit • Analyze My Results'}
          </button>
        </div>

      </div>
      </div>
    </div>
  );
};
