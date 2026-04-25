import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { AppError } from '../middleware/error.middleware';

const CERT_LIST_CACHE_KEY = 'certifications:list:active:v1';
const CERT_CACHE_TTL_SECONDS = 600;

const certificationByIdCacheKey = (idOrSlug: string) => `certifications:item:${idOrSlug.toLowerCase()}`;

const baseSelect = {
	id: true,
	slug: true,
	code: true,
	title: true,
	shortTitle: true,
	subtitle: true,
	level: true,
	levelBadge: true,
	journeyDescription: true,
	durationLabel: true,
	investmentLabel: true,
	monthlyIncomeLabel: true,
	modulesCount: true,
	deliveryMode: true,
	sessionRateLabel: true,
	outcomeLabel: true,
	prerequisitesLabel: true,
	primaryCtaLabel: true,
	secondaryCtaLabel: true,
	isInvitationOnly: true,
	enrollmentOpen: true,
	sortOrder: true,
	isActive: true,
	metadata: true,
	createdAt: true,
	updatedAt: true,
};

export const listCertifications = async () => {
	try {
		const cached = await redis.get(CERT_LIST_CACHE_KEY);
		if (cached) {
			return JSON.parse(cached);
		}
	} catch {
		// Best-effort cache read.
	}

	const items = await prisma.certification.findMany({
		where: { isActive: true },
		orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
		select: baseSelect,
	});

	const payload = {
		items,
		total: items.length,
	};

	try {
		await redis.set(CERT_LIST_CACHE_KEY, JSON.stringify(payload), CERT_CACHE_TTL_SECONDS);
	} catch {
		// Best-effort cache write.
	}

	return payload;
};

export const getCertificationById = async (idOrSlug: string) => {
	const normalized = idOrSlug.trim();
	if (!normalized) {
		throw new AppError('Certification id is required', 400);
	}

	const cacheKey = certificationByIdCacheKey(normalized);
	try {
		const cached = await redis.get(cacheKey);
		if (cached) {
			return JSON.parse(cached);
		}
	} catch {
		// Best-effort cache read.
	}

	const certification = await prisma.certification.findFirst({
		where: {
			OR: [{ id: normalized }, { slug: normalized }, { code: normalized }],
			isActive: true,
		},
		select: baseSelect,
	});

	if (!certification) {
		throw new AppError('Certification not found', 404, { id: normalized });
	}

	try {
		await redis.set(cacheKey, JSON.stringify(certification), CERT_CACHE_TTL_SECONDS);
	} catch {
		// Best-effort cache write.
	}

	return certification;
};

export const getMyCertificationState = async (userId: string) => {
	const normalizedUserId = String(userId || '').trim();
	if (!normalizedUserId) {
		throw new AppError('User id is required', 400);
	}

	const profile = await prisma.therapistProfile.findUnique({
		where: { userId: normalizedUserId },
		select: {
			userId: true,
			displayName: true,
			certificationStatus: true,
			certificationCompletedAt: true,
			certificationPaymentId: true,
			leadBoostScore: true,
			certifications: true,
			user: {
				select: {
					name: true,
					firstName: true,
					lastName: true,
				},
			},
		},
	});

	if (!profile) {
		const user = await prisma.user.findUnique({
			where: { id: normalizedUserId },
			select: { name: true, firstName: true, lastName: true }
		});
		return {
			userId: normalizedUserId,
			userName: user?.name || '',
			certificationStatus: 'NONE',
			certificationCompletedAt: null,
			certificationPaymentId: null,
			leadBoostScore: 0,
			certifications: [],
		};
	}

	const enrollments = await prisma.certificationEnrollment.findMany({
		where: { userId: normalizedUserId },
		orderBy: { createdAt: 'desc' },
	});

	const certificationSlugs = enrollments.map((e) => e.certificationSlug);

	const certificationItems = certificationSlugs.length
		? await prisma.certification.findMany({
			where: { slug: { in: certificationSlugs } },
			select: {
				id: true,
				slug: true,
				code: true,
				title: true,
				level: true,
				isActive: true,
			},
		})
		: [];

	return {
		...profile,
		userName: profile.user?.name || `${profile.user?.firstName || ''} ${profile.user?.lastName || ''}`.trim(),
		enrollments,
		certifications: certificationItems,
	};
};

export const markCertificationCompleted = async (userId: string, certSlug: string) => {
	const normalizedUserId = String(userId || '').trim();
	const normalizedSlug = String(certSlug || '').trim();

	if (!normalizedUserId) {
		throw new AppError('User id is required', 400);
	}

	if (!normalizedSlug) {
		throw new AppError('Certification slug is required', 400);
	}

	const profile = await prisma.therapistProfile.findUnique({
		where: { userId: normalizedUserId },
		select: {
			id: true,
			certifications: true,
			certificationStatus: true,
			leadBoostScore: true,
		},
	});

	if (!profile) {
		throw new AppError('Provider profile not found for certification completion', 404);
	}

	const existingCertifications = Array.isArray(profile.certifications)
		? profile.certifications.filter((value) => typeof value === 'string' && value.trim().length > 0)
		: [];

	if (!existingCertifications.includes(normalizedSlug)) {
		existingCertifications.push(normalizedSlug);
	}

	const currentStatus = String(profile.certificationStatus || '').toUpperCase();
	const nextStatus = currentStatus === 'VERIFIED' ? 'VERIFIED' : 'COMPLETED';

	const certification = await prisma.certification.findFirst({
		where: { slug: normalizedSlug },
		select: { level: true },
	});

	const isProfessionalOrMastery = certification?.level === 'PROFESSIONAL' || certification?.level === 'MASTERY';

	await prisma.certificationEnrollment.updateMany({
		where: { userId: normalizedUserId, certificationSlug: normalizedSlug },
		data: {
			status: 'COMPLETED',
			progress: 100,
		},
	});

	await prisma.therapistProfile.update({
		where: { userId: normalizedUserId },
		data: {
			certifications: existingCertifications,
			certificationStatus: nextStatus as any,
			certificationCompletedAt: new Date(),
			leadBoostScore: Math.max(isProfessionalOrMastery ? 70 : 50, Number(profile.leadBoostScore || 0)),
			...(isProfessionalOrMastery ? { nriPoolCertified: true, nriPoolCertifiedAt: new Date() } : {}),
		},
	});

	return getMyCertificationState(normalizedUserId);
};

export const recordInstallmentPayment = async (userId: string, enrollmentId: string) => {
	const normalizedUserId = String(userId || '').trim();
	const normalizedEnrollId = String(enrollmentId || '').trim();

	if (!normalizedUserId || !normalizedEnrollId) {
		throw new AppError('User id and Enrollment id are required', 400);
	}

	const enrollment = await prisma.certificationEnrollment.findFirst({
		where: { id: normalizedEnrollId, userId: normalizedUserId }
	});

	if (!enrollment) {
		throw new AppError('Enrollment record not found', 404);
	}

	if (enrollment.paymentPlan !== 'INSTALLMENT') {
		throw new AppError('This enrollment is not on an installment plan', 400);
	}

	const nextPaidCount = (enrollment.installmentsPaidCount || 1) + 1;
	const isFullyPaid = nextPaidCount >= 3;
	
	const amountPerInstallment = enrollment.totalAmount / 3;
	const nextDue = new Date();
	nextDue.setDate(nextDue.getDate() + 30);

	const updated = await prisma.certificationEnrollment.update({
		where: { id: normalizedEnrollId },
		data: {
			installmentsPaidCount: nextPaidCount,
			status: isFullyPaid ? 'PAID' : 'PARTIAL',
			amountPaid: enrollment.amountPaid + amountPerInstallment,
			nextInstallmentDue: isFullyPaid ? null : nextDue,
		}
	});

	return updated;
};
