import crypto from 'crypto';
import { createClient } from 'redis';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { sendWhatsAppMessage } from './whatsapp.service';

const db = prisma as any;
const redis = createClient({
	url: env.redisUrl,
	socket: {
		reconnectStrategy: () => false,
	},
});
let redisWarned = false;
const isTestEnv = process.env.NODE_ENV === 'test';
if (!isTestEnv) {
	redis.on('error', (error) => {
		if (!redisWarned) {
			console.warn('[subscription.service] Redis unavailable, continuing with degraded idempotency cache', error);
			redisWarned = true;
		}
	});
	void redis.connect().catch(() => undefined);
}

const sha256 = (input: string): string => crypto.createHash('sha256').update(input).digest('hex');

/**
 * Create a marketplace subscription (PhonePe enabled)
 * Replaces Razorpay subscription creation with PhonePe payment flow
 */
export const createMarketplaceSubscription = async (input: {
	userId: string;
	domain: 'PATIENT' | 'PROVIDER';
	plan: 'BASIC' | 'PREMIUM' | 'LEAD_PLAN';
	amountMinor: number;
	currency?: string;
}) => {
	const existingActive = await db.marketplaceSubscription.findFirst({
		where: {
			userId: input.userId,
			domain: input.domain,
			status: { in: ['ACTIVE', 'PAST_DUE'] },
		},
	});

	if (existingActive) {
		throw new AppError('An active/past-due subscription already exists', 409);
	}

	const created = await db.marketplaceSubscription.create({
		data: {
			userId: input.userId,
			domain: input.domain,
			plan: input.plan,
			status: 'PENDING',
			amountMinor: input.amountMinor,
			currency: input.currency || 'INR',
			metadata: {
				createdAt: new Date().toISOString(),
				source: 'PHONEPE',
			},
		},
	});

	return {
		subscriptionId: created.id,
		status: created.status,
		amountMinor: created.amountMinor,
	};
};

/**
 * Process PhonePe subscription webhook
 * Updates subscription status based on payment success/failure
 */
export const processSubscriptionWebhook = async (
	rawBody: string,
): Promise<{ handled: boolean; message: string }> => {
	const event = JSON.parse(rawBody) as any;
	const merchantTransactionId = String(event?.data?.merchantTransactionId ?? '');
	const transactionStatus = String(event?.data?.status ?? '');

	if (!merchantTransactionId) {
		throw new AppError('merchantTransactionId missing in webhook payload', 422);
	}

	const cacheKey = `webhook:subscription:${merchantTransactionId}`;
	let setOk: string | null = 'OK';
	if (!isTestEnv) {
		setOk = await redis.set(cacheKey, '1', {
			NX: true,
			EX: env.webhookIdempotencyTtlSeconds || 86400,
		}).catch(() => 'OK');
	}
	if (!setOk) {
		return { handled: true, message: 'Duplicate subscription webhook (cache)' };
	}

	const payloadHash = sha256(rawBody);
	try {
			await db.webhookLog.create({
				data: {
					provider: 'PHONEPE',
					eventId: merchantTransactionId,
					eventType: `subscription.${transactionStatus.toLowerCase()}`,
					payloadHash,
					isSignatureValid: true,
					processStatus: 'RECEIVED',
					rawPayload: event,
				},
			});
	} catch {
		return { handled: true, message: 'Duplicate subscription webhook (db)' };
	}

	await db.$transaction(async (tx: any) => {
		// Find subscription by merchantTransactionId stored in metadata or via payment record
		const payment = await tx.financialPayment.findFirst({
			where: { merchantTransactionId },
		});

		if (!payment || !payment.referenceId) {
			throw new AppError('Payment or subscription not found', 404);
		}

		const sub = await tx.marketplaceSubscription.findUnique({
			where: { id: payment.referenceId },
		});

		if (!sub) {
			throw new AppError('Subscription not found', 404);
		}

		// Handle subscription status update based on payment status
		if (transactionStatus === 'SUCCESS' || transactionStatus === 'COMPLETED') {
			const currentDate = new Date();
			const nextBillingDate = new Date(currentDate);
			nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

			await tx.marketplaceSubscription.update({
				where: { id: sub.id },
				data: {
					status: 'ACTIVE',
					currentPeriodStart: currentDate,
					currentPeriodEnd: nextBillingDate,
					nextBillingDate,
					metadata: {
						...sub.metadata,
						lastPaymentStatus: 'SUCCESS',
						lastPaymentDate: currentDate.toISOString(),
					},
				},
			});

			await tx.subscriptionInvoice.create({
				data: {
					subscriptionId: sub.id,
					phonepeTransactionId: merchantTransactionId,
					amountMinor: payment.amountMinor,
					currency: payment.currency,
					billedAt: currentDate,
					nextBillingDate,
				},
			});

			await tx.revenueLedger.create({
				data: {
					type: 'SUBSCRIPTION',
					grossAmountMinor: payment.amountMinor,
					platformCommissionMinor: payment.amountMinor,
					providerShareMinor: 0,
					paymentType: 'PLATFORM_FEE',
					taxAmountMinor: 0,
					currency: payment.currency,
					referenceId: sub.id,
					subscriptionId: sub.id,
				},
			});

			// Emit WhatsApp subscription renewal event
			try {
				const user = await tx.user.findUnique({
					where: { id: sub.userId },
					select: { phone: true, name: true },
				});

				if (user?.phone) {
					const planDisplay = sub.plan.charAt(0) + sub.plan.slice(1).toLowerCase();
					const amountDisplay = (payment.amountMinor / 100).toFixed(2);

					await sendWhatsAppMessage({
						phoneNumber: user.phone,
						templateType: 'subscription_renewed',
						userType: 'user',
						templateVariables: {
							plan_name: planDisplay,
							amount: amountDisplay,
							currency: payment.currency,
							next_billing_date: nextBillingDate.toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							}),
							user_name: user.name || 'User'
						},
					});
				}
			} catch (error) {
				console.error('[subscription.service] Failed to emit WhatsApp subscription renewal event:', error);
				// Don't fail the payment if WhatsApp emission fails
			}
		} else if (
			transactionStatus === 'FAILED' ||
			transactionStatus === 'DECLINED' ||
			transactionStatus === 'ABANDONED'
		) {
			await tx.marketplaceSubscription.update({
				where: { id: sub.id },
				data: {
					status: 'PAST_DUE',
					metadata: {
						...sub.metadata,
						lastPaymentStatus: transactionStatus,
						lastPaymentFailure: event?.data?.failureReason || 'Payment failed',
					},
				},
			});

			// Emit WhatsApp subscription payment failure event
			try {
				const user = await tx.user.findUnique({
					where: { id: sub.userId },
					select: { phone: true, name: true },
				});

				if (user?.phone) {
					const failureReason =
						event?.data?.failureReason ||
						(transactionStatus === 'DECLINED' ? 'Card declined' : 'Payment processing failed');

					await sendWhatsAppMessage({
						phoneNumber: user.phone,
						templateType: 'payment_failed',
						userType: 'user',
						templateVariables: {
							plan_name: sub.plan.charAt(0) + sub.plan.slice(1).toLowerCase(),
							failure_reason: failureReason,
							user_name: user.name || 'User',
							action_link: `${process.env.APP_URL || 'https://manas360.io'}/subscription/retry?id=${sub.id}`
						},
					});
				}
			} catch (error) {
				console.error('[subscription.service] Failed to emit WhatsApp payment failure event:', error);
				// Don't fail the update if WhatsApp emission fails
			}
		} else if (transactionStatus === 'PENDING') {
			// Keep subscription in PENDING state for authorization
			await tx.marketplaceSubscription.update({
				where: { id: sub.id },
				data: {
					metadata: {
						...sub.metadata,
						lastPaymentStatus: 'PENDING',
					},
				},
			});
		}

		await tx.webhookLog.updateMany({
			where: { provider: 'PHONEPE', eventId: merchantTransactionId },
			data: {
				processStatus: 'PROCESSED',
				processedAt: new Date(),
				subscriptionId: sub.id,
			},
		});
	});

	return { handled: true, message: `subscription.${transactionStatus.toLowerCase()} processed` };
};

