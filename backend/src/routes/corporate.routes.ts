import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
  bulkUploadCorporateEmployeesController,
  createCorporateCampaignController,
  createCorporatePaymentMethodController,
  createCorporateProgramController,
  createCorporateWorkshopController,
  getCorporateCampaignsController,
  getCorporateDashboardController,
  getCorporateEmployeesController,
  getCorporateInvoicesController,
  getCorporatePaymentMethodsController,
  getCorporateSessionAllocationsController,
  listCorporateCompaniesController,
  getCorporateProgramsController,
  getCorporateReportsController,
  getCorporateRoiController,
  getCorporateSettingsController,
  getCorporateWorkshopsController,
  updateCorporatePaymentMethodController,
  updateCorporateSessionAllocationsController,
  updateCorporateSettingsController,
} from '../controllers/corporate.controller';

const router = Router();
const corporateUpload = multer({ storage: multer.memoryStorage() });

router.get('/dashboard', requireAuth, requireRole('admin'), asyncHandler(getCorporateDashboardController));
router.get('/companies', requireAuth, requireRole('admin'), asyncHandler(listCorporateCompaniesController));
router.get('/reports', requireAuth, requireRole('admin'), asyncHandler(getCorporateReportsController));
router.get('/programs', requireAuth, requireRole('admin'), asyncHandler(getCorporateProgramsController));
router.post('/programs', requireAuth, requireRole('admin'), asyncHandler(createCorporateProgramController));
router.get('/workshops', requireAuth, requireRole('admin'), asyncHandler(getCorporateWorkshopsController));
router.post('/workshops', requireAuth, requireRole('admin'), asyncHandler(createCorporateWorkshopController));
router.get('/campaigns', requireAuth, requireRole('admin'), asyncHandler(getCorporateCampaignsController));
router.post('/campaigns', requireAuth, requireRole('admin'), asyncHandler(createCorporateCampaignController));
router.get('/employees', requireAuth, requireRole('admin'), asyncHandler(getCorporateEmployeesController));
router.get('/invoices', requireAuth, requireRole('admin'), asyncHandler(getCorporateInvoicesController));
router.get('/payment-methods', requireAuth, requireRole('admin'), asyncHandler(getCorporatePaymentMethodsController));
router.post('/payment-methods', requireAuth, requireRole('admin'), asyncHandler(createCorporatePaymentMethodController));
router.patch('/payment-methods/:id', requireAuth, requireRole('admin'), asyncHandler(updateCorporatePaymentMethodController));
router.get('/session-allocation', requireAuth, requireRole('admin'), asyncHandler(getCorporateSessionAllocationsController));
router.patch('/session-allocation', requireAuth, requireRole('admin'), asyncHandler(updateCorporateSessionAllocationsController));
router.get('/roi', requireAuth, requireRole('admin'), asyncHandler(getCorporateRoiController));
router.get('/settings', requireAuth, requireRole('admin'), asyncHandler(getCorporateSettingsController));
router.patch('/settings', requireAuth, requireRole('admin'), asyncHandler(updateCorporateSettingsController));
router.post('/employees/bulk-upload', requireAuth, requireRole('admin'), corporateUpload.single('file'), asyncHandler(bulkUploadCorporateEmployeesController));

export default router;
