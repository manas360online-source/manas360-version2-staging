import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { handleJitsiConferenceLeft, type JitsiConferenceLeftPayload } from '../services/jitsi-audio-gateway.service';

const verifyJitsiWebhook = (req: Request): void => {
  const configuredSecret = String(process.env.JITSI_WEBHOOK_SECRET || '').trim();
  if (!configuredSecret) return;

  const providedSecret = String(req.headers['x-jitsi-webhook-secret'] || '').trim();
  if (!providedSecret || providedSecret !== configuredSecret) {
    throw new AppError('Invalid Jitsi webhook secret', 401);
  }
};

export const jitsiConferenceEventController = async (req: Request, res: Response): Promise<void> => {
  verifyJitsiWebhook(req);

  const payload = (req.body || {}) as JitsiConferenceLeftPayload;
  const eventName = String(payload.eventName || payload.event || '').trim().toUpperCase();

  if (!eventName) {
    throw new AppError('Missing eventName/event in payload', 400);
  }

  if (eventName !== 'CONFERENCE_LEFT') {
    res.status(202).json({
      success: true,
      ignored: true,
      message: `Event ${eventName} ignored`,
    });
    return;
  }

  const result = await handleJitsiConferenceLeft(payload);

  res.status(200).json({
    success: true,
    message: 'Jitsi conference left event processed',
    data: result,
  });
};
