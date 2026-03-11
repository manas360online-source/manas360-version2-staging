import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	skip: () => env.nodeEnv === 'development' || env.disableAuthRateLimit,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many authentication attempts. Try again in 15 minutes.',
	},
});

export const userSessionRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many session management requests. Try again in 15 minutes.',
	},
});

export const paymentRateLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many payment requests. Try again shortly.',
	},
});

export const webhookRateLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 120,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many webhook requests.',
	},
});

export const screeningPublicRateLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 25,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many screening requests. Please try again in a few minutes.',
	},
});

export const adminAnalyticsExportRateLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req) => String(req.auth?.userId || req.ip),
	message: {
		success: false,
		message: 'Too many analytics export requests. Try again in a few minutes.',
	},
});

