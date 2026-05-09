import prisma from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { buildPaginationMeta, normalizePagination } from '../utils/pagination';
import { calculateClinicalAssessmentScore } from '../utils/clinicalAssessments';

interface PatientProfileInput {
	age: number;
	gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
	medicalHistory?: string;
	carrier?: string;
	emergencyContact?: {
		name: string;
		relation: string;
		phone: string;
	};
}

interface PatientAssessmentInput {
	type: 'PHQ-9' | 'GAD-7';
	answers: number[];
}

interface PatientAssessmentHistoryQuery {
	type?: 'PHQ-9' | 'GAD-7';
	fromDate?: Date;
	toDate?: Date;
	page: number;
	limit: number;
}

interface PatientMoodHistoryQuery {
	fromDate?: Date;
	toDate?: Date;
}

const safePatientSelect = {
	userId: true,
	age: true,
	gender: true,
	medicalHistory: true,
	emergencyContact: true,
	createdAt: true,
	updatedAt: true,
} as const;

const safeAssessmentSelect = {
	type: true,
	answers: true,
	totalScore: true,
	severityLevel: true,
	createdAt: true,
} as const;

const assertPatientUser = async (userId: string): Promise<void> => {
	const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, /* isDeleted: true if available */ } });

	if (!user) {
		throw new AppError('User not found', 404);
	}

	// If your User model tracks deletion, include that check. Placeholder kept for parity with previous behavior.
	if ((user as any).isDeleted) {
		throw new AppError('User account is deleted', 410);
	}

	// Accept both enum (PATIENT) and string forms ('patient') during transition
	if (user.role !== 'PATIENT' && user.role !== 'patient') {
		throw new AppError('Patient role required', 403);
	}
};

export const createPatientProfile = async (userId: string, input: PatientProfileInput) => {
	await assertPatientUser(userId);

	const emergencyContactPayload: Record<string, string> = {};
	if (input.emergencyContact?.name) emergencyContactPayload.name = input.emergencyContact.name;
	if (input.emergencyContact?.relation) emergencyContactPayload.relation = input.emergencyContact.relation;
	if (input.emergencyContact?.phone) emergencyContactPayload.phone = input.emergencyContact.phone;
	if (input.carrier) emergencyContactPayload.carrier = input.carrier;

	const existingProfile = await prisma.patientProfile.findUnique({ where: { userId } });
	if (existingProfile) {
		throw new AppError('Patient profile already exists', 409);
	}

	const profile = await prisma.patientProfile.create({
		data: {
			userId,
			age: input.age,
			gender: input.gender,
			medicalHistory: input.medicalHistory ?? null,
			emergencyContact: emergencyContactPayload,
		},
	});

	return prisma.patientProfile.findUnique({ where: { id: profile.id }, select: safePatientSelect });
};

export const getMyPatientProfile = async (userId: string) => {
	await assertPatientUser(userId);

	const profile = await prisma.patientProfile.findUnique({ where: { userId }, select: safePatientSelect });

	if (!profile) {
		throw new AppError('Patient profile not found', 404);
	}

	return profile;
};

const calculateAssessmentScore = (type: 'PHQ-9' | 'GAD-7', answers: number[]) => {
	try {
		return calculateClinicalAssessmentScore(type, answers);
	} catch (error) {
		throw new AppError(`${(error as Error).message} for ${type}`, 422);
	}
};

export const createPatientAssessment = async (userId: string, input: PatientAssessmentInput) => {
	await assertPatientUser(userId);

	const patientProfile = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });

	if (!patientProfile) {
		throw new AppError('Patient profile not found. Please create profile first.', 404);
	}

	const { totalScore, severityLevel } = calculateAssessmentScore(input.type, input.answers);

	const assessment = await prisma.patientAssessment.create({
		data: {
			patientId: patientProfile.id,
			type: input.type,
			answers: input.answers,
			totalScore,
			severityLevel,
		},
	});

	return prisma.patientAssessment.findUnique({ where: { id: assessment.id }, select: safeAssessmentSelect });
};

export const getMyPatientAssessmentHistory = async (userId: string, query: PatientAssessmentHistoryQuery) => {
	await assertPatientUser(userId);

	const patientProfile = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });

	if (!patientProfile) {
		throw new AppError('Patient profile not found. Please create profile first.', 404);
	}

	const pagination = normalizePagination(
		{ page: query.page, limit: query.limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	const where: any = { patientId: patientProfile.id };
	if (query.type) where.type = query.type;
	if (query.fromDate || query.toDate) {
		where.createdAt = {
			...(query.fromDate ? { gte: query.fromDate } : {}),
			...(query.toDate ? { lte: query.toDate } : {}),
		};
	}

	const [totalItems, items] = await Promise.all([
		prisma.patientAssessment.count({ where }),
		prisma.patientAssessment.findMany({
			where,
			select: safeAssessmentSelect,
			orderBy: { createdAt: 'desc' },
			skip: pagination.skip,
			take: pagination.limit,
		}),
	]);

	return {
		items,
		meta: buildPaginationMeta(totalItems, pagination),
	};
};

const calculateMoodTrend = (
	entries: Array<{
		moodScore: number;
		date: Date;
	}>,
): { trend: 'improving' | 'stable' | 'declining'; delta: number } => {
	if (entries.length < 2) {
		return { trend: 'stable', delta: 0 };
	}

	const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
	const splitIndex = Math.floor(sorted.length / 2);

	const firstWindow = sorted.slice(0, splitIndex);
	const secondWindow = sorted.slice(splitIndex);

	if (firstWindow.length === 0 || secondWindow.length === 0) {
		return { trend: 'stable', delta: 0 };
	}

	const firstAvg = firstWindow.reduce((sum, entry) => sum + entry.moodScore, 0) / firstWindow.length;
	const secondAvg = secondWindow.reduce((sum, entry) => sum + entry.moodScore, 0) / secondWindow.length;

	const delta = Number((secondAvg - firstAvg).toFixed(2));

	if (delta >= 0.5) {
		return { trend: 'improving', delta };
	}

	if (delta <= -0.5) {
		return { trend: 'declining', delta };
	}

	return { trend: 'stable', delta };
};

export const getMyMoodHistory = async (userId: string, query: PatientMoodHistoryQuery) => {
	await assertPatientUser(userId);

	const patientProfile = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });

	if (!patientProfile) {
		throw new AppError('Patient profile not found. Please create profile first.', 404);
	}

	const where: any = { patientId: patientProfile.id };
	if (query.fromDate || query.toDate) {
		where.date = {
			...(query.fromDate ? { gte: query.fromDate } : {}),
			...(query.toDate ? { lte: query.toDate } : {}),
		};
	}

	const [items, groupedByWeek, groupedByMonth] = await Promise.all([
		prisma.patientMoodEntry.findMany({ where, select: { moodScore: true, note: true, date: true }, orderBy: { date: 'desc' } }),
		// Weekly aggregation via raw query: use PostgreSQL date_trunc and grouping per iso_week
		prisma.$queryRawUnsafe(`
			SELECT to_char(date_trunc('week', date), 'IYYY-"W"IW') as period,
				   ROUND(AVG(mood_score)::numeric, 2) as averageMoodScore,
				   COUNT(*) as entryCount
			FROM patient_mood_entries
			WHERE patient_id = $1
			${query.fromDate ? "AND date >= $2" : ''}
			${query.toDate ? (query.fromDate ? "AND date <= $3" : "AND date <= $2") : ''}
			GROUP BY period
			ORDER BY period DESC
			LIMIT 52
		`, patientProfile.id, query.fromDate ?? null, query.toDate ?? null),
		// Monthly aggregation
		prisma.$queryRawUnsafe(`
			SELECT to_char(date_trunc('month', date), 'YYYY-MM') as period,
				   ROUND(AVG(mood_score)::numeric, 2) as averageMoodScore,
				   COUNT(*) as entryCount
			FROM patient_mood_entries
			WHERE patient_id = $1
			${query.fromDate ? "AND date >= $2" : ''}
			${query.toDate ? (query.fromDate ? "AND date <= $3" : "AND date <= $2") : ''}
			GROUP BY period
			ORDER BY period DESC
			LIMIT 24
		`, patientProfile.id, query.fromDate ?? null, query.toDate ?? null),
	]);

	const trend = calculateMoodTrend(items.map((item) => ({ moodScore: item.moodScore, date: new Date(item.date) })));

	return {
		items,
		grouped: {
			week: groupedByWeek,
			month: groupedByMonth,
		},
		trend,
	};
};

const severityToSpecializationMap: Record<string, string[]> = {
	minimal: ['stress_management', 'general_wellness'],
	mild: ['anxiety', 'stress_management', 'depression'],
	moderate: ['anxiety', 'depression', 'therapy'],
	moderately_severe: ['depression', 'trauma', 'therapy'],
	severe: ['depression', 'trauma', 'crisis_intervention'],
};

const normalizeStrings = (values: string[]): string[] =>
	values
		.map((value) => value.trim().toLowerCase())
		.filter((value) => value.length > 0);

