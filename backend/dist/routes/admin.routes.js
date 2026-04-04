"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const admin_controller_1 = require("../controllers/admin.controller");
const admin_analytics_controller_1 = require("../controllers/admin-analytics.controller");
const admin_module_controller_1 = require("../controllers/admin-module.controller");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const pricing_controller_1 = require("../controllers/pricing.controller");
const free_screening_admin_controller_1 = require("../controllers/free-screening-admin.controller");
const admin_verification_controller_1 = require("../controllers/admin-verification.controller");
const admin_payout_controller_1 = require("../controllers/admin-payout.controller");
const admin_pricing_controller_1 = require("../controllers/admin-pricing.controller");
const admin_tickets_controller_1 = require("../controllers/admin-tickets.controller");
const admin_offer_controller_1 = require("../controllers/admin-offer.controller");
const admin_metrics_controller_1 = require("../controllers/admin-metrics.controller");
const admin_crisis_controller_1 = require("../controllers/admin-crisis.controller");
const admin_audit_controller_1 = require("../controllers/admin-audit.controller");
const admin_groups_controller_1 = require("../controllers/admin-groups.controller");
const admin_qr_controller_1 = require("../controllers/admin-qr.controller");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/admin/users
 * List all users with pagination and filters
 * Query parameters:
 *   - role: 'patient' | 'therapist' | 'admin' (optional)
 *   - status: 'active' | 'deleted' (optional)
 *   - page: pagination page number (default: 1)
 *   - limit: items per page (default: 10, max: 50)
 */
router.get('/users', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), ...validate_middleware_1.validateAdminListUsersQuery, (0, validate_middleware_1.asyncHandler)(admin_controller_1.listUsersController));
/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Route parameters:
 *   - id: user identifier
 */
router.get('/users/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), ...validate_middleware_1.validateAdminGetUserIdParam, (0, validate_middleware_1.asyncHandler)(admin_controller_1.getUserController));
router.patch('/users/:id/status', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, validate_middleware_1.asyncHandler)(admin_controller_1.updateAdminUserStatusController));
/**
 * PATCH /api/v1/admin/therapists/:id/verify
 * Verify therapist credentials
 * Sets isVerified = true and records verification timestamp
 * Route parameters:
 *   - id: therapist identifier
 * Response: Updated therapist profile summary
 */
router.patch('/therapists/:id/verify', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('manage_therapists'), ...validate_middleware_1.validateTherapistProfileIdParam, (0, validate_middleware_1.asyncHandler)(admin_controller_1.verifyTherapistController));
router.post('/verify-provider/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('manage_therapists'), ...validate_middleware_1.validateTherapistProfileIdParam, (0, validate_middleware_1.asyncHandler)(admin_controller_1.verifyProviderController));
/**
 * POST /api/v1/admin/approve-provider/:id
 * Approve provider onboarding — sets isVerified, onboardingStatus = COMPLETED
 * Route parameters:
 *   - id: provider user ID
 */
router.post('/approve-provider/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('manage_therapists'), (0, validate_middleware_1.asyncHandler)(admin_controller_1.approveProviderController));
/**
 * GET /api/v1/admin/user-approvals
 * Get all users pending onboarding approval
 */
router.get('/user-approvals', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, rbac_middleware_1.requirePermission)('manage_users'), (0, validate_middleware_1.asyncHandler)(admin_controller_1.getAdminUserApprovalsController));
/**
 * PATCH /api/v1/admin/user-approvals/:id
 * Approve or Reject a user's registration
 */
router.patch('/user-approvals/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, rbac_middleware_1.requirePermission)('manage_users'), (0, validate_middleware_1.asyncHandler)(admin_controller_1.updateAdminUserApprovalController));
/**
 * GET /api/v1/admin/metrics
 * Get comprehensive platform metrics
 * No query parameters required
 * Response includes:
 *   - totalUsers: Count of active users
 *   - totalTherapists: Count of therapist profiles
 *   - verifiedTherapists: Count of verified therapists
 *   - completedSessions: Count of completed therapy sessions
 *   - totalRevenue: Sum of all transaction amounts
 *   - activeSubscriptions: Count of therapists with active patients
 */
router.get('/metrics', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('view_analytics'), (0, validate_middleware_1.asyncHandler)(admin_controller_1.getMetricsController));
/**
 * GET /api/v1/admin/subscriptions
 * List all active subscriptions with pagination and filters
 * Query parameters:
 *   - planType: 'basic' | 'premium' | 'pro' (optional)
 *   - status: 'active' | 'expired' | 'cancelled' | 'paused' (optional, default: 'active')
 *   - page: pagination page number (default: 1)
 *   - limit: items per page (default: 10, max: 50)
 * Response: Paginated list of subscriptions with user and plan details
 */
router.get('/subscriptions', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), ...validate_middleware_1.validateAdminListSubscriptionsQuery, (0, validate_middleware_1.asyncHandler)(admin_controller_1.listSubscriptionsController));
router.get('/pricing', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(pricing_controller_1.getAdminPricingConfigController));
router.put('/pricing', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(pricing_controller_1.updateAdminPricingConfigController));
router.patch('/pricing', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(pricing_controller_1.updateAdminPricingConfigController));
router.get('/screening/templates', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.listScreeningTemplatesAdminController));
router.post('/screening/templates', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.createScreeningTemplateAdminController));
router.post('/screening/templates/defaults/:templateKey/ensure', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.ensureScreeningTemplateDefaultAdminController));
router.put('/screening/templates/:templateId', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.updateScreeningTemplateAdminController));
router.get('/screening/templates/:templateId/questions', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.listTemplateQuestionsAdminController));
router.post('/screening/templates/:templateId/questions', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.createTemplateQuestionAdminController));
router.put('/screening/questions/:questionId', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.updateTemplateQuestionAdminController));
router.post('/screening/questions/:questionId/options', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.createQuestionOptionAdminController));
router.put('/screening/options/:optionId', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.updateQuestionOptionAdminController));
router.get('/screening/templates/:templateId/scoring-bands', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.listScoringBandsAdminController));
router.put('/screening/templates/:templateId/scoring-bands', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.replaceScoringBandsAdminController));
router.post('/screening/templates/:templateId/simulate', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.simulateTemplateScoringController));
router.get('/screening/provider-questions', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(free_screening_admin_controller_1.listAllProviderExtraQuestionsAdminController));
/**
 * GET /api/v1/admin/modules/:module/summary
 * Generic real-time summary for admin module pages.
 */
router.get('/modules/:module/summary', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_module_controller_1.getAdminModuleSummaryController));
// ==================== DASHBOARD & CORE ====================
router.get('/analytics/health', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminSystemHealthController));
router.get('/company-reports', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminCompanyReportsController));
router.get('/analytics/bi-summary', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminBICorporateSummaryController));
router.get('/analytics/therapist-performance', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminTherapistPerformanceController));
router.get('/analytics/reliability', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminPaymentReliabilityController));
router.get('/analytics/user-growth', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminUserGrowthAnalyticsController));
router.get('/analytics/sessions', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminSessionAnalyticsController));
router.get('/analytics/platform', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminPlatformAnalyticsController));
/**
 * GET /api/v1/admin/analytics/summary
 * Query params:
 *   - from: ISO date/time string (required)
 *   - to: ISO date/time string (required)
 *   - organizationKey: bigint (required)
 *   - therapistId: string (optional)
 */
router.get('/analytics/summary', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('view_analytics'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminAnalyticsSummaryController));
/**
 * GET /api/v1/admin/analytics/templates
 * Query params:
 *   - from: ISO date string (required)
 *   - to: ISO date string (required)
 *   - organizationKey: bigint (required)
 *   - limit: number (optional, default 25, max 100)
 *   - lastSessionsCount: bigint (optional, keyset cursor)
 *   - lastTemplateKey: bigint (optional, keyset cursor)
 */
router.get('/analytics/templates', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminMostUsedTemplatesController));
/**
 * GET /api/v1/admin/analytics/utilization
 * Query params:
 *   - from: ISO date string (required)
 *   - to: ISO date string (required)
 *   - organizationKey: bigint (required)
 *   - limit: number (optional, default 25, max 100)
 *   - lastWeekStartDate: YYYY-MM-DD (optional, keyset cursor)
 *   - lastTherapistKey: bigint (optional, keyset cursor)
 */
router.get('/analytics/utilization', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminTherapistUtilizationController));
/**
 * GET /api/v1/admin/analytics/revenue
 * Get revenue analytics dashboard data
 */
router.get('/analytics/revenue', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('view_analytics'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminRevenueAnalyticsController));
/**
 * GET /api/v1/admin/analytics/user-metrics
 * Get user metrics and growth analytics
 */
router.get('/analytics/users', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('view_analytics'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminUserMetricsController));
/**
 * GET /api/v1/admin/analytics/provider-metrics
 * Get provider performance and utilization metrics
 */
router.get('/analytics/providers', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('view_analytics'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminProviderMetricsController));
/**
 * GET /api/v1/admin/analytics/marketplace-metrics
 * Get marketplace (lead matching, supply/demand) metrics
 */
router.get('/analytics/marketplace', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('view_analytics'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminMarketplaceMetricsController));
/**
 * GET /api/v1/admin/analytics/system-health
 * Get system health and infrastructure metrics
 */
router.get('/analytics/health', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('view_analytics'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminSystemHealthController));
/**
 * GET /api/v1/admin/analytics/payments
 * Query params:
 *   - days: number (optional, default 30)
 */
router.get('/analytics/payments', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('view_analytics'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminPaymentReliabilityController));
/**
 * POST /api/v1/admin/payments/:paymentId/retry
 * Manual payment retry endpoint (admin/support tool)
 *
 * Resets retry counter and schedules immediate reconciliation
 * Use when customer updates payment method to trigger re-attempt
 *
 * Route params:
 *   - paymentId: string (financial_payment.id)
 *
 * Response: { success: boolean, message: string, payment: { id, status, retryCount, nextRetryAt } }
 *
 * Requires: admin role + manage_payments permission
 */
router.post('/payments/:paymentId/retry', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('manage_payments'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.retryPaymentManuallyController));
/**
 * POST /api/v1/admin/analytics/export
 * Body:
 *   - format: 'csv' | 'pdf'
 *   - from: ISO date/time (required)
 *   - to: ISO date/time (required)
 *   - organizationKey: number (required)
 *   - includeChartsSnapshot?: boolean
 *   - chartSnapshots?: string[] (data URL images; optional)
 */
router.post('/analytics/export', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('view_analytics'), rateLimiter_middleware_1.adminAnalyticsExportRateLimiter, (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.exportAdminAnalyticsReportController));
/**
 * POST /api/v1/admin/analytics/export/async
 * Queue heavy export job for async processing.
 */
router.post('/analytics/export/async', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), rateLimiter_middleware_1.adminAnalyticsExportRateLimiter, (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.enqueueAdminAnalyticsExportController));
/**
 * GET /api/v1/admin/analytics/export/:exportJobKey/status
 * Poll async export status.
 */
router.get('/analytics/export/:exportJobKey/status', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminAnalyticsExportStatusController));
/**
 * GET /api/v1/admin/analytics/export/:exportJobKey/download
 * Download completed async export output.
 */
router.get('/analytics/export/:exportJobKey/download', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('view_analytics'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.downloadAdminAnalyticsExportController));
// === PHASE 2: ENHANCED VERIFICATION + PAYOUTS + WAIVERS ===
router.get('/verifications', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('manage_therapists'), (0, validate_middleware_1.asyncHandler)(admin_verification_controller_1.getVerificationsController));
router.get('/verifications/:id/documents', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('manage_therapists'), (0, validate_middleware_1.asyncHandler)(admin_verification_controller_1.getVerificationDocumentsController));
router.patch('/verifications/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('manage_therapists'), (0, validate_middleware_1.asyncHandler)(admin_verification_controller_1.updateVerificationController));
router.get('/payouts', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('payouts_approve'), (0, validate_middleware_1.asyncHandler)(admin_payout_controller_1.getPayoutsController));
router.post('/payouts/:id/approve', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('payouts_approve'), (0, validate_middleware_1.asyncHandler)(admin_payout_controller_1.approvePayoutController));
router.post('/waive-subscription', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_pricing_controller_1.waiveSubscriptionController));
router.post('/pricing/free-toggle', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('pricing_edit'), (0, validate_middleware_1.asyncHandler)(admin_pricing_controller_1.toggleGlobalFreeController));
// === PHASE 3: ZOHO DESK + ZOHO FLOW INTEGRATION ===
router.get('/tickets', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), admin_tickets_controller_1.getZohoTicketsController);
router.post('/tickets/:id/comment', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), admin_tickets_controller_1.addZohoCommentController);
router.get('/blueprints/status', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), admin_tickets_controller_1.getBlueprintStatusController);
// === PHASE 4: OFFER MARQUEE + PRICING CONTRACTS ===
router.get('/offers', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('offers_edit'), admin_offer_controller_1.getOffersController);
router.post('/offers', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('offers_edit'), admin_offer_controller_1.createOfferController);
router.put('/offers/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('offers_edit'), admin_offer_controller_1.updateOfferController);
router.delete('/offers/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('offers_edit'), admin_offer_controller_1.deleteOfferController);
router.post('/offers/reorder', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('offers_edit'), admin_offer_controller_1.reorderOffersController);
router.post('/offers/publish', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('offers_edit'), admin_offer_controller_1.publishOffersController);
// === QR CODE MANAGEMENT ===
router.get('/qr-codes', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, validate_middleware_1.asyncHandler)(admin_qr_controller_1.listAdminQrCodesController));
router.post('/qr-codes', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, validate_middleware_1.asyncHandler)(admin_qr_controller_1.createAdminQrCodeController));
router.patch('/qr-codes/:code', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin']), (0, validate_middleware_1.asyncHandler)(admin_qr_controller_1.updateAdminQrCodeController));
router.get('/pricing/contracts', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), admin_pricing_controller_1.getPricingContractsController);
router.post('/pricing/contracts/draft', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('pricing_edit'), admin_pricing_controller_1.createPricingDraftController);
router.post('/pricing/contracts/:id/approve', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('pricing_edit'), admin_pricing_controller_1.approvePricingContractController);
// === PHASE 5: REAL-TIME, CRISIS, REPORTS & AUDIT ===
router.get('/metrics/live', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), admin_metrics_controller_1.getLiveMetricsController);
router.get('/live-sessions', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'superadmin', 'complianceofficer']), (0, rbac_middleware_1.requirePermission)('view_analytics'), (0, validate_middleware_1.asyncHandler)(admin_controller_1.getAdminLiveSessionsController));
/**
 * Support & Sentiment Dashboard
 */
router.get('/feedback', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), (0, validate_middleware_1.asyncHandler)(admin_controller_1.getAdminFeedbackController));
router.post('/feedback/:id/resolve', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), (0, validate_middleware_1.asyncHandler)(admin_controller_1.resolveAdminFeedbackController));
router.get('/crisis/alerts', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), admin_crisis_controller_1.getCrisisAlertsController);
router.post('/crisis/:id/respond', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), admin_crisis_controller_1.respondToCrisisController);
router.get('/audit', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), admin_audit_controller_1.getAuditLogController);
router.get('/compliance/status', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), (0, validate_middleware_1.asyncHandler)(admin_controller_1.getComplianceStatusController));
router.get('/legal/documents', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), (0, validate_middleware_1.asyncHandler)(admin_controller_1.getLegalDocumentsController));
router.get('/legal/documents/:id/download', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), (0, validate_middleware_1.asyncHandler)(admin_controller_1.downloadLegalDocumentController));
router.get('/acceptances', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), (0, validate_middleware_1.asyncHandler)(admin_controller_1.getUserAcceptancesController));
// Advanced Reporting & Exports
router.post('/reports/export', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), (0, rbac_middleware_1.requirePermission)('view_analytics'), admin_analytics_controller_1.enqueueAdminAnalyticsExportController);
router.get('/reports/export/:jobId', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), (0, rbac_middleware_1.requirePermission)('view_analytics'), admin_analytics_controller_1.getAdminAnalyticsExportStatusController);
router.get('/reports/export/:jobId/download', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)(['admin', 'complianceofficer']), (0, rbac_middleware_1.requirePermission)('view_analytics'), admin_analytics_controller_1.downloadAdminAnalyticsExportController);
// === PHASE 5 EXTENSION: DYNAMIC GROUPS ===
router.get('/groups', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), admin_groups_controller_1.listGroupCategoriesController);
router.post('/groups', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), admin_groups_controller_1.createGroupCategoryController);
router.put('/groups/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), admin_groups_controller_1.updateGroupCategoryController);
router.delete('/groups/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), admin_groups_controller_1.deleteGroupCategoryController);
// === DYNAMIC ROLE MANAGEMENT ===
router.get('/roles', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('superadmin'), (0, validate_middleware_1.asyncHandler)(admin_controller_1.getRolesController));
router.patch('/roles/:role', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('superadmin'), (0, validate_middleware_1.asyncHandler)(admin_controller_1.updateRolePermissionsController));
router.get('/rbac/platform-admins', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('superadmin'), (0, validate_middleware_1.asyncHandler)(admin_controller_1.getPlatformAdminRoleInventoryController));
router.post('/rbac/platform-admins', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('superadmin'), (0, validate_middleware_1.asyncHandler)(admin_controller_1.createPlatformAdminAccountController));
exports.default = router;
