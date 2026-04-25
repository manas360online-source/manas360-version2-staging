import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { redis } from '../config/redis';
import { getTherapistDashboardCacheKey } from './therapist-dashboard-cache.service';

const db = prisma as any;
const THERAPIST_DASHBOARD_CACHE_TTL = {
	dashboard: 45,
	patients: 60,
	notes: 45,
	messages: 20,
	payouts: 60,
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

const getMonthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatMonthLabel = (date: Date): string =>
	date.toLocaleDateString('en-US', { month: 'short' });

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const startOfWeek = (date: Date): Date => {
	const d = new Date(date);
	const day = d.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + diff);
	d.setHours(0, 0, 0, 0);
	return d;
};

const endOfWeek = (date: Date): Date => {
	const start = startOfWeek(date);
	const end = new Date(start);
	end.setDate(start.getDate() + 6);
	end.setHours(23, 59, 59, 999);
	return end;
};

const toNumber = (value: unknown): number => {
	if (typeof value === 'bigint') return Number(value);
	if (typeof value === 'number') return value;
	if (typeof value === 'string') return Number(value);
	return 0;
};

const resolveUserName = (user: any): string => {
	const full = `${String(user?.firstName ?? '').trim()} ${String(user?.lastName ?? '').trim()}`.trim();
	return String(user?.name || '').trim() || full || String(user?.email || '').trim() || 'Therapist';
};

const resolvePatientName = (user: any): string => {
	if (!user) return 'Patient';
	if (user.showNameToProviders === false) return 'Anonymous Patient';
	const full = `${String(user?.firstName ?? '').trim()} ${String(user?.lastName ?? '').trim()}`.trim();
	return String(user?.name || '').trim() || full || 'Patient';
};

const assertTherapist = async (userId: string): Promise<any> => {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			role: true,
			isDeleted: true,
			name: true,
			firstName: true,
			lastName: true,
			email: true,
		},
	});

	if (!user || user.isDeleted) throw new AppError('Therapist not found', 404);
	const role = String(user.role || '').toUpperCase();
	if (!['THERAPIST', 'PSYCHIATRIST', 'COACH'].includes(role)) {
		throw new AppError('Therapist role required', 403);
	}
	return user;
};

export const getTherapistDashboardData = async (userId: string) => {
	const cacheKey = await getTherapistDashboardCacheKey('overview', userId);
	const cached = await readJsonCache<any>(cacheKey);
	if (cached) return cached;

	const therapist = await assertTherapist(userId);
	const now = new Date();
	const todayStart = startOfDay(now);
	const todayEnd = endOfDay(now);
	const weekStart = startOfWeek(now);
	const weekEnd = endOfWeek(now);

	const sixMonthStarts = Array.from({ length: 6 }, (_, index) => {
		const d = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
		return d;
	});
	const sixMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

	const [todaySessionsRaw, weekSessionsRaw, allSessionsRaw, unreadMessagesCount, recentMessagesRaw] = await Promise.all([
		db.therapySession.findMany({
			where: {
				therapistProfileId: userId,
				dateTime: { gte: todayStart, lte: todayEnd },
			},
			orderBy: { dateTime: 'asc' },
			select: {
				id: true,
				bookingReferenceId: true,
				dateTime: true,
				status: true,
				durationMinutes: true,
				noteUpdatedAt: true,
				patientProfile: {
					select: {
						id: true,
						user: {
							select: {
								name: true,
								firstName: true,
								lastName: true,
								email: true,
								showNameToProviders: true,
							},
						},
					},
				},
			},
		}),
		db.therapySession.findMany({
			where: {
				therapistProfileId: userId,
				dateTime: { gte: weekStart, lte: weekEnd },
				status: { in: ['COMPLETED', 'CONFIRMED', 'PENDING'] },
			},
			select: {
				id: true,
				status: true,
				sessionFeeMinor: true,
				paymentStatus: true,
				dateTime: true,
				patientProfileId: true,
				noteUpdatedAt: true,
			},
		}),
		db.therapySession.findMany({
			where: {
				therapistProfileId: userId,
				dateTime: { gte: sixMonthStarts[0], lte: sixMonthEnd },
			},
			select: {
				id: true,
				status: true,
				sessionFeeMinor: true,
				paymentStatus: true,
				dateTime: true,
				patientProfileId: true,
				noteUpdatedAt: true,
			},
		}),
		db.notification.count({ where: { userId, isRead: false } }).catch(() => 0),
		db.notification.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			take: 8,
			select: { id: true, title: true, message: true, createdAt: true, isRead: true },
		}).catch(() => []),
	]);

	const patientIds = [...new Set(allSessionsRaw.map((row: any) => String(row.patientProfileId)))];
	const assessmentsRaw = patientIds.length
		? await db.patientAssessment.findMany({
				where: {
					patientId: {
						in: patientIds,
					},
				},
				orderBy: { createdAt: 'desc' },
				select: { patientId: true, totalScore: true, severityLevel: true, createdAt: true, type: true },
				take: 200,
		  }).catch(() => [])
		: [];

	const patientProfiles = await db.patientProfile.findMany({
		where: { id: { in: patientIds } },
		select: {
			id: true,
			user: { select: { name: true, firstName: true, lastName: true, email: true, showNameToProviders: true } },
		},
	}).catch(() => []);
	const patientMap: Map<string, any> = new Map(patientProfiles.map((profile: any) => [String(profile.id), profile]));

	const completedToday = todaySessionsRaw.filter((row: any) => String(row.status) === 'COMPLETED').length;
	const weeklyEarningsGross = weekSessionsRaw
		.filter((row: any) => String(row.status) === 'COMPLETED' && ['PAID', 'CAPTURED'].includes(String(row.paymentStatus || '').toUpperCase()))
		.reduce((sum: number, row: any) => sum + toNumber(row.sessionFeeMinor), 0);
	const weeklyEarningsTherapist = Math.round(weeklyEarningsGross * 0.6);

	const activePatientCount = new Set(
		allSessionsRaw
			.filter((row: any) => ['COMPLETED', 'CONFIRMED'].includes(String(row.status)))
			.map((row: any) => String(row.patientProfileId)),
	).size;

	const pendingNotesCount = weekSessionsRaw.filter((row: any) => String(row.status) === 'COMPLETED' && !row.noteUpdatedAt).length;

	const monthEarningsMap = new Map<string, { gross: number }>();
	for (const start of sixMonthStarts) {
		monthEarningsMap.set(getMonthKey(start), { gross: 0 });
	}

	for (const session of allSessionsRaw) {
		if (String(session.status) !== 'COMPLETED') continue;
		if (!['PAID', 'CAPTURED'].includes(String(session.paymentStatus || '').toUpperCase())) continue;
		const key = getMonthKey(new Date(session.dateTime));
		const bucket = monthEarningsMap.get(key);
		if (!bucket) continue;
		bucket.gross += toNumber(session.sessionFeeMinor);
	}

	const earningsChart = {
		labels: sixMonthStarts.map((start) => formatMonthLabel(start)),
		therapistShare: sixMonthStarts.map((start) => Math.round((monthEarningsMap.get(getMonthKey(start))?.gross || 0) * 0.6)),
		platformShare: sixMonthStarts.map((start) => Math.round((monthEarningsMap.get(getMonthKey(start))?.gross || 0) * 0.4)),
	};

	const recentMessages = recentMessagesRaw.map((item: any) => ({
		id: String(item.id),
		title: item.title,
		text: item.message,
		createdAt: item.createdAt,
		isRead: Boolean(item.isRead),
	}));

	const todaySessions = todaySessionsRaw.map((session: any) => {
		const patient = session.patientProfile?.user;
		const patientName = resolvePatientName(patient);
		const initials = patientName
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('') || 'PT';

		return {
			id: String(session.id),
			bookingReferenceId: session.bookingReferenceId,
			time: session.dateTime,
			patientName,
			patientInitials: initials,
			sessionType: 'Therapy Session',
			durationMinutes: session.durationMinutes,
			status: String(session.status).toLowerCase(),
			noteSubmitted: Boolean(session.noteUpdatedAt),
		};
	});

	const alerts: Array<{ id: string; level: string; message: string; tone: 'danger' | 'warning' | 'success'; action: string }> = [];

	const severeAssessments = assessmentsRaw
		.filter((item: any) => String(item.severityLevel || '').toLowerCase() === 'severe')
		.slice(0, 2);
	for (const item of severeAssessments) {
		const patient = patientMap.get(String(item.patientId));
		alerts.push({
			id: `assessment-${item.patientId}-${new Date(item.createdAt).getTime()}`,
			level: `High Risk — ${resolvePatientName(patient?.user)}`,
			message: `${String(item.type || 'Assessment')} score is ${Number(item.totalScore || 0)} (${String(item.severityLevel || 'severe')}).`,
			tone: 'danger',
			action: 'Review Now',
		});
	}

	const missedSessions = allSessionsRaw
		.filter((row: any) => ['PENDING', 'CONFIRMED'].includes(String(row.status)) && new Date(row.dateTime).getTime() < now.getTime())
		.slice(0, 2);
	for (const row of missedSessions) {
		const patient = patientMap.get(String(row.patientProfileId));
		alerts.push({
			id: `missed-${row.id}`,
			level: `Missed Session — ${resolvePatientName(patient?.user)}`,
			message: `Scheduled for ${new Date(row.dateTime).toLocaleString()} and not completed.`,
			tone: 'warning',
			action: 'Send Follow-up',
		});
	}

	const utilizationTotal = weekSessionsRaw.length;
	const utilizationBooked = weekSessionsRaw.filter((row: any) => ['COMPLETED', 'CONFIRMED', 'PENDING'].includes(String(row.status))).length;
	const utilizationOpen = Math.max(0, utilizationTotal - utilizationBooked);
	const utilizationPercent = utilizationTotal > 0 ? Math.round((utilizationBooked / utilizationTotal) * 100) : 0;

	const payload = {
		therapist: {
			id: therapist.id,
			name: resolveUserName(therapist),
			email: therapist.email,
		},
		stats: {
			todaysSessions: todaySessionsRaw.length,
			completedToday,
			weeklyEarnings: weeklyEarningsTherapist,
			activePatients: activePatientCount,
			avgRating: null,
			pendingNotes: pendingNotesCount,
			unreadMessages: unreadMessagesCount,
		},
		todaySessions,
		earningsChart,
		alerts: alerts.slice(0, 6),
		recentMessages,
		utilization: {
			percent: utilizationPercent,
			booked: utilizationBooked,
			total: utilizationTotal,
			open: utilizationOpen,
		},
	};

	await writeJsonCache(cacheKey, payload, THERAPIST_DASHBOARD_CACHE_TTL.dashboard);
	return payload;
};

export const listTherapistPatientsData = async (userId: string, status?: string, search?: string) => {
	const cacheKey = await getTherapistDashboardCacheKey('patients', userId, { status, search });
	const cached = await readJsonCache<any>(cacheKey);
	if (cached) return cached;

	await assertTherapist(userId);
	const sessions = await db.therapySession.findMany({
		where: { therapistProfileId: userId },
		orderBy: { dateTime: 'desc' },
		select: {
			id: true,
			status: true,
			dateTime: true,
			patientProfileId: true,
			patientProfile: {
				select: {
					id: true,
					user: {
						select: {
							name: true,
							firstName: true,
							lastName: true,
							email: true,
							showNameToProviders: true,
						},
					},
				},
			},
		},
	});

	const byPatient = new Map<string, any[]>();
	for (const row of sessions) {
		const key = String(row.patientProfileId);
		const existing = byPatient.get(key) || [];
		existing.push(row);
		byPatient.set(key, existing);
	}

	const patientIds = [...byPatient.keys()];
	const assessments = patientIds.length
		? await db.patientAssessment.findMany({
				where: { patientId: { in: patientIds } },
				orderBy: { createdAt: 'desc' },
				select: { patientId: true, type: true },
		  }).catch(() => [])
		: [];
	const concernByPatient = new Map<string, string>();
	for (const row of assessments) {
		if (!concernByPatient.has(String(row.patientId))) concernByPatient.set(String(row.patientId), String(row.type || 'General'));
	}

	let items = patientIds.map((patientId) => {
		const rows = byPatient.get(patientId) || [];
		const latest = rows[0];
		const patientUser = latest?.patientProfile?.user;
		const now = Date.now();
		const latestStatus = String(latest?.status || 'PENDING').toUpperCase();
		const latestTime = latest?.dateTime ? new Date(latest.dateTime).getTime() : 0;
		const statusLabel = latestStatus === 'CONFIRMED' || latestStatus === 'COMPLETED'
			? 'Active'
			: latestTime > 0 && latestTime < now
				? 'Needs Follow-up'
				: 'New';

		return {
			id: patientId,
			name: resolvePatientName(patientUser),
			email: patientUser?.showNameToProviders === false ? null : patientUser?.email || null,
			concern: concernByPatient.get(patientId) || 'General',
			sessions: rows.length,
			status: statusLabel,
			lastSessionAt: latest?.dateTime || null,
		};
	});

	if (status && status.trim()) {
		const normalized = status.trim().toLowerCase();
		items = items.filter((item) => item.status.toLowerCase() === normalized);
	}

	if (search && search.trim()) {
		const term = search.trim().toLowerCase();
		items = items.filter((item) => {
			const combined = `${item.name} ${item.email || ''} ${item.concern}`.toLowerCase();
			return combined.includes(term);
		});
	}

	const payload = { items };
	await writeJsonCache(cacheKey, payload, THERAPIST_DASHBOARD_CACHE_TTL.patients);
	return payload;
};

export const listTherapistSessionNotesData = async (userId: string) => {
	const cacheKey = await getTherapistDashboardCacheKey('session-notes', userId);
	const cached = await readJsonCache<any>(cacheKey);
	if (cached) return cached;

	await assertTherapist(userId);
	const sessions = await db.therapySession.findMany({
		where: { therapistProfileId: userId },
		orderBy: { dateTime: 'desc' },
		take: 100,
		select: {
			id: true,
			bookingReferenceId: true,
			dateTime: true,
			status: true,
			noteUpdatedAt: true,
			patientProfile: {
				select: {
					user: {
						select: {
							name: true,
							firstName: true,
							lastName: true,
							email: true,
							showNameToProviders: true,
						},
					},
				},
			},
		},
	});

	const items = sessions.map((row: any) => ({
		id: String(row.id),
		sessionId: String(row.id),
		bookingReferenceId: row.bookingReferenceId,
		patientName: resolvePatientName(row.patientProfile?.user),
		sessionAt: row.dateTime,
		status: row.noteUpdatedAt ? 'submitted' : 'pending',
		noteUpdatedAt: row.noteUpdatedAt,
	}));

	const payload = { items };
	await writeJsonCache(cacheKey, payload, THERAPIST_DASHBOARD_CACHE_TTL.notes);
	return payload;
};

export const listTherapistMessagesData = async (userId: string) => {
	const cacheKey = await getTherapistDashboardCacheKey('messages', userId);
	const cached = await readJsonCache<any>(cacheKey);
	if (cached) return cached;

	await assertTherapist(userId);
	const notifications = await db.notification.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		take: 100,
		select: {
			id: true,
			title: true,
			message: true,
			createdAt: true,
			isRead: true,
			type: true,
		},
	}).catch(() => []);

	const payload = {
		items: notifications.map((row: any) => ({
			id: String(row.id),
			title: row.title,
			text: row.message,
			type: row.type,
			createdAt: row.createdAt,
			isRead: Boolean(row.isRead),
		})),
		unreadCount: notifications.filter((row: any) => !row.isRead).length,
	};

	await writeJsonCache(cacheKey, payload, THERAPIST_DASHBOARD_CACHE_TTL.messages);
	return payload;
};

export const listTherapistPayoutHistoryData = async (userId: string) => {
	const cacheKey = await getTherapistDashboardCacheKey('payout-history', userId);
	const cached = await readJsonCache<any>(cacheKey);
	if (cached) return cached;

	await assertTherapist(userId);
	const paidSessions = await db.therapySession.findMany({
		where: {
			therapistProfileId: userId,
			status: 'COMPLETED',
			paymentStatus: { in: ['PAID', 'CAPTURED'] },
		},
		orderBy: { dateTime: 'desc' },
		take: 50,
		select: { id: true, dateTime: true, sessionFeeMinor: true },
	});

	const items = paidSessions.map((row: any) => ({
		id: String(row.id),
		date: row.dateTime,
		amountMinor: Math.round(toNumber(row.sessionFeeMinor) * 0.6),
		status: 'processed',
	}));

	const payload = { items };
	await writeJsonCache(cacheKey, payload, THERAPIST_DASHBOARD_CACHE_TTL.payouts);
	return payload;
};
