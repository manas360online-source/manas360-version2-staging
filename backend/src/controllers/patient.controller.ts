import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { s3Client } from '../services/s3.service';
import { PutObjectCommand, PutObjectCommandInput, ServerSideEncryption } from '@aws-sdk/client-s3';
import {
	createPatientProfile,
	getMyPatientProfile,
	createPatientAssessment,
	getMyPatientAssessmentHistory,
	getMyMoodHistory,
} from '../services/patient.service';
import { env } from '../config/env';

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

const getCurrentTreatmentDay = (startDate: Date): number => {
	const millisPerDay = 24 * 60 * 60 * 1000;
	const now = Date.now();
	const diff = Math.max(0, now - startDate.getTime());
	return Math.floor(diff / millisPerDay) + 1;
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

export const getMyTherapyPlanController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const dayQueryRaw = req.query.day;
	const dayQuery = dayQueryRaw !== undefined ? Number(dayQueryRaw) : undefined;

	if (dayQueryRaw !== undefined && (!Number.isInteger(dayQuery) || Number(dayQuery) <= 0)) {
		throw new AppError('day must be a positive integer', 422);
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
	}).catch(() => null);

	const currentDay = activePlan?.startDate ? getCurrentTreatmentDay(activePlan.startDate) : 1;
	const selectedDay = dayQuery ?? currentDay;
	const planFilter = activePlan
		? { id: activePlan.id }
		: {
				patientId: patientProfile.id,
				status: 'ACTIVE' as const,
		  };

	try {
		const [goalActivities, therapistNotes] = await Promise.all([
		prisma.therapyPlanActivity.findMany({
			where: {
				plan: {
					...planFilter,
				},
				dayNumber: selectedDay,
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
					dayNumber: true,
			},
		}).catch(() => []),
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
		}).catch(() => []),
	]);

	const providerAssignedGoals = goalActivities.filter((activity) => !isExerciseActivityType(String(activity.activityType)));
	const providerAssignedExercises = goalActivities.filter((activity) => isExerciseActivityType(String(activity.activityType)));

	const goals = providerAssignedGoals.map((goal) => ({
		id: goal.id,
		title: goal.title,
		category: String(goal.category || mapGoalCategory(goal.title, String(goal.activityType))),
		todayCheckInDone: String(goal.status || '').toUpperCase() === 'COMPLETED',
		startDate: goal.createdAt.toISOString(),
		dayNumber: goal.dayNumber,
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
		dayNumber: activity.dayNumber,
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
			dayNumber: goal.dayNumber,
		})),
		...cbtExercises.map((exercise) => ({
			id: exercise.id,
			kind: 'cbt' as const,
			title: exercise.title,
			type: exercise.type,
			completed: exercise.completed,
			status: exercise.status,
			dayNumber: exercise.dayNumber,
		})),
	];

	const maxAssignedDay = goalActivities.reduce((maxDay, activity) => Math.max(maxDay, Number(activity.dayNumber || 1)), 1);
	const totalDays = Math.max(maxAssignedDay, currentDay);

	sendSuccess(
		res,
		{
			dailyTasks,
			goals,
			cbtExercises,
			recentFeedback,
			dayContext: {
				selectedDay,
				currentDay,
				totalDays,
			},
		},
		'Therapy plan fetched',
	);
	} catch (error) {
		console.error('Error in getMyTherapyPlanController:', error);
		throw error;
	}
};

export const addDailyCheckInController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	if (!req.validatedDailyCheckIn) {
		throw new AppError('Invalid daily check-in payload', 400);
	}

	const checkInData = req.validatedDailyCheckIn;

	// Create the daily check-in record
	const dailyCheckIn = await prisma.dailyCheckIn.create({
		data: {
			patientId: userId,
			date: new Date(checkInData.date),
			type: checkInData.type,
			mood: checkInData.mood,
			energy: checkInData.energy,
			sleep: checkInData.sleep,
			context: checkInData.context || [],
			intention: checkInData.intention,
			reflectionGood: checkInData.reflectionGood,
			reflectionBad: checkInData.reflectionBad,
			stressLevel: checkInData.stressLevel,
			gratitude: checkInData.gratitude,
		},
	});

	// Mark today's mood check-in task complete on any active therapy plan (best-effort)
	try {
		const patientProfile = await prisma.patientProfile.findUnique({ where: { userId } });
		if (patientProfile && patientProfile.id) {
			const task = await prisma.therapyPlanActivity.findFirst({
				where: {
					activityType: 'MOOD_CHECKIN',
					status: 'PENDING',
					plan: { patientId: patientProfile.id, status: 'ACTIVE' },
				},
				select: { id: true },
			}).catch(() => null);

			if (task?.id) {
				await prisma.therapyPlanActivity.update({ where: { id: task.id }, data: { status: 'COMPLETED', completedAt: new Date() } }).catch(() => null);
			}
		}
	} catch (err) {
		// swallow any errors here to avoid failing the check-in save; this is non-critical
		console.warn('Failed to mark mood check-in task complete:', err);
	}

	sendSuccess(res, dailyCheckIn, 'Daily check-in recorded', 201);
};

// ── Get my documents ─────────────────────────────────────
export const getMyDocumentsController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	try {
	const [notes, prescriptions, assessments, phqAssessments, gadAssessments] = await Promise.all([
		prisma.therapistSessionNote.findMany({
			where: {
				session: {
					patientProfile: { userId },
				},
			},
			orderBy: { createdAt: 'desc' },
			take: 20,
			select: {
				id: true,
				sessionType: true,
				status: true,
				createdAt: true,
				session: {
					select: {
						dateTime: true,
						therapistProfile: {
							select: { firstName: true, lastName: true },
						},
					},
				},
			},
		}),
		prisma.prescription.findMany({
			where: { patientId: userId },
			orderBy: { prescribedDate: 'desc' },
			take: 20,
			select: {
				id: true,
				drugName: true,
				dosage: true,
				status: true,
				prescribedDate: true,
				provider: {
					select: {
						firstName: true,
						lastName: true,
					},
				},
			},
		}),
		prisma.patientAssessment.findMany({
			where: {
				patient: { userId },
			},
			orderBy: { createdAt: 'desc' },
			take: 20,
			select: {
				id: true,
				type: true,
				totalScore: true,
				createdAt: true,
			},
		}),
		prisma.pHQ9Assessment.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			take: 20,
			select: {
				id: true,
				totalScore: true,
				createdAt: true,
			},
		}).catch(() => []),
		prisma.gAD7Assessment.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			take: 20,
			select: {
				id: true,
				totalScore: true,
				createdAt: true,
			},
		}).catch(() => []),
	]);

	type DocItem = { id: string; title: string; date: string; category: 'official' | 'session' | 'assessment' };

	const documents: DocItem[] = [
		...notes.map((n) => {
			const tp = n.session?.therapistProfile as any;
			const providerName = tp
				? tp.user
					? `${tp.user.firstName || ''} ${tp.user.lastName || ''}`.trim()
					: `${tp.firstName || ''} ${tp.lastName || ''}`.trim()
				: 'Provider';
			const dateObj = n.session?.dateTime || n.createdAt;
			return {
				id: n.id,
				title: `Session Notes — ${n.sessionType || 'Consultation'} (${providerName})`,
				date: dateObj ? new Date(dateObj).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
				category: 'session' as const,
			};
		}),
		...prescriptions.map((p) => {
			const prov = p.provider as any;
			const providerName = prov
				? `${prov.firstName || ''} ${prov.lastName || ''}`.trim()
				: 'Provider';
			return {
				id: p.id,
				title: `Prescription — ${p.drugName} ${p.dosage} (${providerName})`,
				date: p.prescribedDate ? new Date(p.prescribedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
				category: 'official' as const,
			};
		}),
		...assessments.map((a) => ({
			id: a.id,
			title: `${a.type} Assessment Result — Score ${a.totalScore}`,
			date: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
			category: 'assessment' as const,
		})),
		...phqAssessments.map((a) => ({
			id: a.id,
			title: `PHQ-9 Assessment Result — Score ${a.totalScore}`,
			date: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
			category: 'assessment' as const,
		})),
		...gadAssessments.map((a) => ({
			id: a.id,
			title: `GAD-7 Assessment Result — Score ${a.totalScore}`,
			date: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
			category: 'assessment' as const,
		})),
	];

	documents.sort((a, b) => b.date.localeCompare(a.date));

	sendSuccess(res, documents, 'Patient documents fetched');
	} catch (error) {
		throw error;
	}
};

// ── Get my prescriptions ─────────────────────────────────────
export const getMyPrescriptionsController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	const prescriptions = await prisma.prescription.findMany({
		where: { patientId: userId },
		orderBy: { prescribedDate: 'desc' },
		include: {
			provider: {
				select: {
					firstName: true,
					lastName: true,
				},
			},
		},
	});

	const responseData = prescriptions.map((item) => ({
		id: item.id,
		drugName: item.drugName,
		dosage: item.dosage,
		instructions: item.instructions,
		prescribedDate: item.prescribedDate.toISOString(),
		refillsRemaining: item.refillsRemaining,
		status: item.status,
		warnings: item.warnings,
		providerName: item.provider
			? `${item.provider.firstName || ''} ${item.provider.lastName || ''}`.trim()
			: 'Provider',
	}));

	sendSuccess(res, responseData, 'Patient prescriptions fetched');
};

export const uploadPatientDocument = async (req: Request, res: Response): Promise<void> => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError('Authentication required', 401);

  // Accepts: file (Buffer), title (string), category (string: 'lab-result' | 'prescription'), optional notes
  const { title, category = 'lab-result', notes } = req.body;
  const file = req.file || req.body.file; // Support multipart or base64
  if (!file) throw new AppError('No file uploaded', 400);

  // Find patient profile
  const profile = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new AppError('Patient profile not found', 404);

  // S3 upload
  const fileName = `lab-${profile.id}-${Date.now()}.pdf`;
  const objectKey = `patient-documents/${userId}/${fileName}`;
	// Build PutObject input with correct AWS SDK types
	const serverSideEnc: ServerSideEncryption | undefined = env.awsS3DisableServerSideEncryption ? undefined : ('AES256' as ServerSideEncryption);
	const putInput: PutObjectCommandInput = {
		Bucket: env.awsS3Bucket,
		Key: objectKey,
		Body: file,
		ContentType: 'application/pdf',
		...(serverSideEnc ? { ServerSideEncryption: serverSideEnc } : {}),
	};

	await s3Client.send(new PutObjectCommand(putInput));

  // Create DB row
  const doc = await prisma.patientDocument.create({
    data: {
      patientId: userId,
      title: title || 'Lab Result',
      category,
      source: 'lab-upload',
      s3ObjectKey: objectKey,
      filePath: undefined,
    },
  });

	// Notify provider (emit socket event)
	try {
		// Find assigned provider(s) for this patient
		const assignments = await prisma.careTeamAssignment.findMany({
			where: { patientId: profile.id },
			select: { providerId: true },
		});
		for (const assignment of assignments) {
			// Emit to provider inbox room when notifier is available.
			const gpsRoutesModule = (await import('../routes/gps.routes')) as Record<string, unknown>;
			const notifyProviderLabUpload = gpsRoutesModule.notifyProviderLabUpload as
				| ((providerId: string, payload: Record<string, unknown>) => void)
				| undefined;
			notifyProviderLabUpload?.(assignment.providerId, {
				documentId: doc.id,
				patientId: userId,
				title: doc.title,
				category: doc.category,
				s3ObjectKey: doc.s3ObjectKey,
				uploadedAt: doc.createdAt,
			});
		}
	} catch (e) {
		console.warn('Provider notify failed', e);
	}

  sendSuccess(res, doc, 'Document uploaded', 201);
};

// ── Get presigned download URL for a patient document ─────────────────
export const getPatientDocumentDownload = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const docId = String(req.params.id);

	const doc = await prisma.patientDocument.findUnique({ where: { id: docId } });
	if (!doc) throw new AppError('Document not found', 404);
	if (doc.patientId !== userId) throw new AppError('Not authorized', 403);

	if (!doc.s3ObjectKey) throw new AppError('No file available for download', 404);

	try {
		const { GetObjectCommand } = await import('@aws-sdk/client-s3');
		const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
		const cmd = new GetObjectCommand({ Bucket: env.awsS3Bucket, Key: doc.s3ObjectKey });
		const url = await getSignedUrl(s3Client, cmd, { expiresIn: 60 * 5 });
		sendSuccess(res, { url }, 'Presigned url generated');
	} catch (e) {
		throw new AppError('Failed to generate download url', 500);
	}
};
