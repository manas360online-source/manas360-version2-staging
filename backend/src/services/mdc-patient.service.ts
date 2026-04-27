import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

export interface CreatePatientInput {
  clinicId: string;
  fullName: string;
  phone: string;
  email?: string;
  assignedTherapistId?: string;
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

  const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
  if (!clinic) throw new AppError('Clinic not found', 404);

  const existingPatientCount = await prisma.clinicPatient.count({
    where: { clinicId: input.clinicId },
  });

  const loginSuffix = `PT${existingPatientCount + 1}`;
  const loginCode = `${clinic.clinicCode}-${loginSuffix}`;

  return prisma.clinicPatient.create({
    data: {
      clinicId: input.clinicId,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      assignedTherapistId: input.assignedTherapistId || null,
      loginSuffix,
      loginCode,
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
