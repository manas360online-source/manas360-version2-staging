import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
	acknowledgeEscalationController,
	getCurrentRiskController,
	getMoodAccuracyController,
	getMoodHistoryController,
	getMoodPredictionController,
	getOpenEscalationsController,
	getRiskHistoryController,
	resolveEscalationController,
} from '../controllers/riskAnalytics.controller';

const router = Router();

const riskAccess = [
	requireAuth,
	requireRole(['patient', 'therapist', 'psychologist', 'psychiatrist', 'coach', 'admin', 'superadmin']),
] as const;

router.get('/risk/:userId/current', ...riskAccess, asyncHandler(getCurrentRiskController));
router.get('/risk/:userId/history', ...riskAccess, asyncHandler(getRiskHistoryController));

router.get('/mood/:userId/prediction', ...riskAccess, asyncHandler(getMoodPredictionController));
router.get('/mood/:userId/history', ...riskAccess, asyncHandler(getMoodHistoryController));
router.get('/mood/:userId/accuracy', ...riskAccess, asyncHandler(getMoodAccuracyController));

router.get('/escalations/open', ...riskAccess, asyncHandler(getOpenEscalationsController));
router.post('/escalations/:id/acknowledge', ...riskAccess, asyncHandler(acknowledgeEscalationController));
router.post('/escalations/:id/resolve', ...riskAccess, asyncHandler(resolveEscalationController));

export default router;
