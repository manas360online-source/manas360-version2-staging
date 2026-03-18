import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
  findMatchingProviders,
  createAppointmentRequest,
  acceptAppointmentRequest,
  rejectAppointmentRequest,
  getPatientPendingRequests,
  getPatientPaymentPendingRequest,
} from '../services/smart-match.service';

interface AvailabilityPrefs {
  daysOfWeek: number[];
  timeSlots: Array<{ startMinute: number; endMinute: number }>;
}

// GET /patient/providers/smart-match
// Query available providers based on patient's availability preferences
export const getAvailableProvidersController = async (req: Request, res: Response): Promise<void> => {
  const { daysOfWeek, timeSlots, providerType, limit } = req.query;

  if (!daysOfWeek || !timeSlots) {
    throw new AppError('daysOfWeek and timeSlots are required', 422);
  }

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
  );

  sendSuccess(res, {
    count: providers.length,
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
  const {
    availabilityPrefs,
    providerIds,
    preferredSpecialization,
    durationMinutes,
  } = req.body;

  if (!availabilityPrefs || !providerIds) {
    throw new AppError('availabilityPrefs and providerIds are required', 422);
  }

  const result = await createAppointmentRequest({
    patientId,
    availabilityPrefs,
    providerIds,
    preferredSpecialization,
    durationMinutes,
  });

  sendSuccess(res, result, 'Appointment request created successfully', 201);
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
