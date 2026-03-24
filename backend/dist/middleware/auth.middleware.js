"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCsrf = exports.requireAuth = void 0;
const env_1 = require("../config/env");
const error_middleware_1 = require("./error.middleware");
const jwt_1 = require("../utils/jwt");
const getBearerToken = (authorizationHeader) => {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return null;
    }
    return authorizationHeader.slice(7);
};
const requireAuth = (req, _res, next) => {
    const bearerToken = getBearerToken(req.headers.authorization);
    const cookieToken = req.cookies?.access_token;
    const accessToken = bearerToken ?? cookieToken;
    if (!accessToken) {
        next(new error_middleware_1.AppError('Authentication required', 401));
        return;
    }
    try {
        const payload = (0, jwt_1.verifyAccessToken)(accessToken);
        const requestWithAuth = req;
        requestWithAuth.auth = {
            userId: payload.sub,
            sessionId: payload.sessionId,
            jti: payload.jti,
        };
        next();
    }
    catch {
        next(new error_middleware_1.AppError('Invalid or expired access token', 401));
    }
};
exports.requireAuth = requireAuth;
const requireCsrf = (req, _res, next) => {
    const csrfFromHeader = req.headers['x-csrf-token'];
    const csrfToken = typeof csrfFromHeader === 'string' ? csrfFromHeader : undefined;
    const cookieToken = req.cookies?.[env_1.env.csrfCookieName];
    if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
        next(new error_middleware_1.AppError('Invalid CSRF token', 403));
        return;
    }
    next();
};
exports.requireCsrf = requireCsrf;
