import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { prisma } from '../config/db';
import {
  findMatchingProviders,
  createAppointmentRequest,
  acceptAppointmentRequest,
  rejectAppointmentRequest,
  getPatientPendingRequests,
  getPatientPaymentPendingRequest,
} from '../services/smart-match.service';
import { assertPatientHasCompletedBothPHQandGAD7 } from '../services/patient-v1.service';

interface AvailabilityPrefs {
  daysOfWeek: number[];
  timeSlots: Array<{ startMinute: number; endMinute: number }>;
}

const db = prisma as any;

const parseQueryList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw.split(',').map((entry) => entry.trim()).filter(Boolean);
};

// GET /patient/providers/smart-match
// Query available providers based on patient's availability preferences
export const getAvailableProvidersController = async (req: Request, res: Response): Promise<void> => {
  const patientId = req.auth?.userId;
  if (!patientId) throw new AppError('Unauthorized', 401);
  await assertPatientHasCompletedBothPHQandGAD7(patientId);

  const { daysOfWeek, timeSlots, providerType, limit } = req.query;

  if (!daysOfWeek || !timeSlots) {
    throw new AppError('daysOfWeek and timeSlots are required', 422);
  }

  const subscription = await db.patientSubscription.findUnique({
    where: { userId: patientId },
    select: { status: true, planName: true, price: true },
  });

  const status = String(subscription?.status || '').toLowerCase();
  const statusAllowed = ['active', 'trial', 'trialing', 'grace'].includes(status);
  if (!statusAllowed) {
    throw new AppError('Active subscription required to use smart matching', 403);
  }

  const freeLikePlan = Number(subscription?.price || 0) <= 0 || String(subscription?.planName || '').toLowerCase().includes('free');
  if (freeLikePlan) {
    sendSuccess(res, {
      count: 0,
      providers: [],
      message: 'Smart matching is available on paid plans only.',
    });
    return;
  }

  const concerns = parseQueryList(req.query.concerns);
  const languages = parseQueryList(req.query.languages);
  const modes = parseQueryList(req.query.modes);
  const presetEntryType = String(req.query.entryType || '').trim() || undefined;
  const timezoneRegion = String(req.query.timezoneRegion || '').trim() || undefined;
  const sourceFunnel = String(req.query.sourceFunnel || '').trim() || undefined;
  const rawContext = String(req.query.context || 'Standard').trim();
  const context = (['Standard', 'Corporate', 'Night', 'Buddy', 'Crisis'].includes(rawContext) ? rawContext : 'Standard') as
    | 'Standard'
    | 'Corporate'
    | 'Night'
    | 'Buddy'
    | 'Crisis';

  const availabilityPrefs: AvailabilityPrefs = {
    daysOfWeek: Array.isArray(daysOfWeek)
      ? (daysOfWeek as string[]).map(Number)
      : [Number(daysOfWeek)],
    timeSlots: Array.isArray(timeSlots)
      ? (timeSlots as string[]).map((slot) => {
          const [start, end] = slot.split('-').map(Number);
          return { startMinute: start, endMinute: end };
        })
      : [],
  };

  const providers = await findMatchingProviders(
    availabilityPrefs,
    providerType ? String(providerType) : undefined,
    limit ? Math.min(Number(limit), 10) : 10,
    {
      concerns,
      languages,
      modes,
      context,
      presetEntryType,
      timezoneRegion,
      sourceFunnel,
      patientUserId: patientId,
    },
  );

  sendSuccess(res, {
    count: providers.length,
    context,
    providers,
  });
};

// POST /patient/appointments/smart-match
// Create an appointment request with up to 3 providers
export const createAppointmentRequestController = async (req: Request, res: Response): Promise<void> => {
  const patientId = req.auth?.userId;
  if (!patientId) {
    throw new AppError('Unauthorized', 401);
  }
  await assertPatientHasCompletedBothPHQandGAD7(patientId);
  const {
    availabilityPrefs,
    providerIds,
    preferredSpecialization,
    durationMinutes,
    context,
    concerns,
    languages,
    modes,
    rankedProviders,
    payment,
    sourceFunnel,
    presetEntryType,
    timezoneRegion,
  } = req.body;

  if (!availabilityPrefs || !providerIds) {
    throw new AppError('availabilityPrefs and providerIds are required', 422);
  }

  const subscription = await db.patientSubscription.findUnique({
    where: { userId: patientId },
    select: { status: true, planName: true, price: true },
  });

  const status = String(subscription?.status || '').toLowerCase();
  const statusAllowed = ['active', 'trial', 'trialing', 'grace'].includes(status);
  if (!statusAllowed) {
    throw new AppError('Active subscription required to create smart-match requests', 403);
  }

  const freeLikePlan = Number(subscription?.price || 0) <= 0 || String(subscription?.planName || '').toLowerCase().includes('free');
  if (freeLikePlan) {
    throw new AppError('Smart matching is available on paid plans only.', 403);
  }

  const result = await createAppointmentRequest({
    patientId,
    availabilityPrefs,
    providerIds,
    preferredSpecialization,
    durationMinutes,
    context,
    concerns,
    languages,
    modes,
    rankedProviders,
    payment,
    sourceFunnel,
    presetEntryType,
    timezoneRegion,
  });

  const statusCode = result.paymentRequired ? 202 : 201;
  const message = result.paymentRequired
    ? 'Payment required before request can be sent to providers'
    : 'Appointment request created successfully';
  sendSuccess(res, result, message, statusCode);
};

// GET /patient/appointments/requests/pending
// Get patient's pending appointment requests
export const getPatientPendingRequestsController = async (req: Request, res: Response): Promise<void> => {
  const patientId = req.auth?.userId;
  if (!patientId) {
    throw new AppError('Unauthorized', 401);
  }
  const requests = await getPatientPendingRequests(patientId);
  sendSuccess(res, { requests });
};

// GET /patient/appointments/payment-pending
// Get patient's current payment pending request (if any)
export const getPaymentPendingRequestController = async (req: Request, res: Response): Promise<void> => {
  const patientId = req.auth?.userId;
  if (!patientId) {
    throw new AppError('Unauthorized', 401);
  }
  const request = await getPatientPaymentPendingRequest(patientId);

  sendSuccess(res, {
    hasPaymentPending: !!request,
    request,
  });
};

// POST /therapist/me/appointments/accept
// Provider accepts an appointment request
export const acceptAppointmentController = async (req: Request, res: Response): Promise<void> => {
  const providerId = req.auth?.userId;
  if (!providerId) {
    throw new AppError('Unauthorized', 401);
  }
  const { appointmentRequestId, scheduledAt } = req.body;

  if (!appointmentRequestId || !scheduledAt) {
    throw new AppError('appointmentRequestId and scheduledAt are required', 422);
  }

  const result = await acceptAppointmentRequest({
    appointmentRequestId,
    providerId,
    scheduledAt: new Date(scheduledAt),
  });

  sendSuccess(res, result, 'Appointment request accepted', 200);
};

// POST /therapist/me/appointments/reject
// Provider rejects an appointment request
export const rejectAppointmentController = async (req: Request, res: Response): Promise<void> => {
  const providerId = req.auth?.userId;
  if (!providerId) {
    throw new AppError('Unauthorized', 401);
  }
  const { appointmentRequestId } = req.body;

  if (!appointmentRequestId) {
    throw new AppError('appointmentRequestId is required', 422);
  }

  const result = await rejectAppointmentRequest(appointmentRequestId, providerId);

  sendSuccess(res, result, 'Appointment request rejected', 200);
};
