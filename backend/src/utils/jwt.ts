import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtAccessPayload, JwtRefreshPayload, TokenPair } from '../types/auth.types';

type JwtValue = string | jwt.JwtPayload;

const assertStringToken = (value: JwtValue): jwt.JwtPayload => {
	if (typeof value === 'string') {
		throw new Error('Invalid JWT payload');
	}

	return value;
};

export const createAccessToken = (payload: Omit<JwtAccessPayload, 'type'> & { permissions?: Record<string, boolean> }): string => {
	return jwt.sign(
		{ ...payload, type: 'access' },
		env.jwtAccessSecret,
		{ expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions['expiresIn'] },
	);
};

export const createRefreshToken = (payload: Omit<JwtRefreshPayload, 'type'>): string => {
	return jwt.sign(
		{ ...payload, type: 'refresh' },
		env.jwtRefreshSecret,
		{ expiresIn: env.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'] },
	);
};

export const verifyAccessToken = (token: string): JwtAccessPayload => {
	const decoded = assertStringToken(jwt.verify(token, env.jwtAccessSecret));

	if (decoded.type !== 'access') {
		throw new Error('Invalid access token type');
	}

	return decoded as JwtAccessPayload;
};

export const verifyRefreshToken = (token: string): JwtRefreshPayload => {
	const decoded = assertStringToken(jwt.verify(token, env.jwtRefreshSecret));

	if (decoded.type !== 'refresh') {
		throw new Error('Invalid refresh token type');
	}

	return decoded as JwtRefreshPayload;
};

export const createTokenPair = (userId: string, sessionId: string, permissions?: Record<string, boolean>): TokenPair => {
	const refreshJti = randomUUID();
	const accessJti = randomUUID();

	const accessToken = createAccessToken({
		sub: userId,
		sessionId,
		jti: accessJti,
		...(permissions ? { permissions } : {}),
	});

	const refreshToken = createRefreshToken({
		sub: userId,
		sessionId,
		jti: refreshJti,
	});

	return {
		accessToken,
		refreshToken,
		refreshJti,
		sessionId,
	};
};

