import crypto from 'crypto';
import { env } from '../config/env';

const ALGO = 'aes-256-gcm';

export const encryptSecret = (plain: string): string => {
    const key = Buffer.from(env.secretEncryptionKey ?? '', 'hex');
    if (!key || key.length !== 32) {
        throw new Error('Secret encryption key not configured properly');
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}.${tag.toString('hex')}.${ciphertext.toString('hex')}`;
};

export const decryptSecret = (payload: string): string => {
    const key = Buffer.from(env.secretEncryptionKey ?? '', 'hex');
    if (!key || key.length !== 32) {
        throw new Error('Secret encryption key not configured properly');
    }

    const parts = payload.split('.');
    if (parts.length !== 3) throw new Error('Invalid secret payload');
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const ciphertext = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString('utf8');
};

export default { encryptSecret, decryptSecret };
