import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { getLandingMetrics } from '../services/landing.service';

export const getLandingMetricsController = async (_req: Request, res: Response): Promise<void> => {
	const metrics = await getLandingMetrics();
	sendSuccess(res, metrics, 'Landing metrics fetched');
};
