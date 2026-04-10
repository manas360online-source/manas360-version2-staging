// Public pricing controller for landing page
export const getLivePricingController = async (req: Request, res: Response): Promise<void> => {
	const { category } = req.params;
	const data = await getPricingConfig();
	// Optionally filter by category if needed
	const results = category ? (data as any)[category as string] || {} : data;
	sendSuccess(res, results, 'Live pricing fetched');
};
import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { getPricingConfig, getAdminPricingConfigWithImpact, updatePricingConfig } from '../services/pricing.service';
import { recordAdminAuditEvent } from '../services/admin-audit.service';

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
	const actorId = (req as Request & { auth?: { userId?: string } }).auth?.userId ?? null;
	const beforeConfig = await getAdminPricingConfigWithImpact();
	const data = await updatePricingConfig(body, actorId);

	if (actorId) {
		await recordAdminAuditEvent({
			userId: actorId,
			action: 'PRICING_UPDATED',
			resource: 'PricingConfig',
			details: {
				changedKeys: Object.keys(body),
				before: {
					platformFee: beforeConfig.platformFee?.monthlyFee ?? null,
					surchargePercent: beforeConfig.surchargePercent,
					sessionPricingCount: beforeConfig.sessionPricing.length,
					platformPlansCount: beforeConfig.platformPlans.length,
					premiumBundlesCount: beforeConfig.premiumBundles.length,
				},
				after: {
					platformFee: data.platformFee?.monthlyFee ?? null,
					surchargePercent: data.surchargePercent,
					sessionPricingCount: data.sessionPricing.length,
					platformPlansCount: data.plans.length,
					premiumBundlesCount: data.premiumBundles.length,
				},
			},
		});
	}

	sendSuccess(res, data, 'Pricing configuration updated');
};
