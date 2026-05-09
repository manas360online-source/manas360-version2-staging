import { AppError } from '../middleware/error.middleware';
import type { ChangePasswordPayload, ProfileUpdatePayload } from '../utils/constants';

const phoneRegex = /^\+?[1-9]\d{9,14}$/;

const validateName = (value: string): string => {
	const trimmedName = value.trim();

	if (!trimmedName) {
		throw new AppError('name cannot be empty', 400);
	}

	if (trimmedName.length > 120) {
		throw new AppError('name exceeds maximum length', 400);
	}

	return trimmedName;
};

const validatePhone = (value: string): string => {
	const trimmedPhone = value.trim();

	if (!trimmedPhone) {
		throw new AppError('phone cannot be empty', 400);
	}

	if (!phoneRegex.test(trimmedPhone)) {
		throw new AppError('Invalid phone format', 400);
	}

	return trimmedPhone;
};

export const validateProfileUpdatePayload = (payload: ProfileUpdatePayload): ProfileUpdatePayload => {
	const validated: ProfileUpdatePayload = {};

	if (payload.name !== undefined) {
		validated.name = validateName(payload.name);
	}

	if (payload.phone !== undefined) {
		validated.phone = validatePhone(payload.phone);
	}

	return validated;
};

const passwordComplexityRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const validateRequiredPasswordField = (value: unknown, fieldName: string): string => {
	if (typeof value !== 'string') {
		throw new AppError(`${fieldName} is required`, 400);
	}

	const trimmed = value.trim();
	if (!trimmed) {
		throw new AppError(`${fieldName} is required`, 400);
	}

	return trimmed;
};

export const validateChangePasswordPayload = (payload: Record<string, unknown>): ChangePasswordPayload => {
	const currentPassword = validateRequiredPasswordField(payload.currentPassword, 'currentPassword');
	const newPassword = validateRequiredPasswordField(payload.newPassword, 'newPassword');
	const confirmPassword = validateRequiredPasswordField(payload.confirmPassword, 'confirmPassword');

	if (!passwordComplexityRegex.test(newPassword)) {
		throw new AppError(
			'newPassword must be at least 8 characters and include at least one number and one special character',
			400,
		);
	}

	if (newPassword !== confirmPassword) {
		throw new AppError('confirmPassword must match newPassword', 400);
	}

	return {
		currentPassword,
		newPassword,
		confirmPassword,
	};
};

