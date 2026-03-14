import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  patientApi,
  type StructuredAssessmentQuestion,
  type StructuredAssessmentStartResponse,
} from '../../api/patient';
import { parseJourneyPayload, type JourneyPayload } from '../../utils/journey';
import SlideOverBookingDrawer from '../../components/patient/SlideOverBookingDrawer';
import SmartMatchFlow from '../../components/patient/SmartMatchFlow';
import {
  Video,
  Download,
  FileText,
  Activity,
  UserPlus,
  Users,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  Calendar,
  ArrowLeft,
  X,
} from 'lucide-react';

type AssessmentHistoryEntry = {
  id?: string;
  type?: string;
  score?: number;
  maxScore?: number;
  level?: string;
  createdAt?: string;
};

type ClinicalAssessmentKey = 'PHQ-9' | 'GAD-7';
type ClinicalFlowPhase = 'intro' | 'question' | 'loading-next' | 'next-phase' | 'provider-list';
type SmartMatchProviderType = 'ALL' | 'THERAPIST' | 'PSYCHOLOGIST' | 'PSYCHIATRIST' | 'COACH';

const PHQ9_TEMPLATE_KEY = 'phq-9-paid-assessment-v1';
const GAD7_TEMPLATE_KEY = 'gad-7-paid-assessment-v1';
const structuredTemplateKeys: Record<ClinicalAssessmentKey, string> = {
  'PHQ-9': PHQ9_TEMPLATE_KEY,
  'GAD-7': GAD7_TEMPLATE_KEY,
};

const toLocalDateKey = (value: Date = new Date()): string => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const asArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const r = value as Record<string, unknown>;
    if (Array.isArray(r.data)) return r.data as any[];
    if (Array.isArray(r.items)) return r.items as any[];
    if (r.data && typeof r.data === 'object') {
      const nested = r.data as Record<string, unknown>;
      if (Array.isArray(nested.items)) return nested.items as any[];
    }
  }
  return [];
};

const ASSESSMENT_DRAFT_STORAGE_KEY = 'patient-clinical-assessment-draft-v1';
const ASSESSMENT_DRAFT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const RESUMABLE_ASSESSMENT_PHASES: ClinicalFlowPhase[] = ['intro', 'question', 'loading-next', 'next-phase', 'provider-list'];

type AssessmentDraft = {
  savedAt: number;
  dayKey: string;
  clinicalFlowPhase: ClinicalFlowPhase;
  clinicalStartWith: ClinicalAssessmentKey;
  assessmentOrder: ClinicalAssessmentKey[];
  activeAssessmentIndex: number;
  structuredAttempt: StructuredAssessmentStartResponse | null;
  structuredAnswers: Record<string, number>;
  currentStructuredQuestionIndex: number;
  clinicalJourney: JourneyPayload | null;
  clinicalResults: Array<{ type: ClinicalAssessmentKey; score: number; severity: string }>;
  suggestedProviders: any[];
  activeCarePathLabel: string;
};

export default function SessionsPage() {
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [myProviders, setMyProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [isSmartMatchOpen, setIsSmartMatchOpen] = useState(false);
  const [isPreviousProvidersOpen, setIsPreviousProvidersOpen] = useState(false);
  const [hasCompletedCheckin, setHasCompletedCheckin] = useState(false);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentHistoryEntry[]>([]);
  const [assessmentHistoryLoading, setAssessmentHistoryLoading] = useState(true);
  const [assessmentDraft, setAssessmentDraft] = useState<AssessmentDraft | null>(null);
  const [todaysAssessmentResults, setTodaysAssessmentResults] = useState<Array<{ type: string; score: number; severity: string }>>([]);

  const [isClinicalAssessmentOpen, setIsClinicalAssessmentOpen] = useState(false);
  const [clinicalFlowPhase, setClinicalFlowPhase] = useState<ClinicalFlowPhase>('intro');
  const [clinicalStartWith, setClinicalStartWith] = useState<ClinicalAssessmentKey>('PHQ-9');
  const [assessmentOrder, setAssessmentOrder] = useState<ClinicalAssessmentKey[]>(['PHQ-9', 'GAD-7']);
  const [activeAssessmentIndex, setActiveAssessmentIndex] = useState(0);
  const [structuredAttempt, setStructuredAttempt] = useState<StructuredAssessmentStartResponse | null>(null);
  const [structuredAnswers, setStructuredAnswers] = useState<Record<string, number>>({});
  const [currentStructuredQuestionIndex, setCurrentStructuredQuestionIndex] = useState(0);
  const [clinicalFlowLoading, setClinicalFlowLoading] = useState(false);
  const [clinicalFlowError, setClinicalFlowError] = useState<string | null>(null);
  const [clinicalJourney, setClinicalJourney] = useState<JourneyPayload | null>(null);
  const [clinicalResults, setClinicalResults] = useState<Array<{ type: ClinicalAssessmentKey; score: number; severity: string }>>([]);
  const [suggestedProviders, setSuggestedProviders] = useState<any[]>([]);
  const providersLoading = false;
  const [activeCarePathLabel, setActiveCarePathLabel] = useState('');
  const [bookingFallbackLoading, setBookingFallbackLoading] = useState(false);
  const [bookingFallbackError, setBookingFallbackError] = useState<string | null>(null);
  const [bookingContext, setBookingContext] = useState<{
    fromAssessment: boolean;
    carePath?: 'recommended' | 'direct' | 'urgent';
    preferredSpecialization?: string;
  } | null>(null);
  const [smartMatchPreferences, setSmartMatchPreferences] = useState<{
    initialProviderType: SmartMatchProviderType;
    lockProviderType: boolean;
  }>({
    initialProviderType: 'ALL',
    lockProviderType: false,
  });

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const [uRes, hRes, pRes] = await Promise.all([
        patientApi.getUpcomingSessions().catch(() => ({ data: [] })),
        patientApi.getSessionHistory().catch(() => ({ data: [] })),
        patientApi.getMyProviders().catch(() => ({ data: [] })),
      ]);
      setUpcoming(Array.isArray((uRes as any)?.data) ? (uRes as any).data : Array.isArray(uRes) ? uRes : []);
      setHistory(Array.isArray((hRes as any)?.data) ? (hRes as any).data : Array.isArray(hRes) ? hRes : []);
      setMyProviders(Array.isArray((pRes as any)?.data) ? (pRes as any).data : Array.isArray(pRes) ? pRes : []);
    } catch {
      setError('Unable to load your care summary at this time.');
    } finally {
      setLoading(false);
    }
  };

  const loadAssessmentHistory = async () => {
    setAssessmentHistoryLoading(true);
    try {
      const [structuredResponse, legacyResponse] = await Promise.all([
        patientApi.getStructuredAssessmentHistory().catch(() => null),
        patientApi.getMoodHistory().catch(() => null),
      ]);

      const structured = asArray((structuredResponse as any)?.data ?? structuredResponse).map((entry: any) => ({
        id: entry.attemptId,
        type: entry.templateTitle || entry.templateKey || 'Assessment',
        score: Number(entry.totalScore || 0),
        maxScore: String(entry.templateKey || '').toLowerCase().includes('gad-7') ? 21 : 27,
        level: String(entry.severityLevel || 'mild').toLowerCase(),
        createdAt: entry.submittedAt,
      }));

      const legacy = asArray(legacyResponse as any).map((entry: any) => ({
        id: entry.id,
        type: entry.type || 'Daily Check',
        score: Number(entry.score || entry.mood || 0),
        maxScore: 10,
        level: String(entry.level || 'mild').toLowerCase(),
        createdAt: entry.created_at || entry.createdAt,
      }));

      const merged = [...structured, ...legacy]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 12);
      setAssessmentHistory(merged);

      // Check if user has completed both PHQ-9 and GAD-7 today
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const todayStructured = structured.filter(entry => {
        const entryDate = new Date(entry.createdAt).toISOString().split('T')[0];
        return entryDate === today;
      });

      const hasCompletedPHQ9Today = todayStructured.some(entry =>
        String(entry.type).toLowerCase().includes('phq-9') ||
        String(entry.type).toLowerCase().includes('phq9')
      );
      const hasCompletedGAD7Today = todayStructured.some(entry =>
        String(entry.type).toLowerCase().includes('gad-7') ||
        String(entry.type).toLowerCase().includes('gad7')
      );

      setHasCompletedCheckin(hasCompletedPHQ9Today && hasCompletedGAD7Today);

      // Set today's assessment results for display
      if (hasCompletedPHQ9Today && hasCompletedGAD7Today) {
        const results = todayStructured
          .filter(entry =>
            String(entry.type).toLowerCase().includes('phq-9') ||
            String(entry.type).toLowerCase().includes('phq9') ||
            String(entry.type).toLowerCase().includes('gad-7') ||
            String(entry.type).toLowerCase().includes('gad7')
          )
          .map(entry => ({
            type: String(entry.type).toLowerCase().includes('phq-9') || String(entry.type).toLowerCase().includes('phq9') ? 'PHQ-9' : 'GAD-7',
            score: entry.score,
            severity: entry.level
          }));
        setTodaysAssessmentResults(results);
      } else {
        setTodaysAssessmentResults([]);
      }
    } finally {
      setAssessmentHistoryLoading(false);
    }
  };

  const clearAssessmentDraft = () => {
    sessionStorage.removeItem(ASSESSMENT_DRAFT_STORAGE_KEY);
    localStorage.removeItem(ASSESSMENT_DRAFT_STORAGE_KEY);
    setAssessmentDraft(null);
  };

  const saveAssessmentDraft = () => {
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
    setAssessmentDraft(draft);
  };

  const loadAssessmentDraft = (): AssessmentDraft | null => {
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
      const serialized = JSON.stringify(parsed);
      sessionStorage.setItem(ASSESSMENT_DRAFT_STORAGE_KEY, serialized);
      localStorage.setItem(ASSESSMENT_DRAFT_STORAGE_KEY, serialized);
      return parsed;
    } catch {
      clearAssessmentDraft();
      return null;
    }
  };

  const resetClinicalAssessmentState = () => {
    setClinicalFlowPhase('intro');
    setClinicalStartWith('PHQ-9');
    setAssessmentOrder(['PHQ-9', 'GAD-7']);
    setActiveAssessmentIndex(0);
    setStructuredAttempt(null);
    setStructuredAnswers({});
    setCurrentStructuredQuestionIndex(0);
    setClinicalFlowLoading(false);
    setClinicalFlowError(null);
    setClinicalJourney(null);
    setClinicalResults([]);
    setSuggestedProviders([]);
    setActiveCarePathLabel('');
    setBookingContext(null);
  };

  const openClinicalAssessmentFlow = () => {
    const draft = loadAssessmentDraft();
    if (draft) {
      setAssessmentDraft(draft);
      setClinicalFlowPhase(draft.clinicalFlowPhase);
      setClinicalStartWith(draft.clinicalStartWith);
      setAssessmentOrder(draft.assessmentOrder);
      setActiveAssessmentIndex(draft.activeAssessmentIndex);
      setStructuredAttempt(draft.structuredAttempt);
      setStructuredAnswers(draft.structuredAnswers || {});
      setCurrentStructuredQuestionIndex(draft.currentStructuredQuestionIndex || 0);
      setClinicalJourney(draft.clinicalJourney || null);
      setClinicalResults(draft.clinicalResults || []);
      setSuggestedProviders(Array.isArray(draft.suggestedProviders) ? draft.suggestedProviders : []);
      setActiveCarePathLabel(draft.activeCarePathLabel || '');
      if (draft.clinicalFlowPhase === 'provider-list') {
        setBookingContext({ fromAssessment: true });
      }
    } else {
      setAssessmentDraft(null);
      resetClinicalAssessmentState();
    }
    setIsClinicalAssessmentOpen(true);
  };

  const closeClinicalAssessmentFlow = () => {
    if (clinicalFlowPhase !== 'intro') {
      saveAssessmentDraft();
    }
    setIsClinicalAssessmentOpen(false);
    setClinicalFlowPhase('intro');
    setClinicalFlowError(null);
  };

  const loadStructuredAssessment = async (assessmentType: ClinicalAssessmentKey) => {
    const response = await patientApi.startStructuredAssessment({ templateKey: structuredTemplateKeys[assessmentType] });
    setStructuredAttempt(response);
    setStructuredAnswers({});
    setCurrentStructuredQuestionIndex(0);
  };

  const beginClinicalAssessment = async () => {
    // Check if user has already completed both assessments today
    if (hasCompletedCheckin) {
      setClinicalFlowError('You have already completed today\'s assessment. You can view your results below.');
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
    setClinicalFlowLoading(true);

    try {
      await loadStructuredAssessment(order[0]);
      setClinicalFlowPhase('question');
    } catch (error: any) {
      setClinicalFlowError(error?.message || 'Unable to load clinical assessment right now.');
    } finally {
      setClinicalFlowLoading(false);
    }
  };

  const submitCurrentStructuredAssessment = async (answerMap: Record<string, number>) => {
    if (!structuredAttempt) return;

    const activeType = assessmentOrder[activeAssessmentIndex];
    setClinicalFlowLoading(true);
    setClinicalFlowError(null);

    try {
      const answers = structuredAttempt.questions.map((question) => ({
        questionId: question.questionId,
        optionIndex: answerMap[question.questionId],
      }));
      const numericAnswers = structuredAttempt.questions.map((question) => answerMap[question.questionId]);

      const [structuredResult, journeyResponse] = await Promise.all([
        patientApi.submitStructuredAssessment(structuredAttempt.attemptId, { answers }),
        patientApi.submitClinicalJourney({ type: activeType, answers: numericAnswers }),
      ]);

      const journey = parseJourneyPayload(journeyResponse);
      if (journey) setClinicalJourney(journey);

      setClinicalResults((prev) => [
        ...prev,
        {
          type: activeType,
          score: Number(structuredResult.totalScore || 0),
          severity: String(structuredResult.severityLevel || 'mild'),
        },
      ]);

      // Note: We no longer set localStorage locks here - completion is determined from backend data
      // setHasCompletedCheckin will be updated by loadAssessmentHistory()

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
        void fetchData();
        void loadAssessmentHistory(); // This will update hasCompletedCheckin based on backend data
      }
    } catch (error: any) {
      setClinicalFlowError(error?.message || 'Unable to submit assessment right now. Please try again.');
    } finally {
      setClinicalFlowLoading(false);
    }
  };

  const onStructuredOptionSelect = async (question: StructuredAssessmentQuestion, optionIndex: number) => {
    if (!structuredAttempt || clinicalFlowLoading) return;

    const updatedAnswers = {
      ...structuredAnswers,
      [question.questionId]: optionIndex,
    };
    setStructuredAnswers(updatedAnswers);

    const isLastQuestion = currentStructuredQuestionIndex >= structuredAttempt.questions.length - 1;
    if (!isLastQuestion) {
      setCurrentStructuredQuestionIndex((prev) => prev + 1);
      return;
    }

    await submitCurrentStructuredAssessment(updatedAnswers);
  };

  const startCarePath = async (path: 'recommended' | 'direct' | 'urgent') => {
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
    } catch {
      setClinicalFlowError('Could not save care pathway selection. You can still continue booking.');
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
    setIsSmartMatchOpen(true);
  };

  useEffect(() => {
    if (!isClinicalAssessmentOpen || clinicalFlowPhase === 'intro') return;
    saveAssessmentDraft();
  }, [
    isClinicalAssessmentOpen,
    clinicalFlowPhase,
    structuredAttempt,
    structuredAnswers,
    currentStructuredQuestionIndex,
    activeAssessmentIndex,
    clinicalJourney,
    clinicalResults,
    suggestedProviders,
    activeCarePathLabel,
  ]);

  useEffect(() => {
    void fetchData();
    void loadAssessmentHistory();
    setAssessmentDraft(loadAssessmentDraft());
  }, []);

  const assessmentResumeCopy = useMemo(() => {
    if (!assessmentDraft) return null;

    // Only show resume banner if user hasn't completed today's assessment
    if (hasCompletedCheckin) return null;

    switch (assessmentDraft.clinicalFlowPhase) {
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
  }, [assessmentDraft, hasCompletedCheckin]);

  const handleDownloadInvoice = async (sessionId: string) => {
    try {
      await patientApi.downloadInvoicePdf(sessionId);
    } catch {
      // Handle download fetch error silently
    }
  };

  const normalizeProviderForBooking = (provider: any) => {
    if (!provider) return null;
    const id = provider.providerId || provider.userId || provider?.user?.id || provider.id;
    if (!id) return null;
    const name = provider.name
      || provider.displayName
      || `${provider.firstName || ''} ${provider.lastName || ''}`.trim()
      || 'Provider';
    return {
      ...provider,
      id,
      name,
    };
  };

  const getProviderMessageLink = (provider: any) => {
    const normalized = normalizeProviderForBooking(provider);
    if (!normalized) return '/patient/provider-messages';
    const providerId = encodeURIComponent(String(normalized.id));
    const params = new URLSearchParams({
      providerName: String(normalized.name || 'Provider'),
    });
    return `/patient/provider-messages/${providerId}?${params.toString()}`;
  };

  const openBookingDrawer = async (
    provider?: any,
    context?: { fromAssessment: boolean; carePath?: 'recommended' | 'direct' | 'urgent'; preferredSpecialization?: string } | null,
  ) => {
    setBookingFallbackError(null);

    const normalized = normalizeProviderForBooking(provider);
    if (normalized) {
      setSelectedProvider(normalized);
      if (context) setBookingContext(context);
      setIsDrawerOpen(true);
      return;
    }

    setBookingFallbackLoading(true);
    try {
      const result = await patientApi.getAvailableProviders(
        context?.preferredSpecialization ? { specialization: context.preferredSpecialization } : undefined,
      );
      const payload = (result as any)?.data ?? result;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as any)?.items)
          ? (payload as any).items
          : [];

      const first = normalizeProviderForBooking(list[0]);
      if (!first) {
        setBookingFallbackError('No providers are available right now. Please try again shortly.');
        return;
      }

      setSelectedProvider(first);
      if (context) setBookingContext(context);
      setIsDrawerOpen(true);
    } catch {
      setBookingFallbackError('Unable to load providers right now. Please try again.');
    } finally {
      setBookingFallbackLoading(false);
    }
  };

  const nextSession = upcoming[0];
  const nextSessionProviderName = nextSession?.provider?.name || 'your provider';
  const isLockedSession = Boolean(nextSession?.isLocked ?? nextSession?.is_locked);

  const previousConsultedProviders = useMemo(() => {
    const providerMap = new Map<string, any>();

    history.forEach((session) => {
      const normalizedProvider = normalizeProviderForBooking(session?.provider);
      if (!normalizedProvider) return;

      const lastConnectedAtRaw = session?.scheduled_at || session?.scheduledAt || session?.createdAt;
      const lastConnectedAt = lastConnectedAtRaw ? new Date(lastConnectedAtRaw) : null;

      const existing = providerMap.get(normalizedProvider.id);
      if (!existing) {
        providerMap.set(normalizedProvider.id, {
          ...normalizedProvider,
          role: normalizedProvider.role || normalizedProvider.providerType || 'Therapist',
          lastConnectedAt,
        });
        return;
      }

      if (lastConnectedAt && (!existing.lastConnectedAt || lastConnectedAt > existing.lastConnectedAt)) {
        providerMap.set(normalizedProvider.id, {
          ...existing,
          ...normalizedProvider,
          role: normalizedProvider.role || normalizedProvider.providerType || existing.role || 'Therapist',
          lastConnectedAt,
        });
      }
    });

    myProviders.forEach((provider) => {
      const normalizedProvider = normalizeProviderForBooking(provider);
      if (!normalizedProvider) return;

      const existing = providerMap.get(normalizedProvider.id);
      if (!existing) {
        providerMap.set(normalizedProvider.id, {
          ...normalizedProvider,
          role: normalizedProvider.role || normalizedProvider.providerType || 'Therapist',
          lastConnectedAt: null,
        });
      }
    });

    return Array.from(providerMap.values()).sort((a: any, b: any) => {
      const aTime = a.lastConnectedAt ? new Date(a.lastConnectedAt).getTime() : 0;
      const bTime = b.lastConnectedAt ? new Date(b.lastConnectedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [history, myProviders]);

  const hasPreviousConsultedProvider = previousConsultedProviders.length > 0;

  const handlePrimaryBookSession = () => {
    setBookingFallbackError(null);

    // Check if user has connected providers - if not, force assessment first
    if (myProviders.length === 0) {
      const draft = loadAssessmentDraft();
      setBookingFallbackError('Please complete your PHQ-9 and GAD-7 assessment first. After that, booking will open.');
      if (draft) {
        openClinicalAssessmentFlow();
        return;
      }
      openClinicalAssessmentFlow();
      return;
    }

    // User has connected providers, show them for booking
    setIsPreviousProvidersOpen(true);
  };

  const handleBrowseSpecialists = () => {
    setBookingFallbackError(null);
    setSmartMatchPreferences({
      initialProviderType: 'ALL',
      lockProviderType: false,
    });
    setIsSmartMatchOpen(true);
  };

  const isWithin10Minutes = useMemo(() => {
    if (!nextSession) return false;
    const now = new Date().getTime();
    const scheduledAt = new Date(nextSession.scheduled_at || nextSession.scheduledAt).getTime();
    const diffMins = (scheduledAt - now) / 1000 / 60;
    return diffMins > -60 && diffMins <= 10;
  }, [nextSession]);

  const hasUrgentSession = nextSession != null;
  const isSessionTomorrow = useMemo(() => {
    if (!nextSession) return false;
    const now = new Date().getTime();
    const scheduledAt = new Date(nextSession.scheduled_at || nextSession.scheduledAt).getTime();
    const diffHours = (scheduledAt - now) / 1000 / 60 / 60;
    return diffHours <= 48 && diffHours > 0;
  }, [nextSession]);

  const needsPreSessionCheckin = hasUrgentSession && isSessionTomorrow && !hasCompletedCheckin;

  // Clinical Assessment Full-Page View
  if (isClinicalAssessmentOpen) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-20 md:px-6 lg:pb-6">
        <div className="flex items-center justify-between border-b border-calm-sage/15 pb-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">My Care Clinical Check-in</p>
            <h1 className="mt-1 text-2xl font-bold text-charcoal">PHQ-9 + GAD-7 Assessment</h1>
          </div>
          <button
            type="button"
            onClick={closeClinicalAssessmentFlow}
            className="rounded-lg border border-calm-sage/20 p-2 text-charcoal/70 hover:bg-calm-sage/5"
            aria-label="Close assessment flow"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {clinicalFlowPhase === 'intro' ? (
            <div className="space-y-4">
              <p className="text-sm text-charcoal/75">
                This check-in updates your care team and triages your next phase automatically. You can start with PHQ-9 or GAD-7.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['PHQ-9', 'GAD-7'] as ClinicalAssessmentKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setClinicalStartWith(key)}
                    className={`rounded-xl border p-3 text-left transition ${
                      clinicalStartWith === key
                        ? 'border-teal-400 bg-teal-50'
                        : 'border-calm-sage/20 bg-white hover:bg-calm-sage/5'
                    }`}
                  >
                    <p className="text-sm font-semibold text-charcoal">Start with {key}</p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void beginClinicalAssessment()}
                disabled={clinicalFlowLoading}
                className="inline-flex min-h-[42px] items-center rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {clinicalFlowLoading ? 'Loading...' : 'Begin Assessment'}
              </button>
            </div>
          ) : null}

          {clinicalFlowPhase === 'loading-next' ? (
            <div className="rounded-2xl border border-calm-sage/15 bg-calm-sage/5 p-6 text-center">
              <p className="text-sm font-medium text-charcoal">Preparing next assessment...</p>
            </div>
          ) : null}

          {clinicalFlowPhase === 'question' && structuredAttempt && structuredAttempt.questions[currentStructuredQuestionIndex] ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-calm-sage/10 bg-calm-sage/5 px-3 py-2 text-xs text-charcoal/70">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-teal-700">{assessmentOrder[activeAssessmentIndex]}</span>
                  <span>
                    Question {currentStructuredQuestionIndex + 1} of {structuredAttempt.questions.length}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-calm-sage/15">
                  <div
                    className="h-2 rounded-full bg-teal-600 transition-all duration-300"
                    style={{ width: `${((currentStructuredQuestionIndex + 1) / structuredAttempt.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-calm-sage/15 bg-white p-4">
                <p className="text-lg font-medium text-charcoal">
                  {structuredAttempt.questions[currentStructuredQuestionIndex].position}. {structuredAttempt.questions[currentStructuredQuestionIndex].prompt}
                </p>
                <div className="mt-4 grid gap-2">
                  {structuredAttempt.questions[currentStructuredQuestionIndex].options.map((option) => (
                    <button
                      key={`${structuredAttempt.questions[currentStructuredQuestionIndex].questionId}-${option.optionIndex}`}
                      type="button"
                      onClick={() => void onStructuredOptionSelect(structuredAttempt.questions[currentStructuredQuestionIndex], option.optionIndex)}
                      disabled={clinicalFlowLoading}
                      className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                        structuredAnswers[structuredAttempt.questions[currentStructuredQuestionIndex].questionId] === option.optionIndex
                          ? 'border-teal-400 bg-teal-50 text-charcoal'
                          : 'border-calm-sage/20 bg-white text-charcoal/85 hover:bg-calm-sage/5'
                      } disabled:opacity-60`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {clinicalFlowPhase === 'next-phase' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-calm-sage/15 bg-calm-sage/5 p-4">
                <p className="text-sm font-semibold text-charcoal">Assessment complete</p>
                <div className="mt-2 space-y-1 text-xs text-charcoal/70">
                  {clinicalResults.map((result, idx) => (
                    <p key={`${result.type}-${idx}`}>{result.type}: {result.score} ({result.severity})</p>
                  ))}
                </div>
                {String(clinicalJourney?.recommendedProvider || '').toLowerCase().includes('psychiatrist') ? (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
                    Medication Needed
                    <div className="mt-0.5">💊 PSYCHIATRIST</div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => void startCarePath('recommended')}
                  className="rounded-xl border border-calm-sage/25 bg-white p-3 text-left hover:border-calm-sage/45"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Recommended</p>
                </button>
                <button
                  type="button"
                  onClick={() => void startCarePath('direct')}
                  className="rounded-xl border border-calm-sage/25 bg-white p-3 text-left hover:border-calm-sage/45"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">🎯 Choose Provider</p>
                </button>
                <button
                  type="button"
                  onClick={() => void startCarePath('urgent')}
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-left hover:border-rose-300"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Urgent Care</p>
                </button>
              </div>
            </div>
          ) : null}

          {clinicalFlowPhase === 'provider-list' ? (
            <div className="space-y-5">
              {/* Assessment result summary */}
              <div className="rounded-xl border border-teal-200/60 bg-teal-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-700">Your Assessment Results</p>
                <div className="flex flex-wrap gap-2">
                  {clinicalResults.map((r) => {
                    const sev = r.severity.toLowerCase();
                    const cls = sev.includes('severe')
                      ? 'bg-red-100 text-red-700'
                      : sev.includes('moderate')
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700';
                    return (
                      <div key={r.type} className="flex items-center gap-2 rounded-lg border border-white bg-white px-3 py-1.5 shadow-sm">
                        <span className="text-xs font-bold text-charcoal">{r.type}</span>
                        <span className="text-xs text-charcoal/60">Score {r.score}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${cls}`}>{r.severity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-charcoal">{activeCarePathLabel}</h3>
                <button
                  type="button"
                  onClick={() => setClinicalFlowPhase('next-phase')}
                  className="text-xs font-medium text-teal-600 hover:underline"
                >
                  ← Back to options
                </button>
              </div>

              {/* Provider list */}
              {providersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl border border-calm-sage/15 bg-white/60" />
                  ))}
                </div>
              ) : suggestedProviders.length > 0 ? (
                <div className="space-y-3">
                  {suggestedProviders.map((provider) => {
                    const name = provider.displayName || provider.name || `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Provider';
                    const role = provider.providerType || provider.role || (provider.user?.role) || 'Therapist';
                    const specs: string[] = Array.isArray(provider.specializations) ? provider.specializations.slice(0, 3) : [];
                    const fee = provider.consultationFee ? `₹${Math.round(Number(provider.consultationFee) / 100)}` : null;
                    const rating = provider.averageRating ? Number(provider.averageRating).toFixed(1) : null;
                    const bio = provider.bio ? String(provider.bio).slice(0, 100) : null;
                    return (
                      <div key={provider.id || provider.userId} className="rounded-2xl border border-calm-sage/15 bg-white p-5 shadow-soft-sm transition-all hover:border-teal-200 hover:shadow-md">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-teal-50 to-teal-100/50 text-xl font-bold text-teal-600 ring-1 ring-teal-200/50">
                            {name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-charcoal">{name}</h4>
                                <p className="text-xs font-semibold uppercase tracking-wider text-teal-600/70">{role}</p>
                              </div>
                              {rating ? (
                                <span className="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-600">★ {rating}</span>
                              ) : null}
                            </div>
                            {bio ? <p className="mt-1 text-xs text-charcoal/60 line-clamp-2">{bio}</p> : null}
                            {specs.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {specs.map((s) => (
                                  <span key={s} className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">{s}</span>
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-3 flex items-center gap-3">
                              {fee ? (
                                <span className="text-sm font-bold text-charcoal">
                                  {fee}<span className="text-xs font-normal text-charcoal/60">/session</span>
                                </span>
                              ) : null}
                              <Link
                                to={getProviderMessageLink(provider)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-calm-sage/20 bg-white px-3 py-2 text-xs font-semibold text-charcoal/80 transition hover:bg-calm-sage/5 hover:text-charcoal"
                              >
                                Message
                              </Link>
                              <button
                                type="button"
                                onClick={() => void openBookingDrawer({ ...provider, name }, bookingContext)}
                                className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-700"
                              >
                                Book Now
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-calm-sage/15 bg-white/50 p-8 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-calm-sage/40" />
                  <p className="text-sm font-semibold text-charcoal">No providers found</p>
                  <p className="mt-1 text-xs text-charcoal/60">Try a different option or browse the directory.</p>
                  <Link
                    to="/patient/discover"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700"
                  >
                    Browse Directory
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          {clinicalFlowError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {clinicalFlowError}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // Normal My Care Page View
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 px-4 pb-20 md:px-6 lg:pb-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-charcoal md:text-4xl">My Care</h1>
        <p className="text-sm text-charcoal/70">Connect with your dedicated care team and manage your sessions.</p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {bookingFallbackError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {bookingFallbackError}
        </div>
      )}

      {assessmentResumeCopy && !isClinicalAssessmentOpen && (
        <section className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4 shadow-soft-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-teal-900">{assessmentResumeCopy.title}</p>
              <p className="mt-1 text-xs text-teal-800/80">{assessmentResumeCopy.detail}</p>
            </div>
            <button
              type="button"
              onClick={openClinicalAssessmentFlow}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              {assessmentResumeCopy.button}
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex h-[300px] items-center justify-center rounded-2xl border border-calm-sage/15 bg-white/50">
          <p className="animate-pulse text-sm text-charcoal/50">Loading your care hub...</p>
        </div>
      ) : (
        <>
          {needsPreSessionCheckin && (
            <section className="relative mb-4 overflow-hidden rounded-[20px] border-2 border-amber-200/60 bg-[#FFFAF0] p-6 shadow-sm">
              <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-amber-900">Action Required Before Your Session</h3>
                    <p className="mt-1 max-w-xl text-sm text-amber-800/80">
                      {nextSession.provider?.name || 'Dr. Sharma'} has requested a quick clinical update to see how you've been doing since your last visit.
                      <strong className="mt-0.5 block font-semibold">⏱️ Takes 2 minutes.</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={openClinicalAssessmentFlow}
                  className="shrink-0 rounded-xl bg-amber-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-700"
                >
                  {assessmentResumeCopy ? assessmentResumeCopy.button : 'Start PHQ-9 Assessment'}
                </button>
              </div>
            </section>
          )}

          {!hasUrgentSession && (
            <section className="rounded-3xl border border-calm-sage/15 bg-white p-8 text-center shadow-soft-sm">
              <div className="mx-auto max-w-md space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
                    <Calendar className="h-8 w-8 text-teal-600" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-charcoal">No Upcoming Sessions</h3>
                <p className="text-sm text-charcoal/70">Consistent therapy yields the best results. Let's get your next appointment on the books.</p>
                <button
                  onClick={handlePrimaryBookSession}
                  disabled={bookingFallbackLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  {bookingFallbackLoading ? 'Loading Providers...' : 'Book a Session'}
                </button>

                {hasPreviousConsultedProvider ? (
                  <p className="text-xs text-charcoal/55">
                    We'll first show your previously consulted providers.
                  </p>
                ) : null}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-charcoal">My Active Care Team</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myProviders.map((provider) => (
                <div key={provider.id} className="group relative overflow-hidden rounded-2xl border border-calm-sage/15 bg-white p-5 shadow-soft-sm transition-all hover:border-teal-200 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-teal-50 to-teal-100/50 text-xl font-bold text-teal-600 ring-1 ring-teal-200/50">
                      {provider.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-bold text-charcoal">{provider.name}</h4>
                      <p className="text-xs font-semibold uppercase tracking-wider text-teal-600/70">{provider.role || 'Therapist'}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => void openBookingDrawer(provider)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-charcoal px-3 py-2 text-xs font-semibold text-white transition hover:bg-charcoal/90"
                        >
                          Book Session
                        </button>
                        <Link
                          to={getProviderMessageLink(provider)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-calm-sage/20 bg-white px-3 py-2 text-xs font-semibold text-charcoal/80 transition hover:bg-calm-sage/5 hover:text-charcoal"
                        >
                          Message
                        </Link>
                        <button
                          onClick={openClinicalAssessmentFlow}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                          {assessmentResumeCopy ? assessmentResumeCopy.button : 'Update Clinical Scores'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-calm-sage/30 bg-white/50 p-6 text-center transition-colors hover:bg-white/80">
                <Users className="mb-3 h-8 w-8 text-calm-sage/40" />
                <p className="text-sm font-semibold text-charcoal">Need a different specialist?</p>
                <p className="mt-1 max-w-[200px] text-xs text-charcoal/60">Browse our directory to add a psychiatrist or coach to your care team.</p>
                <button
                  type="button"
                  onClick={handleBrowseSpecialists}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Browse Directory
                </button>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-teal-300/40 bg-teal-50/40 p-6 text-center transition-colors hover:bg-teal-50/70">
                <ClipboardList className="mb-3 h-8 w-8 text-teal-500" />
                <p className="text-sm font-semibold text-charcoal">Clinical Assessment Check-in</p>
                <p className="mt-1 max-w-[220px] text-xs text-charcoal/60">
                  Complete PHQ-9 and GAD-7 one question at a time to update your care team.
                </p>
                <button
                  type="button"
                  onClick={openClinicalAssessmentFlow}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-100 px-4 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-200"
                >
                  {assessmentResumeCopy ? assessmentResumeCopy.button : 'Take Assessment'}
                </button>
              </div>

              {todaysAssessmentResults.length > 0 && (
                <div className="rounded-2xl border border-teal-200/60 bg-teal-50/80 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
                      <TrendingUp className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-teal-900">Today's Assessment Results</h4>
                      <p className="text-xs text-teal-700/80">Completed {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {todaysAssessmentResults.map((result, index) => (
                      <div key={`${result.type}-${index}`} className="flex items-center justify-between rounded-lg bg-white/80 p-3">
                        <div>
                          <p className="text-sm font-semibold text-charcoal">{result.type}</p>
                          <p className="text-xs text-charcoal/60">Score: {result.score}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                          result.severity.includes('severe') ? 'bg-red-100 text-red-700' :
                          result.severity.includes('moderate') ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {result.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={openClinicalAssessmentFlow}
                    className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    View Full Results
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 pt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-charcoal">Assessment History</h3>
              <button
                type="button"
                onClick={openClinicalAssessmentFlow}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                {assessmentResumeCopy ? assessmentResumeCopy.button : '+ Take New Assessment'}
              </button>
            </div>

            {assessmentHistoryLoading ? (
              <div className="rounded-2xl border border-calm-sage/15 bg-white/50 p-6 text-center text-sm text-charcoal/50 animate-pulse">
                Loading assessment history...
              </div>
            ) : assessmentHistory.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-calm-sage/15 bg-white shadow-soft-sm">
                <div className="divide-y divide-calm-sage/10">
                  {assessmentHistory.map((entry, index) => {
                    const level = String(entry.level || 'mild').toLowerCase();
                    const levelClass = level.includes('severe')
                      ? 'bg-red-50 text-red-600'
                      : level.includes('moderate')
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-green-50 text-green-600';

                    return (
                      <div key={entry.id || `assessment-${index}`} className="flex items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-charcoal">{entry.type || 'Assessment'}</p>
                            <p className="text-xs text-charcoal/60">
                              {entry.createdAt
                                ? new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Unknown date'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-charcoal">
                            {Number(entry.score || 0)}{entry.maxScore ? `/${entry.maxScore}` : ''}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${levelClass}`}>
                            {level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          {hasUrgentSession ? (
            <section className="relative overflow-hidden rounded-3xl border border-calm-sage/15 bg-charcoal p-1 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-900/40 to-transparent" />
              <div className="relative flex flex-col items-center justify-between gap-6 rounded-[20px] bg-charcoal/90 p-6 backdrop-blur-xl md:flex-row md:p-8">
                <div className="flex w-full items-center gap-5 md:w-auto">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-800 text-xl font-bold text-teal-100">
                      {(nextSession.provider?.name || 'T').charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-300">Next Appointment</h2>
                    <p className="mt-1 text-2xl font-bold text-white">{nextSession.provider?.name || 'Assigned Therapist'}</p>
                  </div>
                </div>

                {isLockedSession ? (
                  <div className="w-full md:w-auto">
                    <span className="inline-flex items-center rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      Confirmed by Dr. {nextSessionProviderName}
                    </span>
                  </div>
                ) : null}

                <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
                  {isWithin10Minutes && !needsPreSessionCheckin ? (
                    <Link
                      to={`/video-session/${nextSession.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3.5 text-sm font-bold text-charcoal shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:bg-green-400"
                    >
                      <Video className="h-4 w-4" />
                      Join Video Room
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3.5 text-sm font-bold text-white/50"
                    >
                      <Video className="h-4 w-4" />
                      {needsPreSessionCheckin ? 'Complete Check-in First' : 'Opens 10 mins prior'}
                    </button>
                  )}
                </div>

                {isLockedSession ? (
                  <p className="w-full text-xs text-white/80 md:mt-1">
                    This session time is fixed to ensure clinical consistency. Please contact support for emergency cancellations.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="space-y-4 pt-6">
            <h3 className="text-lg font-bold text-charcoal">Session History & Notes</h3>
            {history.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-calm-sage/15 bg-white shadow-soft-sm">
                <div className="divide-y divide-calm-sage/10">
                  {history.map((session) => {
                    const scheduledDate = new Date(session.scheduled_at || session.scheduledAt);
                    const isCompleted = session.status === 'completed';

                    return (
                      <div key={session.id} className="flex flex-col gap-4 p-4 transition-colors hover:bg-calm-sage/5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-xl p-2 ${isCompleted ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            <Activity className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-charcoal">{session.provider?.name || 'Assigned Therapist'}</p>
                            <p className="mt-0.5 text-xs text-charcoal/60">
                              {scheduledDate.toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 pl-12 sm:pl-0">
                          {isCompleted ? (
                            <Link
                              to={`/patient/sessions/${session.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-calm-sage/20 px-3 py-1.5 text-xs font-medium text-charcoal/70 transition hover:bg-calm-sage/10 hover:text-charcoal"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Clinical Note
                            </Link>
                          ) : null}
                          {isCompleted || session.paymentStatus === 'PAID' ? (
                            <button
                              onClick={() => void handleDownloadInvoice(session.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-calm-sage/20 px-3 py-1.5 text-xs font-medium text-charcoal/70 transition hover:bg-calm-sage/10 hover:text-charcoal"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Invoice
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        </>
      )}

      {isPreviousProvidersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-calm-sage/20 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-charcoal">Book with your previous provider</h3>
                <p className="mt-1 text-sm text-charcoal/65">
                  Select your earlier consulted provider, or choose a new specialist.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviousProvidersOpen(false)}
                className="rounded-full p-2 text-charcoal/45 transition hover:bg-calm-sage/10 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {previousConsultedProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="rounded-xl border border-calm-sage/20 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{provider.name}</p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700/80">
                        {provider.role || 'Therapist'}
                      </p>
                      <p className="mt-1 text-xs text-charcoal/55">
                        {provider.lastConnectedAt
                          ? `Last connected: ${new Date(provider.lastConnectedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}`
                          : 'Last connected: Not available'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPreviousProvidersOpen(false);
                        void openBookingDrawer(provider);
                      }}
                      className="inline-flex items-center rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
                    >
                      Book with this provider
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsPreviousProvidersOpen(false)}
                className="flex-1 rounded-lg border border-calm-sage/20 px-4 py-2 text-sm font-medium text-charcoal transition hover:bg-calm-sage/5"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPreviousProvidersOpen(false);
                  setSmartMatchPreferences({
                    initialProviderType: 'ALL',
                    lockProviderType: false,
                  });
                  setIsSmartMatchOpen(true);
                }}
                className="flex-1 rounded-lg bg-charcoal px-4 py-2 text-sm font-semibold text-white transition hover:bg-charcoal/90"
              >
                Book with new specialist
              </button>
            </div>
          </div>
        </div>
      )}

      <SlideOverBookingDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        provider={selectedProvider}
        onBookingSuccess={() => {
          void fetchData();
          if (bookingContext?.fromAssessment) {
            clearAssessmentDraft();
            setIsClinicalAssessmentOpen(false);
            setClinicalFlowPhase('intro');
            setClinicalFlowError(null);
            setBookingContext(null);
            setSuggestedProviders([]);
            setActiveCarePathLabel('');
          }
        }}
      />

      <SmartMatchFlow
        isOpen={isSmartMatchOpen}
        initialProviderType={smartMatchPreferences.initialProviderType}
        lockProviderType={smartMatchPreferences.lockProviderType}
        onClose={() => {
          setIsSmartMatchOpen(false);
          setSmartMatchPreferences({
            initialProviderType: 'ALL',
            lockProviderType: false,
          });
        }}
        onSuccess={() => {
          setIsSmartMatchOpen(false);
          setSmartMatchPreferences({
            initialProviderType: 'ALL',
            lockProviderType: false,
          });
          void fetchData();
          if (bookingContext?.fromAssessment) {
            clearAssessmentDraft();
            setIsClinicalAssessmentOpen(false);
            setClinicalFlowPhase('intro');
            setClinicalFlowError(null);
            setBookingContext(null);
            setSuggestedProviders([]);
            setActiveCarePathLabel('');
          }
        }}
      />
    </div>
  );
}
