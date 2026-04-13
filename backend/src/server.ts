import 'dotenv/config';
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';
import initSocket from './socket';
import { startAnalyticsRollup } from './jobs/analyticsRollup.job';
import './jobs/admin-analytics-export.worker';
import { startDailyMoodPredictionJob } from './cron/dailyMoodPrediction';
import { startChatRetentionJob } from './jobs/chatRetention.job';
import { initSubscriptionCron } from './jobs/subscriptionCron';
import { initProviderLeadCron } from './cron/providerLeadCron';
import { startPatientSharedReportCleanupJob } from './jobs/patientSharedReportCleanup.job';
import { ensureSsoTables } from './services/sso.service';
import { setSocketIO } from './routes/gps.routes';
import { reconcilePendingPayments } from './cron/paymentReconciliation';
import { initLeadDistributionCrons } from './cron/lead-distribution.cron';
import { initializePhonePeTokenRefresh, cleanupPhonePeTokenRefresh } from './services/phonepe.service';
import { calculateLiveMetrics } from './controllers/admin-metrics.controller';
import { io as socketIO } from './socket';
import { cleanupIdempotencyKeys } from './services/idempotency.service';
import { ensureSuperadminFromEnv } from './services/superadmin-bootstrap.service';

const startServer = async (): Promise<void> => {
	await connectDatabase();
	await ensureSuperadminFromEnv();

	// Initialize PhonePe OAuth token refresh (proactive background refresh)
	await initializePhonePeTokenRefresh();

	// ensure SSO tables exist
	void ensureSsoTables().catch((err) => {
			const code = String((err as any)?.code || '');
			const message = String((err as any)?.message || '').toLowerCase();
			const transientSocketClose = code === 'UND_ERR_SOCKET' || message.includes('other side closed');
			if (transientSocketClose) {
				console.warn('SSO table init transient socket closure; scheduling retry');
				setTimeout(() => {
					void ensureSsoTables().catch((retryErr) => {
						console.error('SSO table retry failed', retryErr);
					});
				}, 5000);
				return;
			}
			console.error('SSO table init failed', err);
		});

	const server = app.listen(env.port, () => {
		console.log(`Server running on port ${env.port}`);
	});

	server.on('error', (error: NodeJS.ErrnoException) => {
		if (error.code === 'EADDRINUSE') {
			console.error(`Port ${env.port} is already in use.`);
			console.error('Ensure only one backend process is running and your container/task port mapping is correct.');
			process.exit(1);
		}
	});

	// initialize socket.io (non-blocking)
	void initSocket(server).then((io) => {
		console.log('Socket server initialized');
		if (io) setSocketIO(io);
	}).catch((err) => console.error('Socket init failed', err));

	if (env.enableBackgroundJobs) {
		// start analytics rollup job
		// void startAnalyticsRollup(); // Commented out - references missing patient_sessions table
		startDailyMoodPredictionJob();
		startChatRetentionJob();
		initSubscriptionCron();
		initProviderLeadCron();
		initLeadDistributionCrons();
		// startPatientSharedReportCleanupJob(); // Commented out - references psychologist_reports table

		// PhonePe reconciliation CRON (every 30s)
		setInterval(() => {
			reconcilePendingPayments().catch(err => console.error('[CRON] Reconciliation failed', err));
		}, 30000);

		// Real-time Metrics Push (every 30s) - can be disabled via env.disableMetricsCron
		if (!env.disableMetricsCron) {
			setInterval(async () => {
				try {
					const metrics = await calculateLiveMetrics();
					if (socketIO) {
						socketIO.to('admin-room').emit('metrics-update', metrics);
					}
				} catch (err) {
					console.error('[CRON] Metrics push failed', err);
				}
			}, 30000);
		} else {
			console.log('Metrics cron is disabled via DISABLE_METRICS_CRON');
		}

		// Financial idempotency retention cleanup (every 6h, retain 7 days).
		setInterval(() => {
			cleanupIdempotencyKeys(7).catch((err) => {
				console.error('[CRON] Idempotency cleanup failed', err);
			});
		}, 6 * 60 * 60 * 1000);
	} else {
		console.log('Background jobs are disabled via ENABLE_BACKGROUND_JOBS=false');
	}

	const shutdown = async (signal: string): Promise<void> => {
		console.log(`${signal} received. Shutting down gracefully...`);

		cleanupPhonePeTokenRefresh();
		server.close(async () => {
			await disconnectDatabase();
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
		await disconnectDatabase();
		process.exit(1);
	});
};

void startServer();
