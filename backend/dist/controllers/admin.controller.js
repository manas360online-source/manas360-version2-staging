"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadLegalDocumentController = exports.getLegalDocumentsController = exports.getComplianceStatusController = exports.getUserAcceptancesController = exports.updateRolePermissionsController = exports.getRolesController = exports.updateAdminUserStatusController = exports.resolveAdminFeedbackController = exports.getAdminFeedbackController = exports.getAdminLiveSessionsController = exports.updateAdminUserApprovalController = exports.getAdminUserApprovalsController = exports.listSubscriptionsController = exports.getMetricsController = exports.approveProviderController = exports.verifyProviderController = exports.verifyTherapistController = exports.getUserController = exports.listUsersController = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const admin_service_1 = require("../services/admin.service");
const db_1 = require("../config/db");
const response_1 = require("../utils/response");
/**
 * GET /api/v1/admin/users
 * List all users with pagination and filters
 * Admin role required
 */
const listUsersController = async (req, res) => {
    const query = req.validatedAdminListUsersQuery;
    if (!query) {
        throw new error_middleware_1.AppError('Invalid query parameters', 400);
    }
    const result = await (0, admin_service_1.listUsers)(query.page, query.limit, {
        role: query.role,
        status: query.status,
    });
    (0, response_1.sendSuccess)(res, result, 'Users fetched successfully');
};
exports.listUsersController = listUsersController;
/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Admin role required
 */
const getUserController = async (req, res) => {
    const userId = req.validatedUserId;
    if (!userId) {
        throw new error_middleware_1.AppError('User ID is required', 400);
    }
    const user = await (0, admin_service_1.getUserById)(userId);
    (0, response_1.sendSuccess)(res, user, 'User fetched successfully');
};
exports.getUserController = getUserController;
/**
 * PATCH /api/v1/admin/therapists/:id/verify
 * Verify therapist credentials
 * Admin role required
 * Sets isVerified = true and records verification timestamp
 */
const verifyTherapistController = async (req, res) => {
    const therapistProfileId = req.validatedTherapistProfileId;
    const adminUserId = req.auth?.userId;
    if (!therapistProfileId) {
        throw new error_middleware_1.AppError('Therapist profile ID is required', 400);
    }
    if (!adminUserId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    const result = await (0, admin_service_1.verifyTherapist)(therapistProfileId, adminUserId);
    (0, response_1.sendSuccess)(res, result, 'Therapist verified successfully');
};
exports.verifyTherapistController = verifyTherapistController;
const verifyProviderController = async (req, res) => {
    const providerUserId = req.validatedTherapistProfileId;
    const adminUserId = req.auth?.userId;
    if (!providerUserId) {
        throw new error_middleware_1.AppError('Provider ID is required', 400);
    }
    if (!adminUserId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    const result = await (0, admin_service_1.verifyProvider)(providerUserId, adminUserId);
    (0, response_1.sendSuccess)(res, result, 'Provider verified successfully');
};
exports.verifyProviderController = verifyProviderController;
const approveProviderController = async (req, res) => {
    const providerUserId = req.params['id'];
    const adminUserId = req.auth?.userId;
    if (!providerUserId) {
        throw new error_middleware_1.AppError('Provider ID is required', 400);
    }
    if (!adminUserId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    const result = await (0, admin_service_1.approveProvider)(providerUserId, adminUserId);
    (0, response_1.sendSuccess)(res, result, 'Provider approved successfully');
};
exports.approveProviderController = approveProviderController;
/**
 * GET /api/v1/admin/metrics
 * Get comprehensive platform metrics
 * Admin role required
 *
 * Returns:
 * - totalUsers: Count of active users
 * - totalTherapists: Count of therapist profiles
 * - verifiedTherapists: Count of verified therapists
 * - completedSessions: Count of completed therapy sessions
 * - totalRevenue: Sum of all transaction amounts
 * - activeSubscriptions: Count of therapists with active patients
 */
const getMetricsController = async (req, res) => {
    const metrics = await (0, admin_service_1.getMetrics)();
    (0, response_1.sendSuccess)(res, metrics, 'Platform metrics retrieved successfully');
};
exports.getMetricsController = getMetricsController;
/**
 * GET /api/v1/admin/subscriptions
 * List all active subscriptions with pagination and filters
 * Admin role required
 *
 * Query parameters:
 * - planType: 'basic' | 'premium' | 'pro' (optional)
 * - status: 'active' | 'expired' | 'cancelled' | 'paused' (optional, default: 'active')
 * - page: pagination page (default: 1)
 * - limit: items per page (default: 10, max: 50)
 */
const listSubscriptionsController = async (req, res) => {
    const query = req.validatedAdminListSubscriptionsQuery;
    if (!query) {
        throw new error_middleware_1.AppError('Invalid query parameters', 400);
    }
    const result = await (0, admin_service_1.listSubscriptions)(query.page, query.limit, {
        planType: query.planType,
        status: query.status,
    });
    (0, response_1.sendSuccess)(res, result, 'Subscriptions fetched successfully');
};
exports.listSubscriptionsController = listSubscriptionsController;
/**
 * GET /api/v1/admin/user-approvals
 * Get all users pending onboarding approval
 */
const getAdminUserApprovalsController = async (req, res) => {
    const users = await (0, admin_service_1.getUserApprovals)();
    (0, response_1.sendSuccess)(res, { users }, 'Pending approvals fetched successfully');
};
exports.getAdminUserApprovalsController = getAdminUserApprovalsController;
/**
 * PATCH /api/v1/admin/user-approvals/:id
 * Approve or Reject a user's registration
 */
const updateAdminUserApprovalController = async (req, res) => {
    const userId = req.params['id'];
    const { action, reason } = req.body;
    if (!userId) {
        throw new error_middleware_1.AppError('User ID is required', 400);
    }
    if (!['approve', 'reject'].includes(action)) {
        throw new error_middleware_1.AppError('Invalid action. Must be "approve" or "reject"', 400);
    }
    await (0, admin_service_1.updateUserApprovalStatus)(userId, action, reason);
    (0, response_1.sendSuccess)(res, null, `User ${action}ed successfully`);
};
exports.updateAdminUserApprovalController = updateAdminUserApprovalController;
/**
 * GET /api/v1/admin/live-sessions
 * Get currently active sessions (Live Monitor)
 */
const getAdminLiveSessionsController = async (req, res) => {
    const sessions = await (0, admin_service_1.listLiveSessions)();
    (0, response_1.sendSuccess)(res, { sessions }, 'Live sessions fetched successfully');
};
exports.getAdminLiveSessionsController = getAdminLiveSessionsController;
/**
 * GET /api/v1/admin/feedback
 * List all user feedback
 */
const getAdminFeedbackController = async (req, res) => {
    const feedback = await (0, admin_service_1.getFeedback)();
    (0, response_1.sendSuccess)(res, { feedback }, 'User feedback fetched successfully');
};
exports.getAdminFeedbackController = getAdminFeedbackController;
/**
 * POST /api/v1/admin/feedback/:id/resolve
 * Mark a feedback item as resolved
 */
const resolveAdminFeedbackController = async (req, res) => {
    const feedbackId = req.params['id'];
    if (!feedbackId) {
        throw new error_middleware_1.AppError('Feedback ID is required', 400);
    }
    await (0, admin_service_1.resolveFeedback)(feedbackId);
    (0, response_1.sendSuccess)(res, null, 'Feedback marked as resolved');
};
exports.resolveAdminFeedbackController = resolveAdminFeedbackController;
/**
 * PATCH /api/v1/admin/users/:id/status
 * Update a user's status (Active/Suspended/etc)
 */
const updateAdminUserStatusController = async (req, res) => {
    const userId = req.params['id'];
    const { status } = req.body;
    if (!userId) {
        throw new error_middleware_1.AppError('User ID is required', 400);
    }
    if (!status) {
        throw new error_middleware_1.AppError('Status is required', 400);
    }
    await (0, admin_service_1.updateUserStatus)(userId, status);
    (0, response_1.sendSuccess)(res, null, `User status updated to ${status} successfully`);
};
exports.updateAdminUserStatusController = updateAdminUserStatusController;
/**
 * GET /api/v1/admin/roles
 * Fetch all dynamic roles mapping
 */
const getRolesController = async (req, res) => {
    const roles = await (0, admin_service_1.getRoles)();
    (0, response_1.sendSuccess)(res, roles, 'Roles fetched successfully');
};
exports.getRolesController = getRolesController;
/**
 * PATCH /api/v1/admin/roles/:role
 * Update permissions for a given role
 */
const updateRolePermissionsController = async (req, res) => {
    const roleName = req.params['role'];
    const { permissions } = req.body;
    if (!roleName) {
        throw new error_middleware_1.AppError('Role is required', 400);
    }
    if (!Array.isArray(permissions)) {
        throw new error_middleware_1.AppError('Permissions must be an array of strings', 400);
    }
    const updatedRole = await (0, admin_service_1.updateRolePermissions)(roleName, permissions);
    // Clear the permissions cache dynamically to avoid circular dependencies during module init
    const { clearPermissionsCache } = await import('../middleware/rbac.middleware');
    clearPermissionsCache(roleName);
    (0, response_1.sendSuccess)(res, updatedRole, `Role ${roleName} updated successfully`);
};
exports.updateRolePermissionsController = updateRolePermissionsController;
const getUserAcceptancesController = async (req, res) => {
    try {
        const acceptances = await db_1.prisma.consent.findMany({
            where: { status: 'GRANTED' },
            include: {
                user: {
                    select: {
                        phone: true,
                        email: true,
                    },
                },
            },
            orderBy: { grantedAt: 'desc' },
        });
        const formatted = acceptances.map((a) => ({
            id: a.id,
            userName: a.user.phone ?? a.user.email ?? 'N/A',
            documentType: a.consentType,
            acceptedAt: a.grantedAt,
            ip: typeof a.metadata?.ipAddress === 'string' ? a.metadata.ipAddress : null,
        }));
        res.json({ acceptances: formatted });
    }
    catch (_err) {
        res.status(500).json({ error: 'Failed to load acceptances' });
    }
};
exports.getUserAcceptancesController = getUserAcceptancesController;
const getComplianceStatusController = async (_req, res) => {
    try {
        const requiredConsentTypes = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'INFORMED_CONSENT'];
        const [totalUsers, grantedConsents] = await Promise.all([
            db_1.prisma.user.count({ where: { isDeleted: false } }),
            db_1.prisma.consent.findMany({
                where: {
                    status: 'GRANTED',
                    consentType: { in: requiredConsentTypes },
                },
                select: {
                    userId: true,
                    consentType: true,
                },
            }),
        ]);
        const userConsentMap = new Map();
        for (const consent of grantedConsents) {
            if (!userConsentMap.has(consent.userId)) {
                userConsentMap.set(consent.userId, new Set());
            }
            userConsentMap.get(consent.userId)?.add(consent.consentType);
        }
        const acceptedCount = Array.from(userConsentMap.values()).filter((types) => requiredConsentTypes.every((requiredType) => types.has(requiredType))).length;
        const pending = Math.max(totalUsers - acceptedCount, 0);
        const compliancePercentage = totalUsers > 0 ? Math.round((acceptedCount / totalUsers) * 100) : 0;
        const missingByType = requiredConsentTypes
            .map((type) => {
            const withType = new Set(grantedConsents.filter((consent) => consent.consentType === type).map((consent) => consent.userId)).size;
            return { type, missing: Math.max(totalUsers - withType, 0) };
        })
            .filter((entry) => entry.missing > 0)
            .map((entry) => `${entry.type.replace(/_/g, ' ')} missing for ${entry.missing} users`);
        res.json({
            compliance_percentage: compliancePercentage,
            pending,
            critical_gaps: missingByType,
        });
    }
    catch (_err) {
        res.status(500).json({ error: 'Failed to load compliance status' });
    }
};
exports.getComplianceStatusController = getComplianceStatusController;
const getLegalDocumentsController = async (_req, res) => {
    try {
        const consents = await db_1.prisma.consent.findMany({
            where: { status: 'GRANTED' },
            select: {
                consentType: true,
                metadata: true,
            },
        });
        const aggregateByType = new Map();
        for (const consent of consents) {
            const type = consent.consentType;
            const rawVersion = consent.metadata?.version;
            const version = typeof rawVersion === 'number' && rawVersion > 0 ? rawVersion : 1;
            const prev = aggregateByType.get(type) ?? { maxVersion: 1, count: 0 };
            aggregateByType.set(type, {
                maxVersion: Math.max(prev.maxVersion, version),
                count: prev.count + 1,
            });
        }
        const documents = Array.from(aggregateByType.entries()).map(([type, details]) => ({
            id: type,
            title: type.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
            document_type: type.toLowerCase(),
            current_version: details.maxVersion,
            status: details.count > 0 ? 'PUBLISHED' : 'DRAFT',
        }));
        res.json({ documents });
    }
    catch (_err) {
        res.status(500).json({ error: 'Failed to load legal documents' });
    }
};
exports.getLegalDocumentsController = getLegalDocumentsController;
const downloadLegalDocumentController = async (req, res) => {
    try {
        const id = String(req.params?.id || '').trim();
        if (!id) {
            res.status(400).json({ error: 'Document id is required' });
            return;
        }
        const latestConsent = await db_1.prisma.consent.findFirst({
            where: {
                consentType: id,
                status: 'GRANTED',
            },
            orderBy: { grantedAt: 'desc' },
            select: {
                consentType: true,
                metadata: true,
                grantedAt: true,
            },
        });
        if (!latestConsent) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        const version = Number(latestConsent.metadata?.version || 1);
        const readableType = latestConsent.consentType
            .toLowerCase()
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
        const lines = [
            `MANAS360 - ${readableType}`,
            `Version: ${version}`,
            `Effective Date: ${new Date(latestConsent.grantedAt).toISOString()}`,
            '',
            'This legal artifact is generated from accepted consent records.',
            'For canonical legal text, refer to the corresponding legal policy page in MANAS360.',
            '',
            'Core clauses:',
            '1. Platform usage is permitted only for lawful wellness and care purposes.',
            '2. Data processing follows applicable privacy and security laws and standards.',
            '3. Billing, refunds, and cancellations are governed by published policy timelines.',
            '4. Users consent to communication records, transaction records, and compliance auditing.',
            '5. By accepting, users confirm they have read and understood the legal terms.',
            '',
            `Document ID: ${id}`,
        ];
        const fileName = `${latestConsent.consentType.toLowerCase()}-v${version}.txt`;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.status(200).send(lines.join('\n'));
    }
    catch (_err) {
        res.status(500).json({ error: 'Failed to download legal document' });
    }
};
exports.downloadLegalDocumentController = downloadLegalDocumentController;
