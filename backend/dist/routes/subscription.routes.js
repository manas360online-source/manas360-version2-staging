"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_controller_1 = require("../controllers/subscription.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.get('/me', auth_middleware_1.requireAuth, (0, validate_middleware_1.asyncHandler)(subscription_controller_1.getMySubscriptionsController));
exports.default = router;
