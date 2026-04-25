import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	getJourneyRecommendation,
	selectJourneyPathway,
	submitClinicalJourney,
	submitQuickScreeningJourney,
} from '../services/patient-journey.service';

const authUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) throw new AppError('Authentication required', 401);
	return userId;
};

export const submitQuickScreeningController = async (req: Request, res: Response): Promise<void> => {
	const answers = Array.isArray(req.body?.answers) ? req.body.answers.map((value: any) => Number(value || 0)) : [];
	const data = await submitQuickScreeningJourney(authUserId(req), answers);
	sendSuccess(res, data, 'Quick screening submitted', 201);
};

export const submitClinicalJourneyController = async (req: Request, res: Response): Promise<void> => {
	const type = String(req.body?.type || '').toUpperCase();
	if (type !== 'PHQ-9' && type !== 'GAD-7') {
		throw new AppError('type must be PHQ-9 or GAD-7', 422);
	}
	const data = await submitClinicalJourney(authUserId(req), {
		type,
		score: req.body?.score !== undefined ? Number(req.body.score) : undefined,
		answers: Array.isArray(req.body?.answers) ? req.body.answers.map((value: any) => Number(value || 0)) : undefined,
	});
	sendSuccess(res, data, 'Clinical assessment submitted', 201);
};

export const getJourneyRecommendationControllerV2 = async (req: Request, res: Response): Promise<void> => {
	const data = await getJourneyRecommendation(authUserId(req));
	sendSuccess(res, data, 'Journey recommendation fetched');
};

export const selectJourneyPathwayController = async (req: Request, res: Response): Promise<void> => {
	const pathway = String(req.body?.pathway || '').trim() as 'stepped-care' | 'direct-provider' | 'urgent-care';
	if (!['stepped-care', 'direct-provider', 'urgent-care'].includes(pathway)) {
		throw new AppError('pathway must be stepped-care, direct-provider, or urgent-care', 422);
	}

	const data = await selectJourneyPathway(authUserId(req), {
		pathway,
		reason: req.body?.reason ? String(req.body.reason) : undefined,
		metadata: typeof req.body?.metadata === 'object' && req.body.metadata ? req.body.metadata : undefined,
	});

	sendSuccess(res, data, 'Journey pathway selected');
};
