import React from 'react';
import { TIER_OPTIONS, FEATURES } from './data';
import { PricingResponse } from './api';

interface PricingSummaryProps {
  currentTier: 'solo' | 'small' | 'large';
  currentBilling: 'monthly' | 'quarterly';
  selectedFeatures: boolean[];
  pricing?: PricingResponse | null;
}

export const PricingSummary: React.FC<PricingSummaryProps> = ({
  currentTier,
  currentBilling,
  selectedFeatures,
  pricing,
}) => {
  const tierLabel = TIER_OPTIONS[currentTier].label;
  const billingLabel = currentBilling === 'monthly' ? 'Monthly' : 'Quarterly (10% Discount)';
  const featureCount = selectedFeatures.filter(Boolean).length;

  // Use API pricing data if available, otherwise calculate locally
  const displayTotal = pricing?.billing_amount ?? 0;
  const monthlyTotal = pricing?.monthly_total ?? 0;
  const period = currentBilling === 'monthly' ? '/month' : '/quarter';

  return (
    <div className="bg-green-50 border-2 border-[#4A6741] p-4 rounded-lg mb-5">
      <div className="text-xs font-bold text-charcoal mb-3">📋 Your Configuration</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-2.5 rounded border border-[#4A6741]">
          <div className="text-[9px] text-gray-600 mb-1">Clinic Tier</div>
          <div className="text-xs font-bold text-[#4A6741]">{tierLabel}</div>
        </div>
        <div className="bg-white p-2.5 rounded border border-[#4A6741]">
          <div className="text-[9px] text-gray-600 mb-1">Billing Cycle</div>
          <div className="text-xs font-bold text-[#4A6741]">{billingLabel}</div>
        </div>
        <div className="bg-white p-2.5 rounded border border-[#4A6741]">
          <div className="text-[9px] text-gray-600 mb-1">Features Selected</div>
          <div className="text-xs font-bold text-[#4A6741]">{featureCount}</div>
        </div>
        <div className="bg-white p-2.5 rounded border border-[#4A6741]">
          <div className="text-[9px] text-gray-600 mb-1">Your Total Cost</div>
          <div className="text-xs font-bold text-[#4A6741]">
            ₹{displayTotal}
            {period}
          </div>
          {pricing && currentBilling === 'quarterly' && (
            <div className="text-[8px] text-green-600 mt-1">
              Monthly: ₹{monthlyTotal}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingSummary;
