import type { Response } from 'express';

const normalizeForJson = (value: unknown): unknown => {
	if (typeof value === 'bigint') {
		// Keep precision when unsafe for JS number, otherwise return numeric value for client ergonomics.
		if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
			return value.toString();
		}
		return Number(value);
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (Array.isArray(value)) {
		return value.map((item) => normalizeForJson(item));
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeForJson(item)]);
		return Object.fromEntries(entries);
	}

	return value;
};

export const sendSuccess = <T>(res: Response, data: T, message = 'OK', statusCode = 200): Response => {
	return res.status(statusCode).json({
		success: true,
		message,
		data: normalizeForJson(data),
	});
};

export const sendError = (res: Response, message: string, statusCode = 400): Response => {
	return res.status(statusCode).json({
		success: false,
		message,
	});
};

