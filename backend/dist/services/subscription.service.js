"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("redis");
const env_1 = require("../config/env");
const db_1 = require("../config/db");
const db = db_1.prisma;
const redis = (0, redis_1.createClient)({ url: env_1.env.redisUrl });
const isTestEnv = process.env.NODE_ENV === 'test';
if (!isTestEnv) {
    redis.on('error', (error) => {
        console.warn('[subscription.service] Redis unavailable, continuing with degraded idempotency cache', error);
    });
    void redis.connect().catch(() => undefined);
}
const sha256 = (input) => crypto_1.default.createHash('sha256').update(input).digest('hex');
