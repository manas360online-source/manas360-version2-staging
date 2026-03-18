import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	getProviderSubscription,
	activateProviderSubscription,
	cancelProviderSubscription,
	getProviderLeadStats,
} from '../services/provider-subscription.service';
import { initiateProviderSubscriptionPayment } from '../services/provider-subscription-payment.service';
import {
	getProviderLeads,
	getMarketplaceLeads,
	purchaseMarketplaceLead,
} from '../services/lead-distribution.service';
import { PROVIDER_PLANS, type ProviderPlanKey } from '../config/providerPlans';

const authUserId = (req: Request): string => {
	const id = (req as any).auth?.userId;
	if (!id) throw new AppError('Unauthorized', 401);
	return id;
};

/** GET /provider/subscription */
export const getProviderSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await getProviderSubscription(authUserId(req));
	sendSuccess(res, data, 'Provider subscription fetched');
};

/** PATCH /provider/subscription/upgrade */
export const upgradeProviderSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	const { planKey } = req.body;

	if (!planKey || !PROVIDER_PLANS[planKey as ProviderPlanKey]) {
		throw new AppError('Invalid plan key', 422);
	}

	const plan = PROVIDER_PLANS[planKey as ProviderPlanKey];

	// Free plan: activate immediately
	if (plan.price === 0) {
		const data = await activateProviderSubscription(providerId, planKey);
		sendSuccess(res, data, 'Free plan activated');
		return;
	}

	// Paid plan: initiate payment
	const data = await initiateProviderSubscriptionPayment(providerId, planKey);
	sendSuccess(res, data, 'Payment initiated');
};

/** PATCH /provider/subscription/cancel */
export const cancelProviderSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await cancelProviderSubscription(authUserId(req));
	sendSuccess(res, data, 'Subscription cancelled');
};

/** GET /provider/leads */
export const getProviderLeadsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getProviderLeads(authUserId(req));
	sendSuccess(res, data, 'Provider leads fetched');
};

/** GET /provider/lead-stats */
export const getProviderLeadStatsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getProviderLeadStats(authUserId(req));
	sendSuccess(res, data, 'Lead stats fetched');
};

/** GET /provider/marketplace */
export const getProviderMarketplaceController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMarketplaceLeads(authUserId(req));
	sendSuccess(res, data, 'Marketplace leads fetched');
};

/** POST /provider/marketplace/purchase */
export const purchaseMarketplaceLeadController = async (req: Request, res: Response): Promise<void> => {
	const { leadId } = req.body;
	if (!leadId) throw new AppError('leadId is required', 422);

	const data = await purchaseMarketplaceLead(authUserId(req), leadId);
	sendSuccess(res, data, 'Lead purchased successfully');
};

/** GET /provider/plans — public plan list */
export const getProviderPlansController = async (_req: Request, res: Response): Promise<void> => {
	const plans = Object.entries(PROVIDER_PLANS).map(([key, plan]) => ({
		key,
		...plan,
	}));
	sendSuccess(res, plans, 'Provider plans fetched');
};
