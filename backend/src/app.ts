import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import apiRoutes from './routes';

import client from 'prom-client';
import * as Sentry from '@sentry/node';
import { initSentry } from './config/sentry';
import { logger } from './utils/logger';

// Initialize Sentry before anything else
initSentry();

const app = express();

// Set up Sentry error handler early
Sentry.setupExpressErrorHandler(app);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
const allowedCorsOrigins = Array.from(new Set([
	...env.corsOrigins,
	'https://www.manas360.com',
	'https://manas360.com',
	'http://www.manas360.com',
]));

app.use(cors({
	origin: (origin, callback) => {
		if (!origin || allowedCorsOrigins.includes(origin)) {
			return callback(null, true);
		}

		logger.warn(`Blocked by CORS origin: ${origin}`);
		return callback(new Error('Not allowed by CORS'), false);
	},
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: [
		'Content-Type',
		'Authorization',
		'x-csrf-token',
		'x-requested-with',
	],
	credentials: true,
	optionsSuccessStatus: 204,
}));

// app.options('*', cors());
app.use(
	express.json({
		limit: '1mb',
		verify: (req, _res, buf) => {
			(req as any).rawBody = buf.toString('utf8');
		},
	}),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(env.apiPrefix, apiRoutes);

// Prometheus metrics endpoint
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 } as any);
app.get('/metrics', async (_req, res) => {
	try {
		const metrics = await client.register.metrics();
		res.set('Content-Type', client.register.contentType);
		res.send(metrics);
	} catch (err) {
		res.status(500).send('metrics error');
	}
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

