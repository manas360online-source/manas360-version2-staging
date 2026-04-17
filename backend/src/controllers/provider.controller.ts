import type { Request, Response, RequestHandler } from 'express';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { s3Client } from '../services/s3.service';
import { PutObjectCommand, ServerSideEncryption } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import {
	getConversationMessages as getDirectConversationMessages,
	getOrCreateConversation,
	getProviderConversations,
	sendDirectMessage,
} from '../services/messaging.service';
import { registerProviderProfile } from '../services/auth.service';
import {
	acceptAppointmentRequest as acceptAppointmentRequestService,
	rejectAppointmentRequest as rejectAppointmentRequestService,
} from '../services/smart-match.service';
import {
	GAD7_QUESTIONS,
	PHQ9_QUESTIONS,
	getGAD7SeverityLabel,
	getPHQ9SeverityLabel,
} from '../utils/clinicalAssessments';

type ProviderRole = 'THERAPIST' | 'PSYCHOLOGIST' | 'PSYCHIATRIST' | 'COACH';
type ProviderDashboardRole = ProviderRole | 'LEARNER';
type SmartTherapistAlert = {
	patientId: string;
	patientName: string;
	severity: 'high' | 'medium';
	trigger: 'mood_decline' | 'stress_spike' | 'sleep_risk';
	message: string;
};
const authUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) throw new AppError('Authentication required', 401);
	return userId;
};

export const submitProviderOnboardingController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);

	const requiredString = (value: unknown, field: string): string => {
		const normalized = typeof value === 'string' ? value.trim() : '';
		if (!normalized) {
			throw new AppError(`${field} is required`, 400);
		}
		return normalized;
	};

	const documents = Array.isArray(req.body?.documents)
		? req.body.documents.map((document: Record<string, unknown>) => ({
			documentType: requiredString(document?.documentType, 'documents.documentType') as 'DEGREE' | 'ID_PROOF' | 'LICENSE',
			url: requiredString(document?.url, 'documents.url'),
		}))
		: [];

	const result = await registerProviderProfile(userId, {
		professionalType: (typeof req.body?.professionalType === 'string' ? req.body.professionalType.trim().toUpperCase() : undefined) as 'THERAPIST' | 'PSYCHIATRIST' | 'PSYCHOLOGIST' | 'COACH' | undefined,
		displayName: requiredString(req.body?.fullName ?? req.body?.displayName, 'displayName'),
		registrationType: (typeof req.body?.registrationType === 'string' ? req.body.registrationType.trim().toUpperCase() : 'OTHER') as 'RCI' | 'NMC' | 'STATE_COUNCIL' | 'OTHER',
		registrationNum: requiredString(req.body?.registrationNum, 'registrationNum'),
		yearsExperience: Number(req.body?.yearsExperience ?? 0),
		highestQual: requiredString(req.body?.highestQual, 'highestQual'),
		specializations: Array.isArray(req.body?.specializations) ? req.body.specializations.map(String) : [],
		languages: Array.isArray(req.body?.languages) ? req.body.languages.map(String) : [],
		hourlyRate: Number(req.body?.hourlyRate ?? 0),
		bio: typeof req.body?.bio === 'string' ? req.body.bio : undefined,
		documents,
	});

	sendSuccess(res, result, 'Provider onboarding submitted', 201);
};

const toInitials = (firstName?: string | null, lastName?: string | null, name?: string | null): string => {
	const fn = String(firstName || '').trim();
	const ln = String(lastName || '').trim();
	if (fn || ln) {
		return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || 'PT';
	}
	const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return 'PT';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const toPatientName = (firstName?: string | null, lastName?: string | null, name?: string | null): string => {
	const full = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
	if (full) return full;
	const fallback = String(name || '').trim();
	return fallback || 'Patient';
};

const getDateBounds = (): { startOfDay: Date; endOfDay: Date; startOfMonth: Date } => {
	const now = new Date();
	const startOfDay = new Date(now);
	startOfDay.setHours(0, 0, 0, 0);

	const endOfDay = new Date(now);
	endOfDay.setHours(23, 59, 59, 999);

	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	startOfMonth.setHours(0, 0, 0, 0);

	return { startOfDay, endOfDay, startOfMonth };
};

const mapSessionStatus = (status: string): string => {
	const normalized = String(status || '').toUpperCase();
	if (normalized === 'COMPLETED') return 'completed';
	if (normalized === 'CANCELLED') return 'cancelled';
	if (normalized === 'CONFIRMED') return 'confirmed';
	if (normalized === 'PENDING') return 'pending';
	return 'pending';
};

const formatSessionTime = (value: Date): string => (
	new Intl.DateTimeFormat('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: true,
	}).format(value)
);

const formatRate = (numerator: number, denominator: number): string => {
	if (!denominator) return '0%';
	return `${Math.round((numerator / denominator) * 100)}%`;
};

const toDateKey = (value: Date): string => value.toISOString().slice(0, 10);

const buildSmartTherapistAlerts = (
	patientRows: Array<{
		id: string;
		name: string;
		checkIns: Array<{ date: Date; mood: number; stressLevel: number | null; sleep: number | null }>;
	}>,
): SmartTherapistAlert[] => {
	const alerts: SmartTherapistAlert[] = [];

	for (const patient of patientRows) {
		if (!patient.checkIns.length) continue;

		const groupedByDay = new Map<string, { moodTotal: number; moodCount: number }>();
		for (const row of patient.checkIns) {
			const key = toDateKey(row.date);
			const current = groupedByDay.get(key) || { moodTotal: 0, moodCount: 0 };
			current.moodTotal += row.mood;
			current.moodCount += 1;
			groupedByDay.set(key, current);
		}

		const recentDays = Array.from(groupedByDay.entries())
			.map(([day, value]) => ({ day, avgMood: value.moodCount ? value.moodTotal / value.moodCount : 0 }))
			.sort((a, b) => (a.day < b.day ? 1 : -1));

		let lowMoodStreak = 0;
		for (const day of recentDays) {
			if (day.avgMood < 3) lowMoodStreak += 1;
			else break;
		}

		const stressValues = patient.checkIns
			.map((item) => item.stressLevel)
			.filter((value): value is number => typeof value === 'number');
		const stressScaleMax = stressValues.length ? Math.max(...stressValues) : 0;
		const stressThreshold = stressScaleMax > 5 ? 8 : 4;
		const stressSpikes = stressValues.filter((value) => value >= stressThreshold).length;

		const sleepValues = patient.checkIns
			.map((item) => item.sleep)
			.filter((value): value is number => typeof value === 'number');
		const sleepScaleMax = sleepValues.length ? Math.max(...sleepValues) : 0;
		const lowSleepCount = sleepValues.filter((value) => (sleepScaleMax > 5 ? value < 4 : value <= 2)).length;

		if (lowMoodStreak >= 3) {
			alerts.push({
				patientId: patient.id,
				patientName: patient.name,
				severity: 'high',
				trigger: 'mood_decline',
				message: `Mood decline detected for ${lowMoodStreak} consecutive days. Follow-up recommended.`,
			});
			continue;
		}

		if (stressSpikes >= 3) {
			alerts.push({
				patientId: patient.id,
				patientName: patient.name,
				severity: 'high',
				trigger: 'stress_spike',
				message: 'Repeated high-stress check-ins detected this week. Consider outreach.',
			});
			continue;
		}

		if (lowSleepCount >= 3) {
			alerts.push({
				patientId: patient.id,
				patientName: patient.name,
				severity: 'medium',
				trigger: 'sleep_risk',
				message: 'Repeated low-sleep pattern observed. Sleep-focused support recommended.',
			});
		}
	}

	return alerts;
};

const toMinorUnits = (value: unknown): number => {
	if (typeof value === 'bigint') return Number(value);
	if (typeof value === 'number') return value;
	if (typeof value === 'string' && value.trim()) return Number(value);
	return 0;
};

const minuteToTime = (minute: number): string => {
	const hours = Math.floor(minute / 60)
		.toString()
		.padStart(2, '0');
	const mins = (minute % 60).toString().padStart(2, '0');
	return `${hours}:${mins}`;
};

const timeToMinute = (value: string): number => {
	const [hoursRaw, minutesRaw] = String(value || '00:00').split(':');
	const hours = Number.parseInt(hoursRaw || '0', 10);
	const minutes = Number.parseInt(minutesRaw || '0', 10);
	return Math.max(0, Math.min(23, hours)) * 60 + Math.max(0, Math.min(59, minutes));
};

const normalizeSpecializations = (values: string[]): string[] => {
	const normalized = values
		.map((value) => String(value || '').trim())
		.filter(Boolean);
	return Array.from(new Set(normalized));
};

const buildDefaultAvailabilityGrid = () =>
	Array.from({ length: 7 }, (_, index) => ({
		dayOfWeek: index,
		startTime: '09:00',
		endTime: '17:00',
		isAvailable: false,
	}));

const getProviderRole = async (providerId: string, options?: { allowLearner?: boolean }): Promise<ProviderDashboardRole> => {
	const user = await prisma.user.findUnique({
		where: { id: providerId },
		select: { role: true },
	});

	if (!user) {
		throw new AppError('Provider not found', 404);
	}

	const role = String(user.role).toUpperCase() as ProviderDashboardRole;
	const allowedRoles: ProviderDashboardRole[] = options?.allowLearner
		? ['THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH', 'LEARNER']
		: ['THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH'];
	if (!allowedRoles.includes(role)) {
		throw new AppError('Access denied. Provider role required', 403);
	}

	return role;
};

const formatSessionDate = (value: Date | null | undefined): string | null => {
	if (!value) return null;
	return new Intl.DateTimeFormat('en-US', {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hour12: true,
	}).format(value);
};

const toStoredNoteStatus = (value: string | undefined): 'draft' | 'signed' => (
	String(value || '').toLowerCase() === 'signed' ? 'signed' : 'draft'
);

const toDisplayNoteStatus = (value: string | undefined): 'Draft' | 'Signed' => (
	String(value || '').toLowerCase() === 'signed' ? 'Signed' : 'Draft'
);

const parseDurationMinutes = (value: unknown): number => {
	const raw = String(value ?? '').trim();
	const parsed = Number.parseInt(raw.replace(/[^0-9]/g, ''), 10);
	if (Number.isNaN(parsed) || parsed <= 0) return 50;
	return parsed;
};

const ASSESSMENT_ANSWER_LABELS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

const formatAssessmentAnswers = (questions: readonly string[], rawAnswers: number[]): Array<{ prompt: string; answer: string; points: number }> => {
	return questions.map((prompt, index) => {
		const raw = Number(rawAnswers[index]);
		const points = Number.isFinite(raw) ? Math.min(3, Math.max(0, raw)) : 0;
		return {
			prompt,
			answer: ASSESSMENT_ANSWER_LABELS[points] || ASSESSMENT_ANSWER_LABELS[0],
			points,
		};
	});
};

const mapPatientSessionStatus = (status: string): 'Pending' | 'In Progress' | 'Completed' => {
	const normalized = String(status || '').toUpperCase();
	if (normalized === 'COMPLETED') return 'Completed';
	if (normalized === 'IN_PROGRESS') return 'In Progress';
	return 'Pending';
};

const toDisplayResponseValue = (value: unknown): string => {
	if (value === null || value === undefined) return '-';
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	if (Array.isArray(value)) {
		if (value.length === 0) return '-';
		return value.map((entry) => String(entry)).join(', ');
	}

	if (typeof value === 'object') {
		const record = value as Record<string, unknown>;
		if (record.text !== undefined) return String(record.text || '-');
		if (record.value !== undefined) return String(record.value);
		if (record.selectedOptionId !== undefined) return String(record.selectedOptionId);
		if (Array.isArray(record.selectedOptions)) {
			return record.selectedOptions.map((entry) => String(entry)).join(', ') || '-';
		}
		return JSON.stringify(record);
	}

	return String(value);
};

const GOAL_WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const getGoalCategory = (title: string, activityType: string): string => {
	const normalizedTitle = String(title || '').toLowerCase();
	if (normalizedTitle.includes('sleep')) return 'Sleep';
	if (normalizedTitle.includes('nutrition') || normalizedTitle.includes('meal') || normalizedTitle.includes('hydrate')) {
		return 'Nutrition';
	}
	if (normalizedTitle.includes('journal')) return 'Journaling';
	if (normalizedTitle.includes('mindful') || normalizedTitle.includes('meditat') || normalizedTitle.includes('breath')) {
		return 'Mindfulness';
	}

	const type = String(activityType || '').toUpperCase();
	if (type === 'AUDIO_THERAPY' || type === 'MOOD_CHECKIN') return 'Mindfulness';
	if (type === 'EXERCISE') return 'Movement';
	if (type === 'READING_MATERIAL') return 'Learning';
	if (type === 'CLINICAL_ASSESSMENT') return 'Assessment';
	return 'Wellness';
};

const mondayStart = (date: Date): Date => {
	const d = new Date(date);
	const day = d.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + diff);
	d.setHours(0, 0, 0, 0);
	return d;
};

const toGoalTrackerIndex = (date: Date): number => {
	const day = date.getDay();
	return day === 0 ? 6 : day - 1;
};

const buildWeeklyTracker = (
	activityStatus: string,
	createdAt: Date,
	completedAt: Date | null,
): Array<'completed' | 'missed' | 'empty'> => {
	const tracker: Array<'completed' | 'missed' | 'empty'> = ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'];
	const now = new Date();
	const weekStart = mondayStart(now);

	for (let index = 0; index < 7; index += 1) {
		const dayDate = new Date(weekStart);
		dayDate.setDate(weekStart.getDate() + index);
		if (dayDate.getTime() > now.getTime()) continue;
		if (createdAt.getTime() > dayDate.getTime()) continue;
		tracker[index] = 'missed';
	}

	if (completedAt) {
		const start = mondayStart(completedAt);
		if (start.getTime() === weekStart.getTime()) {
			tracker[toGoalTrackerIndex(completedAt)] = 'completed';
		}
	}

	if (String(activityStatus || '').toUpperCase() === 'COMPLETED' && !completedAt) {
		tracker[Math.min(6, toGoalTrackerIndex(now))] = 'completed';
	}

	return tracker;
};

const calculateCompletionRate = (tracker: Array<'completed' | 'missed' | 'empty'>): number => {
	const activeDays = tracker.filter((value) => value !== 'empty').length;
	if (!activeDays) return 0;
	const completedDays = tracker.filter((value) => value === 'completed').length;
	return Math.round((completedDays / activeDays) * 100);
};

const calculateStreak = (tracker: Array<'completed' | 'missed' | 'empty'>): number => {
	let streak = 0;
	for (let index = tracker.length - 1; index >= 0; index -= 1) {
		if (tracker[index] === 'completed') {
			streak += 1;
			continue;
		}
		if (tracker[index] === 'empty') continue;
		break;
	}
	return streak;
};

const ensureProviderPatientAccess = async (providerId: string, patientId: string): Promise<{ patientProfileId: string }> => {
	const [patient, careTeamAccess, sessionAccess] = await Promise.all([
		prisma.user.findUnique({
			where: { id: patientId },
			select: {
				id: true,
				patientProfile: { select: { id: true } },
			},
		}),
		prisma.careTeamAssignment.findFirst({
			where: {
				providerId,
				patientId,
				status: 'ACTIVE',
			},
			select: { id: true },
		}),
		prisma.therapySession.findFirst({
			where: {
				therapistProfileId: providerId,
				patientProfile: { userId: patientId },
			},
			select: { id: true },
		}),
	]);

	if (!patient?.patientProfile) {
		throw new AppError('Patient not found', 404);
	}

	if (!careTeamAccess && !sessionAccess) {
		throw new AppError('Forbidden', 403);
	}

	return { patientProfileId: patient.patientProfile.id };
};

export const getProviderDashboardController = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	const role = await getProviderRole(providerId, { allowLearner: true });
	const { startOfDay, endOfDay, startOfMonth } = getDateBounds();
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
	sevenDaysAgo.setHours(0, 0, 0, 0);

	const [
		todaySessions,
		totalSessionsToday,
		completedSessionsThisMonth,
		totalSessionsThisMonth,
		activePrescriptions,
		activeGoals,
		pendingNotes,
		activeAssignments,
		sessionPatientProfiles,
	] = await Promise.all([
		prisma.therapySession.findMany({
			where: {
				therapistProfileId: providerId,
				dateTime: { gte: startOfDay, lte: endOfDay },
			},
			orderBy: { dateTime: 'asc' },
			include: {
				patientProfile: {
					include: {
						user: {
							select: {
								name: true,
								firstName: true,
								lastName: true,
							},
						},
					},
				},
				therapistSessionNote: {
					select: { sessionType: true },
				},
			},
		}),
		prisma.therapySession.count({
			where: {
				therapistProfileId: providerId,
				dateTime: { gte: startOfDay, lte: endOfDay },
			},
		}),
		prisma.therapySession.count({
			where: {
				therapistProfileId: providerId,
				dateTime: { gte: startOfMonth },
				status: 'COMPLETED',
			},
		}),
		prisma.therapySession.count({
			where: {
				therapistProfileId: providerId,
				dateTime: { gte: startOfMonth },
			},
		}),
		prisma.prescription.count({
			where: {
				providerId,
				status: 'ACTIVE',
			},
		}),
		prisma.goal.count({
			where: {
				providerId,
				status: 'IN_PROGRESS',
			},
		}),
		prisma.therapySession.count({
			where: {
				therapistProfileId: providerId,
				status: 'COMPLETED',
				therapistSessionNote: null,
			},
		}),
		prisma.careTeamAssignment.findMany({
			where: {
				providerId,
				status: 'ACTIVE',
			},
			select: { patientId: true },
		}),
		prisma.therapySession.findMany({
			where: { therapistProfileId: providerId },
			distinct: ['patientProfileId'],
			select: {
				patientProfile: {
					select: { userId: true },
				},
			},
		}),
	]);

	const uniquePatientIds = new Set<string>();
	for (const row of activeAssignments) uniquePatientIds.add(row.patientId);
	for (const row of sessionPatientProfiles) {
		if (row.patientProfile?.userId) uniquePatientIds.add(row.patientProfile.userId);
	}

	const patientIds = Array.from(uniquePatientIds);
	const [patientUsers, recentDailyCheckIns] = patientIds.length
		? await Promise.all([
			prisma.user.findMany({
				where: { id: { in: patientIds } },
				select: { id: true, firstName: true, lastName: true, name: true },
			}),
			prisma.dailyCheckIn.findMany({
				where: {
					patientId: { in: patientIds },
					date: { gte: new Date(Date.now() - (10 * 24 * 60 * 60 * 1000)) },
				},
				orderBy: { date: 'desc' },
				select: { patientId: true, date: true, mood: true, stressLevel: true, sleep: true },
			}),
		])
		: [[], []];

	const patientNameMap = new Map<string, string>();
	for (const user of patientUsers) {
		patientNameMap.set(user.id, toPatientName(user.firstName, user.lastName, user.name));
	}

	const checkInsByPatient = new Map<string, Array<{ date: Date; mood: number; stressLevel: number | null; sleep: number | null }>>();
	for (const row of recentDailyCheckIns) {
		const list = checkInsByPatient.get(row.patientId) || [];
		list.push({
			date: row.date,
			mood: Number(row.mood || 0),
			stressLevel: row.stressLevel,
			sleep: row.sleep,
		});
		checkInsByPatient.set(row.patientId, list);
	}

	const smartAlerts = buildSmartTherapistAlerts(
		patientIds.map((patientId) => ({
			id: patientId,
			name: patientNameMap.get(patientId) || 'Patient',
			checkIns: checkInsByPatient.get(patientId) || [],
		})),
	);

	const activePatients = uniquePatientIds.size;
	const adherenceRate = formatRate(completedSessionsThisMonth, totalSessionsThisMonth);
	const scheduleAlerts = todaySessions.filter((session) => {
		const status = String(session.status).toUpperCase();
		return status === 'PENDING' || status === 'CANCELLED';
	}).length;
	const patientAlerts = scheduleAlerts + smartAlerts.length;

	const statsByRole: Record<ProviderDashboardRole, Record<string, string | number>> = {
		THERAPIST: {
			totalSessions: totalSessionsToday,
			activePatients,
			pendingNotes,
			patientAlerts,
		},
		PSYCHOLOGIST: {
			totalSessions: totalSessionsToday,
			activePatients,
			pendingNotes,
			patientAlerts,
		},
		PSYCHIATRIST: {
			consultsToday: totalSessionsToday,
			activePrescriptions,
			interactionWarnings: patientAlerts,
			adherenceRate,
		},
		COACH: {
			checkInsToday: totalSessionsToday,
			activeGoals,
			habitStreaks: completedSessionsThisMonth,
			adherenceRate,
		},
		LEARNER: {
			totalSessions: totalSessionsToday,
			activePatients,
			pendingNotes,
			patientAlerts,
		},
	};

	const responseData = {
		stats: statsByRole[role],
		smartAlerts,
		todaySessions: todaySessions.map((session) => {
			const patient = session.patientProfile?.user;
			const patientName = toPatientName(patient?.firstName, patient?.lastName, patient?.name);
			return {
				id: session.id,
				patientName,
				patientInitials: toInitials(patient?.firstName, patient?.lastName, patient?.name),
				time: formatSessionTime(session.dateTime),
				type: session.therapistSessionNote?.sessionType || 'Consultation',
				status: mapSessionStatus(String(session.status)),
			};
		}),
	};

	sendSuccess(res, responseData, 'Provider dashboard fetched');
};

export const getProviderEarnings = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);

	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	monthStart.setHours(0, 0, 0, 0);

	const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
	sixMonthsStart.setHours(0, 0, 0, 0);

	const [therapistProfile, wallet, sessions] = await Promise.all([
		prisma.therapistProfile.findUnique({
			where: { userId: providerId },
			select: { consultationFee: true },
		}),
		prisma.providerWallet.findUnique({
			where: { providerId },
			select: { pendingBalanceMinor: true },
		}),
		prisma.therapySession.findMany({
			where: {
				therapistProfileId: providerId,
				status: { in: ['CONFIRMED', 'COMPLETED'] },
				dateTime: { gte: sixMonthsStart },
			},
			orderBy: { dateTime: 'desc' },
			select: {
				id: true,
				bookingReferenceId: true,
				dateTime: true,
				status: true,
				sessionFeeMinor: true,
				patientProfile: {
					select: {
						user: {
							select: {
								firstName: true,
								lastName: true,
								name: true,
							},
						},
					},
				},
			},
		}),
	]);

	const providerRateMinor = Math.max(0, toMinorUnits(therapistProfile?.consultationFee));
	const toSessionAmountMinor = (sessionFeeMinor: unknown): number => {
		const storedAmount = toMinorUnits(sessionFeeMinor);
		return storedAmount > 0 ? storedAmount : providerRateMinor;
	};

	const totalRevenueMinor = sessions.reduce((sum, session) => sum + toSessionAmountMinor(session.sessionFeeMinor), 0);
	const pendingPayoutsMinor = Math.max(0, toMinorUnits(wallet?.pendingBalanceMinor));
	const sessionsThisMonth = sessions.filter((session) => new Date(session.dateTime) >= monthStart).length;

	const monthBuckets = Array.from({ length: 6 }, (_, index) => {
		const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
		return {
			key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
			label: date.toLocaleDateString('en-US', { month: 'short' }),
			amountMinor: 0,
			sessions: 0,
		};
	});

	const monthBucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));
	for (const session of sessions) {
		const sessionDate = new Date(session.dateTime);
		const key = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
		const bucket = monthBucketMap.get(key);
		if (!bucket) continue;
		bucket.amountMinor += toSessionAmountMinor(session.sessionFeeMinor);
		bucket.sessions += 1;
	}

	const recentTransactions = sessions.slice(0, 10).map((session) => ({
		id: session.id,
		bookingReferenceId: session.bookingReferenceId,
		date: session.dateTime,
		patientName: toPatientName(
			session.patientProfile.user.firstName,
			session.patientProfile.user.lastName,
			session.patientProfile.user.name,
		),
		amountMinor: toSessionAmountMinor(session.sessionFeeMinor),
		status: String(session.status),
	}));

	sendSuccess(
		res,
		{
			summary: {
				totalEarningsMinor: totalRevenueMinor,
				pendingPayoutsMinor,
				sessionsThisMonth,
				sessionRateMinor: providerRateMinor,
			},
			monthlyTrend: monthBuckets,
			recentTransactions,
		},
		'Provider earnings fetched',
	);
};

export const getProviderPatients = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);

	const [careTeamAssignments, providerSessions] = await Promise.all([
		prisma.careTeamAssignment.findMany({
			where: { providerId, status: 'ACTIVE' },
			select: { patientId: true },
		}),
		prisma.therapySession.findMany({
			where: { therapistProfileId: providerId },
			orderBy: { dateTime: 'desc' },
			select: {
				dateTime: true,
				status: true,
				patientProfile: {
					select: {
						userId: true,
					},
				},
			},
		}),
	]);

	const patientIdSet = new Set<string>();
	for (const assignment of careTeamAssignments) patientIdSet.add(assignment.patientId);
	for (const session of providerSessions) {
		if (session.patientProfile?.userId) patientIdSet.add(session.patientProfile.userId);
	}

	const patientIds = Array.from(patientIdSet);
	if (patientIds.length === 0) {
		sendSuccess(res, [], 'Provider patients fetched');
		return;
	}

	const users = await prisma.user.findMany({
		where: { id: { in: patientIds } },
		select: {
			id: true,
			name: true,
			firstName: true,
			lastName: true,
			email: true,
			patientProfile: {
				select: { medicalHistory: true },
			},
		},
	});

	const sessionsByPatient = new Map<string, Array<{ dateTime: Date; status: string }>>();
	for (const session of providerSessions) {
		const patientId = session.patientProfile?.userId;
		if (!patientId) continue;
		const existing = sessionsByPatient.get(patientId) || [];
		existing.push({ dateTime: session.dateTime, status: String(session.status) });
		sessionsByPatient.set(patientId, existing);
	}

	const now = new Date();
	const patients = users
		.map((user) => {
			const relatedSessions = sessionsByPatient.get(user.id) || [];
			const sortedAsc = [...relatedSessions].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
			const lastSession = [...sortedAsc].reverse().find((session) => session.dateTime.getTime() <= now.getTime());
			const nextSession = sortedAsc.find((session) => session.dateTime.getTime() > now.getTime());
			const fullName = toPatientName(user.firstName, user.lastName, user.name);
			const primaryConcern = String(user.patientProfile?.medicalHistory || '').trim() || 'Evaluation Pending';

			return {
				id: user.id,
				name: fullName,
				email: user.email || null,
				primaryConcern,
				lastSessionDate: formatSessionDate(lastSession?.dateTime),
				nextSessionDate: formatSessionDate(nextSession?.dateTime),
				status: 'Active',
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	sendSuccess(res, patients, 'Provider patients fetched');
};

export const getProviderCalendarSessions = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);

	const sessions = await prisma.therapySession.findMany({
		where: { therapistProfileId: providerId },
		orderBy: { dateTime: 'asc' },
		select: {
			id: true,
			bookingReferenceId: true,
			dateTime: true,
			durationMinutes: true,
			status: true,
			patientProfile: {
				select: {
					userId: true,
					user: {
						select: {
							firstName: true,
							lastName: true,
							name: true,
						},
					},
				},
			},
		},
	});

	const now = new Date();
	const responseData = sessions.map((session) => {
		const rawStatus = String(session.status || '').toUpperCase();
		const sessionDate = new Date(session.dateTime);
		let status: 'Upcoming' | 'Completed' | 'Cancelled' = 'Upcoming';

		if (rawStatus === 'CANCELLED') {
			status = 'Cancelled';
		} else if (rawStatus === 'COMPLETED' || sessionDate.getTime() < now.getTime()) {
			status = 'Completed';
		}

		return {
			id: session.id,
			bookingReferenceId: session.bookingReferenceId,
			dateTime: session.dateTime.toISOString(),
			durationMinutes: session.durationMinutes,
			status,
			patientId: String(session.patientProfile.userId),
			patientName: toPatientName(
				session.patientProfile.user.firstName,
				session.patientProfile.user.lastName,
				session.patientProfile.user.name,
			),
		};
	});

	sendSuccess(res, responseData, 'Provider calendar sessions fetched');
};

export const getProviderSettings = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);

	const provider = await prisma.user.findUnique({
		where: { id: providerId },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			name: true,
			email: true,
			profileImageUrl: true,
			therapistProfile: {
				select: {
					bio: true,
					specializations: true,
					availability: true,
				},
			},
		},
	});

	if (!provider) {
		throw new AppError('Provider not found', 404);
	}

	const defaultGrid = buildDefaultAvailabilityGrid();
	const storedAvailability = Array.isArray(provider.therapistProfile?.availability)
		? (provider.therapistProfile?.availability as Array<Record<string, unknown>>)
		: [];
	const availabilityByDay = new Map<number, { startTime: string; endTime: string; isAvailable: boolean }>();
	for (const slot of storedAvailability) {
		const dayOfWeek = Number(slot.dayOfWeek);
		if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || availabilityByDay.has(dayOfWeek)) continue;
		availabilityByDay.set(dayOfWeek, {
			startTime: minuteToTime(Number(slot.startMinute ?? 540)),
			endTime: minuteToTime(Number(slot.endMinute ?? 1020)),
			isAvailable: Boolean(slot.isAvailable),
		});
	}

	const availabilitySlots = defaultGrid.map((day) => ({
		dayOfWeek: day.dayOfWeek,
		startTime: availabilityByDay.get(day.dayOfWeek)?.startTime || day.startTime,
		endTime: availabilityByDay.get(day.dayOfWeek)?.endTime || day.endTime,
		isAvailable: availabilityByDay.get(day.dayOfWeek)?.isAvailable || false,
	}));

	sendSuccess(
		res,
		{
			providerId: provider.id,
			displayName: toPatientName(provider.firstName, provider.lastName, provider.name),
			email: provider.email,
			bio: provider.therapistProfile?.bio || '',
			specializations: provider.therapistProfile?.specializations || [],
			profileImageUrl: provider.profileImageUrl || '',
			availabilitySlots,
		},
		'Provider settings fetched',
	);
};

export const updateProviderSettings = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);

	const bio = String(req.body?.bio || '').trim();
	const profileImageUrl = String(req.body?.profileImageUrl || '').trim();
	const specializations = normalizeSpecializations(
		Array.isArray(req.body?.specializations)
			? req.body.specializations.map((value: unknown) => String(value || ''))
			: String(req.body?.specializations || '')
				.split(',')
				.map((value) => value.trim()),
	);
	const rawAvailability = Array.isArray(req.body?.availabilitySlots) ? req.body.availabilitySlots : [];

	if (!bio) {
		throw new AppError('Bio is required', 400);
	}
	if (bio.length > 2000) {
		throw new AppError('Bio max length is 2000 characters', 400);
	}
	if (!specializations.length) {
		throw new AppError('At least one specialty is required', 400);
	}

	const availabilitySlots = buildDefaultAvailabilityGrid().map((defaultDay) => {
		const incoming = rawAvailability.find((entry: any) => Number(entry?.dayOfWeek) === defaultDay.dayOfWeek) as Record<string, unknown> | undefined;
		const startTime = String(incoming?.startTime || defaultDay.startTime);
		const endTime = String(incoming?.endTime || defaultDay.endTime);
		const startMinute = timeToMinute(startTime);
		const endMinute = timeToMinute(endTime);
		const isAvailable = Boolean(incoming?.isAvailable);
		if (isAvailable && endMinute <= startMinute) {
			throw new AppError(`End time must be after start time for day ${defaultDay.dayOfWeek}`, 400);
		}
		return {
			dayOfWeek: defaultDay.dayOfWeek,
			startMinute,
			endMinute,
			isAvailable,
		};
	});

	const user = await prisma.user.findUnique({
		where: { id: providerId },
		select: { id: true, name: true, firstName: true, lastName: true },
	});
	if (!user) {
		throw new AppError('Provider not found', 404);
	}
	const displayName = String(user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()).trim() || 'Provider';

	const [, profile] = await prisma.$transaction([
		prisma.user.update({
			where: { id: providerId },
			data: { profileImageUrl: profileImageUrl || null },
		}),
		prisma.therapistProfile.upsert({
			where: { userId: providerId },
			update: {
				displayName,
				bio,
				specializations,
				availability: availabilitySlots,
			},
			create: {
				userId: providerId,
				displayName,
				bio,
				specializations,
				languages: [],
				yearsOfExperience: 0,
				consultationFee: 0,
				availability: availabilitySlots,
			},
		}),
	]);

	const responseData = {
		providerId,
		displayName,
		bio: profile.bio || '',
		specializations: profile.specializations || [],
		profileImageUrl: profileImageUrl || '',
		availabilitySlots: availabilitySlots.map((slot) => ({
			dayOfWeek: slot.dayOfWeek,
			startTime: minuteToTime(slot.startMinute),
			endTime: minuteToTime(slot.endMinute),
			isAvailable: slot.isAvailable,
		})),
	};

	sendSuccess(res, responseData, 'Provider settings updated');
};

export const getPatientOverview = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	const [careTeamAccess, sessionAccess] = await Promise.all([
		prisma.careTeamAssignment.findFirst({
			where: {
				providerId,
				patientId,
				status: 'ACTIVE',
			},
			select: { id: true },
		}),
		prisma.therapySession.findFirst({
			where: {
				therapistProfileId: providerId,
				patientProfile: {
					userId: patientId,
				},
			},
			select: { id: true },
		}),
	]);

	if (!careTeamAccess && !sessionAccess) {
		throw new AppError('Forbidden', 403);
	}

	const patient = await prisma.user.findUnique({
		where: { id: patientId },
		select: {
			id: true,
			name: true,
			firstName: true,
			lastName: true,
			email: true,
			patientProfile: {
				select: {
					id: true,
					age: true,
					medicalHistory: true,
				},
			},
		},
	});

	if (!patient?.patientProfile) {
		throw new AppError('Patient not found', 404);
	}

	const now = new Date();

	const [upcomingSession, lastSession, phq9Assessments, gad7Assessments, signedNotes] = await Promise.all([
		prisma.therapySession.findFirst({
			where: {
				therapistProfileId: providerId,
				patientProfile: { userId: patientId },
				dateTime: { gt: now },
			},
			orderBy: { dateTime: 'asc' },
			select: {
				id: true,
				dateTime: true,
				status: true,
			},
		}),
		prisma.therapySession.findFirst({
			where: {
				therapistProfileId: providerId,
				patientProfile: { userId: patientId },
				status: 'COMPLETED',
				dateTime: { lte: now },
			},
			orderBy: { dateTime: 'desc' },
			select: {
				id: true,
				dateTime: true,
				status: true,
			},
		}),
		prisma.pHQ9Assessment.findMany({
			where: { userId: patientId },
			orderBy: { assessedAt: 'desc' },
			take: 2,
			select: {
				id: true,
				totalScore: true,
				severity: true,
				assessedAt: true,
			},
		}),
		prisma.gAD7Assessment.findMany({
			where: { userId: patientId },
			orderBy: { assessedAt: 'desc' },
			take: 2,
			select: {
				id: true,
				totalScore: true,
				severity: true,
				assessedAt: true,
			},
		}),
		prisma.therapistSessionNote.findMany({
			where: {
				therapistId: providerId,
				patient: { userId: patientId },
				status: 'signed',
			},
			orderBy: { updatedAt: 'desc' },
			take: 3,
			select: {
				id: true,
				updatedAt: true,
				sessionType: true,
			},
		}),
	]);

	const recentAssessments = [
		...phq9Assessments.map((item) => ({
			id: item.id,
			type: 'PHQ-9',
			score: item.totalScore,
			severity: item.severity,
			date: formatSessionDate(item.assessedAt),
			timestamp: item.assessedAt.getTime(),
		})),
		...gad7Assessments.map((item) => ({
			id: item.id,
			type: 'GAD-7',
			score: item.totalScore,
			severity: item.severity,
			date: formatSessionDate(item.assessedAt),
			timestamp: item.assessedAt.getTime(),
		})),
	]
		.sort((a, b) => b.timestamp - a.timestamp)
		.slice(0, 3)
		.map(({ timestamp, ...rest }) => rest);

	const activityEvents = [
		...signedNotes.map((note) => ({
			title: 'Note Signed',
			description: `${note.sessionType || 'Session'} note signed by provider.`,
			time: formatSessionDate(note.updatedAt) || 'Recently',
			timestamp: note.updatedAt.getTime(),
		})),
		...recentAssessments.map((assessment) => ({
			title: `${assessment.type} Completed`,
			description: `${assessment.type} score ${assessment.score} (${assessment.severity}).`,
			time: assessment.date || 'Recently',
			timestamp: new Date(assessment.date || 0).getTime() || now.getTime(),
		})),
		...(lastSession
			? [{
				title: 'Session Completed',
				description: 'Most recent completed therapy session.',
				time: formatSessionDate(lastSession.dateTime) || 'Recently',
				timestamp: lastSession.dateTime.getTime(),
			}]
			: []),
	]
		.sort((a, b) => b.timestamp - a.timestamp)
		.slice(0, 3)
		.map(({ timestamp, ...rest }) => rest);

	// Fetch recent mood entries for this patient and compute simple mood stats
	const moodRowsRaw = await prisma.patientMoodEntry.findMany({
		where: { patient: { userId: patientId } },
		orderBy: { date: 'desc' },
		take: 30,
		select: { moodScore: true, date: true, metadata: true },
	}).catch(() => []);

	const moodRows = Array.isArray(moodRowsRaw)
		? moodRowsRaw.map((r) => ({ mood: Number(r.moodScore || 0), date: new Date(r.date), metadata: r.metadata || {} }))
		: [];

	const totalCheckins = moodRows.length;
	const averageMood = totalCheckins ? Number((moodRows.reduce((s, r) => s + r.mood, 0) / totalCheckins).toFixed(2)) : 0;
	const sevenDaysAgoForPatient = new Date();
	sevenDaysAgoForPatient.setDate(sevenDaysAgoForPatient.getDate() - 7);
	const last7Rows = moodRows.filter((r) => r.date >= sevenDaysAgoForPatient);
	const last7DaysAverage = last7Rows.length ? Number((last7Rows.reduce((s, r) => s + r.mood, 0) / last7Rows.length).toFixed(2)) : 0;

	// compute current streak (consecutive days with at least one check-in up to today)
	let currentStreak = 0;
	{
		const seenDays = new Set(moodRows.map((r) => r.date.toISOString().slice(0, 10)));
		let cursor = new Date();
		while (true) {
			const key = cursor.toISOString().slice(0, 10);
			if (seenDays.has(key)) {
				currentStreak += 1;
				cursor.setDate(cursor.getDate() - 1);
			} else break;
		}
	}

	const patientName = toPatientName(patient.firstName, patient.lastName, patient.name);
	const diagnosis = String(patient.patientProfile.medicalHistory || '').trim() || 'Evaluation Pending';

	const responseData = {
		patient: {
			id: patient.id,
			name: patientName,
			age: patient.patientProfile.age,
			diagnosis,
			email: patient.email || null,
		},
		upcomingSession: upcomingSession
			? {
				id: upcomingSession.id,
				dateTime: formatSessionDate(upcomingSession.dateTime),
			}
			: null,
		lastSession: lastSession
			? {
				id: lastSession.id,
				dateTime: formatSessionDate(lastSession.dateTime),
			}
			: null,
		recentAssessments,
		recentActivity: activityEvents,
		moodStats: {
			totalCheckins,
			averageMood,
			last7DaysAverage,
			currentStreak,
			recent: moodRows.slice(0, 10).map((r) => ({ mood: r.mood, date: r.date.toISOString(), metadata: r.metadata })),
		},
	};

	sendSuccess(res, responseData, 'Patient overview fetched');
};

export const getPatientAssessments = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	await ensureProviderPatientAccess(providerId, patientId);

	const [phq9Assessments, gad7Assessments] = await Promise.all([
		prisma.pHQ9Assessment.findMany({
			where: { userId: patientId },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				totalScore: true,
				answers: true,
				createdAt: true,
			},
		}),
		prisma.gAD7Assessment.findMany({
			where: { userId: patientId },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				totalScore: true,
				answers: true,
				createdAt: true,
			},
		}),
	]);

	const normalized = [
		...phq9Assessments.map((item) => ({
			id: item.id,
			type: 'PHQ-9' as const,
			date: item.createdAt,
			totalScore: item.totalScore,
			severity: getPHQ9SeverityLabel(item.totalScore),
			answers: formatAssessmentAnswers(PHQ9_QUESTIONS, item.answers),
		})),
		...gad7Assessments.map((item) => ({
			id: item.id,
			type: 'GAD-7' as const,
			date: item.createdAt,
			totalScore: item.totalScore,
			severity: getGAD7SeverityLabel(item.totalScore),
			answers: formatAssessmentAnswers(GAD7_QUESTIONS, item.answers),
		})),
	]
		.sort((a, b) => b.date.getTime() - a.date.getTime())
		.map((item) => ({
			id: item.id,
			type: item.type,
			date: item.date.toISOString(),
			totalScore: item.totalScore,
			severity: item.severity,
			answers: item.answers,
		}));

	sendSuccess(res, normalized, 'Patient assessments fetched');
};

export const getPatientNotes = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	const [{ patientProfileId }, provider] = await Promise.all([
		ensureProviderPatientAccess(providerId, patientId),
		prisma.user.findUnique({
			where: { id: providerId },
			select: { firstName: true, lastName: true, name: true },
		}),
	]);

	const providerName = toPatientName(provider?.firstName, provider?.lastName, provider?.name);

	const notes = await prisma.therapistSessionNote.findMany({
		where: {
			therapistId: providerId,
			patientId: patientProfileId,
		},
		orderBy: { createdAt: 'desc' },
		include: {
			session: {
				select: {
					dateTime: true,
					durationMinutes: true,
				},
			},
		},
	});

	const responseData = notes.map((note) => ({
		id: note.id,
		sessionId: note.sessionId,
		sessionDate: note.session.dateTime.toISOString(),
		date: formatSessionDate(note.session.dateTime),
		providerName,
		sessionType: note.sessionType,
		duration: `${note.session.durationMinutes} mins`,
		status: toDisplayNoteStatus(note.status),
		subjective: note.subjective,
		objective: note.objective,
		assessment: note.assessment,
		plan: note.plan,
		createdAt: note.createdAt.toISOString(),
	}));

	sendSuccess(res, responseData, 'Patient notes fetched');
};

export const createAddendum = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);

	const patientId = String(req.params.patientId || '').trim();
	const noteId = String(req.params.noteId || '').trim();
	const { content, providerSignature } = req.body as { content: string; providerSignature?: string };

	if (!noteId || !content) {
		sendError(res, 'noteId and content are required', 400);
		return;
	}

	try {
		// create addendum row
		const row = await prisma.addendum.create({ data: { noteId, content: String(content || ''), providerSignature: providerSignature ? String(providerSignature) : null } });
		sendSuccess(res, row, 'Addendum created');
	} catch (err) {
		console.error('createAddendum error', err);
		sendError(res, err instanceof Error ? err.message : 'Unable to create addendum', 500);
	}
};

export const createPatientNote = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();
	const existingSessionId = String(req.body?.sessionId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	const {
		subjective = '',
		objective = '',
		assessment = '',
		plan = '',
		sessionDate,
		sessionType,
		duration,
		status,
	} = req.body as {
		subjective?: string;
		objective?: string;
		assessment?: string;
		plan?: string;
		sessionDate?: string;
		sessionType?: string;
		duration?: string | number;
		status?: string;
	};

	const { patientProfileId } = await ensureProviderPatientAccess(providerId, patientId);

	const parsedDate = sessionDate ? new Date(sessionDate) : null;
	if (parsedDate && Number.isNaN(parsedDate.getTime())) {
		throw new AppError('Invalid sessionDate', 400);
	}

	const durationMinutes = duration !== undefined ? parseDurationMinutes(duration) : null;
	const noteStatus = toStoredNoteStatus(status);

	const created = await prisma.$transaction(async (tx) => {
		let session: { id: string; dateTime: Date; durationMinutes: number };

		if (existingSessionId) {
			const existingSession = await tx.therapySession.findFirst({
				where: {
					id: existingSessionId,
					therapistProfileId: providerId,
					patientProfileId,
				},
				select: {
					id: true,
					dateTime: true,
					durationMinutes: true,
					therapistSessionNote: {
						select: { id: true },
					},
				},
			});

			if (!existingSession) {
				throw new AppError('Session not found for this patient', 404);
			}

			if (existingSession.therapistSessionNote?.id) {
				throw new AppError('A note already exists for this session', 409);
			}

			session = await tx.therapySession.update({
				where: { id: existingSession.id },
				data: {
					dateTime: parsedDate || existingSession.dateTime,
					durationMinutes: durationMinutes ?? existingSession.durationMinutes,
					status: noteStatus === 'signed' ? 'COMPLETED' : 'PENDING',
				},
				select: {
					id: true,
					dateTime: true,
					durationMinutes: true,
				},
			});
		} else {
			session = await tx.therapySession.create({
				data: {
					bookingReferenceId: `NOTE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
					patientProfileId,
					therapistProfileId: providerId,
					dateTime: parsedDate || new Date(),
					durationMinutes: durationMinutes ?? 50,
					status: noteStatus === 'signed' ? 'COMPLETED' : 'PENDING',
				},
				select: {
					id: true,
					dateTime: true,
					durationMinutes: true,
				},
			});
		}

		const note = await tx.therapistSessionNote.create({
			data: {
				sessionId: session.id,
				therapistId: providerId,
				patientId: patientProfileId,
				sessionType: String(sessionType || 'Therapy Session').trim() || 'Therapy Session',
				subjective: String(subjective || ''),
				objective: String(objective || ''),
				assessment: String(assessment || ''),
				plan: String(plan || ''),
				status: noteStatus,
			},
			select: {
				id: true,
				sessionId: true,
				sessionType: true,
				subjective: true,
				objective: true,
				assessment: true,
				plan: true,
				status: true,
				createdAt: true,
			},
		});

		return { note, session };
	});

	const provider = await prisma.user.findUnique({
		where: { id: providerId },
		select: { firstName: true, lastName: true, name: true },
	});

	const responseData = {
		id: created.note.id,
		sessionId: created.note.sessionId,
		sessionDate: created.session.dateTime.toISOString(),
		date: formatSessionDate(created.session.dateTime),
		providerName: toPatientName(provider?.firstName, provider?.lastName, provider?.name),
		sessionType: created.note.sessionType,
		duration: `${created.session.durationMinutes} mins`,
		status: toDisplayNoteStatus(created.note.status),
		subjective: created.note.subjective,
		objective: created.note.objective,
		assessment: created.note.assessment,
		plan: created.note.plan,
		createdAt: created.note.createdAt.toISOString(),
	};

	sendSuccess(res, responseData, 'Patient note created');
};

export const updatePatientNote = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();
	const noteId = String(req.params.noteId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}
	if (!noteId) {
		throw new AppError('Note id is required', 400);
	}

	const { patientProfileId } = await ensureProviderPatientAccess(providerId, patientId);

	const existingNote = await prisma.therapistSessionNote.findFirst({
		where: {
			id: noteId,
			therapistId: providerId,
			patientId: patientProfileId,
		},
		include: {
			session: {
				select: {
					id: true,
					dateTime: true,
					durationMinutes: true,
				},
			},
		},
	});

	if (!existingNote) {
		throw new AppError('Note not found', 404);
	}

	if (String(existingNote.status || '').toLowerCase() === 'signed') {
		throw new AppError('Signed notes cannot be altered', 403);
	}

	const {
		subjective,
		objective,
		assessment,
		plan,
		sessionDate,
		sessionType,
		duration,
		status,
	} = req.body as {
		subjective?: string;
		objective?: string;
		assessment?: string;
		plan?: string;
		sessionDate?: string;
		sessionType?: string;
		duration?: string | number;
		status?: string;
	};

	const parsedDate = sessionDate ? new Date(sessionDate) : existingNote.session.dateTime;
	if (Number.isNaN(parsedDate.getTime())) {
		throw new AppError('Invalid sessionDate', 400);
	}

	const durationMinutes = duration !== undefined ? parseDurationMinutes(duration) : existingNote.session.durationMinutes;
	const noteStatus = status ? toStoredNoteStatus(status) : toStoredNoteStatus(existingNote.status);

	const updated = await prisma.$transaction(async (tx) => {
		const session = await tx.therapySession.update({
			where: { id: existingNote.sessionId },
			data: {
				dateTime: parsedDate,
				durationMinutes,
				status: noteStatus === 'signed' ? 'COMPLETED' : 'PENDING',
			},
			select: {
				id: true,
				dateTime: true,
				durationMinutes: true,
			},
		});

		const note = await tx.therapistSessionNote.update({
			where: { id: noteId },
			data: {
				sessionType: sessionType !== undefined ? String(sessionType).trim() || 'Therapy Session' : existingNote.sessionType,
				subjective: subjective !== undefined ? String(subjective) : existingNote.subjective,
				objective: objective !== undefined ? String(objective) : existingNote.objective,
				assessment: assessment !== undefined ? String(assessment) : existingNote.assessment,
				plan: plan !== undefined ? String(plan) : existingNote.plan,
				status: noteStatus,
			},
			select: {
				id: true,
				sessionId: true,
				patientId: true,
				sessionType: true,
				subjective: true,
				objective: true,
				assessment: true,
				plan: true,
				status: true,
				createdAt: true,
			},
		});

		return { note, session };
	});

	const provider = await prisma.user.findUnique({
		where: { id: providerId },
		select: { firstName: true, lastName: true, name: true },
	});

	const responseData = {
		id: updated.note.id,
		sessionId: updated.note.sessionId,
		sessionDate: updated.session.dateTime.toISOString(),
		date: formatSessionDate(updated.session.dateTime),
		providerName: toPatientName(provider?.firstName, provider?.lastName, provider?.name),
		sessionType: updated.note.sessionType,
		duration: `${updated.session.durationMinutes} mins`,
		status: toDisplayNoteStatus(updated.note.status),
		subjective: updated.note.subjective,
		objective: updated.note.objective,
		assessment: updated.note.assessment,
		plan: updated.note.plan,
		createdAt: updated.note.createdAt.toISOString(),
	};

	// Trigger PDF generation & upload for signed notes (fire-and-forget)
	if (String(updated.note.status || '').toLowerCase() === 'signed') {
		(async () => {
			try {
				const doc = new PDFDocument({ margin: 50 });
				const fileName = `note-${updated.note.id}-${Date.now()}.pdf`;
				const exportDir = path.join(process.cwd(), 'exports', 'notes');
				await fs.promises.mkdir(exportDir, { recursive: true });
				const tmpPath = path.join(exportDir, fileName);
				const stream = fs.createWriteStream(tmpPath);
				doc.pipe(stream);
				doc.fontSize(20).text('Clinical Note', { align: 'center' });
				doc.moveDown();
				doc.fontSize(12).text(`Therapist: ${responseData.providerName}`);
				doc.text(`Patient ID: ${updated.note.patientId}`);
				doc.text(`Session Date: ${responseData.sessionDate}`);
				doc.moveDown();
				doc.fontSize(12).text('Subjective');
				doc.fontSize(10).text(updated.note.subjective || '');
				doc.moveDown();
				doc.fontSize(12).text('Objective');
				doc.fontSize(10).text(updated.note.objective || '');
				doc.moveDown();
				doc.fontSize(12).text('Assessment');
				doc.fontSize(10).text(updated.note.assessment || '');
				doc.moveDown();
				doc.fontSize(12).text('Plan');
				doc.fontSize(10).text(updated.note.plan || '');
				doc.end();
				await new Promise<void>((resolve, reject) => stream.on('finish', () => resolve()).on('error', (err) => reject(err)));
				const buffer = await fs.promises.readFile(tmpPath);
						// resolve patient user id (notes store patientProfileId but inbox rooms use userId)
						let patientUserId = updated.note.patientId;
						try {
							const profile = await prisma.patientProfile.findUnique({ where: { id: String(updated.note.patientId) }, select: { userId: true } });
							if (profile?.userId) patientUserId = profile.userId;
						} catch {
							// fallback to whatever id we have
						}

						const objectKey = `patient-documents/${patientUserId}/${fileName}`;
						await s3Client.send(new PutObjectCommand(Object.assign({ Bucket: env.awsS3Bucket, Key: objectKey, Body: buffer, ContentType: 'application/pdf' }, env.awsS3DisableServerSideEncryption ? {} : { ServerSideEncryption: 'AES256' as ServerSideEncryption })));
						const createdDoc = await prisma.patientDocument.create({ data: { patientId: patientUserId, title: `Signed Note — ${responseData.sessionType}`, source: 'session-note', sourceId: updated.note.id, s3ObjectKey: objectKey } });
						try {
							// notify patient's inbox in real time if socket is available
							const { notifyPatientDocument } = await import('../routes/gps.routes');
							notifyPatientDocument(patientUserId, {
								id: createdDoc.id,
								title: createdDoc.title,
								date: createdDoc.createdAt,
								category: 'session',
								s3ObjectKey: createdDoc.s3ObjectKey,
							});
						} catch (e) {
							console.warn('real-time notify failed', e);
						}
			} catch (e) {
				console.error('note PDF generation/upload failed', e);
			}
		})();
	}

	sendSuccess(res, responseData, 'Patient note updated');
};

export const getConversations = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);

	const conversations = await getProviderConversations(providerId);
	sendSuccess(res, conversations, 'Provider conversations fetched');
};

export const getConversationMessages = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);

	const conversationId = String(req.params.conversationId || '').trim();
	const before = typeof req.query.before === 'string' ? req.query.before : undefined;

	if (!conversationId) {
		throw new AppError('Conversation id is required', 400);
	}

	const conversation = await prisma.directConversation.findFirst({
		where: {
			id: conversationId,
			providerId,
		},
		select: { id: true },
	});

	if (!conversation) {
		throw new AppError('Conversation not found', 404);
	}

	const messages = await getDirectConversationMessages(conversationId, providerId, 60, before);
	sendSuccess(res, messages, 'Conversation messages fetched');
};

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);

	const conversationId = String(req.body?.conversationId || '').trim();
	const content = String(req.body?.content || '').trim();
	const patientId = String(req.body?.patientId || '').trim();

	if (!content) {
		throw new AppError('Message content is required', 400);
	}
	if (content.length > 4000) {
		throw new AppError('Message too long (max 4000 characters)', 400);
	}

	let resolvedConversationId = conversationId;
	if (!resolvedConversationId) {
		if (!patientId) {
			throw new AppError('Conversation id or patient id is required', 400);
		}
		await ensureProviderPatientAccess(providerId, patientId);
		const conversation = await getOrCreateConversation(patientId, providerId);
		resolvedConversationId = conversation.id;
	}

	const message = await sendDirectMessage(resolvedConversationId, providerId, 'provider', content);
	sendSuccess(res, message, 'Message sent', 201);
};

export const getPatientPrescriptions = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	await ensureProviderPatientAccess(providerId, patientId);

	const prescriptions = await prisma.prescription.findMany({
		where: { patientId },
		orderBy: { prescribedDate: 'desc' },
	});

	const responseData = prescriptions.map((item) => ({
		id: item.id,
		drugName: item.drugName,
		dosage: item.dosage,
		instructions: item.instructions,
		prescribedDate: item.prescribedDate.toISOString(),
		refillsRemaining: item.refillsRemaining,
		status: String(item.status).toUpperCase() === 'ACTIVE' ? 'Active' : 'Discontinued',
		adherenceRate: item.adherenceRate,
		warnings: Array.isArray(item.warnings) ? item.warnings.map((warning) => String(warning)) : [],
	}));

	sendSuccess(res, responseData, 'Patient prescriptions fetched');
};

export const getPatientLabs = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	await ensureProviderPatientAccess(providerId, patientId);

	const labOrders = await prisma.labOrder.findMany({
		where: { patientId },
		orderBy: { dateOrdered: 'desc' },
	});

	const toLabStatus = (value: string): 'Pending' | 'Results Ready' | 'Reviewed' => {
		const normalized = String(value || '').toUpperCase();
		if (normalized === 'RESULTS_READY') return 'Results Ready';
		if (normalized === 'REVIEWED') return 'Reviewed';
		return 'Pending';
	};

	const toBiomarkerStatus = (value: string): 'High' | 'Normal' | 'Low' => {
		const normalized = String(value || '').toUpperCase();
		if (normalized === 'HIGH') return 'High';
		if (normalized === 'LOW') return 'Low';
		return 'Normal';
	};

	const responseData = labOrders.map((order) => {
		const biomarkersRaw = Array.isArray(order.biomarkers) ? order.biomarkers : [];
		const biomarkers = biomarkersRaw.map((entry) => {
			const row = entry as Record<string, unknown>;
			return {
				name: String(row.name || ''),
				value: String(row.value || ''),
				referenceRange: String(row.referenceRange || ''),
				status: toBiomarkerStatus(String(row.status || 'Normal')),
			};
		});

		return {
			id: order.id,
			testName: order.testName,
			dateOrdered: order.dateOrdered.toISOString(),
			status: toLabStatus(order.status),
			orderingPhysician: order.orderingPhysician,
			interpretation: order.interpretation,
			biomarkers,
		};
	});

	sendSuccess(res, responseData, 'Patient lab orders fetched');
};

export const saveWeeklyPlan = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	const inputDayNumber = Number(req.body?.dayNumber ?? req.body?.weekNumber);
	if (!Number.isInteger(inputDayNumber) || inputDayNumber < 1) {
		throw new AppError('dayNumber must be a positive integer', 400);
	}

	const activitiesInput = Array.isArray(req.body?.activities) ? req.body.activities : null;
	if (!activitiesInput) {
		throw new AppError('activities must be an array', 400);
	}

	const allowedFrequencies = ['DAILY_RITUAL', 'WEEKLY_MILESTONE', 'ONE_TIME'];
	const allowedActivityTypes = ['MOOD_CHECKIN', 'EXERCISE', 'AUDIO_THERAPY', 'CLINICAL_ASSESSMENT', 'READING_MATERIAL', 'SESSION_BOOKING'];

	const { patientProfileId } = await ensureProviderPatientAccess(providerId, patientId);

	let plan = await prisma.therapyPlan.findFirst({
		where: {
			patientId: patientProfileId,
			therapistId: providerId,
			status: 'ACTIVE',
		},
		orderBy: { createdAt: 'desc' },
		select: { id: true },
	});

	if (!plan) {
		const now = new Date();
		const endDate = new Date(now);
		endDate.setDate(endDate.getDate() + 30);

		plan = await prisma.therapyPlan.create({
			data: {
				patientId: patientProfileId,
				therapistId: providerId,
				title: 'Provider Assigned Plan',
				providerNote: 'Auto-created from weekly plan studio.',
				startDate: now,
				endDate,
				status: 'ACTIVE',
			},
			select: { id: true },
		});
	}

	const normalizedActivities = activitiesInput.map((item: any, index: number) => {
		const title = String(item?.title || '').trim();
		if (!title) {
			throw new AppError(`activities[${index}].title is required`, 400);
		}

		const frequency = String(item?.frequency || 'ONE_TIME').toUpperCase();
		const activityType = String(item?.activityType || 'EXERCISE').toUpperCase();

		return {
			id: item?.id ? String(item.id).trim() : '',
			planId: plan!.id,
			title,
			frequency: allowedFrequencies.includes(frequency) ? frequency : 'ONE_TIME',
			activityType: allowedActivityTypes.includes(activityType) ? activityType : 'EXERCISE',
			referenceId: item?.referenceId ? String(item.referenceId) : null,
			estimatedMinutes: Number.isFinite(Number(item?.estimatedMinutes)) ? Number(item.estimatedMinutes) : 10,
			orderIndex: Number.isInteger(Number(item?.orderIndex)) ? Number(item.orderIndex) : index,
			dayNumber: inputDayNumber,
			category: item?.category ? String(item.category).trim() || null : null,
			status: 'PENDING',
			isPublished: false,
		};
	});

	const result = await prisma.$transaction(async (tx) => {
		const existingWeekActivities = await tx.therapyPlanActivity.findMany({
			where: {
				planId: plan!.id,
				dayNumber: inputDayNumber,
			},
			select: {
				id: true,
			},
		});

		const existingIds = new Set(existingWeekActivities.map((activity) => activity.id));
		const retainedIds: string[] = [];
		let createdCount = 0;
		let updatedCount = 0;

		for (const activity of normalizedActivities) {
			const payload = {
				planId: activity.planId,
				title: activity.title,
				frequency: activity.frequency as any,
				activityType: activity.activityType as any,
				referenceId: activity.referenceId,
				estimatedMinutes: activity.estimatedMinutes,
				orderIndex: activity.orderIndex,
				dayNumber: activity.dayNumber,
				category: activity.category,
				status: activity.status,
				isPublished: activity.isPublished,
			};

			if (activity.id && existingIds.has(activity.id)) {
				await tx.therapyPlanActivity.update({
					where: { id: activity.id },
					data: payload,
				});
				retainedIds.push(activity.id);
				updatedCount += 1;
				continue;
			}

			const created = await tx.therapyPlanActivity.create({
				data: payload,
				select: { id: true },
			});
			retainedIds.push(created.id);
			createdCount += 1;
		}

		const deleted = await tx.therapyPlanActivity.deleteMany({
			where: {
				planId: plan!.id,
				dayNumber: inputDayNumber,
				status: 'PENDING',
				id: retainedIds.length > 0 ? { notIn: retainedIds } : undefined,
			},
		});

		return {
			deletedCount: deleted.count,
			insertedCount: createdCount,
			updatedCount,
		};
	});

	sendSuccess(res, {
		planId: plan.id,
		patientId,
		dayNumber: inputDayNumber,
		deletedCount: result.deletedCount,
		insertedCount: result.insertedCount,
		updatedCount: result.updatedCount,
	}, 'Weekly plan saved');
};

export const updateWeeklyPlan = saveWeeklyPlan;

export const publishWeeklyPlan = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	const inputDayNumber = Number(req.body?.dayNumber ?? req.body?.weekNumber);
	if (!Number.isInteger(inputDayNumber) || inputDayNumber < 1) {
		throw new AppError('dayNumber must be a positive integer', 400);
	}

	const { patientProfileId } = await ensureProviderPatientAccess(providerId, patientId);

	const plan = await prisma.therapyPlan.findFirst({
		where: {
			patientId: patientProfileId,
			therapistId: providerId,
			status: 'ACTIVE',
		},
		orderBy: { createdAt: 'desc' },
		select: { id: true },
	});

	if (!plan) {
		throw new AppError('No active plan found for this patient', 404);
	}

	const updated = await prisma.therapyPlanActivity.updateMany({
		where: {
			planId: plan.id,
			dayNumber: inputDayNumber,
		},
		data: {
			isPublished: true,
		},
	});

	sendSuccess(res, {
		planId: plan.id,
		patientId,
		dayNumber: inputDayNumber,
		publishedCount: updated.count,
	}, 'Weekly plan published');
};

export const scheduleNextSession = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	const startTimeRaw = String(req.body?.startTime || '').trim();
	if (!startTimeRaw) {
		throw new AppError('startTime is required', 400);
	}

	const startTime = new Date(startTimeRaw);
	if (Number.isNaN(startTime.getTime())) {
		throw new AppError('Invalid startTime format', 400);
	}

	const duration = Number(req.body?.duration);
	if (!Number.isInteger(duration) || duration <= 0) {
		throw new AppError('duration must be a positive integer (minutes)', 400);
	}

	const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));
	const { patientProfileId } = await ensureProviderPatientAccess(providerId, patientId);

	type OverlapRow = { id: string };
	const overlappingSessions = await prisma.$queryRaw<OverlapRow[]>`
		SELECT "id"
		FROM "therapy_sessions"
		WHERE "therapistProfileId" = ${providerId}
		  AND "status" IN ('PENDING', 'CONFIRMED')
		  AND "cancelledAt" IS NULL
		  AND "dateTime" < ${endTime}
		  AND ("dateTime" + (COALESCE("durationMinutes", 50) * INTERVAL '1 minute')) > ${startTime}
		LIMIT 1
	`;

	if (overlappingSessions.length > 0) {
		throw new AppError('Provider already has a session scheduled at this time', 409);
	}

	const createdSession = await prisma.therapySession.create({
		data: {
			bookingReferenceId: `LOCK-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
			patientProfileId,
			therapistProfileId: providerId,
			dateTime: startTime,
			durationMinutes: duration,
			status: 'CONFIRMED',
			isLocked: true,
		},
		select: {
			id: true,
			bookingReferenceId: true,
			dateTime: true,
			durationMinutes: true,
			status: true,
			isLocked: true,
		},
	});

	await prisma.notification.create({
		data: {
			userId: patientId,
			type: 'SESSION_SCHEDULED',
			title: 'New Session Scheduled',
			message: `Your provider scheduled a new session on ${formatSessionDate(createdSession.dateTime) || createdSession.dateTime.toISOString()}.`,
			payload: {
				event: 'NEW_SESSION_SCHEDULED',
				sessionId: createdSession.id,
				startTime: createdSession.dateTime.toISOString(),
				durationMinutes: createdSession.durationMinutes,
				isLocked: createdSession.isLocked,
			},
			sentAt: new Date(),
		},
	});

	sendSuccess(res, {
		sessionId: createdSession.id,
		bookingReferenceId: createdSession.bookingReferenceId,
		patientId,
		startTime: createdSession.dateTime.toISOString(),
		durationMinutes: createdSession.durationMinutes,
		status: createdSession.status,
		isLocked: createdSession.isLocked,
		event: 'NEW_SESSION_SCHEDULED',
	}, 'Session scheduled and locked');
};

export const assignPatientItem = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	const {
		assignmentType,
		title,
		templateId,
		referenceId,
		estimatedMinutes,
		frequency,
	} = req.body as {
		assignmentType?: 'ASSESSMENT' | 'GOAL' | 'CBT' | string;
		title?: string;
		templateId?: string;
		referenceId?: string;
		estimatedMinutes?: number;
		frequency?: 'DAILY_RITUAL' | 'WEEKLY_MILESTONE' | 'ONE_TIME';
	};

	const normalizedType = String(assignmentType || '').toUpperCase();
	if (!['ASSESSMENT', 'GOAL'].includes(normalizedType)) {
		throw new AppError('assignmentType must be ASSESSMENT or GOAL', 400);
	}

	const normalizedTemplateId = String(templateId || '').trim();
	const normalizedReferenceId = String(referenceId || normalizedTemplateId || '').trim() || null;
	const clinicalAssessmentTitle = normalizedTemplateId.toLowerCase().includes('gad')
		? 'GAD-7 Assessment'
		: normalizedTemplateId.toLowerCase().includes('phq')
			? 'PHQ-9 Assessment'
			: 'Clinical Assessment';

	const { patientProfileId } = await ensureProviderPatientAccess(providerId, patientId);

	let plan = await prisma.therapyPlan.findFirst({
		where: {
			patientId: patientProfileId,
			therapistId: providerId,
			status: 'ACTIVE',
		},
		orderBy: { createdAt: 'desc' },
		select: { id: true },
	});

	if (!plan) {
		const now = new Date();
		const endDate = new Date(now);
		endDate.setDate(endDate.getDate() + 30);

		plan = await prisma.therapyPlan.create({
			data: {
				patientId: patientProfileId,
				therapistId: providerId,
				title: 'Provider Assigned Plan',
				providerNote: 'Auto-created from provider assignment flow.',
				startDate: now,
				endDate,
				status: 'ACTIVE',
			},
			select: { id: true },
		});
	}

	const activity = await prisma.therapyPlanActivity.create({
		data: {
			planId: plan.id,
			title: String(title || (normalizedType === 'ASSESSMENT' ? clinicalAssessmentTitle : 'New Goal')).trim(),
			frequency: frequency || 'ONE_TIME',
			activityType: normalizedType === 'ASSESSMENT' ? 'CLINICAL_ASSESSMENT' : 'EXERCISE',
			referenceId: normalizedReferenceId,
			estimatedMinutes: Number.isFinite(Number(estimatedMinutes)) ? Number(estimatedMinutes) : 10,
			status: 'PENDING',
		},
		select: {
			id: true,
			title: true,
			activityType: true,
			status: true,
			createdAt: true,
		},
	});

	if (normalizedType === 'GOAL') {
		await prisma.goal.create({
			data: {
				patientId,
				providerId,
				title: activity.title,
				category: 'Wellness',
				status: 'IN_PROGRESS',
				startDate: new Date(),
			},
		});
	}

	sendSuccess(res, {
		assignmentType: normalizedType,
		id: activity.id,
		title: activity.title,
		activityType: activity.activityType,
		status: activity.status,
		createdAt: activity.createdAt.toISOString(),
	}, 'Assignment created successfully');
};

export const getPatientGoals = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	const { patientProfileId } = await ensureProviderPatientAccess(providerId, patientId);

	const plans = await prisma.therapyPlan.findMany({
		where: {
			patientId: patientProfileId,
			status: 'ACTIVE',
		},
		select: {
			id: true,
			startDate: true,
		},
	});

	const planIds = plans.map((plan) => plan.id);
	const startDateByPlanId = new Map(plans.map((plan) => [plan.id, plan.startDate] as const));

	const activities = planIds.length
		? await prisma.therapyPlanActivity.findMany({
				where: {
					planId: { in: planIds },
				},
				orderBy: { updatedAt: 'desc' },
				select: {
					id: true,
					title: true,
					activityType: true,
					status: true,
					createdAt: true,
					completedAt: true,
					planId: true,
				},
			})
		: [];

	if (activities.length === 0) {
		sendSuccess(res, [
			{
				id: 'goal-meditate-daily',
				title: 'Meditate 10 mins daily',
				category: 'Mindfulness',
				startDate: '2026-03-02T08:00:00.000Z',
				streak: 4,
				completionRate: 85,
				weeklyTracker: ['completed', 'completed', 'missed', 'completed', 'completed', 'empty', 'empty'],
			},
			{
				id: 'goal-sleep-no-screen',
				title: 'No screens after 10 PM',
				category: 'Sleep',
				startDate: '2026-02-24T08:00:00.000Z',
				streak: 6,
				completionRate: 78,
				weeklyTracker: ['completed', 'completed', 'completed', 'missed', 'completed', 'empty', 'empty'],
			},
		], 'Patient goals fetched');
		return;
	}

	const responseData = activities.map((activity) => {
		const weeklyTracker = buildWeeklyTracker(String(activity.status), activity.createdAt, activity.completedAt);
		return {
			id: activity.id,
			title: activity.title,
			category: getGoalCategory(activity.title, String(activity.activityType)),
			startDate: (startDateByPlanId.get(activity.planId) || activity.createdAt).toISOString(),
			streak: calculateStreak(weeklyTracker),
			completionRate: calculateCompletionRate(weeklyTracker),
			weeklyTracker,
		};
	});

	sendSuccess(res, responseData, 'Patient goals fetched');
};

export const sendGoalMessage = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();
	const goalId = String(req.params.goalId || '').trim();
	const message = String(req.body?.message || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}
	if (!goalId) {
		throw new AppError('Goal id is required', 400);
	}
	if (!message) {
		throw new AppError('Message is required', 400);
	}

	await ensureProviderPatientAccess(providerId, patientId);

	sendSuccess(res, {
		goalId,
		message,
		sentAt: new Date().toISOString(),
		status: 'sent',
	}, 'Goal message sent');
};

export const generateMeetingLink = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const sessionId = String(req.params.sessionId || req.body?.sessionId || '').trim();

	if (!sessionId) {
		throw new AppError('Session id is required', 400);
	}

	const session = await prisma.therapySession.findUnique({
		where: { id: sessionId },
		select: {
			id: true,
			therapistProfileId: true,
			meetingRoomName: true,
			therapistSessionNote: {
				select: {
					id: true,
					subjective: true,
				},
			},
			patientProfile: {
				select: {
					id: true,
					userId: true,
				},
			},
		},
	});

	if (!session) {
		throw new AppError('Session not found', 404);
	}

	const isProvider = String(session.therapistProfileId) === userId;
	const isPatient = String(session.patientProfile?.userId || '') === userId;

	if (!isProvider && !isPatient) {
		throw new AppError('Forbidden', 403);
	}

	const meetingRoomName = session.meetingRoomName || `Manas360-${crypto.randomBytes(8).toString('hex')}`;

	if (!session.meetingRoomName) {
		await prisma.therapySession.update({
			where: { id: session.id },
			data: { meetingRoomName },
		});
	}

	let jitsiJwt: string | null = null;
	const jitsiAppId = String(process.env.JITSI_APP_ID || '').trim();
	const jitsiJwtSecret = String(process.env.JITSI_JWT_SECRET || '').trim();
	const jitsiDomain = String(process.env.JITSI_DOMAIN || 'meet.jit.si').trim();

	if (jitsiAppId && jitsiJwtSecret) {
		jitsiJwt = jwt.sign(
			{
				aud: 'jitsi',
				iss: jitsiAppId,
				sub: jitsiDomain,
				room: meetingRoomName,
				context: {
					user: {
						id: userId,
						moderator: isProvider,
					},
				},
			},
			jitsiJwtSecret,
			{ algorithm: 'HS256', expiresIn: '2h' },
		);
	}

	sendSuccess(
		res,
		{
			sessionId: session.id,
			meetingRoomName,
			jitsiJwt,
			jitsiDomain,
			patientId: String(session.patientProfile?.userId || ''),
			noteId: isProvider ? String(session.therapistSessionNote?.id || '') || null : null,
			noteSubjective: isProvider ? String(session.therapistSessionNote?.subjective || '') : '',
		},
		'Meeting link generated',
	);
};

// ============ PRESCRIPTION CRUD ============

export const createPrescription = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId);
	await ensureProviderPatientAccess(providerId, patientId);

	const drugName = String(req.body?.drugName || '').trim();
	const dosage = String(req.body?.dosage || '').trim();
	const instructions = String(req.body?.instructions || '').trim();
	const refillsRemaining = Math.max(0, Number(req.body?.refillsRemaining ?? 0));
	const warnings = Array.isArray(req.body?.warnings) ? req.body.warnings.map(String) : [];

	if (!drugName) throw new AppError('drugName is required', 400);
	if (!dosage) throw new AppError('dosage is required', 400);
	if (!instructions) throw new AppError('instructions is required', 400);

	const prescription = await prisma.prescription.create({
		data: {
			patientId,
			providerId,
			drugName,
			dosage,
			instructions,
			refillsRemaining,
			warnings,
			status: 'ACTIVE',
			adherenceRate: 0,
		},
	});

	// fire-and-forget: generate prescription PDF, upload and notify patient
	void (async () => {
		try {
			const { publishPrescriptionDocument } = await import('../services/documents.service');
			await publishPrescriptionDocument(prescription.id);
		} catch (e) {
			console.warn('prescription document publish failed', e);
		}
	})();

	sendSuccess(res, {
		id: prescription.id,
		drugName: prescription.drugName,
		dosage: prescription.dosage,
		instructions: prescription.instructions,
		prescribedDate: prescription.prescribedDate.toISOString(),
		refillsRemaining: prescription.refillsRemaining,
		status: 'Active',
		adherenceRate: 0,
		warnings: prescription.warnings,
	}, 'Prescription created', 201);
};

export const updatePrescription = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId);
	const prescriptionId = String(req.params.prescriptionId);
	await ensureProviderPatientAccess(providerId, patientId);

	const existing = await prisma.prescription.findFirst({
		where: { id: prescriptionId, patientId, providerId },
	});
	if (!existing) throw new AppError('Prescription not found', 404);

	const data: Record<string, unknown> = {};
	if (req.body?.dosage !== undefined) data.dosage = String(req.body.dosage).trim();
	if (req.body?.instructions !== undefined) data.instructions = String(req.body.instructions).trim();
	if (req.body?.refillsRemaining !== undefined) data.refillsRemaining = Math.max(0, Number(req.body.refillsRemaining));
	if (req.body?.warnings !== undefined) data.warnings = Array.isArray(req.body.warnings) ? req.body.warnings.map(String) : [];

	const updated = await prisma.prescription.update({
		where: { id: prescriptionId },
		data,
	});

	sendSuccess(res, {
		id: updated.id,
		drugName: updated.drugName,
		dosage: updated.dosage,
		instructions: updated.instructions,
		prescribedDate: updated.prescribedDate.toISOString(),
		refillsRemaining: updated.refillsRemaining,
		status: updated.status === 'ACTIVE' ? 'Active' : 'Discontinued',
		adherenceRate: updated.adherenceRate,
		warnings: updated.warnings,
	}, 'Prescription updated');
};

export const discontinuePrescription = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId);
	const prescriptionId = String(req.params.prescriptionId);
	await ensureProviderPatientAccess(providerId, patientId);

	const existing = await prisma.prescription.findFirst({
		where: { id: prescriptionId, patientId, providerId },
	});
	if (!existing) throw new AppError('Prescription not found', 404);

	await prisma.prescription.update({
		where: { id: prescriptionId },
		data: { status: 'DISCONTINUED' },
	});

	sendSuccess(res, { id: prescriptionId, status: 'Discontinued' }, 'Prescription discontinued');
};

// ============ LAB ORDER CRUD ============

export const createLabOrder = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId);
	await ensureProviderPatientAccess(providerId, patientId);

	const testName = String(req.body?.testName || '').trim();
	const interpretation = String(req.body?.interpretation || '').trim();
	const biomarkers = Array.isArray(req.body?.biomarkers) ? req.body.biomarkers : [];

	if (!testName) throw new AppError('testName is required', 400);

	const provider = await prisma.user.findUnique({
		where: { id: providerId },
		select: { firstName: true, lastName: true, name: true },
	});

	const labOrder = await prisma.labOrder.create({
		data: {
			patientId,
			providerId,
			testName,
			orderingPhysician: toPatientName(provider?.firstName, provider?.lastName, provider?.name),
			interpretation: interpretation || 'Pending interpretation',
			biomarkers,
			status: 'PENDING',
		},
	});

	sendSuccess(res, {
		id: labOrder.id,
		testName: labOrder.testName,
		dateOrdered: labOrder.dateOrdered.toISOString(),
		status: 'Pending',
		orderingPhysician: labOrder.orderingPhysician,
		interpretation: labOrder.interpretation,
		biomarkers: labOrder.biomarkers,
	}, 'Lab order created', 201);
};

export const updateLabOrderStatus = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId);
	const labId = String(req.params.labId);
	await ensureProviderPatientAccess(providerId, patientId);

	const existing = await prisma.labOrder.findFirst({
		where: { id: labId, patientId, providerId },
	});
	if (!existing) throw new AppError('Lab order not found', 404);

	const data: Record<string, unknown> = {};
	if (req.body?.status) {
		const normalized = String(req.body.status).toUpperCase();
		if (['PENDING', 'RESULTS_READY', 'REVIEWED'].includes(normalized)) {
			data.status = normalized;
		}
	}
	if (req.body?.interpretation !== undefined) data.interpretation = String(req.body.interpretation).trim();
	if (req.body?.biomarkers !== undefined) data.biomarkers = Array.isArray(req.body.biomarkers) ? req.body.biomarkers : existing.biomarkers;

	const updated = await prisma.labOrder.update({
		where: { id: labId },
		data,
	});

	const displayStatus = updated.status === 'RESULTS_READY' ? 'Results Ready' : updated.status === 'REVIEWED' ? 'Reviewed' : 'Pending';

	sendSuccess(res, {
		id: updated.id,
		testName: updated.testName,
		dateOrdered: updated.dateOrdered.toISOString(),
		status: displayStatus,
		orderingPhysician: updated.orderingPhysician,
		interpretation: updated.interpretation,
		biomarkers: updated.biomarkers,
	}, 'Lab order updated');
};

// ============ GOAL CRUD ============

export const createGoal = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId);
	await ensureProviderPatientAccess(providerId, patientId);

	const title = String(req.body?.title || '').trim();
	const category = String(req.body?.category || '').trim() || 'Wellness';

	if (!title) throw new AppError('title is required', 400);

	const goal = await prisma.goal.create({
		data: {
			patientId,
			providerId,
			title,
			category,
			status: 'IN_PROGRESS',
		},
	});

	sendSuccess(res, {
		id: goal.id,
		title: goal.title,
		category: goal.category,
		status: goal.status,
		startDate: goal.startDate.toISOString(),
		streak: 0,
		completionRate: 0,
		weeklyTracker: ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
	}, 'Goal created', 201);
};

export const updateGoal = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId);
	const goalId = String(req.params.goalId);
	await ensureProviderPatientAccess(providerId, patientId);

	const existing = await prisma.goal.findFirst({
		where: { id: goalId, patientId, providerId },
	});
	if (!existing) throw new AppError('Goal not found', 404);

	const data: Record<string, unknown> = {};
	if (req.body?.title !== undefined) data.title = String(req.body.title).trim();
	if (req.body?.category !== undefined) data.category = String(req.body.category).trim();
	if (req.body?.status !== undefined) {
		const normalized = String(req.body.status).toUpperCase();
		if (['IN_PROGRESS', 'COMPLETED', 'PAUSED'].includes(normalized)) {
			data.status = normalized;
			if (normalized === 'COMPLETED') data.completedAt = new Date();
		}
	}

	const updated = await prisma.goal.update({
		where: { id: goalId },
		data,
	});

	sendSuccess(res, {
		id: updated.id,
		title: updated.title,
		category: updated.category,
		status: updated.status,
		startDate: updated.startDate.toISOString(),
	}, 'Goal updated');
};

// ============ CARE-TEAM MANAGEMENT ============

export const getProviderCareTeam = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);

	const assignments = await prisma.careTeamAssignment.findMany({
		where: { providerId, status: 'ACTIVE' },
		include: {
			patient: {
				select: { id: true, firstName: true, lastName: true, name: true, email: true },
			},
		},
		orderBy: { assignedAt: 'desc' },
	});

	const careTeam = assignments.map((a) => ({
		assignmentId: a.id,
		patientId: a.patientId,
		patientName: toPatientName(a.patient.firstName, a.patient.lastName, a.patient.name),
		patientEmail: a.patient.email,
		assignedAt: a.assignedAt.toISOString(),
		accessScope: a.accessScope,
	}));

	sendSuccess(res, careTeam, 'Care team fetched');
};

export const getPatientCareTeam = async (req: Request, res: Response): Promise<void> => {
	const requesterProviderId = authUserId(req);
	await getProviderRole(requesterProviderId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	const patient = await prisma.user.findUnique({
		where: { id: patientId },
		select: {
			id: true,
			role: true,
			patientProfile: { select: { id: true } },
		},
	});

	if (!patient || String(patient.role || '').toLowerCase() !== 'patient' || !patient.patientProfile) {
		throw new AppError('Patient not found', 404);
	}

	const [careTeamAccess, sessionAccess] = await Promise.all([
		prisma.careTeamAssignment.findFirst({
			where: {
				providerId: requesterProviderId,
				patientId,
				status: 'ACTIVE',
			},
			select: { id: true },
		}),
		prisma.therapySession.findFirst({
			where: {
				therapistProfileId: requesterProviderId,
				patientProfile: { userId: patientId },
			},
			select: { id: true },
		}),
	]);

	if (!careTeamAccess && !sessionAccess) {
		throw new AppError('Forbidden', 403);
	}

	const assignments = await prisma.careTeamAssignment.findMany({
		where: { patientId, status: 'ACTIVE' },
		include: {
			provider: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					name: true,
					email: true,
					role: true,
					providerType: true,
				},
			},
		},
		orderBy: { assignedAt: 'asc' },
	});

	const members = await Promise.all(assignments.map(async (assignment) => {
		const [sessionCount, latestSession, latestNote] = await Promise.all([
			prisma.therapySession.count({
				where: {
					therapistProfileId: assignment.providerId,
					patientProfile: { userId: patientId },
				},
			}),
			prisma.therapySession.findFirst({
				where: {
					therapistProfileId: assignment.providerId,
					patientProfile: { userId: patientId },
				},
				orderBy: { dateTime: 'desc' },
				select: { dateTime: true, status: true },
			}),
			prisma.therapistSessionNote.findFirst({
				where: {
					therapistId: assignment.providerId,
					patientId: patient.patientProfile!.id,
				},
				orderBy: { updatedAt: 'desc' },
				select: { plan: true, assessment: true, updatedAt: true },
			}),
		]);

		return {
			assignmentId: assignment.id,
			providerId: assignment.provider.id,
			providerName: toPatientName(assignment.provider.firstName, assignment.provider.lastName, assignment.provider.name),
			providerEmail: assignment.provider.email,
			providerRole: String(assignment.provider.role || '').toUpperCase(),
			providerType: assignment.provider.providerType ? String(assignment.provider.providerType).toUpperCase() : null,
			assignedAt: assignment.assignedAt.toISOString(),
			accessScope: assignment.accessScope,
			sessionCount,
			lastSessionDate: latestSession?.dateTime ? latestSession.dateTime.toISOString() : null,
			lastSessionStatus: latestSession?.status ? String(latestSession.status).toUpperCase() : null,
			lastTreatmentPlan: String(latestNote?.plan || '').trim() || null,
			lastAssessmentSummary: String(latestNote?.assessment || '').trim() || null,
			lastClinicalUpdateAt: latestNote?.updatedAt ? latestNote.updatedAt.toISOString() : null,
		};
	}));

	sendSuccess(res, members, 'Patient care team fetched');
};

export const assignCareTeam = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = req.params.patientId;

	const patient = await prisma.user.findUnique({
		where: { id: patientId },
		select: { id: true, role: true },
	});
	if (!patient || String(patient.role).toLowerCase() !== 'patient') {
		throw new AppError('Patient not found', 404);
	}

	const existing = await prisma.careTeamAssignment.findUnique({
		where: { patientId_providerId: { patientId, providerId } },
	});

	if (existing && existing.status === 'ACTIVE') {
		sendSuccess(res, { assignmentId: existing.id, status: 'ACTIVE' }, 'Already assigned');
		return;
	}

	const accessScope = req.body?.accessScope ?? { chart: true, messaging: true, sessions: true };

	const assignment = existing
		? await prisma.careTeamAssignment.update({
				where: { id: existing.id },
				data: { status: 'ACTIVE', revokedAt: null, accessScope, assignedAt: new Date() },
			})
		: await prisma.careTeamAssignment.create({
				data: {
					patientId,
					providerId,
					assignedById: providerId,
					accessScope,
					status: 'ACTIVE',
				},
			});

	sendSuccess(res, { assignmentId: assignment.id, status: 'ACTIVE' }, 'Care team assignment created', 201);
};

export const removeCareTeam = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = req.params.patientId;

	const existing = await prisma.careTeamAssignment.findUnique({
		where: { patientId_providerId: { patientId, providerId } },
	});

	if (!existing || existing.status !== 'ACTIVE') {
		throw new AppError('Care team assignment not found', 404);
	}

	await prisma.careTeamAssignment.update({
		where: { id: existing.id },
		data: { status: 'REVOKED', revokedAt: new Date() },
	});

	sendSuccess(res, { assignmentId: existing.id, status: 'REVOKED' }, 'Care team assignment revoked');
};

// ============ APPOINTMENT REQUEST QUEUE ============

export const getPendingAppointmentRequests = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);

	const requests = await prisma.appointmentRequest.findMany({
		where: { status: 'PENDING' },
		orderBy: { createdAt: 'desc' },
	});

	const patientIds = Array.from(new Set(requests.map((r) => r.patientId).filter(Boolean)));
	const patients = patientIds.length > 0
		? await prisma.user.findMany({
				where: { id: { in: patientIds } },
				select: { id: true, firstName: true, lastName: true, name: true, email: true },
			})
		: [];
	type AppointmentPatient = {
		firstName: string | null;
		lastName: string | null;
		name: string | null;
		email: string | null;
	};
	const patientById = new Map<string, AppointmentPatient>(
		patients.map((p) => [
			p.id,
			{
				firstName: p.firstName,
				lastName: p.lastName,
				name: p.name,
				email: p.email,
			},
		]),
	);

	const pending = requests.filter((r) => {
		const providers = Array.isArray(r.providers) ? r.providers : [];
		return (providers as Array<{ providerId: string; status?: string }>).some(
			(p) => p.providerId === providerId && (!p.status || p.status === 'PENDING'),
		);
	});

	const result = pending.map((r) => {
		const patient = patientById.get(r.patientId);
		return {
		id: r.id,
		patientId: r.patientId,
		patientName: toPatientName(patient?.firstName, patient?.lastName, patient?.name),
		patientEmail: patient?.email ?? null,
		availabilityPrefs: r.availabilityPrefs,
		preferredSpecialization: r.preferredSpecialization,
		durationMinutes: r.durationMinutes,
		createdAt: r.createdAt.toISOString(),
		expiresAt: r.expiresAt?.toISOString() || null,
		};
	});

	sendSuccess(res, result, 'Pending appointment requests fetched');
};

// ============ PATIENT DOCUMENTS AGGREGATION ============

export const getPatientDocuments = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId);
	await ensureProviderPatientAccess(providerId, patientId);

	const [notes, prescriptions, assessments] = await Promise.all([
		prisma.therapistSessionNote.findMany({
			where: {
				session: {
					therapistProfileId: providerId,
					patientProfile: { userId: patientId },
				},
			},
			orderBy: { createdAt: 'desc' },
			take: 20,
			select: {
				id: true,
				sessionType: true,
				status: true,
				createdAt: true,
				session: {
					select: { dateTime: true },
				},
			},
		}),
		prisma.prescription.findMany({
			where: { patientId, providerId },
			orderBy: { prescribedDate: 'desc' },
			take: 20,
			select: {
				id: true,
				drugName: true,
				dosage: true,
				status: true,
				prescribedDate: true,
			},
		}),
		prisma.patientAssessment.findMany({
			where: {
				patientProfile: { userId: patientId },
			},
			orderBy: { createdAt: 'desc' },
			take: 20,
			select: {
				id: true,
				type: true,
				totalScore: true,
				createdAt: true,
			},
		}),
	]);

	type DocItem = { id: string; title: string; date: string; category: 'official' | 'session' | 'assessment' };

	const documents: DocItem[] = [
		...notes.map((n) => ({
			id: n.id,
			title: `Session Notes — ${n.sessionType || 'Consultation'} (${toDisplayNoteStatus(n.status || undefined)})`,
			date: (n.session?.dateTime || n.createdAt).toISOString().slice(0, 10),
			category: 'session' as const,
		})),
		...prescriptions.map((p) => ({
			id: p.id,
			title: `Prescription — ${p.drugName} ${p.dosage}`,
			date: p.prescribedDate.toISOString().slice(0, 10),
			category: 'official' as const,
		})),
		...assessments.map((a) => ({
			id: a.id,
			title: `${a.type} Result — Score ${a.totalScore}`,
			date: a.createdAt.toISOString().slice(0, 10),
			category: 'assessment' as const,
		})),
	];

	documents.sort((a, b) => b.date.localeCompare(a.date));

	sendSuccess(res, documents, 'Patient documents fetched');
};

// ── Accept appointment request ─────────────────────────────────────
export const acceptAppointmentRequest = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	const requestId = String(req.params.requestId);
	const { scheduledAt } = req.body as { scheduledAt: string };

	if (!scheduledAt) {
		sendError(res, 'scheduledAt is required', 400);
		return;
	}

	const result = await acceptAppointmentRequestService({
		appointmentRequestId: requestId,
		providerId,
		scheduledAt: new Date(scheduledAt),
	});

	sendSuccess(res, result, 'Appointment accepted and scheduled');
};

// ── Reject appointment request ─────────────────────────────────────
export const rejectAppointmentRequest = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	const requestId = String(req.params.requestId);
	const result = await rejectAppointmentRequestService(requestId, providerId);
	sendSuccess(res, { requestId, ...result }, 'Appointment request declined');
};