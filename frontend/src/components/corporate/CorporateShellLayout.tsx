import type { ReactNode } from 'react';
import CorporateLayout from './CorporateLayout';

export default function CorporateShellLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <CorporateLayout title={title} subtitle={subtitle}>
      {children}
    </CorporateLayout>
  );
}
