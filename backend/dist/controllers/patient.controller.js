"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyTherapyPlanController = exports.getMyTherapistMatchesController = exports.getMyMoodHistoryController = exports.getMyPatientAssessmentHistoryController = exports.createPatientAssessmentController = exports.getMyPatientProfileController = exports.createPatientProfileController = void 0;
const db_1 = require("../config/db");
const error_middleware_1 = require("../middleware/error.middleware");
const patient_service_1 = require("../services/patient.service");
const response_1 = require("../utils/response");
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
    const patientProfile = await db_1.prisma.patientProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!patientProfile) {
        throw new error_middleware_1.AppError('Patient profile not found', 404);
    }
    const [goalActivities, cbtSessions, therapistNotes, careTeamAssignment] = await Promise.all([
        db_1.prisma.therapyPlanActivity.findMany({
            where: {
                plan: {
                    patientId: patientProfile.id,
                    status: 'ACTIVE',
                },
            },
            orderBy: [
                { createdAt: 'desc' },
                { orderIndex: 'asc' },
            ],
            select: {
                id: true,
                title: true,
                activityType: true,
                status: true,
                createdAt: true,
                completedAt: true,
            },
        }),
        db_1.prisma.patientSession.findMany({
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
        }),
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
        }),
    ]);
    const fallbackProviderName = getProviderDisplayName(careTeamAssignment?.provider);
    const fallbackProviderInitials = getProviderInitials(fallbackProviderName);
    const goals = goalActivities.map((goal) => ({
        id: goal.id,
        title: goal.title,
        category: mapGoalCategory(goal.title, String(goal.activityType)),
        todayCheckInDone: String(goal.status || '').toUpperCase() === 'COMPLETED',
        startDate: goal.createdAt.toISOString(),
    }));
    const cbtExercises = cbtSessions.map((session) => ({
        id: session.id,
        sessionId: session.id,
        type: String(session.template?.category || 'CBT Exercise'),
        title: String(session.template?.title || 'CBT Exercise'),
        status: mapPatientSessionBadge(String(session.status)),
        completed: String(session.status || '').toUpperCase() === 'COMPLETED',
        assignedAt: session.createdAt.toISOString(),
        completedAt: session.completedAt ? session.completedAt.toISOString() : null,
        therapistFeedback: cleanFeedbackText(session.sessionNotes),
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
        })),
        ...cbtExercises.map((exercise) => ({
            id: exercise.id,
            kind: 'cbt',
            title: exercise.title,
            type: exercise.type,
            completed: exercise.completed,
            status: exercise.status,
        })),
    ];
    (0, response_1.sendSuccess)(res, { dailyTasks, goals, cbtExercises, recentFeedback }, 'Therapy plan fetched');
};
exports.getMyTherapyPlanController = getMyTherapyPlanController;
