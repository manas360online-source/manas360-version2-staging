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
	if (!template) throw new AppError('Published free screening template not found', 404);

	const patientProfile = input.patientUserId ? await getPatientProfileByUserId(input.patientUserId) : null;
	const questionIds = (template.questions || []).map((q: any) => q.id);
	if (!questionIds.length) throw new AppError('No active screening questions found', 409);

	const attemptSeed = Math.floor(Math.random() * 2147483647);
	const presentedOrder = template.randomizeOrder ? seededShuffle(questionIds, attemptSeed) : questionIds;
	const attemptToken = crypto.randomBytes(24).toString('hex');
	const accessTokenHash = hashToken(attemptToken);
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

	const attempt = await db.screeningAttempt.create({
		data: {
			templateId: template.id,
			patientId: patientProfile?.id,
			accessTokenHash,
			status: 'IN_PROGRESS',
			attemptSeed,
			presentedOrder,
			expiresAt,
		},
	});

	return {
		attemptId: attempt.id,
		attemptToken,
		template: {
			id: template.id,
			key: template.key,
			title: template.title,
			description: template.description,
			estimatedMinutes: template.estimatedMinutes,
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
	const attempt = await db.screeningAttempt.findUnique({
		where: { id: input.attemptId },
		include: {
			template: {
				include: {
					questions: {
						where: { isActive: true },
						include: { options: true },
					},
					scoringBands: { orderBy: { orderIndex: 'asc' } },
				},
			},
		},
	});
	if (!attempt) throw new AppError('Attempt not found', 404);

	await authorizeAttempt(attempt, input);

	if (!Array.isArray(input.answers) || input.answers.length === 0) {
		throw new AppError('answers are required', 422);
	}

	const order = Array.isArray(attempt.presentedOrder) ? attempt.presentedOrder.map((id: unknown) => String(id)) : [];
	const questionMap = new Map((attempt.template.questions || []).map((question: any) => [question.id, question]));
	if (!order.length || !questionMap.size) throw new AppError('Attempt questions are unavailable', 409);

	const answerByQuestion = new Map<string, SubmitAnswerInput>();
	for (const answer of input.answers) {
		const questionId = String(answer.questionId || '').trim();
		if (!questionId || Number.isNaN(Number(answer.optionIndex))) {
			throw new AppError('Each answer must include questionId and optionIndex', 422);
		}
		answerByQuestion.set(questionId, { questionId, optionIndex: Number(answer.optionIndex) });
	}

	for (const questionId of order) {
		if (!answerByQuestion.has(questionId)) {
			throw new AppError('Please answer all questions before submitting', 422);
		}
	}

	let totalScore = 0;
	const resolvedAnswers: Array<{ questionId: string; optionId: string; optionIndex: number; points: number }> = [];

	for (const questionId of order) {
		const question = questionMap.get(questionId) as any;
		if (!question) throw new AppError('Invalid question in attempt', 409);
		const selected = answerByQuestion.get(questionId);
		if (!selected) throw new AppError('Missing question answer', 422);
		const selectedOption = (question.options || []).find((option: any) => Number(option.optionIndex) === Number(selected.optionIndex));
		if (!selectedOption) {
			throw new AppError(`Invalid optionIndex for question ${questionId}`, 422);
		}
		totalScore += Number(selectedOption.points);
		resolvedAnswers.push({
			questionId,
			optionId: selectedOption.id,
			optionIndex: Number(selectedOption.optionIndex),
			points: Number(selectedOption.points),
		});
	}

	const band = resolveBand(attempt.template.scoringBands || [], totalScore);

	await db.$transaction(async (tx: any) => {
		await tx.screeningAnswer.deleteMany({ where: { attemptId: attempt.id } });
		await tx.screeningAnswer.createMany({
			data: resolvedAnswers.map((answer) => ({
				attemptId: attempt.id,
				questionId: answer.questionId,
				optionId: answer.optionId,
				optionIndex: answer.optionIndex,
				points: answer.points,
			})),
		});
		await tx.screeningAttempt.update({
			where: { id: attempt.id },
			data: {
				status: 'SUBMITTED',
				totalScore,
				severityLevel: String(band.severity),
				interpretation: String(band.interpretation),
				recommendation: String(band.recommendation),
				actionLabel: String(band.actionLabel),
				submittedAt: new Date(),
			},
		});
	});

	return {
		attemptId: attempt.id,
		templateKey: attempt.template.key,
		totalScore,
		severityLevel: String(band.severity),
		interpretation: String(band.interpretation),
		recommendation: String(band.recommendation),
		action: String(band.actionLabel),
	};
};

export const getMyFreeScreeningHistory = async (patientUserId: string) => {
 let profile: { id: string } | null = null;
 try {
  profile = await getPatientProfileByUserId(patientUserId);
 } catch (error) {
  const message = String((error as any)?.message || '').toLowerCase();
	const code = String((error as any)?.code || '').toUpperCase();
	if (
	 message.includes('patient profile not found')
	 || code === 'P2021'
	 || code === 'P2022'
	 || code === 'P2010'
	 || message.includes('does not exist')
	 || message.includes('unknown column')
	 || message.includes('no such table')
	 || message.includes('connect econnrefused')
	) {
	 return { items: [] };
	}
	throw error;
 }

 if (!profile?.id) {
  return { items: [] };
 }

 const attempts = await db.screeningAttempt.findMany({
  where: { patientId: profile.id, status: 'SUBMITTED' },
  orderBy: { submittedAt: 'desc' },
  take: 20,
  include: {
   template: { select: { key: true, title: true } },
  },
 }).catch((error: unknown) => {
  const message = String((error as any)?.message || '').toLowerCase();
  const code = String((error as any)?.code || '').toUpperCase();
  if (
   code === 'P2021'
   || code === 'P2022'
   || code === 'P2010'
   || message.includes('does not exist')
   || message.includes('unknown column')
   || message.includes('no such table')
   || message.includes('screening')
  ) {
   return [];
  }
  throw error;
 });

	return {
		items: attempts.map((attempt: any) => ({
			attemptId: attempt.id,
			templateKey: attempt.template?.key,
			templateTitle: attempt.template?.title,
			totalScore: attempt.totalScore,
			severityLevel: attempt.severityLevel,
			interpretation: attempt.interpretation,
			recommendation: attempt.recommendation,
			action: attempt.actionLabel,
			submittedAt: attempt.submittedAt,
		})),
	};
};
