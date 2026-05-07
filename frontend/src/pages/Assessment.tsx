import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="animate-fadeIn" style={{ minHeight: '100vh', background: '#13292F' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '20px 18px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
          <div
            onClick={() => navigate('/landing')}
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '30px',
              color: '#F8F3EA',
              cursor: 'pointer',
              letterSpacing: '0.5px'
            }}
          >
            MANAS360
          </div>
          <div
            style={{
              color: '#F8F3EA',
              background: 'rgba(255,255,255,0.10)',
              borderRadius: '999px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 700
            }}
          >
            Assessment
          </div>
        </div>

        {loading ? (
          <section>
            <h2 style={{ color: '#F8F3EA', fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '34px', fontWeight: 400 }}>
              Loading your assessment...
            </h2>
            <p style={{ color: 'rgba(248,243,234,0.78)', marginTop: '8px' }}>Preparing questions</p>
          </section>
        ) : null}

        {!loading && questions.length > 0 ? (
          <section>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#F8F3EA', fontSize: '16px', fontWeight: 700 }}>
                {answeredCount} of {questions.length} answered
              </p>
              <div style={{ marginTop: '12px', height: '8px', width: '100%', borderRadius: '999px', background: 'rgba(255,255,255,0.10)' }}>
                <div
                  style={{
                    height: '8px',
                    borderRadius: '999px',
                    width: `${progressPercent}%`,
                    background: '#31484D',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {questions.map((question, index) => {
                const selectedValue = answers[question.questionId];
                return (
                  <div
                    key={question.questionId}
                    style={{
                      borderRadius: '26px',
                      border: '1px solid rgba(196,214,214,0.16)',
                      background: '#13292F',
                      padding: '24px'
                    }}
                  >
                    <h2
                      style={{
                        color: '#F8F3EA',
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: '28px',
                        fontWeight: 400,
                        lineHeight: 1.2,
                        marginBottom: '12px'
                      }}
                    >
                      {index + 1}. {question.prompt}
                    </h2>

                    <p style={{ color: '#F8F3EA', fontSize: '14px', fontWeight: 500, marginBottom: '18px' }}>
                      Choose one answer below.
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '12px' }}>
                      {question.options.map((option) => {
                        const isSelected = selectedValue === option.optionIndex;
                        return (
                          <button
                            key={`${question.questionId}-${option.optionIndex}`}
                            type="button"
                            onClick={() => setAnswer(question.questionId, option.optionIndex)}
                            style={{
                              width: '100%',
                              flex: '1 1 0',
                              minWidth: 0,
                              padding: '16px 20px',
                              borderRadius: '18px',
                              border: isSelected ? '1px solid #3E5B60' : '1px solid rgba(196,214,214,0.16)',
                              background: isSelected ? '#31484D' : 'transparent',
                              color: '#FFFFFF',
                              fontSize: '16px',
                              fontWeight: 600,
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <span>{option.label}</span>
                            {isSelected ? <span style={{ fontSize: '18px' }}>✓</span> : null}
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
          <div
            style={{
              marginTop: '18px',
              borderRadius: '18px',
              border: '1px solid rgba(248,113,113,0.4)',
              background: 'rgba(239,68,68,0.12)',
              color: '#FECACA',
              padding: '12px 16px',
              fontSize: '14px'
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ paddingTop: '14px', paddingBottom: '12px' }}>
          <button
            type="button"
            onClick={handleFinish}
            disabled={loading || submitting || questions.length === 0 || answeredCount !== questions.length}
            style={{
              width: '100%',
              borderRadius: '999px',
              padding: '14px 20px',
              fontSize: '16px',
              fontWeight: 700,
              border: 'none',
              cursor: loading || submitting || questions.length === 0 || answeredCount !== questions.length ? 'not-allowed' : 'pointer',
              background: loading || submitting || questions.length === 0 || answeredCount !== questions.length ? 'rgba(255,255,255,0.12)' : '#31484D',
              color: loading || submitting || questions.length === 0 || answeredCount !== questions.length ? 'rgba(248,243,234,0.55)' : '#FFFFFF'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit • Analyze My Results'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Assessment;
