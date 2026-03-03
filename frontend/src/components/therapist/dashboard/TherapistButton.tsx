import type { ButtonHTMLAttributes, ReactNode } from 'react';

type TherapistButtonVariant = 'primary' | 'secondary' | 'soft' | 'clay';

type TherapistButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: TherapistButtonVariant;
  fullWidth?: boolean;
};

const variantClassMap: Record<TherapistButtonVariant, string> = {
  primary: 'bg-sage-500 text-white hover:bg-sage-600',
  secondary: 'bg-white text-ink-500 border border-ink-100 hover:bg-surface-bg',
  soft: 'bg-sage-50 text-sage-500 hover:bg-sage-100',
  clay: 'bg-clay-500 text-white hover:bg-clay-600',
};

export default function TherapistButton({
  children,
  className = '',
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  ...props
}: TherapistButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${variantClassMap[variant]} ${fullWidth ? 'w-full' : ''} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
