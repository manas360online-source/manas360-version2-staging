import { http } from '../lib/http';
import {
  CLINICAL_ASSESSMENT_OPTIONS,
  CLINICAL_QUESTION_BANK,
  inferClinicalAssessmentType,
  severityFromClinicalScore,
} from '../utils/clinicalAssessments';

export type JourneyPathway = 'stepped-care' | 'direct-provider' | 'urgent-care';

export type JourneyRecommendationResponse = {
  pathway: JourneyPathway;
  severity?: string;
  followUpDays?: number;
  recommendation?: {
    providerTypes?: string[];
    urgency?: 'routine' | 'priority' | 'urgent' | string;
    rationale?: string[];
  };
  crisis?: {
    detected: boolean;
    reason?: string | null;
  };
  nextActions?: string[];
  assessment?: {
    id?: string;
    type?: string;
    score?: number;
  };
  selectedPathway?: {
    pathway: JourneyPathway;
    reason?: string | null;
    selectedAt?: string;
    updatedAt?: string;
  };
};

export type JourneySelectPathwayRequest = {
  pathway: JourneyPathway;
  reason?: string;
  metadata?: Record<string, any>;
};

export type JourneySelectPathwayResponse = {
  pathway: JourneyPathway;
  reason?: string | null;
  selectedAt?: string;
  updatedAt?: string;
};

export type JourneyQuickScreeningRequest = {
  answers: number[];
};

export type JourneyClinicalRequest = {
  type: 'PHQ-9' | 'GAD-7';
  score?: number;
  answers?: number[];
};

export type StructuredAssessmentQuestion = {
  questionId: string;
  position: number;
  prompt: string;
  sectionKey: string;
  options: Array<{
    optionIndex: number;
    label: string;
    points: number;
  }>;
};

export type StructuredAssessmentStartResponse = {
  attemptId: string;
  attemptToken?: string;
  template: {
    id: string;
    key: string;
    title: string;
    description?: string;
    estimatedMinutes?: number;
  };
  questions: StructuredAssessmentQuestion[];
};

export type StructuredAssessmentSubmitResponse = {
  attemptId: string;
  templateKey: string;
  totalScore: number;
  severityLevel: string;
  interpretation: string;
  recommendation: string;
  action: string;
};

export type ActiveCbtAssignment = {
  id: string;
  templateType: string;
  title: string;
  description: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | string;
  createdAt: string;
  providerName: string;
};

export type CbtAssignmentDetail = {
  id: string;
  templateType: string;
  title: string;
  description: string;
  steps: Array<{
    id: string;
    title: string;
    prompt: string;
    inputType: string;
    options?: string[];
    min?: number;
    max?: number;
  }>;
  responses: Record<string, unknown>;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | string;
  providerId: string;
  providerName: string;
  createdAt: string;
  updatedAt: string;
};

export type ProgressPayload = {
  completedSessions: number;
  totalSessions: number;
  exercisesCompleted: number;
  totalExercises: number;
  streakDays: number;
  improvementPercent: number;
  lastAssessmentScore: number | null;
};

export type SmartMatchProvidersResult = {
  providers: any[];
  count: number;
  error?: boolean;
  status?: number;
  message?: string;
};

const DEFAULT_SMART_MATCH_AVAILABILITY = {
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  timeSlots: [{ startMinute: 0, endMinute: 1439 }],
};

const unwrapPayload = <T = any>(value: any): T => {
  if (value && typeof value === 'object') {
    if (value.data !== undefined) {
      return unwrapPayload<T>(value.data);
    }
    if (value.subscription !== undefined) {
      return unwrapPayload<T>(value.subscription);
    }
  }
  return value as T;
};

const isOnboardingMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('patient profile not found')
    || normalized.includes('patient profile unavailable')
    || normalized.includes('complete onboarding')
    || normalized.includes('create profile first')
  );
};

export const isOnboardingRequiredError = (error: any): boolean => {
  const status = Number(error?.response?.status || 0);
  const message = String(error?.response?.data?.message || error?.message || '');
  if (isOnboardingMessage(message)) return true;
  return status === 404 && isOnboardingMessage(message);
};

export const patientApi = {
  getDashboard: async () => (await http.get('/v1/patient/dashboard')).data,
  getDashboardV2: async () => (await http.get('/v1/patient/dashboard')).data,
  changePassword: async (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    (await http.patch('/v1/users/me/password', payload)).data,
  getActiveSessions: async () => (await http.get('/v1/users/me/sessions')).data,
  revokeSession: async (id: string) => (await http.delete(`/v1/users/me/sessions/${encodeURIComponent(id)}`)).data,
  revokeAllSessions: async () => (await http.delete('/v1/users/me/sessions')).data,
  getSettings: async () => (await http.get('/v1/patient/settings')).data,
  updateSettings: async (settings: Record<string, any>) => (await http.put('/v1/patient/settings', { settings })).data,
  getSupportCenter: async () => (await http.get('/v1/patient/support')).data,
  createSupportTicket: async (payload: { subject: string; message: string; category?: string; priority?: string }) =>
    (await http.post('/v1/patient/support/tickets', payload)).data,
  listProviders: async (params?: { specialization?: string; language?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number }) =>
    (await http.get('/v1/providers', { params })).data,
  getProvider: async (id: string) => (await http.get(`/v1/providers/${encodeURIComponent(id)}`)).data,
  bookSession: async (payload: {
    providerId: string;
    scheduledAt: string;
    durationMinutes?: number;
    amountMinor?: number;
    providerType?: string;
    preferredTime?: boolean;
    preferredWindow?: string;
    sourceFunnel?: string;
  }) =>
    (await http.post('/v1/sessions/book', payload)).data,
  verifyPayment: async (payload: { merchantTransactionId: string; transactionId: string; signature: string }) =>
    (await http.post('/v1/payments/verify', payload)).data,
  getUpcomingSessions: async () => (await http.get('/v1/sessions/upcoming')).data,
  getSessionHistory: async () => (await http.get('/v1/sessions/history')).data,
  getSessionDetail: async (id: string) => (await http.get(`/v1/sessions/${encodeURIComponent(id)}`)).data,
  downloadSessionPdf: async (id: string) =>
    (await http.get(`/v1/sessions/${encodeURIComponent(id)}/documents/session-pdf`, { responseType: 'blob' })).data,
  downloadInvoicePdf: async (id: string) =>
    (await http.get(`/v1/sessions/${encodeURIComponent(id)}/documents/invoice`, { responseType: 'blob' })).data,
  submitAssessment: async (payload: { type: string; score?: number; answers?: number[] }) => {
    const normalizedType = inferClinicalAssessmentType(payload.type);
    return (await http.post('/v1/patient-journey/clinical-assessment', {
      type: normalizedType,
      score: payload.score,
      answers: payload.answers,
    })).data;
  },
	submitPHQ9: async (answers: number[]) =>
		(await http.post('/v1/patient-journey/clinical-assessment', { type: 'PHQ-9', answers })).data,
  submitQuickScreeningJourney: async (payload: JourneyQuickScreeningRequest): Promise<JourneyRecommendationResponse> =>
    (await http.post('/v1/patient-journey/quick-screening', payload)).data,
  submitClinicalJourney: async (payload: JourneyClinicalRequest): Promise<JourneyRecommendationResponse> =>
    (await http.post('/v1/patient-journey/clinical-assessment', payload)).data,
  submitPresetAssessment: async (payload: {
    entryType: string;
    responses: number[];
    source?: {
      entryType?: string;
      landingPage?: string;
      utmCampaign?: string;
      utmMedium?: string;
      utmSource?: string;
      timezoneRegion?: string;
      primaryConcerns?: string[];
      languagePreference?: string;
    };
  }) => {
    return (await http.post('/v1/assessments/preset-submit', {
      entryType: payload.entryType,
      responses: payload.responses,
      source: payload.source,
    })).data;
  },
  startStructuredAssessment: async (payload: { templateKey: string }): Promise<StructuredAssessmentStartResponse> => {
    const type = inferClinicalAssessmentType(payload.templateKey);
    const questions = CLINICAL_QUESTION_BANK[type].map((prompt: string, index: number) => ({
      questionId: `${type}-${index + 1}`,
      position: index + 1,
      prompt,
      sectionKey: type,
      options: CLINICAL_ASSESSMENT_OPTIONS,
    }));

    return {
      attemptId: `${type}-${Date.now()}`,
      template: {
        id: type,
        key: payload.templateKey,
        title: type,
        description: `${type} standard assessment`,
        estimatedMinutes: type === 'PHQ-9' ? 4 : 3,
      },
      questions,
    };
  },
  submitStructuredAssessment: async (
    attemptId: string,
    payload: { answers: Array<{ questionId: string; optionIndex: number }> },
  ): Promise<StructuredAssessmentSubmitResponse> => {
    const type = inferClinicalAssessmentType(attemptId);
    const numericAnswers = (payload.answers || []).map((item) => Number(item.optionIndex || 0));
    const totalScore = numericAnswers.reduce((sum, score) => sum + score, 0);

    await http.post('/v1/patient-journey/clinical-assessment', {
      type,
      answers: numericAnswers,
    });

    return {
      attemptId,
      templateKey: type,
      totalScore,
      severityLevel: severityFromClinicalScore(type, totalScore),
      interpretation: `${type} submitted successfully`,
      recommendation: 'Continue with the recommended care pathway.',
      action: 'Continue',
    };
  },
  getStructuredAssessmentHistory: async () => {
    const response = await http.get('/v1/patient/me/assessments', { params: { page: 1, limit: 50 } });
    const payload = response.data?.data ?? response.data;
    const items = Array.isArray(payload?.items) ? payload.items : [];

    return {
      items: items
        .filter((entry: any) => {
          const type = String(entry.type || '').toLowerCase();
          return type.includes('phq-9') || type.includes('phq9') || type.includes('gad-7') || type.includes('gad7');
        })
        .map((entry: any) => ({
          attemptId: entry.id,
          templateKey: entry.type,
          templateTitle: entry.type,
          totalScore: Number(entry.score || 0),
          severityLevel: String(entry.severityLevel || 'mild'),
          interpretation: '',
          recommendation: '',
          action: 'Continue',
          submittedAt: entry.createdAt,
        })),
    };
  },
  getPatientAssessmentHistory: async (params?: { page?: number; limit?: number; type?: string }) =>
    (await http.get('/v1/patient/me/assessments', { params })).data,
  getPatientAssessmentStatus: async (): Promise<{ phq9Complete: boolean; gad7Complete: boolean }> => {
    const response = await http.get('/v1/patient/me/assessments', { params: { page: 1, limit: 50 } });
    const payload = response.data?.data ?? response.data;
    const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
    const normalizedTypes = items.map((entry: any) => String(entry?.type || '').toUpperCase());

    return {
      phq9Complete: normalizedTypes.some((type: string) => type.includes('PHQ-9') || type.includes('PHQ9')),
      gad7Complete: normalizedTypes.some((type: string) => type.includes('GAD-7') || type.includes('GAD7')),
    };
  },
  getJourneyRecommendation: async (): Promise<JourneyRecommendationResponse> =>
    (await http.get('/v1/patient-journey/recommendation')).data,
  selectJourneyPathway: async (payload: JourneySelectPathwayRequest): Promise<JourneySelectPathwayResponse> =>
    (await http.post('/v1/patient-journey/select-pathway', payload)).data,
  addMood: async (payload: { mood: number; note?: string }) => (await http.post('/v1/patient/mood', payload)).data,
  getMoodHistory: async () => (await http.get('/v1/patient/mood/history')).data,
  getMoodLogs: async () => (await http.get('/v1/patient/mood')).data,
  getMoodToday: async () => (await http.get('/v1/patient/mood/today')).data,
  getMoodStats: async () => (await http.get('/v1/patient/mood/stats')).data,
  addMoodLog: async (payload: { mood: number; note?: string; intensity?: number; tags?: string[]; energy?: 'low' | 'medium' | 'high'; sleepHours?: string }) =>
    (await http.post('/v1/patient/mood', payload)).data,
  addDailyCheckIn: async (payload: {
    type: 'morning' | 'evening';
    mood?: number;
    energy?: 'low' | 'medium' | 'high';
    sleep?: string;
    context?: string[];
    intention?: string;
    reflectionGood?: string;
    reflectionBad?: string;
    stressLevel?: number;
    gratitude?: string;
  }) => (await http.post('/v1/patient/daily-checkin', payload)).data,
  saveSleepSessionReflection: async (payload: {
    reflection: string;
    mood?: number;
    stressLevel?: number;
    gratitude?: string;
    challenge?: string;
    date?: string;
  }) => {
    const safeReflection = String(payload.reflection || '').trim() || 'Completed Nidra Sleep Therapy session.';
    const safeMood = Math.max(1, Math.min(5, Number(payload.mood ?? 4)));
    const safeStress = Math.max(1, Math.min(5, Number(payload.stressLevel ?? 2)));
    const safeGratitude = String(payload.gratitude || '').trim() || 'I completed my sleep preparation routine.';
    const safeChallenge = String(payload.challenge || '').trim() || 'No major challenge noted before sleep.';
    const safeDate = payload.date || new Date().toISOString();

    const legacyPayload = {
      type: 'evening' as const,
      mood: safeMood,
      reflectionGood: safeReflection,
      reflectionBad: safeChallenge,
      stressLevel: safeStress,
      gratitude: safeGratitude,
      date: safeDate,
    };

    return (await http.post('/v1/patient/daily-checkin', legacyPayload)).data;
  },
  getProgress: async () => {
    const normalize = (raw: any): ProgressPayload => {
      if (!raw) return {
        completedSessions: 0,
        totalSessions: 0,
        exercisesCompleted: 0,
        totalExercises: 0,
        streakDays: 0,
        improvementPercent: 0,
        lastAssessmentScore: null,
      };

      // If payload is a wrapper { data: { ... } }
      const payload = raw?.data ?? raw;

      // If the payload already looks like a progress object
      if (typeof payload.completedSessions !== 'undefined' || typeof payload.sessionsCompleted !== 'undefined') {
        return {
          completedSessions: Number(payload.completedSessions ?? payload.sessionsCompleted ?? 0),
          totalSessions: Number(payload.totalSessions ?? 0),
          exercisesCompleted: Number(payload.exercisesCompleted ?? payload.completedExercises ?? 0),
          totalExercises: Number(payload.totalExercises ?? 0),
          streakDays: Number(payload.streakDays ?? payload.streak ?? 0),
          improvementPercent: Number(payload.improvementPercent ?? payload.improvement ?? 0),
          lastAssessmentScore: payload.lastAssessmentScore ?? payload.phqCurrent ?? null,
        };
      }

      // If payload is a full dashboard that contains `progress` key
      if (payload?.progress) {
        const p = payload.progress;
        return {
          completedSessions: Number(p.completedSessions ?? p.sessionsCompleted ?? 0),
          totalSessions: Number(p.totalSessions ?? 0),
          exercisesCompleted: Number(p.exercisesCompleted ?? p.completedExercises ?? 0),
          totalExercises: Number(p.totalExercises ?? 0),
          streakDays: Number(p.streakDays ?? p.streak ?? 0),
          improvementPercent: Number(p.improvementPercent ?? p.improvement ?? 0),
          lastAssessmentScore: p.lastAssessmentScore ?? p.phqCurrent ?? null,
        };
      }

      // Fallback empty shape
      return {
        completedSessions: 0,
        totalSessions: 0,
        exercisesCompleted: 0,
        totalExercises: 0,
        streakDays: 0,
        improvementPercent: 0,
        lastAssessmentScore: null,
      };
    };

    const tryChain = (await http.get('/v1/patient/progress')).data;

    // tryChain may be either a progress object or a full dashboard; normalize and return
    return { progress: normalize(tryChain) } as any;
  },
  createProfile: async (payload: {
    age: number;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    medicalHistory?: string;
    carrier?: string;
    emergencyContact?: { name: string; relation: string; phone: string };
  }) => (await http.post('/v1/patients/profile', payload)).data,
  getMyProfile: async () => (await http.get('/v1/patients/me/profile')).data,
  getSubscription: async () => {
    const response = (await http.get('/v1/patient/subscription')).data;
    return unwrapPayload(response);
  },
  getPublicGameRoll: async () => {
    const response = (await http.get('/v1/game/public-roll')).data;
    return unwrapPayload(response);
  },
  getGameEligibility: async () => {
    const response = (await http.get('/v1/game/eligibility')).data;
    const raw = unwrapPayload(response);
    // Timing info may be in 'timing' (new) or 'data' (legacy/unwrapped)
    const timing = raw?.timing || raw?.data || raw || {};
    return {
      ...raw,
      ...timing,
      eligible: !!raw?.eligible,
      reason: raw?.error || raw?.message || (raw?.eligible ? 'Eligible' : 'Not eligible'),
      timeLeft: timing?.time_remaining_seconds
        ? `${Math.floor(timing.time_remaining_seconds / 3600)}h ${Math.floor((timing.time_remaining_seconds % 3600) / 60)}m`
        : '0h 0m',
    };
  },
  playGame: async () => {
    const response = (await http.post('/v1/game/play')).data;
    const raw = unwrapPayload(response);

    // Map backend response { outcome, prize: { amount }, wallet: { new_balance } }
    // to frontend expected { outcome, credit, newBalance }
    return {
      outcome: raw?.outcome,
      credit: raw?.prize?.amount ?? raw?.wallet?.credit_added ?? 0,
      newBalance: raw?.wallet?.new_balance ?? 0,
      success: raw?.success
    };
  },
  getGameWinners: async (limit = 10) => {
    const response = (await http.get('/v1/game/winners', { params: { limit } })).data;
    return unwrapPayload(response);
  },
  getWalletBalance: async () => {
    const response = (await http.get('/v1/wallet/balance')).data;
    return unwrapPayload(response);
  },
  applyWalletCredits: async (payload: { referenceId?: string; referenceType?: string; bookingId?: string; amount: number }) => {
    const response = (await http.post('/v1/wallet/apply', payload)).data;
    return unwrapPayload(response);
  },
  createSessionPayment: async (payload: { providerId: string; amountMinor: number; currency?: string }) => {
    const response = await http.post('/v1/payments/sessions', payload);
    return unwrapPayload(response.data);
  },
  upgradeSubscription: async (payload: { planKey: string; redirectUrl?: string }) => {
    const response = (await http.patch('/v1/patient/subscription/upgrade', payload)).data;
    return unwrapPayload(response);
  },
  checkoutSubscription: async (payload: {
    planKey: string;
    addons: Record<string, unknown>;
    subtotalMinor: number;
    gstMinor: number;
    totalMinor: number;
    acceptedTerms: boolean;
    promoCode?: string;
    idempotencyKey?: string;
  }) => {
    const response = (await http.post('/v1/patient/subscription/checkout', payload)).data;
    return unwrapPayload(response);
  },
  getPremiumLibraryUsage: async () => {
    const response = (await http.get('/v1/patient/subscription/premium-library')).data;
    return unwrapPayload(response);
  },
  consumePremiumLibraryUsage: async (payload: { secondsSpent: number; source?: string }) => {
    const response = (await http.post('/v1/patient/subscription/premium-library/consume', payload)).data;
    return unwrapPayload(response);
  },
  downgradeSubscription: async () => {
    const response = (await http.patch('/v1/patient/subscription/downgrade')).data;
    return unwrapPayload(response);
  },
  cancelSubscription: async () =>
    (await http.patch('/v1/patient/subscription/cancel')).data,
  reactivateSubscription: async () =>
    (await http.patch('/v1/patient/subscription/reactivate')).data,
  setSubscriptionAutoRenew: async (autoRenew: boolean) =>
    (await http.patch('/v1/patient/subscription/auto-renew', { autoRenew })).data,
  getPaymentMethod: async () =>
    (await http.get('/v1/patient/payment-method')).data,
  updatePaymentMethod: async (payload: { cardLast4: string; cardBrand: string; expiryMonth: number; expiryYear: number }) =>
    (await http.put('/v1/patient/payment-method', payload)).data,
  getInvoices: async () =>
    // Disabled: invoices removed from backend
    [],
  downloadInvoice: async (_id: string) => {
    throw new Error('Invoice downloads are disabled');
  },
  getExercises: async () => (await http.get('/v1/patient/exercises')).data,
  logWellnessLibraryActivity: async (payload: { title: string; duration?: number; category?: string; kind?: 'audio' | 'interactive' }) =>
    (await http.post('/v1/patient/exercises/library', payload)).data,
  completeExercise: async (id: string) => (await http.patch(`/v1/patient/exercises/${encodeURIComponent(id)}/complete`)).data,
  getTherapyPlan: async (week?: number) =>
    (await http.get('/v1/therapy-plan', { params: week ? { week } : undefined })).data,
  completeTherapyPlanTask: async (id: string) => (await http.patch(`/v1/therapy-plan/tasks/${encodeURIComponent(id)}/complete`)).data,
  getPetState: async () =>
    (await http.get('/v1/patient/pets/state')).data,
  upsertPetState: async (payload: { selectedPet: 'koi' | 'pup' | 'owl'; vitality: number; unlockedItems: string[]; isPremium: boolean }) =>
    (await http.put('/v1/patient/pets/state', payload)).data,
  getActiveCbtAssignments: async (): Promise<ActiveCbtAssignment[]> => {
    const response = await http.get('/v1/patient/cbt-assignments/active');
    return response.data?.data ?? response.data ?? [];
  },
  getCbtAssignmentDetail: async (assignmentId: string): Promise<CbtAssignmentDetail> => {
    const response = await http.get(`/v1/patient/cbt-assignments/${encodeURIComponent(assignmentId)}`);
    return response.data?.data ?? response.data;
  },
  saveCbtAssignmentProgress: async (
    assignmentId: string,
    payload: { responses: Record<string, unknown>; currentStep?: number; status?: 'IN_PROGRESS' | 'COMPLETED' },
  ) => {
    const response = await http.patch(`/v1/patient/cbt-assignments/${encodeURIComponent(assignmentId)}`, payload);
    return response.data?.data ?? response.data;
  },
  getPricing: async (params?: { mode?: 'domestic' | 'nri' }) =>
    (await http.get('/v1/pricing', { params })).data,
  aiChat: async (payload: { message: string; bot_type?: 'mood_ai' | 'clinical_ai'; response_style?: 'concise' | 'detailed' }) =>
    (await http.post('/chat/message', {
      message: payload.message,
      bot_type: payload.bot_type || 'mood_ai',
      response_style: payload.response_style || 'concise',
    })).data,
  getCurrentRisk: async (userId: string) =>
    (await http.get(`/v1/risk/${encodeURIComponent(userId)}/current`)).data,
  getNotifications: async () => (await http.get('/v1/notifications')).data,
  markNotificationRead: async (id: string) => (await http.patch(`/v1/notifications/${encodeURIComponent(id)}/read`)).data,
    // Progress & Analytics
    getInsights: async () => {
      const res = await http.get('/v1/patient/insights');
      return res.data?.data ?? res.data;
    },
    getReports: async () => (await http.get('/v1/patient/reports')).data,
    getSharedReportMeta: async (id: string) => (await http.get(`/v1/patient/reports/shared/${encodeURIComponent(id)}`)).data,
    downloadSharedReport: async (id: string) =>
      (await http.get(`/v1/patient/reports/shared/${encodeURIComponent(id)}/download`, { responseType: 'blob' })).data,
    generateCompleteHealthSummary: async () => {
      const resp = await http.post('/v1/patient/reports/health-summary', {}, { responseType: 'blob' });
      return resp.data;
    },
    getRecordSecureUrl: async (id: string) => (await http.get(`/v1/patient/records/${encodeURIComponent(id)}/url`)).data,
    createRecordShareLink: async (id: string) => (await http.post(`/v1/patient/records/${encodeURIComponent(id)}/share`)).data,
    // Documents
    getDocuments: async () => (await http.get('/v1/patient/documents')).data,
    uploadDocument: async (payload: FormData) =>
      (await http.post('/v1/patient/documents/upload', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data,
    getDocumentDownloadUrl: async (id: string) => (await http.get(`/v1/patient/documents/${encodeURIComponent(id)}/download`)).data,
    // Care Team
    getMyProviders: async () => (await http.get('/v1/patient/care-team')).data,
    getAvailableProviders: async (params?: { specialization?: string; language?: string; maxPrice?: number; role?: string }) => {
      const result = await patientApi.getAvailableProvidersForSmartMatch(
        DEFAULT_SMART_MATCH_AVAILABILITY,
        params?.role,
        {
          languages: params?.language ? [params.language] : undefined,
        },
      );

      let providers = Array.isArray(result.providers) ? result.providers : [];
      if (params?.specialization) {
        const specialization = String(params.specialization).toLowerCase();
        providers = providers.filter((provider: any) => {
          const specializations = Array.isArray(provider?.specializations)
            ? provider.specializations
            : [provider?.specialization].filter(Boolean);
          return specializations.some((item: string) => String(item).toLowerCase().includes(specialization));
        });
      }
      if (typeof params?.maxPrice === 'number') {
        providers = providers.filter((provider: any) => Number(provider?.sessionPrice || provider?.session_rate || 0) <= Number(params.maxPrice));
      }

      return {
        data: {
          items: providers,
          total: providers.length,
          page: 1,
          limit: providers.length,
        },
      };
    },
      requestAppointmentToPreferredProviders: async (payload: {
        providerIds: string[];
        preferredLanguage?: string;
        preferredTime?: string;
        preferredSpecialization?: string;
        carePath?: string;
        urgency?: string;
        note?: string;
      }) =>
        (await http.post('/v1/patient/appointments/smart-match', {
          availabilityPrefs: DEFAULT_SMART_MATCH_AVAILABILITY,
          providerIds: payload.providerIds,
          preferredSpecialization: payload.preferredSpecialization,
          context: payload.carePath,
          languages: payload.preferredLanguage ? [payload.preferredLanguage] : undefined,
          note: payload.note,
        })).data,
      confirmProposedAppointmentSlot: async (payload: {
        requestRef: string;
        providerId: string;
        proposedStartAt?: string;
        accept: boolean;
      }) =>
        (await http.post('/v1/patient/appointments/smart-match/confirm-slot', payload)).data,
    // Messaging
    getConversations: async () => (await http.get('/v1/patient/messages/conversations')).data,
    getMessages: async (conversationId: string) => (await http.get(`/v1/patient/messages/${encodeURIComponent(conversationId)}`)).data,
    sendMessage: async (payload: { conversationId: string; content: string }) =>
      (await http.post('/v1/patient/messages', payload)).data,
      startConversation: async (payload: { providerId: string }) =>
        (await http.post('/v1/patient/messages/start', payload)).data,
      markMessagesRead: async (conversationId: string) =>
        (await http.post(`/v1/patient/messages/${encodeURIComponent(conversationId)}/read`, {})).data,

  // Smart Match Appointment Booking
  getAvailableProvidersForSmartMatch: async (
    availabilityPrefs: {
      daysOfWeek: number[];
      timeSlots: Array<{ startMinute: number; endMinute: number }>;
    },
    providerType?: string,
    options?: {
      concerns?: string[];
      languages?: string[];
      modes?: string[];
      context?: 'Standard' | 'Corporate' | 'Night' | 'Buddy' | 'Crisis';
      presetEntryType?: string;
      timezoneRegion?: string;
      sourceFunnel?: string;
    },
  ): Promise<SmartMatchProvidersResult> => {
    const query = new URLSearchParams();
    availabilityPrefs.daysOfWeek.forEach((day) => {
      query.append('daysOfWeek', String(day));
    });
    availabilityPrefs.timeSlots.forEach((slot) => {
      query.append(`timeSlots`, `${slot.startMinute}-${slot.endMinute}`);
    });
    if (providerType && providerType !== 'ALL') {
      query.append('providerType', providerType);
    }
    (options?.concerns || []).forEach((concern) => query.append('concerns', concern));
    (options?.languages || []).forEach((language) => query.append('languages', language));
    (options?.modes || []).forEach((mode) => query.append('modes', mode));
    if (options?.context) query.append('context', options.context);
    if (options?.presetEntryType) query.append('entryType', options.presetEntryType);
    if (options?.timezoneRegion) query.append('timezoneRegion', options.timezoneRegion);
    if (options?.sourceFunnel) query.append('sourceFunnel', options.sourceFunnel);
    try {
      const response = (await http.get(`/v1/patient/providers/smart-match?${query}`)).data;
      const payload = response?.data ?? response;
      const providers = Array.isArray(payload?.providers) ? payload.providers : [];
      const count = Number(payload?.count ?? providers.length ?? 0);
      return { providers, count, error: false };
    } catch (err: any) {
      return {
        providers: [],
        count: 0,
        error: true,
        status: Number(err?.response?.status ?? 500),
        message: String(err?.response?.data?.message || err?.message || 'Failed to fetch providers'),
      };
    }
  },

  createAppointmentRequest: async (payload: {
    availabilityPrefs: {
      daysOfWeek: number[];
      timeSlots: Array<{ startMinute: number; endMinute: number }>;
    };
    providerIds: string[];
    preferredSpecialization?: string;
    durationMinutes?: number;
    sourceFunnel?: string;
    presetEntryType?: string;
    timezoneRegion?: string;
    concerns?: string[];
    languages?: string[];
    modes?: string[];
    rankedProviders?: Array<{
      providerId: string;
      score?: number;
      tier?: 'HOT' | 'WARM' | 'COLD';
      breakdown?: { expertise: number; communication: number; quality: number };
    }>;
    payment?: {
      merchantTransactionId?: string;
    };
  }) => (await http.post('/v1/patient/appointments/smart-match', payload)).data,

  getPendingAppointmentRequests: async () =>
    (await http.get('/v1/patient/appointments/requests/pending')).data,

  getPaymentPendingRequest: async () =>
    (await http.get('/v1/patient/appointments/payment-pending')).data,
  };
