import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { logger } from '../utils/logger';

interface ErrorPayload {
	message: string;
	details?: unknown;
}

export class AppError extends Error {
	public readonly statusCode: number;

	public readonly details?: unknown;

	constructor(message: string, statusCode = 500, details?: unknown) {
		super(message);
		this.name = 'AppError';
		this.statusCode = statusCode;
		this.details = details;
	}
}

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
	next(new AppError('Route not found', 404));
};

export const errorHandler = (
	error: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	// Always log 500s or native unhandled errors via Winston
	if (!(error instanceof AppError) || error.statusCode >= 500) {
		logger.error('[GlobalErrorHandler] Unhandled Exception', {
			path: _req.path,
			method: _req.method,
			error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
		});
	} else {
		// Log 4xx errors as unhandled warnings
		logger.warn(`[GlobalErrorHandler] API Rejection: ${(error as AppError).message}`, { path: _req.path, statusCode: (error as AppError).statusCode });
	}

	if (error instanceof MulterError) {
		res.status(400).json({
			message: error.code === 'LIMIT_FILE_SIZE' ? 'File too large. Max size is 5MB' : error.message,
		});
		return;
	}

	if (error instanceof Error && 'name' in error && (error as Error).name === 'S3ServiceException') {
		res.status(502).json({
			message: 'Image storage service unavailable',
		});
		return;
	}

	const appError = error instanceof AppError ? error : new AppError('Internal server error', 500);

	const payload: ErrorPayload = {
		message: appError.message,
	};

	if (appError.details !== undefined) {
		payload.details = appError.details;
	}

	res.status(appError.statusCode).json(payload);
};

