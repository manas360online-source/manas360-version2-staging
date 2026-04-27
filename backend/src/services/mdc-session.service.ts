import { prisma as mdcPrisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { randomBytes } from 'crypto';

export interface CreateSessionInput {
  clinicId: string;
  therapistId: string;
  patientId: string;
  scheduledAt: string;
  durationMinutes?: number;
}

export const createSession = async (input: CreateSessionInput) => {
  const jitsiRoomId = `MDC-${randomBytes(8).toString('hex')}`;

  return mdcPrisma.clinicSession.create({
    data: {
      clinicId: input.clinicId,
      therapistId: input.therapistId,
      patientId: input.patientId,
      scheduledAt: new Date(input.scheduledAt),
      durationMinutes: input.durationMinutes || 50,
      jitsiRoomId,
      status: 'scheduled',
    },
    include: {
      patient: true,
      therapist: true,
    },
  });
};

export const getClinicSessions = async (clinicId: string) => {
  return mdcPrisma.clinicSession.findMany({
    where: { clinicId },
    include: {
      patient: true,
      therapist: true,
    },
    orderBy: { scheduledAt: 'asc' },
  });
};

export const getProviderSessions = async (therapistId: string) => {
  return mdcPrisma.clinicSession.findMany({
    where: { therapistId, status: 'scheduled' },
    include: {
      patient: true,
    },
    orderBy: { scheduledAt: 'asc' },
  });
};

export const getPatientSessions = async (patientId: string) => {
  return mdcPrisma.clinicSession.findMany({
    where: { patientId, status: 'scheduled' },
    include: {
      therapist: true,
    },
    orderBy: { scheduledAt: 'asc' },
  });
};
