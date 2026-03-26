"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jitsi_audio_controller_1 = require("../controllers/jitsi-audio.controller");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.post('/jitsi/events', rateLimiter_middleware_1.webhookRateLimiter, (0, validate_middleware_1.asyncHandler)(jitsi_audio_controller_1.jitsiConferenceEventController));
exports.default = router;
