import { AppError } from '../middleware/error.middleware';
import { getActivePlatformPlan } from './pricing.service';
import { initiatePhonePePayment } from './phonepe.service';
import { env } from '../config/env';

export const initiatePatientSubscriptionPayment = async (userId: string, planKey: string) => {
	const plan = await getActivePlatformPlan(planKey);
	if (!plan) throw new AppError('Invalid subscription plan', 422);

	const transactionId = `SUB_${userId}_${planKey}_${Date.now()}`;
	const shouldBypass = env.allowDevPaymentBypass && env.nodeEnv === 'development';

	let redirectUrl: string;
	try {
		redirectUrl = await initiatePhonePePayment({
			transactionId,
			userId,
			amountInPaise: plan.price,
			callbackUrl: `${env.apiPrefix}/payment/phonepe/webhook`,
			redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-status?id=${transactionId}&status=SUCCESS`,
		});
	} catch (error: any) {
		if (!shouldBypass) {
			throw new AppError(error?.message || 'PhonePe Payment Initiation Failed', 502);
		}
		// Bypass mode: mock a success redirect
		const { logger } = await import('../utils/logger');
		logger.info('[PhonePe] Bypassing patient payment initiation in development mode', { transactionId });
		redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-status?id=${transactionId}&status=SUCCESS`;
	}

	// Mandatory: Create financialPayment record for reconciliation worker
	const { prisma } = await import('../config/db');
	await prisma.financialPayment.create({
		data: {
			razorpayOrderId: transactionId,
			patientId: userId,
			amountMinor: plan.price,
			currency: 'INR',
			status: shouldBypass ? 'CAPTURED' : 'INITIATED',
			metadata: { 
				type: 'patient_subscription', 
				plan: planKey 
			}
		}
	});

	if (shouldBypass) {
		const nextRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
		await prisma.patientSubscription.upsert({
			where: { userId },
			update: {
				planName: plan.name,
				price: plan.price,
				status: 'active',
				renewalDate: nextRenewalDate,
				updatedAt: new Date(),
			},
			create: {
				userId,
				planName: plan.name,
				price: plan.price,
				status: 'active',
				renewalDate: nextRenewalDate,
				billingCycle: 'monthly',
			}
		});
	}

	return {
		transactionId,
		redirectUrl,
		planName: plan.name,
		price: plan.price,
	};
};
