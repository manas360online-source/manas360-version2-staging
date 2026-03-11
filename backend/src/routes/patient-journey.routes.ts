import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
	getJourneyRecommendationControllerV2,
	selectJourneyPathwayController,
	submitClinicalJourneyController,
	submitQuickScreeningController,
} from '../controllers/patient-journey.controller';

const router = Router();

router.get('/recommendation', requireAuth, requireRole('patient'), asyncHandler(getJourneyRecommendationControllerV2));
router.post('/select-pathway', requireAuth, requireRole('patient'), asyncHandler(selectJourneyPathwayController));
router.post('/quick-screening', requireAuth, requireRole('patient'), asyncHandler(submitQuickScreeningController));
router.post('/clinical-assessment', requireAuth, requireRole('patient'), asyncHandler(submitClinicalJourneyController));

export default router;
