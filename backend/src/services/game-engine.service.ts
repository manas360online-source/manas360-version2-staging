import crypto from 'crypto';
import prisma from '../config/db';
import { isSubscriptionValidForGames } from './subscription.helper';
import { addCredit } from './wallet.service';

const db = prisma as any;

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

  // Rule 2: Limit to 1 play per day
  const existingPlay = await db.dailyGamePlay.findUnique({
    where: {
      userId_date: {
        userId,
        date: gameDate,
      },
    },
  });

  if (existingPlay) {
    return {
      eligible: false,
      error: 'Already played today. Come back tomorrow!',
      timing: {
        time_remaining_seconds: Math.floor((nextPlayTime.getTime() - istNow.getTime()) / 1000),
        closes_at: nextPlayTime.toISOString(),
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
  const eligibility = await checkEligibility(input.userId);
  if (!eligibility.eligible) {
    return {
      success: false,
      error: eligibility.error,
      data: eligibility.timing,
    };
  }

  const subscription = await db.patientSubscription.findUnique({
    where: { userId: input.userId },
  });

  const { outcome, creditAmount } = generateOutcome();
  const gameDate = getIstDate();
  const playedAt = getIstNow();

  // Insert standard create instead of testing upsert
  const gamePlay = await db.dailyGamePlay.create({
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

  const walletData = await addCredit({
    userId: input.userId,
    amount: creditAmount,
    source: 'GAME_WIN',
    sourceId: gamePlay.id,
    expiresInDays: 30,
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
};
