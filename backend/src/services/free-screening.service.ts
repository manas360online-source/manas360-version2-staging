import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

const db = prisma as any;

const DEFAULT_TEMPLATE_KEY = 'free-mental-health-screening-v1';

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

const DEFAULT_TEMPLATE = {
	key: DEFAULT_TEMPLATE_KEY,
	title: 'FREE MENTAL HEALTH SCREENING ASSESSMENT',
	description: '5-Question General Wellbeing Screener | 2-3 minutes | Immediate Results',
	estimatedMinutes: 3,
	questions: [
		{
			orderIndex: 1,
			prompt: 'Over the last 2 weeks, how often have you felt down, depressed, or hopeless?',
			options: [
				{ optionIndex: 0, label: 'Not at all', points: 0 },
				{ optionIndex: 1, label: 'Several days', points: 1 },
				{ optionIndex: 2, label: 'More than half the days', points: 2 },
				{ optionIndex: 3, label: 'Nearly every day', points: 3 },
			],
		},
		{
			orderIndex: 2,
			prompt: 'Over the last 2 weeks, how often have you felt nervous, anxious, or on edge?',
			options: [
				{ optionIndex: 0, label: 'Not at all', points: 0 },
				{ optionIndex: 1, label: 'Several days', points: 1 },
				{ optionIndex: 2, label: 'More than half the days', points: 2 },
				{ optionIndex: 3, label: 'Nearly every day', points: 3 },
			],
		},
		{
			orderIndex: 3,
			prompt: 'How would you rate your overall sleep quality in the past week?',
			options: [
				{ optionIndex: 0, label: 'Very good - I sleep well most nights', points: 0 },
				{ optionIndex: 1, label: 'Fairly good - Some difficulties but manageable', points: 1 },
				{ optionIndex: 2, label: 'Fairly bad - Frequent sleep problems', points: 2 },
				{ optionIndex: 3, label: 'Very bad - Severe sleep difficulties', points: 3 },
			],
		},
		{
			orderIndex: 4,
			prompt: 'How often do you feel overwhelmed by daily responsibilities?',
			options: [
				{ optionIndex: 0, label: 'Rarely or never', points: 0 },
				{ optionIndex: 1, label: 'Sometimes (once or twice a week)', points: 1 },
				{ optionIndex: 2, label: 'Often (3-5 days a week)', points: 2 },
				{ optionIndex: 3, label: 'Almost always (daily)', points: 3 },
			],
		},
		{
			orderIndex: 5,
			prompt: 'In the past month, how satisfied have you been with your relationships and social connections?',
			options: [
				{ optionIndex: 0, label: 'Very satisfied - Strong support system', points: 0 },
				{ optionIndex: 1, label: 'Somewhat satisfied - Adequate connections', points: 1 },
				{ optionIndex: 2, label: 'Somewhat dissatisfied - Limited support', points: 2 },
				{ optionIndex: 3, label: 'Very dissatisfied - Feeling isolated', points: 3 },
			],
		},
	],
	scoringBands: [
		{
			orderIndex: 1,
			minScore: 0,
			maxScore: 3,
			severity: 'Minimal',
			interpretation: 'You appear to be doing well overall with minimal mental health concerns.',
			recommendation: 'Continue healthy habits. Maintain work-life balance.',
			actionLabel: 'Keep monitoring',
		},
		{
			orderIndex: 2,
			minScore: 4,
			maxScore: 7,
			severity: 'Mild',
			interpretation: 'You may be experiencing some mild stress or mood changes that could benefit from attention.',
			recommendation: 'Consider self-care activities. Try meditation, exercise, or journaling.',
			actionLabel: 'Self-care recommended',
		},
		{
			orderIndex: 3,
			minScore: 8,
			maxScore: 11,
			severity: 'Moderate',
			interpretation: 'You are experiencing moderate mental health symptoms that warrant professional attention.',
			recommendation: 'Speak with a mental health professional. Consider therapy sessions.',
			actionLabel: 'Professional help suggested',
		},
		{
			orderIndex: 4,
			minScore: 12,
			maxScore: 15,
			severity: 'Severe',
			interpretation: 'You are experiencing significant mental health difficulties requiring immediate professional support.',
			recommendation:
				'Schedule consultation with psychiatrist or psychologist urgently. Consider therapy + medication evaluation.',
			actionLabel: 'Urgent - Book session now',
		},
	],
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
	const key = String(templateKey || DEFAULT_TEMPLATE_KEY).trim() || DEFAULT_TEMPLATE_KEY;
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

	await db.$transaction(async (tx: any) => {
		const created = await tx.screeningTemplate.create({
			data: {
				key: DEFAULT_TEMPLATE.key,
				title: DEFAULT_TEMPLATE.title,
				description: DEFAULT_TEMPLATE.description,
				estimatedMinutes: DEFAULT_TEMPLATE.estimatedMinutes,
				isPublic: true,
				randomizeOrder: true,
				status: 'PUBLISHED',
			},
		});

		for (const question of DEFAULT_TEMPLATE.questions) {
			await tx.screeningQuestion.create({
				data: {
					templateId: created.id,
					prompt: question.prompt,
					sectionKey: 'general',
					orderIndex: question.orderIndex,
					isActive: true,
					options: {
						create: question.options,
					},
				},
			});
		}

		await tx.screeningScoringBand.createMany({
			data: DEFAULT_TEMPLATE.scoringBands.map((band) => ({
				templateId: created.id,
				orderIndex: band.orderIndex,
				minScore: band.minScore,
				maxScore: band.maxScore,
				severity: band.severity,
				interpretation: band.interpretation,
				recommendation: band.recommendation,
				actionLabel: band.actionLabel,
			})),
		});
	});

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

const resolveBand = (bands: any[], totalScore: number) => {
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
	const profile = await getPatientProfileByUserId(patientUserId);
	const attempts = await db.screeningAttempt.findMany({
		where: { patientId: profile.id, status: 'SUBMITTED' },
		orderBy: { submittedAt: 'desc' },
		take: 20,
		include: {
			template: { select: { key: true, title: true } },
		},
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
