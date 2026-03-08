import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CorporateBottomNav from './CorporateBottomNav';
import CorporateSidebar from './CorporateSidebar';
import CorporateTopbar from './CorporateTopbar';

const breadcrumbMap: Record<string, string[]> = {
  '/corporate/dashboard': ['Dashboard'],
  '/corporate/analytics': ['Analytics'],
  '/corporate/employees/directory': ['Employees', 'Directory'],
  '/corporate/employees/enrollment': ['Employees', 'Bulk Enrollment'],
  '/corporate/employees/allocation': ['Employees', 'Session Allocation'],
  '/corporate/reports/utilization': ['Reports', 'Utilization'],
  '/corporate/reports/wellbeing': ['Reports', 'Wellbeing'],
  '/corporate/reports/engagement': ['Reports', 'Engagement'],
  '/corporate/billing/invoices': ['Billing', 'Invoices'],
  '/corporate/billing/payment-methods': ['Billing', 'Payment Methods'],
  '/corporate/billing/plan': ['Billing', 'Plan'],
  '/corporate/sso': ['Account', 'SSO Settings'],
  '/corporate/account/help': ['Account', 'Help & Support'],
};

type CorporateLayoutProps = {
  title: string;
  subtitle?: string;
  companyName?: string;
  children: ReactNode;
};

export default function CorporateLayout({ title, subtitle, companyName = 'TechCorp India', children }: CorporateLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const breadcrumbs = useMemo(() => breadcrumbMap[location.pathname] || ['Dashboard'], [location.pathname]);

  return (
    <div className="h-screen overflow-hidden bg-surface-bg text-ink-800 antialiased">
      <div className="flex h-screen">
        <CorporateSidebar variant="full" />
        <CorporateSidebar variant="collapsed" />
        <CorporateSidebar variant="drawer" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex h-screen min-w-0 flex-1 flex-col md:pl-16 lg:pl-64">
          <CorporateTopbar title={title} companyName={companyName} onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

          <main className="flex-1 overflow-y-auto px-4 pb-20 pt-4 md:pb-6 lg:px-6">
            <div className="mb-3 text-xs text-ink-500">{breadcrumbs.join(' > ')}</div>
            <div className="mb-4">
              <h1 className="font-display text-2xl font-bold text-ink-800">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
            </div>
            {children}
          </main>

          <CorporateBottomNav />
        </div>
      </div>
    </div>
  );
}
