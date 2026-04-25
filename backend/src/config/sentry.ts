import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export const initSentry = () => {
	const SENTRY_DSN = process.env.SENTRY_DSN;

	if (!SENTRY_DSN) {
		console.warn('[Sentry] SENTRY_DSN is not defined. Sentry error tracking is disabled.');
		return;
	}

	try {
		Sentry.init({
			dsn: SENTRY_DSN,
			environment: process.env.NODE_ENV || 'development',
			integrations: [
				nodeProfilingIntegration(),
			],
			// Performance Monitoring
			tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0, 
			profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
		});
		
		console.log('[Sentry] Successfully initialized');
	} catch (error) {
		console.error('[Sentry] Failed to initialize:', error);
	}
};
