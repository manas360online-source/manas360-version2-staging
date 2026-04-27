import { AppError } from '../middleware/error.middleware';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[1-9]\d{9,14}$/;

const assertString = (value: unknown, field: string): string => {
	if (typeof value !== 'string' || !value.trim()) {
		throw new AppError(`${field} is required`, 400);
	}

	return value.trim();
};

export const validateEmail = (value: unknown): string => {
	const email = assertString(value, 'email').toLowerCase();

	if (!emailRegex.test(email)) {
		throw new AppError('Invalid email format', 400);
	}

	return email;
};

export const validatePhone = (value: unknown): string => {
	const rawPhone = assertString(value, 'phone');
	const compactPhone = rawPhone.replace(/[\s()-]/g, '');

	let phone = compactPhone;
	if (/^\d{10}$/.test(phone)) {
		phone = `+91${phone}`;
	} else if (/^91\d{10}$/.test(phone)) {
		phone = `+${phone}`;
	}

	if (!phoneRegex.test(phone)) {
		throw new AppError('Invalid phone format', 400);
	}

	return phone;
};

export const validatePassword = (value: unknown): string => {
	const password = assertString(value, 'password');

	if (password.length < 8) {
		throw new AppError('Password must be at least 8 characters', 400);
	}

	return password;
};

export const validateOtp = (value: unknown): string => {
	const otp = assertString(value, 'otp');

	if (!/^\d{4}$/.test(otp)) {
		throw new AppError('OTP must be 4 digits', 400);
	}

	return otp;
};

export const validatePublicSignupRole = (value: unknown): 'patient' | 'learner' | 'therapist' | 'psychiatrist' | 'psychologist' | 'coach' => {
	const role = assertString(value, 'role').toLowerCase();

	if (role === 'patient' || role === 'learner' || role === 'therapist' || role === 'psychiatrist' || role === 'psychologist' || role === 'coach') {
		return role;
	}

	throw new AppError('Invalid role. Allowed roles: patient, learner, therapist, psychiatrist, psychologist, coach', 400);
};

