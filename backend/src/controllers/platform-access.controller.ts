import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	getPlatformAccessStatus,
	initiatePlatformAccessPayment,
} from '../services/platform-access.service';

const authUserId = (req: Request): string => {
	const id = (req as any).auth?.userId;
	if (!id) throw new AppError('Unauthorized', 401);
	return id;
};

/** GET /provider/platform-access */
export const getPlatformAccessController = async (req: Request, res: Response): Promise<void> => {
	const status = await getPlatformAccessStatus(authUserId(req));
	sendSuccess(res, status, 'Platform access status fetched');
};

/** POST /provider/platform-access/initiate */
export const initiatePlatformAccessController = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	const rawCycle = String(req.body.billingCycle || 'monthly').trim().toLowerCase();
	if (rawCycle !== 'monthly' && rawCycle !== 'quarterly') {
		throw new AppError('billingCycle must be monthly or quarterly', 422);
	}
	const data = await initiatePlatformAccessPayment(providerId, rawCycle as 'monthly' | 'quarterly');
	sendSuccess(res, data, 'Platform access payment initiated');
};
