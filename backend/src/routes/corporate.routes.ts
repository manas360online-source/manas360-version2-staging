import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware';
import { requireCorporateMemberAccess } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
  bulkUploadCorporateEmployeesController,
  createCorporateCampaignController,
  createCorporateEapQrController,
  createCorporatePaymentMethodController,
  createCorporateProgramController,
  createCorporateWorkshopController,
  getCorporateCampaignsController,
  getCorporateDashboardController,
  getCorporateEmployeesController,
  getCorporateInvoicesController,
  getCorporatePaymentMethodsController,
  getCorporateSessionAllocationsController,
  getCorporateEapQrAnalyticsController,
  listCorporateCompaniesController,
  getCorporateProgramsController,
  getCorporateReportsController,
  getCorporateRoiController,
  getCorporateSettingsController,
  getCorporateWorkshopsController,
  updateCorporatePaymentMethodController,
  updateCorporateSessionAllocationsController,
  updateCorporateSettingsController,
  submitCorporateDemoRequestController,
  requestCorporateOtpController,
  createCorporateAccountController,
} from '../controllers/corporate.controller';

const router = Router();
const corporateUpload = multer({ storage: multer.memoryStorage() });

router.post('/public/request-demo', asyncHandler(submitCorporateDemoRequestController));
router.post('/public/request-otp', asyncHandler(requestCorporateOtpController));
router.post('/public/create-account', asyncHandler(createCorporateAccountController));

router.get('/dashboard', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporateDashboardController));
router.get('/companies', requireAuth, requireCorporateMemberAccess, asyncHandler(listCorporateCompaniesController));
router.get('/reports', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporateReportsController));
router.get('/programs', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporateProgramsController));
router.post('/programs', requireAuth, requireCorporateMemberAccess, asyncHandler(createCorporateProgramController));
router.get('/workshops', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporateWorkshopsController));
router.post('/workshops', requireAuth, requireCorporateMemberAccess, asyncHandler(createCorporateWorkshopController));
router.get('/campaigns', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporateCampaignsController));
router.post('/campaigns', requireAuth, requireCorporateMemberAccess, asyncHandler(createCorporateCampaignController));
router.get('/qr/eap/analytics', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporateEapQrAnalyticsController));
router.post('/qr/eap/generate', requireAuth, requireCorporateMemberAccess, asyncHandler(createCorporateEapQrController));
router.get('/employees', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporateEmployeesController));
router.get('/invoices', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporateInvoicesController));
router.get('/payment-methods', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporatePaymentMethodsController));
router.post('/payment-methods', requireAuth, requireCorporateMemberAccess, asyncHandler(createCorporatePaymentMethodController));
router.patch('/payment-methods/:id', requireAuth, requireCorporateMemberAccess, asyncHandler(updateCorporatePaymentMethodController));
router.get('/session-allocation', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporateSessionAllocationsController));
router.patch('/session-allocation', requireAuth, requireCorporateMemberAccess, asyncHandler(updateCorporateSessionAllocationsController));
router.get('/roi', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporateRoiController));
router.get('/settings', requireAuth, requireCorporateMemberAccess, asyncHandler(getCorporateSettingsController));
router.patch('/settings', requireAuth, requireCorporateMemberAccess, asyncHandler(updateCorporateSettingsController));
router.post('/employees/bulk-upload', requireAuth, requireCorporateMemberAccess, corporateUpload.single('file'), asyncHandler(bulkUploadCorporateEmployeesController));

// Agreement & Template Endpoints
import {
  createInstitutionalAgreementController,
  getInstitutionalAgreementStatusController,
  listAgreementTemplatesController,
  listInstitutionalAgreementsController,
  sendInstitutionalAgreementController,
} from '../controllers/institutional-agreement.controller';

router.get('/agreement-templates', requireAuth, requireCorporateMemberAccess, asyncHandler(listAgreementTemplatesController));
router.get('/agreements', requireAuth, requireCorporateMemberAccess, asyncHandler(listInstitutionalAgreementsController));
router.post('/agreements', requireAuth, requireCorporateMemberAccess, asyncHandler(createInstitutionalAgreementController));
router.post('/agreements/:id/send', requireAuth, requireCorporateMemberAccess, asyncHandler(sendInstitutionalAgreementController));
router.get('/agreements/:id/status', requireAuth, requireCorporateMemberAccess, asyncHandler(getInstitutionalAgreementStatusController));

export default router;
