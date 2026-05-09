import bcrypt from 'bcrypt';
import { createHash, randomInt } from 'crypto';

const SALT_ROUNDS = 12;

export const hashPassword = async (plainText: string): Promise<string> => {
	return bcrypt.hash(plainText, SALT_ROUNDS);
};

export const verifyPassword = async (plainText: string, hash: string): Promise<boolean> => {
	return bcrypt.compare(plainText, hash);
};

export const hashOtp = async (otp: string): Promise<string> => {
	return bcrypt.hash(otp, SALT_ROUNDS);
};

export const verifyOtp = async (otp: string, otpHash: string): Promise<boolean> => {
	return bcrypt.compare(otp, otpHash);
};

export const hashOpaqueToken = (value: string): string => {
	return createHash('sha256').update(value).digest('hex');
};

export const generateNumericOtp = (length = 6): string => {
	const max = 10 ** length;
	const value = randomInt(0, max);

	return value.toString().padStart(length, '0');
};

