type PathwayKey = 'stepped-care' | 'direct-provider' | 'urgent-care';

type PathwaySelectorProps = {
  selectedPathway: PathwayKey;
  disabled?: boolean;
  onSelect: (pathway: PathwayKey) => void;
  showUpdatingText?: boolean;
};

const pathwayButtonClass = (selectedPathway: PathwayKey, key: PathwayKey): string => {
  if (key === 'urgent-care') {
    return `rounded-full border px-3 py-1.5 text-xs ${
      selectedPathway === key
        ? 'border-rose-300 bg-rose-50 font-semibold text-rose-700'
        : 'border-rose-200 text-rose-700'
    }`;
  }

  return `rounded-full border px-3 py-1.5 text-xs ${
    selectedPathway === key
      ? 'border-calm-sage bg-calm-sage/15 font-semibold text-charcoal'
      : 'border-calm-sage/25 text-charcoal/80'
  }`;
};

export default function PathwaySelector({
  selectedPathway,
  disabled = false,
  onSelect,
  showUpdatingText = false,
}: PathwaySelectorProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect('stepped-care')}
        className={pathwayButtonClass(selectedPathway, 'stepped-care')}
      >
        Stepped Care
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect('direct-provider')}
        className={pathwayButtonClass(selectedPathway, 'direct-provider')}
      >
        Direct Provider
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect('urgent-care')}
        className={pathwayButtonClass(selectedPathway, 'urgent-care')}
      >
        Urgent Care
      </button>
      {showUpdatingText && disabled ? <span className="text-xs text-charcoal/60">Updating pathway...</span> : null}
    </div>
  );
}
