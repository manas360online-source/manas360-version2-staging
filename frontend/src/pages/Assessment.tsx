import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../lib/http';

interface AssessmentProps {
  onSubmit: (data: any, isCritical: boolean) => void;
}

export const Assessment: React.FC<AssessmentProps> = ({ onSubmit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [attemptId, setAttemptId] = useState<string>('');
  const [attemptToken, setAttemptToken] = useState<string>('');
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
        const res = await http.post('/v1/free-screening/start', {});
        const payload = res?.data?.data || res?.data || {};
        setAttemptId(String(payload.attemptId || ''));
        setAttemptToken(String(payload.attemptToken || ''));
        setQuestions(Array.isArray(payload.questions) ? payload.questions : []);
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
    if (!attemptId || !attemptToken || questions.length === 0) {
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
      const res = await http.post(`/v1/free-screening/${encodeURIComponent(attemptId)}/submit`, {
        attemptToken,
        answers: answersPayload,
      });

      const result = res?.data?.data || res?.data || {};
      const isCritical = String(result.severityLevel || '').toLowerCase() === 'severe';

      onSubmit(result, isCritical);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

        {!loading && questions.map((question, questionIdx) => (
          <section key={question.questionId}>
            <h2 className="font-serif text-2xl sm:text-3xl text-wellness-text mb-8 leading-tight font-light">
              {questionIdx + 1}. {question.prompt}
            </h2>
            <div className="flex flex-col gap-3 max-w-xl w-full">
              {question.options.map((option) => {
                const isSelected = answers[question.questionId] === option.optionIndex;
                return (
                  <button
                    key={`${question.questionId}-${option.optionIndex}`}
                    onClick={() => setAnswer(question.questionId, option.optionIndex)}
                    className={`
                      w-full px-7 py-4 rounded-2xl text-base font-medium transition-smooth border-2 text-left flex justify-between items-center
                      ${isSelected
                        ? 'bg-calm-sage text-white border-calm-sage shadow-soft-md'
                        : 'bg-white text-wellness-text border-calm-sage/20 hover:border-calm-sage/40 hover:bg-calm-sage/5'
                      }
                    `}
                  >
                    {option.label}
                    {isSelected && <span className="text-xl">✓</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Submit */}
        <div className="pt-8 pb-20">
          <button
            onClick={handleFinish}
            disabled={loading || submitting || questions.length === 0}
            className={`
              responsive-action-btn w-full rounded-full text-lg font-semibold tracking-wide transition-smooth shadow-soft-md
              ${(loading || submitting || questions.length === 0)
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
