import React from 'react';
import { FEATURES } from './data';

interface FeatureListProps {
  selectedFeatures: boolean[];
  onFeatureChange: (index: number) => void;
  currentTier: 'solo' | 'small' | 'large';
}

export const FeatureList: React.FC<FeatureListProps> = ({
  selectedFeatures,
  onFeatureChange,
  currentTier,
}) => {
  const getPrice = (index: number): number => {
    const feature = FEATURES[index];
    return feature[currentTier];
  };

  return (
    <div className="mb-5">
      <div className="text-xs font-bold text-[#4A6741] uppercase tracking-wider mb-3 border-b-2 border-[#4A6741] pb-2">
        ✨ Optional Features (Select Any)
      </div>

      <div className="space-y-1.5">
        {FEATURES.map((feature, idx) => (
          <label
            key={idx}
            className="flex items-center p-2.5 bg-gray-100 rounded hover:bg-green-50 hover:border hover:border-[#4A6741] cursor-pointer transition-all"
          >
            <input
              type="checkbox"
              checked={selectedFeatures[idx] || false}
              onChange={() => onFeatureChange(idx)}
              className="w-4 h-4 mr-3 accent-[#4A6741] flex-shrink-0 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-charcoal text-xs">{feature.name}</div>
              <div className="text-gray-600 text-[10px]">{feature.description}</div>
            </div>
            <div className="text-[#4A6741] font-bold text-xs ml-2 whitespace-nowrap">
              ₹{getPrice(idx)}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default FeatureList;
