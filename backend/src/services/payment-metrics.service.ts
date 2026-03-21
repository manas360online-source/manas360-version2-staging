import { prisma } from '../config/db';
import { logger } from '../utils/logger';

const db = prisma as any;

const toUtcDay = (value: Date = new Date()): Date => {
  const day = new Date(value);
  day.setUTCHours(0, 0, 0, 0);
  return day;
};

const ensureMetricRow = async (date: Date): Promise<void> => {
  await db.dailyPaymentMetric.upsert({
    where: { date },
    create: { date },
    update: {},
  }).catch(() => null);
};

export const applyDailyPaymentMetricDelta = async (input: {
  date?: Date;
  totalPaymentsDelta?: number;
  successCountDelta?: number;
  failedCountDelta?: number;
  retryAttemptCountDelta?: number;
  retrySuccessCountDelta?: number;
  revenueMinorDelta?: number;
}): Promise<void> => {
  const date = toUtcDay(input.date || new Date());
  await ensureMetricRow(date);

  await db.dailyPaymentMetric.update({
    where: { date },
    data: {
      totalPayments: { increment: Number(input.totalPaymentsDelta || 0) },
      successCount: { increment: Number(input.successCountDelta || 0) },
      failedCount: { increment: Number(input.failedCountDelta || 0) },
      retryAttemptCount: { increment: Number(input.retryAttemptCountDelta || 0) },
      retrySuccessCount: { increment: Number(input.retrySuccessCountDelta || 0) },
      revenueMinor: { increment: BigInt(Math.max(0, Math.round(Number(input.revenueMinorDelta || 0)))) },
    },
  }).catch(() => null);
};

export const recordPaymentCapturedMetric = async (input: {
  paymentId?: string;
  transactionId?: string;
  userId?: string;
  planId?: string;
  amountMinor: number;
  retryCount?: number;
  channel: 'session' | 'patient_subscription' | 'provider_subscription';
}): Promise<void> => {
  const retryCount = Number(input.retryCount || 0);
  await applyDailyPaymentMetricDelta({
    totalPaymentsDelta: 1,
    successCountDelta: 1,
    retrySuccessCountDelta: retryCount > 0 ? 1 : 0,
    revenueMinorDelta: Number(input.amountMinor || 0),
  });

  logger.info('PAYMENT_CAPTURED', {
    paymentId: input.paymentId,
    transactionId: input.transactionId,
    userId: input.userId,
    planId: input.planId,
    amountMinor: Number(input.amountMinor || 0),
    retryCount,
    channel: input.channel,
  });
};

export const recordPaymentFailedMetric = async (input: {
  paymentId?: string;
  transactionId?: string;
  userId?: string;
  planId?: string;
  reason: string;
  channel: 'session' | 'patient_subscription' | 'provider_subscription' | 'unknown';
}): Promise<void> => {
  await applyDailyPaymentMetricDelta({
    totalPaymentsDelta: 1,
    failedCountDelta: 1,
  });

  logger.warn('PAYMENT_FAILED', {
    paymentId: input.paymentId,
    transactionId: input.transactionId,
    userId: input.userId,
    planId: input.planId,
    reason: input.reason,
    channel: input.channel,
  });
};

export const recordPaymentRetryAttemptMetric = async (input: {
  paymentId?: string;
  transactionId?: string;
  reason?: string;
}): Promise<void> => {
  await applyDailyPaymentMetricDelta({
    retryAttemptCountDelta: 1,
  });

  logger.info('PAYMENT_RETRY_ATTEMPT', {
    paymentId: input.paymentId,
    transactionId: input.transactionId,
    reason: input.reason || 'scheduled_retry',
  });
};

/**
 * Check payment failure rate over the last 10 minutes.
 * Triggers ALERT_PAYMENT_FAILURE_SPIKE if rate > 20%
 */
export const checkPaymentFailureAlert = async (): Promise<void> => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentPayments = await db.financialPayment.findMany({
      where: {
        createdAt: { gte: tenMinutesAgo },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (recentPayments.length === 0) return;

    const failedCount = recentPayments.filter((p) => p.status === 'FAILED' || p.status === 'EXPIRED').length;
    const failureRate = failedCount / recentPayments.length;

    if (failureRate > 0.2) {
      logger.error('ALERT_PAYMENT_FAILURE_SPIKE', {
        failureRate: (failureRate * 100).toFixed(2),
        failedCount,
        totalPayments: recentPayments.length,
        window: '10min',
        threshold: '20%',
        severity: 'critical',
      });
    }
  } catch (err) {
    logger.error('[Alert] Error checking payment failure rate', { error: err });
  }
};

/**
 * Check retry attempt spike over the last hour.
 * Triggers ALERT_RETRY_SPIKE if attempts > threshold (50 per hour)
 */
export const checkRetryAttemptAlert = async (): Promise<void> => {
  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentMetrics = await db.dailyPaymentMetric.findMany({
      where: {
        createdAt: { gte: hourAgo },
      },
      select: {
        retryAttemptCount: true,
      },
    });

    const totalRetries = recentMetrics.reduce((sum, m) => sum + Number(m.retryAttemptCount || 0), 0);

    if (totalRetries > 50) {
      logger.warn('ALERT_RETRY_SPIKE', {
        retryAttempts: totalRetries,
        window: '60min',
        threshold: 50,
        severity: 'warning',
      });
    }
  } catch (err) {
    logger.error('[Alert] Error checking retry attempt spike', { error: err });
  }
};

/**
 * Check for zero successful payments in the last 15 minutes.
 * Triggers ALERT_ZERO_SUCCESS_WINDOW if no captures recorded
 */
export const checkZeroSuccessAlert = async (): Promise<void> => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const successPayments = await db.financialPayment.findMany({
      where: {
        status: 'CAPTURED',
        updatedAt: { gte: fifteenMinutesAgo },
      },
      select: { id: true },
    });

    if (successPayments.length === 0) {
      const failedCount = await db.financialPayment.count({
        where: {
          createdAt: { gte: fifteenMinutesAgo },
        },
      });

      if (failedCount > 0) {
        logger.error('ALERT_ZERO_SUCCESS_WINDOW', {
          successCount: 0,
          failedCount,
          window: '15min',
          severity: 'critical',
        });
      }
    }
  } catch (err) {
    logger.error('[Alert] Error checking zero success window', { error: err });
  }
};
