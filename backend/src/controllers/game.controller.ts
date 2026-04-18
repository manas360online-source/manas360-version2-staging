import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import prisma from '../config/db';
import { checkEligibility, playGame, generateOutcome } from '../services/game-engine.service';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
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

const getAuthUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError('Authentication required', 401);
  return userId;
};

const clampLimit = (value: unknown, fallback = 10): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(50, Math.max(1, Math.floor(parsed)));
};

export const getGameEligibilityController = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthUserId(req);
  const result = await checkEligibility(userId);
  // Debug: log the eligibility response sent to frontend
  // eslint-disable-next-line no-console
  console.log('[DEBUG] Eligibility response for user', userId, JSON.stringify(result));
  sendSuccess(res, result, 'Game eligibility');
};

export const publicRollController = async (req: Request, res: Response): Promise<void> => {
  const { outcome, creditAmount } = generateOutcome();
  
  // Sign the outcome securely with a 24-hour expiry
  const token = jwt.sign({ outcome, creditAmount }, env.jwtSecret, { expiresIn: '24h' });

  // Lightweight audit log for public-roll token issuance
  try {
    // eslint-disable-next-line no-console
    console.info('[GAME] Issued public-roll token', { ip: req.ip || null, userAgent: req.headers['user-agent'] || null, outcome, creditAmount });
  } catch (e) {
    // ignore logging errors
  }

  sendSuccess(res, {
    outcome,
    credit: creditAmount,
    token
  }, 'Public game outcome generated');
};

export const playGameController = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthUserId(req);
  const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || null;
  const userAgent = req.headers['user-agent'] || null;
  const result = await playGame({ userId, ipAddress, userAgent });
  sendSuccess(res, result, 'Game result');
};

export const getGameWinnersController = async (req: Request, res: Response): Promise<void> => {
  const limit = clampLimit(req.query.limit, 10);

  // Prisma schema: DailyGamePlay does NOT have `outcome`, `playedAt`, `creditAmount`, or `user` relation.
  // So we fetch wins first, then fetch user names separately by `userId`.
  let plays: any[] = [];
  try {
    plays = await db.dailyGamePlay.findMany({
      where: { didWin: true },
      orderBy: { lastPlayedAt: 'desc' },
      take: limit,
      select: {
        userId: true,
        sixesHit: true,
        prizeAmount: true,
        lastPlayedAt: true,
      },
    });
  } catch (error) {
    if (!isSchemaUnavailableError(error)) throw error;
    sendSuccess(res, { winners: [] }, 'Winners feed');
    return;
  }

  const userIds = Array.from(new Set(plays.map((p: any) => String(p.userId)).filter(Boolean)));
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, name: true },
      })
    : [];

  const userById: Map<string, any> = new Map(users.map((u: any) => [String(u.id), u]));

  const payload = plays.map((play: any) => {
    const user = userById.get(String(play.userId));
    const firstName = String(user?.firstName || user?.name || '').trim();
    const lastName = String(user?.lastName || '').trim();
    const displayName = lastName ? `${firstName} ${lastName[0]}.` : (firstName || 'Player');

    // Best-effort mapping for legacy UI: if at least one six was hit, show "sixer", else "four".
    const outcome = Number(play.sixesHit || 0) > 0 ? 'sixer' : 'four';

    return {
      display_name: displayName,
      outcome,
      amount_won: play.prizeAmount ?? 0,
      played_at: play.lastPlayedAt,
    };
  });

  sendSuccess(res, { winners: payload }, 'Winners feed');
};
