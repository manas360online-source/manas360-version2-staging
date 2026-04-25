import type { ReactNode } from 'react';

type TherapistCardProps = {
  children: ReactNode;
  className?: string;
};

export default function TherapistCard({ children, className = '' }: TherapistCardProps) {
  return (
    <section className={`rounded-xl border border-ink-100 bg-surface-card shadow-soft-xs ${className}`}>
      {children}
    </section>
  );
}
