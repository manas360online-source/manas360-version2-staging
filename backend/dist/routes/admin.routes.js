"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
router.get('/users', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('manage_users'), ...validate_middleware_1.validateAdminListUsersQuery, (0, validate_middleware_1.asyncHandler)(admin_controller_1.listUsersController));
/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Route parameters:
 *   - id: user identifier
 */
router.get('/users/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, rbac_middleware_1.requirePermission)('read_all_profiles'), ...validate_middleware_1.validateAdminGetUserIdParam, (0, validate_middleware_1.asyncHandler)(admin_controller_1.getUserController));
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
/**
 * POST /api/v1/admin/waive-subscription
 * Admin grants a subscription without charging the user (free access).
 * Skips PhonePe entirely. Logs as ADMIN_WAIVER_GRANTED.
 * Generates a dummy transaction audit record.
 */
router.post('/waive-subscription', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(async (req, res) => {
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/db')));
    const { logger } = await Promise.resolve().then(() => __importStar(require('../utils/logger')));
    const { randomUUID } = await Promise.resolve().then(() => __importStar(require('crypto')));
    const adminId = req.auth?.userId;
    const userId = String(req.body.userId ?? '').trim();
    const planKey = String(req.body.planKey ?? 'basic').trim();
    const durationDays = Number(req.body.durationDays) || 30;
    const reason = String(req.body.reason ?? 'Admin waiver').trim();
    if (!userId) {
        return res.status(422).json({ success: false, message: 'userId is required' });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    const role = String(user.role || '').toUpperCase();
    const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const dummyTxId = `WAIVER_${Date.now()}_${randomUUID().substring(0, 8)}`;
    // Create a financial record for audit trail
    await prisma.financialPayment.create({
        data: {
            id: randomUUID(),
            razorpayPaymentId: dummyTxId,
            status: 'CAPTURED',
            amountMinor: 0,
            currency: 'INR',
            patientId: role === 'PATIENT' ? userId : undefined,
            providerId: role !== 'PATIENT' ? userId : undefined,
            metadata: {
                action: 'ADMIN_WAIVER',
                adminId,
                reason,
                planKey,
                durationDays
            }
        }
    });
    if (['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH'].includes(role)) {
        await prisma.providerSubscription.upsert({
            where: { providerId: userId },
            create: {
                providerId: userId,
                plan: planKey,
                status: 'active',
                startDate: new Date(),
                expiryDate,
                leadsUsedThisWeek: 0,
            },
            update: {
                plan: planKey,
                status: 'active',
                startDate: new Date(),
                expiryDate,
                leadsUsedThisWeek: 0,
            },
        });
    }
    else {
        await prisma.patientSubscription.upsert({
            where: { userId },
            create: {
                userId,
                planName: planKey,
                price: 0,
                status: 'active',
                autoRenew: false,
                renewalDate: expiryDate,
            },
            update: {
                planName: planKey,
                price: 0,
                status: 'active',
                autoRenew: false,
                renewalDate: expiryDate,
            },
        });
    }
    logger.info('[AdminWaiver] ADMIN_WAIVER_GRANTED', {
        adminId,
        userId,
        role,
        planKey,
        durationDays,
        expiryDate: expiryDate.toISOString(),
        reason,
        dummyTxId
    });
    res.status(200).json({
        success: true,
        message: `Subscription waived for user ${userId}. Plan: ${planKey}, Duration: ${durationDays} days. Record: ${dummyTxId}`,
    });
}));
exports.default = router;
