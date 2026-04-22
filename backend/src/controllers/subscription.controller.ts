import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { calculateSubscriptionPrice } from '../services/subscription-pricing.service';
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

export const calculateSubscriptionPriceController = async (req: Request, res: Response): Promise<void> => {
	const payload = req.body || {};
	const clinicTier = String(payload.clinic_tier || '').trim();
	const billingCycle = String(payload.billing_cycle || '').trim();
	const selectedFeatures = Array.isArray(payload.selected_features) ? payload.selected_features : [];

	if (!['solo', 'small', 'large'].includes(clinicTier)) {
		throw new AppError('clinic_tier must be one of: solo, small, large', 422);
	}

	if (!['monthly', 'quarterly'].includes(billingCycle)) {
		throw new AppError('billing_cycle must be one of: monthly, quarterly', 422);
	}

	if (!Array.isArray(selectedFeatures) || selectedFeatures.some((feature) => typeof feature !== 'string')) {
		throw new AppError('selected_features must be an array of strings', 422);
	}

	const pricing = calculateSubscriptionPrice({
		clinic_tier: clinicTier as 'solo' | 'small' | 'large',
		billing_cycle: billingCycle as 'monthly' | 'quarterly',
		selected_features: selectedFeatures,
	});

	sendSuccess(res, pricing, 'Subscription pricing calculated');
};

