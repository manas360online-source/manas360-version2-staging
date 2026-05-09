import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	assignProviderQuestionToPatient,
	createProviderExtraQuestion,
	listAssignedQuestionsForPatient,
	listProviderExtraQuestions,
	listProviderQuestionAssignments,
	submitProviderAssignedAnswer,
} from '../services/free-screening-provider.service';

const authUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) throw new AppError('Authentication required', 401);
	return userId;
};

const providerQuestionId = (req: Request): string => {
	const value = String(req.params.questionId || '').trim();
	if (!value) throw new AppError('questionId is required', 422);
	return value;
};

export const listProviderExtraQuestionsController = async (req: Request, res: Response): Promise<void> => {
	const data = await listProviderExtraQuestions(authUserId(req));
	sendSuccess(res, data, 'Provider extra questions fetched');
};

export const createProviderExtraQuestionController = async (req: Request, res: Response): Promise<void> => {
	const data = await createProviderExtraQuestion(authUserId(req), req.body || {});
	sendSuccess(res, data, 'Provider extra question created', 201);
};

export const assignProviderQuestionController = async (req: Request, res: Response): Promise<void> => {
	const data = await assignProviderQuestionToPatient(authUserId(req), providerQuestionId(req), {
		patientUserId: String(req.body?.patientUserId || '').trim(),
		expiresAt: req.body?.expiresAt ? String(req.body.expiresAt) : undefined,
	});
	sendSuccess(res, data, 'Question assigned to patient', 201);
};

export const listProviderQuestionAssignmentsController = async (req: Request, res: Response): Promise<void> => {
	const data = await listProviderQuestionAssignments(authUserId(req));
	sendSuccess(res, data, 'Provider question assignments fetched');
};

export const listAssignedQuestionsForPatientController = async (req: Request, res: Response): Promise<void> => {
	const data = await listAssignedQuestionsForPatient(authUserId(req));
	sendSuccess(res, data, 'Assigned provider questions fetched');
};

export const submitProviderAssignedAnswerController = async (req: Request, res: Response): Promise<void> => {
	const assignmentId = String(req.params.assignmentId || '').trim();
	if (!assignmentId) throw new AppError('assignmentId is required', 422);
	const data = await submitProviderAssignedAnswer(authUserId(req), assignmentId, {
		selectedOptionIndex: Number(req.body?.selectedOptionIndex),
		notes: req.body?.notes,
	});
	sendSuccess(res, data, 'Answer submitted', 201);
};
