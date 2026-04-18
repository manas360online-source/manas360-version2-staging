import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { listUsers, getUserById, verifyTherapist, verifyProvider, approveProvider, getMetrics, listSubscriptions, getUserApprovals, updateUserApprovalStatus, listLiveSessions, getFeedback, resolveFeedback, updateUserStatus, updateUsersBulkStatus, getRoles, updateRolePermissions, getPlatformAdminRoleInventory, createPlatformAdminAccount, searchAdminEntities, getEffectiveAdminPolicies } from '../services/admin.service';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { REQUIRED_LEGAL_TYPES, ensureCanonicalLegalDocuments } from '../services/legal-compliance.service';
import { addCredit } from '../services/wallet.service';

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
		sortBy: query.sortBy as 'createdAt' | 'email' | 'role' | undefined,
		sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
	});

	sendSuccess(res, result, 'Users fetched successfully');
};

export const getUserController = async (req: Request, res: Response): Promise<void> => {
	const userId = req.validatedUserId;

	if (!userId) {
		throw new AppError('User ID is required', 400);
	}

	const user = await getUserById(userId);

	sendSuccess(res, user, 'User fetched successfully');
};

export const getPlatformAdminRoleInventoryController = async (_req: Request, res: Response): Promise<void> => {
	const items = await getPlatformAdminRoleInventory();
	sendSuccess(res, { items }, 'Platform admin RBAC inventory fetched successfully');
};

export const createPlatformAdminAccountController = async (req: Request, res: Response): Promise<void> => {
	const adminUserId = req.auth?.userId;
	if (!adminUserId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await createPlatformAdminAccount(adminUserId, {
		email: String(req.body?.email || '').trim(),
		role: String(req.body?.role || '').trim(),
		firstName: typeof req.body?.firstName === 'string' ? req.body.firstName : undefined,
		lastName: typeof req.body?.lastName === 'string' ? req.body.lastName : undefined,
		password: typeof req.body?.password === 'string' ? req.body.password : undefined,
		name: typeof req.body?.name === 'string' ? req.body.name : undefined,
	});

	sendSuccess(res, result, 'Platform admin account created successfully', 201);
};

export const getEffectiveAdminPoliciesController = async (req: Request, res: Response): Promise<void> => {
	const userId = req.auth?.userId;
	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await getEffectiveAdminPolicies(userId);
	sendSuccess(res, result, 'Effective admin policies fetched successfully');
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
	const { status, reason } = req.body;

	if (!userId) {
		throw new AppError('User ID is required', 400);
	}

	if (!status) {
		throw new AppError('Status is required', 400);
	}

	await updateUserStatus(userId, status, reason);

	sendSuccess(res, null, `User status updated to ${status} successfully`);
};

export const updateAdminUsersBulkStatusController = async (req: Request, res: Response): Promise<void> => {
	const { userIds, status, reason } = req.body as {
		userIds?: string[];
		status?: string;
		reason?: string;
	};
	const adminUserId = req.auth?.userId;

	if (!Array.isArray(userIds) || userIds.length === 0) {
		throw new AppError('userIds must be a non-empty array', 400);
	}

	if (!status) {
		throw new AppError('status is required', 400);
	}

	if (!adminUserId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await updateUsersBulkStatus(userIds, status, adminUserId, req.auth?.role, reason);
	sendSuccess(
		res,
		result,
		`Bulk update complete: ${result.successCount} succeeded, ${result.failedCount} failed`,
	);
};

export const searchAdminEntitiesController = async (req: Request, res: Response): Promise<void> => {
	const q = String(req.query.q || '').trim();
	const limit = Number(req.query.limit || 8);
	const result = await searchAdminEntities(q, limit);
	sendSuccess(res, result, 'Search results fetched successfully');
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
		let formatted: Array<{ id: string; userName: string; documentType: string; acceptedAt: Date; ip: string | null }> = [];
		try {
			const acceptances = await prisma.userAcceptance.findMany({
				include: {
					user: {
						select: {
							phone: true,
							email: true,
						},
					},
					document: {
						select: { type: true },
					},
				},
				orderBy: { acceptedAt: 'desc' },
			});

			formatted = acceptances.map((a: any) => ({
				id: a.id,
				userName: a.user.phone ?? a.user.email ?? 'N/A',
				documentType: a.document.type,
				acceptedAt: a.acceptedAt,
				ip: typeof a.ipAddress === 'string' ? a.ipAddress : null,
			}));
		} catch {
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

			formatted = acceptances.map((a) => ({
				id: a.id,
				userName: a.user.phone ?? a.user.email ?? 'N/A',
				documentType: a.consentType,
				acceptedAt: a.grantedAt,
				ip: typeof (a.metadata as any)?.ipAddress === 'string' ? (a.metadata as any).ipAddress : null,
			}));
		}

		res.json({ acceptances: formatted });
	} catch (_err) {
		res.status(500).json({ error: 'Failed to load acceptances' });
	}
};

export const getComplianceStatusController = async (_req: Request, res: Response): Promise<void> => {
	try {
		await ensureCanonicalLegalDocuments();

		const [totalUsers, activeDocs] = await Promise.all([
			prisma.user.count({ where: { isDeleted: false } }),
			prisma.legalDocument.findMany({
				where: {
					isActive: true,
					type: { in: [...REQUIRED_LEGAL_TYPES] },
				},
				select: { id: true, type: true, version: true },
			}),
		]);

		const acceptances = await prisma.userAcceptance.findMany({
			where: { documentId: { in: activeDocs.map((doc: any) => doc.id) } },
			select: {
				userId: true,
				documentVer: true,
				document: { select: { type: true, version: true } },
			},
		});

		const userConsentMap = new Map<string, Map<string, number>>();
		for (const acceptance of acceptances) {
			if (!userConsentMap.has(acceptance.userId)) {
				userConsentMap.set(acceptance.userId, new Map<string, number>());
			}
			const current = userConsentMap.get(acceptance.userId)?.get(acceptance.document.type) || 0;
			userConsentMap.get(acceptance.userId)?.set(
				acceptance.document.type,
				Math.max(current, Number(acceptance.documentVer || 0)),
			);
		}

		const requiredByType = new Map<string, number>(activeDocs.map((doc: any) => [String(doc.type), Number(doc.version)]));

		const acceptedCount = Array.from(userConsentMap.values()).filter((acceptedVersions) =>
			Array.from(requiredByType.entries()).every(([requiredType, requiredVersion]) =>
				(acceptedVersions.get(requiredType) || 0) >= requiredVersion,
			),
		).length;
		const pending = Math.max(totalUsers - acceptedCount, 0);
		const compliancePercentage = totalUsers > 0 ? Math.round((acceptedCount / totalUsers) * 100) : 0;

		const missingByType = Array.from(requiredByType.entries())
			.map(([type, version]) => {
				let withType = 0;
				for (const accepted of userConsentMap.values()) {
					if ((accepted.get(type) || 0) >= version) withType += 1;
				}
				return { type, version, missing: Math.max(totalUsers - withType, 0) };
			})
			.filter((entry) => entry.missing > 0)
			.map((entry) => `${entry.type.replace(/_/g, ' ')} v${entry.version} missing for ${entry.missing} users`);

		res.json({
			compliance_percentage: compliancePercentage,
			pending,
			critical_gaps: missingByType,
		});
	} catch {
		res.status(500).json({ error: 'Failed to load compliance status' });
	}
};

export const getLegalDocumentsController = async (_req: Request, res: Response): Promise<void> => {
	try {
		await ensureCanonicalLegalDocuments();
		const documents = await prisma.legalDocument.findMany({
			orderBy: [{ type: 'asc' }, { version: 'desc' }],
			select: {
				id: true,
				type: true,
				version: true,
				title: true,
				isActive: true,
				publishedAt: true,
			},
		});

		res.json({
			documents: documents.map((doc: any) => ({
				id: doc.id,
				title: doc.title,
				document_type: String(doc.type).toLowerCase(),
				current_version: doc.version,
				status: doc.isActive ? 'PUBLISHED' : 'ARCHIVED',
				published_at: doc.publishedAt,
			})),
		});
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

		const legalDoc = await prisma.legalDocument.findUnique({
			where: { id },
			select: {
				id: true,
				type: true,
				version: true,
				title: true,
				content: true,
				publishedAt: true,
			},
		});

		if (!legalDoc) {
			res.status(404).json({ error: 'Document not found' });
			return;
		}

		const lines = [
			`MANAS360 - ${legalDoc.title}`,
			`Type: ${String(legalDoc.type)}`,
			`Version: ${Number(legalDoc.version)}`,
			`Effective Date: ${new Date(legalDoc.publishedAt).toISOString()}`,
			'',
			'Canonical legal document content',
			'',
			legalDoc.content,
			'',
			`Document ID: ${legalDoc.id}`,
		];

		const fileName = `${String(legalDoc.type).toLowerCase()}-v${Number(legalDoc.version)}.txt`;
		res.setHeader('Content-Type', 'text/plain; charset=utf-8');
		res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
		res.status(200).send(lines.join('\n'));
	} catch (_err) {
		res.status(500).json({ error: 'Failed to download legal document' });
	}
};

/**
 * POST /api/v1/admin/wallet/credit
 * Manually credit a user's wallet
 * Admin role required
 */
export const creditUserWalletController = async (req: Request, res: Response): Promise<void> => {
	const { userId, amount, reason, expiresInDays } = req.body;

	if (!userId) {
		throw new AppError('User ID is required', 400);
	}

	if (!amount || Number(amount) <= 0) {
		throw new AppError('A positive amount is required', 400);
	}

	const result = await addCredit({
		userId,
		amount: Number(amount),
		source: 'ADMIN_ADJUSTMENT',
		sourceId: reason || 'Manual Admin Adjustment',
		expiresInDays: expiresInDays ? Number(expiresInDays) : 365, // Default to 1 year for admin adjustments
	});

	sendSuccess(res, result, 'Wallet credited successfully');
};
