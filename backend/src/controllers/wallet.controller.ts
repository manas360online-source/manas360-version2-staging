import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import prisma from '../config/db';
import { getOrCreateWallet, applyCreditsForPayment } from '../services/wallet.service';

const db = prisma as any;

const getAuthUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError('Authentication required', 401);
  return userId;
};

const clampLimit = (value: unknown, fallback = 20): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(50, Math.max(1, Math.floor(parsed)));
};

export const getWalletBalanceController = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthUserId(req);
  const wallet = await getOrCreateWallet(userId);

  sendSuccess(res, {
    user_id: userId,
    // Prisma model `UserWallet` currently stores only the aggregate balance.
    // The frontend wallet widget expects these keys; for now we return 0 for credits
    // that are not represented in the current schema.
    total_balance: wallet.balance ?? 0,
    game_credits: 0,
    referral_credits: 0,
    promo_credits: 0,
    lifetime_earned: 0,
    lifetime_spent: 0,
    lifetime_expired: 0,
    last_transaction_at: wallet.lastTxnDate ?? null,
  }, 'Wallet balance');
};

export const getWalletTransactionsController = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthUserId(req);
  const limit = clampLimit(req.query.limit, 20);

  const wallet = await getOrCreateWallet(userId);

  const transactions = await db.userWalletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  sendSuccess(res, { transactions }, 'Wallet transactions');
};
export const applyWalletToPaymentController = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthUserId(req);
  const { bookingId, referenceId, referenceType, amount } = req.body;

  const actualReferenceId = referenceId || bookingId;

  if (!actualReferenceId) {
    throw new AppError('referenceId is required', 400);
  }

  // Frontend sends amount in rupees; service expects amountMinor (paise/units).
  // HitASixerGame.tsx and BookingCheckout.tsx handle conversions slightly differently;
  // let's ensure we use the input amount as raw value, or convert if needed.
  // Standardizing on 'amount' as standard unit value.
  const amountToApply = Math.max(0, Math.round(Number(amount || 0)));

  const result = await applyCreditsForPayment({
    userId,
    referenceId: String(actualReferenceId),
    referenceType: referenceType || (bookingId ? 'booking' : 'payment'),
    amountMinor: amountToApply,
  });

  sendSuccess(res, {
    used: result.amountUsed,
    finalAmount: result.finalAmount,
    transactionId: result.transactionId,
  }, 'Wallet credits applied');
};
