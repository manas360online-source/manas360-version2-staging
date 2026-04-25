import { prisma as mdcPrisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

export interface CreateClinicInput {
  name: string;
  phone: string;
  email: string;
  address?: string;
  ownerName: string;
}

export const createClinic = async (input: CreateClinicInput) => {
  // Generate a clinic code like MDC-2026-001
  const count = await mdcPrisma.clinic.count();
  const year = new Date().getFullYear();
  const sequence = String(count + 1).padStart(3, '0');
  const clinicCode = `MDC-${year}-${sequence}`;

  return mdcPrisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({
      data: {
        clinicCode,
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        ownerName: input.ownerName,
        ownerPhone: input.phone,
        ownerEmail: input.email,
        trialEndsAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
      },
    });

    // Create the first admin staff (the owner)
    await tx.clinicUser.create({
      data: {
        clinicId: clinic.id,
        fullName: input.ownerName,
        phone: input.phone,
        email: input.email,
        role: 'admin',
        loginSuffix: 'ADMIN',
        loginCode: `${clinicCode}-ADMIN`,
      },
    });

    return clinic;
  });
};

export const getClinicByCode = async (code: string) => {
  const clinic = await mdcPrisma.clinic.findUnique({
    where: { clinicCode: code },
    include: {
      staff: true,
    },
  });
  
  if (!clinic) throw new AppError('Clinic not found', 404);
  return clinic;
};
