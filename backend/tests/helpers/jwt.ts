import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';

export interface TestTokenPayload {
	userId: string;
	sessionId: string;
	jti: string;
	iat: number;
	exp: number;
}

/**
 * Generate a test JWT token for admin user
 */
export const generateAdminToken = (userId: string): string => {
	return jwt.sign(
		{
			userId,
			sessionId: 'test-session-id',
			jti: 'test-jti',
		},
		JWT_ACCESS_SECRET,
		{ expiresIn: '24h' }
	);
};

/**
 * Generate a test JWT token for patient user
 */
export const generatePatientToken = (userId: string): string => {
	return jwt.sign(
		{
			userId,
			sessionId: 'test-session-id',
			jti: 'test-jti',
		},
		JWT_ACCESS_SECRET,
		{ expiresIn: '24h' }
	);
};

/**
 * Generate a test JWT token for therapist user
 */
export const generateTherapistToken = (userId: string): string => {
	return jwt.sign(
		{
			userId,
			sessionId: 'test-session-id',
			jti: 'test-jti',
		},
		JWT_ACCESS_SECRET,
		{ expiresIn: '24h' }
	);
};

/**
 * Generate an expired JWT token
 */
export const generateExpiredToken = (userId: string): string => {
	return jwt.sign(
		{
			userId,
			sessionId: 'test-session-id',
			jti: 'test-jti',
		},
		JWT_ACCESS_SECRET,
		{ expiresIn: '-1h' } // Expired 1 hour ago
	);
};

/**
 * Generate an invalid JWT token (wrong secret)
 */
export const generateInvalidToken = (userId: string): string => {
	return jwt.sign(
		{
			userId,
			sessionId: 'test-session-id',
			jti: 'test-jti',
		},
		'wrong-secret',
		{ expiresIn: '24h' }
	);
};
