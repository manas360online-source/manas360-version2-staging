"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsApp = void 0;
const logger_1 = require("../utils/logger");
/**
 * Send a WhatsApp message.
 * This is a placeholder for the actual Twilio/WhatsApp Business API integration.
 */
const sendWhatsApp = async (to, message) => {
    const phone = String(to || '').trim();
    const text = String(message || '').trim();
    if (!phone || !text) {
        return { success: false };
    }
    const webhookUrl = process.env.TWILIO_WHATSAPP_WEBHOOK_URL || process.env.WHATSAPP_WEBHOOK_URL;
    if (webhookUrl) {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channel: 'whatsapp',
                to: phone,
                body: text,
            }),
        }).catch(() => null);
        return { success: true };
    }
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_NUMBER;
    if (accountSid && authToken && from) {
        const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const body = new URLSearchParams({
            From: `whatsapp:${from}`,
            To: `whatsapp:${phone}`,
            Body: text,
        });
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        }).catch(() => null);
        return { success: true };
    }
    logger_1.logger.info(`[WhatsApp] Fallback send to ${phone}`, { message: text });
    return { success: true };
};
exports.sendWhatsApp = sendWhatsApp;
