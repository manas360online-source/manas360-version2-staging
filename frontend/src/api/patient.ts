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

const isOnboardingMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized.includes('patient profile not found') || normalized.includes('complete onboarding');
};

export const isOnboardingRequiredError = (error: any): boolean => {
  const status = Number(error?.response?.status || 0);
  const message = String(error?.response?.data?.message || error?.message || '');
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
  submitQuickScreeningJourney: async (payload: JourneyQuickScreeningRequest): Promise<JourneyRecommendationResponse> =>
    (await http.post('/v1/patient-journey/quick-screening', payload)).data,
  submitClinicalJourney: async (payload: JourneyClinicalRequest): Promise<JourneyRecommendationResponse> =>
    (await http.post('/v1/patient-journey/clinical-assessment', payload)).data,
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
  addMoodLog: async (payload: { mood: number; note?: string }) => (await http.post('/patient/mood', payload)).data,
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
  getSubscription: async () => (await http.get('/patient/subscription')).data,
  upgradeSubscription: async () => (await http.patch('/patient/subscription/upgrade')).data,
  downgradeSubscription: async () => (await http.patch('/patient/subscription/downgrade')).data,
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
  completeExercise: async (id: string) => (await http.patch(`/patient/exercises/${encodeURIComponent(id)}/complete`)).data,
  getTherapyPlan: async () => (await http.get('/v1/therapy-plan')).data,
  completeTherapyPlanTask: async (id: string) => (await http.patch(`/v1/therapy-plan/tasks/${encodeURIComponent(id)}/complete`)).data,
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
    // Care Team
    getMyProviders: async () =>
      withFallbackChain([
        async () => (await http.get('/v1/patient/care-team')).data,
        async () => (await http.get('/patient/care-team')).data,
      ]),
    getAvailableProviders: async (params?: { specialization?: string; language?: string; maxPrice?: number }) =>
      withFallbackChain([
        async () => (await http.get('/v1/patient/providers/available', { params })).data,
        async () => (await http.get('/v1/providers', { params })).data,
      ]),
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
};
