import React from 'react';

interface OptionButtonProps {
  label: string;
  description?: string;
  isActive: boolean;
  onClick: () => void;
}

export const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  description,
  isActive,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 border-2 rounded text-center transition-all ${
        isActive
          ? 'bg-[#4A6741] text-white border-[#4A6741]'
          : 'bg-white text-charcoal border-gray-300 hover:border-[#4A6741] hover:bg-green-50'
      }`}
    >
      <div className="font-medium text-xs">{label}</div>
      {description && <div className={`text-[9px] ${isActive ? 'opacity-90' : 'opacity-80'}`}>{description}</div>}
    </button>
  );
};

export default OptionButton;
