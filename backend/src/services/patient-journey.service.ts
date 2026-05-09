import { randomUUID } from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { submitAssessment, getLatestJourneyRecommendation } from './patient-v1.service';

const db = prisma as any;

const ensureJourneyTables = async (): Promise<void> => {
	await db.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS patient_pathway_state (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
			pathway VARCHAR(50) NOT NULL,
			reason TEXT,
			metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
			selected_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`);
};

const toSeverity = (value: string): 'minimal' | 'mild' | 'moderate' | 'moderately-severe' | 'severe' => {
	const normalized = String(value || '').toLowerCase();
	if (normalized.includes('severe')) return 'severe';
	if (normalized.includes('moderate')) return 'moderate';
	if (normalized.includes('mild')) return 'mild';
	return 'minimal';
};

const normalizePathway = (value: string): 'stepped-care' | 'direct-provider' | 'urgent-care' => {
	const normalized = String(value || '').toUpperCase();
	if (normalized === 'CRISIS_SUPPORT' || normalized === 'PSYCHIATRIST') return 'urgent-care';
	if (normalized === 'THERAPIST') return 'direct-provider';
	return 'stepped-care';
};

const normalizeUrgency = (value: string): 'routine' | 'priority' | 'urgent' => {
	const normalized = String(value || '').toUpperCase();
	if (normalized === 'CRITICAL' || normalized === 'HIGH') return 'urgent';
	if (normalized === 'MEDIUM') return 'priority';
	return 'routine';
};

const normalizeRecommendation = (data: any) => {
	const journey = data?.journey || {};
	const assessment = data?.assessment || {};
	const pathway = normalizePathway(journey.pathway);
	const urgency = normalizeUrgency(journey.urgency);
	const rationale = Array.isArray(journey.rationale) ? journey.rationale : [];
	const actions = Array.isArray(journey.actions) ? journey.actions : [];
	const severity = toSeverity(assessment.severityLevel || data?.result_level);

	return {
		pathway,
		severity,
		followUpDays: Number(journey.followUpDays || 0),
		recommendation: {
			providerTypes: [String(journey.recommendedProvider || 'self-guided')],
			urgency,
			rationale,
		},
		crisis: {
			detected: String(journey.pathway || '').toUpperCase() === 'CRISIS_SUPPORT',
			reason: rationale[0] || null,
		},
		nextActions: actions,
		assessment: {
			id: assessment.id || data?.id,
			type: assessment.type || data?.type,
			score: Number(assessment.score ?? data?.score ?? 0),
		},
	};
};

const getPathwayState = async (userId: string): Promise<null | {
	pathway: string;
	reason: string | null;
	selectedAt: string;
	updatedAt: string;
}> => {
	await ensureJourneyTables();
	const rows = (await db.$queryRawUnsafe(
		`SELECT pathway, reason, selected_at, updated_at FROM patient_pathway_state WHERE user_id = $1 LIMIT 1`,
		userId,
	)) as any[];
	const row = rows?.[0];
	if (!row) return null;
	return {
		pathway: String(row.pathway || ''),
		reason: row.reason ? String(row.reason) : null,
		selectedAt: new Date(row.selected_at).toISOString(),
		updatedAt: new Date(row.updated_at).toISOString(),
	};
};

export const submitQuickScreeningJourney = async (userId: string, answers: number[]) => {
	const safeAnswers = Array.isArray(answers) ? answers.map((value) => Number(value || 0)) : [];
	const result = await submitAssessment(userId, {
		type: 'Quick Mental Check',
		answers: safeAnswers,
	});
	return normalizeRecommendation(result);
};

export const submitClinicalJourney = async (
	userId: string,
	input: { type: 'PHQ-9' | 'GAD-7'; score?: number; answers?: number[] },
) => {
	const result = await submitAssessment(userId, {
		type: input.type,
		score: input.score,
		answers: input.answers,
	});
	return normalizeRecommendation(result);
};

export const getJourneyRecommendation = async (userId: string) => {
	let recommendation: ReturnType<typeof normalizeRecommendation> = {
		pathway: 'stepped-care' as const,
		severity: 'minimal',
		followUpDays: 7,
		recommendation: {
			providerTypes: ['self-guided'],
			urgency: 'routine' as const,
			rationale: ['Complete your first assessment to unlock personalized recommendations.'],
		},
		crisis: {
			detected: false,
			reason: null,
		},
		nextActions: ['Complete a quick mental check', 'Track mood daily for one week'],
		assessment: {
			id: undefined,
			type: undefined,
			score: 0,
		},
	};

	try {
		const latest = await getLatestJourneyRecommendation(userId);
		recommendation = normalizeRecommendation(latest);
	} catch (error: any) {
		if (!(error instanceof AppError) || error.statusCode !== 404) {
			throw error;
		}
	}

	const selectedPathway = await getPathwayState(userId);
	return {
		...recommendation,
		pathway: selectedPathway?.pathway || recommendation.pathway,
		selectedPathway,
	};
};

export const selectJourneyPathway = async (
	userId: string,
	input: { pathway: 'stepped-care' | 'direct-provider' | 'urgent-care'; reason?: string; metadata?: Record<string, any> },
) => {
	await ensureJourneyTables();
	await db.$executeRawUnsafe(
		`INSERT INTO patient_pathway_state (id, user_id, pathway, reason, metadata, selected_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
		 ON CONFLICT (user_id)
		 DO UPDATE SET pathway = EXCLUDED.pathway, reason = EXCLUDED.reason, metadata = EXCLUDED.metadata, updated_at = NOW()`,
		randomUUID(),
		userId,
		input.pathway,
		input.reason || null,
		JSON.stringify(input.metadata || {}),
	);

	return getPathwayState(userId);
};
