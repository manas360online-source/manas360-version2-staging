import crypto from 'crypto';
import prisma from '../config/db';
import { addCredit } from './wallet.service';

const db = prisma as any;

const isSchemaUnavailableError = (error: unknown): boolean => {
  const message = String((error as any)?.message || '').toLowerCase();
  const code = String((error as any)?.code || '').toUpperCase();
  return (
    code === 'P2021'
    || code === 'P2022'
    || code === 'P2010'
    || message.includes('does not exist')
    || message.includes('unknown column')
    || message.includes('no such table')
    || message.includes('dailygameplay')
    || message.includes('daily_game_play')
  );
};

export type GameOutcome = 'sixer' | 'four' | 'out';

type OutcomeConfig = {
  outcome: GameOutcome;
  probability: number;
  creditAmount: number;
};

const OUTCOMES: OutcomeConfig[] = [
  { outcome: 'sixer', probability: 0.04, creditAmount: 100 },
  { outcome: 'four', probability: 0.08, creditAmount: 50 },
  { outcome: 'out', probability: 0.88, creditAmount: 10 },
];

const IST_TIME_ZONE = 'Asia/Kolkata';
const GAME_CLOSE_HOUR = 23;
const GAME_CLOSE_MINUTE = 59;

const getIstNow = (): Date => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  // IST is UTC + 5:30
  return new Date(utc + (3600000 * 5.5));
};

const getIstDateKey = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(getIstNow());
};

const getIstDate = (): Date => new Date(getIstDateKey());

const getNextPlayTime = (): string => {
  const istNow = getIstNow();
  const next = new Date(istNow);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
};

const getUserLockKey = (userId: string): bigint => {
  const digest = crypto.createHash('sha256').update(userId).digest();
  return digest.readBigInt64BE(0);
};

export const checkEligibility = async (userId: string) => {
  const istNow = getIstNow();
  const gameDate = getIstDate();
  
  // Next midnight IST for countdown if they already played or it's past 6 PM
  const nextPlayTime = new Date(istNow);
  nextPlayTime.setDate(nextPlayTime.getDate() + 1);
  nextPlayTime.setHours(0, 0, 0, 0);

  const closeTime = new Date(istNow);
  closeTime.setHours(18, 0, 0, 0); // 6:00 PM IST

  // Rule 1: Time enforcement
  if (istNow.getHours() >= 18) {
    return {
      eligible: false,
      error: 'Game closed for today. Play tomorrow before 6 PM!',
      timing: {
        time_remaining_seconds: Math.floor((nextPlayTime.getTime() - istNow.getTime()) / 1000),
        closes_at: nextPlayTime.toISOString(),
      },
    };
  }

  // Rule 2: Limit to 1 play PER LIFETIME (One-time use policy)
  let existingPlay: any = null;
  try {
    existingPlay = await db.dailyGamePlay.findFirst({
      where: { userId },
    });
  } catch (error) {
    if (!isSchemaUnavailableError(error)) throw error;
  }

  if (existingPlay) {
    return {
      eligible: false,
      error: 'You have already played Hit a Sixer. Winnings are stored in your wallet!',
      timing: {
        time_remaining_seconds: 0,
        closes_at: istNow.toISOString(),
      },
    };
  }

  const timeRemainingSeconds = Math.max(0, Math.floor((closeTime.getTime() - istNow.getTime()) / 1000));
  return {
    eligible: true,
    error: null,
    timing: { // Renamed from 'data' to prevent frontend's unwrapPayload bug
      time_remaining_seconds: timeRemainingSeconds,
      closes_at: closeTime.toISOString(),
    },
  };
};

export const generateOutcome = (): { outcome: GameOutcome; creditAmount: number } => {
  const randomValue = crypto.randomInt(0, 10000) / 10000;
  let cumulative = 0;

  for (const config of OUTCOMES) {
    cumulative += config.probability;
    if (randomValue < cumulative) {
      return { outcome: config.outcome, creditAmount: config.creditAmount };
    }
  }

  return { outcome: 'out', creditAmount: 10 };
};

export const playGame = async (input: { userId: string; ipAddress?: string | null; userAgent?: string | null }) => {
  // eslint-disable-next-line no-console
  console.log(`[GAME] playGame called for user ${input.userId}`);
  
  const eligibility = await checkEligibility(input.userId);
  if (!eligibility.eligible) {
    return {
      success: false,
      error: eligibility.error,
      data: eligibility.timing,
    };
  }

  await db.patientSubscription.findUnique({
    where: { userId: input.userId },
  }).catch(() => null);

  const { outcome, creditAmount } = generateOutcome();
  const gameDate = getIstDate();
  const playedAt = getIstNow();

  // Use transaction to prevent duplicate plays and ensure wallet credit happens together
  try {
    const result = await db.$transaction(async (tx: any) => {
      // Serialize concurrent game plays per user to prevent duplicate records.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${getUserLockKey(input.userId)})`;

      // Double-check eligibility inside transaction before creation
      const existingPlay = await tx.dailyGamePlay.findFirst({
        where: { userId: input.userId },
      });

      if (existingPlay) {
        throw new Error('DUPLICATE_PLAY_ATTEMPT');
      }

      // Create game play record
      const gamePlay = await tx.dailyGamePlay.create({
        data: {
          userId: input.userId,
          date: gameDate,
          sixesHit: outcome === 'sixer' ? 1 : 0,
          ballsPlayed: 1,
          didWin: outcome !== 'out',
          prizeAmount: creditAmount,
          lastPlayedAt: playedAt,
        },
      });

      return gamePlay;
    });

    // Credit added OUTSIDE transaction to allow wallet service to manage its own transaction
    const walletData = await addCredit({
      userId: input.userId,
      amount: creditAmount,
      source: 'GAME_WIN',
      sourceId: result.id,
      expiresInDays: 30,
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.error(`[GAME] addCredit failed for user ${input.userId}:`, String((error as any)?.message || ''), error);
      return {
        balanceBefore: 0,
        balanceAfter: creditAmount,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    });

    return {
      success: true,
      outcome,
      prize: {
        amount: creditAmount,
        description: `INR ${creditAmount} added to wallet`,
        expires_in_days: 30,
        expires_at: walletData.expiresAt.toISOString(),
      },
      wallet: {
        previous_balance: walletData.balanceBefore,
        credit_added: creditAmount,
        new_balance: walletData.balanceAfter,
      },
      message: `INR ${creditAmount} added to your wallet`,
    };
  } catch (error: unknown) {
    const errorMsg = String((error as any)?.message || '');
    
    // Log the error for debugging
    // eslint-disable-next-line no-console
    console.error(`[GAME] Error in playGame for user ${input.userId}:`, errorMsg, error);
    
    // Handle duplicate play attempt
    if (errorMsg.includes('DUPLICATE_PLAY_ATTEMPT')) {
      return {
        success: false,
        error: 'You have already played Hit a Sixer. Winnings are stored in your wallet!',
        data: eligibility.timing,
      };
    }

    // Handle schema unavailability gracefully
    if (isSchemaUnavailableError(error)) {
      // eslint-disable-next-line no-console
      console.warn(`[GAME] Schema unavailable for user ${input.userId}, attempting fallback wallet credit`);
      // Schema not available, but still try to credit for game win
      const walletData = await addCredit({
        userId: input.userId,
        amount: creditAmount,
        source: 'GAME_WIN',
        sourceId: `fallback-${Date.now()}`,
        expiresInDays: 30,
      }).catch((walletError) => {
        // eslint-disable-next-line no-console
        console.error(`[GAME] Fallback wallet credit also failed for user ${input.userId}:`, walletError);
        return {
          balanceBefore: 0,
          balanceAfter: creditAmount,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };
      });

      return {
        success: true,
        outcome,
        prize: {
          amount: creditAmount,
          description: `INR ${creditAmount} added to wallet`,
          expires_in_days: 30,
          expires_at: walletData.expiresAt.toISOString(),
        },
        wallet: {
          previous_balance: walletData.balanceBefore,
          credit_added: creditAmount,
          new_balance: walletData.balanceAfter,
        },
        message: `INR ${creditAmount} added to your wallet`,
      };
    }

    // Re-throw other errors
    throw error;
  }
};
