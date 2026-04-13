import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { recordQrConversion } from '../services/qr-conversion.service';
import {
	getMyFreeScreeningHistory,
	startFreeScreeningAttempt,
	submitFreeScreeningAttempt,
} from '../services/free-screening.service';

const trackAssessmentCompletion = async (req: Request, payload: {
	attemptId: string;
	templateKey: string;
	totalScore: number;
	severityLevel: string;
}) => {
	const qrCode = String(req.query['qr'] || '').trim();
	const sid = String(req.query['sid'] || '').trim();
	if (!qrCode) return;

	await recordQrConversion({
		qrCode,
		sessionId: sid,
		conversionType: 'assessment_completed',
		attributedRevenue: 0,
		conversionData: {
			attemptId: payload.attemptId,
			templateKey: payload.templateKey,
			totalScore: payload.totalScore,
			severityLevel: payload.severityLevel,
		},
	}).catch(() => undefined);
};

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
	await trackAssessmentCompletion(req, data);
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
	await trackAssessmentCompletion(req, data);
	sendSuccess(res, data, 'Free screening submitted');
};

export const getMyFreeScreeningHistoryController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMyFreeScreeningHistory(authUserId(req));
	sendSuccess(res, data, 'Free screening history fetched');
};
