import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { User, UserRole } from '@prisma/client';
import type { TherapistProfile } from '@prisma/client';

const PAYMENT_WINDOW_BEFORE_SESSION_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const REQUEST_EXPIRY_HOURS = 24;
const SESSION_QUOTE = {
  THERAPIST: 699 * 100, // ₹699 in minor units
  PSYCHOLOGIST: 999 * 100, // ₹999 in minor units
  PSYCHIATRIST: 1499 * 100, // ₹1499 in minor units
};

interface AvailabilityPrefs {
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  timeSlots: Array<{ startMinute: number; endMinute: number }>;
}

interface ProviderMatch {
  id: string;
  name: string;
  displayName?: string;
  providerType: string;
  profileId?: string;
  consultationFee?: number;
  specializations?: string[];
  averageRating?: number;
  availability?: string;
}

type AvailabilitySlot = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  isAvailable?: boolean;
};

// Convert day/time preferences to a readable format
const formatAvailabilityPrefs = (prefs: AvailabilityPrefs): string => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days = prefs.daysOfWeek.map((d) => dayNames[d]).join(', ');
  const times = prefs.timeSlots.map((t) => {
    const startHour = Math.floor(t.startMinute / 60);
    const endHour = Math.floor(t.endMinute / 60);
    return `${String(startHour).padStart(2, '0')}:00-${String(endHour).padStart(2, '0')}:00`;
  });
  return `${days} (${times.join(', ')})`;
};

export const hasSmartMatchAvailabilityOverlap = (
  availabilityPrefs: AvailabilityPrefs,
  therapistAvailability: AvailabilitySlot[],
): boolean => {
  return availabilityPrefs.daysOfWeek.some((reqDay) =>
    availabilityPrefs.timeSlots.some((reqTime) =>
      therapistAvailability.some((slot: AvailabilitySlot) => {
        return (
          slot.dayOfWeek === reqDay &&
          (slot.isAvailable ?? true) &&
          isTimeOverlap(reqTime.startMinute, reqTime.endMinute, slot.startMinute, slot.endMinute)
        );
      }),
    ),
  );
};

// Query providers who match the requested availability
export const findMatchingProviders = async (
  availabilityPrefs: AvailabilityPrefs,
  providerType?: string,
  limit: number = 10,
): Promise<ProviderMatch[]> => {
  // Find all active therapist profiles
  const therapists = await prisma.therapistProfile.findMany({
    where: {
      user: {
        isDeleted: false,
        status: 'ACTIVE',
        ...(providerType && { providerType: providerType as any }),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          providerType: true,
          isDeleted: true,
        },
      },
    },
    take: limit,
  });

  const matches: ProviderMatch[] = therapists
    .filter((t) => {
      // Check if therapist has availability JSON
      if (!t.availability) return false;

      try {
        const slots = t.availability as any;
        if (!Array.isArray(slots)) return false;

        // Check if any of the requested days/times overlap with therapist's availability
        return hasSmartMatchAvailabilityOverlap(availabilityPrefs, slots as AvailabilitySlot[]);
      } catch {
        return false;
      }
    })
    .map((t) => ({
      id: t.userId,
      name: `${t.user.firstName} ${t.user.lastName}`.trim(),
      displayName: t.displayName,
      providerType: t.user.providerType as any,
      profileId: t.id,
      consultationFee: t.consultationFee || 0,
      specializations: t.specializations || [],
      averageRating: t.averageRating || 0,
    }));

  return matches;
};

// Helper to check if two time slots overlap
const isTimeOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): boolean => {
  return start1 < end2 && end1 > start2;
};

interface CreateAppointmentRequestInput {
  patientId: string;
  availabilityPrefs: AvailabilityPrefs;
  providerIds: string[]; // up to 3 provider IDs
  preferredSpecialization?: string;
  durationMinutes?: number;
}

// Create a broadcast appointment request that goes to multiple providers
export const createAppointmentRequest = async (
  input: CreateAppointmentRequestInput,
): Promise<{
  appointmentRequestId: string;
  status: string;
  providers: Array<{ providerId: string; name: string }>;
  message: string;
}> => {
  if (!input.providerIds || input.providerIds.length === 0) {
    throw new AppError('At least one provider must be selected', 422);
  }

  if (input.providerIds.length > 3) {
    throw new AppError('Maximum 3 providers can be selected', 422);
  }

  // Validate patient exists
  const patient = await prisma.patientProfile.findUnique({
    where: { userId: input.patientId },
  });
  if (!patient) throw new AppError('Patient profile not found', 404);

  // Validate all providers exist and are active
  const providers = await prisma.user.findMany({
    where: {
      id: { in: input.providerIds },
      isDeleted: false,
      status: 'ACTIVE',
    },
    select: { id: true, firstName: true, lastName: true, providerType: true },
  });

  if (providers.length !== input.providerIds.length) {
    throw new AppError('One or more providers not found or inactive', 404);
  }

  // Create the appointment request
  const appointmentRequest = await prisma.appointmentRequest.create({
    data: {
      patientId: input.patientId,
      availabilityPrefs: input.availabilityPrefs as any,
      providers: providers.map((p) => ({
        providerId: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        providerType: p.providerType,
        status: 'PENDING',
        sentAt: new Date(),
      })) as any,
      preferredSpecialization: input.preferredSpecialization,
      durationMinutes: input.durationMinutes || 50,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + REQUEST_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });

  // TODO: Send notifications to providers

  return {
    appointmentRequestId: appointmentRequest.id,
    status: appointmentRequest.status,
    providers: providers.map((p) => ({
      providerId: p.id,
      name: `${p.firstName} ${p.lastName}`.trim(),
    })),
    message: `Request sent to ${input.providerIds.length} provider(s). We will notify you as soon as one accepts.`,
  };
};

interface ProviderAcceptanceInput {
  appointmentRequestId: string;
  providerId: string;
  scheduledAt: Date;
}

// Provider accepts an appointment request
export const acceptAppointmentRequest = async (
  input: ProviderAcceptanceInput,
): Promise<{
  status: string;
  appointmentRequestId: string;
  scheduledAt: string;
  paymentDeadlineAt: string;
  amountMinor: number;
  message: string;
}> => {
  const appointmentRequest = await prisma.appointmentRequest.findUnique({
    where: { id: input.appointmentRequestId },
  });

  if (!appointmentRequest) {
    throw new AppError('Appointment request not found', 404);
  }

  // Only accept if still pending
  if (appointmentRequest.status !== 'PENDING') {
    throw new AppError('Appointment request is no longer available', 409);
  }

  // Validate provider is in the request
  const providers = appointmentRequest.providers as any;
  const providerEntry = providers.find((p: any) => p.providerId === input.providerId);
  if (!providerEntry) {
    throw new AppError('Provider not found in this appointment request', 403);
  }

  if (providerEntry.status !== 'PENDING') {
    throw new AppError('You have already responded to this request', 409);
  }

  // Check time is in the future
  if (input.scheduledAt <= new Date()) {
    throw new AppError('Scheduled time must be in the future', 422);
  }

  // Calculate payment deadline (6 hours before session)
  const paymentDeadlineAt = new Date(
    input.scheduledAt.getTime() - PAYMENT_WINDOW_BEFORE_SESSION_MS,
  );
  if (paymentDeadlineAt <= new Date()) {
    throw new AppError(
      'Session must be at least 6 hours away for booking to be valid',
      422,
    );
  }

  // Get provider type for fee calculation
  const provider = await prisma.user.findUnique({
    where: { id: input.providerId },
    select: { providerType: true, therapistProfile: { select: { consultationFee: true } } },
  });

  if (!provider) throw new AppError('Provider not found', 404);

  const amountMinor =
    provider.therapistProfile?.consultationFee ||
    SESSION_QUOTE[provider.providerType as keyof typeof SESSION_QUOTE] ||
    SESSION_QUOTE.THERAPIST;

  // Update appointment request: mark this provider as accepted, cancel others
  const updatedProviders = providers.map((p: any) => {
    if (p.providerId === input.providerId) {
      return { ...p, status: 'ACCEPTED', acceptedAt: new Date() };
    }
    return { ...p, status: 'CANCELLED', cancelledAt: new Date() };
  });

  const updated = await prisma.appointmentRequest.update({
    where: { id: input.appointmentRequestId },
    data: {
      acceptedProviderId: input.providerId,
      scheduledAt: input.scheduledAt,
      paymentDeadlineAt,
      amountMinor: BigInt(amountMinor),
      providers: updatedProviders as any,
      status: 'ACCEPTED_BY_PROVIDER',
    },
  });

  // TODO: Send notification to patient with payment action required
  // TODO: Send cancellation notifications to rejected providers

  return {
    status: updated.status,
    appointmentRequestId: updated.id,
    scheduledAt: updated.scheduledAt!.toISOString(),
    paymentDeadlineAt: paymentDeadlineAt.toISOString(),
    amountMinor,
    message: `You accepted the appointment request. Patient must pay ₹${(amountMinor / 100).toFixed(2)} within 6 hours to confirm.`,
  };
};

// Provider rejects an appointment request
export const rejectAppointmentRequest = async (
  appointmentRequestId: string,
  providerId: string,
): Promise<{ status: string; message: string }> => {
  const appointmentRequest = await prisma.appointmentRequest.findUnique({
    where: { id: appointmentRequestId },
  });

  if (!appointmentRequest) {
    throw new AppError('Appointment request not found', 404);
  }

  const providers = appointmentRequest.providers as any;
  const providerEntry = providers.find((p: any) => p.providerId === providerId);
  if (!providerEntry) {
    throw new AppError('Provider not found in this appointment request', 403);
  }

  // Update this provider's status to REJECTED
  const updatedProviders = providers.map((p: any) => {
    if (p.providerId === providerId) {
      return { ...p, status: 'REJECTED', rejectedAt: new Date() };
    }
    return p;
  });

  // If all providers have rejected, mark request as REJECTED_BY_ALL
  const allRejected = updatedProviders.every((p: any) => p.status === 'REJECTED');
  const newStatus = allRejected ? 'REJECTED_BY_ALL' : appointmentRequest.status;

  await prisma.appointmentRequest.update({
    where: { id: appointmentRequestId },
    data: {
      providers: updatedProviders as any,
      status: newStatus as any,
    },
  });

  // TODO: Send notification to patient if all rejected

  return {
    status: newStatus,
    message: 'You have rejected this appointment request.',
  };
};

// Auto-cancel requests that have expired payment deadline
export const autoExpirePaymentDeadlines = async (): Promise<void> => {
  const now = new Date();

  const expiredBookings = await prisma.appointmentRequest.findMany({
    where: {
      status: 'ACCEPTED_BY_PROVIDER',
      paymentDeadlineAt: { lt: now },
    },
  });

  for (const booking of expiredBookings) {
    await prisma.appointmentRequest.update({
      where: { id: booking.id },
      data: {
        status: 'EXPIRED',
        cancelledAt: now,
      },
    });

    // TODO: Send notification to patient that booking expired
    // TODO: Send notification to provider that booking was cancelled
  }
};

// Get pending appointment requests for a provider (to show in their dashboard)
export const getProviderPendingRequests = async (providerId: string) => {
  const requests = await prisma.appointmentRequest.findMany({
    where: {
      providers: {
        path: ['*'],
        array_contains: [{ providerId }] as any,
      },
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          patientProfile: {
            select: {
              age: true,
              medicalHistory: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((req) => ({
    id: req.id,
    patientName: `${req.patient?.firstName} ${req.patient?.lastName}`.trim(),
    availabilityPrefs: req.availabilityPrefs,
    preferredSpecialization: req.preferredSpecialization,
    createdAt: req.createdAt,
    expiresAt: req.expiresAt,
  }));
};

// Get patient's pending appointment requests
export const getPatientPendingRequests = async (patientId: string) => {
  const requests = await prisma.appointmentRequest.findMany({
    where: {
      patientId,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((req) => ({
    id: req.id,
    status: req.status,
    providers: req.providers,
    expiresAt: req.expiresAt,
  }));
};

// Get patient's currently pending payment after provider acceptance
export const getPatientPaymentPendingRequest = async (patientId: string) => {
  const request = await prisma.appointmentRequest.findFirst({
    where: {
      patientId,
      status: 'ACCEPTED_BY_PROVIDER',
      paymentDeadlineAt: { gt: new Date() },
    },
    include: {
      acceptedProvider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          therapistProfile: {
            select: {
              displayName: true,
              averageRating: true,
            },
          },
        },
      },
    },
  });

  if (!request) return null;

  return {
    id: request.id,
    providerId: request.acceptedProviderId,
    providerName: request.acceptedProvider
      ? `${request.acceptedProvider.firstName} ${request.acceptedProvider.lastName}`.trim()
      : 'Unknown',
    scheduledAt: request.scheduledAt,
    paymentDeadlineAt: request.paymentDeadlineAt,
    amountMinor: Number(request.amountMinor || 0),
    timeRemaining: request.paymentDeadlineAt
      ? Math.max(0, request.paymentDeadlineAt.getTime() - Date.now())
      : 0,
  };
};
