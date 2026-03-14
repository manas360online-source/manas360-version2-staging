import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import {
	createPatientAssessment,
	createPatientProfile,
	getMyMoodHistory,
	getMyPatientAssessmentHistory,
	getMyPatientProfile,
	getMyTherapistMatches,
} from '../services/patient.service';
import { sendSuccess } from '../utils/response';

const cleanFeedbackText = (value: string | null | undefined): string => String(value || '').replace(/\s+/g, ' ').trim();

const getProviderDisplayName = (provider?: {
	firstName?: string | null;
	lastName?: string | null;
	name?: string | null;
} | null): string => {
	const firstName = String(provider?.firstName || '').trim();
	const lastName = String(provider?.lastName || '').trim();
	const fullName = `${firstName} ${lastName}`.trim();
	if (fullName) return fullName;
	const fallback = String(provider?.name || '').trim();
	return fallback || 'Your provider';
};

const getProviderInitials = (providerName: string): string => {
	const parts = providerName.split(/\s+/).filter(Boolean);
	if (parts.length === 0) return 'CT';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const buildTherapistNoteFeedback = (note: {
	plan?: string | null;
	assessment?: string | null;
	objective?: string | null;
	subjective?: string | null;
	assignedExercise?: string | null;
}): string => {
	const plan = cleanFeedbackText(note.plan);
	const assessment = cleanFeedbackText(note.assessment);
	const objective = cleanFeedbackText(note.objective);
	const subjective = cleanFeedbackText(note.subjective);
	const assignedExercise = cleanFeedbackText(note.assignedExercise);

	if (plan) return plan;
	if (assessment) return assessment;
	if (objective) return objective;
	if (assignedExercise) return `Assigned exercise: ${assignedExercise}`;
	return subjective;
};

const mapGoalCategory = (title: string, activityType: string): string => {
	const normalizedTitle = String(title || '').toLowerCase();
	if (normalizedTitle.includes('sleep')) return 'Sleep';
	if (normalizedTitle.includes('mind') || normalizedTitle.includes('meditat') || normalizedTitle.includes('breath')) return 'Mindfulness';
	if (normalizedTitle.includes('nutrition') || normalizedTitle.includes('meal') || normalizedTitle.includes('water') || normalizedTitle.includes('hydrate')) return 'Nutrition';
	if (normalizedTitle.includes('journal')) return 'Journaling';
	if (String(activityType || '').toUpperCase() === 'EXERCISE') return 'Movement';
	return 'Wellness';
};

const mapPatientSessionBadge = (status: string): 'New' | 'In Progress' | 'Completed' => {
	const normalized = String(status || '').toUpperCase();
	if (normalized === 'COMPLETED') return 'Completed';
	if (normalized === 'IN_PROGRESS') return 'In Progress';
	return 'New';
};

const getCurrentTreatmentWeek = (startDate: Date): number => {
	const millisPerWeek = 7 * 24 * 60 * 60 * 1000;
	const now = Date.now();
	const diff = Math.max(0, now - startDate.getTime());
	return Math.floor(diff / millisPerWeek) + 1;
};

const isExerciseActivityType = (activityType: string): boolean => {
	const normalized = String(activityType || '').toUpperCase();
	return ['EXERCISE', 'AUDIO_THERAPY', 'CLINICAL_ASSESSMENT', 'READING_MATERIAL'].includes(normalized);
};

const getAuthUserId = (req: Request): string => {
	const userId = req.auth?.userId;

	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	return userId;
};

export const createPatientProfileController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	if (!req.validatedPatientProfile) {
		throw new AppError('Invalid patient profile payload', 400);
	}

	const profile = await createPatientProfile(userId, req.validatedPatientProfile);

	sendSuccess(res, profile, 'Patient profile created', 201);
};

export const getMyPatientProfileController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const profile = await getMyPatientProfile(userId);

	sendSuccess(res, profile, 'Patient profile fetched');
};

export const createPatientAssessmentController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	if (!req.validatedPatientAssessment) {
		throw new AppError('Invalid assessment payload', 400);
	}

	const assessment = await createPatientAssessment(userId, req.validatedPatientAssessment);

	sendSuccess(res, assessment, 'Assessment submitted', 201);
};

export const getMyPatientAssessmentHistoryController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	if (!req.validatedPatientAssessmentHistoryQuery) {
		throw new AppError('Invalid assessment history query', 400);
	}

	const result = await getMyPatientAssessmentHistory(userId, req.validatedPatientAssessmentHistoryQuery);

	sendSuccess(res, result, 'Assessment history fetched');
};

export const getMyMoodHistoryController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const query = req.validatedPatientMoodHistoryQuery ?? {};

	const moodHistory = await getMyMoodHistory(userId, query);

	sendSuccess(res, moodHistory, 'Mood history fetched');
};

export const getMyTherapistMatchesController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	if (!req.validatedTherapistMatchQuery) {
		throw new AppError('Invalid therapist match query', 400);
	}

	const matches = await getMyTherapistMatches(userId, req.validatedTherapistMatchQuery);

	sendSuccess(res, matches, 'Therapist matches fetched');
};

export const getMyTherapyPlanController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const weekQueryRaw = req.query.week;
	const weekQuery = weekQueryRaw !== undefined ? Number(weekQueryRaw) : undefined;

	if (weekQueryRaw !== undefined && (!Number.isInteger(weekQuery) || Number(weekQuery) <= 0)) {
		throw new AppError('week must be a positive integer', 422);
	}

	const patientProfile = await prisma.patientProfile.findUnique({
		where: { userId },
		select: { id: true },
	});

	if (!patientProfile) {
		throw new AppError('Patient profile not found', 404);
	}

	const activePlan = await prisma.therapyPlan.findFirst({
		where: {
			patientId: patientProfile.id,
			status: 'ACTIVE',
		},
		orderBy: { updatedAt: 'desc' },
		select: {
			id: true,
			startDate: true,
			endDate: true,
		},
	});

	const currentWeek = activePlan?.startDate ? getCurrentTreatmentWeek(activePlan.startDate) : 1;
	const selectedWeek = weekQuery ?? currentWeek;
	const planFilter = activePlan
		? { id: activePlan.id }
		: {
				patientId: patientProfile.id,
				status: 'ACTIVE' as const,
		  };

	try {
		const [goalActivities, cbtSessions, therapistNotes, careTeamAssignment] = await Promise.all([
		prisma.therapyPlanActivity.findMany({
			where: {
				plan: {
					...planFilter,
				},
				weekNumber: selectedWeek,
				isPublished: true,
			},
			orderBy: [
				{ orderIndex: 'asc' },
				{ createdAt: 'asc' },
			],
			select: {
				id: true,
				title: true,
				activityType: true,
				status: true,
				createdAt: true,
				completedAt: true,
				category: true,
				weekNumber: true,
			},
		}),
		prisma.patientSession.findMany({
			where: { patientId: userId },
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
			},
		}),
		prisma.therapistSessionNote.findMany({
			where: {
				patientId: patientProfile.id,
				status: 'signed',
			},
			orderBy: { updatedAt: 'desc' },
			take: 6,
			select: {
				id: true,
				subjective: true,
				objective: true,
				assessment: true,
				plan: true,
				assignedExercise: true,
				updatedAt: true,
				therapist: {
					select: {
						firstName: true,
						lastName: true,
						name: true,
					},
				},
			},
		}),
		prisma.careTeamAssignment.findFirst({
			where: {
				patientId: userId,
				status: 'ACTIVE',
			},
			orderBy: { assignedAt: 'desc' },
			select: {
				provider: {
					select: {
						firstName: true,
						lastName: true,
						name: true,
					},
				},
			},
		}),
	]);

	const fallbackProviderName = getProviderDisplayName(careTeamAssignment?.provider);
	const fallbackProviderInitials = getProviderInitials(fallbackProviderName);
	const providerAssignedGoals = goalActivities.filter((activity) => !isExerciseActivityType(String(activity.activityType)));
	const providerAssignedExercises = goalActivities.filter((activity) => isExerciseActivityType(String(activity.activityType)));

	const goals = providerAssignedGoals.map((goal) => ({
		id: goal.id,
		title: goal.title,
		category: String(goal.category || mapGoalCategory(goal.title, String(goal.activityType))),
		todayCheckInDone: String(goal.status || '').toUpperCase() === 'COMPLETED',
		startDate: goal.createdAt.toISOString(),
		weekNumber: goal.weekNumber,
	}));

	const cbtExercises = providerAssignedExercises.map((activity) => ({
		id: activity.id,
		sessionId: '',
		type: String(activity.activityType || 'CBT Exercise'),
		title: activity.title,
		status: mapPatientSessionBadge(String(activity.status)),
		completed: String(activity.status || '').toUpperCase() === 'COMPLETED',
		assignedAt: activity.createdAt.toISOString(),
		completedAt: activity.completedAt ? activity.completedAt.toISOString() : null,
		weekNumber: activity.weekNumber,
	}));

	const recentFeedback = [
		...therapistNotes
			.map((note) => {
				const feedback = buildTherapistNoteFeedback(note);
				if (!feedback) return null;

				const providerName = getProviderDisplayName(note.therapist);
				return {
					id: `note-${note.id}`,
					feedback,
					providerName,
					providerInitials: getProviderInitials(providerName),
					source: 'session-note' as const,
					createdAt: note.updatedAt.toISOString(),
				};
			})
			.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
		...cbtSessions
			.filter((session) => String(session.status || '').toUpperCase() === 'COMPLETED' && cleanFeedbackText(session.sessionNotes))
			.map((session) => ({
				id: `cbt-${session.id}`,
				feedback: cleanFeedbackText(session.sessionNotes),
				providerName: fallbackProviderName,
				providerInitials: fallbackProviderInitials,
				source: 'cbt-review' as const,
				createdAt: (session.completedAt || session.createdAt).toISOString(),
			})),
	]
		.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
		.slice(0, 3);

	const dailyTasks = [
		...goals.map((goal) => ({
			id: goal.id,
			kind: 'goal' as const,
			title: goal.title,
			category: goal.category,
			completed: goal.todayCheckInDone,
			weekNumber: goal.weekNumber,
		})),
		...cbtExercises.map((exercise) => ({
			id: exercise.id,
			kind: 'cbt' as const,
			title: exercise.title,
			type: exercise.type,
			completed: exercise.completed,
			status: exercise.status,
			weekNumber: exercise.weekNumber,
		})),
	];

	const maxAssignedWeek = goalActivities.reduce((maxWeek, activity) => Math.max(maxWeek, Number(activity.weekNumber || 1)), 1);
	const totalWeeks = Math.max(maxAssignedWeek, currentWeek);

	sendSuccess(
		res,
		{
			dailyTasks,
			goals,
			cbtExercises,
			recentFeedback,
			weekContext: {
				selectedWeek,
				currentWeek,
				totalWeeks,
			},
		},
		'Therapy plan fetched',
	);
	} catch (error) {
		console.error('Error in getMyTherapyPlanController:', error);
		throw error;
	}
};

