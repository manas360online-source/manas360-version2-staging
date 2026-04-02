import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { listUsers, getUserById, verifyTherapist, verifyProvider, approveProvider, getMetrics, listSubscriptions, getUserApprovals, updateUserApprovalStatus, listLiveSessions, getFeedback, resolveFeedback, updateUserStatus, getRoles, updateRolePermissions } from '../services/admin.service';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';

/**
 * GET /api/v1/admin/users
 * List all users with pagination and filters
 * Admin role required
 */
export const listUsersController = async (req: Request, res: Response): Promise<void> => {
	const query = req.validatedAdminListUsersQuery;

	if (!query) {
		throw new AppError('Invalid query parameters', 400);
	}

	const result = await listUsers(query.page, query.limit, {
		role: query.role,
		status: query.status,
	});

	sendSuccess(res, result, 'Users fetched successfully');
};

/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Admin role required
 */
export const getUserController = async (req: Request, res: Response): Promise<void> => {
	const userId = req.validatedUserId;

	if (!userId) {
		throw new AppError('User ID is required', 400);
	}

	const user = await getUserById(userId);

	sendSuccess(res, user, 'User fetched successfully');
};

/**
 * PATCH /api/v1/admin/therapists/:id/verify
 * Verify therapist credentials
 * Admin role required
 * Sets isVerified = true and records verification timestamp
 */
export const verifyTherapistController = async (req: Request, res: Response): Promise<void> => {
	const therapistProfileId = req.validatedTherapistProfileId;
	const adminUserId = req.auth?.userId;

	if (!therapistProfileId) {
		throw new AppError('Therapist profile ID is required', 400);
	}

	if (!adminUserId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await verifyTherapist(therapistProfileId, adminUserId);

	sendSuccess(res, result, 'Therapist verified successfully');
};

export const verifyProviderController = async (req: Request, res: Response): Promise<void> => {
	const providerUserId = req.validatedTherapistProfileId;
	const adminUserId = req.auth?.userId;

	if (!providerUserId) {
		throw new AppError('Provider ID is required', 400);
	}

	if (!adminUserId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await verifyProvider(providerUserId, adminUserId);

	sendSuccess(res, result, 'Provider verified successfully');
};

export const approveProviderController = async (req: Request, res: Response): Promise<void> => {
	const providerUserId = req.params['id'] as string;
	const adminUserId = req.auth?.userId;

	if (!providerUserId) {
		throw new AppError('Provider ID is required', 400);
	}

	if (!adminUserId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await approveProvider(providerUserId, adminUserId);

	sendSuccess(res, result, 'Provider approved successfully');
};

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
export const getMetricsController = async (req: Request, res: Response): Promise<void> => {
	const metrics = await getMetrics();

	sendSuccess(res, metrics, 'Platform metrics retrieved successfully');
};

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
export const listSubscriptionsController = async (req: Request, res: Response): Promise<void> => {
	const query = req.validatedAdminListSubscriptionsQuery;

	if (!query) {
		throw new AppError('Invalid query parameters', 400);
	}

	const result = await listSubscriptions(query.page, query.limit, {
		planType: query.planType,
		status: query.status,
	});

	sendSuccess(res, result, 'Subscriptions fetched successfully');
};

/**
 * GET /api/v1/admin/user-approvals
 * Get all users pending onboarding approval
 */
export const getAdminUserApprovalsController = async (req: Request, res: Response): Promise<void> => {
	const users = await getUserApprovals();
	sendSuccess(res, { users }, 'Pending approvals fetched successfully');
};

/**
 * PATCH /api/v1/admin/user-approvals/:id
 * Approve or Reject a user's registration
 */
export const updateAdminUserApprovalController = async (req: Request, res: Response): Promise<void> => {
	const userId = req.params['id'] as string;
	const { action, reason } = req.body;

	if (!userId) {
		throw new AppError('User ID is required', 400);
	}

	if (!['approve', 'reject'].includes(action)) {
		throw new AppError('Invalid action. Must be "approve" or "reject"', 400);
	}

	await updateUserApprovalStatus(userId, action, reason);

	sendSuccess(res, null, `User ${action}ed successfully`);
};

/**
 * GET /api/v1/admin/live-sessions
 * Get currently active sessions (Live Monitor)
 */
export const getAdminLiveSessionsController = async (req: Request, res: Response): Promise<void> => {
	const sessions = await listLiveSessions();
	sendSuccess(res, { sessions }, 'Live sessions fetched successfully');
};

/**
 * GET /api/v1/admin/feedback
 * List all user feedback
 */
export const getAdminFeedbackController = async (req: Request, res: Response): Promise<void> => {
	const feedback = await getFeedback();
	sendSuccess(res, { feedback }, 'User feedback fetched successfully');
};

/**
 * POST /api/v1/admin/feedback/:id/resolve
 * Mark a feedback item as resolved
 */
export const resolveAdminFeedbackController = async (req: Request, res: Response): Promise<void> => {
	const feedbackId = req.params['id'] as string;

	if (!feedbackId) {
		throw new AppError('Feedback ID is required', 400);
	}

	await resolveFeedback(feedbackId);

	sendSuccess(res, null, 'Feedback marked as resolved');
};

/**
 * PATCH /api/v1/admin/users/:id/status
 * Update a user's status (Active/Suspended/etc)
 */
export const updateAdminUserStatusController = async (req: Request, res: Response): Promise<void> => {
	const userId = req.params['id'] as string;
	const { status } = req.body;

	if (!userId) {
		throw new AppError('User ID is required', 400);
	}

	if (!status) {
		throw new AppError('Status is required', 400);
	}

	await updateUserStatus(userId, status);

	sendSuccess(res, null, `User status updated to ${status} successfully`);
};

/**
 * GET /api/v1/admin/roles
 * Fetch all dynamic roles mapping
 */
export const getRolesController = async (req: Request, res: Response): Promise<void> => {
	const roles = await getRoles();
	sendSuccess(res, roles, 'Roles fetched successfully');
};

/**
 * PATCH /api/v1/admin/roles/:role
 * Update permissions for a given role
 */
export const updateRolePermissionsController = async (req: Request, res: Response): Promise<void> => {
	const roleName = req.params['role'] as string;
	const { permissions } = req.body;

	if (!roleName) {
		throw new AppError('Role is required', 400);
	}

	if (!Array.isArray(permissions)) {
		throw new AppError('Permissions must be an array of strings', 400);
	}

	const updatedRole = await updateRolePermissions(roleName, permissions);

	// Clear the permissions cache dynamically to avoid circular dependencies during module init
	const { clearPermissionsCache } = await import('../middleware/rbac.middleware');
	clearPermissionsCache(roleName as any);

	sendSuccess(res, updatedRole, `Role ${roleName} updated successfully`);
};

export const getUserAcceptancesController = async (req: Request, res: Response): Promise<void> => {
	try {
		const acceptances = await prisma.consent.findMany({
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
			ip: typeof (a.metadata as any)?.ipAddress === 'string' ? (a.metadata as any).ipAddress : null,
		}));

		res.json({ acceptances: formatted });
	} catch (_err) {
		res.status(500).json({ error: 'Failed to load acceptances' });
	}
};

export const getComplianceStatusController = async (_req: Request, res: Response): Promise<void> => {
	try {
		const requiredConsentTypes = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'INFORMED_CONSENT'];

		const [totalUsers, grantedConsents] = await Promise.all([
			prisma.user.count({ where: { isDeleted: false } }),
			prisma.consent.findMany({
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

		const userConsentMap = new Map<string, Set<string>>();
		for (const consent of grantedConsents) {
			if (!userConsentMap.has(consent.userId)) {
				userConsentMap.set(consent.userId, new Set<string>());
			}
			userConsentMap.get(consent.userId)?.add(consent.consentType);
		}

		const acceptedCount = Array.from(userConsentMap.values()).filter((types) =>
			requiredConsentTypes.every((requiredType) => types.has(requiredType)),
		).length;
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
	} catch (_err) {
		res.status(500).json({ error: 'Failed to load compliance status' });
	}
};

export const getLegalDocumentsController = async (_req: Request, res: Response): Promise<void> => {
	try {
		const consents = await prisma.consent.findMany({
			where: { status: 'GRANTED' },
			select: {
				consentType: true,
				metadata: true,
			},
		});

		const aggregateByType = new Map<string, { maxVersion: number; count: number }>();
		for (const consent of consents) {
			const type = consent.consentType;
			const rawVersion = (consent.metadata as any)?.version;
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
	} catch (_err) {
		res.status(500).json({ error: 'Failed to load legal documents' });
	}
};

export const downloadLegalDocumentController = async (req: Request, res: Response): Promise<void> => {
	try {
		const id = String(req.params?.id || '').trim();
		if (!id) {
			res.status(400).json({ error: 'Document id is required' });
			return;
		}

		const latestConsent = await prisma.consent.findFirst({
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

		const version = Number((latestConsent.metadata as any)?.version || 1);
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
	} catch (_err) {
		res.status(500).json({ error: 'Failed to download legal document' });
	}
};
