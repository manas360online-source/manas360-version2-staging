import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTherapistRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
    listProviderExtraQuestionsController,
    createProviderExtraQuestionController,
    assignProviderQuestionController,
    listProviderQuestionAssignmentsController,
} from '../controllers/free-screening-provider.controller';

const router = Router();

router.get('/me/free-screening/questions', requireAuth, requireTherapistRole, asyncHandler(listProviderExtraQuestionsController));
router.post('/me/free-screening/questions', requireAuth, requireTherapistRole, asyncHandler(createProviderExtraQuestionController));
router.post('/me/free-screening/questions/:questionId/assign', requireAuth, requireTherapistRole, asyncHandler(assignProviderQuestionController));
router.get('/me/free-screening/assignments', requireAuth, requireTherapistRole, asyncHandler(listProviderQuestionAssignmentsController));

export default router;
