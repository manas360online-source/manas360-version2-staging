type TherapistBadgeVariant = 'default' | 'sage' | 'clay' | 'danger' | 'success' | 'warning';

type TherapistBadgeProps = {
  label: string;
  variant?: TherapistBadgeVariant;
  className?: string;
};

const variantClassMap: Record<TherapistBadgeVariant, string> = {
  default: 'bg-ink-100 text-ink-500',
  sage: 'bg-sage-50 text-sage-500',
  clay: 'bg-clay-50 text-clay-500',
  danger: 'bg-red-50 text-red-600',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
};

export default function TherapistBadge({ label, variant = 'default', className = '' }: TherapistBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${variantClassMap[variant]} ${className}`}>
      {label}
    </span>
  );
}
