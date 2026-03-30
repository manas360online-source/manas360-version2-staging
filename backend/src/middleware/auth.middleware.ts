import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { verifyAccessToken } from '../utils/jwt';

const getBearerToken = (authorizationHeader?: string): string | null => {
	if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
		return null;
	}

	return authorizationHeader.slice(7);
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
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

