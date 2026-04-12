import { getLivePricingController } from '../controllers/pricing.controller';
import { submitCorporateDemoRequestController } from '../controllers/corporate.controller';
import { Router } from 'express';
import { asyncHandler } from '../middleware/validate.middleware';
import authRoutes from './auth.routes';
import patientRoutes from './patient.routes';
import therapistRoutes from './therapist.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';
import presenceRoutes from './presence.routes';
import dashboardRoutes from './dashboard.routes';
import paymentRoutes from './payment.routes';
import subscriptionRoutes from './subscription.routes';
import webhookRoutes from './webhook.routes';
import leadRoutes from './lead.routes';
import leadResponseRoutes from './lead-response.routes';
import patientV1Routes from './patient-v1.routes';
import patientSelfRoutes from './patient-self.routes';
import certificationRoutes from './certification.routes';
import landingRoutes from './landing.routes';
import chatRoutes from './chat.routes';
import riskAnalyticsRoutes from './riskAnalytics.routes';
import psychiatristRoutes from './psychiatrist.routes';
// import psychologistRoutes from './psychologist.routes'; // Commented out - not implementing psychologist functionality
import corporateRoutes from './corporate.routes';
import ssoRoutes from './sso.routes';
import pricingRoutes from './pricing.routes';
import patientJourneyRoutes from './patient-journey.routes';
import freeScreeningRoutes from './free-screening.routes';
import gpsRoutes from './gps.routes';
import providerRoutes from './provider.routes';
import soundRoutes from './sound.routes';
import providerDashboardRoutes from './provider-dashboard.routes';
import gameRoutes from './game.routes';
import walletRoutes from './wallet.routes';
import groupTherapyRoutes from './group-therapy.routes';
import legalRoutes from './legal.routes';
import qrRoutes from './qr.routes';
import invoiceRoutes from './invoice.routes';
import institutionalAgreementRoutes from './institutional-agreement.routes';


const router = Router();
import sharedRoutes from './shared.routes';
// Defensive public pricing route for landing page
router.get('/public/pricing/:category', getLivePricingController);
router.post('/corporate/demo-request', asyncHandler(submitCorporateDemoRequestController));

// Mount shared routes for plans and other public data
router.use('/v1/shared', sharedRoutes);

router.get('/health', (_req, res) => {
	res.status(200).json({
		status: 'ok',
		server: 'running',
		ok: true,
		service: 'manas360-backend',
		timestamp: new Date().toISOString(),
	});
});


router.use('/auth', authRoutes);
router.use('/v1/auth', authRoutes);
// Mount specific public group-therapy routes before broad /v1 routes.
router.use('/v1/group-therapy', groupTherapyRoutes);
router.use('/v1', patientV1Routes);
router.use('/patient', patientSelfRoutes);
router.use('/v1/patient', patientSelfRoutes);
// Backward-compatibility alias for legacy singular subscription endpoints.
router.use('/v1/subscription', patientSelfRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/patients', patientRoutes);
router.use('/v1/therapists', therapistRoutes);
router.use('/v1/therapist', therapistRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/corporate', corporateRoutes);
router.use('/v1/presence', presenceRoutes);
router.use('/v1/therapist/dashboard', dashboardRoutes);
router.use('/v1/therapists/dashboard', dashboardRoutes);
router.use('/v1/psychiatrist', psychiatristRoutes);
// router.use('/v1/psychologist', psychologistRoutes); // Commented out - not implementing psychologist functionality
router.use('/v1/provider', providerRoutes);
router.use('/v1/payments', paymentRoutes);
router.use('/v1/sso', ssoRoutes);
router.use('/v1/subscriptions', subscriptionRoutes);
router.use('/v1/pricing', pricingRoutes);
router.use('/pricing', pricingRoutes);
router.use('/v1/patient-journey', patientJourneyRoutes);
router.use('/v1', freeScreeningRoutes);
router.use('/v1/leads', leadRoutes);
router.use('/v1', leadResponseRoutes);
router.use('/v1', providerDashboardRoutes);
router.use('/certifications', certificationRoutes);
router.use('/v1/certifications', certificationRoutes);
router.use('/landing', landingRoutes);
router.use('/v1/landing', landingRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/chat', chatRoutes);
router.use('/sounds', soundRoutes);
router.use('/v1/sounds', soundRoutes);
// Mount GPS before broad /v1 middleware routes so internal bridge can remain unauthenticated.
router.use('/v1/gps', gpsRoutes);
router.use('/v1', riskAnalyticsRoutes);
// Mount game and wallet routes for patient-facing game features and wallet APIs
router.use('/v1/game', gameRoutes);
router.use('/v1/wallet', walletRoutes);
router.use('/v1/legal', legalRoutes);
router.use('/v1/qr', qrRoutes);
router.use('/v1/invoices', invoiceRoutes);
router.use('/agreements', institutionalAgreementRoutes);
router.use('/v1/agreements', institutionalAgreementRoutes);

export default router;

