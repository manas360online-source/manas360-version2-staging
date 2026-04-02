import React from 'react';
import { FEATURES, TIER_OPTIONS, BILLING_OPTIONS } from './data';

type Props = {
  currentTier: 'solo' | 'small' | 'large';
  onTierChange: (tier: 'solo' | 'small' | 'large') => void;

  currentBilling: 'monthly' | 'quarterly';
  onBillingChange: (billing: 'monthly' | 'quarterly') => void;

  selectedFeatures: boolean[];
  onFeatureChange: (index: number) => void;

  onStartTrial: () => void;
  isLoading: boolean;
};

const ConfigSection: React.FC<Props> = ({
  currentTier,
  onTierChange,
  currentBilling,
  onBillingChange,
  selectedFeatures,
  onFeatureChange,
  onStartTrial,
  isLoading,
}) => {
  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      {/* TITLE */}
      <div className="mb-4 border-b border-[#4A6741]/80 pb-3">
        <h2 className="text-lg font-semibold text-slate-700">⚙️ Customize Your Plan</h2>
      </div>

      {/* TIER */}
      <div className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#5f7d55]">
          🎯 Patient Volume (Fixed)
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(TIER_OPTIONS) as [
            'solo' | 'small' | 'large',
            { label: string; range: string }
          ][]).map(([key, value]) => (
            <button
              key={key}
              onClick={() => onTierChange(key)}
              className={`flex min-h-[58px] flex-col items-center justify-center rounded-md border-2 px-4 py-3 text-center transition-all duration-200 ${
                currentTier === key
                  ? 'border-[#4A6741] bg-[#4A6741] text-white shadow-sm'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-[#4A6741] hover:bg-green-50'
              }`}
            >
              <span className="text-sm font-semibold leading-none">{value.label}</span>
              <span className="mt-1 text-[11px] leading-none opacity-80">{value.range}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 border-t border-slate-200 pt-5" />

      {/* BILLING */}
      <div className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#5f7d55]">
          💳 Billing Cycle (Fixed)
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(BILLING_OPTIONS) as [
            'monthly' | 'quarterly',
            string
          ][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onBillingChange(key)}
              className={`flex min-h-[58px] flex-col items-center justify-center rounded-md border-2 px-4 py-3 text-center transition-all duration-200 ${
                currentBilling === key
                  ? 'border-[#4A6741] bg-[#4A6741] text-white shadow-sm'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-[#4A6741] hover:bg-green-50'
              }`}
            >
              <span className="text-sm font-semibold leading-none">
                {key === 'monthly' ? 'Monthly' : 'Quarterly'}
              </span>
              <span className="mt-1 text-[11px] leading-tight opacity-80">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold mb-2">Features</h3>

        {FEATURES.map((feature, idx) => (
          <label
            key={feature.slug}
            className="flex items-center justify-between mb-2 p-2 border rounded cursor-pointer"
          >
            <div>
              <div className="text-xs font-medium">{feature.name}</div>
              <div className="text-[10px] text-gray-500">
                {feature.description}
              </div>
            </div>

            <input
              type="checkbox"
              checked={selectedFeatures[idx]}
              onChange={() => onFeatureChange(idx)}
            />
          </label>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onStartTrial}
        disabled={isLoading}
        className="w-full bg-green-700 text-white py-2 rounded text-sm"
      >
        {isLoading ? 'Loading...' : 'Start 21-Day Free Trial'}
      </button>
    </div>
  );
};

export default ConfigSection;