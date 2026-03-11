import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { sessionActionsService } from '../services/session.actions.service';
import { therapistProposeAppointmentSlot } from '../services/patient-v1.service';

const getAuthUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError('Authentication required', 401);
  return userId;
};

export const rescheduleSessionController = async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const sessionId = String(req.params.id);
  const { newStartAt } = req.body || {};
  if (!newStartAt) throw new AppError('newStartAt required', 400);

  const updated = await sessionActionsService.rescheduleSession(userId, sessionId, newStartAt, { requestorId: userId });
  sendSuccess(res, updated, 'Session rescheduled');
};

export const cancelSessionController = async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const sessionId = String(req.params.id);
  const { reason } = req.body || {};

  const updated = await sessionActionsService.cancelSession(userId, sessionId, reason, { requestorId: userId });
  sendSuccess(res, updated, 'Session cancelled');
};

export const sendReminderController = async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const sessionId = String(req.params.id);
  const via = String(req.body?.via || 'email') as 'email' | 'sms' | 'both';

  const result = await sessionActionsService.sendReminder(userId, sessionId, via, String(req.body?.templateId || ''), { requestorId: userId });
  sendSuccess(res, result, 'Reminder queued');
};

export const startLiveSessionController = async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const sessionId = String(req.params.id);
  const mode = String(req.body?.mode || 'video') as 'video' | 'call';

  const result = await sessionActionsService.startLiveSession(userId, sessionId, mode, { requestorId: userId });
  sendSuccess(res, result, 'Live session started');
};

export const duplicateTemplateController = async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const templateId = String(req.params.id);
  const opts = { title: String(req.body?.title || '') };

  const result = await sessionActionsService.duplicateTemplate(userId, templateId, opts, { requestorId: userId });
  sendSuccess(res, result, 'Template duplicated', 201);
};

export const therapistProposeAppointmentSlotController = async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const requestRef = String(req.body?.requestRef || '').trim();
  const proposedStartAt = String(req.body?.proposedStartAt || '').trim();
  if (!requestRef || !proposedStartAt) throw new AppError('requestRef and proposedStartAt are required', 400);

  const result = await therapistProposeAppointmentSlot(userId, {
    requestRef,
    proposedStartAt,
    note: req.body?.note ? String(req.body.note) : undefined,
  });
  sendSuccess(res, result, 'Proposed slot sent');
};

export const therapistActionsController = {
  rescheduleSessionController,
  cancelSessionController,
  sendReminderController,
  startLiveSessionController,
  duplicateTemplateController,
  therapistProposeAppointmentSlotController,
};
