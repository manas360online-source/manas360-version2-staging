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
			certificationStatus: true,
			certificationCompletedAt: true,
			certificationPaymentId: true,
			leadBoostScore: true,
			certifications: true,
		},
	});

	if (!profile) {
		return {
			userId: normalizedUserId,
			certificationStatus: 'NONE',
			certificationCompletedAt: null,
			certificationPaymentId: null,
			leadBoostScore: 0,
			certifications: [],
		};
	}

	const certificationSlugs = Array.isArray(profile.certifications)
		? profile.certifications.filter((slug) => typeof slug === 'string' && slug.trim().length > 0)
		: [];

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
		certifications: certificationItems,
	};
};
