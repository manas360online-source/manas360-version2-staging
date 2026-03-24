import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';

const db = prisma as any;

const getAuthUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) {
		throw new AppError('Authentication required', 401);
	}
	return userId;
};

export const getMySubscriptionsController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	const subscriptions = await db.marketplaceSubscription.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
	});

	sendSuccess(res, subscriptions, 'Subscriptions fetched');
};

