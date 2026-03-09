import { Router } from 'express';
import ssoController from '../controllers/sso.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenantAdmin } from '../middleware/tenantAdmin.middleware';
const router = Router();

// Tenant management (admin)
router.get('/tenants', ssoController.listTenantsController);
router.get('/tenant/me', requireAuth, ssoController.getMyTenantController);
router.post('/tenants', ssoController.createTenantController);
router.post('/tenants/template/azure', requireAuth, requireTenantAdmin(), ssoController.createAzureTemplateTenantController);
router.post('/tenants/template/google', requireAuth, requireTenantAdmin(), ssoController.createGoogleTemplateTenantController);
router.post('/tenants/template/okta', requireAuth, requireTenantAdmin(), ssoController.createOktaTemplateTenantController);

// OIDC flow endpoints
router.get('/:tenantKey/authorize', ssoController.authorizeController);
router.get('/:tenantKey/callback', ssoController.callbackController);
// Tenant-scoped management
router.patch('/:tenantKey', requireAuth, requireTenantAdmin(), ssoController.updateTenantController);
router.post('/:tenantKey/test', requireAuth, requireTenantAdmin(), ssoController.testTenantController);
router.post('/:tenantKey/invite', requireAuth, requireTenantAdmin(), ssoController.promoteUserController);

export default router;
