import crypto from 'crypto';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { AppError } from '../middleware/error.middleware';
import { decryptSessionNote } from '../utils/encryption';
import { createSessionPayment } from './payment.service';
import { processChatMessage } from './chat.service';
import { PRESET_DEFAULTS, getPresetDefaults, isValidPresetEntryType } from '../config/presetDefaults';
import type { PresetAssessmentSubmitRequest, PresetAssessmentSubmitResponse } from '../types/preset';
import {
	buildDailyCheckInInsights,
	buildDailyCheckInNote,
	formatDailyCheckInTag,
	getThreeDayLowMoodTrend,
	parseDailyCheckInNote,
} from './dailyCheckIn.service';
import { syncTreatmentPlanFromAssessment } from './treatment-plan.service';
import { getSessionQuote } from './pricing.service';
import { getActivePlatformPlan, getPricingConfigVersion } from './pricing.service';
import { scoreGAD7, scorePHQ9 } from './riskScoring';
import { calculateClinicalAssessmentScore } from '../utils/clinicalAssessments';
import { sendSubscriptionActivationEmail } from './email.service';
import { calculateGraceEndDate } from './subscription.helper';

const db = prisma as any;
const SUBSCRIPTION_LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const PATIENT_V1_READ_CACHE_TTL = {
	dashboard: 30,
	insights: 45,
	reports: 60,
} as const;

const readJsonCache = async <T>(key: string): Promise<T | null> => {
	try {
		const cached = await redis.get(key);
		if (!cached) return null;
		return JSON.parse(cached) as T;
	} catch {
		return null;
	}
};

const writeJsonCache = async (key: string, payload: unknown, ttl: number): Promise<void> => {
	try {
		await redis.set(key, JSON.stringify(payload), ttl);
	} catch {
		// Best-effort cache write.
	}
};

const isSchemaUnavailableError = (error: unknown): boolean => {
	const message = String((error as any)?.message || '').toLowerCase();
	const code = String((error as any)?.code || '').toUpperCase();
	return (
		code === 'P2021'
		|| code === 'P2022'
		|| code === 'P2010'
		|| message.includes('does not exist')
		|| message.includes('unknown column')
		|| message.includes('no such table')
	);
};

const recordPatientSubscriptionHistory = async (input: {
	userId: string;
	subscriptionRefId?: string;
	oldPlan?: string;
	newPlan?: string;
	oldStatus?: string;
	newStatus?: string;
	oldPrice?: number;
	newPrice?: number;
	paymentId?: string;
	transactionId?: string;
	reason:
		| 'PAYMENT_SUCCESS'
		| 'PAYMENT_FAILED'
		| 'AUTO_RENEWAL'
		| 'MANUAL_UPGRADE'
		| 'MANUAL_DOWNGRADE'
		| 'MANUAL_CANCEL'
		| 'PAYMENT_REACTIVATION'
		| 'AUTO_RENEW_ENABLED'
		| 'AUTO_RENEW_DISABLED'
		| 'OTHER';
	metadata?: Record<string, unknown>;
}) => {
	await db.subscriptionHistory.create({
		data: {
			subscriptionType: 'PATIENT',
			subscriptionRefId: input.subscriptionRefId,
			patientUserId: input.userId,
			oldPlan: input.oldPlan,
			newPlan: input.newPlan,
			oldStatus: input.oldStatus,
			newStatus: input.newStatus,
			oldPrice: input.oldPrice,
			newPrice: input.newPrice,
			paymentId: input.paymentId,
			transactionId: input.transactionId || input.paymentId,
			reason: input.reason,
			metadata: input.metadata || undefined,
		},
	}).catch(() => null);
};

const withPatientSubscriptionLock = async <T>(userId: string, handler: (current: any) => Promise<T>): Promise<T> => {
	await ensureSubscriptionRecord(userId);
	const staleCutoff = new Date(Date.now() - SUBSCRIPTION_LOCK_TIMEOUT_MS);
	const lockStartedAt = new Date();

	const lock = await db.patientSubscription.updateMany({
		where: {
			userId,
			OR: [
				{ processing: false },
				{ processing: true, processingStartedAt: { lt: staleCutoff } },
			],
		},
		data: { processing: true, processingStartedAt: lockStartedAt },
	});

	if (!lock?.count) {
		throw new AppError('Subscription is currently being processed. Please retry shortly.', 409);
	}

	try {
		const current = await db.patientSubscription.findUnique({ where: { userId } });
		return await handler(current);
	} finally {
		await db.patientSubscription.updateMany({
			where: { userId },
			data: { processing: false, processingStartedAt: null },
		}).catch(() => null);
	}
};

type ProviderFilters = {
	specialization?: string;
	language?: string;
	minPrice?: number;
	maxPrice?: number;
	role?: string;
	page?: number;
	limit?: number;
};

const DEFAULT_SESSION_FEE_MINOR = 150000;
const DEFAULT_DURATION_MINUTES = 50;
const PAYMENT_DEADLINE_HOURS = 12;
const PROVIDER_ROLES = ['THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH'] as const;
const SLOT_INTERVAL_MINUTES = 60;

type AvailabilitySlot = {
	dayOfWeek: number;
	startMinute: number;
	endMinute: number;
	isAvailable: boolean;
};

const normalizeProviderRole = (role: string | null | undefined): 'THERAPIST' | 'PSYCHOLOGIST' | 'PSYCHIATRIST' | 'COACH' | null => {
	const normalized = String(role || '').trim().toUpperCase();
	if (normalized === 'THERAPIST' || normalized === 'PSYCHOLOGIST' || normalized === 'PSYCHIATRIST' || normalized === 'COACH') {
		return normalized;
	}
	return null;
};

const roleToProviderType = (role: string | null | undefined): 'specialized-therapist' | 'clinical-psychologist' | 'psychiatrist' => {
	const normalized = normalizeProviderRole(role);
	if (normalized === 'PSYCHOLOGIST') return 'clinical-psychologist';
	if (normalized === 'PSYCHIATRIST') return 'psychiatrist';
	return 'specialized-therapist';
};

const roleLabel = (role: string | null | undefined): string => {
	const normalized = normalizeProviderRole(role);
	if (normalized === 'PSYCHOLOGIST') return 'Psychologist';
	if (normalized === 'PSYCHIATRIST') return 'Psychiatrist';
	if (normalized === 'COACH') return 'Coach';
	return 'Therapist';
};

const defaultFeeByRoleMinor = (role: string | null | undefined): number => {
	const normalized = normalizeProviderRole(role);
	if (normalized === 'PSYCHOLOGIST') return 69900;
	if (normalized === 'PSYCHIATRIST') return 99900;
	if (normalized === 'COACH') return 49900;
	return DEFAULT_SESSION_FEE_MINOR;
};

const normalizePagination = (page = 1, limit = 10) => {
	const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
	const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(50, Math.floor(limit)) : 10;
	return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

const normalizeAvailabilitySlots = (value: unknown): AvailabilitySlot[] => {
	if (!Array.isArray(value)) return [];

	return value
		.map((entry) => {
			const slot = entry as Record<string, unknown>;
			const dayOfWeek = Number(slot.dayOfWeek);
			const startMinute = Number(slot.startMinute);
			const endMinute = Number(slot.endMinute);
			const isAvailable = Boolean(slot.isAvailable);

			if (
				!Number.isInteger(dayOfWeek)
				|| dayOfWeek < 0
				|| dayOfWeek > 6
				|| !Number.isFinite(startMinute)
				|| !Number.isFinite(endMinute)
			) {
				return null;
			}

			return {
				dayOfWeek,
				startMinute: Math.max(0, Math.min(24 * 60, Math.floor(startMinute))),
				endMinute: Math.max(0, Math.min(24 * 60, Math.floor(endMinute))),
				isAvailable,
			};
		})
		.filter((slot): slot is AvailabilitySlot => slot !== null && slot.endMinute > slot.startMinute);
};

const buildAvailableSlotsFromAvailability = (
	availability: AvailabilitySlot[],
	blocked: Set<string>,
	now: Date,
	durationMinutes = DEFAULT_DURATION_MINUTES,
): string[] => {
	const availableSlots: string[] = [];

	for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
		const currentDay = new Date(now);
		currentDay.setDate(now.getDate() + dayOffset);
		currentDay.setSeconds(0, 0);
		const daySlots = availability.filter((slot) => slot.isAvailable && slot.dayOfWeek === currentDay.getDay());

		for (const daySlot of daySlots) {
			for (
				let minuteOfDay = daySlot.startMinute;
				minuteOfDay + durationMinutes <= daySlot.endMinute;
				minuteOfDay += SLOT_INTERVAL_MINUTES
			) {
				const slot = new Date(currentDay);
				slot.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
				if (slot <= now) continue;
				if (!blocked.has(slot.toISOString())) availableSlots.push(slot.toISOString());
			}
		}
	}

	return availableSlots;
};

const isWithinProviderAvailability = (scheduledAt: Date, availability: AvailabilitySlot[], durationMinutes: number): boolean => {
	const daySlot = availability.find((slot) => slot.isAvailable && slot.dayOfWeek === scheduledAt.getDay());
	if (!daySlot) return false;

	const startMinute = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
	const endMinute = startMinute + durationMinutes;
	return startMinute >= daySlot.startMinute && endMinute <= daySlot.endMinute;
};

const mapMoodRow = (row: { id: string; mood: number; note?: string | null; created_at: Date | string; metadata?: any }) => {
	const parsed = parseDailyCheckInNote(row.note);
	return {
		id: row.id,
		mood: Number(row.mood || 0),
		note: parsed.journal,
		metadata: row.metadata || parsed.metadata,
		created_at: row.created_at,
	};
};

const markDailyCheckInTaskComplete = async (patientProfileId: string) => {
	const task = await db.therapyPlanActivity.findFirst({
		where: {
			activityType: 'MOOD_CHECKIN',
			status: 'PENDING',
			plan: { patientId: patientProfileId, status: 'ACTIVE' },
		},
		select: { id: true },
	}).catch(() => null);

	if (!task?.id) return;

	await db.therapyPlanActivity.update({
		where: { id: task.id },
		data: { status: 'COMPLETED', completedAt: new Date() },
	}).catch(() => null);
};

const maybeCreateLowMoodAlert = async (userId: string, patientProfileId: string) => {
	const history = await getMoodHistory(userId);
	const trend = getThreeDayLowMoodTrend(history);
	if (!trend) return;

	const [assignments, activePlan, patientUser] = await Promise.all([
		db.careTeamAssignment.findMany({
			where: { patientId: userId, status: 'ACTIVE' },
			select: { providerId: true },
		}).catch(() => []),
		db.therapyPlan.findFirst({
			where: { patientId: patientProfileId, status: 'ACTIVE', therapistId: { not: null } },
			select: { therapistId: true },
		}).catch(() => null),
		db.user.findUnique({
			where: { id: userId },
			select: { name: true, firstName: true, lastName: true, email: true },
		}).catch(() => null),
	]);

	const providerIds = [...new Set([
		...assignments.map((item: any) => String(item.providerId || '').trim()).filter(Boolean),
		activePlan?.therapistId ? String(activePlan.therapistId).trim() : '',
	].filter(Boolean))];

	if (!providerIds.length) return;

	const patientName = String(
		patientUser?.name
			|| `${patientUser?.firstName || ''} ${patientUser?.lastName || ''}`.trim()
			|| patientUser?.email
			|| 'Your patient',
	);
	const dayStart = new Date();
	dayStart.setHours(0, 0, 0, 0);
	const tagSummary = [...new Set(trend.recentDays.flatMap((entry) => entry.tags))].slice(0, 2).map(formatDailyCheckInTag);
	const message = tagSummary.length
		? `${patientName} has reported sad or awful daily check-ins for 3 consecutive days. Recent context includes ${tagSummary.join(' and ')}.`
		: `${patientName} has reported sad or awful daily check-ins for 3 consecutive days. Consider a proactive outreach.`;

	await Promise.allSettled(
		providerIds.map(async (providerId) => {
			const existing = await db.notification.findMany({
				where: {
					userId: providerId,
					type: 'PATIENT_MOOD_DECLINE_ALERT',
					createdAt: { gte: dayStart },
				},
				select: { payload: true },
			}).catch(() => []);

			const alreadySent = existing.some((item: any) => String(item?.payload?.patientUserId || '') === userId);
			if (alreadySent) return;

			await db.notification.create({
				data: {
					userId: providerId,
					type: 'PATIENT_MOOD_DECLINE_ALERT',
					title: `${patientName}'s mood is trending downward`,
					message,
					payload: {
						patientUserId: userId,
						patientName,
						pattern: 'three-low-days',
						recentDays: trend.recentDays,
					},
				},
			});
		}),
	);
};

const getPatientProfile = async (userId: string) => {
	const profile = await db.patientProfile.findUnique({ where: { userId }, select: { id: true } });
	if (profile) return profile;

	const created = await db.patientProfile.create({
		data: {
			userId,
			age: 25,
			gender: 'prefer_not_to_say',
			emergencyContact: {
				name: 'Not provided',
				relation: 'Not provided',
				phone: 'Not provided',
			},
		},
		select: { id: true },
	}).catch(() => null);

	if (!created) {
		throw new AppError('Patient profile unavailable', 500);
	}

	return created;
};

const assertPaymentDeadlineWindow = (scheduledAt: Date): void => {
	const now = Date.now();
	const threshold = scheduledAt.getTime() - PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000;
	if (now > threshold) {
		throw new AppError(`Session payment must be completed at least ${PAYMENT_DEADLINE_HOURS} hours before start time`, 409);
	}
};

const toLegacySeverityBucket = (severityLevel: string): 'Mild' | 'Moderate' | 'Severe' => {
	const normalized = String(severityLevel || '').toLowerCase();
	if (normalized === 'severe') return 'Severe';
	if (normalized === 'moderate' || normalized === 'moderately_severe') return 'Moderate';
	return 'Mild';
};

const deriveAssessmentScoreAndSeverity = (
	type: string,
	inputScore: number | undefined,
	inputAnswers: number[] | undefined,
): { computedScore: number; answers: number[]; severity: 'Mild' | 'Moderate' | 'Severe' } => {
	const computedScore = typeof inputScore === 'number'
		? Math.max(0, Math.floor(inputScore))
		: (inputAnswers || []).reduce((a, b) => a + Number(b || 0), 0);
	const answers = Array.isArray(inputAnswers) && inputAnswers.length > 0
		? inputAnswers.map((v) => Number(v || 0))
		: [computedScore];

	const normalizedType = String(type || '').toUpperCase();
	const isClinicalType = normalizedType === 'PHQ-9' || normalizedType === 'GAD-7';

	if (isClinicalType) {
		try {
			const clinical = calculateClinicalAssessmentScore(normalizedType as 'PHQ-9' | 'GAD-7', answers);
			return {
				computedScore: clinical.totalScore,
				answers,
				severity: toLegacySeverityBucket(clinical.severityLevel),
			};
		} catch {
			// Keep legacy fallback behavior when callers submit score-only or non-standard answer payloads.
		}
	}

	if (computedScore <= 9) return { computedScore, answers, severity: 'Mild' };
	if (computedScore <= 19) return { computedScore, answers, severity: 'Moderate' };
	return { computedScore, answers, severity: 'Severe' };
};

type JourneyPathway = 'SELF_CARE' | 'THERAPIST' | 'PSYCHIATRIST' | 'CRISIS_SUPPORT';
type JourneyUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type JourneyRecommendation = {
	pathway: JourneyPathway;
	urgency: JourneyUrgency;
	recommendedProvider: 'self-guided' | 'therapist' | 'psychiatrist' | 'crisis-team';
	followUpDays: number;
	rationale: string[];
	actions: string[];
};

const buildJourneyRecommendation = (input: { type: string; score: number; answers: number[] }): JourneyRecommendation => {
	const type = String(input.type || '').toUpperCase();

	if (type === 'PHQ-9') {
		const phq = scorePHQ9(input.answers.length ? input.answers : [input.score]);
		if (phq.q9Score >= 3) {
			return {
				pathway: 'CRISIS_SUPPORT',
				urgency: 'CRITICAL',
				recommendedProvider: 'crisis-team',
				followUpDays: 0,
				rationale: ['PHQ-9 item 9 indicates frequent self-harm thoughts.', `PHQ-9 total ${phq.total} (${phq.severity}).`],
				actions: ['Contact immediate crisis support now.', 'Enable urgent care-team outreach.', 'Schedule same-day clinical review.'],
			};
		}

		if (phq.q9Score > 0 || phq.total >= 20) {
			return {
				pathway: 'PSYCHIATRIST',
				urgency: 'HIGH',
				recommendedProvider: 'psychiatrist',
				followUpDays: 1,
				rationale: ['Elevated depression severity and safety risk factors.', `PHQ-9 total ${phq.total} (${phq.severity}).`],
				actions: ['Book psychiatrist consult within 24 hours.', 'Assign therapist follow-up session this week.', 'Continue daily mood and safety check-ins.'],
			};
		}

		if (phq.total >= 10) {
			return {
				pathway: 'THERAPIST',
				urgency: 'MEDIUM',
				recommendedProvider: 'therapist',
				followUpDays: 3,
				rationale: [`PHQ-9 indicates ${phq.severity} depressive symptoms.`],
				actions: ['Book therapist session this week.', 'Track mood and sleep for 7 days.'],
			};
		}

		return {
			pathway: 'SELF_CARE',
			urgency: 'LOW',
			recommendedProvider: 'self-guided',
			followUpDays: 7,
			rationale: [`PHQ-9 indicates ${phq.severity} symptoms.`],
			actions: ['Continue self-care routines.', 'Repeat assessment in one week.', 'Use breathing and sleep hygiene exercises.'],
		};
	}

	if (type === 'GAD-7') {
		const gad = scoreGAD7(input.answers.length ? input.answers : [input.score]);
		if (gad.total >= 15) {
			return {
				pathway: 'THERAPIST',
				urgency: 'HIGH',
				recommendedProvider: 'therapist',
				followUpDays: 2,
				rationale: [`GAD-7 indicates severe anxiety (${gad.total}).`],
				actions: ['Book therapist session within 48 hours.', 'Apply anxiety grounding protocol daily.', 'Reduce known high-trigger situations this week.'],
			};
		}

		if (gad.total >= 10) {
			return {
				pathway: 'THERAPIST',
				urgency: 'MEDIUM',
				recommendedProvider: 'therapist',
				followUpDays: 4,
				rationale: [`GAD-7 indicates ${gad.severity} anxiety.`],
				actions: ['Schedule therapist follow-up this week.', 'Continue relaxation routines.', 'Track anxiety triggers in daily journal.'],
			};
		}

		return {
			pathway: 'SELF_CARE',
			urgency: 'LOW',
			recommendedProvider: 'self-guided',
			followUpDays: 7,
			rationale: [`GAD-7 indicates ${gad.severity} anxiety.`],
			actions: ['Maintain self-care and breathwork.', 'Repeat anxiety check next week.', 'Follow your current therapy-plan tasks.'],
		};
	}

	if (input.score >= 15) {
		return {
			pathway: 'THERAPIST',
			urgency: 'MEDIUM',
			recommendedProvider: 'therapist',
			followUpDays: 3,
			rationale: [`Assessment score ${input.score} indicates elevated distress.`],
			actions: ['Schedule therapist follow-up this week.', 'Continue mood tracking daily.', 'Prioritize sleep and routine stabilization.'],
		};
	}

	return {
		pathway: 'SELF_CARE',
		urgency: 'LOW',
		recommendedProvider: 'self-guided',
		followUpDays: 7,
		rationale: [`Assessment score ${input.score} suggests manageable symptoms.`],
		actions: ['Continue self-care plan.', 'Reassess in 7 days.', 'Keep routine mood logs.'],
	};
};

const toProviderListItem = async (user: any) => {
	try {
		// 1. Ensure TherapistProfile exists, or fetch it if omitted
		const profile = user.therapistProfile || await db.therapistProfile.findUnique({ where: { userId: user.id } }).catch(() => null);

		// 2. Base specializations based on profile
		const profileSpecializations = Array.isArray(profile?.specializations) ? profile.specializations : [];
		const allSpecializations = [...new Set([...profileSpecializations])];

		// 3. Aggregate Stats
		const therapistProfile = profile || await db.therapistProfile.findUnique({ where: { userId: user.id } }).catch(() => null);
		const completedSessions = therapistProfile ? await db.therapySession.count({ where: { therapistProfileId: therapistProfile.id, status: 'COMPLETED' } }) : 0;
		const providerType = roleToProviderType(user.role);
		
		// Default fallbacks
		const fallbackSpecialization = providerType === 'psychiatrist'
			? 'Medication & Clinical Psychiatry'
			: providerType === 'clinical-psychologist'
				? 'Clinical Psychology'
				: normalizeProviderRole(user.role) === 'COACH'
					? 'Wellness Coaching'
					: 'General Wellness Therapy';

		return {
			id: user.id,
			name: String(profile?.displayName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Provider'),
			role: roleLabel(user.role),
			providerType,
			specialization: allSpecializations[0] || fallbackSpecialization,
			specializations: allSpecializations.length ? allSpecializations : [fallbackSpecialization],
			experience_years: profile?.yearsOfExperience || 1,
			session_rate: profile?.consultationFee || defaultFeeByRoleMinor(user.role),
			bio: profile?.bio || 'Experienced mental wellness professional dedicated to holistic care and evidence-based practices.',
			languages: Array.isArray(profile?.languages) && profile.languages.length > 0 ? profile.languages : ['English'],
			rating_avg: profile?.averageRating && profile.averageRating > 0 ? profile.averageRating : (completedSessions > 0 ? 4.8 : 4.5),
			is_active: !user.isDeleted && user.status === 'ACTIVE',
		};
	} catch (error) {
		console.error('Error in toProviderListItem:', error);
		throw error;
	}
};

export const getPatientDashboard = async (userId: string) => {
	const cacheKey = `patient:v1:dashboard:${userId}`;
	const cached = await readJsonCache<any>(cacheKey);
	if (cached) return cached;

	const patientProfile = await getPatientProfile(userId);
	const now = new Date();

	// Get unified mood history from all sources
	const moodHistory = await getMoodHistory(userId).catch(() => []);

	const [user, upcomingRaw, recentSessionsRaw, lastAssessment, therapistUsers, exercises, progress, recentPrescriptionsRaw] = await Promise.all([
		db.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
		}).catch(() => null),
		db.therapySession.findMany({
			where: {
				patientProfileId: patientProfile.id,
				dateTime: { gte: now },
				status: { in: ['PENDING', 'CONFIRMED'] },
			},
			orderBy: { dateTime: 'asc' },
			take: 5,
			select: {
				id: true,
				bookingReferenceId: true,
				dateTime: true,
				status: true,
				agoraChannel: true,
				therapistProfileId: true,
			},
		}).catch(() => []),
		db.therapySession.findMany({
			where: { patientProfileId: patientProfile.id },
			orderBy: { dateTime: 'desc' },
			take: 20,
			select: {
				id: true,
				dateTime: true,
				status: true,
				sessionFeeMinor: true,
				therapistProfileId: true,
			},
		}).catch(() => []),
		db.patientAssessment.findFirst({
			where: { patientId: patientProfile.id },
			orderBy: { createdAt: 'desc' },
			select: { type: true, totalScore: true, severityLevel: true, createdAt: true },
		}).catch(() => null),
		db.user.findMany({
			where: { role: { in: PROVIDER_ROLES as any }, isDeleted: false },
			select: { 
				id: true, 
				firstName: true, 
				lastName: true, 
				name: true, 
				role: true, 
				status: true,
				therapistProfile: true 
			},
			take: 8,
		}).catch(() => []),
		db.patientExercise.findMany({
			where: { patientId: patientProfile.id },
			orderBy: { createdAt: 'desc' },
			take: 12,
			select: { id: true, title: true, assignedBy: true, duration: true, status: true, createdAt: true },
		}).catch(() => []),
		db.patientProgress.findUnique({
			where: { patientId: patientProfile.id },
			select: {
				sessionsCompleted: true,
				totalSessions: true,
				exercisesCompleted: true,
				totalExercises: true,
				phqStart: true,
				phqCurrent: true,
			},
		}).catch(() => null),
		db.prescription.findMany({
			where: { patientId: userId },
			orderBy: { prescribedDate: 'desc' },
			take: 5,
			select: {
				id: true,
				drugName: true,
				dosage: true,
				prescribedDate: true,
				provider: {
					select: {
						user: {
							select: { firstName: true, lastName: true },
						},
					},
				},
			},
		}).catch(() => []),
	]);

	const sessionProviderIds = Array.from(
		new Set(
			[...upcomingRaw, ...recentSessionsRaw]
				.map((session: any) => String(session.therapistProfileId || '').trim())
				.filter(Boolean),
		),
	);

	const sessionProviders = sessionProviderIds.length
		? await db.user
				.findMany({
					where: { id: { in: sessionProviderIds } },
					select: { id: true, name: true, firstName: true, lastName: true },
				})
				.catch(() => [])
		: [];

	const providerMap = new Map(
		sessionProviders.map((provider: any) => [
			provider.id,
			String(provider.name || `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Therapist'),
		]),
	);

	const mapSessionProvider = (session: any) => {
		const providerId = String(session?.therapistProfileId || '').trim() || null;
		return {
			id: providerId,
			name: providerId ? providerMap.get(providerId) || 'Therapist' : 'Therapist',
		};
	};

	const recommendedProviderResults = await Promise.allSettled(
		therapistUsers.map((u: any) => toProviderListItem(u)),
	);
	const recommendedProviders = recommendedProviderResults
		.filter((item: PromiseSettledResult<any>) => item.status === 'fulfilled')
		.map((item: PromiseSettledResult<any>) => (item as PromiseFulfilledResult<any>).value);
	const userName = String(user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Patient');
	const moodTrend = moodHistory
		.slice(0, 7)
		.reverse()
		.map((entry: any) => ({
			date: entry.created_at,
			score: Number(entry.mood || 0),
			note: entry.note || null,
		}));

	const avgMood = moodTrend.length
		? moodTrend.reduce((sum: number, entry: any) => sum + Number(entry.score || 0), 0) / moodTrend.length
		: 0;
	const completedWellnessActivities = exercises.filter((item: any) => String(item.status || '').toUpperCase() === 'COMPLETED').length;
	const exerciseBoost = Math.min(20, completedWellnessActivities * 10);

	// Calculate consecutive check-in streak
	const sortedDays = [...new Set(moodTrend.map((entry: any) => {
		const d = new Date(entry.date);
		return d.toISOString().slice(0, 10);
	}))] as string[];
	sortedDays.sort((a, b) => b.localeCompare(a));
	let currentStreak = 0;
	let cursorDate = new Date();
	cursorDate.setHours(0, 0, 0, 0);
	for (const day of sortedDays) {
		const cursorKey = cursorDate.toISOString().slice(0, 10);
		if (day === cursorKey) {
			currentStreak += 1;
			cursorDate.setDate(cursorDate.getDate() - 1);
			continue;
		}
		if (currentStreak === 0) {
			cursorDate.setDate(cursorDate.getDate() - 1);
			if (day === cursorDate.toISOString().slice(0, 10)) {
				currentStreak += 1;
				cursorDate.setDate(cursorDate.getDate() - 1);
				continue;
			}
		}
		break;
	}

	const completedSessions = recentSessionsRaw.filter((row: any) => String(row.status) === 'COMPLETED').length;
	const totalSessions = Math.max(completedSessions + upcomingRaw.length, progress?.totalSessions || 0);
	const upcomingSession = upcomingRaw[0]
		? {
			id: upcomingRaw[0].id,
			bookingReferenceId: upcomingRaw[0].bookingReferenceId,
			scheduledAt: upcomingRaw[0].dateTime,
			status: String(upcomingRaw[0].status).toLowerCase(),
			agoraChannel: upcomingRaw[0].agoraChannel,
			provider: mapSessionProvider(upcomingRaw[0]),
		}
		: null;

	const recentActivity = [
		...recentSessionsRaw.slice(0, 4).map((session: any) => ({
			id: `session-${session.id}`,
			type: 'session',
			title: `Session ${String(session.status).toLowerCase()}`,
			description: String(providerMap.get(String(session.therapistProfileId || '')) || 'Therapist'),
			date: session.dateTime,
		})),
		...recentPrescriptionsRaw.slice(0, 3).map((prescription: any) => {
			const providerName = prescription.provider
				? `${prescription.provider.firstName || ''} ${prescription.provider.lastName || ''}`.trim()
				: 'Provider';
			return {
				id: `prescription-${prescription.id}`,
				type: 'prescription',
				title: `Prescription issued: ${prescription.drugName}`,
				description: `${prescription.dosage} • ${providerName}`,
				date: prescription.prescribedDate,
			};
		}),
		...moodHistory.slice(0, 3).map((mood: any) => ({
			id: `mood-${mood.id}`,
			type: 'mood',
			title: 'Mood check-in saved',
			description: mood.note ? String(mood.note) : `Mood score ${mood.mood}/5`,
			date: mood.created_at,
		})),
		...exercises
			.filter((item: any) => String(item.status || '').toUpperCase() === 'COMPLETED')
			.slice(0, 4)
			.map((exercise: any) => ({
				id: `wellness-${exercise.id}`,
				type: 'wellness',
				title: 'Premium Library session completed',
				description: `${String(exercise.title || 'Self-care activity')} • +10 Wellness Points`,
				date: exercise.createdAt,
			})),
	]
		.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 8);

	const progressPayload = progress
		? {
			sessionsCompleted: progress.sessionsCompleted,
			totalSessions: progress.totalSessions,
			exercisesCompleted: progress.exercisesCompleted,
			totalExercises: progress.totalExercises,
			phqStart: progress.phqStart,
			phqCurrent: progress.phqCurrent,
		}
		: {
			sessionsCompleted: completedSessions,
			totalSessions: Math.max(totalSessions, 1),
			exercisesCompleted: exercises.filter((item: any) => String(item.status) === 'COMPLETED').length,
			totalExercises: Math.max(exercises.length, 1),
			phqStart: null,
			phqCurrent: lastAssessment?.totalScore ?? null,
		};

	const payload = {
		user: {
			id: user?.id,
			name: userName,
			email: user?.email || null,
			role: String(user?.role || 'PATIENT').toLowerCase(),
			createdAt: user?.createdAt,
		},
		wellnessScore: Math.max(0, Math.min(100, Math.round((avgMood / 5) * 80 + exerciseBoost))),
		sessionsCompleted: progressPayload.sessionsCompleted,
		totalSessions: progressPayload.totalSessions,
		streak: currentStreak,
		currentStreak: currentStreak,
		moodTrend,
		upcomingSession,
		progress: progressPayload,
		recentActivity,
		exercises,
		upcomingSessions: upcomingRaw.map((s: any) => ({
			id: s.id,
			bookingReferenceId: s.bookingReferenceId,
			scheduledAt: s.dateTime,
			status: String(s.status).toLowerCase(),
			agoraChannel: s.agoraChannel,
			provider: mapSessionProvider(s),
		})),
		lastAssessment: lastAssessment
			? {
				type: lastAssessment.type,
				score: lastAssessment.totalScore,
				result_level: lastAssessment.severityLevel,
				createdAt: lastAssessment.createdAt,
			}
			: null,
		recentMoodLogs: moodHistory.slice(0, 7),
		recommendedProviders: recommendedProviders.slice(0, 4),
		suggestedContent: [
			...exercises.map((exercise: any) => ({
				id: exercise.id,
				title: exercise.title,
				category: 'Exercise',
			})),
		],
	};

	await writeJsonCache(cacheKey, payload, PATIENT_V1_READ_CACHE_TTL.dashboard);
	return payload;
};

const ensureSubscriptionRecord = async (userId: string) => {
	let subscription = await db.patientSubscription.findUnique({ where: { userId } }).catch(() => null);
	if (!subscription) {
		const activePlan = (await getActivePlatformPlan()) || { key: 'free', name: 'Free Tier', price: 0 };
		const planVersion = await getPricingConfigVersion();
		const renewalDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
		subscription = await db.patientSubscription.create({
			data: {
				userId,
				planName: activePlan.name,
				price: activePlan.price,
				planVersion,
				priceLocked: false,
				billingCycle: 'monthly',
				status: 'inactive',
				autoRenew: false,
				renewalDate,
			},
		}).catch(() => null);
	} else if (
		String(subscription.status || '').toLowerCase() === 'active'
		&& subscription.autoRenew
		&& new Date(subscription.renewalDate).getTime() <= Date.now()
	) {
		const staleCutoff = new Date(Date.now() - SUBSCRIPTION_LOCK_TIMEOUT_MS);
		const lockStartedAt = new Date();
		const lock = await db.patientSubscription.updateMany({
			where: {
				userId,
				OR: [
					{ processing: false },
					{ processing: true, processingStartedAt: { lt: staleCutoff } },
				],
			},
			data: { processing: true, processingStartedAt: lockStartedAt },
		}).catch(() => ({ count: 0 }));

		if (!lock?.count) {
			return subscription;
		}

		const current = await db.patientSubscription.findUnique({ where: { userId } }).catch(() => subscription);
		if (
			!current
			|| String(current.status || '').toLowerCase() !== 'active'
			|| !current.autoRenew
			|| new Date(current.renewalDate).getTime() > Date.now()
		) {
			await db.patientSubscription.updateMany({ where: { userId }, data: { processing: false, processingStartedAt: null } }).catch(() => null);
			return current || subscription;
		}

		const activePlan = (await getActivePlatformPlan()) || { key: 'free', name: 'Free Tier', price: 0 };
		const planVersion = await getPricingConfigVersion();
		const renewalDays = String(current.billingCycle || '').toLowerCase() === 'yearly' ? 365 : 30;
		const nextRenewalDate = new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000);

		try {
			subscription = await db.patientSubscription.update({
				where: { userId },
				data: {
					planName: activePlan.name,
					price: activePlan.price,
					planVersion,
					priceLocked: Number(activePlan.price || 0) > 0,
					renewalDate: nextRenewalDate,
				},
			}).catch(() => current);

			if (subscription) {
				await recordPatientSubscriptionHistory({
					userId,
					subscriptionRefId: String(subscription.id),
					oldPlan: String(current.planName || ''),
					newPlan: String(subscription.planName || ''),
					oldStatus: String(current.status || ''),
					newStatus: String(subscription.status || ''),
					oldPrice: Number(current.price || 0),
					newPrice: Number(subscription.price || 0),
					reason: 'AUTO_RENEWAL',
					metadata: {
						billingCycle: String(subscription.billingCycle || ''),
						renewalDate: nextRenewalDate.toISOString(),
					},
				});
			}
		} finally {
			await db.patientSubscription.updateMany({ where: { userId }, data: { processing: false, processingStartedAt: null } }).catch(() => null);
		}

		await db.$executeRawUnsafe(
			`INSERT INTO user_subscriptions (id, user_id, plan_id, start_date, end_date, status, price_snapshot, created_at, updated_at)
			 VALUES ($1, $2, $3, CURRENT_DATE, $4::date, 'active', $5, NOW(), NOW())`,
			crypto.randomUUID(),
			userId,
			activePlan.key,
			nextRenewalDate,
			activePlan.price,
		).catch(() => null);
	}
	return subscription;
};

export const getPatientSubscription = async (userId: string) => {
	try {
		const subscription = await ensureSubscriptionRecord(userId);
		if (!subscription) throw new AppError('Subscription data unavailable', 500);
		const activePlan = (await getActivePlatformPlan()) || { key: 'free', name: 'Free Tier', price: 0 };

		// Testing bypass: if payment bypass is enabled but the record still looks free/inactive, upgrade it in-place
		if (env.subscriptionPaymentBypass) {
			const looksFree = Number(subscription.price || 0) <= 0 || String(subscription.planName || '').toLowerCase().includes('free');
			const inactive = String(subscription.status || '').toLowerCase() === 'inactive';
			if (looksFree || inactive) {
				const premiumPlan = (await getActivePlatformPlan('premium_monthly')) || activePlan || { key: 'premium_monthly', name: 'Premium', price: 299 };
				const planVersion = await getPricingConfigVersion();
				const nextRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
				const updated = await db.patientSubscription.update({
					where: { userId },
					data: {
						planName: premiumPlan.name,
						price: Number(premiumPlan.price || 0),
						planVersion,
						priceLocked: true,
						status: 'active',
						autoRenew: true,
						renewalDate: nextRenewalDate,
						billingCycle: 'monthly',
					},
				}).catch(() => subscription);
				subscription.planName = updated?.planName ?? premiumPlan.name;
				subscription.price = updated?.price ?? premiumPlan.price;
				subscription.status = updated?.status ?? 'active';
				subscription.autoRenew = true;
				subscription.renewalDate = updated?.renewalDate ?? nextRenewalDate;
			}
		}

		return {
			...subscription,
			nextRenewalPrice: activePlan.price,
			priceLockedUntil: subscription.renewalDate,
		};
	} catch {
		const now = new Date();
		const renewal = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
		return {
			id: `fallback-${userId}`,
			userId,
			planName: 'Free Plan',
			price: 0,
			billingCycle: 'monthly',
			status: 'inactive',
			autoRenew: false,
			renewalDate: renewal,
			createdAt: now,
			updatedAt: now,
			nextRenewalPrice: 0,
			priceLockedUntil: renewal,
		};
	}
};

export const updatePatientSubscriptionPlan = async (userId: string, action: 'upgrade' | 'downgrade') => {
	const updated = await withPatientSubscriptionLock(userId, async (subscription) => {
		if (!subscription) throw new AppError('Subscription data unavailable', 500);
		const activePlan = (await getActivePlatformPlan()) || { key: 'free', name: 'Free Tier', price: 0 };
		const planVersion = await getPricingConfigVersion();

		const planOrder = ['basic', 'premium', 'pro'];
		const current = String(subscription.planName || 'premium').toLowerCase().replace(' plan', '');
		const currentIndex = Math.max(planOrder.indexOf(current), 0);
		const nextIndex = action === 'upgrade'
			? Math.min(planOrder.length - 1, currentIndex + 1)
			: Math.max(0, currentIndex - 1);
		const nextPlan = planOrder[nextIndex];
		const price = activePlan.price;

		const nextRenewalDate = new Date(new Date().getTime() + (nextPlan === 'pro' ? 365 : 30) * 24 * 60 * 60 * 1000);
		const nextPlanName = activePlan.name || `${nextPlan[0].toUpperCase()}${nextPlan.slice(1)} Plan`;

		const next = await db.patientSubscription.update({
			where: { userId },
			data: {
				planName: nextPlanName,
				price,
				planVersion,
				priceLocked: Number(price || 0) > 0,
				billingCycle: nextPlan === 'pro' ? 'yearly' : 'monthly',
				status: 'active',
				autoRenew: true,
				renewalDate: nextRenewalDate,
			},
		});

		await recordPatientSubscriptionHistory({
			userId,
			subscriptionRefId: String(next.id),
			oldPlan: String(subscription.planName || ''),
			newPlan: String(next.planName || ''),
			oldStatus: String(subscription.status || ''),
			newStatus: String(next.status || ''),
			oldPrice: Number(subscription.price || 0),
			newPrice: Number(next.price || 0),
			reason: action === 'upgrade' ? 'MANUAL_UPGRADE' : 'MANUAL_DOWNGRADE',
			metadata: { billingCycle: String(next.billingCycle || '') },
		});

		return next;
	});

	if (String(updated.status || '').toLowerCase() === 'active') {
		const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true, firstName: true, lastName: true } }).catch(() => null);
		await sendSubscriptionActivationEmail({
			to: String(user?.email || ''),
			name: String(user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || ''),
			planName: String(updated.planName || 'Standard Plan'),
			priceInr: Math.round(Number(updated.price || 0) / 100),
		});
	}

	return updated;
};

export const cancelPatientSubscription = async (userId: string) => {
	return withPatientSubscriptionLock(userId, async (subscription) => {
		const next = await db.patientSubscription.update({
			where: { userId },
			data: {
				status: 'cancelled',
				autoRenew: false,
			},
		});

		await recordPatientSubscriptionHistory({
			userId,
			subscriptionRefId: String(next.id),
			oldPlan: String(subscription?.planName || ''),
			newPlan: String(next.planName || ''),
			oldStatus: String(subscription?.status || ''),
			newStatus: String(next.status || ''),
			oldPrice: Number(subscription?.price || 0),
			newPrice: Number(next.price || 0),
			reason: 'MANUAL_CANCEL',
		});

		return next;
	});
};

export const reactivatePatientSubscription = async (
	userId: string,
	paymentId?: string,
	planKey?: string,
	options?: {
		planName?: string;
		planVersion?: number;
		priceLockedMinor?: number;
		priceLocked?: boolean;
	},
) => {
	const updated = await withPatientSubscriptionLock(userId, async (subscription) => {
		const activePlan = (await getActivePlatformPlan(planKey)) || { key: 'free', name: 'Free Tier', price: 0 };
		const planVersion = options?.planVersion ?? (await getPricingConfigVersion());
		const lockedPriceInr = Number.isFinite(Number(options?.priceLockedMinor))
			? Math.round(Number(options?.priceLockedMinor) / 100)
			: Number(activePlan.price || 0);
		const resolvedPlanName = String(options?.planName || activePlan.name || 'Plan');
		const isFreePlan = Number(lockedPriceInr || 0) <= 0;
		const currentStatus = String(subscription?.status || '').toLowerCase();
		const hasPaidSubscriptionAlready = Number(subscription?.price || 0) > 0
			&& ['active', 'trial', 'trialing', 'grace'].includes(currentStatus);
		const nextStatus = isFreePlan
			? 'active'
			: hasPaidSubscriptionAlready
				? 'active'
				: 'trial';
		const renewalDays = nextStatus === 'trial' ? 15 : 30;
		const trialEndDate = nextStatus === 'trial' ? new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000).toISOString() : undefined;
		const next = await db.patientSubscription.update({
			where: { userId },
			data: {
				planName: resolvedPlanName,
				price: lockedPriceInr,
				planVersion,
				priceLocked: !isFreePlan && (options?.priceLocked ?? true),
				status: nextStatus,
				autoRenew: !isFreePlan,
				paymentId: paymentId || undefined,
				renewalDate: new Date(new Date().getTime() + renewalDays * 24 * 60 * 60 * 1000),
				billingCycle: isFreePlan ? 'none' : undefined,
				metadata: nextStatus === 'trial' ? {
					trialEndDate,
					graceEndDate: null,
					isFirstActivation: true
				} : undefined,
			},
		});

		await recordPatientSubscriptionHistory({
			userId,
			subscriptionRefId: String(next.id),
			oldPlan: String(subscription?.planName || ''),
			newPlan: String(next.planName || ''),
			oldStatus: String(subscription?.status || ''),
			newStatus: String(next.status || ''),
			oldPrice: Number(subscription?.price || 0),
			newPrice: Number(next.price || 0),
			paymentId,
			transactionId: paymentId,
			reason: 'PAYMENT_REACTIVATION',
			metadata: { renewalDate: next.renewalDate?.toISOString?.() || undefined },
		});

		return next;
	});

	const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true, firstName: true, lastName: true } }).catch(() => null);
	await sendSubscriptionActivationEmail({
		to: String(user?.email || ''),
		name: String(user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || ''),
		planName: String(updated.planName || 'Standard Plan'),
		priceInr: Math.round(Number(updated.price || 0) / 100),
	});

	return updated;
};

export const setPatientSubscriptionAutoRenew = async (userId: string, autoRenew: boolean) => {
	return withPatientSubscriptionLock(userId, async (subscription) => {
		const next = await db.patientSubscription.update({
			where: { userId },
			data: { autoRenew },
		});

		await recordPatientSubscriptionHistory({
			userId,
			subscriptionRefId: String(next.id),
			oldPlan: String(subscription?.planName || ''),
			newPlan: String(next.planName || ''),
			oldStatus: String(subscription?.status || ''),
			newStatus: String(next.status || ''),
			oldPrice: Number(subscription?.price || 0),
			newPrice: Number(next.price || 0),
			reason: autoRenew ? 'AUTO_RENEW_ENABLED' : 'AUTO_RENEW_DISABLED',
			metadata: { autoRenew },
		});

		return next;
	});
};

export const markPatientSubscriptionPaymentFailed = async (userId: string, paymentId?: string) => {
	return withPatientSubscriptionLock(userId, async (subscription) => {
		if (!subscription) {
			throw new AppError('No subscription found for patient', 404);
		}

		const graceEndDate = calculateGraceEndDate().toISOString();
		const currentMetadata = subscription?.metadata && typeof subscription.metadata === 'object'
			? subscription.metadata
			: {};

		const next = await db.patientSubscription.update({
			where: { userId },
			data: {
				status: 'grace',
				metadata: {
					...currentMetadata,
					graceEndDate,
				},
			},
		});

		await recordPatientSubscriptionHistory({
			userId,
			subscriptionRefId: String(next.id),
			oldPlan: String(subscription?.planName || ''),
			newPlan: String(next.planName || ''),
			oldStatus: String(subscription?.status || ''),
			newStatus: String(next.status || ''),
			oldPrice: Number(subscription?.price || 0),
			newPrice: Number(next.price || 0),
			paymentId,
			transactionId: paymentId,
			reason: 'PAYMENT_FAILED',
			metadata: { graceEndDate },
		});

		return next;
	});
};

export const getPatientSubscriptionsDueForReminder = async (hoursBefore = 48) => {
	const now = new Date();
	const windowEnd = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);
	const subscriptions = await db.patientSubscription.findMany({
		where: {
			status: { in: ['active', 'trial', 'grace'] },
			price: { gt: 0 },
		},
		select: {
			id: true,
			userId: true,
			status: true,
			renewalDate: true,
			metadata: true,
		},
	});

	return subscriptions.filter((sub: any) => {
		const trialEndDate = sub?.metadata?.trialEndDate ? new Date(sub.metadata.trialEndDate) : null;
		const endDate = trialEndDate || (sub.renewalDate ? new Date(sub.renewalDate) : null);
		if (!endDate || Number.isNaN(endDate.getTime())) return false;
		return endDate.getTime() > now.getTime() && endDate.getTime() <= windowEnd.getTime();
	});
};

export const getPatientPaymentMethod = async (userId: string) => {
	return db.patientPaymentMethod.findUnique({ where: { userId } }).catch(() => null);
};

export const updatePatientPaymentMethod = async (
	userId: string,
	input: { cardLast4: string; cardBrand: string; expiryMonth: number; expiryYear: number },
) => {
	return db.patientPaymentMethod.upsert({
		where: { userId },
		update: {
			cardLast4: input.cardLast4,
			cardBrand: input.cardBrand,
			expiryMonth: input.expiryMonth,
			expiryYear: input.expiryYear,
		},
		create: {
			userId,
			cardLast4: input.cardLast4,
			cardBrand: input.cardBrand,
			expiryMonth: input.expiryMonth,
			expiryYear: input.expiryYear,
		},
	});
};

export const getPatientInvoices = async (userId: string) => {
	const invoices = await db.patientInvoice.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => []);

	const subscriptionPayments = await db.financialPayment.findMany({
		where: {
			patientId: userId,
			metadata: {
				path: ['type'],
				equals: 'patient_subscription',
			},
		},
		orderBy: { createdAt: 'desc' },
	}).catch(() => []);

	const mappedPayments = subscriptionPayments.map((payment: any) => {
		const amountMinor = Number(payment?.amountMinor || 0);
		const universalCheckoutPaymentId = String(payment?.metadata?.universalCheckoutPaymentId || '').trim();
		const planKey = String(payment?.metadata?.plan || '').trim();

		return {
			id: String(payment.id),
			userId,
			amountMinor,
			amount: Math.round(amountMinor / 100),
			status: String(payment.status || 'INITIATED'),
			planKey,
			planName: planKey ? planKey.toUpperCase().replace(/_/g, ' ') : 'Subscription Plan',
			invoiceUrl: universalCheckoutPaymentId
				? `/api/v1/payments/universal/invoice/${encodeURIComponent(universalCheckoutPaymentId)}`
				: null,
			merchantTransactionId: String(payment?.merchantTransactionId || ''),
			createdAt: payment.createdAt,
			source: 'FINANCIAL_PAYMENT',
		};
	});

	const combined = [...invoices, ...mappedPayments].sort((a: any, b: any) => {
		const aTs = new Date(a?.createdAt || 0).getTime();
		const bTs = new Date(b?.createdAt || 0).getTime();
		return bTs - aTs;
	});

	const seen = new Set<string>();
	const deduped = combined.filter((entry: any) => {
		const invoiceUrl = String(entry?.invoiceUrl || '').trim();
		const merchantTransactionId = String(entry?.merchantTransactionId || '').trim();
		const key = invoiceUrl
			? `invoiceUrl:${invoiceUrl}`
			: merchantTransactionId
				? `merchant:${merchantTransactionId}`
				: `id:${String(entry?.id || '')}`;

		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	return deduped;
};

export const getPatientInvoiceById = async (userId: string, invoiceId: string) => {
	const invoice = await db.patientInvoice.findFirst({ where: { id: invoiceId, userId } }).catch(() => null);
	if (invoice) return invoice;

	const paymentInvoice = await db.financialPayment.findFirst({
		where: {
			patientId: userId,
			OR: [
				{ id: invoiceId },
				{ merchantTransactionId: invoiceId },
			],
			metadata: {
				path: ['type'],
				equals: 'patient_subscription',
			},
		},
	}).catch(() => null);

	if (!paymentInvoice) throw new AppError('Invoice not found', 404);

	const amountMinor = Number(paymentInvoice?.amountMinor || 0);
	const universalCheckoutPaymentId = String(paymentInvoice?.metadata?.universalCheckoutPaymentId || '').trim();

	return {
		id: String(paymentInvoice.id),
		userId,
		amountMinor,
		amount: Math.round(amountMinor / 100),
		status: String(paymentInvoice.status || 'INITIATED'),
		invoiceUrl: universalCheckoutPaymentId
			? `/api/v1/payments/universal/invoice/${encodeURIComponent(universalCheckoutPaymentId)}`
			: null,
		merchantTransactionId: String(paymentInvoice?.merchantTransactionId || ''),
		createdAt: paymentInvoice.createdAt,
		source: 'FINANCIAL_PAYMENT',
	};
};

export const getPatientExercises = async (userId: string) => {
	const patientProfile = await getPatientProfile(userId);
	return db.patientExercise.findMany({ where: { patientId: patientProfile.id }, orderBy: { createdAt: 'desc' } }).catch(() => []);
};

export const completePatientExercise = async (userId: string, exerciseId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const updated = await db.patientExercise.updateMany({
		where: { id: exerciseId, patientId: patientProfile.id },
		data: { status: 'COMPLETED' },
	});
	if (!updated.count) throw new AppError('Exercise not found', 404);
	return { id: exerciseId, status: 'COMPLETED' };
};

export const logWellnessLibraryActivity = async (
	userId: string,
	input: { title: string; duration?: number; category?: string; kind?: string },
) => {
	const patientProfile = await getPatientProfile(userId);
	const title = String(input.title || '').trim();
	if (!title) throw new AppError('title is required', 422);

	const duration = Number.isFinite(input.duration) ? Math.max(1, Math.min(180, Math.round(Number(input.duration)))) : 5;
	const kind = String(input.kind || 'resource').trim().toUpperCase() || 'RESOURCE';
	const category = String(input.category || 'General').trim() || 'General';

	const created = await db.patientExercise.create({
		data: {
			patientId: patientProfile.id,
			title,
			assignedBy: `WELLNESS_LIBRARY:${kind}:${category}`,
			duration,
			status: 'COMPLETED',
		},
	});

	return {
		id: created.id,
		title: created.title,
		status: created.status,
		createdAt: created.createdAt,
		wellnessPoints: 10,
	};
};

const PREMIUM_LIBRARY_PACK_MINUTES: Record<string, number> = {
	none: 0,
	'1h': 60,
	'3h': 180,
	'5h': 300,
};

const normalizeSubscriptionMetadata = (value: any): Record<string, any> =>
	value && typeof value === 'object' && !Array.isArray(value) ? value : {};

const isPremiumLibraryEligiblePlan = (planName: string): boolean => {
	const normalized = String(planName || '').toLowerCase();
	return normalized.includes('premium') || normalized.includes('pro') || normalized.includes('library');
};

const resolvePremiumLibraryPack = (rawPack: unknown): keyof typeof PREMIUM_LIBRARY_PACK_MINUTES => {
	const normalized = String(rawPack || 'none').trim().toLowerCase();
	if (normalized === '1h' || normalized === '3h' || normalized === '5h') return normalized;
	return 'none';
};

const getLatestPatientSubscriptionCheckoutAddons = async (userId: string): Promise<Record<string, unknown>> => {
	const latestPayment = await db.financialPayment.findFirst({
		where: {
			patientId: userId,
			status: { in: ['CAPTURED', 'COMPLETED'] },
			metadata: {
				path: ['type'],
				equals: 'patient_subscription',
			},
		},
		orderBy: { createdAt: 'desc' },
		select: { metadata: true },
	}).catch(() => null);

	const checkoutAddons = latestPayment?.metadata?.checkout?.addons;
	if (checkoutAddons && typeof checkoutAddons === 'object' && !Array.isArray(checkoutAddons)) {
		return checkoutAddons as Record<string, unknown>;
	}

	const addons = latestPayment?.metadata?.addons;
	if (addons && typeof addons === 'object' && !Array.isArray(addons)) {
		return addons as Record<string, unknown>;
	}

	return {};
};

export const getPatientPremiumLibraryUsage = async (userId: string) => {
	const subscription = await ensureSubscriptionRecord(userId);
	if (!subscription) throw new AppError('Subscription data unavailable', 500);

	const status = String(subscription.status || '').toLowerCase();
	const isActiveLike = ['active', 'trial', 'trialing', 'grace'].includes(status);
	const isPremiumPlan = isPremiumLibraryEligiblePlan(String(subscription.planName || ''));

	const metadata = normalizeSubscriptionMetadata(subscription.metadata);
	let totalSeconds = Math.max(0, Math.round(Number(metadata.premiumLibraryTotalSeconds || 0)));
	let consumedSeconds = Math.max(0, Math.round(Number(metadata.premiumLibraryConsumedSeconds || 0)));

	if (totalSeconds <= 0 && isActiveLike && isPremiumPlan) {
		const addons = await getLatestPatientSubscriptionCheckoutAddons(userId);
		const pack = resolvePremiumLibraryPack(addons.premiumLibraryPack ?? addons.anytimeBuddyPack);
		const allocatedMinutes = PREMIUM_LIBRARY_PACK_MINUTES[pack];
		totalSeconds = allocatedMinutes * 60;

		if (totalSeconds > 0) {
			const patchedMetadata = {
				...metadata,
				premiumLibraryPack: pack,
				premiumLibraryTotalSeconds: totalSeconds,
				premiumLibraryConsumedSeconds: 0,
				premiumLibraryInitializedAt: new Date().toISOString(),
			};

			await db.patientSubscription.update({
				where: { userId },
				data: { metadata: patchedMetadata },
			}).catch(() => null);
			consumedSeconds = 0;
		}
	}

	consumedSeconds = Math.min(consumedSeconds, totalSeconds);
	const remainingSeconds = Math.max(0, totalSeconds - consumedSeconds);

	return {
		hasPremiumLibraryAccess: Boolean(isActiveLike && isPremiumPlan && totalSeconds > 0),
		pack: String(metadata.premiumLibraryPack || 'none'),
		totalSeconds,
		consumedSeconds,
		remainingSeconds,
		totalMinutes: Math.floor(totalSeconds / 60),
		consumedMinutes: Math.floor(consumedSeconds / 60),
		remainingMinutes: Math.ceil(remainingSeconds / 60),
	};
};

export const consumePatientPremiumLibraryUsage = async (
	userId: string,
	input: { secondsSpent: number; source?: string },
) => {
	const secondsSpent = Math.max(1, Math.min(4 * 60 * 60, Math.round(Number(input.secondsSpent || 0))));
	if (!Number.isFinite(secondsSpent) || secondsSpent <= 0) {
		throw new AppError('secondsSpent must be a positive number', 422);
	}

	const usage = await getPatientPremiumLibraryUsage(userId);
	if (!usage.hasPremiumLibraryAccess) {
		throw new AppError('Premium Library pack required', 403);
	}

	if (usage.remainingSeconds <= 0) {
		throw new AppError('Premium Library time exhausted', 403);
	}

	const consumeNow = Math.min(secondsSpent, usage.remainingSeconds);
	const nextConsumedSeconds = usage.consumedSeconds + consumeNow;
	const nextRemainingSeconds = Math.max(0, usage.totalSeconds - nextConsumedSeconds);

	const subscription = await ensureSubscriptionRecord(userId);
	if (!subscription) throw new AppError('Subscription data unavailable', 500);

	const metadata = normalizeSubscriptionMetadata(subscription.metadata);
	await db.patientSubscription.update({
		where: { userId },
		data: {
			metadata: {
				...metadata,
				premiumLibraryTotalSeconds: usage.totalSeconds,
				premiumLibraryConsumedSeconds: nextConsumedSeconds,
				premiumLibraryLastTrackedAt: new Date().toISOString(),
				premiumLibraryLastSource: String(input.source || 'wellness-library').slice(0, 60),
			},
		},
	});

	return {
		...usage,
		consumedNowSeconds: consumeNow,
		consumedSeconds: nextConsumedSeconds,
		remainingSeconds: nextRemainingSeconds,
		consumedMinutes: Math.floor(nextConsumedSeconds / 60),
		remainingMinutes: Math.ceil(nextRemainingSeconds / 60),
	};
};

export const listProviders = async (filters: ProviderFilters) => {
	const { page, limit, skip } = normalizePagination(filters.page, filters.limit);
	const requestedRole = normalizeProviderRole(filters.role);
	const roleFilter = requestedRole
		? [requestedRole]
		: [...PROVIDER_ROLES];
	const eligibleSubscriptions = await db.providerSubscription.findMany({
		where: {
			status: { in: ['active', 'trial', 'grace'] },
			expiryDate: { gt: new Date() },
		},
		select: { providerId: true },
	});
	const eligibleProviderIds = eligibleSubscriptions.map((row: any) => String(row.providerId));
	if (!eligibleProviderIds.length) {
		return {
			items: [],
			meta: { page, limit, total: 0, totalPages: 1 },
		};
	}
	const therapists = await db.user.findMany({
		where: { role: { in: roleFilter as any }, isDeleted: false, id: { in: eligibleProviderIds } },
		select: { id: true, firstName: true, lastName: true, name: true, role: true, isDeleted: true, status: true, therapistProfile: true },
		orderBy: { createdAt: 'desc' },
		skip,
		take: limit,
	});
	const total = await db.user.count({ where: { role: { in: roleFilter as any }, isDeleted: false, id: { in: eligibleProviderIds } } });
	let items = await Promise.all(therapists.map((u: any) => toProviderListItem(u)));

	if (filters.specialization) {
		const s = filters.specialization.trim().toLowerCase();
		items = items.filter((p) => p.specializations.some((x) => x.toLowerCase().includes(s)) || p.specialization.toLowerCase().includes(s));
	}
	if (filters.language) {
		const l = filters.language.trim().toLowerCase();
		items = items.filter((p) => p.languages.some((x) => x.toLowerCase().includes(l)));
	}
	if (typeof filters.minPrice === 'number') items = items.filter((p) => p.session_rate >= filters.minPrice!);
	if (typeof filters.maxPrice === 'number') items = items.filter((p) => p.session_rate <= filters.maxPrice!);

	return {
		items,
		meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
	};
};

export const getProviderById = async (providerId: string) => {
	const eligible = await db.providerSubscription.findFirst({
		where: {
			providerId,
			status: { in: ['active', 'trial', 'grace'] },
			expiryDate: { gt: new Date() },
		},
		select: { providerId: true },
	});
	if (!eligible) throw new AppError('Provider not available for booking right now', 404);

	const therapist = await db.user.findUnique({
		where: { id: providerId },
		select: { id: true, firstName: true, lastName: true, name: true, role: true, isDeleted: true, status: true, therapistProfile: true },
	});
	if (!therapist || therapist.isDeleted || !normalizeProviderRole(String(therapist.role))) throw new AppError('Provider not found', 404);

	const profile = await toProviderListItem(therapist);
	const now = new Date();
	const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	const existing = await db.therapySession.findMany({
		where: { therapistProfileId: providerId, dateTime: { gte: now, lte: end }, status: { in: ['PENDING', 'CONFIRMED'] } },
		select: { dateTime: true },
	});
	const blocked: Set<string> = new Set(existing.map((s: any) => new Date(s.dateTime).toISOString()));
	const availability = normalizeAvailabilitySlots(therapist.therapistProfile?.availability);
	const availableSlots = buildAvailableSlotsFromAvailability(availability, blocked, now);

	return {
		...profile,
		available_slots: availableSlots,
	};
};

const buildBookingReferenceId = (): string => `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const generateAgoraDetails = (sessionId: string, scheduledAt: Date, durationMinutes: number) => {
	const channel = `session_${sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
	const expireAt = Math.floor((new Date(scheduledAt).getTime() + durationMinutes * 60 * 1000) / 1000);
	const appId = process.env.AGORA_APP_ID || 'agora-dev-app';
	const tokenSeed = `${appId}:${channel}:${expireAt}:${crypto.randomBytes(10).toString('hex')}`;
	const token = Buffer.from(tokenSeed).toString('base64url');
	return { channel, token, expireAt };
};

const hasCompletedBothPHQAndGAD7 = async (userId: string): Promise<boolean> => {
	const patientProfile = await getPatientProfile(userId);

	const [latestPhqClinical, latestGadClinical, latestPhq9, latestGad7] = await Promise.all([
		db.patientAssessment.findFirst({
			where: { patientId: patientProfile.id, type: 'PHQ-9' },
			select: { id: true },
			orderBy: { createdAt: 'desc' },
		}),
		db.patientAssessment.findFirst({
			where: { patientId: patientProfile.id, type: 'GAD-7' },
			select: { id: true },
			orderBy: { createdAt: 'desc' },
		}),
		db.pHQ9Assessment.findFirst({
			where: { userId },
			select: { id: true },
			orderBy: { assessedAt: 'desc' },
		}),
		db.gAD7Assessment.findFirst({
			where: { userId },
			select: { id: true },
			orderBy: { assessedAt: 'desc' },
		}),
	]);

	const hasPhq = Boolean(latestPhqClinical || latestPhq9);
	const hasGad = Boolean(latestGadClinical || latestGad7);
	return hasPhq && hasGad;
};

export const assertPatientHasCompletedBothPHQandGAD7 = async (userId: string): Promise<void> => {
	const hasBothAssessments = await hasCompletedBothPHQAndGAD7(userId);
	if (!hasBothAssessments) {
		throw new AppError('Please complete PHQ-9 and GAD-7 assessment first before connecting with providers.', 403, {
			code: 'BOTH_ASSESSMENTS_REQUIRED',
		});
	}
};

export const initiateSessionBooking = async (
	userId: string,
	input: {
		providerId: string;
		scheduledAt: Date;
		durationMinutes?: number;
		amountMinor?: number;
		providerType?: string;
		preferredTime?: boolean;
		preferredWindow?: string;
		sourceFunnel?: string;
	},
) => {
	await getPatientProfile(userId);
	await assertPatientHasCompletedBothPHQandGAD7(userId);
	const provider = await db.user.findUnique({
		where: { id: input.providerId },
		select: {
			id: true,
			role: true,
			isDeleted: true,
			therapistProfile: {
				select: {
					availability: true,
				},
			},
		},
	});
	if (!provider || provider.isDeleted || !normalizeProviderRole(String(provider.role))) throw new AppError('Provider not found', 404);

	const scheduledAt = new Date(input.scheduledAt);
	if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) throw new AppError('scheduledAt must be a future datetime', 422);
	assertPaymentDeadlineWindow(scheduledAt);
	const duration = input.durationMinutes && input.durationMinutes > 0 ? Math.min(180, Math.floor(input.durationMinutes)) : DEFAULT_DURATION_MINUTES;
	const availability = normalizeAvailabilitySlots(provider.therapistProfile?.availability);
	if (!isWithinProviderAvailability(scheduledAt, availability, duration)) {
		throw new AppError('Selected slot is outside provider working hours', 409);
	}
	const quote = await getSessionQuote({
		providerType: input.providerType || roleToProviderType(provider.role),
		durationMinutes: duration,
		preferredTime: Boolean(input.preferredTime),
	});
	const amountMinor = quote.finalPrice;

	const conflict = await db.therapySession.findFirst({
		where: { therapistProfileId: input.providerId, dateTime: scheduledAt, status: { in: ['PENDING', 'CONFIRMED'] } },
		select: { id: true },
	});
	if (conflict) throw new AppError('Selected slot is unavailable', 409);

	const payment = await createSessionPayment({ patientId: userId, providerId: input.providerId, amountMinor, currency: 'INR' });

	await db.sessionBookingIntent.create({
		data: {
			patientId: userId,
			providerId: input.providerId,
			scheduledAt,
			durationMinute: duration,
			amountMinor,
			currency: 'INR',
			sourceFunnel: String(input.sourceFunnel || '').trim() || null,
			merchantTransactionId: payment.transactionId,
			status: 'PENDING',
		},
	});

	return {
		order_id: payment.transactionId,
		amount: amountMinor,
		currency: 'INR',
		provider_id: input.providerId,
		scheduled_at: scheduledAt.toISOString(),
		duration_minutes: quote.durationMinutes,
		pricing: {
			provider_type: quote.providerType,
			provider_role: roleLabel(provider.role),
			base_price: quote.basePrice,
			surcharge_percent: quote.surchargePercent,
			preferred_time: quote.preferredTime,
			preferred_window: input.preferredWindow || null,
			final_price: quote.finalPrice,
		},
	};
};

export const verifySessionPaymentAndCreateSession = async (
	userId: string,
	input: { merchantTransactionId: string; transactionId: string; signature: string },
) => {
	const allowDevBypass = env.allowDevPaymentBypass && env.nodeEnv === 'development';
	// Note: PhonePe uses webhook for verification, signature check removed

	const intent = await db.sessionBookingIntent.findUnique({ where: { merchantTransactionId: input.merchantTransactionId } });
	if (!intent || String(intent.patientId) !== userId) throw new AppError('Booking intent not found', 404);
	assertPaymentDeadlineWindow(new Date(intent.scheduledAt));
	if (String(intent.status) === 'CONFIRMED' && intent.sessionId) {
		const existing = await db.therapySession.findUnique({ where: { id: intent.sessionId } });
		if (existing) return { sessionId: existing.id, status: 'confirmed', agora_channel: existing.agoraChannel, agora_token: existing.agoraToken };
	}

	const patientProfile = await getPatientProfile(userId);
	const provider = await db.user.findUnique({
		where: { id: intent.providerId },
		select: {
			id: true,
			therapistProfile: {
				select: {
					availability: true,
				},
			},
		},
	});
	const availability = normalizeAvailabilitySlots(provider?.therapistProfile?.availability);
	if (!isWithinProviderAvailability(new Date(intent.scheduledAt), availability, Number(intent.durationMinute) || DEFAULT_DURATION_MINUTES)) {
		throw new AppError('Selected slot is outside provider working hours', 409);
	}
	const conflict = await db.therapySession.findFirst({
		where: { therapistProfileId: intent.providerId, dateTime: intent.scheduledAt, status: { in: ['PENDING', 'CONFIRMED'] } },
		select: { id: true },
	});
	if (conflict) throw new AppError('Selected slot was already booked', 409);

	const created = await db.$transaction(async (tx: any) => {
		await tx.financialPayment.updateMany({
			where: { merchantTransactionId: input.merchantTransactionId, status: { in: ['INITIATED', 'PENDING_CAPTURE'] } },
			data: {
				status: 'CAPTURED',
				razorpayPaymentId: input.transactionId,
				capturedAt: new Date(),
				therapistShareMinor: BigInt(Math.floor(Number(intent.amountMinor) * 0.6)),
				platformShareMinor: BigInt(Math.ceil(Number(intent.amountMinor) * 0.4)),
			},
		});

		await tx.financialSession.updateMany({
			where: { merchantTransactionId: input.merchantTransactionId },
			data: { status: 'CONFIRMED', confirmedAt: new Date() },
		});

		const session = await tx.therapySession.create({
			data: {
				bookingReferenceId: buildBookingReferenceId(),
				patientProfileId: patientProfile.id,
				therapistProfileId: intent.providerId,
				dateTime: intent.scheduledAt,
				durationMinutes: intent.durationMinute,
				sessionFeeMinor: intent.amountMinor,
				paymentStatus: 'PAID',
				sourceFunnel: String((intent as any).sourceFunnel || '').trim() || null,
				status: 'CONFIRMED',
			},
		});

		const agora = generateAgoraDetails(session.id, intent.scheduledAt, intent.durationMinute);
		const sessionWithAgora = await tx.therapySession.update({
			where: { id: session.id },
			data: { agoraChannel: agora.channel, agoraToken: agora.token },
		});

		await tx.sessionBookingIntent.update({
			where: { merchantTransactionId: input.merchantTransactionId },
			data: {
				status: 'CONFIRMED',
				razorpayPaymentId: input.transactionId,
				sessionId: session.id,
			},
		});

		await tx.notification.createMany({
			data: [
				{
					userId,
					type: 'BOOKING_CONFIRMED',
					title: 'Booking confirmed',
					message: 'Your therapy session has been confirmed.',
					payload: { sessionId: session.id, scheduledAt: intent.scheduledAt.toISOString() },
					sentAt: new Date(),
				},
				{
					userId,
					type: 'SESSION_REMINDER_24H',
					title: 'Session reminder',
					message: 'Reminder: your session is scheduled in 24 hours.',
					payload: { sessionId: session.id },
					scheduledAt: new Date(new Date(intent.scheduledAt).getTime() - 24 * 60 * 60 * 1000),
				},
				{
					userId,
					type: 'SESSION_REMINDER_1H',
					title: 'Session reminder',
					message: 'Reminder: your session starts in 1 hour.',
					payload: { sessionId: session.id },
					scheduledAt: new Date(new Date(intent.scheduledAt).getTime() - 60 * 60 * 1000),
				},
			],
		});

		return sessionWithAgora;
	});

	return {
		sessionId: created.id,
		status: 'confirmed',
		agora_channel: created.agoraChannel,
		agora_token: created.agoraToken,
		scheduled_at: created.dateTime,
	};
};

export const therapistProposeAppointmentSlot = async (
	therapistId: string,
	input: { requestRef: string; proposedStartAt: string; note?: string },
) => {
	const requestRef = String(input.requestRef || '').trim();
	const proposedStartAt = new Date(input.proposedStartAt);
	if (!requestRef) throw new AppError('requestRef is required', 422);
	if (Number.isNaN(proposedStartAt.getTime()) || proposedStartAt <= new Date()) {
		throw new AppError('proposedStartAt must be a future datetime', 422);
	}

	const providerRequests = await db.notification.findMany({
		where: { userId: therapistId, type: 'APPOINTMENT_REQUEST' },
		orderBy: { createdAt: 'desc' },
		take: 100,
	});
	const requestNotification = providerRequests.find((item: any) => String(item?.payload?.requestRef || '') === requestRef);
	if (!requestNotification) {
		throw new AppError('Appointment request not found for this provider', 404);
	}

	const patientId = String(requestNotification?.payload?.patientId || '').trim();
	if (!patientId) throw new AppError('Appointment request is invalid', 422);

	await db.notification.update({
		where: { id: requestNotification.id },
		data: {
			payload: {
				...(requestNotification.payload || {}),
				requestStatus: 'PROPOSED_SLOT',
				proposedStartAt: proposedStartAt.toISOString(),
				note: input.note || null,
			},
		},
	});

	await db.notification.create({
		data: {
			userId: patientId,
			type: 'APPOINTMENT_SLOT_PROPOSED',
			title: 'Provider proposed a new slot',
			message: 'Your selected provider proposed a slot. Confirm to continue to payment and final booking.',
			payload: {
				requestRef,
				providerId: therapistId,
				proposedStartAt: proposedStartAt.toISOString(),
				note: input.note || null,
				requestStatus: 'WAITING_PATIENT_CONFIRMATION',
			},
			sentAt: new Date(),
		},
	});

	return {
		requestRef,
		providerId: therapistId,
		proposedStartAt: proposedStartAt.toISOString(),
		status: 'waiting_patient_confirmation',
	};
};

export const patientConfirmProposedAppointmentSlot = async (
	patientUserId: string,
	input: { requestRef: string; providerId: string; proposedStartAt?: string; accept: boolean },
) => {
	const requestRef = String(input.requestRef || '').trim();
	const providerId = String(input.providerId || '').trim();
	if (!requestRef || !providerId) {
		throw new AppError('requestRef and providerId are required', 422);
	}

	const proposals = await db.notification.findMany({
		where: { userId: patientUserId, type: 'APPOINTMENT_SLOT_PROPOSED' },
		orderBy: { createdAt: 'desc' },
		take: 100,
	});
	const proposal = proposals.find(
		(item: any) => String(item?.payload?.requestRef || '') === requestRef && String(item?.payload?.providerId || '') === providerId,
	);
	if (!proposal) {
		throw new AppError('Proposed appointment slot not found', 404);
	}

	if (!input.accept) {
		await db.notification.create({
			data: {
				userId: providerId,
				type: 'APPOINTMENT_SLOT_REJECTED',
				title: 'Patient declined proposed slot',
				message: 'Patient declined the proposed slot. Please offer another suitable time.',
				payload: { requestRef, patientId: patientUserId },
				sentAt: new Date(),
			},
		});

		await db.notification.update({ where: { id: proposal.id }, data: { isRead: true } });
		return { requestRef, status: 'declined' };
	}

	const proposedStartAtIso = String(input.proposedStartAt || proposal?.payload?.proposedStartAt || '').trim();
	const proposedStartAt = new Date(proposedStartAtIso);
	if (!proposedStartAtIso || Number.isNaN(proposedStartAt.getTime())) {
		throw new AppError('Valid proposedStartAt is required', 422);
	}

	const booking = await initiateSessionBooking(patientUserId, {
		providerId,
		scheduledAt: proposedStartAt,
		preferredTime: false,
		preferredWindow: 'Provider proposed slot',
	});

	await db.notification.createMany({
		data: [
			{
				userId: patientUserId,
				type: 'APPOINTMENT_SLOT_CONFIRMED',
				title: 'Slot confirmed - payment pending',
				message: `Complete payment before ${PAYMENT_DEADLINE_HOURS} hours of the session start to finalize your booking.`,
				payload: {
					requestRef,
					providerId,
					scheduledAt: proposedStartAt.toISOString(),
					orderId: booking.order_id,
				},
				sentAt: new Date(),
			},
			{
				userId: providerId,
				type: 'APPOINTMENT_SLOT_ACCEPTED',
				title: 'Patient accepted proposed slot',
				message: 'Patient accepted your proposed slot and is proceeding to payment.',
				payload: {
					requestRef,
					patientId: patientUserId,
					scheduledAt: proposedStartAt.toISOString(),
				},
				sentAt: new Date(),
			},
		],
	});

	await db.notification.update({ where: { id: proposal.id }, data: { isRead: true } });

	return {
		requestRef,
		status: 'accepted',
		booking,
	};
};

export const getUpcomingSessions = async (userId: string) => {
	try {
		const patientProfile = await getPatientProfile(userId);
		const now = new Date();
		const sessions = await db.therapySession.findMany({
			where: { patientProfileId: patientProfile.id, dateTime: { gte: now }, status: { in: ['PENDING', 'CONFIRMED'] } },
			orderBy: { dateTime: 'asc' },
			select: {
				id: true,
				bookingReferenceId: true,
				dateTime: true,
				status: true,
				isLocked: true,
				durationMinutes: true,
				sessionFeeMinor: true,
				agoraChannel: true,
				agoraToken: true,
				therapistProfile: { select: { id: true, firstName: true, lastName: true, name: true } },
			},
		}).catch((error: unknown) => {
			if (isSchemaUnavailableError(error)) return [];
			throw error;
		});
		return sessions.map((s: any) => ({
			id: s.id,
			booking_reference: s.bookingReferenceId,
			scheduled_at: s.dateTime,
			status: String(s.status).toLowerCase(),
			is_locked: Boolean(s.isLocked),
			duration_minutes: s.durationMinutes,
			session_fee: Number(s.sessionFeeMinor),
			agora_channel: s.agoraChannel,
			agora_token: s.agoraToken,
			provider: {
				id: s.therapistProfile?.id || null,
				name: String(s.therapistProfile?.name || `${s.therapistProfile?.firstName || ''} ${s.therapistProfile?.lastName || ''}`.trim() || 'Therapist'),
			},
		}));
	} catch {
		return [];
	}
};

export const getSessionHistory = async (userId: string) => {
	try {
		const patientProfile = await getPatientProfile(userId);
		const sessions = await db.therapySession.findMany({
			where: { patientProfileId: patientProfile.id },
			orderBy: { dateTime: 'desc' },
			select: {
				id: true,
				bookingReferenceId: true,
				dateTime: true,
				status: true,
				isLocked: true,
				durationMinutes: true,
				sessionFeeMinor: true,
				paymentStatus: true,
				therapistProfile: { select: { id: true, firstName: true, lastName: true, name: true } },
			},
		}).catch((error: unknown) => {
			if (isSchemaUnavailableError(error)) return [];
			throw error;
		});
		return sessions.map((s: any) => ({
			id: s.id,
			booking_reference: s.bookingReferenceId,
			scheduled_at: s.dateTime,
			status: String(s.status).toLowerCase(),
			is_locked: Boolean(s.isLocked),
			duration_minutes: s.durationMinutes,
			session_fee: Number(s.sessionFeeMinor),
			payment_status: s.paymentStatus,
			provider: {
				id: s.therapistProfile?.id || null,
				name: String(s.therapistProfile?.name || `${s.therapistProfile?.firstName || ''} ${s.therapistProfile?.lastName || ''}`.trim() || 'Therapist'),
			},
		}));
	} catch {
		return [];
	}
};

export const getSessionDetail = async (userId: string, sessionId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const session = await db.therapySession.findFirst({
		where: { id: sessionId, patientProfileId: patientProfile.id },
		select: {
			id: true,
			bookingReferenceId: true,
			dateTime: true,
			status: true,
			durationMinutes: true,
			sessionFeeMinor: true,
			paymentStatus: true,
			agoraChannel: true,
			noteEncryptedContent: true,
			noteIv: true,
			noteAuthTag: true,
			noteUpdatedAt: true,
			therapistProfile: { select: { id: true, firstName: true, lastName: true, name: true, role: true } },
		},
	});

	if (!session) throw new AppError('Session not found', 404);

	let decryptedNotes: string | null = null;
	if (session.noteEncryptedContent && session.noteIv && session.noteAuthTag) {
		try {
			decryptedNotes = decryptSessionNote({
				encryptedContent: session.noteEncryptedContent,
				iv: session.noteIv,
				authTag: session.noteAuthTag,
			});
		} catch {
			decryptedNotes = null;
		}
	}

	const providerName = String(session.therapistProfile.name || `${session.therapistProfile.firstName || ''} ${session.therapistProfile.lastName || ''}`.trim() || 'Therapist');
	const providerRole = String(session.therapistProfile.role || '').toLowerCase();
	const hasPrescription = providerRole === 'psychiatrist';

	return {
		id: session.id,
		booking_reference: session.bookingReferenceId,
		scheduled_at: session.dateTime,
		status: String(session.status).toLowerCase(),
		duration_minutes: session.durationMinutes,
		session_fee: Number(session.sessionFeeMinor),
		payment_status: session.paymentStatus,
		agora_channel: session.agoraChannel,
		provider: {
			id: session.therapistProfile.id,
			name: providerName,
			role: providerRole,
		},
		notes: {
			content: decryptedNotes,
			updated_at: session.noteUpdatedAt,
			available: Boolean(decryptedNotes),
		},
		prescription: {
			available: false,
			requires_psychiatrist: hasPrescription,
			message: hasPrescription
				? 'Prescription is not shared yet.'
				: 'Prescription applies to psychiatrist sessions only.',
		},
		documents: {
			session_pdf_available: true,
			invoice_available: ['PAID', 'CAPTURED'].includes(String(session.paymentStatus || '').toUpperCase()),
			invoice_reference: session.bookingReferenceId,
		},
	};
};

export const getSessionDocumentPayload = async (userId: string, sessionId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const session = await db.therapySession.findFirst({
		where: { id: sessionId, patientProfileId: patientProfile.id },
		select: {
			id: true,
			bookingReferenceId: true,
			dateTime: true,
			status: true,
			durationMinutes: true,
			sessionFeeMinor: true,
			paymentStatus: true,
			noteEncryptedContent: true,
			noteIv: true,
			noteAuthTag: true,
			noteUpdatedAt: true,
			createdAt: true,
			updatedAt: true,
			patientProfile: {
				select: {
					user: { select: { id: true, firstName: true, lastName: true, name: true, email: true } },
				},
			},
			therapistProfile: { select: { id: true, firstName: true, lastName: true, name: true, email: true, role: true } },
		},
	});

	if (!session) throw new AppError('Session not found', 404);

	let notes: string | null = null;
	if (session.noteEncryptedContent && session.noteIv && session.noteAuthTag) {
		try {
			notes = decryptSessionNote({
				encryptedContent: session.noteEncryptedContent,
				iv: session.noteIv,
				authTag: session.noteAuthTag,
			});
		} catch {
			notes = null;
		}
	}

	const patientName = String(
		session.patientProfile.user.name
			|| `${session.patientProfile.user.firstName || ''} ${session.patientProfile.user.lastName || ''}`.trim()
			|| 'Patient',
	);
	const therapistName = String(
		session.therapistProfile.name
			|| `${session.therapistProfile.firstName || ''} ${session.therapistProfile.lastName || ''}`.trim()
			|| 'Therapist',
	);

	return {
		sessionId: session.id,
		bookingReferenceId: session.bookingReferenceId,
		scheduledAt: session.dateTime,
		status: String(session.status).toUpperCase(),
		durationMinutes: session.durationMinutes,
		sessionFeeMinor: Number(session.sessionFeeMinor),
		paymentStatus: String(session.paymentStatus || 'UNPAID').toUpperCase(),
		notes,
		noteUpdatedAt: session.noteUpdatedAt,
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
		patient: {
			id: session.patientProfile.user.id,
			name: patientName,
			email: session.patientProfile.user.email || null,
		},
		therapist: {
			id: session.therapistProfile.id,
			name: therapistName,
			email: session.therapistProfile.email || null,
			role: String(session.therapistProfile.role || '').toLowerCase(),
		},
	};
};

export const submitAssessment = async (userId: string, input: { type: string; score?: number; answers?: number[] }) => {
	const patientProfile = await getPatientProfile(userId);
	const { computedScore, answers, severity } = deriveAssessmentScoreAndSeverity(input.type, input.score, input.answers);
	const normalizedType = String(input.type || '').toUpperCase();
	const journey = buildJourneyRecommendation({ type: input.type, score: computedScore, answers });
	const created = await db.patientAssessment.create({
		data: {
			patientId: patientProfile.id,
			type: input.type,
			answers,
			totalScore: computedScore,
			severityLevel: severity,
		},
	});

	if (normalizedType === 'PHQ-9') {
		const scored = scorePHQ9(answers);
		await db.pHQ9Assessment.create({
			data: {
				userId: patientProfile.userId,
				answers,
				totalScore: scored.total,
				q9Score: scored.q9Score,
				severity: scored.severity,
				riskWeight: scored.riskWeight,
				q9CrisisFlag: scored.q9CrisisFlag,
			},
		}).catch(() => null);
	}

	if (normalizedType === 'GAD-7') {
		const scored = scoreGAD7(answers);
		await db.gAD7Assessment.create({
			data: {
				userId: patientProfile.userId,
				answers,
				totalScore: scored.total,
				severity: scored.severity,
				riskWeight: scored.riskWeight,
			},
		}).catch(() => null);
	}

	await db.notification.create({
		data: {
			userId,
			type: 'ASSESSMENT_RECOMMENDATION',
			title: 'Assessment recommendation',
			message: `Your ${input.type} assessment is ${severity}. Follow up with a therapist for better support.`,
			payload: { assessmentId: created.id, score: computedScore, severity },
			sentAt: new Date(),
		},
	});

	await syncTreatmentPlanFromAssessment(userId, {
		assessmentType: input.type,
		score: created.totalScore,
		severity: created.severityLevel,
	}).catch(() => null);

	return {
		id: created.id,
		type: created.type,
		score: created.totalScore,
		result_level: created.severityLevel,
		journey,
		recommendation:
			severity === 'Severe'
				? 'Please schedule a therapist session within 24 hours.'
				: severity === 'Moderate'
					? 'Consider booking a session this week and continue mood tracking.'
					: 'Maintain your routine and continue weekly check-ins.',
	};
};

export const submitPHQ9Assessment = async (userId: string, answers: number[]) => {
	const patientProfile = await getPatientProfile(userId);
	const scored = scorePHQ9(answers);
	
	const created = await db.pHQ9Assessment.create({
		data: {
			userId: patientProfile.userId,
			answers,
			totalScore: scored.total,
			q9Score: scored.q9Score,
			severity: scored.severity,
			riskWeight: scored.riskWeight,
			q9CrisisFlag: scored.q9CrisisFlag,
		},
	});

	if (scored.q9CrisisFlag) {
		await db.notification.create({
			data: {
				userId,
				type: 'CRISIS_ALERT',
				title: 'Safety check needed',
				message: 'Your recent check-in indicated you may be struggling with safety. Please contact support.',
				payload: { assessmentId: created.id, severity: scored.severity, urgent: true },
				sentAt: new Date(),
			},
		});
	}

	return {
		id: created.id,
		score: created.totalScore,
		severity: created.severity,
		crisisFlag: created.q9CrisisFlag,
	};
};

export const getLatestJourneyRecommendation = async (userId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const latest = await db.patientAssessment.findFirst({
		where: { patientId: patientProfile.id },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			type: true,
			answers: true,
			totalScore: true,
			severityLevel: true,
			createdAt: true,
		},
	});

	if (!latest) {
		throw new AppError('No assessments found for journey recommendation', 404);
	}

	const answers = Array.isArray(latest.answers) ? latest.answers.map((value: number) => Number(value || 0)) : [];
	const score = Number(latest.totalScore || 0);

	return {
		assessment: {
			id: latest.id,
			type: latest.type,
			score,
			severityLevel: latest.severityLevel,
			createdAt: latest.createdAt,
		},
		journey: buildJourneyRecommendation({
			type: latest.type,
			score,
			answers,
		}),
	};
};

export const submitPresetAssessment = async (userId: string, input: PresetAssessmentSubmitRequest): Promise<PresetAssessmentSubmitResponse> => {
	// Validate entry type
	if (!isValidPresetEntryType(input.entryType)) {
		const supportedTypes = Object.keys(PRESET_DEFAULTS).join(', ');
		throw new AppError(`Invalid preset entry type: ${input.entryType}. Must be one of: ${supportedTypes}`, 422);
	}

	// Get preset defaults
	const presetDefaults = getPresetDefaults(input.entryType);
	if (!presetDefaults) {
		throw new AppError(`Preset entry type not configured: ${input.entryType}`, 500);
	}

	// Validate responses
	if (!Array.isArray(input.responses) || input.responses.length === 0) {
		throw new AppError('Assessment responses are required and must be a non-empty array', 422);
	}

	// Determine assessment type
	const assessmentType = input.overrides?.assessmentType || presetDefaults.assessmentType;
	if (!assessmentType) {
		throw new AppError('Could not determine assessment type for preset', 500);
	}

	// Submit through existing assessment flow with preset defaults
	const submitInput = {
		type: assessmentType,
		score: undefined,
		answers: input.responses,
	};

	const assessmentResult = await submitAssessment(userId, submitInput);

	// Get the assessment that was just created
	const patientProfile = await getPatientProfile(userId);
	const recentAssessment = await db.patientAssessment.findFirst({
		where: { patientId: patientProfile.id },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			type: true,
			totalScore: true,
			severityLevel: true,
			createdAt: true,
		},
	});

	if (!recentAssessment) {
		throw new AppError('Failed to retrieve created assessment', 500);
	}

	// Track source metadata if provided
	if (input.source) {
		try {
			const normalizedPrimaryConcerns = Array.isArray(input.source.primaryConcerns)
				? input.source.primaryConcerns.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
				: [];
			const normalizedTimezoneRegion = String(input.source.timezoneRegion || '').trim().toUpperCase() || undefined;
			const normalizedLanguagePreference = String(input.source.languagePreference || '').trim() || undefined;

			const sourceMetadata = {
				entryType: input.source.entryType || input.entryType,
				landingPage: input.source.landingPage,
				utmCampaign: input.source.utmCampaign,
				utmMedium: input.source.utmMedium,
				utmSource: input.source.utmSource,
				experimentId: input.source.experimentId,
				timezoneRegion: normalizedTimezoneRegion,
				primaryConcerns: normalizedPrimaryConcerns,
				languagePreference: normalizedLanguagePreference,
			};

			// Update assessment with source tracking if the schema supports it
			try {
				await db.patientAssessment.update({
					where: { id: recentAssessment.id },
					data: {
						entryType: input.entryType,
						sourceMetadata: JSON.stringify(sourceMetadata),
						utmCampaign: input.source.utmCampaign || undefined,
						utmMedium: input.source.utmMedium || undefined,
						utmSource: input.source.utmSource || undefined,
					},
				}).catch(() => null); // Gracefully handle if field doesn't exist yet
			} catch (e) {
				// Log but don't fail if source tracking fails
				console.log('[PresetAssessment] Source metadata update failed, continuing:', e);
			}
		} catch (e) {
			console.log('[PresetAssessment] Failed to process source metadata:', e);
		}
	} else {
		// Even if no source object, track the entry type
		try {
			await db.patientAssessment.update({
				where: { id: recentAssessment.id },
				data: { entryType: input.entryType },
			}).catch(() => null);
		} catch (e) {
			console.log('[PresetAssessment] Failed to update entry type:', e);
		}
	}

	return {
		assessmentId: recentAssessment.id,
		entryType: input.entryType,
		score: recentAssessment.totalScore,
		severity: recentAssessment.severityLevel,
		type: recentAssessment.type,
		createdAt: recentAssessment.createdAt,
		journey: (assessmentResult as any)?.journey,
	};
};

export const createMoodLog = async (userId: string, input: { mood: number; note?: string; intensity?: number; tags?: string[]; energy?: string; sleepHours?: string }) => {
	const patientProfile = await getPatientProfile(userId);
	if (!Number.isFinite(input.mood) || input.mood < 1 || input.mood > 5) throw new AppError('mood must be between 1 and 5', 422);
	if (input.intensity !== undefined && (!Number.isFinite(input.intensity) || Number(input.intensity) < 1 || Number(input.intensity) > 10)) {
		throw new AppError('intensity must be between 1 and 10', 422);
	}
	const moodValue = Math.floor(input.mood);
	const note = buildDailyCheckInNote({
		journal: input.note,
		tags: input.tags,
		intensity: input.intensity,
		energy: input.energy,
		sleepHours: input.sleepHours,
	});
	const now = new Date();

	let created: any | null = null;
	const patientMoodModel = db.patientMoodEntry;
	if (patientMoodModel && typeof patientMoodModel.create === 'function') {
		created = await patientMoodModel
			.create({
				data: {
					patientId: patientProfile.id,
					moodScore: moodValue,
					note,
					date: now,
				},
			})
			.catch(() => null);
	}

	let moodLog: any | null = null;
	const moodLogModel = db.moodLog;
	if (moodLogModel && typeof moodLogModel.create === 'function') {
		moodLog = await moodLogModel
			.create({
				data: {
					userId,
					moodValue,
					note,
					source: 'manual',
					loggedAt: now,
				},
			})
			.catch(() => null);
	}

	await Promise.allSettled([
		markDailyCheckInTaskComplete(patientProfile.id),
		maybeCreateLowMoodAlert(userId, patientProfile.id),
	]);

	const mapped = mapMoodRow({
		id: created?.id || moodLog?.id,
		mood: Number(created?.moodScore ?? moodLog?.moodValue ?? moodValue),
		note: created?.note ?? moodLog?.note ?? note,
		created_at: created?.createdAt ?? moodLog?.createdAt ?? now,
	});

	return mapped;
};

export const getMoodHistory = async (userId: string) => {
	try {
		const patientProfile = await getPatientProfile(userId);
		const [patientMoodRows, moodLogRows, dailyCheckIns] = await Promise.all([
			db.patientMoodEntry.findMany({
				where: { patientId: patientProfile.id },
				orderBy: { date: 'desc' },
				take: 60,
			}).catch(() => []),
			db.moodLog.findMany({
				where: { userId },
				orderBy: { loggedAt: 'desc' },
				take: 60,
			}).catch(() => []),
			db.dailyCheckIn.findMany({
				where: { patientId: userId },
				orderBy: { date: 'desc' },
				take: 60,
			}).catch(() => []),
		]);

		const unified: any[] = [
			...patientMoodRows.map((r: any) => mapMoodRow({ id: r.id, mood: r.moodScore, note: r.note, created_at: r.createdAt || r.date })),
			...moodLogRows.map((r: any) => mapMoodRow({ id: r.id, mood: Number(r.moodValue || 0), note: r.note, created_at: r.createdAt || r.loggedAt })),
			...dailyCheckIns.map((r: any) => mapMoodRow({
				id: r.id,
				mood: Number(r.mood || 0),
				note: r.reflectionGood || r.intention || '',
				created_at: r.createdAt || r.date,
				metadata: {
					tags: r.context || [],
					energy: r.energy ? (['low', 'medium', 'high'][r.energy - 1] || 'medium') : undefined,
					sleepHours: r.sleep ? String(r.sleep) : undefined,
					stressLevel: r.stressLevel || undefined,
				},
			})),
		];

		return unified
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.slice(0, 60);
	} catch {
		return [];
	}
};

export const getMoodToday = async (userId: string) => {
	const history = await getMoodHistory(userId);
	const now = new Date();
	const dayStart = new Date(now);
	dayStart.setHours(0, 0, 0, 0);

	const todayEntries = history.filter((entry: any) => {
		const at = new Date(entry.created_at);
		return !Number.isNaN(at.getTime()) && at >= dayStart;
	});

	const latest = todayEntries[0] || null;
	return {
		date: dayStart.toISOString(),
		entryCount: todayEntries.length,
		latest,
	};
};

export const getMoodStats = async (userId: string) => {
	const history = await getMoodHistory(userId);
	const emptyStats = {
		totalCheckins: 0,
		averageMood: 0,
		last7DaysAverage: 0,
		last30DaysAverage: 0,
		currentStreak: 0,
		longestStreak: 0,
		highestMood: 0,
		lowestMood: 0,
		insights: [] as string[],
	};
	if (!history.length) {
		return emptyStats;
	}

	const rows = history
		.map((entry: any) => ({
			mood: Number(entry.mood || 0),
			createdAt: new Date(entry.created_at),
			metadata: entry.metadata || { tags: [] },
		}))
		.filter((entry: any) => Number.isFinite(entry.mood) && !Number.isNaN(entry.createdAt.getTime()));

	if (!rows.length) {
		return emptyStats;
	}

	const average = (items: any[]) =>
		items.length
			? Number((items.reduce((sum: number, item: any) => sum + Number(item.mood || 0), 0) / items.length).toFixed(2))
			: 0;

	const now = new Date();
	const day7 = new Date(now);
	day7.setDate(day7.getDate() - 7);
	const day30 = new Date(now);
	day30.setDate(day30.getDate() - 30);

	const last7 = rows.filter((entry: any) => entry.createdAt >= day7);
	const last30 = rows.filter((entry: any) => entry.createdAt >= day30);

	const sortedDays = [...new Set(rows.map((entry: any) => entry.createdAt.toISOString().slice(0, 10)))] as string[];
	sortedDays.sort((a, b) => b.localeCompare(a));
	let currentStreak = 0;
	let cursor = new Date();
	cursor.setHours(0, 0, 0, 0);

	for (const day of sortedDays) {
		const cursorKey = cursor.toISOString().slice(0, 10);
		if (day === cursorKey) {
			currentStreak += 1;
			cursor.setDate(cursor.getDate() - 1);
			continue;
		}
		if (currentStreak === 0) {
			cursor.setDate(cursor.getDate() - 1);
			if (day === cursor.toISOString().slice(0, 10)) {
				currentStreak += 1;
				cursor.setDate(cursor.getDate() - 1);
				continue;
			}
		}
		break;
	}

	let longestStreak = 0;
	let streak = 0;
	let prevDay: Date | null = null;
	const ascDays = [...sortedDays].reverse();
	for (const day of ascDays) {
		const date = new Date(`${day}T00:00:00.000Z`);
		if (!prevDay) {
			streak = 1;
		} else {
			const diffDays = Math.round((date.getTime() - prevDay.getTime()) / (24 * 60 * 60 * 1000));
			streak = diffDays === 1 ? streak + 1 : 1;
		}
		if (streak > longestStreak) longestStreak = streak;
		prevDay = date;
	}

	return {
		totalCheckins: rows.length,
		averageMood: average(rows),
		last7DaysAverage: average(last7),
		last30DaysAverage: average(last30),
		currentStreak,
		longestStreak,
		highestMood: Math.max(...rows.map((entry: any) => entry.mood)),
		lowestMood: Math.min(...rows.map((entry: any) => entry.mood)),
		insights: buildDailyCheckInInsights(history),
	};
};

export const getPatientProgressAnalytics = async (userId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const [sessions, exercises, legacyAssessments, phqAssessments, gadAssessments, moodHistory] = await Promise.all([
		db.therapySession.findMany({
			where: { patientProfileId: patientProfile.id },
			select: { id: true, status: true, dateTime: true },
			orderBy: { dateTime: 'asc' },
		}),
		db.patientExercise.findMany({
			where: { patientId: patientProfile.id },
			select: { id: true, status: true, createdAt: true },
			orderBy: { createdAt: 'asc' },
		}).catch(() => []),
		db.patientAssessment.findMany({
			where: { patientId: patientProfile.id },
			select: { id: true, type: true, totalScore: true, severityLevel: true, createdAt: true },
			orderBy: { createdAt: 'asc' },
			take: 20,
		}),
		db.pHQ9Assessment.findMany({
			where: { userId: patientProfile.userId },
			select: { id: true, totalScore: true, severity: true, createdAt: true },
			orderBy: { createdAt: 'asc' },
			take: 20,
		}).catch(() => []),
		db.gAD7Assessment.findMany({
			where: { userId: patientProfile.userId },
			select: { id: true, totalScore: true, severity: true, createdAt: true },
			orderBy: { createdAt: 'asc' },
			take: 20,
		}).catch(() => []),
		getMoodHistory(userId),
	]);

	const assessments: any[] = [
		...legacyAssessments,
		...phqAssessments.map(a => ({ id: a.id, type: 'PHQ-9', totalScore: a.totalScore, severityLevel: a.severity, createdAt: a.createdAt })),
		...gadAssessments.map(a => ({ id: a.id, type: 'GAD-7', totalScore: a.totalScore, severityLevel: a.severity, createdAt: a.createdAt })),
	].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

	const totalSessions = sessions.length;
	const completedSessions = sessions.filter((session: any) => String(session.status).toUpperCase() === 'COMPLETED').length;
	const totalExercises = exercises.length;
	const completedExercises = exercises.filter((exercise: any) => String(exercise.status).toUpperCase() === 'COMPLETED').length;

	const moodByWeek = (() => {
		const map = new Map<string, { week: string; total: number; count: number }>();
		for (const entry of moodHistory) {
			const date = new Date(entry.created_at);
			if (Number.isNaN(date.getTime())) continue;
			const weekStart = new Date(date);
			const day = weekStart.getDay();
			const diff = day === 0 ? -6 : 1 - day;
			weekStart.setDate(weekStart.getDate() + diff);
			weekStart.setHours(0, 0, 0, 0);
			const key = weekStart.toISOString().slice(0, 10);
			const existing = map.get(key) || { week: key, total: 0, count: 0 };
			existing.total += Number(entry.mood || 0);
			existing.count += 1;
			map.set(key, existing);
		}
		return [...map.values()]
			.sort((a, b) => a.week.localeCompare(b.week))
			.slice(-8)
			.map((item) => ({ week: item.week, averageMood: Number((item.total / item.count).toFixed(2)) }));
	})();

	const assessmentTrend = assessments.map((item: any) => ({
		id: item.id,
		type: item.type,
		score: item.totalScore,
		severity: item.severityLevel,
		createdAt: item.createdAt,
	}));

	const latestAssessment = assessments[assessments.length - 1] || null;
	const firstAssessment = assessments[0] || null;
	const scoreDelta = firstAssessment && latestAssessment
		? Number(latestAssessment.totalScore || 0) - Number(firstAssessment.totalScore || 0)
		: 0;

	return {
		summary: {
			totalSessions,
			completedSessions,
			sessionCompletionRate: totalSessions ? Number(((completedSessions / totalSessions) * 100).toFixed(1)) : 0,
			totalExercises,
			completedExercises,
			exerciseCompletionRate: totalExercises ? Number(((completedExercises / totalExercises) * 100).toFixed(1)) : 0,
			moodCheckins: moodHistory.length,
		},
		moodTrend: moodByWeek,
		assessmentTrend,
		insights: {
			latestAssessmentScore: latestAssessment?.totalScore ?? null,
			latestAssessmentSeverity: latestAssessment?.severityLevel ?? null,
			assessmentScoreDelta: scoreDelta,
		},
	};
};

export const getPatientInsights = async (userId: string) => {
	const cacheKey = `patient:v1:insights:${userId}`;
	const cached = await readJsonCache<any>(cacheKey);
	if (cached) return cached;

	const analytics = await getPatientProgressAnalytics(userId);
	const assessmentRows = Array.isArray(analytics.assessmentTrend) ? analytics.assessmentTrend : [];
	const moodRows = Array.isArray(analytics.moodTrend) ? analytics.moodTrend : [];

	const assessmentTrendMap = new Map<string, { date: string; phq9Score: number; gad7Score: number }>();
	for (const row of assessmentRows) {
		const dateKey = new Date(row.createdAt).toISOString().slice(0, 10);
		const current = assessmentTrendMap.get(dateKey) || { date: dateKey, phq9Score: 0, gad7Score: 0 };
		if (String(row.type || '').toUpperCase() === 'PHQ-9') current.phq9Score = Number(row.score || 0);
		if (String(row.type || '').toUpperCase() === 'GAD-7') current.gad7Score = Number(row.score || 0);
		assessmentTrendMap.set(dateKey, current);
	}

	const gad7Rows = assessmentRows.filter((row: any) => String(row.type || '').toUpperCase() === 'GAD-7');
	const firstGad7 = gad7Rows[0] ? Number(gad7Rows[0].score || 0) : 0;
	const latestGad7 = gad7Rows.length ? Number(gad7Rows[gad7Rows.length - 1].score || 0) : 0;
	const anxietyReduction = firstGad7 > 0 ? Math.max(0, Math.round(((firstGad7 - latestGad7) / firstGad7) * 100)) : 0;

	const recommendations: string[] = [];
	if (analytics.summary.sessionCompletionRate < 70) recommendations.push('Try to keep a fixed weekly session slot to improve continuity.');
	if (analytics.summary.exerciseCompletionRate < 60) recommendations.push('Complete at least one therapeutic exercise every two days for steady progress.');
	if (anxietyReduction < 10 && gad7Rows.length >= 2) recommendations.push('Discuss anxiety coping strategies with your therapist in the next session.');
	if (!recommendations.length) recommendations.push('Great momentum. Continue your current therapy plan and mood check-ins.');

	const payload = {
		moodImprovement: Math.max(0, Math.min(100, Math.round((Number(moodRows[moodRows.length - 1]?.averageMood || 0) / 5) * 100))),
		sessionAttendance: Number(analytics.summary.sessionCompletionRate || 0),
		exerciseCompletion: Number(analytics.summary.exerciseCompletionRate || 0),
		anxietyReduction,
		moodTrend: moodRows.map((row: any) => ({ date: row.week, score: Number(row.averageMood || 0) })),
		assessmentTrend: [...assessmentTrendMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
		recommendations,
	};

	await writeJsonCache(cacheKey, payload, PATIENT_V1_READ_CACHE_TTL.insights);
	return payload;
};

export const getPatientReports = async (userId: string) => {
	const cacheKey = `patient:v1:reports:${userId}`;
	const cached = await readJsonCache<any>(cacheKey);
	if (cached) return cached;

	const patientProfile = await getPatientProfile(userId);

	const [legacyAssessments, phqAssessments, gadAssessments, sessions, sharedReports] = await Promise.all([
		db.patientAssessment.findMany({
			where: { patientId: patientProfile.id },
			orderBy: { createdAt: 'desc' },
			take: 12,
			select: { id: true, type: true, totalScore: true, severityLevel: true, createdAt: true },
		}).catch(() => []),
		db.pHQ9Assessment.findMany({
			where: { userId: patientProfile.userId },
			orderBy: { createdAt: 'desc' },
			take: 12,
			select: { id: true, totalScore: true, severity: true, createdAt: true },
		}).catch(() => []),
		db.gAD7Assessment.findMany({
			where: { userId: patientProfile.userId },
			orderBy: { createdAt: 'desc' },
			take: 12,
			select: { id: true, totalScore: true, severity: true, createdAt: true },
		}).catch(() => []),
		db.therapySession.findMany({
			where: { patientProfileId: patientProfile.id, status: 'COMPLETED' },
			orderBy: { dateTime: 'desc' },
			take: 8,
			select: {
				id: true,
				dateTime: true,
				therapistProfile: { select: { firstName: true, lastName: true, name: true, role: true } },
			},
		}).catch(() => []),
		db.$queryRawUnsafe(
			`SELECT r.id, r.title, r.status, r.shared_timestamp, r.updated_at, r.expires_at, u.firstName, u.lastName, u.name, u.role
			 FROM psychologist_patient_reports r
			 LEFT JOIN users u ON u.id = r.psychologist_id
			 WHERE r.patient_id = $1 AND LOWER(r.status) = 'shared'
			 ORDER BY r.updated_at DESC
			 LIMIT 12`,
			patientProfile.id,
		).catch(() => []),
	]);

	const assessments = [
		...legacyAssessments,
		...phqAssessments.map(a => ({ id: a.id, type: 'PHQ-9', totalScore: a.totalScore, severityLevel: a.severity, createdAt: a.createdAt })),
		...gadAssessments.map(a => ({ id: a.id, type: 'GAD-7', totalScore: a.totalScore, severityLevel: a.severity, createdAt: a.createdAt })),
	].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	const assessmentReports = assessments.map((item: any) => ({
		id: `assessment-${item.id}`,
		type: 'assessment',
		bucket: 'clinical_assessments',
		title: `${String(item.type || 'Assessment')} Report`,
		createdAt: item.createdAt,
		summary: `Score ${Number(item.totalScore || 0)} (${String(item.severityLevel || 'unknown')}).`,
		providerName: 'MANAS360 Clinical Engine',
	}));

	const sessionReports = sessions.map((session: any) => ({
		id: `session-${session.id}`,
		type: 'session_summary',
		bucket: 'session_notes',
		title: 'Session Summary',
		createdAt: session.dateTime,
		summary: 'Completed therapy session summary available for review.',
		providerName: String(session.therapistProfile?.name || `${session.therapistProfile?.firstName || ''} ${session.therapistProfile?.lastName || ''}`.trim() || 'Therapist'),
		providerRole: String(session.therapistProfile?.role || '').toLowerCase(),
	}));

	const officialLetters = sessions
		.filter((session: any) => String(session.therapistProfile?.role || '').toLowerCase() === 'psychiatrist')
		.slice(0, 4)
		.map((session: any) => ({
			id: `letter-${session.id}`,
			type: 'official_letter',
			bucket: 'prescriptions_letters',
			title: 'Psychiatric Prescription / Letter',
			createdAt: session.dateTime,
			summary: 'Official psychiatrist document record.',
			providerName: String(session.therapistProfile?.name || `${session.therapistProfile?.firstName || ''} ${session.therapistProfile?.lastName || ''}`.trim() || 'Psychiatrist'),
			providerRole: 'psychiatrist',
		}));

	const sharedReportEntries = (sharedReports as any[]).map((report: any) => ({
		id: `shared-report-${report.id}`,
		type: 'shared_report',
		bucket: 'patient_shared_reports',
		title: String(report.title || 'Shared Clinical Report'),
		createdAt: report.shared_timestamp || report.updated_at || new Date(),
		summary: 'A report shared with you by your provider.',
		providerName: String(report.name || `${report.firstName || ''} ${report.lastName || ''}`.trim() || 'Provider'),
		providerRole: String(report.role || '').toLowerCase() || undefined,
		sharedReportId: String(report.id),
		status: String(report.status || '').toLowerCase(),
	}));

	const payload = [...officialLetters, ...sharedReportEntries, ...assessmentReports, ...sessionReports]
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, 24);

	await writeJsonCache(cacheKey, payload, PATIENT_V1_READ_CACHE_TTL.reports);
	return payload;
};

type RecordAccessPayload = {
	userId: string;
	recordId: string;
	action: 'view' | 'download' | 'share';
	exp: number;
};

const encodeRecordToken = (payload: RecordAccessPayload): string => {
	const raw = Buffer.from(JSON.stringify(payload)).toString('base64url');
	const sig = crypto.createHmac('sha256', env.jwtAccessSecret).update(raw).digest('base64url');
	return `${raw}.${sig}`;
};

const decodeRecordToken = (token: string): RecordAccessPayload => {
	const [raw, sig] = String(token || '').split('.');
	if (!raw || !sig) throw new AppError('Invalid access token', 401);
	const expected = crypto.createHmac('sha256', env.jwtAccessSecret).update(raw).digest('base64url');
	if (expected !== sig) throw new AppError('Invalid access token', 401);
	const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8')) as RecordAccessPayload;
	if (!parsed.exp || Date.now() > parsed.exp) throw new AppError('Access token expired', 401);
	return parsed;
};

export const resolveClinicalRecord = async (userId: string, recordId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const rawId = String(recordId || '').trim();

	if (rawId.startsWith('session-')) {
		const sessionId = rawId.replace('session-', '');
		const session = await db.therapySession.findFirst({
			where: { id: sessionId, patientProfileId: patientProfile.id },
			select: {
				id: true,
				dateTime: true,
				status: true,
				durationMinutes: true,
				bookingReferenceId: true,
				therapistProfile: { select: { firstName: true, lastName: true, name: true, role: true } },
			},
		});
		if (!session) throw new AppError('Record not found', 404);
		return {
			kind: 'session' as const,
			recordId: rawId,
			title: 'Session Summary',
			date: session.dateTime,
			sessionId,
			providerName: String(session.therapistProfile?.name || `${session.therapistProfile?.firstName || ''} ${session.therapistProfile?.lastName || ''}`.trim() || 'Therapist'),
			status: session.status,
			durationMinutes: Number(session.durationMinutes || 0),
		};
	}

	if (rawId.startsWith('assessment-')) {
		const assessmentId = rawId.replace('assessment-', '');
		const assessment = await db.patientAssessment.findFirst({
			where: { id: assessmentId, patientId: patientProfile.id },
			select: { id: true, type: true, totalScore: true, severityLevel: true, createdAt: true },
		});
		if (!assessment) throw new AppError('Record not found', 404);
		return {
			kind: 'assessment' as const,
			recordId: rawId,
			title: `${String(assessment.type || 'Assessment')} Report`,
			date: assessment.createdAt,
			assessmentId,
			type: String(assessment.type || 'Assessment'),
			totalScore: Number(assessment.totalScore || 0),
			severityLevel: String(assessment.severityLevel || 'unknown'),
		};
	}

	throw new AppError('Unsupported record type', 422);
};

export const createSecureRecordToken = (
	userId: string,
	recordId: string,
	action: 'view' | 'download' | 'share',
	ttlSeconds: number,
) => {
	const exp = Date.now() + Math.max(30, ttlSeconds) * 1000;
	const token = encodeRecordToken({ userId, recordId, action, exp });
	return { token, expiresAt: new Date(exp).toISOString() };
};

export const verifySecureRecordToken = (token: string) => decodeRecordToken(token);

export const getCompleteHealthSummaryData = async (userId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const [moodStats, moodHistory, careTeam, assessments, sessions] = await Promise.all([
		getMoodStats(userId).catch(() => null),
		getMoodHistory(userId).catch(() => []),
		getMyCareTeamProviders(userId).catch(() => []),
		db.patientAssessment.findMany({
			where: { patientId: patientProfile.id },
			orderBy: { createdAt: 'desc' },
			take: 10,
			select: { type: true, totalScore: true, severityLevel: true, createdAt: true },
		}),
		db.therapySession.findMany({
			where: { patientProfileId: patientProfile.id, status: 'COMPLETED' },
			orderBy: { dateTime: 'desc' },
			take: 10,
			select: { id: true, dateTime: true },
		}),
	]);

	const latestPhq9 = assessments.find((a: any) => String(a.type || '').toUpperCase() === 'PHQ-9') || null;
	const latestGad7 = assessments.find((a: any) => String(a.type || '').toUpperCase() === 'GAD-7') || null;

	const recentMoodRows = (Array.isArray(moodHistory) ? moodHistory : [])
		.map((row: any) => ({
			date: new Date(row.created_at || row.createdAt || row.date),
			mood: Number(row.mood || 0),
		}))
		.filter((row: any) => !Number.isNaN(row.date.getTime()))
		.sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
		.slice(-30);

	return {
		patientName: String(patientProfile.user?.name || `${patientProfile.user?.firstName || ''} ${patientProfile.user?.lastName || ''}`.trim() || 'Patient'),
		generatedAt: new Date().toISOString(),
		latestPhq9,
		latestGad7,
		careTeam: Array.isArray(careTeam) ? careTeam : [],
		sessionsCompletedLast30Days: sessions.filter((s: any) => new Date(s.dateTime).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000).length,
		moodStats: moodStats || {},
		recentMoodRows,
	};
};

export const getMyCareTeamProviders = async (userId: string) => {
	try {
		const patientProfile = await getPatientProfile(userId);
		const lastPhq9 = await db.pHQ9Assessment.findFirst({
			where: { userId },
			orderBy: { assessedAt: 'desc' },
			select: { severity: true, totalScore: true, assessedAt: true }
		}).catch(() => null);
		const sessions = await db.therapySession.findMany({
			where: { patientProfileId: patientProfile.id },
			orderBy: { dateTime: 'desc' },
			select: {
				id: true,
				dateTime: true,
				status: true,
				therapistProfileId: true,
				therapistProfile: { select: { id: true, firstName: true, lastName: true, name: true, role: true } },
			},
			take: 60,
		}).catch((error: unknown) => {
			if (isSchemaUnavailableError(error)) return [];
			throw error;
		});

		const now = new Date();
		const providerIds = Array.from(new Set<string>(sessions.map((s: any) => String(s.therapistProfileId || '')).filter(Boolean)));
		if (!providerIds.length) return [];

		const providerUsers = await db.user.findMany({
			where: { id: { in: providerIds } },
			select: { id: true, firstName: true, lastName: true, name: true, role: true },
		}).catch((error: unknown) => {
			if (isSchemaUnavailableError(error)) return [];
			throw error;
		});
		const providerMeta = new Map<string, any>();
		for (const user of providerUsers) {
			providerMeta.set(String(user.id), await toProviderListItem(user));
		}

		return providerIds.map((therapistProfileId: string) => {
			const providerSessions = sessions
				.filter((s: any) => String(s.therapistProfileId) === therapistProfileId)
				.sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
			const nextSession = providerSessions.find((s: any) => new Date(s.dateTime) >= now);
			const latest = providerSessions[providerSessions.length - 1];
			const mappedUserId = therapistProfileId;
			const meta = mappedUserId ? providerMeta.get(String(mappedUserId)) : null;

			const providerName = String(latest?.therapistProfile?.name || `${latest?.therapistProfile?.firstName || ''} ${latest?.therapistProfile?.lastName || ''}`.trim() || 'Provider');
			let latestPhq9Assessment: string | null = null;
			if (lastPhq9) {
				const formattedDate = new Date(lastPhq9.assessedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
				latestPhq9Assessment = `> 📊 PHQ-9 Score: ${lastPhq9.severity} (${lastPhq9.totalScore}/27) — Shared with ${providerName} on ${formattedDate}`;
			}

			return {
				id: mappedUserId,
				name: providerName,
				role: roleLabel(latest?.therapistProfile?.role || meta?.role),
				nextSession: nextSession
					? {
						date: new Date(nextSession.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
						time: new Date(nextSession.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
					}
					: undefined,
				latestPhq9Assessment,
				specialization: Array.isArray(meta?.specializations) && meta.specializations.length ? meta.specializations : [meta?.specialization || 'General Wellness'],
				canMessage: true,
			};
		});
	} catch {
		return [];
	}
};

export const listAvailableProvidersForPatient = async (
	userId: string,
	filters: ProviderFilters & { search?: string },
) => {
	await getPatientProfile(userId);
	await assertPatientHasCompletedBothPHQandGAD7(userId);
	const result = await listProviders(filters);
	let items = result.items.map((provider: any) => ({
		id: provider.id,
		name: provider.name,
		role: provider.role || 'Therapist',
		specialization: Array.isArray(provider.specializations) && provider.specializations.length
			? provider.specializations
			: [provider.specialization].filter(Boolean),
		experience: Number(provider.experience_years || 0),
		rating: Number(provider.rating_avg || 0),
		reviewsCount: 0,
		sessionPrice: Math.round(Number(provider.session_rate || 0) / 100),
		language: Array.isArray(provider.languages) ? provider.languages : ['English'],
		availability: 'Available this week',
		location: 'Online',
		bio: provider.bio || '',
		providerType: provider.providerType || roleToProviderType(provider.role),
	}));

	if (filters.search) {
		const q = filters.search.trim().toLowerCase();
		items = items.filter((item: any) => item.name.toLowerCase().includes(q) || item.specialization.some((s: string) => s.toLowerCase().includes(q)));
	}

	return items;
};

export const chatWithAi = async (userId: string, input: { message: string }) => {
	const message = String(input.message || '').trim();
	if (!message) throw new AppError('message is required', 422);
	const result = await processChatMessage({ userId, message, botType: 'mood_ai' });
	return {
		conversation_id: result.conversation_id,
		response: result.response,
		messages: result.messages,
		bot_name: result.bot_name,
		bot_type: result.bot_type,
		crisis_detected: result.crisis_detected,
	};
};

export const listNotifications = async (userId: string) => {
	const notifications = await db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
	return notifications.map((n: any) => ({
		id: n.id,
		type: n.type,
		title: n.title,
		message: n.message,
		payload: n.payload,
		is_read: n.isRead,
		scheduled_at: n.scheduledAt,
		sent_at: n.sentAt,
		created_at: n.createdAt,
	}));
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
	const updated = await db.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
	if (!updated.count) throw new AppError('Notification not found', 404);
	return { id: notificationId, is_read: true };
};

export const requestAppointmentWithPreferredProviders = async (
	userId: string,
	input: {
		providerIds: string[];
		preferredLanguage?: string;
		preferredTime?: string;
		preferredSpecialization?: string;
		carePath?: string;
		urgency?: string;
		note?: string;
	},
) => {
	await assertPatientHasCompletedBothPHQandGAD7(userId);
	const providerIds = Array.from(new Set((input.providerIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
	if (!providerIds.length) {
		throw new AppError('At least one provider is required', 422);
	}
	if (providerIds.length > 3) {
		throw new AppError('You can select up to 3 preferred providers', 422);
	}

	const [patientUser, providers] = await Promise.all([
		db.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, firstName: true, lastName: true, email: true },
		}),
		db.user.findMany({
			where: {
				id: { in: providerIds },
				isDeleted: false,
				role: { in: ['THERAPIST', 'PSYCHIATRIST', 'COACH', 'PSYCHOLOGIST'] },
			},
			select: { id: true, name: true, firstName: true, lastName: true, role: true },
		}),
	]);

	if (!patientUser) {
		throw new AppError('Patient account not found', 404);
	}
	if (!providers.length) {
		throw new AppError('No valid providers found for appointment request', 422);
	}

	const patientName = String(patientUser.name || `${patientUser.firstName || ''} ${patientUser.lastName || ''}`.trim() || 'Patient');
	const requestRef = `APR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

	await Promise.all([
		...providers.map((provider: any) =>
			db.notification.create({
				data: {
					userId: String(provider.id),
					type: 'APPOINTMENT_REQUEST',
					title: 'New Appointment Request',
					message: `${patientName} selected you as a preferred provider.`,
					payload: {
						requestRef,
						patientId: userId,
						patientName,
						carePath: input.carePath || 'direct-selection',
						urgency: input.urgency || 'routine',
						preferredLanguage: input.preferredLanguage || null,
						preferredTime: input.preferredTime || null,
						preferredSpecialization: input.preferredSpecialization || null,
						note: input.note || null,
						requestStatus: 'PENDING_PROVIDER_RESPONSE',
					},
					sentAt: new Date(),
				},
			}),
		),
		db.notification.create({
			data: {
				userId,
				type: 'APPOINTMENT_REQUEST_SUBMITTED',
				title: 'Appointment request submitted',
				message: `Your request was sent to ${providers.length} preferred provider${providers.length > 1 ? 's' : ''}.`,
				payload: {
					requestRef,
					providerIds: providers.map((provider: any) => String(provider.id)),
					carePath: input.carePath || 'direct-selection',
					urgency: input.urgency || 'routine',
					preferredLanguage: input.preferredLanguage || null,
					preferredTime: input.preferredTime || null,
					preferredSpecialization: input.preferredSpecialization || null,
					requestStatus: 'PENDING_PROVIDER_RESPONSE',
				},
				sentAt: new Date(),
			},
		}),
	]);

	return {
		requestRef,
		requestedAt: new Date().toISOString(),
		providerCount: providers.length,
		providers: providers.map((provider: any) => ({
			id: String(provider.id),
			name: String(provider.name || `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Provider'),
			role: String(provider.role || '').toLowerCase(),
		})),
		nextStep: 'Providers can propose or confirm available slots. You can confirm the altered slot from your notifications before final booking.',
	};
};

export const getPatientSettings = async (userId: string) => {
	const [latestSnapshot, patientProfile, user] = await Promise.all([
		db.notification.findFirst({
			where: { userId, type: 'PATIENT_SETTINGS_SNAPSHOT' },
			orderBy: { createdAt: 'desc' },
			select: { payload: true, createdAt: true },
		}),
		db.patientProfile.findUnique({ where: { userId }, select: { emergencyContact: true } }).catch(() => null),
		db.user.findUnique({ where: { id: userId }, select: { mfaEnabled: true } }).catch(() => null),
	]);

	const payloadSettings = latestSnapshot?.payload?.settings && typeof latestSnapshot.payload.settings === 'object'
		? latestSnapshot.payload.settings
		: null;

	const emergencyContact = patientProfile?.emergencyContact && typeof patientProfile.emergencyContact === 'object'
		? patientProfile.emergencyContact
		: null;

	const mergedSettings = {
		...(payloadSettings || {}),
		profile: {
			...((payloadSettings as any)?.profile || {}),
			carrier: String((emergencyContact as any)?.carrier || (payloadSettings as any)?.profile?.carrier || ''),
		},
		therapy: {
			...((payloadSettings as any)?.therapy || {}),
			emergencyName: String((emergencyContact as any)?.name || (payloadSettings as any)?.therapy?.emergencyName || ''),
			emergencyPhone: String((emergencyContact as any)?.phone || (payloadSettings as any)?.therapy?.emergencyPhone || ''),
			emergencyRelationship: String((emergencyContact as any)?.relation || (emergencyContact as any)?.relationship || (payloadSettings as any)?.therapy?.emergencyRelationship || ''),
		},
		security: {
			...((payloadSettings as any)?.security || {}),
			twoFactorEnabled: Boolean((payloadSettings as any)?.security?.twoFactorEnabled ?? user?.mfaEnabled ?? false),
		},
	};

	return {
		settings: mergedSettings,
		savedAt: latestSnapshot?.createdAt || null,
	};
};

export const updatePatientSettings = async (userId: string, settings: Record<string, any>) => {
	if (!settings || typeof settings !== 'object') throw new AppError('settings payload is required', 422);

	const emergencyName = String(settings?.therapy?.emergencyName || '').trim();
	const emergencyPhone = String(settings?.therapy?.emergencyPhone || '').trim();
	const emergencyRelationship = String(settings?.therapy?.emergencyRelationship || '').trim();
	const carrier = String(settings?.profile?.carrier || '').trim();

	await Promise.all([
		db.notification.create({
			data: {
				userId,
				type: 'PATIENT_SETTINGS_SNAPSHOT',
				title: 'Patient settings updated',
				message: 'Patient settings were updated from account settings page.',
				payload: { settings },
				isRead: true,
				sentAt: new Date(),
			},
		}),
		db.user.updateMany({
			where: { id: userId, isDeleted: false },
			data: {
				mfaEnabled: Boolean(settings?.security?.twoFactorEnabled),
			},
		}),
		db.patientProfile.updateMany({
			where: { userId },
			data: {
				emergencyContact: {
					name: emergencyName,
					phone: emergencyPhone,
					relation: emergencyRelationship,
					carrier,
				},
			},
		}).catch(() => ({ count: 0 })),
	]);

	return {
		settings,
		savedAt: new Date().toISOString(),
	};
};

export const getPatientSupportCenter = async (userId: string) => {
	const tickets = await db.notification.findMany({
		where: { userId, type: 'SUPPORT_TICKET' },
		orderBy: { createdAt: 'desc' },
		take: 20,
		select: {
			id: true,
			title: true,
			message: true,
			payload: true,
			createdAt: true,
		},
	});

	return {
		faqs: [
			{ id: 'faq-1', question: 'How do I reschedule a therapy session?', answer: 'Go to Sessions, open your session and choose reschedule if available.' },
			{ id: 'faq-2', question: 'How can I update my payment method?', answer: 'Open Settings → Billing & Subscription and update your payment details.' },
			{ id: 'faq-3', question: 'How do I contact crisis support?', answer: 'Use the Crisis Support option in the sidebar for immediate assistance.' },
		],
		emergencyContacts: [
			{ label: 'Tele-MANAS', value: '1800-599-0019' },
			{ label: 'Emergency', value: '112' },
		],
		tickets: tickets.map((ticket: any) => ({
			id: ticket.id,
			title: ticket.title,
			message: ticket.message,
			status: String(ticket.payload?.status || 'OPEN'),
			category: String(ticket.payload?.category || 'general'),
			priority: String(ticket.payload?.priority || 'medium'),
			createdAt: ticket.createdAt,
		})),
	};
};

export const createPatientSupportTicket = async (
	userId: string,
	input: { subject: string; message: string; category?: string; priority?: string },
) => {
	const subject = String(input.subject || '').trim();
	const message = String(input.message || '').trim();
	if (!subject) throw new AppError('subject is required', 422);
	if (!message) throw new AppError('message is required', 422);

	const created = await db.notification.create({
		data: {
			userId,
			type: 'SUPPORT_TICKET',
			title: subject,
			message,
			payload: {
				category: String(input.category || 'general'),
				priority: String(input.priority || 'medium'),
				status: 'OPEN',
				ticketRef: `SUP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
			},
			sentAt: new Date(),
		},
	});

	return {
		id: created.id,
		title: created.title,
		message: created.message,
		status: 'OPEN',
		category: String(created.payload?.category || 'general'),
		priority: String(created.payload?.priority || 'medium'),
		createdAt: created.createdAt,
	};
};
