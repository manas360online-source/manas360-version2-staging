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

export type AdminUserRole = 'patient' | 'therapist' | 'psychiatrist' | 'coach' | 'admin' | 'complianceofficer';
export type PlatformAdminRole = 'admin' | 'clinicaldirector' | 'financemanager' | 'complianceofficer';

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

export type AdminPricingPlanItem = {
	id: string;
	planKey: string;
	planName: string;
	price: number;
	billingCycle: string;
	description?: string | null;
	active: boolean;
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
	platformPlans: AdminPricingPlanItem[];
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

export type PlatformConfigRecord = {
	key: string;
	value: unknown;
	version: number;
	createdAt: string;
	updatedAt: string;
	updatedById: string | null;
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
	sortBy?: 'createdAt' | 'email' | 'role';
	sortOrder?: 'asc' | 'desc';
}): Promise<ApiEnvelope<AdminUsersResponse>> => {
	const query = buildQuery({
		page: params?.page,
		limit: params?.limit,
		role: params?.role,
		status: params?.status,
		sortBy: params?.sortBy,
		sortOrder: params?.sortOrder,
	});

	return (await client.get<ApiEnvelope<AdminUsersResponse>>(`/v1/admin/users${query}`)).data;
};

export const getAdminUserById = async (userId: string): Promise<ApiEnvelope<AdminUserDetail>> => {
	return (await client.get<ApiEnvelope<AdminUserDetail>>(`/v1/admin/users/${encodeURIComponent(userId)}`)).data;
};

export const updateAdminUserStatus = async (
	userId: string,
	status: 'ACTIVE' | 'SUSPENDED',
	reason?: string,
): Promise<ApiEnvelope<unknown>> => {
	return (await client.patch<ApiEnvelope<unknown>>(`/v1/admin/users/${encodeURIComponent(userId)}/status`, { status, reason })).data;
};

export const updateAdminUsersBulkStatus = async (
	userIds: string[],
	status: 'ACTIVE' | 'SUSPENDED',
	reason?: string,
): Promise<ApiEnvelope<{ requestedCount: number; successCount: number; failedCount: number; failedIds: string[]; status: string; reason?: string }>> => {
	return (await client.post<ApiEnvelope<{ requestedCount: number; successCount: number; failedCount: number; failedIds: string[]; status: string; reason?: string }>>('/v1/admin/users/bulk-status', {
		userIds,
		status,
		reason,
	})).data;
};

export type AdminGlobalSearchResult = {
	users: Array<{ id: string; name: string; email: string; role: string }>;
	payments: Array<{ id: string; status: string; amountMinor: number; currency: string }>;
	sessions: Array<{ id: string; status: string; scheduledAt: string | null }>;
};

export const searchAdminEntities = async (q: string, limit = 8): Promise<ApiEnvelope<AdminGlobalSearchResult>> => {
	const query = buildQuery({ q, limit });
	return (await client.get<ApiEnvelope<AdminGlobalSearchResult>>(`/v1/admin/search${query}`)).data;
};

export const getAdminMetrics = async (): Promise<ApiEnvelope<AdminMetrics>> => {
	return (await client.get<ApiEnvelope<AdminMetrics>>('/v1/admin/metrics')).data;
};

export type AdminInvoiceLifecycleStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'FAILED' | 'REFUNDED';

export type AdminInvoice = {
	id: string;
	paymentId: string | null;
	userId: string;
	tenantId: string | null;
	customerName: string;
	customerEmail: string | null;
	invoiceNumber: string;
	invoiceYear: number;
	sequenceNumber: number;
	amountMinor: number;
	status: string;
	lifecycleStatus: AdminInvoiceLifecycleStatus;
	issuedAt: string | null;
	paidAt: string | null;
	refundedAt: string | null;
	createdAt: string;
	updatedAt: string;
	version: number;
	pdfPath: string | null;
	htmlPath: string | null;
	emailedTo: string | null;
	metadata?: Record<string, unknown> | null;
};

export type AdminInvoiceListResponse = {
	success: boolean;
	message?: string;
	data: AdminInvoice[];
	meta: {
		page: number;
		limit: number;
		totalItems: number;
		totalPages: number;
	};
};

export type AdminInvoiceDetail = {
	invoice: AdminInvoice;
	events: Array<{
		id: string;
		eventType: string;
		actorUserId: string | null;
		idempotencyKey: string | null;
		createdAt: string;
	}>;
	payment: {
		id: string;
		status: string;
		amountMinor: number;
		currency: string;
		merchantTransactionId: string;
	} | null;
	auditLogs: Array<{
		id: string;
		action: string;
		resource: string;
		createdAt: string;
		userId: string;
	}>;
};

export const listAdminInvoices = async (_params?: {
	page?: number;
	limit?: number;
	q?: string;
	sortBy?: 'createdAt' | 'issuedAt' | 'invoiceNumber' | 'amountMinor';
	sortOrder?: 'asc' | 'desc';
	status?: AdminInvoiceLifecycleStatus;
}): Promise<AdminInvoiceListResponse> => {
	// Invoices disabled — return empty list to avoid runtime errors
	return {
		success: false,
		message: 'Invoices are disabled in this deployment',
		data: [],
		meta: { page: 1, limit: 0, totalItems: 0, totalPages: 0 },
	} as AdminInvoiceListResponse;
};

export const getAdminInvoiceDetail = async (_invoiceId: string): Promise<ApiEnvelope<AdminInvoiceDetail>> => {
	throw new Error('Invoices are disabled');
};

export const resendAdminInvoice = async (_paymentId: string): Promise<ApiEnvelope<AdminInvoice>> => {
	throw new Error('Invoices are disabled');
};

export const requestAdminInvoiceRefund = async (
	_invoiceId: string,
	_payload: { reason?: string; amountMinor?: number },
): Promise<ApiEnvelope<{ invoiceId: string; refundId: string; merchantRefundId: string; status: string }>> => {
	throw new Error('Invoices are disabled');
};

export const bulkResendAdminInvoices = async (
	_invoiceIds: string[],
): Promise<ApiEnvelope<{ requestedCount: number; successCount: number; failedIds: string[] }>> => {
	throw new Error('Invoices are disabled');
};

export const downloadAdminInvoicePdf = async (_invoiceId: string): Promise<Blob> => {
	throw new Error('Invoices are disabled');
};

export const exportAdminInvoicesCsv = async (_q?: string): Promise<Blob> => {
	throw new Error('Invoices are disabled');
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
	plans?: Array<{
		planKey: string;
		planName: string;
		price: number;
		billingCycle: string;
		description?: string | null;
		active?: boolean;
	}>;
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

export const listPlatformConfigs = async (keys?: string[]): Promise<ApiEnvelope<PlatformConfigRecord[]>> => {
	const query = buildQuery({ keys: keys?.join(',') });
	return (await client.get<ApiEnvelope<PlatformConfigRecord[]>>(`/v1/admin/platform-config${query}`)).data;
};

export const getPlatformConfig = async (key: string): Promise<ApiEnvelope<PlatformConfigRecord>> => {
	return (await client.get<ApiEnvelope<PlatformConfigRecord>>(`/v1/admin/platform-config/${encodeURIComponent(key)}`)).data;
};

export const upsertPlatformConfig = async (
	key: string,
	payload: { value: unknown; expectedVersion?: number }
): Promise<ApiEnvelope<PlatformConfigRecord>> => {
	return (await client.put<ApiEnvelope<PlatformConfigRecord>>(`/v1/admin/platform-config/${encodeURIComponent(key)}`, payload)).data;
};

// --- Phase 13: Admin Analytics ---

export type AdminRevenueAnalytics = {
	patientSubscriptions: number;
	providerSubscriptions: number;
	marketplaceSales: number;
	sessionCommissions: number;
	total: number;
	mrr: number;
	platformShare?: number;
	providerShare?: number;
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
		queue?: string;
		redis: string;
		zohoDesk: string;
		phonePe: string;
	};
	lastChecked: string;
	diagnostics?: {
		dbProbeMs?: number | null;
		queuedExports?: number;
		failedExports24h?: number;
		warnings?: string[];
	};
};

export type AdminComplianceStatus = {
	compliance_percentage: number;
	pending: number;
	critical_gaps: string[];
};

export type AdminLegalDocument = {
	id: string;
	title: string;
	document_type: string;
	current_version: number;
	status: 'PUBLISHED' | 'ARCHIVED';
	published_at: string;
};

export type AdminUserAcceptance = {
	id: string;
	userName: string;
	documentType: string;
	acceptedAt: string;
	ip: string | null;
};

export type AdminPaymentReliabilityStatus = 'FAILED' | 'PENDING' | 'SUCCESS';
export type AdminPaymentReliabilityRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type AdminPaymentReliabilityRow = {
	id: string;
	merchantTransactionId: string;
	provider: string;
	status: AdminPaymentReliabilityStatus;
	dbStatus: string;
	amountMinor: number;
	currency: string;
	retryCount: number;
	riskLevel: AdminPaymentReliabilityRiskLevel;
	failureReason: string | null;
	nextRetryAt: string | null;
	createdAt: string;
	updatedAt: string;
	capturedAt: string | null;
	failedAt: string | null;
	user: {
		id: string | null;
		email: string | null;
		name: string;
	};
};

export type AdminPaymentReliabilityListPayload = {
	data: AdminPaymentReliabilityRow[];
	meta: {
		page: number;
		limit: number;
		totalItems: number;
		totalPages: number;
	};
};

export type AdminPaymentReliabilityMetrics = {
	totalPayments: number;
	successRate: number;
	failureRate: number;
	retrySuccessRate: number;
	failedCount: number;
	pendingCount: number;
	recoveredRevenueMinor: number;
};

export type AdminPaymentReliabilityDetail = {
	payment: {
		id: string;
		merchantTransactionId: string;
		provider: string;
		status: AdminPaymentReliabilityStatus;
		dbStatus: string;
		amountMinor: number;
		currency: string;
		retryCount: number;
		riskLevel: AdminPaymentReliabilityRiskLevel;
		nextRetryAt: string | null;
		createdAt: string;
		updatedAt: string;
		capturedAt: string | null;
		failedAt: string | null;
		patientId: string | null;
		providerId: string | null;
	};
	invoice: {
		id: string;
		invoiceNumber: string;
		lifecycleStatus: string;
		status: string;
		amountMinor: number;
		pdfPath: string | null;
		issuedAt: string | null;
		paidAt: string | null;
	} | null;
	retries: Array<{
		id: string;
		actorType: string;
		actorId: string | null;
		reason: string | null;
		retryCount: number;
		createdAt: string;
		before: unknown;
		after: unknown;
	}>;
	failureReason: string | null;
	gatewayResponse: unknown;
	auditLogs: Array<{
		id: string;
		action: string;
		resource: string;
		actorId: string | null;
		createdAt: string;
		details: unknown;
	}>;
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

export const getAdminComplianceStatus = async () => {
	const response = await client.get<AdminComplianceStatus>('/v1/admin/compliance/status');
	return response.data;
};

export const getAdminLegalDocuments = async () => {
	const response = await client.get<{ documents: AdminLegalDocument[] }>('/v1/admin/legal/documents');
	return response.data;
};

export const getAdminUserAcceptances = async () => {
	const response = await client.get<{ acceptances: AdminUserAcceptance[] }>('/v1/admin/acceptances');
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

export const listAdminPaymentReliability = async (params?: {
	page?: number;
	limit?: number;
	status?: AdminPaymentReliabilityStatus;
	riskLevel?: AdminPaymentReliabilityRiskLevel;
	provider?: 'PHONEPE';
	from?: string;
	to?: string;
	sortBy?: 'createdAt' | 'amountMinor' | 'retryCount';
	sortOrder?: 'asc' | 'desc';
}): Promise<ApiEnvelope<AdminPaymentReliabilityListPayload>> => {
	const query = buildQuery({
		page: params?.page,
		limit: params?.limit,
		status: params?.status,
		riskLevel: params?.riskLevel,
		provider: params?.provider,
		from: params?.from,
		to: params?.to,
		sortBy: params?.sortBy,
		sortOrder: params?.sortOrder,
	});

	return (await client.get<ApiEnvelope<AdminPaymentReliabilityListPayload>>(`/v1/admin/payments/reliability${query}`)).data;
};

export const getAdminPaymentReliabilityMetrics = async (params?: {
	provider?: 'PHONEPE';
	from?: string;
	to?: string;
}): Promise<ApiEnvelope<AdminPaymentReliabilityMetrics>> => {
	const query = buildQuery({ provider: params?.provider, from: params?.from, to: params?.to });
	return (await client.get<ApiEnvelope<AdminPaymentReliabilityMetrics>>(`/v1/admin/payments/reliability/metrics${query}`)).data;
};

export const getAdminPaymentReliabilityDetail = async (paymentId: string): Promise<ApiEnvelope<AdminPaymentReliabilityDetail>> => {
	return (await client.get<ApiEnvelope<AdminPaymentReliabilityDetail>>(`/v1/admin/payments/${encodeURIComponent(paymentId)}`)).data;
};

export const retryAdminPaymentReliability = async (
	paymentId: string,
	payload?: { reason?: string },
): Promise<ApiEnvelope<{ success: boolean; message: string; data: { paymentId: string; status: string; retryCount: number; nextRetryAt: string | null; riskLevel: AdminPaymentReliabilityRiskLevel } }>> => {
	return (await client.post<ApiEnvelope<{ success: boolean; message: string; data: { paymentId: string; status: string; retryCount: number; nextRetryAt: string | null; riskLevel: AdminPaymentReliabilityRiskLevel } }>>(`/v1/admin/payments/${encodeURIComponent(paymentId)}/retry`, payload || {})).data;
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

export interface AdminQrTemplate {
	id: string;
	name: string;
	fill: string;
	back: string;
}

export interface AdminQrStylePreset {
	id: 'rounded' | 'dots' | 'classy' | 'square';
	name: string;
	description: string;
}

export interface AdminQrCodeItem {
	code: string;
	redirectUrl: string;
	templateId: string;
	stylePreset: AdminQrStylePreset['id'];
	foregroundColor: string;
	backgroundColor: string;
	logoUrl?: string | null;
	isActive: boolean;
	scanCount: number;
	connectedCount: number;
	createdAt: string;
	updatedAt: string;
	createdById?: string | null;
	createdBy?: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
	};
}

export interface AdminQrCodeListPayload {
	items: AdminQrCodeItem[];
	templates: AdminQrTemplate[];
	stylePresets: AdminQrStylePreset[];
}

export interface UpsertAdminQrCodePayload {
	code?: string;
	redirectUrl?: string;
	templateId?: string;
	stylePreset?: AdminQrStylePreset['id'];
	foregroundColor?: string;
	backgroundColor?: string;
	logoUrl?: string | null;
	isActive?: boolean;
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
	const response = await client.put<ApiEnvelope<MarqueeOffer>>(`/v1/admin/offers/${id}`, data);
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

export const listAdminQrCodes = async () => {
	const response = await client.get<ApiEnvelope<AdminQrCodeListPayload>>('/v1/admin/qr-codes');
	return response.data;
};

export const createAdminQrCode = async (payload: UpsertAdminQrCodePayload) => {
	const response = await client.post<ApiEnvelope<AdminQrCodeItem>>('/v1/admin/qr-codes', payload);
	return response.data;
};

export const updateAdminQrCode = async (code: string, payload: UpsertAdminQrCodePayload) => {
	const response = await client.patch<ApiEnvelope<AdminQrCodeItem>>(`/v1/admin/qr-codes/${encodeURIComponent(code)}`, payload);
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
	const response = await client.get<ApiEnvelope<PricingContract[]>>('/v1/admin/pricing/contracts');
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

export interface AdminAuditLog {
	id: string;
	createdAt: string;
	actorId: string;
	actor: {
		id: string;
		name: string;
		email: string | null;
	};
	action: string;
	entityType: string;
	entityId: string;
	policy: string | null;
	policyVersion: number | null;
	status: string;
	details: Record<string, unknown> | null;
}

export interface AdminAuditListResponse {
	data: AdminAuditLog[];
	meta: {
		page: number;
		limit: number;
		totalItems: number;
		totalPages: number;
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

export const getAuditLogs = async (params?: {
	page?: number;
	limit?: number;
	entityType?: string;
	action?: string;
	policy?: string;
	actorId?: string;
	actor?: string;
	from?: string;
	to?: string;
	deniedOnly?: boolean;
}) => {
	const query = buildQuery({
		page: params?.page,
		limit: params?.limit,
		entityType: params?.entityType,
		action: params?.action,
		policy: params?.policy,
		actorId: params?.actorId,
		actor: params?.actor,
		from: params?.from,
		to: params?.to,
		deniedOnly: params?.deniedOnly ? 'true' : undefined,
	});
	const response = await client.get<ApiEnvelope<AdminAuditListResponse>>(`/v1/admin/audit${query}`);
	return response.data;
};

export const exportAuditLogs = async (params?: {
	format?: 'csv' | 'json';
	limit?: number;
	entityType?: string;
	action?: string;
	policy?: string;
	actorId?: string;
	actor?: string;
	from?: string;
	to?: string;
	deniedOnly?: boolean;
}): Promise<Blob> => {
	const response = await client.post(
		'/v1/admin/audit/export',
		{
			format: params?.format || 'csv',
			limit: params?.limit,
			entityType: params?.entityType,
			action: params?.action,
			policy: params?.policy,
			actorId: params?.actorId,
			actor: params?.actor,
			from: params?.from,
			to: params?.to,
			deniedOnly: params?.deniedOnly,
		},
		{ responseType: 'blob' },
	);

	return response.data as Blob;
};

export const triggerAnalyticsExport = async (
	format: 'csv' | 'pdf' = 'csv',
	organizationKey = 1,
) => {
	const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
	const to = new Date().toISOString();
	const response = await client.post<ApiEnvelope<{ jobId: string }>>('/v1/admin/reports/export', {
		format,
		from,
		to,
		organizationKey,
	});
	return response.data;
};

export const getExportStatus = async (jobId: string) => {
	const response = await client.get<ApiEnvelope<any>>(`/v1/admin/reports/export/${jobId}`);
	return response.data;
};

export const getAdminExportDownloadUrl = (jobId: string): string => {
	return `/api/v1/admin/reports/export/${encodeURIComponent(jobId)}/download`;
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

export interface CreatePlatformAdminPayload {
	email: string;
	role: PlatformAdminRole;
	firstName?: string;
	lastName?: string;
	password?: string;
	name?: string;
}

export interface CreatePlatformAdminResponse {
	user: {
		id: string;
		email: string | null;
		role: string;
		firstName: string;
		lastName: string;
	};
	temporaryPassword: string;
	isNewAccount: boolean;
}

export const getRoles = async (): Promise<ApiEnvelope<Role[]>> => {
	const response = await client.get<ApiEnvelope<Role[]>>('/v1/admin/roles');
	return response.data;
};

export const updateRolePermissions = async (role: string, permissions: string[]): Promise<ApiEnvelope<Role>> => {
	const response = await client.patch<ApiEnvelope<Role>>(`/v1/admin/roles/${role}`, { permissions });
	return response.data;
};

export const createPlatformAdminAccount = async (payload: CreatePlatformAdminPayload): Promise<ApiEnvelope<CreatePlatformAdminResponse>> => {
	const response = await client.post<ApiEnvelope<CreatePlatformAdminResponse>>('/v1/admin/rbac/platform-admins', payload);
	return response.data;
};

// --- Payout System ---

export type AdminPayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type AdminPayoutMethod = 'BANK' | 'UPI';

export interface AdminPayout {
	id: string;
	providerId: string;
	amountMinor: string;
	currency: string;
	status: AdminPayoutStatus;
	method: AdminPayoutMethod;
	createdAt: string;
	processedAt: string | null;
	failureReason: string | null;
	version: number;
}

export interface AdminPayoutItem {
	id: string;
	payoutId: string;
	invoiceId: string;
	amountMinor: string;
}

export interface AdminPayoutMetrics {
	pending: { count: number; totalAmountMinor: string };
	completed: { count: number; totalAmountMinor: string };
	failed: { count: number; totalAmountMinor: string };
	totalVolume: string;
}

export interface AdminPayoutListResponse {
	success: boolean;
	data: {
		items: Array<AdminPayout & { provider?: any; items?: AdminPayoutItem[] }>;
		page: number;
		limit: number;
		total: number;
	};
}

export interface AdminPayoutDetail {
	payout: AdminPayout;
	items: AdminPayoutItem[];
	invoices: any[];
	auditLogs: Array<{ id: string; action: string; userId: string; createdAt: string; details?: any }>;
}

export const listAdminPayouts = async (params?: {
	page?: number;
	limit?: number;
	status?: AdminPayoutStatus;
	providerId?: string;
	from?: string;
	to?: string;
	sortBy?: 'createdAt' | 'amountMinor';
	sortOrder?: 'asc' | 'desc';
}): Promise<AdminPayoutListResponse> => {
	const query = buildQuery({
		page: params?.page,
		limit: params?.limit,
		status: params?.status,
		providerId: params?.providerId,
		from: params?.from,
		to: params?.to,
		sortBy: params?.sortBy,
		sortOrder: params?.sortOrder,
	});
	const response = await client.get<AdminPayoutListResponse>(`/v1/admin/payouts${query}`);
	return response.data;
};

export const getAdminPayoutMetrics = async (): Promise<ApiEnvelope<AdminPayoutMetrics>> => {
	const response = await client.get<ApiEnvelope<AdminPayoutMetrics>>('/v1/admin/payouts/metrics');
	return response.data;
};

export const getAdminPayoutDetail = async (payoutId: string): Promise<ApiEnvelope<AdminPayoutDetail>> => {
	const response = await client.get<ApiEnvelope<AdminPayoutDetail>>(`/v1/admin/payouts/${encodeURIComponent(payoutId)}`);
	return response.data;
};

export const createAdminPayout = async (
	data: { providerId: string; invoiceIds: string[]; method: AdminPayoutMethod },
	idempotencyKey: string,
): Promise<ApiEnvelope<{ id: string; amountMinor: string; invoiceCount: number }>> => {
	const response = await client.post<ApiEnvelope<{ id: string; amountMinor: string; invoiceCount: number }>>('/v1/admin/payouts', data, {
		headers: { 'Idempotency-Key': idempotencyKey },
	});
	return response.data;
};

export const processAdminPayout = async (payoutId: string): Promise<ApiEnvelope<{ id: string; status: AdminPayoutStatus }>> => {
	const response = await client.post<ApiEnvelope<{ id: string; status: AdminPayoutStatus }>>(`/v1/admin/payouts/${encodeURIComponent(payoutId)}/process`);
	return response.data;
};

export const retryAdminPayout = async (payoutId: string): Promise<ApiEnvelope<{ id: string; status: AdminPayoutStatus }>> => {
	const response = await client.post<ApiEnvelope<{ id: string; status: AdminPayoutStatus }>>(`/v1/admin/payouts/${encodeURIComponent(payoutId)}/retry`);
	return response.data;
};

