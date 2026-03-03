import type { ReactNode } from 'react';

type TherapistPageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function TherapistPageShell({ title, subtitle, children }: TherapistPageShellProps) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-2xl font-bold text-ink-800">{title}</h2>
        <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
      </section>
      {children}
    </div>
  );
}
