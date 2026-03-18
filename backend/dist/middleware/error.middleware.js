"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = exports.AppError = void 0;
const multer_1 = require("multer");
const logger_1 = require("../utils/logger");
class AppError extends Error {
    statusCode;
    details;
    constructor(message, statusCode = 500, details) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.AppError = AppError;
const notFoundHandler = (_req, _res, next) => {
    next(new AppError('Route not found', 404));
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (error, _req, res, _next) => {
    // Always log 500s or native unhandled errors via Winston
    if (!(error instanceof AppError) || error.statusCode >= 500) {
        logger_1.logger.error('[GlobalErrorHandler] Unhandled Exception', {
            path: _req.path,
            method: _req.method,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        });
    }
    else {
        // Log 4xx errors as unhandled warnings
        logger_1.logger.warn(`[GlobalErrorHandler] API Rejection: ${error.message}`, { path: _req.path, statusCode: error.statusCode });
    }
    if (error instanceof multer_1.MulterError) {
        res.status(400).json({
            message: error.code === 'LIMIT_FILE_SIZE' ? 'File too large. Max size is 5MB' : error.message,
        });
        return;
    }
    if (error instanceof Error && 'name' in error && error.name === 'S3ServiceException') {
        res.status(502).json({
            message: 'Image storage service unavailable',
        });
        return;
    }
    const appError = error instanceof AppError ? error : new AppError('Internal server error', 500);
    const payload = {
        message: appError.message,
    };
    if (appError.details !== undefined) {
        payload.details = appError.details;
    }
    res.status(appError.statusCode).json(payload);
};
exports.errorHandler = errorHandler;
