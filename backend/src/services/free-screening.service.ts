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
	const template = await getTemplate(input.templateKey);
	if (!template) throw new AppError('Screening template not found', 404);

	const activeQuestions = Array.isArray((template as any).questions) ? (template as any).questions : [];
	if (activeQuestions.length === 0) throw new AppError('No active screening questions found', 422);

	const patientProfile = input.patientUserId ? await getPatientProfileByUserId(input.patientUserId) : null;
	const seed = Math.floor(Math.random() * 2147483647);
	const questionIds = activeQuestions.map((question: any) => String(question.id));
	const presentedOrder = (template as any).randomizeOrder ? seededShuffle(questionIds, seed) : questionIds;

	const attemptToken = patientProfile ? undefined : crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

	const created = await db.screeningAttempt.create({
		data: {
			templateId: String((template as any).id),
			patientId: patientProfile?.id ?? null,
			accessTokenHash: attemptToken ? hashToken(attemptToken) : null,
			status: 'IN_PROGRESS',
			attemptSeed: seed,
			presentedOrder,
			expiresAt,
		},
		select: { id: true, expiresAt: true },
	});

	return {
		attemptId: created.id,
		attemptToken,
		expiresAt: created.expiresAt,
		template: {
			id: (template as any).id,
			key: String((template as any).key),
			title: String((template as any).title),
			status: String((template as any).status),
		},
		questions: buildQuestionPayload(template, presentedOrder),
	};
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
	const attemptId = String(input.attemptId || '').trim();
	if (!attemptId) throw new AppError('attemptId is required', 422);
	if (!Array.isArray(input.answers) || input.answers.length === 0) throw new AppError('answers[] is required', 422);

	const attempt = await db.screeningAttempt.findUnique({
		where: { id: attemptId },
		include: {
			template: {
				include: {
					questions: {
						where: { isActive: true },
						orderBy: { orderIndex: 'asc' },
						include: { options: { orderBy: { optionIndex: 'asc' } } },
					},
					scoringBands: { orderBy: { orderIndex: 'asc' } },
				},
			},
		},
	});

	if (!attempt) throw new AppError('Attempt not found', 404);
	await authorizeAttempt(attempt, input);

	const questionMap = new Map<string, any>();
	for (const question of (attempt.template.questions || [])) {
		questionMap.set(String(question.id), question);
	}

	const seenQuestions = new Set<string>();
	const answerRows: Array<{ questionId: string; optionId: string; optionIndex: number; points: number }> = [];
	let totalScore = 0;

	for (const answer of input.answers) {
		const questionId = String(answer.questionId || '').trim();
		const optionIndex = Number(answer.optionIndex);

		if (!questionId || !Number.isFinite(optionIndex)) throw new AppError('Each answer requires questionId and optionIndex', 422);
		if (seenQuestions.has(questionId)) throw new AppError(`Duplicate answer for questionId ${questionId}`, 422);

		const question = questionMap.get(questionId);
		if (!question) throw new AppError(`Question ${questionId} not found in this attempt`, 422);

		const selectedOption = (question.options || []).find((option: any) => Number(option.optionIndex) === optionIndex);
		if (!selectedOption) throw new AppError(`Invalid optionIndex ${optionIndex} for question ${questionId}`, 422);

		seenQuestions.add(questionId);
		totalScore += Number(selectedOption.points);
		answerRows.push({
			questionId,
			optionId: String(selectedOption.id),
			optionIndex: Number(selectedOption.optionIndex),
			points: Number(selectedOption.points),
		});
	}

	const matchedBand = resolveBand(attempt.template.scoringBands || [], totalScore);
	const submittedAt = new Date();

	await db.$transaction(async (tx: any) => {
		await tx.screeningAnswer.deleteMany({ where: { attemptId } });
		if (answerRows.length > 0) {
			await tx.screeningAnswer.createMany({
				data: answerRows.map((row) => ({
					attemptId,
					questionId: row.questionId,
					optionId: row.optionId,
					optionIndex: row.optionIndex,
					points: row.points,
				})),
			});
		}

		await tx.screeningAttempt.update({
			where: { id: attemptId },
			data: {
				status: 'SUBMITTED',
				totalScore,
				severityLevel: String((matchedBand as any).severity || ''),
				interpretation: String((matchedBand as any).interpretation || ''),
				recommendation: String((matchedBand as any).recommendation || ''),
				actionLabel: String((matchedBand as any).actionLabel || ''),
				submittedAt,
			},
		});
	});

	return {
		attemptId,
		templateKey: String((attempt.template as any).key),
		totalScore,
		severityLevel: String((matchedBand as any).severity || ''),
		interpretation: String((matchedBand as any).interpretation || ''),
		recommendation: String((matchedBand as any).recommendation || ''),
		actionLabel: String((matchedBand as any).actionLabel || ''),
		submittedAt,
	};
};

export const getMyFreeScreeningHistory = async (patientUserId: string) => {
	const profile = await getPatientProfileByUserId(patientUserId);
	const items = await db.screeningAttempt.findMany({
		where: {
			patientId: profile.id,
			status: 'SUBMITTED',
		},
		orderBy: [{ submittedAt: 'desc' }],
		include: {
			template: { select: { id: true, key: true, title: true } },
		},
	});

	return {
		items: items.map((item: any) => ({
			attemptId: item.id,
			template: item.template,
			totalScore: item.totalScore,
			severityLevel: item.severityLevel,
			interpretation: item.interpretation,
			recommendation: item.recommendation,
			actionLabel: item.actionLabel,
			submittedAt: item.submittedAt,
			startedAt: item.startedAt,
		})),
	};
};
