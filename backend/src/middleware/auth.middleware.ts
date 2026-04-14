import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { verifyAccessToken } from '../utils/jwt';
import { hasPendingLegalAcceptance } from '../services/legal-compliance.service';

const getBearerToken = (authorizationHeader?: string): string | null => {
	if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
		return null;
	}

	return authorizationHeader.slice(7);
};

const isLegalAcceptanceBypassRoute = (path: string): boolean => {
	const normalized = String(path || '').toLowerCase();
	if (!normalized) return false;

	return (
		normalized.includes('/v1/auth/me')
		|| normalized.includes('/v1/auth/refresh')
		|| normalized.includes('/v1/auth/logout')
		|| normalized.includes('/v1/auth/sessions')
		|| normalized.includes('/v1/auth/legal/required')
		|| normalized.includes('/v1/auth/legal/accept')
	);
};

export const requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
	const bearerToken = getBearerToken(req.headers.authorization);
	const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.access_token;
	const accessToken = bearerToken ?? cookieToken;

	if (!accessToken) {
		console.warn(`[AUTH FAILED] No access token found. 
      URL: ${req.originalUrl}
      Method: ${req.method}
      Auth Header: ${req.headers.authorization ? 'Present' : 'Missing'}
      Cookies: ${Object.keys((req as any).cookies || {}).join(', ')}`);
		next(new AppError('Authentication required', 401));
		return;
	}

	try {
		const payload = verifyAccessToken(accessToken);
		const requestWithAuth = req as Request & { auth?: { userId: string; sessionId?: string; jti?: string } };

		requestWithAuth.auth = {
			userId: payload.sub,
			sessionId: payload.sessionId,
			jti: payload.jti,
		};

		if (!isLegalAcceptanceBypassRoute(req.originalUrl)) {
			try {
				const pendingLegalAcceptance = await hasPendingLegalAcceptance(payload.sub);
				if (pendingLegalAcceptance) {
					next(new AppError('Legal re-acceptance required', 428, {
						code: 'LEGAL_REACCEPTANCE_REQUIRED',
						message: 'Accept the latest legal documents to continue.',
					}));
					return;
				}
			} catch (legalCheckError) {
				if (process.env.NODE_ENV === 'development') {
					console.warn('[AUTH] Skipping legal acceptance check due to DB unavailability in development.', legalCheckError);
				} else {
					throw legalCheckError;
				}
			}
		}

		next();
	} catch (error) {
		console.log(`[AUTH FAILED] Token verification failed. URL: ${req.originalUrl}, Error:`, error);
		next(new AppError('Invalid or expired access token', 401));
	}
};

export const requireCsrf = (req: Request, _res: Response, next: NextFunction): void => {
	const csrfFromHeader = req.headers['x-csrf-token'];
	const csrfToken = typeof csrfFromHeader === 'string' ? csrfFromHeader : undefined;
	const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[env.csrfCookieName];

	if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
		console.warn(`[CSRF FAILED] Token mismatch or missing. 
      URL: ${req.originalUrl}
      Header CSRF: ${csrfToken ? 'Present' : 'Missing'}
      Cookie CSRF: ${cookieToken ? 'Present' : 'Missing'}
      Match: ${csrfToken === cookieToken}`);
		next(new AppError('Invalid CSRF token', 403));
		return;
	}

	next();
};

