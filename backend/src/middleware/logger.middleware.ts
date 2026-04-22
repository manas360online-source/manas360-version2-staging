import type { NextFunction, Request, Response } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
	const start = process.hrtime.bigint();

	res.on('finish', () => {
		if (req.originalUrl === '/health' || req.originalUrl === '/ready') {
			return;
		}

		const end = process.hrtime.bigint();
		const durationInMs = Number(end - start) / 1_000_000;

		const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationInMs.toFixed(2)}ms`;

		if (res.statusCode >= 500) {
			console.error(message);
			return;
		}

		console.log(message);
	});

	next();
};

