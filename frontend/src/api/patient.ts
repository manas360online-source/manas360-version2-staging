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
      async () => (await http.get('/v1/patient/dashboard')).data,
      async () => (await http.get('/patient/dashboard')).data,
    ]),
  getDashboardV2: async () =>
    withFallbackChain([
      async () => (await http.get('/patient/dashboard')).data,
      async () => (await http.get('/v1/patient/dashboard')).data,
    ]),
  changePassword: async (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    (await http.patch('/v1/users/me/password', payload)).data,
  getActiveSessions: async () => (await http.get('/v1/users/me/sessions')).data,
  revokeSession: async (id: string) => (await http.delete(`/v1/users/me/sessions/${encodeURIComponent(id)}`)).data,
  revokeAllSessions: async () => (await http.delete('/v1/users/me/sessions')).data,
  getSettings: async () => (await http.get('/patient/settings')).data,
  updateSettings: async (settings: Record<string, any>) => (await http.put('/patient/settings', { settings })).data,
  getSupportCenter: async () => (await http.get('/patient/support')).data,
  createSupportTicket: async (payload: { subject: string; message: string; category?: string; priority?: string }) =>
    (await http.post('/patient/support/tickets', payload)).data,
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
  }) =>
    (await http.post('/v1/sessions/book', payload)).data,
  verifyPayment: async (payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    (await http.post('/v1/payments/verify', payload)).data,
  getUpcomingSessions: async () =>
    withFallbackChain([
      async () => (await http.get('/v1/sessions/upcoming')).data,
      async () => {
        const sessions = (await http.get('/v1/patients/me/sessions')).data;
        const rows = sessions?.data ?? sessions;
        return Array.isArray(rows)
          ? rows.filter((item: any) => String(item?.status || '').toLowerCase() !== 'completed')
          : [];
      },
    ]),
  getSessionHistory: async () =>
    withFallbackChain([
      async () => (await http.get('/v1/sessions/history')).data,
      async () => (await http.get('/v1/patients/me/sessions')).data,
    ]),
  getSessionDetail: async (id: string) => (await http.get(`/v1/sessions/${encodeURIComponent(id)}`)).data,
  downloadSessionPdf: async (id: string) =>
    (await http.get(`/v1/sessions/${encodeURIComponent(id)}/documents/session-pdf`, { responseType: 'blob' })).data,
  downloadInvoicePdf: async (id: string) =>
    (await http.get(`/v1/sessions/${encodeURIComponent(id)}/documents/invoice`, { responseType: 'blob' })).data,
  submitAssessment: async (payload: { type: string; score?: number; answers?: number[] }) =>
    (await http.post('/v1/assessments/submit', payload)).data,
	submitPHQ9: async (answers: number[]) =>
		(await http.post('/v1/assessments/phq9', { answers })).data,
  submitQuickScreeningJourney: async (payload: JourneyQuickScreeningRequest): Promise<JourneyRecommendationResponse> =>
    (await http.post('/v1/patient-journey/quick-screening', payload)).data,
  submitClinicalJourney: async (payload: JourneyClinicalRequest): Promise<JourneyRecommendationResponse> =>
    (await http.post('/v1/patient-journey/clinical-assessment', payload)).data,
  startStructuredAssessment: async (payload: { templateKey: string }): Promise<StructuredAssessmentStartResponse> => {
    const response = await http.post('/v1/free-screening/start/me', payload);
    return response.data?.data ?? response.data;
  },
  submitStructuredAssessment: async (
    attemptId: string,
    payload: { answers: Array<{ questionId: string; optionIndex: number }> },
  ): Promise<StructuredAssessmentSubmitResponse> => {
    const response = await http.post(`/v1/free-screening/${encodeURIComponent(attemptId)}/submit/me`, payload);
    return response.data?.data ?? response.data;
  },
  getStructuredAssessmentHistory: async () => {
    const response = await http.get('/v1/free-screening/history');
    return response.data?.data ?? response.data;
  },
  getJourneyRecommendation: async (): Promise<JourneyRecommendationResponse> =>
    (await http.get('/v1/patient-journey/recommendation')).data,
  selectJourneyPathway: async (payload: JourneySelectPathwayRequest): Promise<JourneySelectPathwayResponse> =>
    (await http.post('/v1/patient-journey/select-pathway', payload)).data,
  addMood: async (payload: { mood: number; note?: string }) => (await http.post('/v1/mood', payload)).data,
  getMoodHistory: async () => (await http.get('/v1/mood/history')).data,
  getMoodLogs: async () => (await http.get('/patient/mood')).data,
  getMoodToday: async () =>
    withV1Fallback(
      async () => (await http.get('/patient/mood/today')).data,
      async () => ({ latest: null, entryCount: 0, date: new Date().toISOString() } as any),
    ),
  getMoodHistoryV2: async () =>
    withV1Fallback(
      async () => (await http.get('/patient/mood/history')).data,
      async () => (await http.get('/v1/mood/history')).data,
    ),
  getMoodStats: async () =>
    withV1Fallback(
      async () => (await http.get('/patient/mood/stats')).data,
      async () => {
        const history = (await http.get('/v1/mood/history')).data as any[];
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
  getProgress: async () =>
    withFallbackChain([
      async () => (await http.get('/patient/progress')).data,
      async () => (await http.get('/v1/patient/progress')).data,
      async () => {
        const dashboard = await withFallbackChain<any>([
          async () => (await http.get('/patient/dashboard')).data,
          async () => (await http.get('/v1/patient/dashboard')).data,
        ]);
        return dashboard?.progress ?? {
          completedSessions: 0,
          streakDays: 0,
          improvementPercent: 0,
          lastAssessmentScore: null,
        };
      },
    ]),
  createProfile: async (payload: {
    age: number;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    medicalHistory?: string;
    carrier?: string;
    emergencyContact?: { name: string; relation: string; phone: string };
  }) => (await http.post('/v1/patients/profile', payload)).data,
  getMyProfile: async () =>
    withFallbackChain([
      async () => (await http.get('/v1/patients/me/profile')).data,
      async () => (await http.get('/patient/me/profile')).data,
    ]),
  getSubscription: async () => {
    const response = await http.get('/patient/subscription');
    return unwrapPayload(response.data);
  },
  upgradeSubscription: async () => {
    const response = await http.patch('/patient/subscription/upgrade');
    return unwrapPayload(response.data);
  },
  downgradeSubscription: async () => {
    const response = await http.patch('/patient/subscription/downgrade');
    return unwrapPayload(response.data);
  },
  cancelSubscription: async () => (await http.patch('/patient/subscription/cancel')).data,
  reactivateSubscription: async () => (await http.patch('/patient/subscription/reactivate')).data,
  setSubscriptionAutoRenew: async (autoRenew: boolean) => (await http.patch('/patient/subscription/auto-renew', { autoRenew })).data,
  getPaymentMethod: async () => (await http.get('/patient/payment-method')).data,
  updatePaymentMethod: async (payload: { cardLast4: string; cardBrand: string; expiryMonth: number; expiryYear: number }) =>
    (await http.put('/patient/payment-method', payload)).data,
  getInvoices: async () => (await http.get('/patient/invoices')).data,
  downloadInvoice: async (id: string) =>
    (await http.get(`/patient/invoices/${encodeURIComponent(id)}/download`, { responseType: 'blob' })).data,
  getExercises: async () => (await http.get('/patient/exercises')).data,
  logWellnessLibraryActivity: async (payload: { title: string; duration?: number; category?: string; kind?: 'audio' | 'interactive' }) =>
    withV1Fallback(
      async () => (await http.post('/patient/exercises/library', payload)).data,
      async () => (await http.post('/v1/exercises/library', payload)).data,
    ),
  completeExercise: async (id: string) => (await http.patch(`/patient/exercises/${encodeURIComponent(id)}/complete`)).data,
  getTherapyPlan: async (week?: number) =>
    withFallbackChain([
      async () => (await http.get('/v1/patients/me/therapy-plan', { params: week ? { week } : undefined })).data,
      async () => (await http.get('/v1/therapy-plan', { params: week ? { week } : undefined })).data,
    ]),
  completeTherapyPlanTask: async (id: string) => (await http.patch(`/v1/therapy-plan/tasks/${encodeURIComponent(id)}/complete`)).data,
  getActiveCbtAssignments: async (): Promise<ActiveCbtAssignment[]> => {
    try {
      const response = await http.get('/patient/cbt-assignments/active');
      return response.data?.data ?? response.data ?? [];
    } catch (error) {
      // Fallback: try alternative endpoint
      try {
        const response = await http.get('/v1/cbt-assignments/active');
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
      async () => (await http.get('/v1/pricing')).data,
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
  getNotifications: async () => (await http.get('/v1/notifications')).data,
  markNotificationRead: async (id: string) => (await http.patch(`/v1/notifications/${encodeURIComponent(id)}/read`)).data,
    // Progress & Analytics
    getInsights: async () =>
      withFallbackChain([
        async () => (await http.get('/v1/patient/insights')).data,
        async () => (await http.get('/patient/insights')).data,
      ]),
    getReports: async () =>
      withFallbackChain([
        async () => (await http.get('/v1/patient/reports')).data,
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
    generateCompleteHealthSummary: async () =>
      withFallbackChain([
        async () => (await http.post('/v1/patient/reports/health-summary', {}, { responseType: 'blob' })).data,
        async () => (await http.post('/patient/reports/health-summary', {}, { responseType: 'blob' })).data,
      ]),
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
    // Care Team
    getMyProviders: async () =>
      withFallbackChain([
        async () => (await http.get('/v1/patient/care-team')).data,
        async () => (await http.get('/patient/care-team')).data,
      ]),
    getAvailableProviders: async (params?: { specialization?: string; language?: string; maxPrice?: number; role?: string }) =>
      withFallbackChain([
        async () => (await http.get('/v1/patient/providers/available', { params })).data,
        async () => (await http.get('/v1/providers', { params })).data,
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
        (await http.post('/v1/patient/appointments/request', payload)).data,
      confirmProposedAppointmentSlot: async (payload: {
        requestRef: string;
        providerId: string;
        proposedStartAt?: string;
        accept: boolean;
      }) =>
        (await http.post('/v1/patient/appointments/confirm-slot', payload)).data,
    // Messaging
    getConversations: async () =>
      withFallbackChain([
        async () => (await http.get('/v1/patient/messages/conversations')).data,
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
        async () => (await http.post('/v1/patient/messages', payload)).data,
        async () => (await http.post('/patient/messages', payload)).data,
      ]),
      startConversation: async (payload: { providerId: string }) =>
        withFallbackChain([
          async () => (await http.post('/v1/patient/messages/start', payload)).data,
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
    const response = (await http.get(`/v1/patient/providers/smart-match?${query}`)).data;
    const payload = response?.data ?? response;
    const providers = Array.isArray(payload?.providers) ? payload.providers : [];
    const count = Number(payload?.count ?? providers.length ?? 0);
    return { providers, count };
  },

  createAppointmentRequest: async (payload: {
    availabilityPrefs: {
      daysOfWeek: number[];
      timeSlots: Array<{ startMinute: number; endMinute: number }>;
    };
    providerIds: string[];
    preferredSpecialization?: string;
    durationMinutes?: number;
  }) => (await http.post('/v1/patient/appointments/smart-match', payload)).data,

  getPendingAppointmentRequests: async () =>
    (await http.get('/v1/patient/appointments/requests/pending')).data,

  getPaymentPendingRequest: async () =>
    (await http.get('/v1/patient/appointments/payment-pending')).data,
  };
