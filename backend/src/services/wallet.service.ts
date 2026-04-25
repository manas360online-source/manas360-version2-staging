import prisma from '../config/db';
import { AppError } from '../middleware/error.middleware';

const db = prisma as any;
const IST_TIME_ZONE = 'Asia/Kolkata';

const isWalletSchemaUnavailableError = (error: unknown): boolean => {
  const message = String((error as any)?.message || '').toLowerCase();
  return (
    message.includes('user_wallets')
    || message.includes('user_wallet_transactions')
    || message.includes('wallet_credits')
    || message.includes('booking_wallet_usages')
    || message.includes('column `user_wallets.balance` does not exist')
  );
};

const getFallbackWallet = (userId: string) => ({
  id: `fallback:${userId}`,
  userId,
  balance: 0,
  lastTxnDate: null,
});

const getIstNow = (): Date => {
  const locale = new Date().toLocaleString('en-US', { timeZone: IST_TIME_ZONE });
  return new Date(locale);
};

const isAllowedCreditSource = (source: string): boolean => {
  const normalized = String(source || '').toLowerCase();
  if (normalized.startsWith('game')) return true;
  if (normalized.startsWith('subscription')) return true;
  if (normalized === 'admin_adjustment') return true;
  if (normalized === 'refund') return true;
  return false;
};

export const getOrCreateWallet = async (userId: string) => {
  try {
    const existing = await db.userWallet.findUnique({ where: { userId } });
    if (existing) return existing;
    return await db.userWallet.create({ data: { userId } });
  } catch (error) {
    if (isWalletSchemaUnavailableError(error)) {
      return getFallbackWallet(userId);
    }
    throw error;
  }
};

export const addCredit = async (input: {
  userId: string;
  amount: number;
  source: string;
  sourceId?: string | null;
  expiresInDays?: number;
}) => {
  const amount = Math.max(0, Math.round(Number(input.amount || 0)));
  if (!amount) throw new AppError('amount must be greater than zero', 422);

  const sourceRaw = String(input.source || '').trim();
  if (!isAllowedCreditSource(sourceRaw)) {
    throw new AppError('Manual top-ups are not allowed', 403);
  }

  const now = getIstNow();
  const expiresInDays = Math.max(1, Math.round(Number(input.expiresInDays || 30)));
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  const source = sourceRaw.toUpperCase() || 'GAME_WIN';

  try {
    return await db.$transaction(async (tx: any) => {
      const wallet = await tx.userWallet.upsert({
        where: { userId: input.userId },
        update: {},
        create: { userId: input.userId },
      });

      const balanceBefore = Number(wallet.balance || 0);
      const balanceAfter = balanceBefore + amount;

      await tx.walletCredit.create({
        data: {
          walletId: wallet.id,
          source,
          amount,
          status: 'AVAILABLE',
          expiresAt,
        },
      });

      const transaction = await tx.userWalletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionType: 'CREDIT',
          amount,
          balanceAfter,
          referenceId: input.sourceId || null,
          description: `Earned ${amount} from ${source}`,
        },
      });

      await tx.userWallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          lastTxnDate: now,
        },
      });

      // Log credit transaction for debugging
      // eslint-disable-next-line no-console
      console.log(`[WALLET] Credit added for user ${input.userId}: ${amount} from ${source}. Balance: ${balanceBefore} -> ${balanceAfter}. TransactionId: ${transaction.id}`);

      return {
        transactionId: transaction.id,
        balanceBefore,
        balanceAfter,
        expiresAt,
      };
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[WALLET] Error adding credit for user ${input.userId}: ${String((error as any)?.message || '')}`, error);
    throw error;
  }
};

export const applyCreditsForPayment = async (input: {
  userId: string;
  amountMinor: number;
  referenceId: string;
  referenceType?: string;
}) => {
  const originalAmount = Math.max(0, Math.round(Number(input.amountMinor || 0)));
  if (!originalAmount) {
    return { amountUsed: 0, finalAmount: 0, creditIds: [], transactionId: null };
  }

  try {
    return await db.$transaction(async (tx: any) => {
      const wallet = await tx.userWallet.findUnique({ where: { userId: input.userId } });
      if (!wallet || Number(wallet.balance || 0) <= 0) {
        return { amountUsed: 0, finalAmount: originalAmount, creditIds: [], transactionId: null };
      }

      const used = Math.min(Number(wallet.balance || 0), originalAmount);
      const creditIds: string[] = [];

      if (used <= 0) {
        return { amountUsed: 0, finalAmount: originalAmount, creditIds: [], transactionId: null };
      }

      const balanceBefore = Number(wallet.balance || 0);
      const balanceAfter = Math.max(0, balanceBefore - used);
      const now = getIstNow();

      const transaction = await tx.userWalletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionType: 'DEBIT',
          amount: -used,
          balanceAfter,
          referenceId: input.referenceId,
          description: `Used ${used} credits for ${input.referenceType || 'payment'} ${input.referenceId}`,
        },
      });

      // Only record in the mapping table if it's explicitly a booking
      if (!input.referenceType || input.referenceType === 'booking') {
        try {
          await tx.bookingWalletUsage.create({
            data: {
              walletId: wallet.id,
              bookingId: input.referenceId,
              amountUsed: used,
            },
          });
        } catch (e) {
          // Ignore if booking mapping fails (e.g. invalid foreign key), transaction debit still succeeds
          console.warn('Failed to insert into bookingWalletUsage, continuing wallet debit.');
        }
      }

      await tx.userWallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          lastTxnDate: now,
        },
      });

      return {
        amountUsed: used,
        finalAmount: Math.max(0, originalAmount - used),
        creditIds,
        transactionId: transaction.id,
      };
    });
  } catch (error) {
    if (isWalletSchemaUnavailableError(error)) {
      return { amountUsed: 0, finalAmount: originalAmount, creditIds: [], transactionId: null };
    }
    throw error;
  }
};

export const expireOldCredits = async () => {
  const now = getIstNow();
  return db.$transaction(async (tx: any) => {
    const credits = await tx.walletCredit.findMany({
      where: {
        status: 'AVAILABLE',
        expiresAt: { lte: now },
      },
    });

    let totalExpired = 0;
    const affectedUsers = new Set<string>();

    for (const credit of credits) {
      const expiredAmount = Number(credit.amount || 0);
      if (!expiredAmount) continue;

      await tx.walletCredit.update({
        where: { id: credit.id },
        data: {
          status: 'EXPIRED',
          usedAt: now,
        },
      });

      const wallet = await tx.userWallet.findUnique({ where: { id: credit.walletId } });
      if (!wallet) continue;

      const balanceBefore = Number(wallet.balance || 0);
      const balanceAfter = Math.max(0, balanceBefore - expiredAmount);

      await tx.userWalletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionType: 'DEBIT',
          amount: -expiredAmount,
          balanceAfter,
          referenceId: credit.id,
          description: 'Credit expired',
        },
      });

      await tx.userWallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          lastTxnDate: now,
        },
      });

      totalExpired += expiredAmount;
      affectedUsers.add(wallet.userId);
    }

    return {
      totalExpired,
      creditsExpired: credits.length,
      usersAffected: affectedUsers.size,
    };
  });
};
