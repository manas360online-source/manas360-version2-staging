import client from './client';

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
