import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
  getWalletBalanceController,
  getWalletTransactionsController,
  applyWalletToPaymentController,
} from '../controllers/wallet.controller';

const router = Router();

/**
 * @openapi
 * /wallet/balance:
 *   get:
 *     summary: Get wallet balance
 */
router.get(
  '/balance',
  requireAuth,
  requireRole([
    'patient',
    'therapist',
    'psychiatrist',
    'psychologist',
    'coach',
  ]),
  asyncHandler(getWalletBalanceController)
);

/**
 * @openapi
 * /wallet/transactions:
 *   get:
 *     summary: Get wallet transactions
 */
router.get('/transactions', requireAuth, requireRole([
  'patient',
  'therapist',
  'psychiatrist',
  'psychologist',
  'coach']
), asyncHandler(getWalletTransactionsController));

/**
 * @openapi
 * /wallet/apply:
 *   post:
 *     summary: Apply wallet credits to a booking
 */
router.post('/apply', requireAuth, requireRole([
  'patient',
  'therapist',
  'psychiatrist',
  'psychologist',
  'coach']
), asyncHandler(applyWalletToPaymentController));

export default router;
