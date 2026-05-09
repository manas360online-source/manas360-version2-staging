import cron from 'node-cron';
import prisma from '../config/db';
import { expireOldCredits } from '../services/wallet.service';
import { isSubscriptionValidForMatching } from '../services/subscription.helper';
import { publishPlaceholderNotificationEvent } from '../services/notification.service';
import { logger } from '../utils/logger';

const db = prisma as any;
const IST_TIME_ZONE = 'Asia/Kolkata';
const WARNING_THRESHOLD = 50;

const getIstNow = (): Date => {
  const locale = new Date().toLocaleString('en-US', { timeZone: IST_TIME_ZONE });
  return new Date(locale);
};

const getIstStartOfDay = (value?: Date): Date => {
  const base = value ? new Date(value) : getIstNow();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getIstDayBounds = (dayOffset = 0) => {
  const todayStart = getIstStartOfDay();
  const start = new Date(todayStart);
  start.setDate(start.getDate() + dayOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const roundTwo = (value: number): number => Number(value.toFixed(2));

const sendCreditExpiryWarnings = async () => {
  const { start, end } = getIstDayBounds(7);

  const credits = await db.walletCredit.findMany({
    where: {
      expired: false,
      remainingBalance: { gt: 0 },
      expiresAt: { gte: start, lt: end },
    },
    select: {
      id: true,
      userId: true,
      remainingBalance: true,
      expiresAt: true,
    },
  });

  const creditsByUser = new Map<string, { total: number; creditIds: string[]; expiresAt: Date }>();

  for (const credit of credits) {
    const existing = creditsByUser.get(credit.userId) ?? {
      total: 0,
      creditIds: [] as string[],
      expiresAt: credit.expiresAt,
    };
    existing.total += Number(credit.remainingBalance || 0);
    existing.creditIds.push(credit.id);
    creditsByUser.set(credit.userId, existing);
  }

  let notified = 0;

  for (const [userId, summary] of creditsByUser.entries()) {
    if (summary.total <= WARNING_THRESHOLD) continue;
    const amountInr = Math.round(summary.total);
    const title = 'Wallet credits expiring soon';
    const message = `Your wallet credits worth INR ${amountInr} expire in 7 days. Use them before they lapse.`;

    await db.notification.create({
      data: {
        userId,
        type: 'WALLET_CREDIT_EXPIRY_WARNING',
        title,
        message,
        payload: {
          totalAmount: amountInr,
          creditIds: summary.creditIds,
          expiresAt: summary.expiresAt,
          warningDays: 7,
        },
        sentAt: new Date(),
      },
    });

    await publishPlaceholderNotificationEvent({
      eventType: 'WALLET_CREDIT_EXPIRY_WARNING',
      entityType: 'user_wallet',
      entityId: userId,
      payload: {
        totalAmount: amountInr,
        creditIds: summary.creditIds,
        expiresAt: summary.expiresAt.toISOString(),
        warningDays: 7,
      },
    });

    notified += 1;
  }

  return { warningsSent: notified, creditsFound: credits.length };
};

const sendMorningPlayReminders = async () => {
  const todayStart = getIstStartOfDay();

  const [playsToday, subscriptions] = await Promise.all([
    db.dailyGamePlay.findMany({
      where: { gameDate: todayStart },
      select: { userId: true },
    }),
    db.patientSubscription.findMany({
      where: { status: { in: ['active', 'trial', 'grace', 'renewal_pending'] } },
      select: {
        userId: true,
        status: true,
        plan: true,
        planName: true,
        price: true,
        renewalDate: true,
        metadata: true,
      },
    }),
  ]);

  const playedUsers = new Set<string>(playsToday.map((play: { userId: string }) => play.userId));

  const eligibleUsers = subscriptions
    .filter((sub: any) => isSubscriptionValidForMatching(sub))
    .map((sub: any) => String(sub.userId))
    .filter((userId: string) => userId && !playedUsers.has(userId));

  if (!eligibleUsers.length) {
    return { remindersSent: 0 };
  }

  const title = 'Daily cricket game reminder';
  const message = 'Play today before 6 PM to win wallet credits.';

  await db.notification.createMany({
    data: eligibleUsers.map((userId: string) => ({
      userId,
      type: 'GAME_PLAY_REMINDER',
      title,
      message,
      payload: {
        event: 'GAME_PLAY_REMINDER',
        gameDate: todayStart,
      },
      sentAt: new Date(),
    })),
  });

  await Promise.all(
    eligibleUsers.map((userId: string) =>
      publishPlaceholderNotificationEvent({
        eventType: 'GAME_PLAY_REMINDER',
        entityType: 'daily_game',
        entityId: userId,
        payload: {
          gameDate: todayStart.toISOString(),
        },
      }),
    ),
  );

  return { remindersSent: eligibleUsers.length };
};

const aggregateGameStatsDaily = async () => {
  const todayStart = getIstStartOfDay();
  const statStart = new Date(todayStart);
  statStart.setDate(statStart.getDate() - 1);
  const statEnd = new Date(todayStart);

  const plays = await db.dailyGamePlay.findMany({
    where: { gameDate: statStart },
    select: { userId: true, outcome: true, creditAmount: true },
  });

  const totalPlays = plays.length;
  const uniquePlayers = new Set(plays.map((play: any) => play.userId)).size;
  const totalSixers = plays.filter((play: any) => play.outcome === 'sixer').length;
  const totalFours = plays.filter((play: any) => play.outcome === 'four').length;
  const totalOuts = plays.filter((play: any) => play.outcome === 'out').length;
  const totalCreditsIssued = plays.reduce((sum: number, play: any) => sum + Number(play.creditAmount || 0), 0);

  const [redeemedAgg, expiredAgg, bookingAgg] = await Promise.all([
    db.userWalletTransaction.aggregate({
      where: {
        transactionType: 'credit_used_booking',
        createdAt: { gte: statStart, lt: statEnd },
      },
      _sum: { amount: true },
    }),
    db.userWalletTransaction.aggregate({
      where: {
        transactionType: 'credit_expired',
        createdAt: { gte: statStart, lt: statEnd },
      },
      _sum: { amount: true },
    }),
    db.bookingWalletUsage.aggregate({
      where: {
        appliedAt: { gte: statStart, lt: statEnd },
        walletCreditsUsed: { gt: 0 },
      },
      _sum: { walletCreditsUsed: true, finalAmount: true },
      _count: { _all: true },
    }),
  ]);

  const totalCreditsRedeemed = Math.abs(Number(redeemedAgg?._sum?.amount || 0));
  const totalCreditsExpired = Math.abs(Number(expiredAgg?._sum?.amount || 0));
  const sessionsBookedWithCredits = Number(bookingAgg?._count?._all || 0);
  const revenueGenerated = Number(bookingAgg?._sum?.finalAmount || 0);

  const sixerPercentage = totalPlays ? roundTwo((totalSixers / totalPlays) * 100) : null;
  const fourPercentage = totalPlays ? roundTwo((totalFours / totalPlays) * 100) : null;
  const outPercentage = totalPlays ? roundTwo((totalOuts / totalPlays) * 100) : null;

  await db.gameStatsDaily.upsert({
    where: { statDate: statStart },
    update: {
      totalPlays,
      uniquePlayers,
      totalSixers,
      totalFours,
      totalOuts,
      sixerPercentage,
      fourPercentage,
      outPercentage,
      totalCreditsIssued,
      totalCreditsRedeemed,
      totalCreditsExpired,
      sessionsBookedWithCredits,
      revenueGenerated,
    },
    create: {
      statDate: statStart,
      totalPlays,
      uniquePlayers,
      totalSixers,
      totalFours,
      totalOuts,
      sixerPercentage,
      fourPercentage,
      outPercentage,
      totalCreditsIssued,
      totalCreditsRedeemed,
      totalCreditsExpired,
      sessionsBookedWithCredits,
      revenueGenerated,
    },
  });

  return { statDate: statStart.toISOString(), totalPlays, uniquePlayers };
};

export const initGameWalletCron = () => {
  cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        const result = await expireOldCredits();
        logger.info('[CRON] Wallet credit expiry completed', result);
      } catch (error) {
        logger.error('[CRON] Wallet credit expiry failed', { error });
      }
    },
    { timezone: IST_TIME_ZONE },
  );

  cron.schedule(
    '10 0 * * *',
    async () => {
      try {
        const result = await sendCreditExpiryWarnings();
        logger.info('[CRON] Wallet expiry warnings sent', result);
      } catch (error) {
        logger.error('[CRON] Wallet expiry warning cron failed', { error });
      }
    },
    { timezone: IST_TIME_ZONE },
  );

  cron.schedule(
    '0 10 * * *',
    async () => {
      try {
        const result = await sendMorningPlayReminders();
        logger.info('[CRON] Morning play reminders sent', result);
      } catch (error) {
        logger.error('[CRON] Morning play reminder cron failed', { error });
      }
    },
    { timezone: IST_TIME_ZONE },
  );

  cron.schedule(
    '20 0 * * *',
    async () => {
      try {
        const result = await aggregateGameStatsDaily();
        logger.info('[CRON] Game stats daily aggregation completed', result);
      } catch (error) {
        logger.error('[CRON] Game stats daily aggregation failed', { error });
      }
    },
    { timezone: IST_TIME_ZONE },
  );

  logger.info('[CRON] Game + wallet CRON jobs initialized.');
};
