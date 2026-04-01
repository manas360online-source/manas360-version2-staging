import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';
import { initiatePhonePePayment } from '../services/phonepe.service';

const db = prisma as any;

type GroupTherapyMode = 'PUBLIC' | 'PRIVATE';
type GroupTherapyStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'LIVE' | 'ENDED' | 'REJECTED';

const providerRoles = new Set(['THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH']);

const authUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError('Authentication required', 401);
  return userId;
};

const normalizeMode = (value: unknown): GroupTherapyMode => {
  const raw = String(value || 'PUBLIC').trim().toUpperCase();
  return raw === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
};

const parseDate = (value: unknown, field: string): Date => {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) throw new AppError(`${field} must be a valid ISO datetime`, 422);
  return date;
};

const parsePositiveInt = (value: unknown, field: string, fallback?: number): number => {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n) || n <= 0) throw new AppError(`${field} must be greater than 0`, 422);
  return Math.round(n);
};

const mustString = (value: unknown, field: string): string => {
  const v = String(value || '').trim();
  if (!v) throw new AppError(`${field} is required`, 422);
  return v;
};

const ensureHostTherapist = async (userId: string): Promise<void> => {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isDeleted: true } });
  if (!user || user.isDeleted) throw new AppError('Host therapist not found', 404);
  if (!providerRoles.has(String(user.role || '').toUpperCase())) {
    throw new AppError('hostTherapistId must be a therapist/provider role', 422);
  }
};

const makeJitsiRoom = (title: string, id: string): string => {
  const safe = title.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `MANAS360_GROUP_${safe}_${id.slice(0, 8).toUpperCase()}`;
};

export const createGroupTherapyRequestController = async (req: Request, res: Response): Promise<void> => {
  const userId = authUserId(req);
  const actor = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  const actorRole = String(actor?.role || '').toUpperCase();
  const isAdmin = actorRole === 'ADMIN' || actorRole === 'SUPERADMIN' || actorRole === 'CLINICALDIRECTOR';

  const title = mustString(req.body?.title, 'title');
  const topic = mustString(req.body?.topic, 'topic');
  const sessionMode = normalizeMode(req.body?.sessionMode);
  const scheduledAt = parseDate(req.body?.scheduledAt, 'scheduledAt');
  const durationMinutes = parsePositiveInt(req.body?.durationMinutes, 'durationMinutes', 60);
  const maxMembers = parsePositiveInt(req.body?.maxMembers, 'maxMembers', 10);

  const hostTherapistId = isAdmin
    ? mustString(req.body?.hostTherapistId, 'hostTherapistId')
    : userId;

  await ensureHostTherapist(hostTherapistId);

  const priceMinor = isAdmin
    ? parsePositiveInt(req.body?.priceMinor, 'priceMinor', 0)
    : 0;

  const status: GroupTherapyStatus = isAdmin ? 'APPROVED' : 'PENDING_APPROVAL';

  const created = await db.groupTherapySession.create({
    data: {
      title,
      topic,
      description: String(req.body?.description || '').trim() || null,
      sessionMode,
      status,
      requestedById: userId,
      hostTherapistId,
      approvedById: isAdmin ? userId : null,
      groupCategoryId: req.body?.groupCategoryId ? String(req.body.groupCategoryId) : null,
      scheduledAt,
      durationMinutes,
      maxMembers,
      priceMinor,
      allowGuestJoin: req.body?.allowGuestJoin !== false,
      requiresAdminGate: true,
      requiresPayment: req.body?.requiresPayment !== false,
      publishAt: req.body?.publishAt ? parseDate(req.body.publishAt, 'publishAt') : null,
      approvedAt: isAdmin ? new Date() : null,
    },
  });

  const roomName = makeJitsiRoom(created.title, created.id);
  const updated = await db.groupTherapySession.update({
    where: { id: created.id },
    data: { jitsiRoomName: roomName },
  });

  sendSuccess(
    res,
    updated,
    isAdmin ? 'Group therapy session created and approved' : 'Group therapy request submitted for admin approval',
    201,
  );
};

export const getMyGroupTherapyRequestsController = async (req: Request, res: Response): Promise<void> => {
  const userId = authUserId(req);
  const rows = await db.groupTherapySession.findMany({
    where: {
      OR: [{ requestedById: userId }, { hostTherapistId: userId }],
    },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, { items: rows }, 'My group therapy requests fetched');
};

export const getAdminGroupTherapyRequestsController = async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.groupTherapySession.findMany({
    where: {
      status: { in: ['PENDING_APPROVAL', 'APPROVED', 'PUBLISHED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      hostTherapist: { select: { id: true, firstName: true, lastName: true, email: true } },
      groupCategory: true,
    },
  });

  sendSuccess(res, { items: rows }, 'Admin group therapy queue fetched');
};

export const reviewGroupTherapyRequestController = async (req: Request, res: Response): Promise<void> => {
  const adminId = authUserId(req);
  const id = mustString(req.params?.id, 'id');
  const decision = String(req.body?.decision || '').trim().toLowerCase();

  if (decision !== 'approve' && decision !== 'reject') {
    throw new AppError('decision must be approve or reject', 422);
  }

  const session = await db.groupTherapySession.findUnique({ where: { id } });
  if (!session) throw new AppError('Group therapy request not found', 404);

  if (decision === 'reject') {
    const rejected = await db.groupTherapySession.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: adminId,
        rejectionReason: String(req.body?.rejectionReason || '').trim() || 'Rejected by admin',
      },
    });
    sendSuccess(res, rejected, 'Group therapy request rejected');
    return;
  }

  const priceMinor = parsePositiveInt(req.body?.priceMinor ?? session.priceMinor, 'priceMinor');
  const maxMembers = parsePositiveInt(req.body?.maxMembers ?? session.maxMembers, 'maxMembers');
  const scheduledAt = req.body?.scheduledAt ? parseDate(req.body.scheduledAt, 'scheduledAt') : session.scheduledAt;
  const durationMinutes = parsePositiveInt(req.body?.durationMinutes ?? session.durationMinutes, 'durationMinutes');

  const approved = await db.groupTherapySession.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedById: adminId,
      approvedAt: new Date(),
      priceMinor,
      maxMembers,
      topic: req.body?.topic ? mustString(req.body.topic, 'topic') : session.topic,
      title: req.body?.title ? mustString(req.body.title, 'title') : session.title,
      scheduledAt,
      durationMinutes,
      groupCategoryId: req.body?.groupCategoryId !== undefined ? String(req.body.groupCategoryId || '') || null : session.groupCategoryId,
      allowGuestJoin: req.body?.allowGuestJoin !== undefined ? Boolean(req.body.allowGuestJoin) : session.allowGuestJoin,
      requiresPayment: req.body?.requiresPayment !== undefined ? Boolean(req.body.requiresPayment) : session.requiresPayment,
      publishAt: req.body?.publishAt ? parseDate(req.body.publishAt, 'publishAt') : session.publishAt,
    },
  });

  sendSuccess(res, approved, 'Group therapy request approved with governance');
};

export const publishGroupTherapySessionController = async (req: Request, res: Response): Promise<void> => {
  const id = mustString(req.params?.id, 'id');
  const session = await db.groupTherapySession.findUnique({ where: { id } });
  if (!session) throw new AppError('Session not found', 404);
  if (!['APPROVED', 'PUBLISHED', 'LIVE'].includes(String(session.status))) {
    throw new AppError('Only approved sessions can be published', 422);
  }

  const published = await db.groupTherapySession.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  sendSuccess(res, published, 'Group therapy session published');
};

export const listPublicPublishedGroupTherapySessionsController = async (_req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const rows = await db.groupTherapySession.findMany({
    where: {
      status: { in: ['PUBLISHED', 'LIVE'] },
      scheduledAt: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
      sessionMode: 'PUBLIC',
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      hostTherapist: { select: { id: true, firstName: true, lastName: true } },
      enrollments: {
        where: { status: { in: ['PAID', 'JOINED'] } },
        select: { id: true },
      },
    },
    take: 30,
  });

  const items = rows.map((row: any) => ({
    ...row,
    joinedCount: row.enrollments.length,
  }));

  sendSuccess(res, { items }, 'Public group therapy sessions fetched');
};

const createPhonePeRedirect = async (transactionId: string, userIdentity: string, amountMinor: number): Promise<string> => {
  const callbackUrl = `${env.apiUrl}${env.apiPrefix}/v1/payments/phonepe/webhook`;
  const redirectUrl = `${env.frontendUrl}/payment/status?transactionId=${encodeURIComponent(transactionId)}`;

  return initiatePhonePePayment({
    transactionId,
    userId: userIdentity,
    amountInPaise: amountMinor,
    callbackUrl,
    redirectUrl,
  });
};

export const createPublicJoinPaymentIntentController = async (req: Request, res: Response): Promise<void> => {
  const sessionId = mustString(req.params?.sessionId, 'sessionId');
  const session = await db.groupTherapySession.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError('Session not found', 404);
  if (session.status !== 'PUBLISHED' && session.status !== 'LIVE') throw new AppError('Session is not live for joining', 422);
  if (session.sessionMode !== 'PUBLIC') throw new AppError('This endpoint only supports public sessions', 422);

  const authId = req.auth?.userId || null;
  const guestEmail = String(req.body?.guestEmail || '').trim().toLowerCase();
  const guestName = String(req.body?.guestName || '').trim();

  if (!authId && (!guestEmail || !guestName)) {
    throw new AppError('guestName and guestEmail are required for guest checkout', 422);
  }

  const existingPaidCount = await db.groupTherapyEnrollment.count({
    where: {
      sessionId,
      status: { in: ['PAID', 'JOINED'] },
    },
  });

  if (existingPaidCount >= Number(session.maxMembers || 0)) {
    throw new AppError('Session is full', 409);
  }

  const amountMinor = Number(session.priceMinor || 0);
  if (amountMinor <= 0 && session.requiresPayment) {
    throw new AppError('Session payment amount is invalid', 422);
  }

  const transactionId = `GRP_${Date.now()}_${sessionId.slice(0, 6).toUpperCase()}`;
  const userIdentity = authId || `guest_${guestEmail}`;
  const redirectUrl = amountMinor > 0 && session.requiresPayment
    ? await createPhonePeRedirect(transactionId, userIdentity, amountMinor)
    : `${env.frontendUrl}/payment/status?transactionId=${encodeURIComponent(transactionId)}&status=SUCCESS`;

  const payment = await db.financialPayment.create({
    data: {
      merchantTransactionId: transactionId,
      amountMinor,
      currency: 'INR',
      paymentType: 'PROVIDER_FEE',
      status: amountMinor > 0 ? 'INITIATED' : 'CAPTURED',
      providerId: session.hostTherapistId,
      patientId: authId,
      metadata: {
        type: 'group_therapy_join',
        sessionId,
        guestEmail: guestEmail || null,
        guestName: guestName || null,
      },
    },
  });

  const enrollment = await db.groupTherapyEnrollment.create({
    data: {
      sessionId,
      userId: authId,
      guestEmail: guestEmail || null,
      guestName: guestName || null,
      status: amountMinor > 0 ? 'PAYMENT_PENDING' : 'PAID',
      amountMinor,
      paymentId: payment.id,
      merchantTransaction: transactionId,
      paidAt: amountMinor > 0 ? null : new Date(),
    },
  });

  sendSuccess(res, {
    enrollmentId: enrollment.id,
    transactionId,
    redirectUrl,
    amountMinor,
  }, 'Group therapy join payment initiated', 201);
};

export const confirmPublicJoinController = async (req: Request, res: Response): Promise<void> => {
  const sessionId = mustString(req.params?.sessionId, 'sessionId');
  const transactionId = mustString(req.body?.transactionId, 'transactionId');

  const payment = await db.financialPayment.findUnique({ where: { merchantTransactionId: transactionId } });
  if (!payment) throw new AppError('Payment transaction not found', 404);

  const isPaid = String(payment.status) === 'CAPTURED' || String(payment.status) === 'INITIATED';
  if (!isPaid) throw new AppError('Payment is not completed yet', 422);

  const enrollment = await db.groupTherapyEnrollment.findFirst({
    where: { sessionId, merchantTransaction: transactionId },
  });
  if (!enrollment) throw new AppError('Enrollment not found for this payment', 404);

  const updated = await db.groupTherapyEnrollment.update({
    where: { id: enrollment.id },
    data: {
      status: 'PAID',
      paidAt: enrollment.paidAt || new Date(),
    },
  });

  sendSuccess(res, { enrollment: updated }, 'Group therapy join unlocked');
};

export const listProviderPatientsForInviteController = async (req: Request, res: Response): Promise<void> => {
  const therapistId = authUserId(req);
  const sessions = await db.therapySession.findMany({
    where: { therapistProfileId: therapistId },
    select: {
      patientProfile: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
    take: 500,
  });

  const dedup = new Map<string, any>();
  for (const row of sessions) {
    const user = row?.patientProfile?.user;
    if (user?.id && !dedup.has(user.id)) {
      dedup.set(user.id, {
        id: user.id,
        name: `${String(user.firstName || '').trim()} ${String(user.lastName || '').trim()}`.trim() || 'Patient',
        email: user.email,
      });
    }
  }

  sendSuccess(res, { items: Array.from(dedup.values()) }, 'Therapist patients fetched');
};

export const createPrivateInviteController = async (req: Request, res: Response): Promise<void> => {
  const therapistId = authUserId(req);
  const sessionId = mustString(req.body?.sessionId, 'sessionId');
  const patientUserId = mustString(req.body?.patientUserId, 'patientUserId');
  const amountMinor = parsePositiveInt(req.body?.amountMinor, 'amountMinor');

  const session = await db.groupTherapySession.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError('Session not found', 404);
  if (session.sessionMode !== 'PRIVATE') throw new AppError('Private invite requires a private session', 422);
  if (session.hostTherapistId !== therapistId) throw new AppError('Only host therapist can invite patients', 403);

  const invite = await db.groupTherapyInvite.upsert({
    where: {
      sessionId_patientUserId: { sessionId, patientUserId },
    },
    update: {
      status: 'INVITED',
      amountMinor,
      message: String(req.body?.message || '').trim() || null,
      invitedById: therapistId,
      paymentDeadline: req.body?.paymentDeadline ? parseDate(req.body.paymentDeadline, 'paymentDeadline') : null,
      acceptedAt: null,
      paidAt: null,
      joinedAt: null,
    },
    create: {
      sessionId,
      patientUserId,
      invitedById: therapistId,
      status: 'INVITED',
      amountMinor,
      message: String(req.body?.message || '').trim() || null,
      paymentDeadline: req.body?.paymentDeadline ? parseDate(req.body.paymentDeadline, 'paymentDeadline') : null,
    },
  });

  sendSuccess(res, invite, 'Private invite sent', 201);
};

export const listMyPrivateInvitesController = async (req: Request, res: Response): Promise<void> => {
  const userId = authUserId(req);
  const items = await db.groupTherapyInvite.findMany({
    where: { patientUserId: userId },
    include: {
      session: true,
      invitedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, { items }, 'Private invites fetched');
};

export const respondPrivateInviteController = async (req: Request, res: Response): Promise<void> => {
  const userId = authUserId(req);
  const inviteId = mustString(req.params?.inviteId, 'inviteId');
  const action = String(req.body?.action || '').trim().toLowerCase();
  if (!['accept', 'decline'].includes(action)) {
    throw new AppError('action must be accept or decline', 422);
  }

  const invite = await db.groupTherapyInvite.findUnique({ where: { id: inviteId } });
  if (!invite) throw new AppError('Invite not found', 404);
  if (invite.patientUserId !== userId) throw new AppError('You can only respond to your own invite', 403);

  const updated = await db.groupTherapyInvite.update({
    where: { id: inviteId },
    data: {
      status: action === 'accept' ? 'PAYMENT_PENDING' : 'DECLINED',
      acceptedAt: action === 'accept' ? new Date() : null,
    },
  });

  sendSuccess(res, updated, action === 'accept' ? 'Invite accepted. Payment required to join.' : 'Invite declined');
};

export const createPrivateInvitePaymentIntentController = async (req: Request, res: Response): Promise<void> => {
  const userId = authUserId(req);
  const inviteId = mustString(req.params?.inviteId, 'inviteId');

  const invite = await db.groupTherapyInvite.findUnique({
    where: { id: inviteId },
    include: { session: true },
  });

  if (!invite) throw new AppError('Invite not found', 404);
  if (invite.patientUserId !== userId) throw new AppError('You can only pay your own invite', 403);
  if (invite.status === 'DECLINED') throw new AppError('Invite is declined', 422);

  const amountMinor = Number(invite.amountMinor || invite.session?.priceMinor || 0);
  if (amountMinor <= 0) throw new AppError('Invite fee is invalid', 422);

  const tx = `PVT_${Date.now()}_${inviteId.slice(0, 6).toUpperCase()}`;
  const redirectUrl = await createPhonePeRedirect(tx, userId, amountMinor);

  const payment = await db.financialPayment.create({
    data: {
      merchantTransactionId: tx,
      amountMinor,
      currency: 'INR',
      paymentType: 'PROVIDER_FEE',
      status: 'INITIATED',
      providerId: invite.session.hostTherapistId,
      patientId: userId,
      metadata: {
        type: 'group_therapy_private_invite',
        inviteId,
        sessionId: invite.sessionId,
      },
    },
  });

  await db.groupTherapyInvite.update({
    where: { id: inviteId },
    data: {
      status: 'PAYMENT_PENDING',
      paymentId: payment.id,
    },
  });

  sendSuccess(res, {
    inviteId,
    transactionId: tx,
    redirectUrl,
    amountMinor,
  }, 'Private invite payment initiated', 201);
};

export const confirmPrivateInvitePaymentController = async (req: Request, res: Response): Promise<void> => {
  const userId = authUserId(req);
  const inviteId = mustString(req.params?.inviteId, 'inviteId');
  const transactionId = mustString(req.body?.transactionId, 'transactionId');

  const invite = await db.groupTherapyInvite.findUnique({ where: { id: inviteId } });
  if (!invite) throw new AppError('Invite not found', 404);
  if (invite.patientUserId !== userId) throw new AppError('Unauthorized', 403);

  const payment = await db.financialPayment.findUnique({ where: { merchantTransactionId: transactionId } });
  if (!payment) throw new AppError('Payment not found', 404);

  const isPaid = String(payment.status) === 'CAPTURED' || String(payment.status) === 'INITIATED';
  if (!isPaid) throw new AppError('Payment is not completed yet', 422);

  const updated = await db.groupTherapyInvite.update({
    where: { id: inviteId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paymentId: invite.paymentId || payment.id,
    },
  });

  sendSuccess(res, updated, 'Private invite payment confirmed. You can now join.');
};
