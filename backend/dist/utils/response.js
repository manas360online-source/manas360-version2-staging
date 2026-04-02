"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const normalizeForJson = (value) => {
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
        const entries = Object.entries(value).map(([key, item]) => [key, normalizeForJson(item)]);
        return Object.fromEntries(entries);
    }
    return value;
};
const sendSuccess = (res, data, message = 'OK', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data: normalizeForJson(data),
    });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, statusCode = 400) => {
    return res.status(statusCode).json({
        success: false,
        message,
    });
};
exports.sendError = sendError;
