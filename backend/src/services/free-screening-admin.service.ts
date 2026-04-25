import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

const db = prisma as any;

const templateSelect = {
	id: true,
	key: true,
	title: true,
	description: true,
	estimatedMinutes: true,
	isPublic: true,
	randomizeOrder: true,
	status: true,
	createdAt: true,
	updatedAt: true,
};

export const listScreeningTemplatesAdmin = async () => {
	const rows = await db.screeningTemplate.findMany({ orderBy: [{ updatedAt: 'desc' }], select: templateSelect });
	return { items: rows };
};

export const ensureScreeningTemplateDefaultAdmin = async (templateKey?: string) => {
	void templateKey;
	throw new AppError('Screening template administration is disabled.', 410);
};

export const createScreeningTemplateAdmin = async (input: {
	key: string;
	title: string;
	description?: string;
	estimatedMinutes?: number;
	isPublic?: boolean;
	randomizeOrder?: boolean;
}) => {
	const key = String(input.key || '').trim();
	const title = String(input.title || '').trim();
	if (!key) throw new AppError('key is required', 422);
	if (!title) throw new AppError('title is required', 422);

	const created = await db.screeningTemplate.create({
		data: {
			key,
			title,
			description: input.description ? String(input.description) : null,
			estimatedMinutes: Number.isFinite(Number(input.estimatedMinutes)) ? Math.max(1, Number(input.estimatedMinutes)) : 3,
			isPublic: input.isPublic !== false,
			randomizeOrder: input.randomizeOrder !== false,
			status: 'DRAFT',
		},
		select: templateSelect,
	});

	return created;
};

export const updateScreeningTemplateAdmin = async (
	templateId: string,
	input: {
		title?: string;
		description?: string;
		estimatedMinutes?: number;
		isPublic?: boolean;
		randomizeOrder?: boolean;
		status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
	},
) => {
	const existing = await db.screeningTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
	if (!existing) throw new AppError('Template not found', 404);

	const updated = await db.screeningTemplate.update({
		where: { id: templateId },
		data: {
			title: input.title !== undefined ? String(input.title) : undefined,
			description: input.description !== undefined ? (input.description ? String(input.description) : null) : undefined,
			estimatedMinutes:
				input.estimatedMinutes !== undefined && Number.isFinite(Number(input.estimatedMinutes))
					? Math.max(1, Number(input.estimatedMinutes))
					: undefined,
			isPublic: input.isPublic,
			randomizeOrder: input.randomizeOrder,
			status: input.status,
		},
		select: templateSelect,
	});
	return updated;
};

export const listTemplateQuestionsAdmin = async (templateId: string) => {
	const template = await db.screeningTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
	if (!template) throw new AppError('Template not found', 404);

	const items = await db.screeningQuestion.findMany({
		where: { templateId },
		orderBy: [{ orderIndex: 'asc' }],
		include: { options: { orderBy: [{ optionIndex: 'asc' }] } },
	});
	return { items };
};

export const createTemplateQuestionAdmin = async (
	templateId: string,
	input: { prompt: string; sectionKey?: string; orderIndex?: number; options?: Array<{ label: string; optionIndex: number; points: number }> },
) => {
	const template = await db.screeningTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
	if (!template) throw new AppError('Template not found', 404);

	const prompt = String(input.prompt || '').trim();
	if (!prompt) throw new AppError('prompt is required', 422);

	const latest = await db.screeningQuestion.findFirst({
		where: { templateId },
		orderBy: [{ orderIndex: 'desc' }],
		select: { orderIndex: true },
	});

	const orderIndex = Number.isFinite(Number(input.orderIndex))
		? Math.max(1, Number(input.orderIndex))
		: Number(latest?.orderIndex || 0) + 1;

	const created = await db.screeningQuestion.create({
		data: {
			templateId,
			prompt,
			sectionKey: input.sectionKey ? String(input.sectionKey) : 'general',
			orderIndex,
			isActive: true,
			options: {
				create: Array.isArray(input.options)
					? input.options.map((option) => ({
						label: String(option.label || '').trim(),
						optionIndex: Number(option.optionIndex),
						points: Number(option.points),
					}))
					: [],
			},
		},
		include: { options: { orderBy: [{ optionIndex: 'asc' }] } },
	});
	return created;
};

export const updateTemplateQuestionAdmin = async (
	questionId: string,
	input: { prompt?: string; sectionKey?: string; orderIndex?: number; isActive?: boolean },
) => {
	const existing = await db.screeningQuestion.findUnique({ where: { id: questionId }, select: { id: true } });
	if (!existing) throw new AppError('Question not found', 404);

	const updated = await db.screeningQuestion.update({
		where: { id: questionId },
		data: {
			prompt: input.prompt !== undefined ? String(input.prompt) : undefined,
			sectionKey: input.sectionKey !== undefined ? String(input.sectionKey) : undefined,
			orderIndex:
				input.orderIndex !== undefined && Number.isFinite(Number(input.orderIndex)) ? Math.max(1, Number(input.orderIndex)) : undefined,
			isActive: input.isActive,
		},
		include: { options: { orderBy: [{ optionIndex: 'asc' }] } },
	});
	return updated;
};

export const createQuestionOptionAdmin = async (
	questionId: string,
	input: { label: string; optionIndex: number; points: number },
) => {
	const question = await db.screeningQuestion.findUnique({ where: { id: questionId }, select: { id: true } });
	if (!question) throw new AppError('Question not found', 404);

	const label = String(input.label || '').trim();
	if (!label) throw new AppError('label is required', 422);

	return db.screeningQuestionOption.create({
		data: {
			questionId,
			label,
			optionIndex: Number(input.optionIndex),
			points: Number(input.points),
		},
	});
};

export const updateQuestionOptionAdmin = async (
	optionId: string,
	input: { label?: string; optionIndex?: number; points?: number },
) => {
	const existing = await db.screeningQuestionOption.findUnique({ where: { id: optionId }, select: { id: true } });
	if (!existing) throw new AppError('Option not found', 404);

	return db.screeningQuestionOption.update({
		where: { id: optionId },
		data: {
			label: input.label !== undefined ? String(input.label) : undefined,
			optionIndex: input.optionIndex !== undefined ? Number(input.optionIndex) : undefined,
			points: input.points !== undefined ? Number(input.points) : undefined,
		},
	});
};

export const listScoringBandsAdmin = async (templateId: string) => {
	const template = await db.screeningTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
	if (!template) throw new AppError('Template not found', 404);
	const items = await db.screeningScoringBand.findMany({ where: { templateId }, orderBy: [{ orderIndex: 'asc' }] });
	return { items };
};

export const replaceScoringBandsAdmin = async (
	templateId: string,
	bands: Array<{
		orderIndex: number;
		minScore: number;
		maxScore: number;
		severity: string;
		interpretation: string;
		recommendation: string;
		actionLabel: string;
	}>,
) => {
	const template = await db.screeningTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
	if (!template) throw new AppError('Template not found', 404);
	if (!Array.isArray(bands) || bands.length === 0) throw new AppError('At least one scoring band is required', 422);

	const sorted = [...bands].sort((a, b) => Number(a.minScore) - Number(b.minScore));
	for (let i = 0; i < sorted.length; i += 1) {
		const current = sorted[i];
		if (Number(current.minScore) > Number(current.maxScore)) {
			throw new AppError('Each band must satisfy minScore <= maxScore', 422);
		}
		if (i > 0) {
			const previous = sorted[i - 1];
			if (Number(current.minScore) <= Number(previous.maxScore)) {
				throw new AppError('Scoring bands must not overlap', 422);
			}
		}
	}

	await db.$transaction(async (tx: any) => {
		await tx.screeningScoringBand.deleteMany({ where: { templateId } });
		await tx.screeningScoringBand.createMany({
			data: bands.map((band) => ({
				templateId,
				orderIndex: Number(band.orderIndex),
				minScore: Number(band.minScore),
				maxScore: Number(band.maxScore),
				severity: String(band.severity),
				interpretation: String(band.interpretation),
				recommendation: String(band.recommendation),
				actionLabel: String(band.actionLabel),
			})),
		});
	});

	return listScoringBandsAdmin(templateId);
};

export const listAllProviderExtraQuestionsAdmin = async (params?: {
	providerId?: string;
	status?: string;
	page?: number;
	pageSize?: number;
}) => {
	const page = Math.max(1, Number(params?.page) || 1);
	const pageSize = Math.min(100, Math.max(1, Number(params?.pageSize) || 20));

	const where: Record<string, any> = {};
	if (params?.providerId) where.providerId = String(params.providerId);
	if (params?.status) where.status = String(params.status);

	const [total, items] = await Promise.all([
		db.providerExtraQuestion.count({ where }),
		db.providerExtraQuestion.findMany({
			where,
			orderBy: [{ createdAt: 'desc' }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: {
				options: { orderBy: [{ optionIndex: 'asc' }] },
				provider: { select: { id: true, firstName: true, lastName: true, name: true, email: true, role: true } },
				assignments: { select: { id: true, patientId: true, isActive: true, assignedAt: true } },
			},
		}),
	]);

	return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

export const simulateTemplateScoring = async (
	templateId: string,
	input: { answers: Array<{ questionId: string; optionId: string }> },
) => {
	const template = await db.screeningTemplate.findUnique({
		where: { id: templateId },
		include: {
			questions: {
				where: { isActive: true },
				orderBy: [{ orderIndex: 'asc' }],
				include: { options: { orderBy: [{ optionIndex: 'asc' }] } },
			},
			scoringBands: { orderBy: [{ minScore: 'asc' }] },
		},
	});
	if (!template) throw new AppError('Template not found', 404);

	if (!Array.isArray(input.answers) || input.answers.length === 0) {
		throw new AppError('answers[] is required', 422);
	}

	const optionMap = new Map<string, { questionId: string; points: number; label: string }>();
	for (const question of template.questions as any[]) {
		for (const option of question.options as any[]) {
			optionMap.set(String(option.id), {
				questionId: String(question.id),
				points: Number(option.points),
				label: String(option.label),
			});
		}
	}

	let totalScore = 0;
	const scoreBreakdown: Array<{ questionId: string; optionId: string; optionLabel: string; points: number }> = [];
	const seenQuestions = new Set<string>();

	for (const answer of input.answers) {
		const optionId = String(answer.optionId || '').trim();
		const questionId = String(answer.questionId || '').trim();
		if (!optionId || !questionId) throw new AppError('Each answer must include questionId and optionId', 422);

		const option = optionMap.get(optionId);
		if (!option) throw new AppError(`Option ${optionId} not found in this template`, 422);
		if (option.questionId !== questionId) throw new AppError(`optionId ${optionId} does not belong to questionId ${questionId}`, 422);
		if (seenQuestions.has(questionId)) throw new AppError(`Duplicate answer for questionId ${questionId}`, 422);

		seenQuestions.add(questionId);
		totalScore += option.points;
		scoreBreakdown.push({ questionId, optionId, optionLabel: option.label, points: option.points });
	}

	const matchedBand = (template.scoringBands as any[]).find(
		(band: any) => totalScore >= Number(band.minScore) && totalScore <= Number(band.maxScore),
	) ?? null;

	const activeQuestions = (template.questions as any[]).map((q: any) => ({
		id: q.id,
		prompt: q.prompt,
		orderIndex: q.orderIndex,
		options: (q.options as any[]).map((o: any) => ({ id: o.id, optionIndex: o.optionIndex, label: o.label, points: o.points })),
	}));

	return {
		template: { id: template.id, key: (template as any).key, title: (template as any).title, status: (template as any).status },
		totalScore,
		scoreBreakdown,
		matchedBand,
		questions: activeQuestions,
		scoringBands: template.scoringBands,
	};
};
