import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { screeningPublicRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
	getMyFreeScreeningHistoryController,
	startFreeScreeningForPatientController,
	startFreeScreeningPublicController,
	submitFreeScreeningForPatientController,
	submitFreeScreeningPublicController,
} from '../controllers/free-screening.controller';
import {
	listAssignedQuestionsForPatientController,
	submitProviderAssignedAnswerController,
} from '../controllers/free-screening-provider.controller';

const router = Router();

router.post('/free-screening/start', screeningPublicRateLimiter, asyncHandler(startFreeScreeningPublicController));
router.post('/free-screening/:attemptId/submit', screeningPublicRateLimiter, asyncHandler(submitFreeScreeningPublicController));

router.post('/free-screening/start/me', requireAuth, requireRole('patient'), asyncHandler(startFreeScreeningForPatientController));
router.post('/free-screening/:attemptId/submit/me', requireAuth, requireRole('patient'), asyncHandler(submitFreeScreeningForPatientController));
router.get('/free-screening/history', requireAuth, requireRole('patient'), asyncHandler(getMyFreeScreeningHistoryController));
router.get('/free-screening/assigned/me', requireAuth, requireRole('patient'), asyncHandler(listAssignedQuestionsForPatientController));
router.post('/free-screening/assigned/:assignmentId/submit', requireAuth, requireRole('patient'), asyncHandler(submitProviderAssignedAnswerController));

export default router;
