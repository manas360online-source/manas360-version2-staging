import { http } from '../lib/http';

type Envelope<T> = { success?: boolean; message?: string; data?: T } & T;

const unwrap = <T>(response: Envelope<T>): T => {
	if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
		return response.data as T;
	}
	return response as unknown as T;
};

export type TherapistDashboardResponse = {
	therapist: { id: string; name: string; email: string | null };
	stats: {
		todaysSessions: number;
		completedToday: number;
		weeklyEarnings: number;
		activePatients: number;
		avgRating: number | null;
		pendingNotes: number;
		unreadMessages: number;
	};
	todaySessions: Array<{
		id: string;
		bookingReferenceId: string;
		time: string;
		patientName: string;
		patientInitials: string;
		sessionType: string;
		durationMinutes: number;
		status: string;
		noteSubmitted: boolean;
	}>;
	earningsChart: {
		labels: string[];
		therapistShare: number[];
		platformShare: number[];
	};
	alerts: Array<{ id: string; level: string; message: string; tone: 'danger' | 'warning' | 'success'; action: string }>;
	recentMessages: Array<{ id: string; title: string; text: string; createdAt: string; isRead: boolean }>;
	utilization: { percent: number; booked: number; total: number; open: number };
};

export type TherapistPatientItem = {
	id: string;
	name: string;
	email: string | null;
	concern: string;
	sessions: number;
	status: string;
	lastSessionAt: string | null;
};

export type TherapistSessionNoteItem = {
	id: string;
	sessionId: string;
	bookingReferenceId: string;
	patientId?: string;
	patientName: string;
	sessionAt: string;
	status: 'pending' | 'submitted' | 'draft';
	noteUpdatedAt: string | null;
	sessionType?: string;
	subjective?: string;
	objective?: string;
	assessment?: string;
	plan?: string;
	phq9?: string;
	gad7?: string;
	assignedExercise?: string;
	nextSessionDate?: string;
	history?: Array<{ at: string; event: string }>;
};

export type AiClinicalSummary = {
	moodAnalysis: {
		emotionalTone: string;
		energyLevel: string;
		riskSignals: string;
	};
	moodSentiment?: {
		primaryEmotionalState: string;
		emotionalVolatilityScore: number;
		anxietyLevelScore: number;
		keywords: string[];
	};
	soapNote: {
		subjective: string;
		objective: string;
		assessment: string;
		plan: string;
	};
	actionItems?: string[];
	status?: string;
	updatedAt?: string;
	noteId?: string;
	sessionId?: string;
};

export type TherapistExerciseItem = {
	id: string;
	patientId?: string;
	assignedTo: string;
	name: string;
	category: string;
	worksheetUrl: string;
	completionRate: number;
	status: 'active' | 'archived' | string;
	updatedAt?: string;
};

export type TherapistCbtModuleItem = {
	id: string;
	title: string;
	approach: string;
	assignedPatient: string;
	patientId?: string;
	status: 'active' | 'draft' | string;
	updatedAt?: string;
};

export type TherapistAssessmentItem = {
	id: string;
	type: string;
	patient: string;
	patientId?: string;
	score: number;
	date: string;
	assessedAt?: string;
};

export type TherapistResourceItem = {
	id: string;
	title: string;
	type: string;
	assignedTo: string;
	patientId?: string;
	views: number;
	updatedAt?: string;
};

export type TherapistCareTeamMemberItem = {
	id: string;
	role: string;
	name: string;
	treatment: string;
	notes: string;
	suggestions: string;
	prescriptions: string;
	patientId?: string;
	updatedAt?: string;
};

export type TherapistMessageItem = {
	id: string;
	title: string;
	text: string;
	type: string;
	createdAt: string;
	isRead: boolean;
};

export type TherapistPayoutItem = {
	id: string;
	date: string;
	amountMinor: number;
	status: string;
};

export type TherapistEarningsResponse = {
	summary: {
		fromDate: string;
		toDate: string;
		sessionsCompleted: number;
		grossMinor: number;
		therapistShareMinor: number;
		platformShareMinor: number;
	};
	chart: {
		labels: string[];
		therapistShare: number[];
		platformShare: number[];
	};
	items: Array<{ id: string; bookingReferenceId: string; dateTime: string; amountMinor: number; status: string }>;
};

export type TherapistAnalyticsSummary = {
	completion: number;
	total: number;
	completionRate: number;
	avgMinutes: number;
	sessions: number;
};

export type MoodPredictionResponse = {
	predictions: Array<{ date: string; predictedMood: number; weekday?: string }>;
	confidencePct: number;
	trendDirection: 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'VOLATILE' | string;
	deteriorationAlert: boolean;
	influencingFactors?: {
		top_positive_factors?: string[];
		top_negative_factors?: string[];
		sleep_mood_correlation?: string;
		activity_impact?: Record<string, string>;
		weekly_pattern?: string;
		clinical_note?: string;
		fallback_used?: boolean;
	} | null;
	insufficientData?: boolean;
	message?: string;
};

export type MoodAccuracyResponse = {
	mae: number;
	within2Pct: number;
	targetWithin2Pct: number;
	targetMet: boolean;
	totalEvaluated: number;
	recent: any[];
};

export type MoodHistoryResponse = {
	mood_logs: Array<{ moodValue?: number; loggedAt?: string; createdAt?: string }>;
	legacy_mood_entries: Array<{ moodScore?: number; date?: string; createdAt?: string }>;
};

export const therapistApi = {
	getDashboard: async (): Promise<TherapistDashboardResponse> => {
		const res = await http.get('/therapists/me/dashboard');
		return unwrap<TherapistDashboardResponse>(res.data);
	},
	getPatients: async (params?: { status?: string; search?: string }): Promise<{ items: TherapistPatientItem[] }> => {
		const res = await http.get('/therapists/me/patients', { params });
		return unwrap<{ items: TherapistPatientItem[] }>(res.data);
	},
	getSessions: async (params?: { page?: number; limit?: number; status?: string; patient?: string }): Promise<any> => {
		const res = await http.get('/therapists/me/sessions', { params });
		return unwrap<any>(res.data);
	},
	getSessionNotes: async (): Promise<{ items: TherapistSessionNoteItem[] }> => {
		const res = await http.get('/therapists/me/notes');
		return unwrap<{ items: TherapistSessionNoteItem[] }>(res.data);
	},
	getStructuredSessionNotes: async (): Promise<{ items: TherapistSessionNoteItem[] }> => {
		const res = await http.get('/therapists/me/session-notes');
		return unwrap<{ items: TherapistSessionNoteItem[] }>(res.data);
	},
	upsertStructuredSessionNote: async (sessionId: string, payload: Record<string, any>): Promise<any> => {
		const res = await http.put(`/v1/therapists/me/session-notes/${encodeURIComponent(sessionId)}`, payload);
		return unwrap<any>(res.data);
	},
	generateAiSessionNote: async (sessionId: string): Promise<AiClinicalSummary> => {
		const res = await http.post(`/v1/therapists/session/${encodeURIComponent(sessionId)}/generate-ai-note`);
		return unwrap<AiClinicalSummary>(res.data);
	},
	getExercises: async (): Promise<{ items: TherapistExerciseItem[] }> => {
		const res = await http.get('/therapists/me/exercises');
		return unwrap<{ items: TherapistExerciseItem[] }>(res.data);
	},
	createExercise: async (payload: Partial<TherapistExerciseItem>): Promise<any> => {
		const res = await http.post('/therapists/me/exercises', payload);
		return unwrap<any>(res.data);
	},
	updateExercise: async (id: string, payload: Partial<TherapistExerciseItem>): Promise<any> => {
		const res = await http.patch(`/v1/therapists/me/exercises/${encodeURIComponent(id)}`, payload);
		return unwrap<any>(res.data);
	},
	trackExerciseCompletion: async (id: string, amount = 10): Promise<any> => {
		const res = await http.post(`/v1/therapists/me/exercises/${encodeURIComponent(id)}/track`, { amount });
		return unwrap<any>(res.data);
	},
	deleteExercise: async (id: string): Promise<any> => {
		const res = await http.delete(`/v1/therapists/me/exercises/${encodeURIComponent(id)}`);
		return unwrap<any>(res.data);
	},
	getCbtModules: async (): Promise<{ items: TherapistCbtModuleItem[] }> => {
		const res = await http.get('/therapists/me/cbt-modules');
		return unwrap<{ items: TherapistCbtModuleItem[] }>(res.data);
	},
	createCbtModule: async (payload: Partial<TherapistCbtModuleItem>): Promise<any> => {
		const res = await http.post('/therapists/me/cbt-modules', payload);
		return unwrap<any>(res.data);
	},
	deleteCbtModule: async (id: string): Promise<any> => {
		const res = await http.delete(`/v1/therapists/me/cbt-modules/${encodeURIComponent(id)}`);
		return unwrap<any>(res.data);
	},
	getAssessments: async (): Promise<{ items: TherapistAssessmentItem[] }> => {
		const res = await http.get('/therapists/me/assessments');
		return unwrap<{ items: TherapistAssessmentItem[] }>(res.data);
	},
	createAssessment: async (payload: Partial<TherapistAssessmentItem>): Promise<any> => {
		const res = await http.post('/therapists/me/assessments', payload);
		return unwrap<any>(res.data);
	},
	getResources: async (): Promise<{ items: TherapistResourceItem[] }> => {
		const res = await http.get('/therapists/me/resources');
		return unwrap<{ items: TherapistResourceItem[] }>(res.data);
	},
	createResource: async (payload: Partial<TherapistResourceItem>): Promise<any> => {
		const res = await http.post('/therapists/me/resources', payload);
		return unwrap<any>(res.data);
	},
	trackResourceView: async (id: string): Promise<any> => {
		const res = await http.post(`/v1/therapists/me/resources/${encodeURIComponent(id)}/track`);
		return unwrap<any>(res.data);
	},
	deleteResource: async (id: string): Promise<any> => {
		const res = await http.delete(`/v1/therapists/me/resources/${encodeURIComponent(id)}`);
		return unwrap<any>(res.data);
	},
	getCareTeam: async (params?: { patientId?: string }): Promise<{ items: TherapistCareTeamMemberItem[] }> => {
		const res = await http.get('/therapists/me/care-team', { params });
		return unwrap<{ items: TherapistCareTeamMemberItem[] }>(res.data);
	},
	createCareTeamMember: async (payload: Partial<TherapistCareTeamMemberItem>): Promise<any> => {
		const res = await http.post('/therapists/me/care-team', payload);
		return unwrap<any>(res.data);
	},
	updateCareTeamMember: async (id: string, payload: Partial<TherapistCareTeamMemberItem>): Promise<any> => {
		const res = await http.patch(`/v1/therapists/me/care-team/${encodeURIComponent(id)}`, payload);
		return unwrap<any>(res.data);
	},
	deleteCareTeamMember: async (id: string): Promise<any> => {
		const res = await http.delete(`/v1/therapists/me/care-team/${encodeURIComponent(id)}`);
		return unwrap<any>(res.data);
	},
	getEarnings: async (): Promise<TherapistEarningsResponse> => {
		const res = await http.get('/therapists/me/earnings');
		return unwrap<TherapistEarningsResponse>(res.data);
	},
	getMessages: async (): Promise<{ items: TherapistMessageItem[]; unreadCount: number }> => {
		const res = await http.get('/therapists/me/messages');
		return unwrap<{ items: TherapistMessageItem[]; unreadCount: number }>(res.data);
	},
	getPayoutHistory: async (): Promise<{ items: TherapistPayoutItem[] }> => {
		const res = await http.get('/therapists/me/payout-history');
		return unwrap<{ items: TherapistPayoutItem[] }>(res.data);
	},
	getAnalyticsSummary: async (): Promise<TherapistAnalyticsSummary> => {
		const res = await http.get('/therapists/me/analytics/summary');
		return unwrap<TherapistAnalyticsSummary>(res.data);
	},
	getPatientMoodPrediction: async (userId: string): Promise<MoodPredictionResponse> => {
		const res = await http.get(`/v1/mood/${encodeURIComponent(userId)}/prediction`);
		return unwrap<MoodPredictionResponse>(res.data);
	},
	getPatientMoodHistory: async (userId: string): Promise<MoodHistoryResponse> => {
		const res = await http.get(`/v1/mood/${encodeURIComponent(userId)}/history`);
		return unwrap<MoodHistoryResponse>(res.data);
	},
	getPatientMoodAccuracy: async (userId: string): Promise<MoodAccuracyResponse> => {
		const res = await http.get(`/v1/mood/${encodeURIComponent(userId)}/accuracy`);
		return unwrap<MoodAccuracyResponse>(res.data);
	},
};
