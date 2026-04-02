import { http } from '../lib/http';

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

const withV1Fallback = async <T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> => {
  try {
    return await primary();
  } catch (error: any) {
    const status = Number(error?.response?.status || 0);
    if (isOnboardingRequiredError(error)) {
      throw error;
    }
    if (status === 404) {
      return fallback();
    }
    throw error;
  }
};

const withFallbackChain = async <T>(requests: Array<() => Promise<T>>): Promise<T> => {
  let lastError: unknown;

  for (const request of requests) {
    try {
      return await request();
    } catch (error: any) {
      if (isOnboardingRequiredError(error)) {
        throw error;
      }
      const status = Number(error?.response?.status || 0);
      if (status !== 404) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError ?? new Error('No fallback endpoint succeeded');
};

export const patientApi = {
  getDashboard: async () =>
    withFallbackChain([
      async () => (await http.get('/patient/dashboard')).data,
      async () => (await http.get('/patient/dashboard')).data,
    ]),
  getDashboardV2: async () =>
    withFallbackChain([
      async () => (await http.get('/patient/dashboard')).data,
      async () => (await http.get('/patient/dashboard')).data,
    ]),
  changePassword: async (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    (await http.patch('/users/me/password', payload)).data,
  getActiveSessions: async () => (await http.get('/users/me/sessions')).data,
  revokeSession: async (id: string) => (await http.delete(`/v1/users/me/sessions/${encodeURIComponent(id)}`)).data,
  revokeAllSessions: async () => (await http.delete('/users/me/sessions')).data,
  getSettings: async () => (await http.get('/patient/settings')).data,
  updateSettings: async (settings: Record<string, any>) => (await http.put('/patient/settings', { settings })).data,
  getSupportCenter: async () => (await http.get('/patient/support')).data,
  createSupportTicket: async (payload: { subject: string; message: string; category?: string; priority?: string }) =>
    (await http.post('/patient/support/tickets', payload)).data,
  listProviders: async (params?: { specialization?: string; language?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number }) =>
    (await http.get('/providers', { params })).data,
  getProvider: async (id: string) => (await http.get(`/v1/providers/${encodeURIComponent(id)}`)).data,
  bookSession: async (payload: {
    providerId: string;
    scheduledAt: string;
    durationMinutes?: number;
    amountMinor?: number;
    providerType?: string;
    preferredTime?: boolean;
    preferredWindow?: string;
  }) =>
    (await http.post('/sessions/book', payload)).data,
  verifyPayment: async (payload: { merchantTransactionId: string; transactionId: string; signature: string }) =>
    (await http.post('/payments/verify', payload)).data,
  getUpcomingSessions: async () =>
    withFallbackChain([
      async () => (await http.get('/sessions/upcoming')).data,
      async () => {
        const sessions = (await http.get('/patients/me/sessions')).data;
        const rows = sessions?.data ?? sessions;
        return Array.isArray(rows)
          ? rows.filter((item: any) => String(item?.status || '').toLowerCase() !== 'completed')
          : [];
      },
    ]),
  getSessionHistory: async () =>
    withFallbackChain([
      async () => (await http.get('/sessions/history')).data,
      async () => (await http.get('/patients/me/sessions')).data,
    ]),
  getSessionDetail: async (id: string) => (await http.get(`/v1/sessions/${encodeURIComponent(id)}`)).data,
  downloadSessionPdf: async (id: string) =>
    (await http.get(`/v1/sessions/${encodeURIComponent(id)}/documents/session-pdf`, { responseType: 'blob' })).data,
  downloadInvoicePdf: async (id: string) =>
    (await http.get(`/v1/sessions/${encodeURIComponent(id)}/documents/invoice`, { responseType: 'blob' })).data,
  submitAssessment: async (payload: { type: string; score?: number; answers?: number[] }) =>
    (await http.post('/assessments/submit', payload)).data,
	submitPHQ9: async (answers: number[]) =>
		(await http.post('/assessments/phq9', { answers })).data,
  submitQuickScreeningJourney: async (payload: JourneyQuickScreeningRequest): Promise<JourneyRecommendationResponse> =>
    (await http.post('/patient-journey/quick-screening', payload)).data,
  submitClinicalJourney: async (payload: JourneyClinicalRequest): Promise<JourneyRecommendationResponse> =>
    (await http.post('/patient-journey/clinical-assessment', payload)).data,
  startStructuredAssessment: async (payload: { templateKey: string }): Promise<StructuredAssessmentStartResponse> => {
    try {
      const response = await http.post('/free-screening/start/me', payload);
      return response.data?.data ?? response.data;
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      if (status === 401) {
        // Not authenticated — fall back to public free-screening start endpoint
        const publicResp = await http.post('/free-screening/start', payload);
        return publicResp.data?.data ?? publicResp.data;
      }
      throw err;
    }
  },
  submitStructuredAssessment: async (
    attemptId: string,
    payload: { answers: Array<{ questionId: string; optionIndex: number }> },
  ): Promise<StructuredAssessmentSubmitResponse> => {
    const response = await http.post(`/v1/free-screening/${encodeURIComponent(attemptId)}/submit/me`, payload);
    return response.data?.data ?? response.data;
  },
  getStructuredAssessmentHistory: async () => {
    const response = await http.get('/free-screening/history');
    return response.data?.data ?? response.data;
  },
  getJourneyRecommendation: async (): Promise<JourneyRecommendationResponse> =>
    (await http.get('/patient-journey/recommendation')).data,
  selectJourneyPathway: async (payload: JourneySelectPathwayRequest): Promise<JourneySelectPathwayResponse> =>
    (await http.post('/patient-journey/select-pathway', payload)).data,
  addMood: async (payload: { mood: number; note?: string }) => (await http.post('/mood', payload)).data,
  getMoodHistory: async () =>
    withFallbackChain([
      async () => (await http.get('/patient/mood/history')).data,
      async () => (await http.get('/mood/history')).data,
    ]),
  getMoodLogs: async () => (await http.get('/patient/mood')).data,
  getMoodToday: async () =>
    withV1Fallback(
      async () => (await http.get('/patient/mood/today')).data,
      async () => ({ latest: null, entryCount: 0, date: new Date().toISOString() } as any),
    ),
  getMoodStats: async () =>
    withV1Fallback(
      async () => (await http.get('/patient/mood/stats')).data,
      async () => {
        const history = await withFallbackChain<any[]>([
          async () => (await http.get('/patient/mood/history')).data,
          async () => (await http.get('/mood/history')).data,
        ]);
        const rows = Array.isArray(history) ? history : [];
        const avg = rows.length
          ? Number((rows.reduce((sum, item) => sum + Number(item?.mood || 0), 0) / rows.length).toFixed(2))
          : 0;
        return {
          totalCheckins: rows.length,
          averageMood: avg,
          last7DaysAverage: avg,
          last30DaysAverage: avg,
          currentStreak: 0,
          longestStreak: 0,
          highestMood: rows.length ? Math.max(...rows.map((item) => Number(item?.mood || 0))) : 0,
          lowestMood: rows.length ? Math.min(...rows.map((item) => Number(item?.mood || 0))) : 0,
        };
      },
    ),
  addMoodLog: async (payload: { mood: number; note?: string; intensity?: number; tags?: string[]; energy?: 'low' | 'medium' | 'high'; sleepHours?: string }) =>
    (await http.post('/patient/mood', payload)).data,
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
  }) => (await http.post('/patient/daily-checkin', payload)).data,
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

    const v1Payload = {
      date: safeDate,
      type: 'EVENING' as const,
      mood: safeMood,
      reflectionGood: safeReflection,
      reflectionBad: safeChallenge,
      stressLevel: safeStress,
      gratitude: safeGratitude,
    };

    const legacyPayload = {
      type: 'evening' as const,
      mood: safeMood,
      reflectionGood: safeReflection,
      reflectionBad: safeChallenge,
      stressLevel: safeStress,
      gratitude: safeGratitude,
    };

    return withFallbackChain([
      async () => (await http.post('/patients/me/daily-checkin', v1Payload)).data,
      async () => (await http.post('/patient/me/daily-checkin', v1Payload)).data,
      async () => (await http.post('/patient/daily-checkin', legacyPayload)).data,
    ]);
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

    const tryChain = await withFallbackChain<any>([
      async () => (await http.get('/patient/progress')).data,
      async () => (await http.get('/patient/progress')).data,
      async () => {
        const dashboard = await withFallbackChain<any>([
          async () => (await http.get('/patient/dashboard')).data,
          async () => (await http.get('/patient/dashboard')).data,
        ]);
        return dashboard;
      },
    ]);

    // tryChain may be either a progress object or a full dashboard; normalize and return
    return { progress: normalize(tryChain) } as any;
  },
  createProfile: async (payload: {
    age: number;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    medicalHistory?: string;
    carrier?: string;
    emergencyContact?: { name: string; relation: string; phone: string };
  }) => (await http.post('/patients/profile', payload)).data,
  getMyProfile: async () =>
    withFallbackChain([
      async () => (await http.get('/patients/me/profile')).data,
      async () => (await http.get('/patient/me/profile')).data,
    ]),
  getSubscription: async () => {
    const response = await withFallbackChain([
      async () => (await http.get('/patient/subscription')).data,
      async () => (await http.get('/patient/subscription')).data,
      async () => (await http.get('/subscription')).data,
      async () => (await http.get('/subscription')).data,
    ]);
    return unwrapPayload(response);
  },
  getGameEligibility: async () => {
    const response = await withFallbackChain([
      async () => (await http.get('/game/eligibility')).data,
      async () => (await http.get('/game/eligibility')).data,
    ]);
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
    const response = await withFallbackChain([
      async () => (await http.post('/game/play')).data,
      async () => (await http.post('/game/play')).data,
    ]);
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
    const response = await withFallbackChain([
      async () => (await http.get('/game/winners', { params: { limit } })).data,
      async () => (await http.get('/game/winners', { params: { limit } })).data,
    ]);
    return unwrapPayload(response);
  },
  getWalletBalance: async () => {
    const response = await withFallbackChain([
      async () => (await http.get('/wallet/balance')).data,
      async () => (await http.get('/wallet/balance')).data,
    ]);
    return unwrapPayload(response);
  },
  applyWalletCredits: async (payload: { referenceId?: string; referenceType?: string; bookingId?: string; amount: number }) => {
    const response = await http.post('/wallet/apply', payload);
    return unwrapPayload(response.data);
  },
  createSessionPayment: async (payload: { providerId: string; amountMinor: number; currency?: string }) => {
    const response = await http.post('/payments/sessions', payload);
    return unwrapPayload(response.data);
  },
  upgradeSubscription: async (payload: { planKey: string; redirectUrl?: string }) => {
    const response = await withFallbackChain([
      async () => (await http.patch('/patient/subscription/upgrade', payload)).data,
      async () => (await http.patch('/patient/subscription/upgrade', payload)).data,
      async () => (await http.patch('/subscription/upgrade', payload)).data,
      async () => (await http.patch('/subscription/upgrade', payload)).data,
    ]);
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
    const response = await withFallbackChain([
      async () => (await http.post('/subscription/checkout', payload)).data,
      async () => (await http.post('/patient/subscription/checkout', payload)).data,
      async () => (await http.post('/patient/subscription/checkout', payload)).data,
      async () => (await http.post('/subscription/checkout', payload)).data,
    ]);
    return unwrapPayload(response);
  },
  downgradeSubscription: async () => {
    const response = await withFallbackChain([
      async () => (await http.patch('/patient/subscription/downgrade')).data,
      async () => (await http.patch('/patient/subscription/downgrade')).data,
      async () => (await http.patch('/subscription/downgrade')).data,
      async () => (await http.patch('/subscription/downgrade')).data,
    ]);
    return unwrapPayload(response);
  },
  cancelSubscription: async () =>
    withFallbackChain([
      async () => (await http.patch('/patient/subscription/cancel')).data,
      async () => (await http.patch('/patient/subscription/cancel')).data,
      async () => (await http.patch('/subscription/cancel')).data,
      async () => (await http.patch('/subscription/cancel')).data,
    ]),
  reactivateSubscription: async () =>
    withFallbackChain([
      async () => (await http.patch('/patient/subscription/reactivate')).data,
      async () => (await http.patch('/patient/subscription/reactivate')).data,
      async () => (await http.patch('/subscription/reactivate')).data,
      async () => (await http.patch('/subscription/reactivate')).data,
    ]),
  setSubscriptionAutoRenew: async (autoRenew: boolean) =>
    withFallbackChain([
      async () => (await http.patch('/patient/subscription/auto-renew', { autoRenew })).data,
      async () => (await http.patch('/patient/subscription/auto-renew', { autoRenew })).data,
      async () => (await http.patch('/subscription/auto-renew', { autoRenew })).data,
      async () => (await http.patch('/subscription/auto-renew', { autoRenew })).data,
    ]),
  getPaymentMethod: async () =>
    withFallbackChain([
      async () => (await http.get('/payment-method')).data,
      async () => (await http.get('/payment-method')).data,
      async () => (await http.get('/patient/payment-method')).data,
      async () => (await http.get('/patient/payment-method')).data,
    ]),
  updatePaymentMethod: async (payload: { cardLast4: string; cardBrand: string; expiryMonth: number; expiryYear: number }) =>
    withFallbackChain([
      async () => (await http.put('/payment-method', payload)).data,
      async () => (await http.put('/payment-method', payload)).data,
      async () => (await http.put('/patient/payment-method', payload)).data,
      async () => (await http.put('/patient/payment-method', payload)).data,
    ]),
  getInvoices: async () =>
    withFallbackChain([
      async () => (await http.get('/invoices')).data,
      async () => (await http.get('/invoices')).data,
      async () => (await http.get('/patient/invoices')).data,
      async () => (await http.get('/patient/invoices')).data,
    ]),
  downloadInvoice: async (id: string) =>
    withFallbackChain([
      async () => (await http.get(`/v1/invoices/${encodeURIComponent(id)}/download`, { responseType: 'blob' })).data,
      async () => (await http.get(`/invoices/${encodeURIComponent(id)}/download`, { responseType: 'blob' })).data,
      async () => (await http.get(`/patient/invoices/${encodeURIComponent(id)}/download`, { responseType: 'blob' })).data,
      async () => (await http.get(`/v1/patient/invoices/${encodeURIComponent(id)}/download`, { responseType: 'blob' })).data,
    ]),
  getExercises: async () => (await http.get('/patient/exercises')).data,
  logWellnessLibraryActivity: async (payload: { title: string; duration?: number; category?: string; kind?: 'audio' | 'interactive' }) =>
    withV1Fallback(
      async () => (await http.post('/patient/exercises/library', payload)).data,
      async () => (await http.post('/exercises/library', payload)).data,
    ),
  completeExercise: async (id: string) => (await http.patch(`/patient/exercises/${encodeURIComponent(id)}/complete`)).data,
  getTherapyPlan: async (week?: number) =>
    withFallbackChain([
      async () => (await http.get('/patients/me/therapy-plan', { params: week ? { week } : undefined })).data,
      async () => (await http.get('/therapy-plan', { params: week ? { week } : undefined })).data,
    ]),
  completeTherapyPlanTask: async (id: string) => (await http.patch(`/v1/therapy-plan/tasks/${encodeURIComponent(id)}/complete`)).data,
  getPetState: async () =>
    withFallbackChain([
      async () => (await http.get('/patient/pets/state')).data,
      async () => (await http.get('/patients/me/pets/state')).data,
    ]),
  upsertPetState: async (payload: { selectedPet: 'koi' | 'pup' | 'owl'; vitality: number; unlockedItems: string[]; isPremium: boolean }) =>
    withFallbackChain([
      async () => (await http.put('/patient/pets/state', payload)).data,
      async () => (await http.put('/patients/me/pets/state', payload)).data,
    ]),
  getActiveCbtAssignments: async (): Promise<ActiveCbtAssignment[]> => {
    try {
      const response = await http.get('/patient/cbt-assignments/active');
      return response.data?.data ?? response.data ?? [];
    } catch (error) {
      // Fallback: try alternative endpoint
      try {
        const response = await http.get('/cbt-assignments/active');
        return response.data?.data ?? response.data ?? [];
      } catch {
        // If both fail, return empty array to prevent dashboard crash
        return [];
      }
    }
  },
  getCbtAssignmentDetail: async (assignmentId: string): Promise<CbtAssignmentDetail> => {
    const response = await http.get(`/patient/cbt-assignments/${encodeURIComponent(assignmentId)}`);
    return response.data?.data ?? response.data;
  },
  saveCbtAssignmentProgress: async (
    assignmentId: string,
    payload: { responses: Record<string, unknown>; currentStep?: number; status?: 'IN_PROGRESS' | 'COMPLETED' },
  ) => {
    const response = await http.patch(`/patient/cbt-assignments/${encodeURIComponent(assignmentId)}`, payload);
    return response.data?.data ?? response.data;
  },
  getPricing: async () =>
    withFallbackChain([
      async () => (await http.get('/pricing')).data,
      async () => (await http.get('/pricing')).data,
    ]),
  aiChat: async (payload: { message: string; bot_type?: 'mood_ai' | 'clinical_ai'; response_style?: 'concise' | 'detailed' }) =>
    (await http.post('/chat/message', {
      message: payload.message,
      bot_type: payload.bot_type || 'mood_ai',
      response_style: payload.response_style || 'concise',
    })).data,
  getCurrentRisk: async (userId: string) =>
    (await http.get(`/v1/risk/${encodeURIComponent(userId)}/current`)).data,
  getNotifications: async () => (await http.get('/notifications')).data,
  markNotificationRead: async (id: string) => (await http.patch(`/v1/notifications/${encodeURIComponent(id)}/read`)).data,
    // Progress & Analytics
    getInsights: async () => {
      try {
        const res = await http.get('/patient/insights');
        return res.data?.data ?? res.data;
      } catch (err: any) {
        const status = Number(err?.response?.status || 0);
        // If user is forbidden (403) — likely not on premium plan — return null so UI can show CTA
        if (status === 403) return null;
        // If not found, try legacy endpoint fallback
        if (status === 404) {
          try {
            const res = await http.get('/patient/insights');
            return res.data?.data ?? res.data;
          } catch (e: any) {
            if (Number(e?.response?.status || 0) === 403) return null;
            throw e;
          }
        }
        throw err;
      }
    },
    getReports: async () =>
      withFallbackChain([
        async () => (await http.get('/patient/reports')).data,
        async () => (await http.get('/patient/reports')).data,
      ]),
    getSharedReportMeta: async (id: string) =>
      withFallbackChain([
        async () => (await http.get(`/v1/patient/reports/shared/${encodeURIComponent(id)}`)).data,
        async () => (await http.get(`/patient/reports/shared/${encodeURIComponent(id)}`)).data,
      ]),
    downloadSharedReport: async (id: string) =>
      withFallbackChain([
        async () => (await http.get(`/v1/patient/reports/shared/${encodeURIComponent(id)}/download`, { responseType: 'blob' })).data,
        async () => (await http.get(`/patient/reports/shared/${encodeURIComponent(id)}/download`, { responseType: 'blob' })).data,
      ]),
    generateCompleteHealthSummary: async () => {
      try {
        const resp = await http.post('/patient/reports/health-summary', {}, { responseType: 'blob' });
        return resp.data;
      } catch (err: any) {
        const status = Number(err?.response?.status || 0);
        // If v1 endpoint forbids (403), try legacy endpoint which may not require premium
        if (status === 403) {
          const fallback = await http.post('/patient/reports/health-summary', {}, { responseType: 'blob' });
          return fallback.data;
        }
        throw err;
      }
    },
    getRecordSecureUrl: async (id: string) =>
      withFallbackChain([
        async () => (await http.get(`/v1/patient/records/${encodeURIComponent(id)}/url`)).data,
        async () => (await http.get(`/patient/records/${encodeURIComponent(id)}/url`)).data,
      ]),
    createRecordShareLink: async (id: string) =>
      withFallbackChain([
        async () => (await http.post(`/v1/patient/records/${encodeURIComponent(id)}/share`)).data,
        async () => (await http.post(`/patient/records/${encodeURIComponent(id)}/share`)).data,
      ]),
    // Documents
    getDocuments: async () =>
      withFallbackChain([
        async () => (await http.get('/patient/documents')).data,
        async () => (await http.get('/patient/documents')).data,
      ]),
    uploadDocument: async (payload: FormData) =>
      (await http.post('/patient/documents/upload', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data,
    getDocumentDownloadUrl: async (id: string) =>
      withFallbackChain([
        async () => (await http.get(`/v1/patient/documents/${encodeURIComponent(id)}/download`)).data,
        async () => (await http.get(`/patient/documents/${encodeURIComponent(id)}/download`)).data,
      ]),
    // Care Team
    getMyProviders: async () =>
      withFallbackChain([
        async () => (await http.get('/patient/care-team')).data,
        async () => (await http.get('/patient/care-team')).data,
      ]),
    getAvailableProviders: async (params?: { specialization?: string; language?: string; maxPrice?: number; role?: string }) =>
      withFallbackChain([
        async () => (await http.get('/patient/providers/available', { params })).data,
        async () => (await http.get('/providers', { params })).data,
      ]),
      requestAppointmentToPreferredProviders: async (payload: {
        providerIds: string[];
        preferredLanguage?: string;
        preferredTime?: string;
        preferredSpecialization?: string;
        carePath?: string;
        urgency?: string;
        note?: string;
      }) =>
        (await http.post('/patient/appointments/request', payload)).data,
      confirmProposedAppointmentSlot: async (payload: {
        requestRef: string;
        providerId: string;
        proposedStartAt?: string;
        accept: boolean;
      }) =>
        (await http.post('/patient/appointments/confirm-slot', payload)).data,
    // Messaging
    getConversations: async () =>
      withFallbackChain([
        async () => (await http.get('/patient/messages/conversations')).data,
        async () => (await http.get('/patient/messages/conversations')).data,
        async () => ([]),
      ]),
    getMessages: async (conversationId: string) =>
      withFallbackChain([
        async () => (await http.get(`/v1/patient/messages/${encodeURIComponent(conversationId)}`)).data,
        async () => (await http.get(`/patient/messages/${encodeURIComponent(conversationId)}`)).data,
        async () => ([]),
      ]),
    sendMessage: async (payload: { conversationId: string; content: string }) =>
      withFallbackChain([
        async () => (await http.post('/patient/messages', payload)).data,
        async () => (await http.post('/patient/messages', payload)).data,
      ]),
      startConversation: async (payload: { providerId: string }) =>
        withFallbackChain([
          async () => (await http.post('/patient/messages/start', payload)).data,
          async () => (await http.post('/patient/messages/start', payload)).data,
        ]),
      markMessagesRead: async (conversationId: string) =>
        withFallbackChain([
          async () =>
            (await http.post(`/v1/patient/messages/${encodeURIComponent(conversationId)}/read`, {})).data,
          async () =>
            (await http.post(`/patient/messages/${encodeURIComponent(conversationId)}/read`, {})).data,
        ]),

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
    },
  ) => {
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
    try {
      const response = (await http.get(`/v1/patient/providers/smart-match?${query}`)).data;
      const payload = response?.data ?? response;
      const providers = Array.isArray(payload?.providers) ? payload.providers : [];
      const count = Number(payload?.count ?? providers.length ?? 0);
      return { providers, count };
    } catch (err: any) {
      // Axios error shape
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'Unknown error';
      return { error: true, status, message };
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
  }) => (await http.post('/patient/appointments/smart-match', payload)).data,

  getPendingAppointmentRequests: async () =>
    (await http.get('/patient/appointments/requests/pending')).data,

  getPaymentPendingRequest: async () =>
    (await http.get('/patient/appointments/payment-pending')).data,
  };
