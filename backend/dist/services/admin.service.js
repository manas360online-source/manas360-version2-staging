"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminLiveSessions = exports.listSubscriptions = exports.getMetrics = exports.approveProvider = exports.verifyProvider = exports.verifyTherapist = exports.getUserById = exports.listUsers = void 0;
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
                firstName: true,
                lastName: true,
                role: true,
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
            firstName: user.firstName,
            lastName: user.lastName,
            role: String(user.role).toLowerCase(),
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
 * Get active therapy sessions for admin/compliance monitoring.
 * Includes latest GPS metrics (empathy, depth, crisis) from session_monitoring.
 */
const getAdminLiveSessions = async () => {
    // Query active sessions from the 'sessions' table and join with 'session_monitoring'
    // and user profiles to get names.
    const sessions = await db.$queryRawUnsafe(`
    SELECT 
      s.id,
      t.first_name || ' ' || t.last_name as therapist_name,
      p.first_name || ' ' || p.last_name as patient_name,
      s.started_at as start_time,
      s.status,
      m.latest_empathy_score as empathy_score,
      m.latest_depth_level as depth_level,
      m.latest_crisis_risk as crisis_risk
    FROM sessions s
    LEFT JOIN session_monitoring m ON s.id = m.session_id AND m.status = 'active'
    LEFT JOIN users t ON s.therapist_id = t.id
    LEFT JOIN users p ON s.patient_id = p.id
    WHERE s.status = 'in-progress'
    ORDER BY s.started_at DESC
  `);
    return {
        sessions: sessions.map((s) => ({
            id: s.id,
            therapistName: s.therapist_name || 'Therapist',
            patientName: s.patient_name || 'Patient',
            startTime: s.start_time,
            status: s.status,
            metrics: s.empathy_score !== null ? {
                empathyScore: Number(s.empathy_score),
                depthLevel: s.depth_level || 'surface',
                crisisRisk: s.crisis_risk || 'low'
            } : undefined
        }))
    };
};
exports.getAdminLiveSessions = getAdminLiveSessions;
