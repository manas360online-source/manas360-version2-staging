import { prisma as mdcPrisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { mdcPricingService } from './mdc-pricing.service';

export interface CreateClinicInput {
  name: string;
  phone: string;
  email: string;
  address?: string;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  license?: string;
  tier: 'trial' | 'solo' | 'small' | 'large';
  billingCycle: 'monthly' | 'quarterly';
  selectedFeatures: string[];
}

export const createClinic = async (input: CreateClinicInput) => {
  // Calculate pricing for the selected plan
  let pricing = { monthlyTotal: 0, billingAmount: 0 };
  if (input.tier !== 'trial') {
    pricing = await mdcPricingService.calculatePrice({
      clinicTier: input.tier,
      billingCycle: input.billingCycle,
      selectedFeatures: input.selectedFeatures,
    });
  }

  return mdcPrisma.$transaction(async (tx) => {
    // Generate a clinic code like MDC-2026-001 inside the transaction
    const count = await tx.clinic.count();
    const year = new Date().getFullYear();
    const sequence = String(count + 1).padStart(3, '0');
    const clinicCode = `MDC-${year}-${sequence}`;

    const clinic = await tx.clinic.create({
      data: {
        clinicCode,
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        license: input.license,
        ownerName: input.ownerName,
        ownerPhone: input.ownerPhone || input.phone,
        ownerEmail: input.ownerEmail || input.email,
        tier: input.tier,
        trialEndsAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
        maxTherapists: input.tier === 'solo' ? 1 : input.tier === 'small' ? 3 : 15,
        maxPatients: input.tier === 'solo' ? 50 : input.tier === 'small' ? 200 : 2000,
      },
    });

    // Create the initial subscription record
    await tx.clinicSubscription.create({
      data: {
        clinicId: clinic.id,
        clinicTier: input.tier,
        billingCycle: input.billingCycle,
        selectedFeatures: input.selectedFeatures,
        monthlyTotal: pricing.monthlyTotal,
        billingAmount: pricing.billingAmount,
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
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
      subscriptions: {
        where: { status: { in: ['trial', 'active'] } },
        take: 1,
      },
    },
  });
  
  if (!clinic) throw new AppError('Clinic not found', 404);
  return clinic;
};
