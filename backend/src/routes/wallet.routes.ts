import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
  getWalletBalanceController,
  getWalletTransactionsController,
} from '../controllers/wallet.controller';

const router = Router();

/**
 * @openapi
 * /wallet/balance:
 *   get:
 *     summary: Get wallet balance
 */
router.get('/balance', requireAuth, requireRole('patient'), asyncHandler(getWalletBalanceController));

/**
 * @openapi
 * /wallet/transactions:
 *   get:
 *     summary: Get wallet transactions
 */
router.get('/transactions', requireAuth, requireRole('patient'), asyncHandler(getWalletTransactionsController));

export default router;
