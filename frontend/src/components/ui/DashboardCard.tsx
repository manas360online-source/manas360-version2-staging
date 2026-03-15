import type { ElementType, ReactNode } from 'react';

type DashboardCardProps = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

export default function DashboardCard({ as: Component = 'div', className = '', children }: DashboardCardProps) {
  return (
    <Component
      className={`app-card rounded-2xl p-6 bg-white/92 max-w-full ${className}`}
    >
      {children}
    </Component>
  );
}
