import { prisma } from '../config/db';
import { logger } from '../utils/logger';

const db = prisma as any;

/**
 * Payment Notification Service
 * 
 * Handles:
 * - Dead-letter payment failure notifications
 * - User alerts
 * - Integration points for Slack/email (TODO)
 */

export const notifyPaymentDeadLetterEvent = async (input: {
  paymentId: string;
  userId?: string;
  userEmail?: string;
  reason: string;
  amountMinor?: number;
  retryCount?: number;
  channel?: string;
}): Promise<void> => {
  try {
    logger.error('PAYMENT_DEAD_LETTER_NOTIFICATION', {
      paymentId: input.paymentId,
      userId: input.userId,
      userEmail: input.userEmail,
      reason: input.reason,
      amountMinor: input.amountMinor,
      retryCount: input.retryCount,
      channel: input.channel,
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrate with:
    // - Email service: send "Payment failed, please retry" email
    // - Slack webhook: alert support team
    // - In-app notification: push notification to user
    // - SMS (optional): critical payment failure alert

    // For now, structured log enables:
    // - Querying in CloudWatch / ELK / Datadog
    // - Building alerts on top
  } catch (err) {
    logger.error('[Notification] Error notifying payment dead-letter', {
      paymentId: input.paymentId,
      error: err,
    });
  }
};

/**
 * Mark subscription as PAST_DUE after payment exhausts all retries.
 * Triggers notification to user.
 */
export const markSubscriptionPastDue = async (input: {
  subscriptionId: string;
  subscriptionType: 'patient' | 'provider';
  userId?: string;
  userEmail?: string;
  paymentId: string;
  reason: string;
}): Promise<void> => {
  try {
    if (input.subscriptionType === 'patient') {
      await db.patientSubscription.update({
        where: { id: input.subscriptionId },
        data: {
          status: 'PAST_DUE',
          updatedAt: new Date(),
        },
      });

      // Record history entry for status change to PAST_DUE
      await db.subscriptionHistory.create({
        data: {
          subscriptionType: 'PATIENT',
          subscriptionRefId: input.subscriptionId,
          patientUserId: input.userId,
          oldStatus: 'ACTIVE', // could be fetched but logging as typical state
          newStatus: 'PAST_DUE',
          reason: 'OTHER',
          paymentId: input.paymentId,
          transactionId: input.paymentId, // fallback
          metadata: {
            failureReason: input.reason,
            deadLetterReasonCode: 'PAYMENT_MAX_RETRIES_EXCEEDED',
            markedPastDueAt: new Date().toISOString(),
          },
        },
      });
    } else if (input.subscriptionType === 'provider') {
      await db.providerSubscription.update({
        where: { id: input.subscriptionId },
        data: {
          status: 'PAST_DUE',
          updatedAt: new Date(),
        },
      });

      // Record history entry for status change to PAST_DUE
      await db.subscriptionHistory.create({
        data: {
          subscriptionType: 'PROVIDER',
          subscriptionRefId: input.subscriptionId,
          providerId: input.userId,
          oldStatus: 'ACTIVE',
          newStatus: 'PAST_DUE',
          reason: 'OTHER',
          paymentId: input.paymentId,
          transactionId: input.paymentId,
          metadata: {
            failureReason: input.reason,
            deadLetterReasonCode: 'PAYMENT_MAX_RETRIES_EXCEEDED',
            markedPastDueAt: new Date().toISOString(),
          },
        },
      });
    }

    // Trigger notification to user
    await notifyPaymentDeadLetterEvent({
      paymentId: input.paymentId,
      userId: input.userId,
      userEmail: input.userEmail,
      reason: input.reason,
      channel: input.subscriptionType,
    });

    logger.warn('SUBSCRIPTION_MARKED_PAST_DUE', {
      subscriptionId: input.subscriptionId,
      subscriptionType: input.subscriptionType,
      userId: input.userId,
      paymentId: input.paymentId,
      reason: input.reason,
    });
  } catch (err) {
    logger.error('[Notification] Error marking subscription PAST_DUE', {
      subscriptionId: input.subscriptionId,
      error: err,
    });
  }
};
