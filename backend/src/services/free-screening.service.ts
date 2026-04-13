import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { ensureDefaultScreeningTemplate, FREE_SCREENING_TEMPLATE_KEY } from './screening-template-defaults.service';

const db = prisma as any;

type StartInput = {
	templateKey?: string;
	patientUserId?: string;
};

type SubmitAnswerInput = {
	questionId: string;
	optionIndex: number;
};

type SubmitInput = {
	attemptId: string;
	answers: SubmitAnswerInput[];
	attemptToken?: string;
	patientUserId?: string;
};

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

const normalizeAttemptToken = (token: unknown): string | undefined => {
	if (typeof token !== 'string') return undefined;
	const trimmed = token.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const mulberry32 = (seed: number): (() => number) => {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let n = Math.imul(t ^ (t >>> 15), t | 1);
		n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
		return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
	};
};

const seededShuffle = <T>(items: T[], seed: number): T[] => {
	const next = mulberry32(seed);
	const arr = [...items];
	for (let i = arr.length - 1; i > 0; i -= 1) {
		const j = Math.floor(next() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
};

const getPatientProfileByUserId = async (userId: string) => {
	const profile = await db.patientProfile.findUnique({ where: { userId }, select: { id: true, userId: true } });
	if (!profile) throw new AppError('Patient profile not found', 404);
	return profile;
};

const getTemplate = async (templateKey?: string) => {
	const key = String(templateKey || FREE_SCREENING_TEMPLATE_KEY).trim() || FREE_SCREENING_TEMPLATE_KEY;
	const template = await db.screeningTemplate.findFirst({
		where: { key, status: 'PUBLISHED' },
		include: {
			questions: {
				where: { isActive: true },
				orderBy: { orderIndex: 'asc' },
				include: { options: { orderBy: { optionIndex: 'asc' } } },
			},
			scoringBands: { orderBy: { orderIndex: 'asc' } },
		},
	});
	if (template) return template;

	await ensureDefaultScreeningTemplate(db, key);

	return db.screeningTemplate.findFirst({
		where: { key, status: 'PUBLISHED' },
		include: {
			questions: {
				where: { isActive: true },
				orderBy: { orderIndex: 'asc' },
				include: { options: { orderBy: { optionIndex: 'asc' } } },
			},
			scoringBands: { orderBy: { orderIndex: 'asc' } },
		},
	});
};

const buildQuestionPayload = (template: any, presentedOrder: string[]) => {
	const byId = new Map((template.questions || []).map((question: any) => [question.id, question]));
	return presentedOrder
		.map((id) => byId.get(id))
		.filter(Boolean)
		.map((question: any, index: number) => ({
			questionId: question.id,
			position: index + 1,
			prompt: question.prompt,
			sectionKey: question.sectionKey,
			options: (question.options || []).map((option: any) => ({
				optionIndex: option.optionIndex,
				label: option.label,
				points: option.points,
			})),
		}));
};

export const startFreeScreeningAttempt = async (input: StartInput) => {
	void input;
	throw new AppError('Free screening is disabled. Please complete PHQ-9 and GAD-7 via patient journey clinical assessment.', 410);
};

export const resolveBand = (bands: any[], totalScore: number) => {
	const matched = (bands || []).find((band) => totalScore >= Number(band.minScore) && totalScore <= Number(band.maxScore));
	if (matched) return matched;
	if (!bands?.length) {
		return {
			severity: totalScore >= 12 ? 'Severe' : totalScore >= 8 ? 'Moderate' : totalScore >= 4 ? 'Mild' : 'Minimal',
			interpretation: 'Assessment completed.',
			recommendation: 'Please consult a provider if symptoms persist.',
			actionLabel: 'Review results',
		};
	}
	return bands[bands.length - 1];
};

const authorizeAttempt = async (attempt: any, input: SubmitInput): Promise<void> => {
	if (attempt.status === 'SUBMITTED') {
		throw new AppError('This attempt has already been submitted', 409);
	}

	if (attempt.expiresAt && new Date(attempt.expiresAt).getTime() < Date.now()) {
		throw new AppError('This attempt has expired. Please start again.', 410);
	}

	if (attempt.patientId) {
		if (!input.patientUserId) throw new AppError('Authentication required for this attempt', 401);
		const profile = await getPatientProfileByUserId(input.patientUserId);
		if (profile.id !== attempt.patientId) throw new AppError('Attempt does not belong to the current user', 403);
		return;
	}

	const attemptToken = normalizeAttemptToken(input.attemptToken);
	if (!attemptToken) throw new AppError('attemptToken is required for public attempt submission', 422);
	if (hashToken(attemptToken) !== attempt.accessTokenHash) throw new AppError('Invalid attempt token', 403);
};

export const submitFreeScreeningAttempt = async (input: SubmitInput) => {
	void input;
	throw new AppError('Free screening is disabled. Please complete PHQ-9 and GAD-7 via patient journey clinical assessment.', 410);
};

export const getMyFreeScreeningHistory = async (patientUserId: string) => {
	void patientUserId;
	return { items: [] };
};
