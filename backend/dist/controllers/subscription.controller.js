"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySubscriptionsController = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const db_1 = require("../config/db");
const response_1 = require("../utils/response");
const db = db_1.prisma;
const getAuthUserId = (req) => {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    return userId;
};
const getMySubscriptionsController = async (req, res) => {
    const userId = getAuthUserId(req);
    const subscriptions = await db.marketplaceSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    (0, response_1.sendSuccess)(res, subscriptions, 'Subscriptions fetched');
};
exports.getMySubscriptionsController = getMySubscriptionsController;
