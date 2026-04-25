import { prisma as mdcPrisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

export interface CreateStaffInput {
  clinicId: string;
  fullName: string;
  phone: string;
  email?: string;
  role: 'admin' | 'therapist';
  loginSuffix: string;
}

export const createStaff = async (input: CreateStaffInput) => {
  const clinic = await mdcPrisma.clinic.findUnique({
    where: { id: input.clinicId },
    include: {
      subscriptions: {
        where: { status: { in: ['active', 'trial'] } },
      },
    },
  });

  if (!clinic) throw new AppError('Clinic not found', 404);

  const activeSub = clinic.subscriptions[0];
  if (!activeSub) throw new AppError('No active subscription found', 403);

  if (input.role === 'therapist' && !activeSub.selectedFeatures.includes('multi-therapist')) {
    const existingStaff = await mdcPrisma.clinicUser.count({
      where: { clinicId: input.clinicId, role: 'therapist', isActive: true },
    });
    if (existingStaff >= 1) {
      throw new AppError('Therapist limit reached for your current plan.', 403);
    }
  }

  const loginCode = `${clinic.clinicCode}-${input.loginSuffix}`;
  
  // Check if login code already exists
  const existing = await mdcPrisma.clinicUser.findUnique({
    where: { loginCode },
  });
  
  if (existing) {
    throw new AppError(`Staff with login code ${loginCode} already exists`, 409);
  }

  return mdcPrisma.clinicUser.create({
    data: {
      clinicId: input.clinicId,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      role: input.role,
      loginSuffix: input.loginSuffix,
      loginCode,
    },
  });
};

export const getClinicStaff = async (clinicId: string) => {
  return mdcPrisma.clinicUser.findMany({
    where: { clinicId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
};

export const deactivateStaff = async (staffId: string) => {
  return mdcPrisma.clinicUser.update({
    where: { id: staffId },
    data: { isActive: false },
  });
};

