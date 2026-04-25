import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

const ALGORITHM = 'aes-256-gcm';

const getSessionNotesKey = (): Buffer => {
	const rawKey = env.sessionNotesEncryptionKey;

	if (!rawKey || rawKey.trim().length < 16) {
		throw new AppError('SESSION_NOTES_ENCRYPTION_KEY is not configured', 500);
	}

	return createHash('sha256').update(rawKey).digest();
};

export interface EncryptedPayload {
	encryptedContent: string;
	iv: string;
	authTag: string;
}

export const encryptSessionNote = (plainText: string): EncryptedPayload => {
	const ivBuffer = randomBytes(12);
	const cipher = createCipheriv(ALGORITHM, getSessionNotesKey(), ivBuffer);

	const encryptedBuffer = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
	const authTagBuffer = cipher.getAuthTag();

	return {
		encryptedContent: encryptedBuffer.toString('base64'),
		iv: ivBuffer.toString('base64'),
		authTag: authTagBuffer.toString('base64'),
	};
};

export const decryptSessionNote = (payload: EncryptedPayload): string => {
	const decipher = createDecipheriv(
		ALGORITHM,
		getSessionNotesKey(),
		Buffer.from(payload.iv, 'base64'),
	);

	decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

	const decryptedBuffer = Buffer.concat([
		decipher.update(Buffer.from(payload.encryptedContent, 'base64')),
		decipher.final(),
	]);

	return decryptedBuffer.toString('utf8');
};