import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format for console
const consoleFormat = combine(
	colorize({ all: true }),
	timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
	printf((info) => {
		let msg = `${info.timestamp} ${info.level}: ${info.message}`;
		
		// If there is an error stack, print it
		if (info.stack) {
			msg += `\\n${info.stack}`;
		}
		
		// If there is additional metadata, stringify it
		const meta: any = { ...info };
		delete meta.level;
		delete meta.message;
		delete meta.timestamp;
		delete meta.stack;
		
		if (Object.keys(meta).length > 0) {
			try {
				msg += ` \\n\\t[META] ` + JSON.stringify(meta);
			} catch(e) { /* ignore JSON errors */ }
		}

		return msg;
	})
);

// Custom json format for files
const fileFormat = combine(
	timestamp(),
	errors({ stack: true }),
	json()
);

// Define log level based on environment
const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Create the logger
export const logger = winston.createLogger({
	level,
	format: fileFormat,
	defaultMeta: { service: 'manas360-backend' },
	transports: [
		// Write to all logs with level `info` and below to `combined-%DATE%.log`
		new DailyRotateFile({
			filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
			datePattern: 'YYYY-MM-DD',
			zippedArchive: true,
			maxSize: '20m',
			maxFiles: '14d',
			level: 'info',
		}),
		// Write all logs error (and below) to `error-%DATE%.log`.
		new DailyRotateFile({
			filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
			datePattern: 'YYYY-MM-DD',
			zippedArchive: true,
			maxSize: '20m',
			maxFiles: '30d',
			level: 'error',
		}),
	],
});

// If we're not in production then also log to the `console` with human-readable format
if (process.env.NODE_ENV !== 'production') {
	logger.add(
		new winston.transports.Console({
			format: consoleFormat,
		})
	);
}
