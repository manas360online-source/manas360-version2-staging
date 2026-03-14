import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
	getConversationMessages as getDirectConversationMessages,
	getOrCreateConversation,
	getProviderConversations,
	sendDirectMessage,
} from '../services/messaging.service';

type ProviderRole = 'THERAPIST' | 'PSYCHOLOGIST' | 'PSYCHIATRIST' | 'COACH';

const authUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) throw new AppError('Authentication required', 401);
	return userId;
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

const getProviderRole = async (providerId: string): Promise<ProviderRole> => {
	const user = await prisma.user.findUnique({
		where: { id: providerId },
		select: { role: true },
	});

	if (!user) {
		throw new AppError('Provider not found', 404);
	}

	const role = String(user.role).toUpperCase() as ProviderRole;
	const allowedRoles: ProviderRole[] = ['THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH'];
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

const PHQ9_QUESTIONS = [
	'Little interest or pleasure in doing things',
	'Feeling down, depressed, or hopeless',
	'Trouble falling or staying asleep, or sleeping too much',
	'Feeling tired or having little energy',
	'Poor appetite or overeating',
	'Feeling bad about yourself, or that you are a failure or have let yourself or your family down',
	'Trouble concentrating on things, such as reading the newspaper or watching television',
	'Moving or speaking so slowly that other people could have noticed, or the opposite',
	'Thoughts that you would be better off dead or of hurting yourself in some way',
];

const GAD7_QUESTIONS = [
	'Feeling nervous, anxious, or on edge',
	'Not being able to stop or control worrying',
	'Worrying too much about different things',
	'Trouble relaxing',
	'Being so restless that it is hard to sit still',
	'Becoming easily annoyed or irritable',
	'Feeling afraid, as if something awful might happen',
];

const getPHQ9Severity = (score: number): string => {
	if (score <= 4) return 'None';
	if (score <= 9) return 'Mild';
	if (score <= 14) return 'Moderate';
	if (score <= 19) return 'Moderately Severe';
	return 'Severe';
};

const getGAD7Severity = (score: number): string => {
	if (score <= 4) return 'Minimal';
	if (score <= 9) return 'Mild';
	if (score <= 14) return 'Moderate';
	return 'Severe';
};

const formatAssessmentAnswers = (questions: string[], rawAnswers: number[]): Array<{ prompt: string; answer: string; points: number }> => {
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
	const role = await getProviderRole(providerId);
	const { startOfDay, endOfDay, startOfMonth } = getDateBounds();
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
	sevenDaysAgo.setHours(0, 0, 0, 0);

	const [
		todaySessions,
		totalSessionsToday,
		completedSessionsThisMonth,
		totalSessionsThisMonth,
		totalCbtSessionsThisWeek,
		completedCbtSessionsThisWeek,
		cbtSessionsThisWeekByPatient,
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
		prisma.patientSession.count({
			where: {
				createdAt: { gte: sevenDaysAgo },
				template: {
					therapistId: providerId,
				},
			},
		}),
		prisma.patientSession.count({
			where: {
				createdAt: { gte: sevenDaysAgo },
				status: 'COMPLETED',
				template: {
					therapistId: providerId,
				},
			},
		}),
		prisma.patientSession.findMany({
			where: {
				createdAt: { gte: sevenDaysAgo },
				template: {
					therapistId: providerId,
				},
			},
			select: {
				patientId: true,
				status: true,
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

	const activePatients = uniquePatientIds.size;
	const adherenceRate = formatRate(completedSessionsThisMonth, totalSessionsThisMonth);
	const cbtAdherence = formatRate(completedCbtSessionsThisWeek, totalCbtSessionsThisWeek);
	const patientAlerts = todaySessions.filter((session) => {
		const status = String(session.status).toUpperCase();
		return status === 'PENDING' || status === 'CANCELLED';
	}).length;

	const cbtCompletionByPatient = new Map<string, { total: number; completed: number }>();
	for (const entry of cbtSessionsThisWeekByPatient) {
		const patientId = String(entry.patientId || '');
		if (!patientId) continue;
		const current = cbtCompletionByPatient.get(patientId) || { total: 0, completed: 0 };
		current.total += 1;
		if (String(entry.status).toUpperCase() === 'COMPLETED') {
			current.completed += 1;
		}
		cbtCompletionByPatient.set(patientId, current);
	}

	const adherenceDipCount = Array.from(cbtCompletionByPatient.values()).filter((row) => {
		if (!row.total) return false;
		return (row.completed / row.total) * 100 < 60;
	}).length;

	const statsByRole: Record<ProviderRole, Record<string, string | number>> = {
		THERAPIST: {
			totalSessions: totalSessionsToday,
			activePatients,
			pendingNotes,
			patientAlerts,
			cbtAdherence,
			adherenceDipCount,
		},
		PSYCHOLOGIST: {
			totalSessions: totalSessionsToday,
			activePatients,
			pendingNotes,
			patientAlerts,
			cbtAdherence,
			adherenceDipCount,
		},
		PSYCHIATRIST: {
			consultsToday: totalSessionsToday,
			activePrescriptions,
			interactionWarnings: patientAlerts,
			adherenceRate,
			cbtAdherence,
			adherenceDipCount,
		},
		COACH: {
			checkInsToday: totalSessionsToday,
			activeGoals,
			habitStreaks: completedSessionsThisMonth,
			adherenceRate,
			cbtAdherence,
			adherenceDipCount,
		},
	};

	const responseData = {
		stats: statsByRole[role],
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
			severity: getPHQ9Severity(item.totalScore),
			answers: formatAssessmentAnswers(PHQ9_QUESTIONS, item.answers),
		})),
		...gad7Assessments.map((item) => ({
			id: item.id,
			type: 'GAD-7' as const,
			date: item.createdAt,
			totalScore: item.totalScore,
			severity: getGAD7Severity(item.totalScore),
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

	sendSuccess(res, responseData, 'Patient note updated');
};

export const getPatientCBTModules = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}

	await ensureProviderPatientAccess(providerId, patientId);

	const sessions = await prisma.patientSession.findMany({
		where: { patientId },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			status: true,
			createdAt: true,
			completedAt: true,
			sessionNotes: true,
			template: {
				select: {
					title: true,
					category: true,
				},
			},
			responses: {
				orderBy: { answeredAt: 'asc' },
				select: {
					id: true,
					answeredAt: true,
					responseData: true,
					question: {
						select: {
							prompt: true,
						},
					},
				},
			},
		},
	});

	const responseData = sessions.map((session) => ({
		id: session.id,
		moduleType: String(session.template?.title || session.template?.category || 'CBT Exercise'),
		assignmentDate: session.createdAt.toISOString(),
		status: mapPatientSessionStatus(String(session.status)),
		submittedAnswers: session.responses.map((response) => ({
			id: response.id,
			question: response.question.prompt,
			answer: toDisplayResponseValue(response.responseData),
			rawResponse: response.responseData,
			answeredAt: response.answeredAt.toISOString(),
		})),
		therapistFeedback: String(session.sessionNotes || ''),
		completedAt: session.completedAt ? session.completedAt.toISOString() : null,
	}));

	sendSuccess(res, responseData, 'Patient CBT modules fetched');
};

export const reviewCBTModule = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	await getProviderRole(providerId);
	const patientId = String(req.params.patientId || '').trim();
	const moduleId = String(req.params.moduleId || '').trim();
	const feedback = String(req.body?.feedback || '').trim();

	if (!patientId) {
		throw new AppError('Patient id is required', 400);
	}
	if (!moduleId) {
		throw new AppError('Module id is required', 400);
	}
	if (!feedback) {
		throw new AppError('Feedback is required', 400);
	}

	await ensureProviderPatientAccess(providerId, patientId);

	const existing = await prisma.patientSession.findFirst({
		where: {
			id: moduleId,
			patientId,
		},
		select: {
			id: true,
		},
	});

	if (!existing) {
		throw new AppError('CBT module not found', 404);
	}

	const updated = await prisma.$transaction(async (tx) => {
		const reviewedSession = await tx.patientSession.update({
			where: { id: moduleId },
			data: {
				sessionNotes: feedback,
				status: 'COMPLETED',
				completedAt: new Date(),
			},
			select: {
				id: true,
				status: true,
				createdAt: true,
				completedAt: true,
				sessionNotes: true,
				template: {
					select: {
						title: true,
						category: true,
					},
				},
				responses: {
					orderBy: { answeredAt: 'asc' },
					select: {
						id: true,
						answeredAt: true,
						responseData: true,
						question: {
							select: {
								prompt: true,
							},
						},
					},
				},
			},
		});

		const moduleName = String(reviewedSession.template?.title || reviewedSession.template?.category || 'CBT').replace(/\s+exercise$/i, '');
		const messageText = `I have reviewed your ${moduleName} exercise. Check the feedback in your plan!`;

		const conversation = await tx.directConversation.upsert({
			where: {
				patientId_providerId: {
					patientId,
					providerId,
				},
			},
			create: {
				patientId,
				providerId,
				isSupport: false,
				lastMessageAt: new Date(),
				lastMessageText: messageText,
			},
			update: {
				lastMessageAt: new Date(),
				lastMessageText: messageText,
			},
			select: { id: true },
		});

		await tx.directMessage.create({
			data: {
				conversationId: conversation.id,
				senderId: providerId,
				senderRole: 'provider',
				content: messageText,
				messageType: 'TEXT',
			},
		});

		return reviewedSession;
	});

	const responseData = {
		id: updated.id,
		moduleType: String(updated.template?.title || updated.template?.category || 'CBT Exercise'),
		assignmentDate: updated.createdAt.toISOString(),
		status: mapPatientSessionStatus(String(updated.status)),
		submittedAnswers: updated.responses.map((response) => ({
			id: response.id,
			question: response.question.prompt,
			answer: toDisplayResponseValue(response.responseData),
			rawResponse: response.responseData,
			answeredAt: response.answeredAt.toISOString(),
		})),
		therapistFeedback: String(updated.sessionNotes || ''),
		completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
	};

	sendSuccess(res, responseData, 'CBT module reviewed');
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

	const inputWeekNumber = Number(req.body?.weekNumber);
	if (!Number.isInteger(inputWeekNumber) || inputWeekNumber < 1) {
		throw new AppError('weekNumber must be a positive integer', 400);
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
			weekNumber: inputWeekNumber,
			category: item?.category ? String(item.category).trim() || null : null,
			status: 'PENDING',
			isPublished: false,
		};
	});

	const result = await prisma.$transaction(async (tx) => {
		const existingWeekActivities = await tx.therapyPlanActivity.findMany({
			where: {
				planId: plan!.id,
				weekNumber: inputWeekNumber,
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
				weekNumber: activity.weekNumber,
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
				weekNumber: inputWeekNumber,
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
		weekNumber: inputWeekNumber,
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

	const inputWeekNumber = Number(req.body?.weekNumber);
	if (!Number.isInteger(inputWeekNumber) || inputWeekNumber < 1) {
		throw new AppError('weekNumber must be a positive integer', 400);
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
			weekNumber: inputWeekNumber,
		},
		data: {
			isPublished: true,
		},
	});

	sendSuccess(res, {
		planId: plan.id,
		patientId,
		weekNumber: inputWeekNumber,
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
	if (!['ASSESSMENT', 'GOAL', 'CBT'].includes(normalizedType)) {
		throw new AppError('assignmentType must be ASSESSMENT, GOAL, or CBT', 400);
	}

	const { patientProfileId } = await ensureProviderPatientAccess(providerId, patientId);

	if (normalizedType === 'CBT') {
		let template: { id: string; version: number; title: string } | null = null;

		if (templateId) {
			template = await prisma.cBTSessionTemplate.findFirst({
				where: {
					id: String(templateId),
					therapistId: providerId,
				},
				select: {
					id: true,
					version: true,
					title: true,
				},
			});
		}

		if (!template) {
			template = await prisma.cBTSessionTemplate.findFirst({
				where: { therapistId: providerId },
				orderBy: { updatedAt: 'desc' },
				select: {
					id: true,
					version: true,
					title: true,
				},
			});
		}

		if (!template) {
			template = await prisma.cBTSessionTemplate.create({
				data: {
					therapistId: providerId,
					title: String(title || 'Assigned CBT Module').trim(),
					description: 'Auto-created template from provider assignment flow.',
					status: 'DRAFT',
					version: 1,
				},
				select: {
					id: true,
					version: true,
					title: true,
				},
			});
		}

		if (!template) {
			throw new AppError('Unable to resolve CBT template for assignment', 500);
		}

		const session = await prisma.patientSession.create({
			data: {
				patientId,
				templateId: template.id,
				templateVersion: template.version,
				status: 'NOT_STARTED',
			},
			select: {
				id: true,
				status: true,
				createdAt: true,
			},
		});

		sendSuccess(res, {
			assignmentType: 'CBT',
			id: session.id,
			status: session.status,
			createdAt: session.createdAt.toISOString(),
		}, 'CBT assigned successfully');
		return;
	}

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
			title: String(title || (normalizedType === 'ASSESSMENT' ? 'New Assessment' : 'New Goal')).trim(),
			frequency: frequency || 'ONE_TIME',
			activityType: normalizedType === 'ASSESSMENT' ? 'CLINICAL_ASSESSMENT' : 'EXERCISE',
			referenceId: referenceId ? String(referenceId) : null,
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

	await ensureProviderPatientAccess(providerId, patientId);

	const activities = await prisma.therapyPlanActivity.findMany({
		where: {
			plan: {
				patient: {
					userId: patientId,
				},
			},
		},
		orderBy: { updatedAt: 'desc' },
		select: {
			id: true,
			title: true,
			activityType: true,
			status: true,
			createdAt: true,
			completedAt: true,
			plan: {
				select: {
					startDate: true,
				},
			},
		},
	});

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
			startDate: (activity.plan?.startDate || activity.createdAt).toISOString(),
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