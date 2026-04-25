import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PricingParams {
  clinicTier: 'solo' | 'small' | 'large';
  billingCycle: 'monthly' | 'quarterly';
  selectedFeatures: string[];
}

export interface PricingBreakdown {
  [featureSlug: string]: number;
}

export interface PricingResponse {
  monthlyTotal: number;
  billingAmount: number;
  discountApplied: number;
  breakdown: PricingBreakdown;
}

export class MdcPricingService {
  async getFeatures() {
    return prisma.mDCFeatureCatalog.findMany({
      where: { isActive: true },
      include: {
        pricing: true,
      },
    });
  }

  async calculatePrice(params: PricingParams): Promise<PricingResponse> {
    const { clinicTier, billingCycle, selectedFeatures } = params;

    const featurePrices = await prisma.mDCTierPricing.findMany({
      where: {
        clinicTier,
        feature: {
          slug: { in: selectedFeatures },
        },
      },
      include: {
        feature: true,
      },
    });

    const breakdown: PricingBreakdown = {};
    let monthlyTotal = 0;

    featurePrices.forEach((tp) => {
      breakdown[tp.feature.slug] = tp.monthlyPrice;
      monthlyTotal += tp.monthlyPrice;
    });

    const discountApplied = billingCycle === 'quarterly' ? 10 : 0;
    const billingAmount = billingCycle === 'quarterly' 
      ? Math.round(monthlyTotal * 3 * 0.9) 
      : monthlyTotal;

    return {
      monthlyTotal,
      billingAmount,
      discountApplied,
      breakdown,
    };
  }

  async validateFeatureAccess(clinicId: string, featureSlug: string): Promise<boolean> {
    const subscription = await prisma.clinicSubscription.findFirst({
      where: {
        clinicId,
        status: { in: ['trial', 'active'] },
      },
    });

    if (!subscription) return false;

    const selectedFeatures = subscription.selectedFeatures as string[];
    return selectedFeatures.includes(featureSlug);
  }
}

export const mdcPricingService = new MdcPricingService();
