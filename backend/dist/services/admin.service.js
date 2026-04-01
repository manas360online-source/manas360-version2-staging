"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRolePermissions = exports.getRoles = exports.updateUserStatus = exports.resolveFeedback = exports.getFeedback = exports.listLiveSessions = exports.updateUserApprovalStatus = exports.getUserApprovals = exports.listSubscriptions = exports.getMetrics = exports.approveProvider = exports.verifyProvider = exports.verifyTherapist = exports.getUserById = exports.listUsers = void 0;
const db_1 = require("../config/db");
const error_middleware_1 = require("../middleware/error.middleware");
const pagination_1 = require("../utils/pagination");
const db = db_1.prisma;
const mapRoleFilterToEnum = (role) => {
    if (!role)
        return undefined;
    const normalized = role.toLowerCase();
    if (normalized === 'patient')
        return 'PATIENT';
    if (normalized === 'therapist')
        return 'THERAPIST';
    if (normalized === 'psychiatrist')
        return 'PSYCHIATRIST';
    if (normalized === 'coach')
        return 'COACH';
    if (normalized === 'admin')
        return 'ADMIN';
    if (normalized === 'complianceofficer')
        return 'COMPLIANCE_OFFICER';
    throw new error_middleware_1.AppError('Invalid role filter', 400);
};
const mapPlanTypeToEnum = (planType) => {
    if (!planType)
        return undefined;
    const normalized = planType.toLowerCase();
    if (normalized === 'basic')
        return 'BASIC';
    if (normalized === 'premium')
        return 'PREMIUM';
    if (normalized === 'pro')
        return 'LEAD_PLAN';
    throw new error_middleware_1.AppError('Invalid plan type', 400);
};
const mapSubscriptionStatusToEnum = (status) => {
    if (!status)
        return undefined;
    const normalized = status.toLowerCase();
    if (normalized === 'active')
        return 'ACTIVE';
    if (normalized === 'expired')
        return 'EXPIRED';
    if (normalized === 'cancelled')
        return 'CANCELLED';
    if (normalized === 'paused')
        return 'PAST_DUE';
    throw new error_middleware_1.AppError('Invalid subscription status', 400);
};
/**
 * List users with pagination and filtering
 *
 * Query filters:
 * - role: 'patient' | 'therapist' | 'psychiatrist' | 'coach' | 'admin' | 'complianceofficer' (optional)
 * - status: 'active' | 'deleted' (optional)
 * - page: pagination page (default: 1)
 * - limit: items per page (default: 10, max: 50)
 *
 * Returns paginated list with metadata
 */
const listUsers = async (page, limit, { role, status, } = {}) => {
    if (status && !['active', 'deleted'].includes(status.toLowerCase())) {
        throw new error_middleware_1.AppError('Invalid status filter', 400);
    }
    if (status?.toLowerCase() === 'deleted') {
        const normalized = (0, pagination_1.normalizePagination)({ page, limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
        return {
            data: [],
            meta: (0, pagination_1.buildPaginationMeta)(0, normalized),
        };
    }
    const roleFilter = mapRoleFilterToEnum(role);
    const normalized = (0, pagination_1.normalizePagination)({ page, limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    const [users, totalItems] = await Promise.all([
        db.user.findMany({
            where: roleFilter ? { role: roleFilter } : undefined,
            orderBy: { createdAt: 'desc' },
            skip: normalized.skip,
            take: normalized.limit,
            select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                isTherapistVerified: true,
                therapistVerifiedAt: true,
                createdAt: true,
                updatedAt: true,
            },
        }),
        db.user.count({ where: roleFilter ? { role: roleFilter } : undefined }),
    ]);
    return {
        data: users.map((user) => ({
            id: user.id,
            email: user.email,
            phone: user.phone || 'N/A',
            firstName: user.firstName,
            lastName: user.lastName,
            role: String(user.role).toLowerCase(),
            status: String(user.status).toLowerCase(),
            isTherapistVerified: Boolean(user.isTherapistVerified),
            therapistVerifiedAt: user.therapistVerifiedAt ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        })),
        meta: (0, pagination_1.buildPaginationMeta)(totalItems, normalized),
    };
};
exports.listUsers = listUsers;
/**
 * Get a single user by ID
 *
 * Returns full user profile with sensitive fields excluded
 * Throws 404 if user not found
 */
const getUserById = async (userId) => {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isTherapistVerified: true,
            therapistVerifiedAt: true,
            therapistVerifiedByUserId: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    return {
        ...user,
        isTherapistVerified: Boolean(user.isTherapistVerified),
        therapistVerifiedAt: user.therapistVerifiedAt ?? null,
        therapistVerifiedByUserId: user.therapistVerifiedByUserId ?? null,
        role: String(user.role).toLowerCase(),
    };
};
exports.getUserById = getUserById;
/**
 * Verify therapist credentials
 *
 * Sets isVerified = true and records verification timestamp + admin user ID
 * Prevents re-verification with 409 Conflict
 * Returns updated therapist profile summary
 */
const verifyTherapist = async (therapistProfileId, adminUserId) => {
    const admin = await db.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
    if (!admin || admin.role !== 'ADMIN') {
        throw new error_middleware_1.AppError('Admin user not found', 404);
    }
    const therapistUser = await db.user.findUnique({
        where: { id: therapistProfileId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            updatedAt: true,
            isTherapistVerified: true,
            therapistVerifiedAt: true,
            therapistVerifiedByUserId: true,
        },
    });
    if (!therapistUser || therapistUser.role !== 'THERAPIST') {
        throw new error_middleware_1.AppError('Therapist profile not found', 404);
    }
    if (therapistUser.isTherapistVerified) {
        return {
            _id: therapistUser.id,
            displayName: `${therapistUser.firstName ?? ''} ${therapistUser.lastName ?? ''}`.trim() || 'Therapist',
            isVerified: true,
            verifiedAt: therapistUser.therapistVerifiedAt ?? null,
            verifiedBy: therapistUser.therapistVerifiedByUserId ?? null,
            updatedAt: therapistUser.updatedAt,
        };
    }
    const updated = await db.user.update({
        where: { id: therapistUser.id },
        data: {
            isTherapistVerified: true,
            therapistVerifiedAt: new Date(),
            therapistVerifiedByUserId: adminUserId,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            isTherapistVerified: true,
            therapistVerifiedAt: true,
            therapistVerifiedByUserId: true,
            updatedAt: true,
        },
    });
    return {
        _id: updated.id,
        displayName: `${updated.firstName ?? ''} ${updated.lastName ?? ''}`.trim() || 'Therapist',
        isVerified: Boolean(updated.isTherapistVerified),
        verifiedAt: updated.therapistVerifiedAt ?? null,
        verifiedBy: updated.therapistVerifiedByUserId ?? null,
        updatedAt: updated.updatedAt,
    };
};
exports.verifyTherapist = verifyTherapist;
const verifyProvider = async (providerUserId, adminUserId) => {
    const admin = await db.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
    if (!admin || admin.role !== 'ADMIN') {
        throw new error_middleware_1.AppError('Admin user not found', 404);
    }
    return db.$transaction(async (tx) => {
        const providerUser = await tx.user.findUnique({
            where: { id: providerUserId },
            select: { id: true, role: true },
        });
        if (!providerUser) {
            throw new error_middleware_1.AppError('Provider not found', 404);
        }
        const role = String(providerUser.role || '').toUpperCase();
        if (!['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH'].includes(role)) {
            throw new error_middleware_1.AppError('Provider not found', 404);
        }
        const profile = await tx.therapistProfile.findUnique({
            where: { userId: providerUser.id },
            select: { id: true, isVerified: true, verifiedAt: true, verifiedByUserId: true, updatedAt: true },
        });
        if (!profile) {
            throw new error_middleware_1.AppError('Provider profile not found', 404);
        }
        if (profile.isVerified) {
            return {
                _id: providerUser.id,
                isVerified: true,
                verifiedAt: profile.verifiedAt ?? null,
                verifiedBy: profile.verifiedByUserId ?? null,
                updatedAt: profile.updatedAt,
            };
        }
        const now = new Date();
        const updatedProfile = await tx.therapistProfile.update({
            where: { userId: providerUser.id },
            data: {
                isVerified: true,
                verifiedAt: now,
                verifiedByUserId: adminUserId,
            },
            select: { isVerified: true, verifiedAt: true, verifiedByUserId: true, updatedAt: true },
        });
        await tx.user.update({
            where: { id: providerUser.id },
            data: {
                isTherapistVerified: true,
                therapistVerifiedAt: now,
                therapistVerifiedByUserId: adminUserId,
            },
        });
        return {
            _id: providerUser.id,
            isVerified: Boolean(updatedProfile.isVerified),
            verifiedAt: updatedProfile.verifiedAt ?? null,
            verifiedBy: updatedProfile.verifiedByUserId ?? null,
            updatedAt: updatedProfile.updatedAt,
        };
    });
};
exports.verifyProvider = verifyProvider;
/**
 * Approve provider onboarding
 *
 * Sets TherapistProfile.isVerified = true, User.isTherapistVerified = true,
 * and User.onboardingStatus = 'COMPLETED'.
 * Idempotent — returns current state if already approved.
 */
const approveProvider = async (providerUserId, adminUserId) => {
    const admin = await db.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
    if (!admin || admin.role !== 'ADMIN') {
        throw new error_middleware_1.AppError('Admin user not found', 404);
    }
    return db.$transaction(async (tx) => {
        const providerUser = await tx.user.findUnique({
            where: { id: providerUserId },
            select: { id: true, role: true, onboardingStatus: true },
        });
        if (!providerUser) {
            throw new error_middleware_1.AppError('Provider not found', 404);
        }
        const role = String(providerUser.role || '').toUpperCase();
        if (!['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH'].includes(role)) {
            throw new error_middleware_1.AppError('Provider not found', 404);
        }
        const profile = await tx.therapistProfile.findUnique({
            where: { userId: providerUser.id },
            select: { id: true, isVerified: true, verifiedAt: true, verifiedByUserId: true, updatedAt: true },
        });
        if (!profile) {
            throw new error_middleware_1.AppError('Provider profile not found. Provider must submit onboarding first.', 404);
        }
        const alreadyCompleted = profile.isVerified && String(providerUser.onboardingStatus || '').toUpperCase() === 'COMPLETED';
        if (alreadyCompleted) {
            return {
                _id: providerUser.id,
                isVerified: true,
                onboardingStatus: 'COMPLETED',
                verifiedAt: profile.verifiedAt ?? null,
                verifiedBy: profile.verifiedByUserId ?? null,
                updatedAt: profile.updatedAt,
            };
        }
        const now = new Date();
        const updatedProfile = await tx.therapistProfile.update({
            where: { userId: providerUser.id },
            data: {
                isVerified: true,
                verifiedAt: now,
                verifiedByUserId: adminUserId,
            },
            select: { isVerified: true, verifiedAt: true, verifiedByUserId: true, updatedAt: true },
        });
        await tx.user.update({
            where: { id: providerUser.id },
            data: {
                isTherapistVerified: true,
                therapistVerifiedAt: now,
                therapistVerifiedByUserId: adminUserId,
                onboardingStatus: 'COMPLETED',
            },
        });
        return {
            _id: providerUser.id,
            isVerified: Boolean(updatedProfile.isVerified),
            onboardingStatus: 'COMPLETED',
            verifiedAt: updatedProfile.verifiedAt ?? null,
            verifiedBy: updatedProfile.verifiedByUserId ?? null,
            updatedAt: updatedProfile.updatedAt,
        };
    });
};
exports.approveProvider = approveProvider;
/**
 * Get admin metrics from PostgreSQL via Prisma queries.
 */
const getMetrics = async () => {
    const [totalUsersResult, totalTherapistsResult, verifiedTherapistsResult, completedSessionsResult, revenueAgg, activeSubscriptionsResult,] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { role: 'THERAPIST' } }),
        db.user.count({ where: { role: 'THERAPIST', isTherapistVerified: true } }),
        db.therapySession.count({ where: { status: 'COMPLETED' } }),
        db.revenueLedger.aggregate({ _sum: { grossAmountMinor: true } }),
        db.marketplaceSubscription.count({ where: { status: 'ACTIVE' } }),
    ]);
    const grossMinor = BigInt(revenueAgg?._sum?.grossAmountMinor ?? 0);
    const totalRevenue = Number(grossMinor) / 100;
    return {
        totalUsers: totalUsersResult,
        totalTherapists: totalTherapistsResult,
        verifiedTherapists: verifiedTherapistsResult,
        completedSessions: completedSessionsResult,
        totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
        activeSubscriptions: activeSubscriptionsResult,
    };
};
exports.getMetrics = getMetrics;
const listSubscriptions = async (page, limit, { planType, status, } = {}) => {
    const mappedPlan = mapPlanTypeToEnum(planType);
    const mappedStatus = mapSubscriptionStatusToEnum(status) ?? 'ACTIVE';
    const normalized = (0, pagination_1.normalizePagination)({ page, limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    const [subscriptions, totalItems] = await Promise.all([
        db.marketplaceSubscription.findMany({
            where: {
                status: mappedStatus,
                ...(mappedPlan ? { plan: mappedPlan } : {}),
            },
            orderBy: { createdAt: 'desc' },
            skip: normalized.skip,
            take: normalized.limit,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                invoices: true,
            },
        }),
        db.marketplaceSubscription.count({
            where: {
                status: mappedStatus,
                ...(mappedPlan ? { plan: mappedPlan } : {}),
            },
        }),
    ]);
    const data = subscriptions.map((sub) => {
        const latestInvoice = (sub.invoices ?? [])
            .sort((a, b) => new Date(b.billedAt).getTime() - new Date(a.billedAt).getTime())[0];
        return {
            _id: sub.id,
            user: {
                id: sub.user.id,
                name: `${sub.user.firstName ?? ''} ${sub.user.lastName ?? ''}`.trim() || null,
                email: sub.user.email,
                phone: null,
            },
            plan: {
                type: String(sub.plan).toLowerCase(),
                name: String(sub.plan),
            },
            status: String(sub.status).toLowerCase(),
            startDate: sub.currentPeriodStart ?? sub.createdAt,
            expiryDate: sub.currentPeriodEnd ?? sub.createdAt,
            price: latestInvoice ? Number(latestInvoice.amountMinor) / 100 : 0,
            currency: latestInvoice?.currency ?? 'INR',
            billingCycle: 'monthly',
            autoRenew: String(sub.status) !== 'CANCELLED',
            createdAt: sub.createdAt,
        };
    });
    return {
        data,
        meta: (0, pagination_1.buildPaginationMeta)(totalItems, normalized),
    };
};
exports.listSubscriptions = listSubscriptions;
/**
 * Get all users pending onboarding approval
 */
const getUserApprovals = async () => {
    const users = await db.user.findMany({
        where: {
            onboardingStatus: 'PENDING',
            isDeleted: false,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            therapistProfile: {
                select: { id: true }
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    if (users.length === 0)
        return [];
    const userIds = users.map(u => u.id);
    const docs = await db.providerDocument.findMany({
        where: { userId: { in: userIds } }
    });
    return users.map((u) => {
        const userDocs = docs.filter(d => d.userId === u.id);
        const documentUrl = userDocs.length > 0 ? userDocs[0].url : null;
        return {
            id: u.id,
            fullName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || 'New User',
            email: u.email,
            phone: u.phone,
            role: String(u.role).toLowerCase(),
            status: 'pending',
            registeredAt: u.createdAt,
            documentUrl: documentUrl,
        };
    });
};
exports.getUserApprovals = getUserApprovals;
/**
 * Approve or Reject a user's registration
 */
const updateUserApprovalStatus = async (userId, action, reason) => {
    const status = action === 'approve' ? 'COMPLETED' : 'REJECTED';
    await db.user.update({
        where: { id: userId },
        data: {
            onboardingStatus: status,
            ...(action === 'approve' ? { isTherapistVerified: true, therapistVerifiedAt: new Date() } : {}),
        },
    });
    // Implementation note: In a real system, we would also send an email/notification here
    // and potentially log the rejection reason.
};
exports.updateUserApprovalStatus = updateUserApprovalStatus;
/**
 * List currently active sessions (Live Monitor)
 */
const listLiveSessions = async () => {
    // Find session IDs with at least one ONLINE participant
    const activePresences = await db_1.prisma.sessionPresence.findMany({
        where: { status: 'ONLINE' },
        select: { sessionId: true },
        distinct: ['sessionId'],
    });
    if (activePresences.length === 0)
        return [];
    const activeSessionIds = activePresences.map((p) => p.sessionId);
    const sessions = await db.therapySession.findMany({
        where: {
            id: { in: activeSessionIds },
            status: 'CONFIRMED',
        },
        include: {
            patientProfile: {
                include: {
                    user: {
                        select: { firstName: true, lastName: true },
                    },
                },
            },
            therapistProfile: {
                select: { firstName: true, lastName: true },
            },
        },
    });
    return sessions.map((s) => ({
        id: s.id,
        therapistName: `${s.therapistProfile?.firstName ?? ''} ${s.therapistProfile?.lastName ?? ''}`.trim() || 'Therapist',
        patientName: `${s.patientProfile?.user?.firstName ?? ''} ${s.patientProfile?.user?.lastName ?? ''}`.trim() || 'Patient',
        startTime: s.dateTime.toISOString(),
        status: 'in-progress', // Since they have active presence
    }));
};
exports.listLiveSessions = listLiveSessions;
/**
 * List all user feedback
 */
const getFeedback = async () => {
    try {
        if (!db.userFeedback)
            return [];
        const feedback = await db.userFeedback.findMany({
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!feedback)
            return [];
        return feedback.map((f) => ({
            id: f.id,
            userName: `${f.user?.firstName ?? ''} ${f.user?.lastName ?? ''}`.trim() || 'Anonymous',
            rating: f.rating,
            comment: f.comment,
            sentiment: f.sentiment.toLowerCase(),
            createdAt: f.createdAt.toISOString(),
            resolved: f.resolved,
        }));
    }
    catch (err) {
        // UserFeedback model may not exist yet or table is missing – return empty list
        return [];
    }
};
exports.getFeedback = getFeedback;
/**
 * Mark feedback as resolved
 */
const resolveFeedback = async (feedbackId) => {
    const feedback = await db.userFeedback.findUnique({ where: { id: feedbackId } });
    if (!feedback) {
        throw new error_middleware_1.AppError('Feedback not found', 404);
    }
    await db.userFeedback.update({
        where: { id: feedbackId },
        data: { resolved: true },
    });
};
exports.resolveFeedback = resolveFeedback;
/**
 * Update user status (Active/Suspended/etc)
 */
const updateUserStatus = async (userId, status) => {
    const normalizedStatus = status.toUpperCase();
    if (!['ACTIVE', 'SUSPENDED', 'DISABLED'].includes(normalizedStatus)) {
        throw new error_middleware_1.AppError('Invalid status. Must be ACTIVE, SUSPENDED, or DISABLED', 400);
    }
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    await db.user.update({
        where: { id: userId },
        data: { status: normalizedStatus },
    });
};
exports.updateUserStatus = updateUserStatus;
/**
 * Get all roles and permissions
 */
const getRoles = async () => {
    return await db.role.findMany({
        orderBy: { name: 'asc' },
    });
};
exports.getRoles = getRoles;
/**
 * Update permissions for a specific role
 */
const updateRolePermissions = async (roleName, permissions) => {
    const role = await db.role.update({
        where: { name: roleName },
        data: { permissions },
    });
    return role;
};
exports.updateRolePermissions = updateRolePermissions;
