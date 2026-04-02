"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPatientDocumentDownload = exports.uploadPatientDocument = exports.getMyPrescriptionsController = exports.getMyDocumentsController = exports.addDailyCheckInController = exports.getMyTherapyPlanController = exports.getMyTherapistMatchesController = exports.getMyMoodHistoryController = exports.getMyPatientAssessmentHistoryController = exports.createPatientAssessmentController = exports.getMyPatientProfileController = exports.createPatientProfileController = void 0;
const db_1 = require("../config/db");
const error_middleware_1 = require("../middleware/error.middleware");
const response_1 = require("../utils/response");
const s3_service_1 = require("../services/s3.service");
const client_s3_1 = require("@aws-sdk/client-s3");
const patient_service_1 = require("../services/patient.service");
const env_1 = require("../config/env");
const cleanFeedbackText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const getProviderDisplayName = (provider) => {
    const firstName = String(provider?.firstName || '').trim();
    const lastName = String(provider?.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName)
        return fullName;
    const fallback = String(provider?.name || '').trim();
    return fallback || 'Your provider';
};
const getProviderInitials = (providerName) => {
    const parts = providerName.split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return 'CT';
    if (parts.length === 1)
        return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};
const buildTherapistNoteFeedback = (note) => {
    const plan = cleanFeedbackText(note.plan);
    const assessment = cleanFeedbackText(note.assessment);
    const objective = cleanFeedbackText(note.objective);
    const subjective = cleanFeedbackText(note.subjective);
    const assignedExercise = cleanFeedbackText(note.assignedExercise);
    if (plan)
        return plan;
    if (assessment)
        return assessment;
    if (objective)
        return objective;
    if (assignedExercise)
        return `Assigned exercise: ${assignedExercise}`;
    return subjective;
};
const mapGoalCategory = (title, activityType) => {
    const normalizedTitle = String(title || '').toLowerCase();
    if (normalizedTitle.includes('sleep'))
        return 'Sleep';
    if (normalizedTitle.includes('mind') || normalizedTitle.includes('meditat') || normalizedTitle.includes('breath'))
        return 'Mindfulness';
    if (normalizedTitle.includes('nutrition') || normalizedTitle.includes('meal') || normalizedTitle.includes('water') || normalizedTitle.includes('hydrate'))
        return 'Nutrition';
    if (normalizedTitle.includes('journal'))
        return 'Journaling';
    if (String(activityType || '').toUpperCase() === 'EXERCISE')
        return 'Movement';
    return 'Wellness';
};
const mapPatientSessionBadge = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'COMPLETED')
        return 'Completed';
    if (normalized === 'IN_PROGRESS')
        return 'In Progress';
    return 'New';
};
const getCurrentTreatmentDay = (startDate) => {
    const millisPerDay = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const diff = Math.max(0, now - startDate.getTime());
    return Math.floor(diff / millisPerDay) + 1;
};
const isExerciseActivityType = (activityType) => {
    const normalized = String(activityType || '').toUpperCase();
    return ['EXERCISE', 'AUDIO_THERAPY', 'CLINICAL_ASSESSMENT', 'READING_MATERIAL'].includes(normalized);
};
const getAuthUserId = (req) => {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    return userId;
};
const createPatientProfileController = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!req.validatedPatientProfile) {
        throw new error_middleware_1.AppError('Invalid patient profile payload', 400);
    }
    const profile = await (0, patient_service_1.createPatientProfile)(userId, req.validatedPatientProfile);
    (0, response_1.sendSuccess)(res, profile, 'Patient profile created', 201);
};
exports.createPatientProfileController = createPatientProfileController;
const getMyPatientProfileController = async (req, res) => {
    const userId = getAuthUserId(req);
    const profile = await (0, patient_service_1.getMyPatientProfile)(userId);
    (0, response_1.sendSuccess)(res, profile, 'Patient profile fetched');
};
exports.getMyPatientProfileController = getMyPatientProfileController;
const createPatientAssessmentController = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!req.validatedPatientAssessment) {
        throw new error_middleware_1.AppError('Invalid assessment payload', 400);
    }
    const assessment = await (0, patient_service_1.createPatientAssessment)(userId, req.validatedPatientAssessment);
    (0, response_1.sendSuccess)(res, assessment, 'Assessment submitted', 201);
};
exports.createPatientAssessmentController = createPatientAssessmentController;
const getMyPatientAssessmentHistoryController = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!req.validatedPatientAssessmentHistoryQuery) {
        throw new error_middleware_1.AppError('Invalid assessment history query', 400);
    }
    const result = await (0, patient_service_1.getMyPatientAssessmentHistory)(userId, req.validatedPatientAssessmentHistoryQuery);
    (0, response_1.sendSuccess)(res, result, 'Assessment history fetched');
};
exports.getMyPatientAssessmentHistoryController = getMyPatientAssessmentHistoryController;
const getMyMoodHistoryController = async (req, res) => {
    const userId = getAuthUserId(req);
    const query = req.validatedPatientMoodHistoryQuery ?? {};
    const moodHistory = await (0, patient_service_1.getMyMoodHistory)(userId, query);
    (0, response_1.sendSuccess)(res, moodHistory, 'Mood history fetched');
};
exports.getMyMoodHistoryController = getMyMoodHistoryController;
const getMyTherapistMatchesController = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!req.validatedTherapistMatchQuery) {
        throw new error_middleware_1.AppError('Invalid therapist match query', 400);
    }
    const matches = await (0, patient_service_1.getMyTherapistMatches)(userId, req.validatedTherapistMatchQuery);
    (0, response_1.sendSuccess)(res, matches, 'Therapist matches fetched');
};
exports.getMyTherapistMatchesController = getMyTherapistMatchesController;
const getMyTherapyPlanController = async (req, res) => {
    const userId = getAuthUserId(req);
    const dayQueryRaw = req.query.day;
    const dayQuery = dayQueryRaw !== undefined ? Number(dayQueryRaw) : undefined;
    if (dayQueryRaw !== undefined && (!Number.isInteger(dayQuery) || Number(dayQuery) <= 0)) {
        throw new error_middleware_1.AppError('day must be a positive integer', 422);
    }
    const patientProfile = await db_1.prisma.patientProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!patientProfile) {
        throw new error_middleware_1.AppError('Patient profile not found', 404);
    }
    const activePlan = await db_1.prisma.therapyPlan.findFirst({
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
            status: 'ACTIVE',
        };
    try {
        const [goalActivities, cbtSessions, therapistNotes, careTeamAssignment] = await Promise.all([
            db_1.prisma.therapyPlanActivity.findMany({
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
            // patientSession model was removed from schema; skip to avoid runtime TypeError
            Promise.resolve([]),
            db_1.prisma.therapistSessionNote.findMany({
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
            db_1.prisma.careTeamAssignment.findFirst({
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
            }).catch(() => null),
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
                if (!feedback)
                    return null;
                const providerName = getProviderDisplayName(note.therapist);
                return {
                    id: `note-${note.id}`,
                    feedback,
                    providerName,
                    providerInitials: getProviderInitials(providerName),
                    source: 'session-note',
                    createdAt: note.updatedAt.toISOString(),
                };
            })
                .filter((entry) => Boolean(entry)),
            ...cbtSessions
                .filter((session) => String(session.status || '').toUpperCase() === 'COMPLETED' && cleanFeedbackText(session.sessionNotes))
                .map((session) => ({
                id: `cbt-${session.id}`,
                feedback: cleanFeedbackText(session.sessionNotes),
                providerName: fallbackProviderName,
                providerInitials: fallbackProviderInitials,
                source: 'cbt-review',
                createdAt: (session.completedAt || session.createdAt).toISOString(),
            })),
        ]
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
            .slice(0, 3);
        const dailyTasks = [
            ...goals.map((goal) => ({
                id: goal.id,
                kind: 'goal',
                title: goal.title,
                category: goal.category,
                completed: goal.todayCheckInDone,
                dayNumber: goal.dayNumber,
            })),
            ...cbtExercises.map((exercise) => ({
                id: exercise.id,
                kind: 'cbt',
                title: exercise.title,
                type: exercise.type,
                completed: exercise.completed,
                status: exercise.status,
                dayNumber: exercise.dayNumber,
            })),
        ];
        const maxAssignedDay = goalActivities.reduce((maxDay, activity) => Math.max(maxDay, Number(activity.dayNumber || 1)), 1);
        const totalDays = Math.max(maxAssignedDay, currentDay);
        (0, response_1.sendSuccess)(res, {
            dailyTasks,
            goals,
            cbtExercises,
            recentFeedback,
            dayContext: {
                selectedDay,
                currentDay,
                totalDays,
            },
        }, 'Therapy plan fetched');
    }
    catch (error) {
        console.error('Error in getMyTherapyPlanController:', error);
        throw error;
    }
};
exports.getMyTherapyPlanController = getMyTherapyPlanController;
const addDailyCheckInController = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!req.validatedDailyCheckIn) {
        throw new error_middleware_1.AppError('Invalid daily check-in payload', 400);
    }
    const checkInData = req.validatedDailyCheckIn;
    // Create the daily check-in record
    const dailyCheckIn = await db_1.prisma.dailyCheckIn.create({
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
        const patientProfile = await db_1.prisma.patientProfile.findUnique({ where: { userId } });
        if (patientProfile && patientProfile.id) {
            const task = await db_1.prisma.therapyPlanActivity.findFirst({
                where: {
                    activityType: 'MOOD_CHECKIN',
                    status: 'PENDING',
                    plan: { patientId: patientProfile.id, status: 'ACTIVE' },
                },
                select: { id: true },
            }).catch(() => null);
            if (task?.id) {
                await db_1.prisma.therapyPlanActivity.update({ where: { id: task.id }, data: { status: 'COMPLETED', completedAt: new Date() } }).catch(() => null);
            }
        }
    }
    catch (err) {
        // swallow any errors here to avoid failing the check-in save; this is non-critical
        console.warn('Failed to mark mood check-in task complete:', err);
    }
    (0, response_1.sendSuccess)(res, dailyCheckIn, 'Daily check-in recorded', 201);
};
exports.addDailyCheckInController = addDailyCheckInController;
// ── Get my documents ─────────────────────────────────────
const getMyDocumentsController = async (req, res) => {
    const userId = getAuthUserId(req);
    try {
        const [notes, prescriptions, assessments, phqAssessments, gadAssessments] = await Promise.all([
            db_1.prisma.therapistSessionNote.findMany({
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
            db_1.prisma.prescription.findMany({
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
            db_1.prisma.patientAssessment.findMany({
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
            db_1.prisma.pHQ9Assessment.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: {
                    id: true,
                    totalScore: true,
                    createdAt: true,
                },
            }).catch(() => []),
            db_1.prisma.gAD7Assessment.findMany({
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
        const documents = [
            ...notes.map((n) => {
                const tp = n.session?.therapistProfile;
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
                    category: 'session',
                };
            }),
            ...prescriptions.map((p) => {
                const prov = p.provider;
                const providerName = prov
                    ? `${prov.firstName || ''} ${prov.lastName || ''}`.trim()
                    : 'Provider';
                return {
                    id: p.id,
                    title: `Prescription — ${p.drugName} ${p.dosage} (${providerName})`,
                    date: p.prescribedDate ? new Date(p.prescribedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                    category: 'official',
                };
            }),
            ...assessments.map((a) => ({
                id: a.id,
                title: `${a.type} Assessment Result — Score ${a.totalScore}`,
                date: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                category: 'assessment',
            })),
            ...phqAssessments.map((a) => ({
                id: a.id,
                title: `PHQ-9 Assessment Result — Score ${a.totalScore}`,
                date: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                category: 'assessment',
            })),
            ...gadAssessments.map((a) => ({
                id: a.id,
                title: `GAD-7 Assessment Result — Score ${a.totalScore}`,
                date: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                category: 'assessment',
            })),
        ];
        documents.sort((a, b) => b.date.localeCompare(a.date));
        (0, response_1.sendSuccess)(res, documents, 'Patient documents fetched');
    }
    catch (error) {
        throw error;
    }
};
exports.getMyDocumentsController = getMyDocumentsController;
// ── Get my prescriptions ─────────────────────────────────────
const getMyPrescriptionsController = async (req, res) => {
    const userId = getAuthUserId(req);
    const prescriptions = await db_1.prisma.prescription.findMany({
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
    (0, response_1.sendSuccess)(res, responseData, 'Patient prescriptions fetched');
};
exports.getMyPrescriptionsController = getMyPrescriptionsController;
const uploadPatientDocument = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId)
        throw new error_middleware_1.AppError('Authentication required', 401);
    // Accepts: file (Buffer), title (string), category (string: 'lab-result' | 'prescription'), optional notes
    const { title, category = 'lab-result', notes } = req.body;
    const file = req.file || req.body.file; // Support multipart or base64
    if (!file)
        throw new error_middleware_1.AppError('No file uploaded', 400);
    // Find patient profile
    const profile = await db_1.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile)
        throw new error_middleware_1.AppError('Patient profile not found', 404);
    // S3 upload
    const fileName = `lab-${profile.id}-${Date.now()}.pdf`;
    const objectKey = `patient-documents/${userId}/${fileName}`;
    // Build PutObject input with correct AWS SDK types
    const serverSideEnc = env_1.env.awsS3DisableServerSideEncryption ? undefined : 'AES256';
    const putInput = {
        Bucket: env_1.env.awsS3Bucket,
        Key: objectKey,
        Body: file,
        ContentType: 'application/pdf',
        ...(serverSideEnc ? { ServerSideEncryption: serverSideEnc } : {}),
    };
    await s3_service_1.s3Client.send(new client_s3_1.PutObjectCommand(putInput));
    // Create DB row
    const doc = await db_1.prisma.patientDocument.create({
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
        const assignments = await db_1.prisma.careTeamAssignment.findMany({
            where: { patientId: profile.id },
            select: { providerId: true },
        });
        for (const assignment of assignments) {
            // Emit to provider inbox room when notifier is available.
            const gpsRoutesModule = (await import('../routes/gps.routes'));
            const notifyProviderLabUpload = gpsRoutesModule.notifyProviderLabUpload;
            notifyProviderLabUpload?.(assignment.providerId, {
                documentId: doc.id,
                patientId: userId,
                title: doc.title,
                category: doc.category,
                s3ObjectKey: doc.s3ObjectKey,
                uploadedAt: doc.createdAt,
            });
        }
    }
    catch (e) {
        console.warn('Provider notify failed', e);
    }
    (0, response_1.sendSuccess)(res, doc, 'Document uploaded', 201);
};
exports.uploadPatientDocument = uploadPatientDocument;
// ── Get presigned download URL for a patient document ─────────────────
const getPatientDocumentDownload = async (req, res) => {
    const userId = getAuthUserId(req);
    const docId = String(req.params.id);
    const doc = await db_1.prisma.patientDocument.findUnique({ where: { id: docId } });
    if (!doc)
        throw new error_middleware_1.AppError('Document not found', 404);
    if (doc.patientId !== userId)
        throw new error_middleware_1.AppError('Not authorized', 403);
    if (!doc.s3ObjectKey)
        throw new error_middleware_1.AppError('No file available for download', 404);
    try {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const cmd = new GetObjectCommand({ Bucket: env_1.env.awsS3Bucket, Key: doc.s3ObjectKey });
        const url = await getSignedUrl(s3_service_1.s3Client, cmd, { expiresIn: 60 * 5 });
        (0, response_1.sendSuccess)(res, { url }, 'Presigned url generated');
    }
    catch (e) {
        throw new error_middleware_1.AppError('Failed to generate download url', 500);
    }
};
exports.getPatientDocumentDownload = getPatientDocumentDownload;
