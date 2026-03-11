import { useEffect, useMemo, useState } from 'react';
import { patientApi, type StructuredAssessmentQuestion, type StructuredAssessmentStartResponse } from '../../api/patient';
import { parseJourneyPayload, type JourneyPayload } from '../../utils/journey';
import { Calendar, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type AssessmentMode = 'daily' | 'clinical';
type ClinicalAssessmentKey = 'PHQ-9' | 'GAD-7';

type AssessmentHistoryEntry = {
  id?: string;
  type?: string;
  date?: string;
  score?: number;
  maxScore?: number;
  level?: string;
  createdAt?: string;
};

const PHQ9_TEMPLATE_KEY = 'phq-9-paid-assessment-v1';
const GAD7_TEMPLATE_KEY = 'gad-7-paid-assessment-v1';
const structuredTemplateKeys: Record<'PHQ-9' | 'GAD-7', string> = {
  'PHQ-9': PHQ9_TEMPLATE_KEY,
  'GAD-7': GAD7_TEMPLATE_KEY,
};

const dailyCheckQuestions = [
  { label: 'How is your mood today?', key: 'mood' },
  { label: 'Sleep quality', key: 'sleep' },
  { label: 'Energy level', key: 'energy' },
  { label: 'Anxiety level (0 = none, 10 = severe)', key: 'anxiety' },
  { label: 'Overall wellbeing (0 = poor, 10 = excellent)', key: 'wellbeing' },
];

const clinicalCards: Array<{ key: ClinicalAssessmentKey; description: string; max: number }> = [
  { key: 'PHQ-9', description: 'Depression symptom screening', max: 27 },
  { key: 'GAD-7', description: 'Anxiety severity screening', max: 21 },
];

const recommendationBySeverity = {
  severe: ['Immediate therapist consultation is recommended.', 'Start breathing + grounding routine today.'],
  moderate: ['Continue CBT exercises and schedule follow-up this week.', 'Track mood and sleep daily for 7 days.'],
  mild: ['Maintain routine and complete two self-care interventions this week.', 'Repeat quick check in 3 days.'],
};

const getSeverity = (score: number) => {
  if (score >= 15) return 'severe';
  if (score >= 8) return 'moderate';
  return 'mild';
};

const normalizeResultLevel = (value: string): 'mild' | 'moderate' | 'severe' => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('severe')) return 'severe';
  if (normalized.includes('moderate')) return 'moderate';
  return 'mild';
};

const dedupeText = (items: string[]): string[] => Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)));

const asArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as any[];
    if (record.data && typeof record.data === 'object') {
      const nested = record.data as Record<string, unknown>;
      if (Array.isArray(nested.items)) return nested.items as any[];
    }
    if (Array.isArray(record.items)) return record.items as any[];
  }
  return [];
};

const isSubscriptionActive = (subscription: any): boolean => {
  if (!subscription) return false;

  const status = String(subscription?.status || '').toLowerCase();
  if (status === 'active' || status === 'trialing') return true;

  if (subscription?.isActive === true || subscription?.active === true) return true;
  if (subscription?.planName && status && status !== 'cancelled' && status !== 'expired' && status !== 'inactive') return true;

  return false;
};

export default function AssessmentsPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AssessmentMode>('daily');
  const [selectedClinical, setSelectedClinical] = useState<ClinicalAssessmentKey>('PHQ-9');
  const [score, setScore] = useState(10);
  // quickAnswers removed
  const [dailyAnswers, setDailyAnswers] = useState<Record<string, number>>(
    dailyCheckQuestions.reduce((acc, q) => ({ ...acc, [q.key]: 5 }), {})
  );
  const [history, setHistory] = useState<any[]>([]);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentHistoryEntry[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [structuredAttempt, setStructuredAttempt] = useState<StructuredAssessmentStartResponse | null>(null);
  const [structuredAnswers, setStructuredAnswers] = useState<Record<string, number>>({});
  const [currentStructuredQuestionIndex, setCurrentStructuredQuestionIndex] = useState(0);
  const [structuredLoading, setStructuredLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resultCard, setResultCard] = useState<null | {
    type: string;
    score: number;
    level: string;
    recommendations: string[];
    pathway?: string;
    selectedPathway?: string;
    urgency?: string;
    followUpDays?: number;
    rationale?: string[];
  }>(null);
  const hasPremiumAssessmentAccess = useMemo(() => isSubscriptionActive(subscription), [subscription]);

  const startCarePath = async (path: 'recommended' | 'direct' | 'urgent') => {
    const pathway = path === 'urgent' ? 'urgent-care' : path === 'direct' ? 'direct-provider' : 'stepped-care';
    const preferredSpecialization = path === 'urgent'
      ? 'Psychiatrist'
      : path === 'recommended'
        ? (resultCard?.pathway?.toLowerCase().includes('psychiatrist') ? 'Psychiatrist' : 'Psychologist')
        : 'Psychologist';

    await patientApi.selectJourneyPathway({
      pathway,
      reason: `Selected from assessment result (${path})`,
      metadata: {
        severity: resultCard?.level || 'mild',
        preferredSpecialization,
      },
    }).catch(() => null);

    const careType = path === 'urgent' ? 'urgent' : path === 'recommended' ? 'recommended' : 'direct';
    const urgency = path === 'urgent' || resultCard?.level === 'severe' ? 'urgent' : 'routine';
    navigate(`/patient/care-team?tab=browse&careType=${encodeURIComponent(careType)}&urgency=${encodeURIComponent(urgency)}&specialization=${encodeURIComponent(preferredSpecialization)}`);
  };

  const loadLatestJourney = async (): Promise<JourneyPayload | null> => {
    try {
      const response = await patientApi.getJourneyRecommendation();
      return parseJourneyPayload(response);
    } catch {
      return null;
    }
  };

  const loadAssessmentHistory = async () => {
    try {
      const [legacyResponse, structuredResponse] = await Promise.all([
        patientApi.getMoodHistory().catch(() => null),
        patientApi.getStructuredAssessmentHistory().catch(() => null),
      ]);
      const legacyItems = asArray(legacyResponse as any);
      const structuredItems = asArray((structuredResponse as any)?.data ?? structuredResponse).map((entry: any) => ({
        id: entry.attemptId,
        type: entry.templateTitle || entry.templateKey || 'Assessment',
        score: Number(entry.totalScore || 0),
        maxScore: String(entry.templateKey || '').includes('gad-7') ? 21 : String(entry.templateKey || '').includes('phq-9') ? 27 : 27,
        level: String(entry.severityLevel || 'mild').toLowerCase(),
        createdAt: entry.submittedAt,
      }));
      setAssessmentHistory([...structuredItems, ...legacyItems]);
    } catch {
      console.error('Failed to load assessment history');
    }
  };

  const startStructuredAssessment = async (assessmentType: 'PHQ-9' | 'GAD-7') => {
    setStructuredLoading(true);
    setMessage('');
    try {
      const response = await patientApi.startStructuredAssessment({ templateKey: structuredTemplateKeys[assessmentType] });
      setStructuredAttempt(response);
      setStructuredAnswers({});
      setCurrentStructuredQuestionIndex(0);
    } catch (error) {
      setStructuredAttempt(null);
      setMessage(error instanceof Error ? error.message : `Unable to start ${assessmentType} assessment right now.`);
    } finally {
      setStructuredLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([
        loadAssessmentHistory(),
        (async () => {
          try {
            const response = await patientApi.getSubscription();
            const payload = (response as any)?.data ?? response;
            setSubscription(payload || null);
          } catch {
            setSubscription(null);
          } finally {
            setSubscriptionLoading(false);
          }
        })(),
      ]);
    })();
  }, []);

  useEffect(() => {
    if (
      mode === 'clinical'
      && hasPremiumAssessmentAccess
      && (selectedClinical === 'PHQ-9' || selectedClinical === 'GAD-7')
      && (!structuredAttempt || structuredAttempt.template?.key !== structuredTemplateKeys[selectedClinical])
      && !structuredLoading
    ) {
      void startStructuredAssessment(selectedClinical);
    }
  }, [mode, hasPremiumAssessmentAccess, selectedClinical, structuredAttempt, structuredLoading]);

  const loadMoodHistory = async () => {
    setLoading(true);
    try {
      const response = await patientApi.getMoodHistory();
      const payload: any = response as any;
      setHistory(asArray(payload));
    } finally {
      setLoading(false);
    }
  };

  const onSubmitClinical = async () => {
    if (selectedClinical === 'PHQ-9' || selectedClinical === 'GAD-7') {
      if (!structuredAttempt) {
        setMessage(`${selectedClinical} questionnaire is not loaded yet. Please try again.`);
        return;
      }

      const unanswered = structuredAttempt.questions.some((question) => structuredAnswers[question.questionId] === undefined);
      if (unanswered) {
        setMessage(`Please answer all ${structuredAttempt.questions.length} ${selectedClinical} questions before submitting.`);
        return;
      }

      const submitClinicalFromAnswers = async (answerMap: Record<string, number>) => {
        setLoading(true);
        setMessage('');
        try {
          const answers = structuredAttempt.questions.map((question) => ({
            questionId: question.questionId,
            optionIndex: answerMap[question.questionId],
          }));
          const numericAnswers = structuredAttempt.questions.map((question) => answerMap[question.questionId]);
          const [structuredResult, journeyResponse] = await Promise.all([
            patientApi.submitStructuredAssessment(structuredAttempt.attemptId, { answers }),
            patientApi.submitClinicalJourney({ type: selectedClinical, answers: numericAnswers }),
          ]);
          const journey = parseJourneyPayload(journeyResponse) ?? (await loadLatestJourney());
          const selectedLabels = structuredAttempt.questions.map((question) => {
            const selectedOption = question.options.find((option) => option.optionIndex === answerMap[question.questionId]);
            return `${question.position}. ${selectedOption?.label || 'Unknown'}`;
          });
          const normalized = normalizeResultLevel(structuredResult.severityLevel);

          setMessage(`Saved: ${selectedClinical} • Score ${structuredResult.totalScore}`);
          setResultCard({
            type: selectedClinical,
            score: structuredResult.totalScore,
            level: normalized,
            recommendations: dedupeText([
              structuredResult.recommendation,
              structuredResult.action,
              ...(journey?.actions || []),
            ]),
            pathway: journey?.pathway,
            selectedPathway: journey?.selectedPathway,
            urgency: journey?.urgency,
            followUpDays: journey?.followUpDays,
            rationale: dedupeText([
              structuredResult.interpretation,
              ...selectedLabels,
              ...(journey?.rationale || []),
            ]),
          });
          setAssessmentHistory((prev) => [
            {
              id: structuredResult.attemptId,
              type: selectedClinical,
              score: structuredResult.totalScore,
              maxScore: selectedClinical === 'PHQ-9' ? 27 : 21,
              level: normalized,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          await loadMoodHistory();
          void startStructuredAssessment(selectedClinical);
        } finally {
          setLoading(false);
        }
      };

      await submitClinicalFromAnswers(structuredAnswers);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await patientApi.submitAssessment({
        type: selectedClinical,
        score,
      });
      const payload: any = response as any;
      const journey: JourneyPayload | null = parseJourneyPayload(response) ?? (await loadLatestJourney());
      const normalized = normalizeResultLevel(String(payload.severity || payload.result_level || getSeverity(Number(payload?.assessment?.score || payload.score || 0))));
      setMessage(`Saved: ${payload?.assessment?.type || payload.type || selectedClinical} • Score ${payload?.assessment?.score ?? payload.score}`);
      setResultCard({
        type: String(payload?.assessment?.type || payload.type || selectedClinical),
        score: Number(payload?.assessment?.score ?? payload.score ?? score),
        level: normalized,
        recommendations: journey?.actions?.length ? journey.actions : recommendationBySeverity[normalized],
        pathway: journey?.pathway,
        selectedPathway: journey?.selectedPathway,
        urgency: journey?.urgency,
        followUpDays: journey?.followUpDays,
        rationale: journey?.rationale || [],
      });
      await loadMoodHistory();
    } finally {
      setLoading(false);
    }
  };

  const onStructuredOptionSelect = async (question: StructuredAssessmentQuestion, optionIndex: number) => {
    if (!structuredAttempt || loading) return;

    const updatedAnswers = {
      ...structuredAnswers,
      [question.questionId]: optionIndex,
    };

    setStructuredAnswers(updatedAnswers);
    setMessage('');

    const isLastQuestion = currentStructuredQuestionIndex >= structuredAttempt.questions.length - 1;
    if (!isLastQuestion) {
      setCurrentStructuredQuestionIndex((prev) => prev + 1);
      return;
    }

    await (async () => {
      setLoading(true);
      setMessage('');
      try {
        const answers = structuredAttempt.questions.map((question) => ({
          questionId: question.questionId,
          optionIndex: updatedAnswers[question.questionId],
        }));
        const numericAnswers = structuredAttempt.questions.map((question) => updatedAnswers[question.questionId]);
        const [structuredResult, journeyResponse] = await Promise.all([
          patientApi.submitStructuredAssessment(structuredAttempt.attemptId, { answers }),
          patientApi.submitClinicalJourney({ type: selectedClinical, answers: numericAnswers }),
        ]);
        const journey = parseJourneyPayload(journeyResponse) ?? (await loadLatestJourney());
        const selectedLabels = structuredAttempt.questions.map((question) => {
          const selectedOption = question.options.find((option) => option.optionIndex === updatedAnswers[question.questionId]);
          return `${question.position}. ${selectedOption?.label || 'Unknown'}`;
        });
        const normalized = normalizeResultLevel(structuredResult.severityLevel);

        setMessage(`Saved: ${selectedClinical} • Score ${structuredResult.totalScore}`);
        setResultCard({
          type: selectedClinical,
          score: structuredResult.totalScore,
          level: normalized,
          recommendations: dedupeText([
            structuredResult.recommendation,
            structuredResult.action,
            ...(journey?.actions || []),
          ]),
          pathway: journey?.pathway,
          selectedPathway: journey?.selectedPathway,
          urgency: journey?.urgency,
          followUpDays: journey?.followUpDays,
          rationale: dedupeText([
            structuredResult.interpretation,
            ...selectedLabels,
            ...(journey?.rationale || []),
          ]),
        });
        setAssessmentHistory((prev) => [
          {
            id: structuredResult.attemptId,
            type: selectedClinical,
            score: structuredResult.totalScore,
            maxScore: selectedClinical === 'PHQ-9' ? 27 : 21,
            level: normalized,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        await loadMoodHistory();
        void startStructuredAssessment(selectedClinical);
      } finally {
        setLoading(false);
      }
    })();
  };

  const onSubmitDailyCheck = async () => {
    setLoading(true);
    setMessage('');
    try {
      const dailyScore = Object.values(dailyAnswers).reduce((sum, val) => sum + (val || 0), 0);
      const avgScore = dailyScore / dailyCheckQuestions.length;
      const level = getSeverity(Math.round(avgScore * 5)); // Scale to 0-20

      // Create local daily assessment record
      const today = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const newEntry = {
        id: `daily-${Date.now()}`,
        date: today,
        type: 'Daily Check',
        score: Math.round(dailyScore),
        maxScore: dailyCheckQuestions.length * 10,
        level,
        answers: dailyAnswers,
        createdAt: new Date().toISOString(),
      };

      // Add to history
      setAssessmentHistory((prev) => [newEntry, ...asArray(prev)]);
      setMessage(`Saved: Daily Check • Average Score ${Math.round(avgScore)}/10`);
      setResultCard({
        type: 'Daily Check',
        score: Math.round(dailyScore),
        level,
        recommendations: recommendationBySeverity[level],
        rationale: [
          `Mood: ${dailyAnswers.mood}/10`,
          `Sleep: ${dailyAnswers.sleep}/10`,
          `Energy: ${dailyAnswers.energy}/10`,
          `Anxiety: ${dailyAnswers.anxiety}/10 (lower is better)`,
          `Wellbeing: ${dailyAnswers.wellbeing}/10`,
        ],
      });

      // Reset form
      setDailyAnswers(dailyCheckQuestions.reduce((acc, q) => ({ ...acc, [q.key]: 5 }), {}));
    } finally {
      setLoading(false);
    }
  };

  const trendBars = useMemo(() => {
    const values = history.slice(0, 20).reverse().map((entry: any) => Number(entry.mood || 0));
    return values.length ? values : [2, 3, 4, 2, 3, 4, 3];
  }, [history]);

  const historyRows = useMemo(() => {
    const rows = asArray(assessmentHistory).map((entry: AssessmentHistoryEntry, index: number) => {
      const created = entry.createdAt ? new Date(entry.createdAt) : null;
      const fallbackDate = entry.date ? new Date(entry.date) : null;
      const parsedDate = created && !Number.isNaN(created.getTime())
        ? created
        : fallbackDate && !Number.isNaN(fallbackDate.getTime())
          ? fallbackDate
          : null;

      return {
        key: entry.id || `assessment-${index}`,
        type: entry.type || 'Assessment',
        score: Number(entry.score || 0),
        maxScore: Number(entry.maxScore || 27),
        level: String(entry.level || 'mild').toLowerCase(),
        dateLabel: parsedDate
          ? parsedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : entry.date || 'Unknown date',
        sortTs: parsedDate ? parsedDate.getTime() : 0,
      };
    });

    return rows.sort((a, b) => b.sortTs - a.sortTs);
  }, [assessmentHistory]);

  const historySummary = useMemo(() => {
    const severeCount = historyRows.filter((entry) => entry.level.includes('severe')).length;
    const latest = historyRows[0];
    const averageScore = historyRows.length
      ? Math.round(historyRows.reduce((sum, entry) => sum + entry.score, 0) / historyRows.length)
      : 0;

    return {
      total: historyRows.length,
      severeCount,
      averageScore,
      latestDate: latest?.dateLabel || 'No records',
    };
  }, [historyRows]);

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <h1 className="font-serif text-3xl font-light md:text-4xl">Assessments</h1>
      <p className="text-sm text-charcoal/65">Run daily checks or full clinical assessments and get actionable recommendations.</p>

      {!subscriptionLoading && !hasPremiumAssessmentAccess && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-soft-sm">
          <p className="text-sm font-semibold text-indigo-900">Advanced assessments are part of Platform Access.</p>
          <p className="mt-1 text-xs text-indigo-800">Upgrade to unlock PHQ-9 and GAD-7. Daily checks remain available.</p>
          <Link
            to="/patient/pricing"
            className="mt-3 inline-flex min-h-[36px] items-center rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Unlock Platform Access
          </Link>
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setMode('daily')}
          className={`rounded-2xl border p-4 text-left transition ${
            mode === 'daily' ? 'border-calm-sage bg-calm-sage/10' : 'border-calm-sage/15 bg-white/85 hover:bg-calm-sage/5'
          }`}
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4" />
            Daily Assessment
          </p>
          <p className="mt-1 text-xs text-charcoal/65">Track daily wellbeing & mood.</p>
        </button>

        <button
          type="button"
          onClick={() => {
            if (hasPremiumAssessmentAccess) {
              setMode('clinical');
            }
          }}
          className={`rounded-2xl border p-4 text-left transition ${
            mode === 'clinical' ? 'border-calm-sage bg-calm-sage/10' : 'border-calm-sage/15 bg-white/85 hover:bg-calm-sage/5'
          }`}
        >
          <p className="text-sm font-semibold">Clinical Assessments</p>
          <p className="mt-1 text-xs text-charcoal/65">
            PHQ-9 and GAD-7 scoring workflows.
            {!hasPremiumAssessmentAccess ? ' (Platform Access required)' : ''}
          </p>
        </button>
      </section>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
        {mode === 'daily' ? (
          <>
            <h2 className="text-base font-semibold">Daily Assessment</h2>
            <p className="mt-1 text-sm text-charcoal/65">Track your daily wellbeing across key dimensions (0=Low, 10=High).</p>

            <div className="mt-4 space-y-4">
              {dailyCheckQuestions.map((question) => (
                <div key={question.key} className="rounded-xl border border-calm-sage/10 p-4">
                  <p className="text-sm font-medium text-charcoal">{question.label}</p>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={dailyAnswers[question.key] || 5}
                    onChange={(event) =>
                      setDailyAnswers((prev) => ({
                        ...prev,
                        [question.key]: Number(event.target.value),
                      }))
                    }
                    className="mt-3 w-full"
                  />
                  <div className="mt-2 flex justify-between text-xs text-charcoal/60">
                    <span>Score: {dailyAnswers[question.key] || 5}/10</span>
                    {question.key !== 'anxiety' && (
                      <span className={dailyAnswers[question.key] >= 7 ? 'text-green-600' : dailyAnswers[question.key] >= 4 ? 'text-amber-600' : 'text-red-600'}>
                        {dailyAnswers[question.key] >= 7 ? '✓ Good' : dailyAnswers[question.key] >= 4 ? '◐ Moderate' : '✗ Low'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onSubmitDailyCheck}
                disabled={loading}
                className="inline-flex min-h-[40px] items-center rounded-full bg-charcoal px-4 text-sm font-medium text-cream disabled:opacity-60"
              >
                {loading ? 'Saving...' : 'Submit Daily Check'}
              </button>
            </div>
          </>
        ) : hasPremiumAssessmentAccess ? (
          <>
            <h2 className="text-base font-semibold">Clinical Assessments</h2>
            <p className="mt-1 text-sm text-charcoal/65">Choose a clinical tool. PHQ-9 and GAD-7 now use the full structured questionnaires.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {clinicalCards.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSelectedClinical(item.key);
                    setScore(Math.min(score, item.max));
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedClinical === item.key
                      ? 'border-calm-sage bg-calm-sage/10'
                      : 'border-calm-sage/15 bg-white/85 hover:bg-calm-sage/5'
                  }`}
                >
                  <p className="text-sm font-semibold">{item.key}</p>
                  <p className="mt-1 text-xs text-charcoal/65">{item.description}</p>
                </button>
              ))}
            </div>

            {selectedClinical === 'PHQ-9' || selectedClinical === 'GAD-7' ? (
              <div className="mt-4 rounded-2xl border border-calm-sage/15 bg-calm-sage/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{structuredAttempt?.template?.title || `${selectedClinical} Questionnaire`}</p>
                    <p className="mt-1 whitespace-pre-line text-xs text-charcoal/70">
                      {structuredAttempt?.template?.description || 'Over the last 2 weeks, how often have you been bothered by the following problems?'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void startStructuredAssessment(selectedClinical)}
                    disabled={structuredLoading || loading}
                    className="inline-flex min-h-[36px] items-center rounded-lg border border-calm-sage/25 px-3 text-xs font-semibold text-charcoal/75 disabled:opacity-60"
                  >
                    {structuredLoading ? 'Loading...' : `Restart ${selectedClinical}`}
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {structuredAttempt?.questions?.length ? (
                    <>
                      <div className="flex items-center justify-between rounded-xl border border-calm-sage/10 bg-white/70 px-3 py-2 text-xs text-charcoal/70">
                        <span>Question {Math.min(currentStructuredQuestionIndex + 1, structuredAttempt.questions.length)} of {structuredAttempt.questions.length}</span>
                        <span>{Object.keys(structuredAnswers).length} answered</span>
                      </div>

                      {structuredAttempt.questions[currentStructuredQuestionIndex] ? (
                        <div className="rounded-xl border border-calm-sage/10 bg-white p-4">
                          <p className="text-sm font-medium text-charcoal">
                            Q{structuredAttempt.questions[currentStructuredQuestionIndex].position}. {structuredAttempt.questions[currentStructuredQuestionIndex].prompt}
                          </p>
                          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                            {structuredAttempt.questions[currentStructuredQuestionIndex].options.map((option) => (
                              <button
                                key={`${structuredAttempt.questions[currentStructuredQuestionIndex].questionId}-${option.optionIndex}`}
                                type="button"
                                disabled={loading || structuredLoading}
                                onClick={() => void onStructuredOptionSelect(structuredAttempt.questions[currentStructuredQuestionIndex], option.optionIndex)}
                                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${structuredAnswers[structuredAttempt.questions[currentStructuredQuestionIndex].questionId] === option.optionIndex ? 'border-calm-sage bg-calm-sage/10 text-charcoal' : 'border-calm-sage/10 bg-white text-charcoal/75 hover:bg-calm-sage/5'} disabled:opacity-60`}
                              >
                                <span className="block font-medium text-charcoal">{option.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={() => setCurrentStructuredQuestionIndex((prev) => Math.max(0, prev - 1))}
                          disabled={loading || structuredLoading || currentStructuredQuestionIndex === 0}
                          className="inline-flex min-h-[36px] items-center rounded-lg border border-calm-sage/25 px-3 text-xs font-semibold text-charcoal/75 disabled:opacity-60"
                        >
                          Previous
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              {selectedClinical === 'PHQ-9' || selectedClinical === 'GAD-7' ? (
                <p className="text-xs text-charcoal/70">
                  {loading ? 'Submitting your responses...' : 'Select one option to move automatically to the next question.'}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={onSubmitClinical}
                  disabled={loading || structuredLoading}
                  className="inline-flex min-h-[40px] items-center rounded-full bg-charcoal px-4 text-sm font-medium text-cream disabled:opacity-60"
                >
                  {loading ? 'Saving...' : 'Save Clinical Assessment'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
            <h2 className="text-base font-semibold text-indigo-900">Clinical Assessments Locked</h2>
            <p className="mt-1 text-sm text-indigo-800">
              Activate Platform Access to unlock PHQ-9 and GAD-7 clinical reports.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/patient/pricing"
                className="inline-flex min-h-[36px] items-center rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                View Platform Plan
              </Link>
            </div>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={loadMoodHistory}
            className="inline-flex min-h-[40px] items-center rounded-full border border-calm-sage/25 px-4 text-sm font-medium text-charcoal/75"
          >
            Refresh Trend Data
          </button>
        </div>

        {message ? <p className="mt-3 text-sm text-calm-sage">{message}</p> : null}
      </section>

      {resultCard ? (
        <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
          <h2 className="text-base font-semibold">Assessment Result</h2>
          <p className="mt-1 text-sm text-charcoal/70">
            Your Result: <span className="font-semibold">{resultCard.level.toUpperCase()}</span> ({resultCard.type} • Score {resultCard.score})
          </p>
          {resultCard.pathway ? (
            <p className="mt-2 text-sm text-charcoal/75">
              {typeof resultCard.followUpDays === 'number' ? `Recommended follow-up in ${resultCard.followUpDays} day(s).` : ''}
            </p>
          ) : typeof resultCard.followUpDays === 'number' ? (
            <p className="mt-2 text-sm text-charcoal/75">Recommended follow-up in <span className="font-semibold">{resultCard.followUpDays} day(s)</span>.</p>
          ) : null}
          {resultCard.rationale?.length ? (
            <div className="mt-3">
              <p className="text-sm font-medium text-charcoal">Assessment breakdown</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-charcoal/75">
                {resultCard.rationale.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <button
                type="button"
                onClick={() => void startCarePath('recommended')}
                className="rounded-xl border border-calm-sage/25 bg-white p-3 text-left hover:border-calm-sage/45"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-calm-sage">Recommended Care</p>
                <p className="mt-1 text-sm font-medium text-charcoal">Best match from your assessment</p>
              </button>
              <button
                type="button"
                onClick={() => void startCarePath('direct')}
                className="rounded-xl border border-calm-sage/25 bg-white p-3 text-left hover:border-calm-sage/45"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-calm-sage">Direct Selection</p>
                <p className="mt-1 text-sm font-medium text-charcoal">Choose any provider category and fee</p>
              </button>
              <button
                type="button"
                onClick={() => void startCarePath('urgent')}
                className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-left hover:border-rose-300"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Urgent Care</p>
                <p className="mt-1 text-sm font-medium text-rose-900">Priority psychiatrist pathway</p>
              </button>
            </div>
          </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
        <h2 className="text-base font-semibold">Progress Analytics</h2>
        <p className="mt-1 text-sm text-charcoal/65">Mood trend over recent entries for clinical context</p>

        <div className="mt-4 flex h-24 items-end gap-1.5">
          {trendBars.map((value, index) => (
            <span
              key={index}
              className="w-3 rounded-t bg-calm-sage/70"
              style={{ height: `${Math.max(10, value * 14)}px` }}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="h-5 w-5 text-calm-sage" />
            Assessment History & Reports
          </h2>
          <span className="text-sm text-charcoal/60">{historySummary.total} assessments</span>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-calm-sage/10 bg-calm-sage/5 p-3">
            <p className="text-xs uppercase tracking-wide text-charcoal/60">Average Score</p>
            <p className="mt-1 text-lg font-semibold text-charcoal">{historySummary.averageScore}</p>
          </div>
          <div className="rounded-xl border border-calm-sage/10 bg-calm-sage/5 p-3">
            <p className="text-xs uppercase tracking-wide text-charcoal/60">Severe Flags</p>
            <p className="mt-1 text-lg font-semibold text-charcoal">{historySummary.severeCount}</p>
          </div>
          <div className="rounded-xl border border-calm-sage/10 bg-calm-sage/5 p-3">
            <p className="text-xs uppercase tracking-wide text-charcoal/60">Latest Assessment</p>
            <p className="mt-1 text-sm font-semibold text-charcoal">{historySummary.latestDate}</p>
          </div>
        </div>

        {historyRows.length === 0 ? (
          <p className="text-center text-sm text-charcoal/60 py-8">No assessments yet. Complete your first assessment above to start tracking.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {historyRows.slice(0, 20).map((entry) => (
              <div key={entry.key} className="rounded-lg border border-calm-sage/10 bg-calm-sage/5 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal">{entry.type}</p>
                    <p className="mt-1 text-xs text-charcoal/60">{entry.dateLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-charcoal">
                      {entry.score}/{entry.maxScore}
                    </p>
                    <p className={`text-xs font-medium uppercase tracking-wide ${
                      entry.level === 'severe' ? 'text-red-600' :
                      entry.level === 'moderate' ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {entry.level}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={loadAssessmentHistory}
          className="mt-4 w-full rounded-lg border border-calm-sage/25 px-4 py-2 text-sm font-medium text-charcoal/75 hover:bg-calm-sage/5 transition"
        >
          Refresh History
        </button>
      </section>
    </div>
  );
}
