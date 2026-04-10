import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdminPolicy, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import { downloadLegalDocumentController } from '../controllers/admin.controller';

const router = Router();

// Compatibility endpoint used by frontend admin pages.
router.get(
  '/documents/:id',
  requireAuth,
  requireRole(['admin', 'complianceofficer']),
  requireAdminPolicy('compliance.manage'),
  asyncHandler(downloadLegalDocumentController)
);

export default router;
