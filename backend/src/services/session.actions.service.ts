import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { publishPlaceholderNotificationEvent } from './notification.service';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import cuid from 'cuid';

export class SessionActionsService {
  async ensureOwnership(therapistId: string, sessionId: string) {
    const session = await prisma.therapySession.findFirst({
      where: { id: sessionId, therapistProfileId: therapistId },
      include: {
        patientProfile: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
    if (!session) throw new AppError('Session not found', 404);
    return session;
  }

  async rescheduleSession(therapistId: string, sessionId: string, newStartAt: string, options: { requestorId?: string } = {}) {
    const session = await this.ensureOwnership(therapistId, sessionId);

    const before = { startAt: session.dateTime, status: session.status } as any;

    const updated = await prisma.therapySession.update({ where: { id: sessionId }, data: { dateTime: new Date(newStartAt) } });

    await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId || therapistId, action: 'RESCHEDULE', entityType: 'THERAPY_SESSION', entityId: sessionId, changes: { before, after: { startAt: updated.dateTime } } } as any });

    return updated;
  }

  async cancelSession(therapistId: string, sessionId: string, reason?: string, options: { requestorId?: string } = {}) {
    const session = await this.ensureOwnership(therapistId, sessionId);

    const before = { status: session.status, cancelledAt: session.cancelledAt } as any;

    const updated = await prisma.therapySession.update({ where: { id: sessionId }, data: { status: 'CANCELLED', cancelledAt: new Date() } });

    await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId || therapistId, action: 'CANCEL', entityType: 'THERAPY_SESSION', entityId: sessionId, changes: { reason, before, after: { status: updated.status, cancelledAt: updated.cancelledAt } } } as any });

    return updated;
  }

  async sendReminder(therapistId: string, sessionId: string, via: 'email' | 'sms' | 'both' = 'email', templateId?: string, options: { requestorId?: string } = {}) {
    const session = await this.ensureOwnership(therapistId, sessionId);
    const patientUserId = String(session.patientProfile?.userId || '');
    const patientName = String(
      session.patientProfile?.user?.name
        || `${String(session.patientProfile?.user?.firstName || '').trim()} ${String(session.patientProfile?.user?.lastName || '').trim()}`.trim()
        || 'Patient',
    );
    const therapist = await prisma.user.findUnique({ where: { id: therapistId }, select: { firstName: true, lastName: true, name: true } });
    const therapistName = String(
      therapist?.name
      || `${String(therapist?.firstName || '').trim()} ${String(therapist?.lastName || '').trim()}`.trim()
      || 'Your therapist',
    );

    const ev = await publishPlaceholderNotificationEvent({
      eventType: 'REMINDER',
      entityType: 'THERAPY_SESSION',
      entityId: sessionId,
      userId: patientUserId,
      title: 'Session reminder',
      message: `${therapistName} sent a reminder for your upcoming session.`,
      payload: { via, templateId, patientName, therapistName },
    });

    await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId || therapistId, action: 'REMIND', entityType: 'THERAPY_SESSION', entityId: sessionId, changes: { queued: true, event: ev } } } as any);

    return { queued: true };
  }

  async startLiveSession(therapistId: string, sessionId: string, mode: 'video' | 'call' = 'video', options: { requestorId?: string } = {}) {
    await this.ensureOwnership(therapistId, sessionId);

    const roomId = cuid();
    const expiresIn = '5m';
    const token = jwt.sign({ sessionId, therapistId, roomId, mode }, env.jwtAccessSecret, { expiresIn });
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId || therapistId, action: 'START_LIVE', entityType: 'THERAPY_SESSION', entityId: sessionId, changes: { roomId, mode, expiresAt } } } as any);

    return { room: { roomId, token, expiresAt } };
  }
}

export const sessionActionsService = new SessionActionsService();
