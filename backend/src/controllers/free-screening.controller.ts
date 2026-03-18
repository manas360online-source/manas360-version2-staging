import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	getMyFreeScreeningHistory,
	startFreeScreeningAttempt,
	submitFreeScreeningAttempt,
} from '../services/free-screening.service';

const getAttemptIdParam = (req: Request): string => {
	const attemptId = String(req.params.attemptId || '').trim();
	if (!attemptId) throw new AppError('attemptId is required', 422);
	return attemptId;
};

const normalizeAnswers = (value: unknown): Array<{ questionId: string; optionIndex: number }> => {
	if (!Array.isArray(value)) throw new AppError('answers must be an array', 422);
	return value.map((item: any) => ({
		questionId: String(item?.questionId || '').trim(),
		optionIndex: Number(item?.optionIndex),
	}));
};

const authUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) throw new AppError('Authentication required', 401);
	return userId;
};

export const startFreeScreeningPublicController = async (req: Request, res: Response): Promise<void> => {
	const data = await startFreeScreeningAttempt({
		templateKey: typeof req.body?.templateKey === 'string' ? req.body.templateKey : undefined,
	});
	sendSuccess(res, data, 'Free screening started', 201);
};

export const submitFreeScreeningPublicController = async (req: Request, res: Response): Promise<void> => {
	const data = await submitFreeScreeningAttempt({
		attemptId: getAttemptIdParam(req),
		attemptToken: typeof req.body?.attemptToken === 'string' ? req.body.attemptToken : undefined,
		answers: normalizeAnswers(req.body?.answers),
	});
	sendSuccess(res, data, 'Free screening submitted');
};

export const startFreeScreeningForPatientController = async (req: Request, res: Response): Promise<void> => {
	const data = await startFreeScreeningAttempt({
		patientUserId: authUserId(req),
		templateKey: typeof req.body?.templateKey === 'string' ? req.body.templateKey : undefined,
	});
	sendSuccess(res, data, 'Free screening started', 201);
};

export const submitFreeScreeningForPatientController = async (req: Request, res: Response): Promise<void> => {
	const data = await submitFreeScreeningAttempt({
		attemptId: getAttemptIdParam(req),
		patientUserId: authUserId(req),
		answers: normalizeAnswers(req.body?.answers),
	});
	sendSuccess(res, data, 'Free screening submitted');
};

export const getMyFreeScreeningHistoryController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMyFreeScreeningHistory(authUserId(req));
	sendSuccess(res, data, 'Free screening history fetched');
};
