import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/validate.middleware';
import { logger } from '../utils/logger';
import { io } from '../socket';
import { verifyPhonePeWebhook } from '../services/phonepe.service';
import { processPhonePeWebhook } from '../services/payment.service';
import { crisisService } from '../services/crisis.service';
import { triggerZohoFlow } from '../services/zohoDesk.service';

/**
 * Handle PhonePe Payment Webhooks (WF-3.x)
 */
export const phonePeWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const xVerify = req.headers['x-verify'] as string;
  const body = req.body;
  
  logger.info('[Webhook] PhonePe event received', { transactionId: body.merchantTransactionId });

  // Verify checksum
  const isValid = verifyPhonePeWebhook(JSON.stringify(body), xVerify);
  if (!isValid) {
    logger.warn('[Webhook] PhonePe signature mismatch!');
    return res.status(401).send('Invalid Signature');
  }

  const decoded = typeof body?.response === 'string' && body.response.trim().length > 0
    ? JSON.parse(Buffer.from(body.response, 'base64').toString('utf8'))
    : body;

  // Ensure payment state is persisted even when integrators post to /webhooks/phonepe.
  await processPhonePeWebhook(decoded);

  if (decoded?.code === 'PAYMENT_SUCCESS') {
    // Emit real-time notification to admin-room
    if (io) {
      io.to('admin-room').emit('payment-received', {
        transactionId: decoded?.data?.merchantTransactionId || decoded?.merchantTransactionId,
        amount: decoded?.data?.amount || decoded?.amount,
        status: 'SUCCESS'
      });
    }
    
    // Trigger Zoho Flow for post-payment workflows
    await triggerZohoFlow('payment_success_automation', decoded);
  }

  res.status(200).send('OK');
});

/**
 * Handle Agora Session Webhooks
 */
export const agoraWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const { eventType, payload } = req.body;
  logger.info(`[Webhook] Agora event: ${eventType}`, payload);

  if (eventType === 'channel_abandon' || eventType === 'session_disruption') {
    if (io) {
      io.to('admin-room').emit('session-alert', {
        channel: payload.channelName,
        type: eventType,
        timestamp: new Date().toISOString()
      });
    }
  }

  res.status(200).send('OK');
});

/**
 * Handle Zoho Sign Contract Webhooks
 */
export const zohoSignWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const { document_id, action_type } = req.body;
  logger.info(`[Webhook] Zoho Sign event: ${action_type}`, { document_id });

  if (action_type === 'SIGNATURE_COMPLETED') {
    // Update local therapist status e.g. ContractSigned = true
    await triggerZohoFlow('contract_signed_automation', req.body);
  }

  res.status(200).send('OK');
});

/**
 * Handle Crisis Alert Webhooks (WF-7.1)
 */
export const crisisWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId, userName, type, severity, message } = req.body;
  
  await crisisService.triggerAlert({
    id: `crisis-${Date.now()}`,
    userId,
    userName,
    type,
    severity,
    message,
    timestamp: new Date().toISOString()
  });

  res.status(200).send('OK');
});

/**
 * Generic Zoho Flow Event Handler (all 47 flows)
 */
export const zohoFlowEventHandler = asyncHandler(async (req: Request, res: Response) => {
  const configuredSecret = String(process.env.ZOHO_FLOW_WEBHOOK_SECRET || '').trim();
  const incomingSecret = String(req.headers['x-zoho-flow-secret'] || '').trim();
  if (configuredSecret && configuredSecret !== incomingSecret) {
    logger.warn('[Webhook] Zoho Flow secret mismatch');
    return void res.status(401).send('Invalid Zoho Flow secret');
  }

  const { flowName, data } = req.body;
  logger.info(`[Webhook] Zoho Flow event: ${flowName}`, data);
  
  // Generic broadcast or processing based on flowName
  if (io) {
    io.to('admin-room').emit('flow-automation-event', { flowName, data });
  }

  res.status(200).send('OK');
});
