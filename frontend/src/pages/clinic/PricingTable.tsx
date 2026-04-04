import React from 'react';
import { FEATURES } from './data';
import { PricingResponse } from './api';

interface PricingTableProps {
  selectedFeatures: boolean[];
  currentTier: 'solo' | 'small' | 'large';
  currentBilling: 'monthly' | 'quarterly';
  pricing?: PricingResponse | null;
}

export const PricingTable: React.FC<PricingTableProps> = ({
  selectedFeatures,
  currentTier,
  currentBilling,
  pricing,
}) => {
  // Use API pricing data if available, otherwise calculate locally
  const tierPrices = {
    solo: FEATURES.map((f) => f.solo),
    small: FEATURES.map((f) => f.small),
    large: FEATURES.map((f) => f.large),
  };

  // Calculate totals
  let total_solo = 0,
    total_small = 0,
    total_large = 0;

  selectedFeatures.forEach((isSelected, idx) => {
    if (isSelected) {
      const feature = FEATURES[idx];
      total_solo += feature.solo;
      total_small += feature.small;
      total_large += feature.large;
    }
  });

  // Apply quarterly discount
  let display_solo = total_solo;
  let display_small = total_small;
  let display_large = total_large;
  const period = currentBilling === 'monthly' ? '/mo' : '/qtr';

  if (currentBilling === 'quarterly') {
    display_solo = Math.round(total_solo * 3 * 0.9);
    display_small = Math.round(total_small * 3 * 0.9);
    display_large = Math.round(total_large * 3 * 0.9);
  }

  return (
    <div className="overflow-x-auto mb-6">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2.5 text-left font-bold text-charcoal border-b-2 border-gray-300">
              Feature
            </th>
            <th className="p-2.5 text-center font-bold text-charcoal border-b-2 border-gray-300 w-32">
              <div>Solo</div>
              <div className="text-[9px] opacity-80">(1-50)</div>
            </th>
            <th className="p-2.5 text-center font-bold text-charcoal border-b-2 border-gray-300 w-32">
              <div>Small</div>
              <div className="text-[9px] opacity-80">(51-200)</div>
            </th>
            <th className="p-2.5 text-center font-bold text-charcoal border-b-2 border-gray-300 w-32">
              <div>Large</div>
              <div className="text-[9px] opacity-80">(200+)</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature, idx) => {
            const isSelected = selectedFeatures[idx];
            return (
              <tr key={idx} className="border-b border-gray-200">
                <td className="p-2.5 bg-gray-100 font-medium text-charcoal text-xs w-44">
                  {feature.name}
                </td>
                <td
                  className={`p-2.5 text-center font-bold text-xs ${
                    isSelected ? 'bg-green-50 text-[#4A6741]' : 'text-gray-400'
                  }`}
                >
                  {isSelected ? `₹${feature.solo}` : '✗'}
                </td>
                <td
                  className={`p-2.5 text-center font-bold text-xs ${
                    isSelected ? 'bg-green-50 text-[#4A6741]' : 'text-gray-400'
                  }`}
                >
                  {isSelected ? `₹${feature.small}` : '✗'}
                </td>
                <td
                  className={`p-2.5 text-center font-bold text-xs ${
                    isSelected ? 'bg-green-50 text-[#4A6741]' : 'text-gray-400'
                  }`}
                >
                  {isSelected ? `₹${feature.large}` : '✗'}
                </td>
              </tr>
            );
          })}

          {/* Total Row */}
          <tr className="bg-green-50 border-t-2 border-b-2 border-[#4A6741]">
            <td className="p-2.5 font-bold text-charcoal">💰 TOTAL</td>
            <td className="p-2.5 text-center font-bold text-xs text-[#4A6741]">
              ₹{display_solo}
              {period}
            </td>
            <td className="p-2.5 text-center font-bold text-xs text-[#4A6741]">
              ₹{display_small}
              {period}
            </td>
            <td className="p-2.5 text-center font-bold text-xs text-[#4A6741]">
              ₹{display_large}
              {period}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PricingTable;
