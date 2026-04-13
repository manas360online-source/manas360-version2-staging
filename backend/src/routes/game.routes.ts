import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
  getGameEligibilityController,
  playGameController,
  getGameWinnersController,
} from '../controllers/game.controller';

const router = Router();

/**
 * @openapi
 * /game/eligibility:
 *   get:
 *     summary: Check cricket game eligibility
 */
router.get('/eligibility', requireAuth, requireRole('patient'), asyncHandler(getGameEligibilityController));

/**
 * @openapi
 * /game/play:
 *   post:
 *     summary: Play cricket game
 */
router.post('/play', requireAuth, requireRole('patient'), asyncHandler(playGameController));

/**
 * @openapi
 * /game/winners:
 *   get:
 *     summary: Get recent winners
 */
router.get('/winners', /*requireAuth, requireRole('patient'),*/ asyncHandler(getGameWinnersController));

export default router;
