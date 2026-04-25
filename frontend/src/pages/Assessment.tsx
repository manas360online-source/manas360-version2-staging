import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme/theme';
import {
  CLINICAL_ASSESSMENT_OPTIONS,
  CLINICAL_QUESTION_BANK,
  severityFromClinicalScore,
} from '../utils/clinicalAssessments';

interface AssessmentProps {
  onSubmit: (data: any, isCritical: boolean) => void;
}

const PHQ9_QUESTIONS: string[] = CLINICAL_QUESTION_BANK['PHQ-9'];
const PHQ9_OPTIONS = CLINICAL_ASSESSMENT_OPTIONS.map((option) => ({
  label: option.label,
  value: option.points,
}));

export const Assessment: React.FC<AssessmentProps> = ({ onSubmit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [questions, setQuestions] = useState<Array<{
    questionId: string;
    prompt: string;
    sectionKey: string;
    options: Array<{ optionIndex: number; label: string }>;
  }>>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadAssessment = async () => {
      setLoading(true);
      setError('');
      try {
        setQuestions(
          PHQ9_QUESTIONS.map((prompt, idx) => ({
            questionId: `PHQ-9-${idx + 1}`,
            prompt,
            sectionKey: 'PHQ-9',
            options: PHQ9_OPTIONS.map((option) => ({
              optionIndex: option.value,
              label: option.label,
            })),
          })),
        );
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
  };

  const handleFinish = async () => {
    if (questions.length === 0) {
      setError('Assessment is not ready yet. Please refresh and try again.');
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
      const totalScore = answersPayload.reduce((sum, item) => sum + Number(item.optionIndex || 0), 0);
      const severityLevel = severityFromClinicalScore('PHQ-9', totalScore);
      const result = {
        attemptId: `PHQ-9-${Date.now()}`,
        templateKey: 'PHQ-9',
        totalScore,
        severityLevel,
      };
      const isCritical = String(result.severityLevel || '').toLowerCase() === 'severe';

      onSubmit(result, isCritical);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.questionId] !== undefined).length,
    [answers, questions],
  );
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="responsive-page bg-wellness-bg animate-fadeIn">
      <div className="responsive-container section-stack py-8 sm:py-12">
        <div className="w-full max-w-screen-lg mx-auto flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <div
            className="font-serif text-2xl font-normal text-wellness-text tracking-wide cursor-pointer hover:opacity-80 transition-smooth"
            onClick={() => navigate('/landing')}
          >
            MANAS<span className="font-semibold text-calm-sage">360</span>
          </div>
          <div className="text-sm font-medium text-wellness-text bg-calm-sage/15 px-5 py-2 rounded-full">
            Assessment
          </div>
        </div>

        <div className="w-full max-w-screen-xl mx-auto section-stack gap-12 sm:gap-16 lg:gap-20">
          {loading ? (
            <section>
              <h2 className="font-serif text-2xl sm:text-3xl text-wellness-text mb-2 leading-tight font-light">
                Loading your assessment...
              </h2>
              <p className="text-sm text-wellness-muted">Preparing questions</p>
            </section>
          ) : null}

          {!loading && questions.length > 0 ? (
            <section className="max-w-screen-xl mx-auto">
              <div className="mb-8">
                <p className="text-sm font-medium text-wellness-muted">
                  {answeredCount} of {questions.length} answered
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-calm-sage/15">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%`, backgroundColor: theme.colors.brandTopbar }}
                  />
                </div>
              </div>

              <div className="space-y-10">
                {questions.map((question, index) => {
                  const selectedValue = answers[question.questionId];
                  return (
                    <div key={question.questionId} className="rounded-[28px] border border-calm-sage/10 bg-white/5 p-5 sm:p-7">
                      <h2 className="font-serif text-2xl sm:text-3xl text-wellness-text mb-3 leading-tight font-light">
                        {index + 1}. {question.prompt}
                      </h2>

                      <p className="text-sm text-wellness-muted mb-6">
                        Choose one answer below.
                      </p>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {question.options.map((option) => {
                          const isSelected = selectedValue === option.optionIndex;
                          return (
                            <button
                              key={`${question.questionId}-${option.optionIndex}`}
                              onClick={() => setAnswer(question.questionId, option.optionIndex)}
                              className={`
                                w-full px-7 py-4 rounded-2xl text-base font-medium transition-smooth border-2 text-left flex justify-between items-center
                                ${isSelected
                                  ? 'text-white shadow-soft-lg ring-2 ring-white/20 scale-[1.01]'
                                  : 'bg-white/10 text-white border-white/20 hover:border-white/30 hover:bg-white/15'
                                }
                              `}
                              style={isSelected
                                ? { backgroundColor: theme.colors.brandTopbar, borderColor: theme.colors.brandTopbar }
                                : { backgroundColor: 'rgba(255,255,255,0.10)' }}
                            >
                              {option.label}
                              {isSelected && <span className="text-xl">?</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="pt-4 pb-20">
            <button
              onClick={handleFinish}
              disabled={loading || submitting || questions.length === 0 || answeredCount !== questions.length}
              className={`
                responsive-action-btn w-full rounded-full text-lg font-semibold tracking-wide transition-smooth shadow-soft-md
                ${(loading || submitting || questions.length === 0 || answeredCount !== questions.length)
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

