import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { requireAuth } from './middleware/auth.middleware';
import { requireRole } from './middleware/rbac.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import apiRoutes from './routes';

import client from 'prom-client';
import * as Sentry from '@sentry/node';
import { initSentry } from './config/sentry';
import { logger } from './utils/logger';
import { prisma } from './config/db';
import path from 'path';
path.resolve(process.cwd(), '../frontend/dist')

// Initialize Sentry before anything else
initSentry();

const app = express();

// Set up Sentry error handler early
Sentry.setupExpressErrorHandler(app);

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy as any);
app.use(helmet());

const localDevOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
];

const normalizeOrigin = (origin: string): string => origin.replace(/\/+$/, '');

const productionOrigins = [
	'https://www.manas360.com',
	'https://manas360.com',
	'http://www.manas360.com',
];

const allowedCorsOrigins = Array.from(new Set([
	...env.corsOrigins,
	...(env.isDevelopment ? localDevOrigins : []),
	...productionOrigins,
].map(normalizeOrigin)));

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedCorsOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    logger.warn(`Blocked by CORS origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-csrf-token',
    'x-requested-with',
  ],
  credentials: true,
  optionsSuccessStatus: 204,
};

// Defensive normalization in case upstream/middleware appends duplicate origin values.
app.use((_req, res, next) => {
	const headerValue = res.getHeader('Access-Control-Allow-Origin');

	if (typeof headerValue === 'string' && headerValue.includes(',')) {
		const firstOrigin = headerValue
			.split(',')
			.map((value) => value.trim())
			.find((value) => value.length > 0);

		if (firstOrigin) {
			res.setHeader('Access-Control-Allow-Origin', firstOrigin);
		}
	}

	next();
});

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
    res.status(200).json({ status: 'OK', service: 'manas360-backend' });
});



app.use('/uploads', cors(corsOptions), express.static(path.join(process.cwd(), 'uploads')));

// Readiness probe for AWS target groups/containers.
app.get('/ready', async (_req, res) => {
	try {
		await prisma.$queryRawUnsafe('SELECT 1');
		res.status(200).json({ status: 'READY' });
	} catch (error) {
		res.status(503).json({ status: 'NOT_READY' });
	}
});

app.use(env.apiPrefix, cors(corsOptions), apiRoutes);

// Serve React frontend build in production
const frontendDistPath = path.resolve(process.cwd(), '../frontend/dist');

app.use(express.static(frontendDistPath));

// React SPA fallback - API/uploads/health/ready/metrics ko skip karega
app.get('*', (req, res, next) => {
	const skipPaths = [
		env.apiPrefix,
		'/uploads',
		'/health',
		'/ready',
		'/metrics',
	];

	if (skipPaths.some((prefix) => req.path.startsWith(prefix))) {
		return next();
	}

	res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Prometheus metrics endpoint
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 } as any);
app.get('/metrics', requireAuth, requireRole(['admin', 'superadmin']), async (_req, res) => {
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

