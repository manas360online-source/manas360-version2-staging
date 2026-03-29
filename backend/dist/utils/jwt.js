"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTokenPair = exports.verifyRefreshToken = exports.verifyAccessToken = exports.createRefreshToken = exports.createAccessToken = void 0;
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const assertStringToken = (value) => {
    if (typeof value === 'string') {
        throw new Error('Invalid JWT payload');
    }
    return value;
};
const createAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign({ ...payload, type: 'access' }, env_1.env.jwtAccessSecret, { expiresIn: env_1.env.jwtAccessExpiresIn });
};
exports.createAccessToken = createAccessToken;
const createRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign({ ...payload, type: 'refresh' }, env_1.env.jwtRefreshSecret, { expiresIn: env_1.env.jwtRefreshExpiresIn });
};
exports.createRefreshToken = createRefreshToken;
const verifyAccessToken = (token) => {
    const decoded = assertStringToken(jsonwebtoken_1.default.verify(token, env_1.env.jwtAccessSecret));
    if (decoded.type !== 'access') {
        throw new Error('Invalid access token type');
    }
    return decoded;
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    const decoded = assertStringToken(jsonwebtoken_1.default.verify(token, env_1.env.jwtRefreshSecret));
    if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token type');
    }
    return decoded;
};
exports.verifyRefreshToken = verifyRefreshToken;
const createTokenPair = (userId, sessionId, permissions) => {
    const refreshJti = (0, crypto_1.randomUUID)();
    const accessJti = (0, crypto_1.randomUUID)();
    const accessToken = (0, exports.createAccessToken)({
        sub: userId,
        sessionId,
        jti: accessJti,
        ...(permissions ? { permissions } : {}),
    });
    const refreshToken = (0, exports.createRefreshToken)({
        sub: userId,
        sessionId,
        jti: refreshJti,
    });
    return {
        accessToken,
        refreshToken,
        refreshJti,
        sessionId,
    };
};
exports.createTokenPair = createTokenPair;
