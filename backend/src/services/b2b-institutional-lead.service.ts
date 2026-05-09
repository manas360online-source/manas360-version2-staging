import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { calculateB2BScore, type B2BInstitutionalEngagement } from './B2BMatchEngine';
import { sendExclusiveTierAlerts, sendPriorityTierPush } from './b2b-notification-bridge.service';

const db = prisma as any;

const HOURS = {
	exclusiveWindow: 24,
	priorityRelease: 24,
	standardRelease: 72,
} as const;

export interface PublishInstitutionalEngagementInput {
	engagementId: string;
	requestorUserId: string;
	requiredCert?: string | null;
	languages: string[];
	requiredLanguageProficiency?: 'native' | 'professional' | 'conversational';
	location?: { latitude: number; longitude: number } | null;
	deliveryMode?: string | null;
	cityTrafficIndex?: number;
	targetStartMinute?: number;
	durationMinutes?: number;
	requiredLeadCount?: number;
	availabilityPrefs?: {
		daysOfWeek: number[];
		timeSlots: Array<{ startMinute: number; endMinute: number }>;
	};
	amountMinor?: number;
	currency?: string;
	title?: string;
	institutionName?: string;
}

type LeadTier = 'EXCLUSIVE' | 'PRIORITY' | 'STANDARD';

const hoursFromNow = (hours: number): Date => new Date(Date.now() + hours * 60 * 60 * 1000);

const resolveTierWindow = (score: number, rating: number): { tier: LeadTier; visibleAt: Date; expiresAt: Date | null } => {
	if (score >= 80 && rating >= 4.5) {
		return {
			tier: 'EXCLUSIVE',
			visibleAt: new Date(),
			expiresAt: hoursFromNow(HOURS.exclusiveWindow),
		};
	}

	if (score >= 70) {
		return {
			tier: 'PRIORITY',
			visibleAt: hoursFromNow(HOURS.priorityRelease),
			expiresAt: null,
		};
	}

	return {
		tier: 'STANDARD',
		visibleAt: hoursFromNow(HOURS.standardRelease),
		expiresAt: null,
	};
};

const validateInput = (input: PublishInstitutionalEngagementInput): void => {
	if (!input.engagementId.trim()) {
		throw new AppError('engagementId is required', 422);
	}

	if (!input.requestorUserId.trim()) {
		throw new AppError('requestorUserId is required', 422);
	}
};

export const publishInstitutionalEngagementLeads = async (
	input: PublishInstitutionalEngagementInput,
): Promise<{
	engagementId: string;
	totalTherapistsEvaluated: number;
	totalLeadsCreated: number;
	createdByTier: Record<LeadTier, number>;
}> => {
	validateInput(input);

	const engagement: B2BInstitutionalEngagement = {
		requiredCert: input.requiredCert ?? null,
		languages: input.languages,
		requiredLanguageProficiency: input.requiredLanguageProficiency,
		location: input.location ?? null,
		deliveryMode: input.deliveryMode,
		cityTrafficIndex: input.cityTrafficIndex,
		targetStartMinute: input.targetStartMinute,
		durationMinutes: input.durationMinutes,
		availabilityPrefs: input.availabilityPrefs,
	};

	const therapists = await db.user.findMany({
		where: {
			role: 'THERAPIST',
			isDeleted: false,
			status: 'ACTIVE',
			therapistProfile: {
				isDeleted: false,
			},
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			therapistProfile: {
				select: {
					languages: true,
					certifications: true,
					averageRating: true,
					baseLatitude: true,
					baseLongitude: true,
					availability: true,
				},
			},
		},
	});

	const createdByTier: Record<LeadTier, number> = {
		EXCLUSIVE: 0,
		PRIORITY: 0,
		STANDARD: 0,
	};

	let totalLeadsCreated = 0;
	const exclusiveAlerts: Array<{
		leadId: string;
		engagementId: string;
		therapistId: string;
		therapistName?: string;
		matchScore: number;
		institutionName?: string;
	}> = [];

	await db.$transaction(async (tx: any) => {
		for (const therapist of therapists) {
			const profile = therapist.therapistProfile;
			if (!profile) {
				continue;
			}

			const score = calculateB2BScore(
				{
					certifications: profile.certifications ?? [],
					languages: profile.languages ?? [],
					languageProficiencies: {},
					rating: Number(profile.averageRating ?? 0),
					ratingSignals: {
						recentAverage: Number(profile.averageRating ?? 0),
						historicalAverage: Number(profile.averageRating ?? 0),
						recentWeight: 0.7,
					},
					location:
						typeof profile.baseLatitude === 'number' && typeof profile.baseLongitude === 'number'
							? { latitude: profile.baseLatitude, longitude: profile.baseLongitude }
							: null,
					availability: Array.isArray(profile.availability) ? profile.availability : [],
				},
				engagement,
			);

			if (score.total <= 50) {
				continue;
			}

			const tierWindow = resolveTierWindow(score.total, Number(profile.averageRating ?? 0));

			const lead = await tx.lead.create({
				data: {
					patientId: input.requestorUserId,
					providerId: therapist.id,
					status: 'AVAILABLE',
					channel: 'B2B_INSTITUTIONAL',
					tier: tierWindow.tier,
					matchScore: score.total,
					amountMinor: BigInt(input.amountMinor ?? 0),
					currency: input.currency ?? 'INR',
					paymentStatus: 'NOT_REQUIRED',
					visibleAt: tierWindow.visibleAt,
					expiresAt: tierWindow.expiresAt,
					previewData: {
						type: 'INSTITUTIONAL_ENGAGEMENT',
						engagementId: input.engagementId,
						requiredLeadCount: Number(input.requiredLeadCount ?? 1),
						title: input.title ?? 'Institutional engagement',
						institutionName: input.institutionName,
						requiredCert: input.requiredCert ?? null,
						languages: input.languages,
						deliveryMode: input.deliveryMode ?? null,
						location: input.location ?? null,
						scoreBreakdown: score,
					},
				},
			});

			if (tierWindow.tier === 'EXCLUSIVE') {
				await tx.notification.create({
					data: {
						userId: therapist.id,
						type: 'B2B_EXCLUSIVE_LEAD',
						title: 'Exclusive institutional lead unlocked',
						message: `You received an exclusive institutional lead (${score.total}/100 match).`,
						payload: { leadId: lead.id, engagementId: input.engagementId, tier: tierWindow.tier },
						sentAt: new Date(),
					},
				});

				await tx.lead.update({
					where: { id: lead.id },
					data: { providerContactedAt: new Date() },
				});

				exclusiveAlerts.push({
					leadId: lead.id,
					engagementId: input.engagementId,
					therapistId: therapist.id,
					therapistName: `${therapist.firstName ?? ''} ${therapist.lastName ?? ''}`.trim(),
					matchScore: score.total,
					institutionName: input.institutionName,
				});
			}

			createdByTier[tierWindow.tier] += 1;
			totalLeadsCreated += 1;
		}
	});

	for (const alert of exclusiveAlerts) {
		await sendExclusiveTierAlerts(alert);
	}

	return {
		engagementId: input.engagementId,
		totalTherapistsEvaluated: therapists.length,
		totalLeadsCreated,
		createdByTier,
	};
};

// Call from a scheduled job to notify priority therapists exactly when their window opens.
export const dispatchPriorityTierLeadNotifications = async (): Promise<{ notified: number }> => {
	const now = new Date();

	const dueLeads = await db.lead.findMany({
		where: {
			channel: 'B2B_INSTITUTIONAL',
			tier: 'PRIORITY',
			status: 'AVAILABLE',
			providerId: { not: null },
			visibleAt: { lte: now },
			providerContactedAt: null,
			purchasedAt: null,
		},
		select: {
			id: true,
			providerId: true,
			matchScore: true,
			previewData: true,
		},
	});

	if (dueLeads.length === 0) {
		return { notified: 0 };
	}

	const engagementIds = Array.from(
		new Set<string>(
			dueLeads
				.map((lead) => String((lead.previewData as any)?.engagementId || ''))
				.filter((id): id is string => Boolean(id)),
		),
	);

	const acceptedCounts = new Map<string, number>();
	for (const engagementId of engagementIds) {
		const count = await db.lead.count({
			where: {
				channel: 'B2B_INSTITUTIONAL',
				OR: [{ status: 'PURCHASED' }, { status: 'ACCEPTED' }],
				previewData: {
					path: ['engagementId'],
					equals: engagementId,
				},
			},
		});
		acceptedCounts.set(engagementId, Number(count));
	}

	const filteredDueLeads = dueLeads.filter((lead) => {
		const payload = lead.previewData as any;
		const engagementId = String(payload?.engagementId || '');
		if (!engagementId) {
			return false;
		}
		const requiredLeadCount = Math.max(1, Number(payload?.requiredLeadCount ?? 1));
		const currentAccepted = acceptedCounts.get(engagementId) ?? 0;
		return currentAccepted < requiredLeadCount;
	});

	if (filteredDueLeads.length === 0) {
		return { notified: 0 };
	}

	const priorityPushQueue: Array<{
		leadId: string;
		engagementId: string;
		therapistId: string;
		matchScore: number;
		institutionName?: string;
	}> = [];

	await db.$transaction(async (tx: any) => {
		for (const lead of filteredDueLeads) {
			const payload = lead.previewData as any;
			const engagementId = String(payload?.engagementId || '');

			await tx.notification.create({
				data: {
					userId: String(lead.providerId),
					type: 'B2B_PRIORITY_LEAD_RELEASE',
					title: 'Priority institutional lead is now open',
					message: `A priority institutional lead is now available (${lead.matchScore ?? 0}/100 match).`,
					payload: {
						leadId: lead.id,
						tier: 'PRIORITY',
						engagementId,
					},
					sentAt: now,
				},
			});

			await tx.lead.update({
				where: { id: lead.id },
				data: { providerContactedAt: now },
			});

			priorityPushQueue.push({
				leadId: lead.id,
				engagementId,
				therapistId: String(lead.providerId),
				matchScore: Number(lead.matchScore ?? 0),
				institutionName: payload?.institutionName,
			});
		}
	});

	for (const push of priorityPushQueue) {
		await sendPriorityTierPush(push);
	}

	return { notified: filteredDueLeads.length };
};
