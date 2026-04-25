import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

export interface CreatePatientInput {
  clinicId: string;
  fullName: string;
  phone: string;
  email?: string;
  externalId?: string; // ID from clinic's own system
}

export const createPatient = async (input: CreatePatientInput) => {
  // Check if patient already exists in this clinic
  const existing = await prisma.clinicPatient.findFirst({
    where: {
      clinicId: input.clinicId,
      phone: input.phone,
    },
  });

  if (existing) {
    throw new AppError('Patient with this phone number already exists in your clinic', 409);
  }

  return prisma.clinicPatient.create({
    data: {
      clinicId: input.clinicId,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      externalId: input.externalId,
    },
  });
};

export const bulkCreatePatients = async (clinicId: string, patients: Omit<CreatePatientInput, 'clinicId'>[]) => {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const patient of patients) {
    try {
      await createPatient({ ...patient, clinicId });
      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push(`${patient.fullName} (${patient.phone}): ${error.message}`);
    }
  }

  return results;
};

export const getClinicPatients = async (clinicId: string) => {
  return prisma.clinicPatient.findMany({
    where: { clinicId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
};
