"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jitsi_audio_controller_1 = require("../controllers/jitsi-audio.controller");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const webhook_controller_1 = require("../controllers/webhook.controller");
const router = (0, express_1.Router)();
router.post('/jitsi/events', rateLimiter_middleware_1.webhookRateLimiter, (0, validate_middleware_1.asyncHandler)(jitsi_audio_controller_1.jitsiConferenceEventController));
// === PHASE 3: ZOHO FLOW / WEBHOOKS ===
router.post('/phonepe', rateLimiter_middleware_1.webhookRateLimiter, webhook_controller_1.phonePeWebhookHandler);
router.post('/agora', rateLimiter_middleware_1.webhookRateLimiter, webhook_controller_1.agoraWebhookHandler);
router.post('/zoho-sign', rateLimiter_middleware_1.webhookRateLimiter, webhook_controller_1.zohoSignWebhookHandler);
router.post('/crisis', rateLimiter_middleware_1.webhookRateLimiter, webhook_controller_1.crisisWebhookHandler);
router.post('/zoho-flow', rateLimiter_middleware_1.webhookRateLimiter, webhook_controller_1.zohoFlowEventHandler);
exports.default = router;
