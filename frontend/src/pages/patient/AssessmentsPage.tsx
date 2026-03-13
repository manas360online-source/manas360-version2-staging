import { useEffect, useMemo, useState } from 'react';
import { patientApi, type StructuredAssessmentQuestion, type StructuredAssessmentStartResponse } from '../../api/patient';
import { parseJourneyPayload, type JourneyPayload } from '../../utils/journey';
import { theme } from '../../theme/theme';
import { Calendar, TrendingUp } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

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

const toLocalDateKey = (value: Date = new Date()): string => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const lockKey = (assessmentType: 'daily' | 'PHQ-9' | 'GAD-7', dayKey: string) => `patient-assessment-lock:${assessmentType}:${dayKey}`;

export default function AssessmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const todayKey = useMemo(() => toLocalDateKey(), []);
  const [mode, setMode] = useState<AssessmentMode>('daily');
  const [selectedClinical, setSelectedClinical] = useState<ClinicalAssessmentKey>('PHQ-9');
  const [score, setScore] = useState(10);
  // quickAnswers removed
  const [dailyAnswers, setDailyAnswers] = useState<Record<string, number>>(
    dailyCheckQuestions.reduce((acc, q) => ({ ...acc, [q.key]: 5 }), {})
  );
  const [currentDailyIndex, setCurrentDailyIndex] = useState(0);
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
    recommendedProvider?: string;
    followUpDays?: number;
    rationale?: string[];
  }>(null);
  const [submissionLocks, setSubmissionLocks] = useState<Record<'daily' | 'PHQ-9' | 'GAD-7', boolean>>({
    daily: false,
    'PHQ-9': false,
    'GAD-7': false,
  });
  const hasPremiumAssessmentAccess = useMemo(() => isSubscriptionActive(subscription), [subscription]);
  const selectedClinicalLocked = selectedClinical === 'PHQ-9' ? submissionLocks['PHQ-9'] : submissionLocks['GAD-7'];
  const clinicalPairCompletedToday = submissionLocks['PHQ-9'] && submissionLocks['GAD-7'];

  const refreshSubmissionLocks = () => {
    setSubmissionLocks({
      daily: localStorage.getItem(lockKey('daily', todayKey)) === '1',
      'PHQ-9': localStorage.getItem(lockKey('PHQ-9', todayKey)) === '1',
      'GAD-7': localStorage.getItem(lockKey('GAD-7', todayKey)) === '1',
    });
  };

  const markSubmittedToday = (assessmentType: 'daily' | 'PHQ-9' | 'GAD-7') => {
    localStorage.setItem(lockKey(assessmentType, todayKey), '1');
    refreshSubmissionLocks();
  };

  const primaryResultInsight = useMemo(() => {
    if (!resultCard) return '';
    const rationale = Array.isArray(resultCard.rationale) ? resultCard.rationale : [];
    const recommendations = Array.isArray(resultCard.recommendations) ? resultCard.recommendations : [];
    const merged = dedupeText([...rationale, ...recommendations]);

    const indicator = merged.find((line) => /indicates?/i.test(line));
    if (indicator) return indicator;

    if (merged.length > 0) return merged[0];
    return `${resultCard.type} indicates ${resultCard.level} symptoms.`;
  }, [resultCard]);

  const startCarePath = async (path: 'recommended' | 'direct' | 'urgent') => {
    const pathway = path === 'urgent' ? 'urgent-care' : path === 'direct' ? 'direct-provider' : 'stepped-care';
    const recommendedProvider = String(resultCard?.recommendedProvider || '').toLowerCase();
    const preferredSpecialization = path === 'urgent'
      ? 'Psychiatrist'
      : path === 'recommended'
        ? (recommendedProvider.includes('psychiatrist') ? 'Psychiatrist' : 'Psychologist')
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
    const urgency = path === 'urgent'
      ? 'urgent'
      : String(resultCard?.urgency || '').toLowerCase().includes('urgent')
        ? 'urgent'
        : String(resultCard?.urgency || '').toLowerCase().includes('priority')
          ? 'priority'
          : resultCard?.level === 'severe'
            ? 'urgent'
            : 'routine';
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
    const params = new URLSearchParams(location.search);
    const modeParam = String(params.get('mode') || '').toLowerCase();
    if (modeParam === 'clinical' && mode !== 'clinical') {
      setMode('clinical');
    }
  }, [location.search, mode]);

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
    refreshSubmissionLocks();
  }, [todayKey]);

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
      if (selectedClinicalLocked) {
        setMessage(`${selectedClinical} is already completed today. You can take it again tomorrow.`);
        return;
      }

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
            recommendedProvider: journey?.recommendedProvider,
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
          markSubmittedToday(selectedClinical);
          const otherClinical: ClinicalAssessmentKey = selectedClinical === 'PHQ-9' ? 'GAD-7' : 'PHQ-9';
          const bothDoneAfterSubmit = localStorage.getItem(lockKey('PHQ-9', todayKey)) === '1'
            && localStorage.getItem(lockKey('GAD-7', todayKey)) === '1';

          if (!bothDoneAfterSubmit) {
            setResultCard(null);
            setSelectedClinical(otherClinical);
            await startStructuredAssessment(otherClinical);
            setMessage(`Saved: ${selectedClinical} • Score ${structuredResult.totalScore}. Continue with ${otherClinical} to finish clinical screening.`);
            return;
          }

          await loadMoodHistory();
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
        recommendedProvider: journey?.recommendedProvider,
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
    if (selectedClinicalLocked) {
      setMessage(`${selectedClinical} is already completed today. You can take it again tomorrow.`);
      return;
    }

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
          recommendedProvider: journey?.recommendedProvider,
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
        markSubmittedToday(selectedClinical);
        const otherClinical: ClinicalAssessmentKey = selectedClinical === 'PHQ-9' ? 'GAD-7' : 'PHQ-9';
        const bothDoneAfterSubmit = localStorage.getItem(lockKey('PHQ-9', todayKey)) === '1'
          && localStorage.getItem(lockKey('GAD-7', todayKey)) === '1';

        if (!bothDoneAfterSubmit) {
          setResultCard(null);
          setSelectedClinical(otherClinical);
          await startStructuredAssessment(otherClinical);
          setMessage(`Saved: ${selectedClinical} • Score ${structuredResult.totalScore}. Continue with ${otherClinical} to finish clinical screening.`);
          return;
        }

        await loadMoodHistory();
      } finally {
        setLoading(false);
      }
    })();
  };

  const onSubmitDailyCheck = async () => {
    if (submissionLocks.daily) {
      setMessage('Daily assessment is already completed today. Please come back tomorrow.');
      return;
    }

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
      markSubmittedToday('daily');

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
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 md:px-6 pb-20 lg:pb-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-wellness-hero p-6 shadow-wellness-md md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(133,167,154,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(30,144,255,0.08),transparent_34%)]" />
        <div className="relative z-10 max-w-3xl">
          <p className="inline-flex rounded-full bg-white/86 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-charcoal/50 shadow-wellness-sm">Clinical check-ins</p>
          <h1 className="mt-4 font-serif text-3xl font-semibold text-charcoal md:text-5xl">Mental Health Assessments</h1>
          <p className="mt-3 text-sm text-wellness-muted md:text-base">Complete quick daily reflections or structured PHQ-9 and GAD-7 screening in a calmer one-question-at-a-time flow.</p>
        </div>
      </section>

      {!subscriptionLoading && !hasPremiumAssessmentAccess && (
        <section className="rounded-[1.75rem] border border-indigo-200 bg-indigo-50/70 p-4 shadow-wellness-sm">
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode('daily')}
          className={`rounded-[1.75rem] p-5 text-left transition ${
            mode === 'daily'
              ? 'bg-wellness-aqua shadow-wellness-sm'
              : 'bg-white/92 shadow-wellness-sm hover:bg-white'
          }`}
        >
          <p className="flex items-center gap-2 text-lg font-semibold text-charcoal">
            <Calendar className="h-5 w-5" />
            Daily Assessment
          </p>
          <p className="mt-2 text-base text-charcoal/70">Track daily wellbeing & mood.</p>
        </button>

        <button
          type="button"
          onClick={() => {
            if (hasPremiumAssessmentAccess) {
              setMode('clinical');
            }
          }}
          className={`rounded-[1.75rem] p-5 text-left transition ${
            mode === 'clinical'
              ? 'bg-wellness-aqua shadow-wellness-sm'
              : 'bg-white/92 shadow-wellness-sm hover:bg-white'
          }`}
        >
          <p className="text-lg font-semibold text-charcoal">Clinical Assessments</p>
          <p className="mt-2 text-base text-charcoal/70">
            PHQ-9 and GAD-7 scoring workflows.
            {!hasPremiumAssessmentAccess ? ' (Platform Access required)' : ''}
          </p>
        </button>
      </section>

      <section className="wellness-panel p-4 md:p-6">
        {mode === 'daily' ? (
          <>
            <h2 className="font-serif text-2xl font-semibold text-charcoal">Daily Assessment</h2>
            <p className="mt-2 text-base text-charcoal/70">Track your daily wellbeing across key dimensions (0=Low, 10=High).</p>

            <div className="mt-4">
              <div className="mb-4">
                <p className="text-base font-medium text-wellness-muted">Question {currentDailyIndex + 1} of {dailyCheckQuestions.length}</p>
                <div className="mt-2 h-2 w-full rounded-full bg-calm-sage/15">
                  <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${((currentDailyIndex + 1) / dailyCheckQuestions.length) * 100}%`, backgroundColor: theme.colors.brandTopbar }} />
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-white/92 p-5 shadow-wellness-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">One question at a time</p>
                <p className="mt-2 text-xl font-medium text-charcoal">{dailyCheckQuestions[currentDailyIndex].label}</p>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={dailyAnswers[dailyCheckQuestions[currentDailyIndex].key] || 5}
                  onChange={(event) => {
                    const val = Number(event.target.value);
                    setDailyAnswers((prev) => ({ ...prev, [dailyCheckQuestions[currentDailyIndex].key]: val }));
                    setTimeout(() => setCurrentDailyIndex((prev) => Math.min(prev + 1, dailyCheckQuestions.length - 1)), 180);
                  }}
                  className="mt-3 w-full"
                />
                <div className="mt-3 flex justify-between text-sm text-charcoal/65">
                  <span>Score: {dailyAnswers[dailyCheckQuestions[currentDailyIndex].key] || 5}/10</span>
                  {dailyCheckQuestions[currentDailyIndex].key !== 'anxiety' && (
                    <span className={dailyAnswers[dailyCheckQuestions[currentDailyIndex].key] >= 7 ? 'text-green-600' : dailyAnswers[dailyCheckQuestions[currentDailyIndex].key] >= 4 ? 'text-amber-600' : 'text-red-600'}>
                      {dailyAnswers[dailyCheckQuestions[currentDailyIndex].key] >= 7 ? '✓ Good' : dailyAnswers[dailyCheckQuestions[currentDailyIndex].key] >= 4 ? '◐ Moderate' : '✗ Low'}
                    </span>
                  )}
                </div>
              </div>

                <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentDailyIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={currentDailyIndex === 0}
                  className={`rounded-full px-4 py-2 text-base font-medium transition ${currentDailyIndex === 0 ? 'bg-wellness-surface text-wellness-muted cursor-not-allowed' : 'bg-white text-charcoal shadow-wellness-sm hover:bg-wellness-aqua'}`}
                >
                  Previous
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentDailyIndex((prev) => Math.min(prev + 1, dailyCheckQuestions.length - 1))}
                    disabled={currentDailyIndex >= dailyCheckQuestions.length - 1}
                    className={`rounded-full px-4 py-2 text-base font-medium transition ${currentDailyIndex >= dailyCheckQuestions.length - 1 ? 'bg-wellness-surface text-wellness-muted cursor-not-allowed' : 'bg-[#1E90FF] text-white shadow-wellness-sm'}`}
                    style={currentDailyIndex >= dailyCheckQuestions.length - 1 ? undefined : { backgroundColor: theme.colors.brandTopbar }}
                  >
                    Next
                  </button>

                  <button
                    type="button"
                    onClick={onSubmitDailyCheck}
                    disabled={loading || submissionLocks.daily}
                    className="wellness-primary-btn min-h-[40px] px-4 text-base disabled:opacity-60"
                  >
                    {loading ? 'Saving...' : submissionLocks.daily ? 'Completed Today' : 'Submit Daily Check'}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : hasPremiumAssessmentAccess ? (
          <>
            <h2 className="font-serif text-2xl font-semibold text-charcoal">Clinical Assessments</h2>
            <p className="mt-2 text-base text-charcoal/70">Choose a clinical tool. PHQ-9 and GAD-7 now use the full structured questionnaires.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
              {clinicalCards.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSelectedClinical(item.key);
                    setScore(Math.min(score, item.max));
                  }}
                  className={`rounded-[1.5rem] p-5 text-left transition ${
                    selectedClinical === item.key
                      ? 'bg-wellness-aqua shadow-wellness-sm'
                      : 'bg-white/88 shadow-wellness-sm hover:bg-white'
                  }`}
                >
                  <p className="text-lg font-semibold text-charcoal">{item.key}</p>
                  <p className="mt-2 text-sm text-charcoal/70">{item.description}</p>
                </button>
              ))}
            </div>

            {selectedClinical === 'PHQ-9' || selectedClinical === 'GAD-7' ? (
              <div className="mt-4 rounded-[1.75rem] bg-white/88 p-5 shadow-wellness-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Guided screen</p>
                    <p className="mt-2 text-xl font-semibold text-charcoal">{structuredAttempt?.template?.title || `${selectedClinical} Questionnaire`}</p>
                    <p className="mt-2 text-sm text-charcoal/70">Please answer all questions based on your experience over the last 2 weeks.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void startStructuredAssessment(selectedClinical)}
                    disabled={structuredLoading || loading || selectedClinicalLocked}
                    className="wellness-secondary-btn min-h-[36px] px-3 text-sm disabled:opacity-60"
                  >
                    {structuredLoading ? 'Loading...' : selectedClinicalLocked ? 'Completed Today' : `Restart ${selectedClinical}`}
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {structuredAttempt?.questions?.length ? (
                    <>
                      <div className="flex items-center justify-between rounded-2xl bg-wellness-card px-4 py-3 text-sm text-charcoal/70">
                        <span>Question {Math.min(currentStructuredQuestionIndex + 1, structuredAttempt.questions.length)} of {structuredAttempt.questions.length}</span>
                        <span>{Object.keys(structuredAnswers).length} answered</span>
                      </div>

                      {structuredAttempt.questions[currentStructuredQuestionIndex] ? (
                        <div className="rounded-[1.5rem] bg-gradient-wellness-surface p-5 shadow-wellness-sm">
                          <p className="text-xl font-medium text-charcoal">
                            Q{structuredAttempt.questions[currentStructuredQuestionIndex].position}. {structuredAttempt.questions[currentStructuredQuestionIndex].prompt}
                          </p>
                          <div className="mt-4 grid gap-3">
                            {structuredAttempt.questions[currentStructuredQuestionIndex].options.map((option) => (
                              <button
                                key={`${structuredAttempt.questions[currentStructuredQuestionIndex].questionId}-${option.optionIndex}`}
                                type="button"
                                disabled={loading || structuredLoading || selectedClinicalLocked}
                                onClick={() => void onStructuredOptionSelect(structuredAttempt.questions[currentStructuredQuestionIndex], option.optionIndex)}
                                className={`rounded-full px-5 py-4 text-left text-base transition ${structuredAnswers[structuredAttempt.questions[currentStructuredQuestionIndex].questionId] === option.optionIndex ? 'bg-[#1E90FF] text-white shadow-wellness-sm' : 'bg-white text-charcoal/82 shadow-wellness-sm hover:bg-wellness-aqua'} disabled:opacity-60`}
                              >
                                <span className={`block font-medium ${structuredAnswers[structuredAttempt.questions[currentStructuredQuestionIndex].questionId] === option.optionIndex ? 'text-white' : 'text-charcoal'}`}>{option.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={() => setCurrentStructuredQuestionIndex((prev) => Math.max(0, prev - 1))}
                          disabled={loading || structuredLoading || currentStructuredQuestionIndex === 0 || selectedClinicalLocked}
                          className="wellness-secondary-btn min-h-[36px] px-3 text-sm disabled:opacity-60"
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
                <p className="text-sm text-charcoal/70">
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
          <div className="rounded-[1.5rem] border border-indigo-200 bg-indigo-50/60 p-4">
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
            className="wellness-secondary-btn min-h-[40px] px-4 text-sm"
          >
            Refresh Trend Data
          </button>
        </div>

        {message ? <p className="mt-3 text-sm text-calm-sage">{message}</p> : null}
      </section>

      {resultCard ? (
        <section className="wellness-panel p-5">
          <h2 className="text-lg font-semibold">Assessment Result</h2>
          <p className="mt-2 text-xl font-medium text-charcoal">{primaryResultInsight}</p>
          <p className="mt-2 text-sm text-charcoal/70">
            {resultCard.type} • Score {resultCard.score}
            {typeof resultCard.followUpDays === 'number' ? ` • Follow-up in ${resultCard.followUpDays} day(s)` : ''}
          </p>
        </section>
      ) : null}

      {resultCard && clinicalPairCompletedToday && (resultCard.type === 'PHQ-9' || resultCard.type === 'GAD-7') ? (
        <section className="wellness-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-calm-sage">Recommended Next Step</p>
          <h3 className="mt-2 text-xl font-semibold text-charcoal">Choose your care path</h3>
          <p className="mt-1 text-sm text-charcoal/70">{primaryResultInsight}</p>

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <button
              type="button"
              onClick={() => void startCarePath('recommended')}
              className="rounded-[1.4rem] bg-white p-4 text-left shadow-wellness-sm hover:bg-wellness-card"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-calm-sage">Recommended Care</p>
              <p className="mt-1 text-sm font-medium text-charcoal">Best match from your assessment</p>
            </button>
            <button
              type="button"
              onClick={() => void startCarePath('direct')}
              className="rounded-[1.4rem] bg-white p-4 text-left shadow-wellness-sm hover:bg-wellness-card"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-calm-sage">Direct Selection</p>
              <p className="mt-1 text-sm font-medium text-charcoal">Choose any provider category and fee</p>
            </button>
            <button
              type="button"
              onClick={() => void startCarePath('urgent')}
              className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Urgent Care</p>
              <p className="mt-1 text-sm font-medium text-rose-900">Priority psychiatrist pathway</p>
            </button>
          </div>
        </section>
      ) : null}

      <section className="wellness-panel p-5">
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

      <section className="wellness-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="h-5 w-5 text-calm-sage" />
            Assessment History & Reports
          </h2>
          <span className="text-sm text-charcoal/60">{historySummary.total} assessments</span>
        </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[1.25rem] bg-white/88 p-3 shadow-wellness-sm">
            <p className="text-xs uppercase tracking-wide text-charcoal/60">Average Score</p>
            <p className="mt-1 text-lg font-semibold text-charcoal">{historySummary.averageScore}</p>
          </div>
          <div className="rounded-[1.25rem] bg-white/88 p-3 shadow-wellness-sm">
            <p className="text-xs uppercase tracking-wide text-charcoal/60">Severe Flags</p>
            <p className="mt-1 text-lg font-semibold text-charcoal">{historySummary.severeCount}</p>
          </div>
          <div className="rounded-[1.25rem] bg-white/88 p-3 shadow-wellness-sm">
            <p className="text-xs uppercase tracking-wide text-charcoal/60">Latest Assessment</p>
            <p className="mt-1 text-sm font-semibold text-charcoal">{historySummary.latestDate}</p>
          </div>
        </div>

        {historyRows.length === 0 ? (
          <p className="text-center text-sm text-charcoal/60 py-8">No assessments yet. Complete your first assessment above to start tracking.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {historyRows.slice(0, 20).map((entry) => (
              <div key={entry.key} className="rounded-[1.25rem] bg-white/88 p-3 shadow-wellness-sm">
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
          className="wellness-secondary-btn mt-4 w-full px-4 py-2 text-sm"
        >
          Refresh History
        </button>
      </section>
    </div>
  );
}
