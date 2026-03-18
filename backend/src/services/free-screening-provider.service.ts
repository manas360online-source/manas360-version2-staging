import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

const db = prisma as any;

const getPatientProfileByUserId = async (userId: string) => {
	const profile = await db.patientProfile.findUnique({ where: { userId }, select: { id: true, userId: true } });
	if (!profile) throw new AppError('Patient profile not found', 404);
	return profile;
};

const assertProviderPatientAssignment = async (providerUserId: string, patientUserId: string) => {
	const assignment = await db.careTeamAssignment.findFirst({
		where: {
			providerId: providerUserId,
			patientId: patientUserId,
			status: 'ACTIVE',
		},
		select: { id: true },
	});
	if (!assignment) throw new AppError('Patient is not assigned to this provider', 403);
};

export const listProviderExtraQuestions = async (providerUserId: string) => {
	const items = await db.providerExtraQuestion.findMany({
		where: { providerId: providerUserId },
		orderBy: [{ updatedAt: 'desc' }],
		include: { options: { orderBy: [{ optionIndex: 'asc' }] } },
	});
	return { items };
};

export const createProviderExtraQuestion = async (
	providerUserId: string,
	input: {
		prompt?: string;
		sectionKey?: string;
		isRequired?: boolean;
		status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
		templateQuestionId?: string;
		options?: Array<{ label: string; optionIndex: number; points: number }>;
	},
) => {
	const prompt = String(input.prompt || '').trim();
	if (!prompt && !input.templateQuestionId) throw new AppError('prompt or templateQuestionId is required', 422);

	let templateQuestion: any = null;
	if (input.templateQuestionId) {
		templateQuestion = await db.screeningQuestion.findUnique({
			where: { id: String(input.templateQuestionId) },
			include: { options: { orderBy: [{ optionIndex: 'asc' }] } },
		});
		if (!templateQuestion) throw new AppError('Template question not found', 404);
	}

	const created = await db.providerExtraQuestion.create({
		data: {
			providerId: providerUserId,
			templateQuestionId: templateQuestion?.id,
			prompt: prompt || String(templateQuestion.prompt),
			sectionKey: input.sectionKey ? String(input.sectionKey) : 'provider-extra',
			isRequired: Boolean(input.isRequired),
			status: input.status || 'DRAFT',
			options: {
				create: Array.isArray(input.options) && input.options.length > 0
					? input.options.map((option) => ({
						label: String(option.label || '').trim(),
						optionIndex: Number(option.optionIndex),
						points: Number(option.points),
						templateOptionId: null,
					}))
					: (templateQuestion?.options || []).map((option: any) => ({
						label: String(option.label),
						optionIndex: Number(option.optionIndex),
						points: Number(option.points),
						templateOptionId: option.id,
					})),
			},
		},
		include: { options: { orderBy: [{ optionIndex: 'asc' }] } },
	});

	return created;
};

export const assignProviderQuestionToPatient = async (
	providerUserId: string,
	providerQuestionId: string,
	input: { patientUserId: string; expiresAt?: string },
) => {
	const question = await db.providerExtraQuestion.findUnique({
		where: { id: providerQuestionId },
		select: { id: true, providerId: true },
	});
	if (!question) throw new AppError('Provider question not found', 404);
	if (String(question.providerId) !== providerUserId) throw new AppError('You can assign only your own questions', 403);

	const patientUserId = String(input.patientUserId || '').trim();
	if (!patientUserId) throw new AppError('patientUserId is required', 422);
	await assertProviderPatientAssignment(providerUserId, patientUserId);
	const patientProfile = await getPatientProfileByUserId(patientUserId);

	const created = await db.providerQuestionAssignment.create({
		data: {
			providerQuestionId,
			patientId: patientProfile.id,
			isActive: true,
			expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
		},
		include: {
			providerQuestion: {
				include: { options: { orderBy: [{ optionIndex: 'asc' }] } },
			},
		},
	});
	return created;
};

export const listProviderQuestionAssignments = async (providerUserId: string) => {
	const items = await db.providerQuestionAssignment.findMany({
		where: {
			providerQuestion: {
				providerId: providerUserId,
			},
		},
		orderBy: [{ assignedAt: 'desc' }],
		include: {
			patient: { select: { id: true, userId: true } },
			providerQuestion: {
				include: { options: { orderBy: [{ optionIndex: 'asc' }] } },
			},
		},
	});
	return { items };
};

export const listAssignedQuestionsForPatient = async (patientUserId: string) => {
	const profile = await getPatientProfileByUserId(patientUserId);
	const items = await db.providerQuestionAssignment.findMany({
		where: {
			patientId: profile.id,
			isActive: true,
			OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
		},
		orderBy: [{ assignedAt: 'asc' }],
		include: {
			providerQuestion: {
				include: {
					options: { orderBy: [{ optionIndex: 'asc' }] },
					provider: { select: { id: true, firstName: true, lastName: true, name: true } },
				},
			},
		},
	});

	return {
		items: items.map((item: any) => ({
			assignmentId: item.id,
			assignedAt: item.assignedAt,
			expiresAt: item.expiresAt,
			provider: item.providerQuestion?.provider
				? {
					id: item.providerQuestion.provider.id,
					name:
						item.providerQuestion.provider.name
						|| `${item.providerQuestion.provider.firstName || ''} ${item.providerQuestion.provider.lastName || ''}`.trim()
						|| 'Provider',
				}
				: null,
			question: {
				id: item.providerQuestion.id,
				prompt: item.providerQuestion.prompt,
				sectionKey: item.providerQuestion.sectionKey,
				isRequired: item.providerQuestion.isRequired,
				options: (item.providerQuestion.options || []).map((option: any) => ({
					optionIndex: option.optionIndex,
					label: option.label,
				})),
			},
		})),
	};
};

export const submitProviderAssignedAnswer = async (
	patientUserId: string,
	assignmentId: string,
	input: { selectedOptionIndex: number; notes?: string },
) => {
	const profile = await getPatientProfileByUserId(patientUserId);

	const assignment = await db.providerQuestionAssignment.findUnique({
		where: { id: assignmentId },
		include: {
			providerQuestion: {
				include: { options: { orderBy: [{ optionIndex: 'asc' }] } },
			},
		},
	});

	if (!assignment) throw new AppError('Assignment not found', 404);
	if (String(assignment.patientId) !== profile.id) throw new AppError('Assignment does not belong to this patient', 403);
	if (!assignment.isActive) throw new AppError('Assignment is no longer active', 410);
	if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) {
		throw new AppError('Assignment has expired', 410);
	}
	if (assignment.answeredAt) throw new AppError('Assignment has already been answered', 409);

	const options: any[] = assignment.providerQuestion?.options || [];
	const selectedOption = options.find((o: any) => Number(o.optionIndex) === Number(input.selectedOptionIndex));
	if (!selectedOption) throw new AppError('Invalid option index', 422);

	const updated = await db.providerQuestionAssignment.update({
		where: { id: assignmentId },
		data: {
			selectedOptionId: selectedOption.id,
			patientNotes: input.notes ? String(input.notes).trim() : null,
			answeredAt: new Date(),
		},
		include: {
			providerQuestion: {
				include: {
					options: { orderBy: [{ optionIndex: 'asc' }] },
					provider: { select: { id: true, firstName: true, lastName: true, name: true } },
				},
			},
			selectedOption: { select: { id: true, optionIndex: true, label: true } },
		},
	});

	return {
		assignmentId: updated.id,
		answeredAt: updated.answeredAt,
		selectedOption: updated.selectedOption,
		question: { id: updated.providerQuestion.id, prompt: updated.providerQuestion.prompt },
	};
};
