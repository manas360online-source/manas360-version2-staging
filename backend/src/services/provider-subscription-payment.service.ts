import { AppError } from '../middleware/error.middleware';
import { PROVIDER_PLANS, type ProviderPlanKey } from '../config/providerPlans';
import { initiatePhonePePayment } from './phonepe.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Initiate a payment for provider subscription via PhonePe.
 * Transaction ID prefixed with PROV_SUB_ for webhook identification.
 */
export const initiateProviderSubscriptionPayment = async (providerId: string, planKey: ProviderPlanKey) => {
	const plan = PROVIDER_PLANS[planKey];
	if (!plan) throw new AppError('Invalid provider plan', 422);
	if (plan.price === 0) throw new AppError('Free plan does not require payment', 422);

	const transactionId = `PROV_SUB_${providerId}_${planKey}_${Date.now()}`;
	const shouldBypass = env.allowDevPaymentBypass && env.nodeEnv === 'development';

	let redirectUrl: string;
	try {
		redirectUrl = await initiatePhonePePayment({
			transactionId,
			userId: providerId,
			amountInPaise: plan.price * 100,
			callbackUrl: `${env.apiPrefix}/payment/phonepe/webhook`,
			redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-status?id=${transactionId}&status=SUCCESS`,
			metadata: { plan: planKey },
		});
	} catch (error: any) {
		if (!shouldBypass) {
			throw new AppError(error?.message || 'PhonePe Payment Initiation Failed', 502);
		}
		// Bypass mode: mock a success redirect
		logger.info('[PhonePe] Bypassing payment initiation in development mode', { transactionId });
		redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-status?id=${transactionId}&status=SUCCESS`;
	}

	// Mandatory: Create financialPayment record for reconciliation worker
	const { prisma } = await import('../config/db');
	await prisma.financialPayment.create({
		data: {
			razorpayOrderId: transactionId,
			providerId,
			amountMinor: plan.price * 100,
			currency: 'INR',
			status: shouldBypass ? 'CAPTURED' : 'INITIATED',
			metadata: { 
				type: 'provider_subscription', 
				plan: planKey 
			}
		}
	});

	if (shouldBypass) {
		const { activateProviderSubscription } = await import('./provider-subscription.service');
		await activateProviderSubscription(providerId, planKey);
	}

	return {
		transactionId,
		redirectUrl,
		planName: planKey,
		price: plan.price,
	};
};
