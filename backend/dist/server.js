"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const socket_1 = __importDefault(require("./socket"));
require("./jobs/admin-analytics-export.worker");
const dailyMoodPrediction_1 = require("./cron/dailyMoodPrediction");
const chatRetention_job_1 = require("./jobs/chatRetention.job");
const subscriptionCron_1 = require("./jobs/subscriptionCron");
const providerLeadCron_1 = require("./cron/providerLeadCron");
const sso_service_1 = require("./services/sso.service");
const sso_service_2 = require("./services/sso.service");
const gps_routes_1 = require("./routes/gps.routes");
const paymentReconciliation_1 = require("./cron/paymentReconciliation");
const lead_distribution_cron_1 = require("./cron/lead-distribution.cron");
const startServer = async () => {
    await (0, db_1.connectDatabase)();
    // ensure SSO tables exist
    void (0, sso_service_1.ensureSsoTables)()
        .then(async () => {
        try {
            // create example tenants for quick testing (no secrets included)
            await (0, sso_service_2.createOrEnsureTenant)((0, sso_service_2.googleTemplate)({ key: 'sso-google-demo', name: 'Google Workspace (demo)', domain: 'techcorp-india.com' }));
            await (0, sso_service_2.createOrEnsureTenant)((0, sso_service_2.azureTemplate)({ tenantId: 'common', key: 'sso-azure-demo', name: 'Azure AD (demo)', domain: 'techcorp-india.com' }));
            await (0, sso_service_2.createOrEnsureTenant)((0, sso_service_2.oktaTemplate)({ key: 'sso-okta-demo', name: 'Okta (demo)', issuer: 'https://example.okta.com/oauth2/default', domain: 'techcorp-india.com' }));
        }
        catch (err) {
            console.error('SSO tenant seed failed', err);
        }
    })
        .catch((err) => console.error('SSO table init failed', err));
    const server = app_1.default.listen(env_1.env.port, () => {
        console.log(`Server running on port ${env_1.env.port}`);
    });
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${env_1.env.port} is already in use.`);
            console.error('On macOS this is often ControlCenter (AirPlay Receiver) on port 5000.');
            console.error('Disable AirPlay Receiver in System Settings > General > AirDrop & Handoff, then restart backend.');
            process.exit(1);
        }
    });
    // initialize socket.io (non-blocking)
    void (0, socket_1.default)(server).then((io) => {
        console.log('Socket server initialized');
        if (io)
            (0, gps_routes_1.setSocketIO)(io);
    }).catch((err) => console.error('Socket init failed', err));
    // start analytics rollup job
    // void startAnalyticsRollup(); // Commented out - references missing patient_sessions table
    (0, dailyMoodPrediction_1.startDailyMoodPredictionJob)();
    (0, chatRetention_job_1.startChatRetentionJob)();
    (0, subscriptionCron_1.initSubscriptionCron)();
    (0, providerLeadCron_1.initProviderLeadCron)();
    (0, lead_distribution_cron_1.initLeadDistributionCrons)();
    // startPatientSharedReportCleanupJob(); // Commented out - references psychologist_reports table
    // PhonePe reconciliation CRON (every 30s)
    setInterval(() => {
        (0, paymentReconciliation_1.reconcilePendingPayments)().catch(err => console.error('[CRON] Reconciliation failed', err));
    }, 30000);
    const shutdown = async (signal) => {
        console.log(`${signal} received. Shutting down gracefully...`);
        server.close(async () => {
            await (0, db_1.disconnectDatabase)();
            process.exit(0);
        });
    };
    process.on('SIGINT', () => {
        void shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
        void shutdown('SIGTERM');
    });
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled Rejection:', reason);
    });
    process.on('uncaughtException', async (error) => {
        console.error('Uncaught Exception:', error);
        await (0, db_1.disconnectDatabase)();
        process.exit(1);
    });
};
void startServer();
