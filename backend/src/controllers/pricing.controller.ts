// Public pricing controller for landing page
export const getLivePricingController = async (req: Request, res: Response): Promise<void> => {
	const { category } = req.params;
	const data = await getPricingConfig();
	// Optionally filter by category if needed
	sendSuccess(res, category ? data[category] || {} : data, 'Live pricing fetched');
};
import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { getPricingConfig, getAdminPricingConfigWithImpact, updatePricingConfig } from '../services/pricing.service';

export const getPricingConfigController = async (_req: Request, res: Response): Promise<void> => {
	const data = await getPricingConfig();
	sendSuccess(res, data, 'Pricing configuration fetched');
};

export const getAdminPricingConfigController = async (_req: Request, res: Response): Promise<void> => {
	const data = await getAdminPricingConfigWithImpact();
	sendSuccess(res, data, 'Admin pricing configuration fetched');
};

export const updateAdminPricingConfigController = async (req: Request, res: Response): Promise<void> => {
	const body = req.body || {};
	const hasBody = typeof body === 'object' && Object.keys(body).length > 0;
	if (!hasBody) {
		throw new AppError('Pricing update payload is required', 422);
	}

	const data = await updatePricingConfig(body);
	sendSuccess(res, data, 'Pricing configuration updated');
};
