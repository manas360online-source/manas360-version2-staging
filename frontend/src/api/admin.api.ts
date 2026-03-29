import client from './client';
export { client as api };

type ApiEnvelope<T> = {
	success: boolean;
	message?: string;
	data: T;
};

export type AdminAnalyticsSummary = {
	totalSessionsConducted: number;
	startedSessions: number;
	completedSessions: number;
	completionRate: number;
	averageCompletionSeconds: number;
	patientEngagementScore: number;
};

export type AdminTemplateUsageItem = {
	templateKey: number;
	templateId: string;
	templateVersion: number;
	templateName: string;
	sessionsCount: number;
};

export type AdminUtilizationItem = {
	weekStartDate: string;
	therapistKey: number;
	sessionsPerWeek: number;
};

export type RangeParams = {
	from: string;
	to: string;
	organizationKey: number;
	limit?: number;
};

export type AdminUserRole = 'patient' | 'therapist' | 'psychiatrist' | 'coach' | 'admin';

export type AdminSubscriptionPlanType = 'basic' | 'premium' | 'pro';
export type AdminSubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'paused';

export type AdminUser = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: AdminUserRole;
	isTherapistVerified?: boolean;
	therapistVerifiedAt?: string | null;
	onboardingStatus?: 'PENDING' | 'COMPLETED' | 'REJECTED' | null;
	createdAt: string;
	updatedAt: string;
};

export type AdminUsersMeta = {
	page: number;
	limit: number;
	totalItems: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
};

export type AdminUsersResponse = {
	data: AdminUser[];
	meta: AdminUsersMeta;
};

export type AdminUserDetail = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: AdminUserRole;
	isTherapistVerified?: boolean;
	therapistVerifiedAt?: string | null;
	therapistVerifiedByUserId?: string | null;
	createdAt: string;
	updatedAt: string;
};

export type AdminMetrics = {
	totalUsers: number;
	totalTherapists: number;
	verifiedTherapists: number;
	completedSessions: number;
	totalRevenue: number;
	activeSubscriptions: number;
};

export type AdminModuleSummaryStat = {
	label: string;
	value: string;
	note?: string;
};

export type AdminModuleSummaryItem = {
	title: string;
	subtitle: string;
	meta?: string;
};

export type AdminModuleSummary = {
	module: string;
	stats: AdminModuleSummaryStat[];
	items: AdminModuleSummaryItem[];
	refreshedAt: string;
};

export type AdminSubscription = {
	_id: string;
	user: {
		id: string;
		name: string | null;
		email: string;
		phone: string | null;
	};
	plan: {
		type: string;
		name: string;
	};
	status: string;
	startDate: string;
	expiryDate: string;
	price: number;
	currency: string;
	billingCycle: string;
	autoRenew: boolean;
	createdAt: string;
};

export type AdminSubscriptionsResponse = {
	data: AdminSubscription[];
	meta: {
		page: number;
		limit: number;
		totalItems: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPrevPage: boolean;
	};
};

export type AdminPricingPlatformFee = {
	id: string;
	planName: string;
	monthlyFee: number;
	description?: string | null;
	active: boolean;
	effectiveFrom?: string | null;
	effectiveTo?: string | null;
};

export type AdminPricingSessionItem = {
	id: string;
	providerType: string;
	durationMinutes: number;
	price: number;
	providerShare: number;
	platformShare: number;
	active: boolean;
	effectiveFrom?: string | null;
	effectiveTo?: string | null;
};

export type AdminPricingBundleItem = {
	id: string;
	bundleName: string;
	minutes: number;
	price: number;
	active: boolean;
	effectiveFrom?: string | null;
	effectiveTo?: string | null;
};

export type AdminPricingConfig = {
	platformFee: AdminPricingPlatformFee | null;
	sessionPricing: AdminPricingSessionItem[];
	premiumBundles: AdminPricingBundleItem[];
	surchargePercent: number;
	impactSummary?: {
		totalSubscriptions: number;
		activeSubscriptions: number;
		lockedToPreviousPrice: number;
		alignedWithCurrentPrice: number;
		renewalsNext7Days: number;
		renewalsNext30Days: number;
	};
};

export type AdminScreeningTemplate = {
	id: string;
	key: string;
	title: string;
	description?: string | null;
	estimatedMinutes: number;
	isPublic: boolean;
	randomizeOrder: boolean;
	status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
	createdAt: string;
	updatedAt: string;
};

export type AdminScreeningQuestionOption = {
	id: string;
	questionId: string;
	label: string;
	optionIndex: number;
	points: number;
	createdAt: string;
	updatedAt: string;
};

export type AdminScreeningQuestion = {
	id: string;
	templateId: string;
	prompt: string;
	sectionKey: string;
	orderIndex: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	options: AdminScreeningQuestionOption[];
};

export type AdminScreeningScoringBand = {
	id: string;
	templateId: string;
	minScore: number;
	maxScore: number;
	severity: string;
	interpretation: string;
	recommendation: string;
	actionLabel: string;
	orderIndex: number;
	createdAt: string;
	updatedAt: string;
};

const buildQuery = (params: Record<string, string | number | undefined>) => {
	const query = Object.entries(params)
		.filter(([, value]) => value !== undefined && value !== '')
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
		.join('&');

	return query ? `?${query}` : '';
};

export const getAdminAnalyticsSummary = async (
	params: RangeParams & { therapistId?: string },
): Promise<ApiEnvelope<AdminAnalyticsSummary>> => {
	const query = buildQuery({
		from: params.from,
		to: params.to,
		organizationKey: params.organizationKey,
		therapistId: params.therapistId,
	});
	return (await client.get<ApiEnvelope<AdminAnalyticsSummary>>(`/v1/admin/analytics/summary${query}`)).data;
};

export const getAdminTemplateUsage = async (
	params: RangeParams & { lastSessionsCount?: number; lastTemplateKey?: number },
): Promise<ApiEnvelope<{ items: AdminTemplateUsageItem[]; nextCursor: { lastSessionsCount: number; lastTemplateKey: number } | null }>> => {
	const query = buildQuery({
		from: params.from,
		to: params.to,
		organizationKey: params.organizationKey,
		limit: params.limit,
		lastSessionsCount: params.lastSessionsCount,
		lastTemplateKey: params.lastTemplateKey,
	});
	return (await client.get<ApiEnvelope<{ items: AdminTemplateUsageItem[]; nextCursor: { lastSessionsCount: number; lastTemplateKey: number } | null }>>(`/v1/admin/analytics/templates${query}`)).data;
};

export const getAdminTherapistUtilization = async (
	params: RangeParams & { lastWeekStartDate?: string; lastTherapistKey?: number },
): Promise<ApiEnvelope<{ items: AdminUtilizationItem[]; nextCursor: { lastWeekStartDate: string; lastTherapistKey: number } | null }>> => {
	const query = buildQuery({
		from: params.from,
		to: params.to,
		organizationKey: params.organizationKey,
		limit: params.limit,
		lastWeekStartDate: params.lastWeekStartDate,
		lastTherapistKey: params.lastTherapistKey,
	});
	return (await client.get<ApiEnvelope<{ items: AdminUtilizationItem[]; nextCursor: { lastWeekStartDate: string; lastTherapistKey: number } | null }>>(`/v1/admin/analytics/utilization${query}`)).data;
};

export const getAdminUsers = async (params?: {
	page?: number;
	limit?: number;
	role?: AdminUserRole;
	status?: 'active' | 'deleted';
}): Promise<ApiEnvelope<AdminUsersResponse>> => {
	const query = buildQuery({
		page: params?.page,
		limit: params?.limit,
		role: params?.role,
		status: params?.status,
	});

	return (await client.get<ApiEnvelope<AdminUsersResponse>>(`/v1/admin/users${query}`)).data;
};

export const getAdminUserById = async (userId: string): Promise<ApiEnvelope<AdminUserDetail>> => {
	return (await client.get<ApiEnvelope<AdminUserDetail>>(`/v1/admin/users/${encodeURIComponent(userId)}`)).data;
};

export const getAdminMetrics = async (): Promise<ApiEnvelope<AdminMetrics>> => {
	return (await client.get<ApiEnvelope<AdminMetrics>>('/v1/admin/metrics')).data;
};

export const getAdminSubscriptions = async (params?: {
	page?: number;
	limit?: number;
	planType?: AdminSubscriptionPlanType;
	status?: AdminSubscriptionStatus;
}): Promise<ApiEnvelope<AdminSubscriptionsResponse>> => {
	const query = buildQuery({
		page: params?.page,
		limit: params?.limit,
		planType: params?.planType,
		status: params?.status,
	});

	return (await client.get<ApiEnvelope<AdminSubscriptionsResponse>>(`/v1/admin/subscriptions${query}`)).data;
};

export const verifyAdminTherapist = async (therapistId: string): Promise<ApiEnvelope<unknown>> => {
	return (await client.post<ApiEnvelope<unknown>>(`/v1/admin/verify-provider/${encodeURIComponent(therapistId)}`)).data;
};

export const approveProvider = async (providerUserId: string): Promise<ApiEnvelope<unknown>> => {
	return (await client.post<ApiEnvelope<unknown>>(`/v1/admin/approve-provider/${encodeURIComponent(providerUserId)}`)).data;
};

export const getAdminModuleSummary = async (module: string): Promise<ApiEnvelope<AdminModuleSummary>> => {
	return (await client.get<ApiEnvelope<AdminModuleSummary>>(`/v1/admin/modules/${encodeURIComponent(module)}/summary`)).data;
};

export const getAdminPricingConfig = async (): Promise<ApiEnvelope<AdminPricingConfig>> => {
	return (await client.get<ApiEnvelope<AdminPricingConfig>>('/v1/admin/pricing')).data;
};

export const updateAdminPricingConfig = async (payload: {
	platform_fee?: number;
	preferred_time_surcharge?: number;
	session_pricing?: Array<{
		providerType: string;
		durationMinutes: number;
		price: number;
		providerShare?: number;
		platformShare?: number;
		active?: boolean;
	}>;
	premium_bundles?: Array<{
		bundleName: string;
		minutes: number;
		price: number;
		active?: boolean;
	}>;
}): Promise<ApiEnvelope<AdminPricingConfig>> => {
	return (await client.patch<ApiEnvelope<AdminPricingConfig>>('/v1/admin/pricing', payload)).data;
};

export const getAdminScreeningTemplates = async (): Promise<ApiEnvelope<{ items: AdminScreeningTemplate[] }>> => {
	return (await client.get<ApiEnvelope<{ items: AdminScreeningTemplate[] }>>('/v1/admin/screening/templates')).data;
};

export const ensureAdminScreeningTemplateDefault = async (templateKey: string): Promise<ApiEnvelope<AdminScreeningTemplate>> => {
	return (await client.post<ApiEnvelope<AdminScreeningTemplate>>(`/v1/admin/screening/templates/defaults/${encodeURIComponent(templateKey)}/ensure`)).data;
};

export const updateAdminScreeningTemplate = async (
	templateId: string,
	payload: {
		title?: string;
		description?: string;
		estimatedMinutes?: number;
		isPublic?: boolean;
		randomizeOrder?: boolean;
		status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
	},
): Promise<ApiEnvelope<AdminScreeningTemplate>> => {
	return (await client.put<ApiEnvelope<AdminScreeningTemplate>>(`/v1/admin/screening/templates/${encodeURIComponent(templateId)}`, payload)).data;
};

export const getAdminTemplateQuestions = async (templateId: string): Promise<ApiEnvelope<{ items: AdminScreeningQuestion[] }>> => {
	return (await client.get<ApiEnvelope<{ items: AdminScreeningQuestion[] }>>(`/v1/admin/screening/templates/${encodeURIComponent(templateId)}/questions`)).data;
};

export const createAdminTemplateQuestion = async (
	templateId: string,
	payload: {
		prompt: string;
		sectionKey?: string;
		orderIndex?: number;
		options?: Array<{ label: string; optionIndex: number; points: number }>;
	},
): Promise<ApiEnvelope<AdminScreeningQuestion>> => {
	return (await client.post<ApiEnvelope<AdminScreeningQuestion>>(`/v1/admin/screening/templates/${encodeURIComponent(templateId)}/questions`, payload)).data;
};

export const updateAdminTemplateQuestion = async (
	questionId: string,
	payload: { prompt?: string; sectionKey?: string; orderIndex?: number; isActive?: boolean },
): Promise<ApiEnvelope<AdminScreeningQuestion>> => {
	return (await client.put<ApiEnvelope<AdminScreeningQuestion>>(`/v1/admin/screening/questions/${encodeURIComponent(questionId)}`, payload)).data;
};

export const createAdminQuestionOption = async (
	questionId: string,
	payload: { label: string; optionIndex: number; points: number },
): Promise<ApiEnvelope<AdminScreeningQuestionOption>> => {
	return (await client.post<ApiEnvelope<AdminScreeningQuestionOption>>(`/v1/admin/screening/questions/${encodeURIComponent(questionId)}/options`, payload)).data;
};

export const updateAdminQuestionOption = async (
	optionId: string,
	payload: { label?: string; optionIndex?: number; points?: number },
): Promise<ApiEnvelope<AdminScreeningQuestionOption>> => {
	return (await client.put<ApiEnvelope<AdminScreeningQuestionOption>>(`/v1/admin/screening/options/${encodeURIComponent(optionId)}`, payload)).data;
};

export const getAdminScoringBands = async (templateId: string): Promise<ApiEnvelope<{ items: AdminScreeningScoringBand[] }>> => {
	return (await client.get<ApiEnvelope<{ items: AdminScreeningScoringBand[] }>>(`/v1/admin/screening/templates/${encodeURIComponent(templateId)}/scoring-bands`)).data;
};

export const replaceAdminScoringBands = async (
	templateId: string,
	bands: Array<{
		orderIndex: number;
		minScore: number;
		maxScore: number;
		severity: string;
		interpretation: string;
		recommendation: string;
		actionLabel: string;
	}>,
): Promise<ApiEnvelope<{ items: AdminScreeningScoringBand[] }>> => {
	return (await client.put<ApiEnvelope<{ items: AdminScreeningScoringBand[] }>>(`/v1/admin/screening/templates/${encodeURIComponent(templateId)}/scoring-bands`, { bands })).data;
};

// --- Phase 13: Admin Analytics ---

export type AdminRevenueAnalytics = {
	patientSubscriptions: number;
	providerSubscriptions: number;
	marketplaceSales: number;
	sessionCommissions: number;
	total: number;
	mrr: number;
};

export type AdminUserMetrics = {
	totalPatients: number;
	activeSubscribers: number;
	freeVsPaidRatio: number;
};

export type AdminProviderMetrics = {
	totalProviders: number;
	activeSubscriptions: number;
	planDistribution: Array<{ name: string; value: number }>;
};

export type AdminMarketplaceMetrics = {
	generated: number;
	assigned: number;
	purchased: number;
	conversionRate: number;
};

export type AdminSystemHealthMetrics = {
	overall: 'Healthy' | 'Degraded' | 'Critical';
	latencyMs: number;
	uptimePercent: number;
	activeSessions: number;
	activeSubscriptions: number;
	totalTherapists: number;
	failedPayments: number;
	pendingPayments: number;
	expiredSubscriptions: number;
	services: {
		backend: string;
		database: string;
		redis: string;
		zohoDesk: string;
		phonePe: string;
	};
	lastChecked: string;
};

export type AdminPaymentReliabilityDaily = {
	date: string;
	total: number;
	success: number;
	failed: number;
	retryAttempts: number;
	retrySuccess: number;
	revenueMinor: number;
};

export type AdminPaymentReliabilityMetrics = {
	windowDays: number;
	totalPayments: number;
	successRate: number;
	retrySuccessRate: number;
	revenueMinor: number;
	revenueInr: number;
	failureReasons: Array<{ reason: string; count: number }>;
	revenuePerPlanMinor: Record<string, number>;
	daily: AdminPaymentReliabilityDaily[];
};

export const getAdminRevenueAnalytics = async (): Promise<ApiEnvelope<AdminRevenueAnalytics>> => {
	return (await client.get<ApiEnvelope<AdminRevenueAnalytics>>('/v1/admin/analytics/revenue')).data;
};

export const getAdminUserMetrics = async (): Promise<ApiEnvelope<AdminUserMetrics>> => {
	return (await client.get<ApiEnvelope<AdminUserMetrics>>('/v1/admin/analytics/users')).data;
};

export const getAdminProviderMetrics = async (): Promise<ApiEnvelope<AdminProviderMetrics>> => {
	return (await client.get<ApiEnvelope<AdminProviderMetrics>>('/v1/admin/analytics/providers')).data;
};

export const getAdminMarketplaceMetrics = async (): Promise<ApiEnvelope<AdminMarketplaceMetrics>> => {
	return (await client.get<ApiEnvelope<AdminMarketplaceMetrics>>('/v1/admin/analytics/marketplace')).data;
};

export const getAdminSystemHealth = async () => {
	const response = await client.get<ApiEnvelope<AdminSystemHealthMetrics>>('/v1/admin/analytics/health');
	return response.data;
};

export interface AdminCompanyReport {
	id: string;
	companyName: string;
	quarter: string;
	format: 'PDF' | 'XLSX';
	status: 'completed' | 'failed' | 'queued' | 'processing';
	generatedAt: string;
}

export interface AdminBIStats {
	totalValueUnlocked: number;
	programCost: number;
	roi: number;
	healthcareSavings: number;
	roiMultiplier: number;
}

export const getAdminCompanyReports = async () => {
	const response = await client.get<ApiEnvelope<AdminCompanyReport[]>>('/v1/admin/company-reports');
	return response.data;
};

export const getAdminBICorporateSummary = async () => {
	const response = await client.get<ApiEnvelope<AdminBIStats>>('/v1/admin/analytics/bi-summary');
	return response.data;
};

export interface AdminTherapistPerformance {
	id: string;
	name: string;
	sessionsCompleted: number;
	avgRating: number;
	utilizationPercent: number;
	totalEarnings: number;
	trend: number;
}

export interface AdminPerformanceSummary {
	avgRating: string;
	totalSessions: number;
	utilizationPercent: number;
}

export interface TherapistPerformanceResponse {
	therapists: AdminTherapistPerformance[];
	summary: AdminPerformanceSummary;
}

export const getAdminTherapistPerformance = async () => {
	const response = await client.get<ApiEnvelope<TherapistPerformanceResponse>>('/v1/admin/analytics/therapist-performance');
	return response.data;
};

export const getAdminPaymentReliabilityMetrics = async (days = 30): Promise<ApiEnvelope<AdminPaymentReliabilityMetrics>> => {
	return (await client.get<ApiEnvelope<AdminPaymentReliabilityMetrics>>(`/v1/admin/analytics/payments?days=${encodeURIComponent(String(days))}`)).data;
};

// --- Phase 2: Enhanced Verification & Payouts ---

export type AdminVerificationDocument = {
	id: string;
	userId: string;
	documentType: string;
	url: string;
	createdAt: string;
};

export type AdminPayoutRequest = {
	id: string;
	providerId: string;
	amountMinor: string;
	currency: string;
	status: 'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED';
	requestedAt: string;
	paidAt?: string;
	therapistAmount?: string;
	platformAmount?: string;
	provider: {
		provider: {
			firstName: string;
			lastName: string;
			email: string;
			therapistProfile?: {
				commissionOverride?: number;
			}
		}
	}
};

export const getAdminVerifications = async (): Promise<ApiEnvelope<AdminUser[]>> => {
	return (await client.get<ApiEnvelope<AdminUser[]>>('/v1/admin/verifications')).data;
};

export const getAdminVerificationDocuments = async (userId: string): Promise<ApiEnvelope<AdminVerificationDocument[]>> => {
	return (await client.get<ApiEnvelope<AdminVerificationDocument[]>>(`/v1/admin/verifications/${encodeURIComponent(userId)}/documents`)).data;
};

export const updateAdminVerification = async (userId: string, action: 'approve' | 'reject', rejectionReason?: string): Promise<ApiEnvelope<{ status: string }>> => {
	return (await client.patch<ApiEnvelope<{ status: string }>>(`/v1/admin/verifications/${encodeURIComponent(userId)}`, { action, rejection_reason: rejectionReason })).data;
};

export const getAdminPayouts = async (): Promise<ApiEnvelope<AdminPayoutRequest[]>> => {
	return (await client.get<ApiEnvelope<AdminPayoutRequest[]>>('/v1/admin/payouts')).data;
};

export const approveAdminPayout = async (payoutId: string): Promise<ApiEnvelope<{ therapistAmount: number; platformAmount: number }>> => {
	return (await client.post<ApiEnvelope<{ therapistAmount: number; platformAmount: number }>>(`/v1/admin/payouts/${encodeURIComponent(payoutId)}/approve`)).data;
};

export const toggleGlobalFreeSignups = async (days: number): Promise<ApiEnvelope<{ message: string }>> => {
	return (await client.post<ApiEnvelope<{ message: string }>>('/v1/admin/pricing/free-toggle', { days })).data;
};

export const waiveUserSubscription = async (payload: { userId: string; planKey: string; durationDays: number; reason: string }): Promise<ApiEnvelope<{ message: string }>> => {
	return (await client.post<ApiEnvelope<{ message: string }>>('/v1/admin/waive-subscription', payload)).data;
};

export interface ZohoTicket {
	id: string;
	subject: string;
	status: string;
	priority: string;
	department: string;
	blueprint_state: string;
	assignee: string;
	created: string;
}

export interface BlueprintStatus {
	onboarding: { pending: number; approved: number; rejected: number };
	crisis: { open: number; resolved: number };
	insurance: { in_review: number; paid: number };
}

/**
 * Get tickets from Zoho Desk.
 */
export const getAdminTickets = async (params?: { department?: string; status?: string; priority?: string }) => {
	let url = '/v1/admin/tickets';
	if (params) {
		const searchParams = new URLSearchParams();
		if (params.department) searchParams.append('department', params.department);
		if (params.status) searchParams.append('status', params.status);
		if (params.priority) searchParams.append('priority', params.priority);
		const qs = searchParams.toString();
		if (qs) url += `?${qs}`;
	}
	const response = await client.get<ApiEnvelope<{ tickets: ZohoTicket[]; count: number }>>(url);
	return response.data;
};

export interface LiveSession {
	id: string;
	therapistName: string;
	patientName: string;
	startTime: string;
	status: 'in-progress' | 'paused';
}

/**
 * Real-time Therapy Monitor
 */
export const getAdminLiveSessions = async (): Promise<ApiEnvelope<{ sessions: LiveSession[] }>> => {
	const response = await client.get<ApiEnvelope<{ sessions: LiveSession[] }>>('/v1/admin/live-sessions');
	return response.data;
};

/**
 * Add a comment to a Zoho ticket.
 */
export const addTicketComment = async (ticketId: string, content: string, isPublic = false) => {
	const response = await client.post<ApiEnvelope<any>>(`/v1/admin/tickets/${ticketId}/comment`, { content, isPublic });
	return response.data;
};

/**
 * Get blueprint status summary.
 */
export const getBlueprintStatus = async () => {
	const response = await client.get<ApiEnvelope<BlueprintStatus>>('/v1/admin/blueprints/status');
	return response.data;
};

// === PHASE 4: OFFER MARQUEE & PRICING CONTRACTS ===

export interface MarqueeOffer {
	id: string;
	text: string;
	linkUrl?: string;
	isActive: boolean;
	sortOrder: number;
}

export interface PricingContract {
	id: string;
	version: number;
	category: string;
	pricingData: any;
	status: 'draft' | 'live' | 'archived';
	description?: string;
	createdAt: string;
	approvedBy?: string;
	effectiveFrom?: string;
}

/**
 * Offer Marquee CRUD
 */
export const getAdminOffers = async () => {
	const response = await client.get<ApiEnvelope<MarqueeOffer[]>>('/v1/admin/offers');
	return response.data;
};

export const createAdminOffer = async (data: Partial<MarqueeOffer>) => {
	const response = await client.post<ApiEnvelope<MarqueeOffer>>('/v1/admin/offers', data);
	return response.data;
};

export const updateAdminOffer = async (id: string, data: Partial<MarqueeOffer>) => {
	const response = await client.patch<ApiEnvelope<MarqueeOffer>>(`/v1/admin/offers/${id}`, data);
	return response.data;
};

export const deleteAdminOffer = async (id: string) => {
	const response = await client.delete<ApiEnvelope<any>>(`/v1/admin/offers/${id}`);
	return response.data;
};

export const reorderAdminOffers = async (ids: string[]) => {
	const response = await client.post<ApiEnvelope<any>>('/v1/admin/offers/reorder', { ids });
	return response.data;
};

export const publishAdminOffers = async () => {
	const response = await client.post<ApiEnvelope<any>>('/v1/admin/offers/publish');
	return response.data;
};

/**
 * Pricing Contract Versioning
 */
export const getPricingContracts = async () => {
	const response = await client.get<ApiEnvelope<PricingContract[]>>('/v1/admin/pricing/contracts');
	return response.data;
};

export const createPricingDraft = async (data: { category: string; description: string; pricingData: any }) => {
	const response = await client.post<ApiEnvelope<PricingContract>>('/v1/admin/pricing/contracts/draft', data);
	return response.data;
};

export const approvePricingContract = async (id: string) => {
	const response = await client.post<ApiEnvelope<PricingContract>>(`/v1/admin/pricing/contracts/${id}/approve`);
	return response.data;
};

export const getAdminPricingHistory = async () => {
	const response = await client.get<ApiEnvelope<any[]>>('/v1/admin/pricing/history');
	return response.data;
};

// === PHASE 5: REAL-TIME, CRISIS, REPORTS & AUDIT ===

export interface CrisisAlert {
	id: string;
	patientId: string;
	severity: string;
	trigger: string;
	sessionId?: string;
	status: 'pending' | 'responded';
	respondedBy?: string;
	resolutionNotes?: string;
	createdAt: string;
}

export interface AuditLog {
	id: string;
	userId: string;
	action: string;
	resource: string;
	details: any;
	createdAt: string;
	user?: {
		firstName: string;
		lastName: string;
		email: string;
	};
}

export const getLiveMetrics = async () => {
	const response = await client.get<ApiEnvelope<any>>('/v1/admin/metrics/live');
	return response.data;
};

export const getCrisisAlerts = async () => {
	const response = await client.get<ApiEnvelope<CrisisAlert[]>>('/v1/admin/crisis/alerts');
	return response.data;
};

export const respondToCrisis = async (id: string, data: { action: string; notes?: string }) => {
	const response = await client.post<ApiEnvelope<any>>(`/v1/admin/crisis/${id}/respond`, data);
	return response.data;
};

export const getAuditLogs = async () => {
	const response = await client.get<ApiEnvelope<AuditLog[]>>('/v1/admin/audit');
	return response.data;
};

export const triggerAnalyticsExport = async () => {
	const response = await client.post<ApiEnvelope<{ jobId: string }>>('/v1/admin/reports/export');
	return response.data;
};

export const getExportStatus = async (jobId: string) => {
	const response = await client.get<ApiEnvelope<any>>(`/v1/admin/reports/export/${jobId}`);
	return response.data;
};

// === PHASE 5 EXTENSION: DYNAMIC GROUPS ===

export interface GroupCategory {
	id: string;
	name: string;
	type: string;
	description?: string;
	max_capacity: number;
	session_price: number;
	is_active: boolean;
	createdAt: string;
}

export const getGroupCategories = async () => {
	const response = await client.get<ApiEnvelope<GroupCategory[]>>('/v1/admin/groups');
	return response.data;
};

export const createGroupCategory = async (data: Partial<GroupCategory>) => {
	const response = await client.post<ApiEnvelope<GroupCategory>>('/v1/admin/groups', data);
	return response.data;
};

export const updateGroupCategory = async (id: string, data: Partial<GroupCategory>) => {
	const response = await client.put<ApiEnvelope<GroupCategory>>(`/v1/admin/groups/${id}`, data);
	return response.data;
};

export const deleteGroupCategory = async (id: string) => {
	const response = await client.delete<ApiEnvelope<any>>(`/v1/admin/groups/${id}`);
	return response.data;
};

/**
 * Support & Sentiment Dashboard
 */
export interface FeedbackItem {
	id: string;
	userName: string;
	rating: number;
	comment: string;
	sentiment: 'positive' | 'neutral' | 'negative';
	createdAt: string;
	resolved: boolean;
}

export const getAdminFeedback = async (): Promise<ApiEnvelope<{ feedback: FeedbackItem[] }>> => {
	const response = await client.get<ApiEnvelope<{ feedback: FeedbackItem[] }>>('/v1/admin/feedback');
	return response.data;
};

export const resolveAdminFeedback = async (id: string): Promise<ApiEnvelope<null>> => {
	const response = await client.post<ApiEnvelope<null>>(`/v1/admin/feedback/${id}/resolve`);
	return response.data;
};

/**
 * Dynamic Role Management
 */
export interface Role {
	name: string;
	permissions: string[];
	description?: string;
}

export const getRoles = async (): Promise<ApiEnvelope<Role[]>> => {
	const response = await client.get<ApiEnvelope<Role[]>>('/v1/admin/roles');
	return response.data;
};

export const updateRolePermissions = async (role: string, permissions: string[]): Promise<ApiEnvelope<Role>> => {
	const response = await client.patch<ApiEnvelope<Role>>(`/v1/admin/roles/${role}`, { permissions });
	return response.data;
};

