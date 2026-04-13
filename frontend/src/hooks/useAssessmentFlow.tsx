import { useState, useCallback, useMemo } from 'react';
import { patientApi } from '../api/patient';
import { parseJourneyPayload } from '../utils/journey';
import type {
  ClinicalAssessmentKey,
  ClinicalFlowPhase,
  AssessmentDraft,
  Provider,
  SmartMatchProviderType,
  BookingContext,
  JourneyRecommendation
} from '../types/patient';
import { useAuth } from '../context/AuthContext';
import { useErrorHandler } from './useErrorHandler';
import { useLoadingStates } from './useLoadingStates';

const PHQ9_TEMPLATE_KEY = 'phq-9-paid-assessment-v1';
const GAD7_TEMPLATE_KEY = 'gad-7-paid-assessment-v1';
const structuredTemplateKeys: Record<ClinicalAssessmentKey, string> = {
  'PHQ-9': PHQ9_TEMPLATE_KEY,
  'GAD-7': GAD7_TEMPLATE_KEY,
};

const ASSESSMENT_DRAFT_BASE_KEY = 'patient-clinical-assessment-draft-v1';
export const getDraftStorageKey = (userId?: string) =>
  userId ? `${ASSESSMENT_DRAFT_BASE_KEY}:${userId}` : ASSESSMENT_DRAFT_BASE_KEY;
const ASSESSMENT_DRAFT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const RESUMABLE_ASSESSMENT_PHASES: ClinicalFlowPhase[] = ['intro', 'question', 'loading-next', 'next-phase', 'provider-list'];

const toLocalDateKey = (value: Date = new Date()): string => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const useAssessmentFlow = () => {
  const { user } = useAuth();
  const userId = user?.id || undefined;
  const ASSESSMENT_DRAFT_STORAGE_KEY = getDraftStorageKey(userId);

  const { addError } = useErrorHandler();
  const [loadingStates, loadingActions] = useLoadingStates({ assessment: false });

  // Assessment state
  const [isClinicalAssessmentOpen, setIsClinicalAssessmentOpen] = useState(false);
  const [clinicalFlowPhase, setClinicalFlowPhase] = useState<ClinicalFlowPhase>('intro');
  const [clinicalStartWith, setClinicalStartWith] = useState<ClinicalAssessmentKey>('PHQ-9');
  const [assessmentOrder, setAssessmentOrder] = useState<ClinicalAssessmentKey[]>(['PHQ-9', 'GAD-7']);
  const [activeAssessmentIndex, setActiveAssessmentIndex] = useState(0);
  const [structuredAttempt, setStructuredAttempt] = useState<any>(null);
  const [structuredAnswers, setStructuredAnswers] = useState<Record<string, number>>({});
  const [currentStructuredQuestionIndex, setCurrentStructuredQuestionIndex] = useState(0);
  const [clinicalFlowError, setClinicalFlowError] = useState<string | null>(null);
  const [clinicalJourney, setClinicalJourney] = useState<JourneyRecommendation | null>(null);
  const [clinicalResults, setClinicalResults] = useState<Array<{ type: ClinicalAssessmentKey; score: number; severity: string }>>([]);
  const [suggestedProviders, setSuggestedProviders] = useState<Provider[]>([]);
  const [activeCarePathLabel, setActiveCarePathLabel] = useState('');
  const [bookingContext, setBookingContext] = useState<BookingContext>(null);
  const [smartMatchPreferences, setSmartMatchPreferences] = useState<{
    initialProviderType: SmartMatchProviderType;
    lockProviderType: boolean;
  }>({
    initialProviderType: 'ALL',
    lockProviderType: false,
  });

  // Draft management
  const clearAssessmentDraft = useCallback(() => {
    sessionStorage.removeItem(ASSESSMENT_DRAFT_STORAGE_KEY);
    localStorage.removeItem(ASSESSMENT_DRAFT_STORAGE_KEY);
  }, [ASSESSMENT_DRAFT_STORAGE_KEY]);

  const saveAssessmentDraft = useCallback(() => {
    const draft: AssessmentDraft = {
      savedAt: Date.now(),
      dayKey: toLocalDateKey(),
      clinicalFlowPhase,
      clinicalStartWith,
      assessmentOrder,
      activeAssessmentIndex,
      structuredAttempt,
      structuredAnswers,
      currentStructuredQuestionIndex,
      clinicalJourney,
      clinicalResults,
      suggestedProviders,
      activeCarePathLabel,
    };
    const serialized = JSON.stringify(draft);
    sessionStorage.setItem(ASSESSMENT_DRAFT_STORAGE_KEY, serialized);
    localStorage.setItem(ASSESSMENT_DRAFT_STORAGE_KEY, serialized);
  }, [
    ASSESSMENT_DRAFT_STORAGE_KEY,
    clinicalFlowPhase,
    clinicalStartWith,
    assessmentOrder,
    activeAssessmentIndex,
    structuredAttempt,
    structuredAnswers,
    currentStructuredQuestionIndex,
    clinicalJourney,
    clinicalResults,
    suggestedProviders,
    activeCarePathLabel,
  ]);

  const loadAssessmentDraft = useCallback((): AssessmentDraft | null => {
    const raw = localStorage.getItem(ASSESSMENT_DRAFT_STORAGE_KEY)
      || sessionStorage.getItem(ASSESSMENT_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as AssessmentDraft;
      if (!parsed?.savedAt || Date.now() - parsed.savedAt > ASSESSMENT_DRAFT_MAX_AGE_MS) {
        clearAssessmentDraft();
        return null;
      }
      if (parsed.dayKey !== toLocalDateKey()) {
        clearAssessmentDraft();
        return null;
      }
      if (!RESUMABLE_ASSESSMENT_PHASES.includes(parsed.clinicalFlowPhase)) {
        clearAssessmentDraft();
        return null;
      }
      return parsed;
    } catch {
      clearAssessmentDraft();
      return null;
    }
  }, [clearAssessmentDraft, ASSESSMENT_DRAFT_STORAGE_KEY]);

  // Assessment actions
  const resetClinicalAssessmentState = useCallback(() => {
    setClinicalFlowPhase('intro');
    setClinicalStartWith('PHQ-9');
    setAssessmentOrder(['PHQ-9', 'GAD-7']);
    setActiveAssessmentIndex(0);
    setStructuredAttempt(null);
    setStructuredAnswers({});
    setCurrentStructuredQuestionIndex(0);
    setClinicalFlowError(null);
    setClinicalJourney(null);
    setClinicalResults([]);
    setSuggestedProviders([]);
    setActiveCarePathLabel('');
    setBookingContext(null);
  }, []);

  const loadStructuredAssessment = useCallback(async (assessmentType: ClinicalAssessmentKey) => {
    loadingActions.startLoading('assessment');
    try {
      const response = await patientApi.startStructuredAssessment({
        templateKey: structuredTemplateKeys[assessmentType]
      });
      setStructuredAttempt(response);
      setStructuredAnswers({});
      setCurrentStructuredQuestionIndex(0);
    } catch (error: any) {
      addError({
        type: 'server',
        message: 'Unable to load clinical assessment right now.',
        retryable: true,
        action: () => loadStructuredAssessment(assessmentType),
      });
    } finally {
      loadingActions.stopLoading('assessment');
    }
  }, [addError, loadingActions]);

  const beginClinicalAssessment = useCallback(async () => {
    // Check if user has already completed both onboarding assessments once.
    const [structuredResponse] = await Promise.all([
      patientApi.getStructuredAssessmentHistory().catch(() => null),
    ]);

    const structured = Array.isArray((structuredResponse as any)?.items)
      ? (structuredResponse as any).items
      : Array.isArray((structuredResponse as any)?.data)
        ? (structuredResponse as any).data
        : [];

    const hasCompletedPHQ9 = structured.some((entry: any) =>
      String(entry.templateTitle || entry.templateKey || '').toLowerCase().includes('phq-9') ||
      String(entry.templateTitle || entry.templateKey || '').toLowerCase().includes('phq9')
    );
    const hasCompletedGAD7 = structured.some((entry: any) =>
      String(entry.templateTitle || entry.templateKey || '').toLowerCase().includes('gad-7') ||
      String(entry.templateTitle || entry.templateKey || '').toLowerCase().includes('gad7')
    );

    if (hasCompletedPHQ9 && hasCompletedGAD7) {
      addError({
        type: 'validation',
        message: 'PHQ-9 and GAD-7 onboarding is already completed.',
        retryable: false,
      });
      return;
    }

    clearAssessmentDraft();
    const order: ClinicalAssessmentKey[] = [
      clinicalStartWith,
      clinicalStartWith === 'PHQ-9' ? 'GAD-7' : 'PHQ-9',
    ];

    setAssessmentOrder(order);
    setActiveAssessmentIndex(0);
    setClinicalJourney(null);
    setClinicalResults([]);
    setClinicalFlowError(null);
    loadingActions.startLoading('assessment');

    try {
      await loadStructuredAssessment(order[0]);
      setClinicalFlowPhase('question');
    } catch (error: any) {
      setClinicalFlowError(error?.message || 'Unable to load clinical assessment right now.');
    } finally {
      loadingActions.stopLoading('assessment');
    }
  }, [clinicalStartWith, addError, clearAssessmentDraft, loadStructuredAssessment, loadingActions]);

  const submitCurrentStructuredAssessment = useCallback(async (answerMap: Record<string, number>) => {
    if (!structuredAttempt) return;

    const activeType = assessmentOrder[activeAssessmentIndex];
    loadingActions.startLoading('assessment');
    setClinicalFlowError(null);

    try {
      const answers = structuredAttempt.questions.map((question: any) => ({
        questionId: question.questionId,
        optionIndex: answerMap[question.questionId],
      }));
      const numericAnswers = structuredAttempt.questions.map((question: any) => answerMap[question.questionId]);

      // We call journey submission to get the recommendation (needed for care path)
      // but we will 'commit' the assessment record itself only during booking confirmation
      const journeyResponse = await patientApi.submitClinicalJourney({ type: activeType, answers: numericAnswers });
      const journey = parseJourneyPayload(journeyResponse);
      if (journey) setClinicalJourney(journey);

      // Store answers and basic result in local state/draft
      // Note: We are NOT calling patientApi.submitStructuredAssessment here yet
      // unless we want to keep the score calculation logic on the backend.
      // For now, we simulate the 'record' in clinicalResults.
      const totalScore = Object.values(answerMap).reduce((acc, val) => acc + val, 0);

      setClinicalResults((prev) => [
        ...prev,
        {
          type: activeType,
          score: totalScore,
          severity: journey?.severity || 'mild',
          attemptId: structuredAttempt.attemptId,
          answers,
        },
      ]);

      const hasNext = activeAssessmentIndex < assessmentOrder.length - 1;
      if (hasNext) {
        const nextIndex = activeAssessmentIndex + 1;
        setClinicalFlowPhase('loading-next');
        setActiveAssessmentIndex(nextIndex);
        await loadStructuredAssessment(assessmentOrder[nextIndex]);
        setClinicalFlowPhase('question');
      } else {
        setClinicalFlowPhase('next-phase');
        setBookingContext({ fromAssessment: true });
      }
    } catch (error: any) {
      addError({
        type: 'server',
        message: error?.message || 'Unable to process assessment right now.',
        retryable: true,
        action: () => submitCurrentStructuredAssessment(answerMap),
      });
    } finally {
      loadingActions.stopLoading('assessment');
    }
  }, [structuredAttempt, assessmentOrder, activeAssessmentIndex, loadStructuredAssessment, loadingActions, addError]);

  const commitClinicAssessments = useCallback(async () => {
    if (clinicalResults.length === 0) return;

    loadingActions.startLoading('assessment');
    try {
      // Final commit of all completed assessments in the current flow
      await Promise.all(
        clinicalResults.map(async (res: any) => {
          if (res.attemptId && res.answers) {
            await patientApi.submitStructuredAssessment(res.attemptId, { answers: res.answers });
          }
        })
      );
      // After committing, we can clear the draft
      clearAssessmentDraft();
    } catch (error) {
      console.error('[ClinicalFlow] Failed to commit assessments:', error);
      // Non-blocking for booking, but we should log it
    } finally {
      loadingActions.stopLoading('assessment');
    }
  }, [clinicalResults, loadingActions, clearAssessmentDraft]);

  const startCarePath = useCallback(async (path: 'recommended' | 'direct' | 'urgent') => {
    const pathway = path === 'urgent' ? 'urgent-care' : path === 'direct' ? 'direct-provider' : 'stepped-care';
    const recommendedProvider = String(clinicalJourney?.recommendedProvider || '').toLowerCase();
    const preferredSpecialization = path === 'urgent'
      ? 'PSYCHIATRIST'
      : path === 'recommended'
        ? (recommendedProvider.includes('psychiatrist') ? 'PSYCHIATRIST' : 'PSYCHOLOGIST')
        : 'ALL';

    try {
      await patientApi.selectJourneyPathway({
        pathway,
        reason: `Selected from embedded My Care flow (${path})`,
        metadata: {
          severity: clinicalJourney?.severity || clinicalResults[clinicalResults.length - 1]?.severity || 'mild',
          preferredSpecialization: preferredSpecialization || 'PSYCHOLOGIST',
        },
      });
    } catch (error: any) {
      addError({
        type: 'server',
        message: 'Could not save care pathway selection. You can still continue booking.',
        retryable: true,
        action: () => startCarePath(path),
      });
    }

    const label = path === 'urgent'
      ? '🚨 Urgent Care Providers'
      : path === 'recommended'
        ? `✅ Recommended for You${preferredSpecialization ? ` — ${preferredSpecialization}` : ''}`
        : '🎯 All Available Providers';

    setActiveCarePathLabel(label);
    setBookingContext({
      fromAssessment: true,
      carePath: path,
      preferredSpecialization: preferredSpecialization === 'ALL' ? undefined : preferredSpecialization,
    });

    setSmartMatchPreferences({
      initialProviderType: preferredSpecialization as SmartMatchProviderType,
      lockProviderType: path !== 'direct',
    });

    setIsClinicalAssessmentOpen(false);
    setClinicalFlowPhase('intro');
  }, [clinicalJourney, clinicalResults, addError]);

  const openClinicalAssessmentFlow = useCallback(() => {
    const draft = loadAssessmentDraft();
    if (draft) {
      setClinicalFlowPhase(draft.clinicalFlowPhase);
      setClinicalStartWith(draft.clinicalStartWith);
      setAssessmentOrder(draft.assessmentOrder);
      setActiveAssessmentIndex(draft.activeAssessmentIndex);
      setStructuredAttempt(draft.structuredAttempt);
      setStructuredAnswers(draft.structuredAnswers || {});
      setCurrentStructuredQuestionIndex(draft.currentStructuredQuestionIndex || 0);
      setClinicalJourney(draft.clinicalJourney || null);
      setClinicalResults(draft.clinicalResults || []);
      setSuggestedProviders(draft.suggestedProviders || []);
      setActiveCarePathLabel(draft.activeCarePathLabel || '');
      if (draft.clinicalFlowPhase === 'provider-list') {
        setBookingContext({ fromAssessment: true });
      }
    } else {
      resetClinicalAssessmentState();
    }
    setIsClinicalAssessmentOpen(true);
  }, [loadAssessmentDraft, resetClinicalAssessmentState]);

  const closeClinicalAssessmentFlow = useCallback(() => {
    if (clinicalFlowPhase !== 'intro') {
      saveAssessmentDraft();
    }
    setIsClinicalAssessmentOpen(false);
    setClinicalFlowPhase('intro');
    setClinicalFlowError(null);
  }, [clinicalFlowPhase, saveAssessmentDraft]);

  const onStructuredOptionSelect = useCallback(async (question: any, optionIndex: number) => {
    if (!structuredAttempt || loadingStates.assessment) return;

    const updatedAnswers = {
      ...structuredAnswers,
      [question.questionId]: optionIndex,
    };
    setStructuredAnswers(updatedAnswers);

    const isLastQuestion = currentStructuredQuestionIndex >= structuredAttempt.questions.length - 1;
    if (!isLastQuestion) {
      setCurrentStructuredQuestionIndex((prev) => prev + 1);
    } else {
      await submitCurrentStructuredAssessment(updatedAnswers);
    }
  }, [structuredAttempt, loadingStates.assessment, structuredAnswers, currentStructuredQuestionIndex, submitCurrentStructuredAssessment]);

  // Computed values
  const assessmentResumeCopy = useMemo(() => {
    const draft = loadAssessmentDraft();
    if (!draft) return null;

    // Only show resume banner if user hasn't completed today's assessment
    // const today = new Date().toISOString().split('T')[0];
    // This would need to be passed in or computed differently
    // For now, we'll assume it's handled by the parent component

    switch (draft.clinicalFlowPhase) {
      case 'question':
      case 'loading-next':
        return {
          title: 'Resume today\'s assessment',
          detail: 'Your PHQ-9 + GAD-7 progress is saved. Continue from where you left off.',
          button: 'Resume Assessment',
        };
      case 'next-phase':
      case 'provider-list':
        return {
          title: 'Continue today\'s assessment',
          detail: 'Your assessment is in progress. Complete it to see your results and booking options.',
          button: 'Continue Assessment',
        };
      default:
        return {
          title: 'Continue today\'s assessment',
          detail: 'Your assessment draft is available for today.',
          button: 'Continue Assessment',
        };
    }
  }, [loadAssessmentDraft]);

  return {
    // State
    isClinicalAssessmentOpen,
    clinicalFlowPhase,
    clinicalStartWith,
    assessmentOrder,
    activeAssessmentIndex,
    structuredAttempt,
    structuredAnswers,
    currentStructuredQuestionIndex,
    clinicalFlowError,
    clinicalJourney,
    clinicalResults,
    suggestedProviders,
    activeCarePathLabel,
    bookingContext,
    smartMatchPreferences,
    loadingStates,

    // Actions
    setClinicalStartWith,
    beginClinicalAssessment,
    onStructuredOptionSelect,
    startCarePath,
    openClinicalAssessmentFlow,
    closeClinicalAssessmentFlow,
    resetClinicalAssessmentState,
    clearAssessmentDraft,
    saveAssessmentDraft,
    loadAssessmentDraft,
    commitClinicAssessments,

    // Computed
    assessmentResumeCopy,
  };
};