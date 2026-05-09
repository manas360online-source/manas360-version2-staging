import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ENC_PREFIX = 'enc:v1';
const CHAT_DATA_ENCRYPTION_KEY =
	process.env.CHAT_DATA_ENCRYPTION_KEY || process.env.SESSION_NOTES_ENCRYPTION_KEY || '';

const getKey = (): Buffer | null => {
	const raw = String(CHAT_DATA_ENCRYPTION_KEY || '').trim();
	if (!raw) return null;
	return createHash('sha256').update(raw).digest();
};

export const isChatEncryptionEnabled = (): boolean => getKey() !== null;

export const encryptSensitiveText = (plainText: string): string => {
	const key = getKey();
	const text = String(plainText || '');
	if (!key || !text) return text;

	try {
		const iv = randomBytes(12);
		const cipher = createCipheriv('aes-256-gcm', key, iv);
		const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
		const tag = cipher.getAuthTag();
		return `${ENC_PREFIX}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
	} catch {
		return text;
	}
};

export const decryptSensitiveText = (storedText: string): string => {
	const value = String(storedText || '');
	if (!value) return value;
	if (!value.startsWith(`${ENC_PREFIX}:`)) return value;

	const key = getKey();
	if (!key) return '';

	const parts = value.split(':');
	if (parts.length !== 5) return '';

	try {
		const iv = Buffer.from(parts[2], 'base64');
		const tag = Buffer.from(parts[3], 'base64');
		const encrypted = Buffer.from(parts[4], 'base64');
		const decipher = createDecipheriv('aes-256-gcm', key, iv);
		decipher.setAuthTag(tag);
		const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
		return decrypted.toString('utf8');
	} catch {
		return '';
	}
};
