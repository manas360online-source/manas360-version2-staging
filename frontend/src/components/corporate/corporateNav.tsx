import type { ReactNode } from 'react';
import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  HelpCircle,
  Home,
  LineChart,
  Lock,
  Settings,
  Shield,
  UserCog,
  Users,
} from 'lucide-react';

export type CorporateNavItem = {
  key: string;
  label: string;
  to: string;
  icon: ReactNode;
};

export type CorporateNavSection = {
  title: string;
  items: CorporateNavItem[];
};

export const corporateNavSections: CorporateNavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { key: 'dashboard', label: 'Dashboard', to: '/corporate/dashboard', icon: <Home className="h-4 w-4" /> },
      { key: 'analytics', label: 'Analytics', to: '/corporate/analytics', icon: <LineChart className="h-4 w-4" /> },
    ],
  },
  {
    title: 'EMPLOYEES',
    items: [
      { key: 'directory', label: 'Employee Directory', to: '/corporate/employees/directory', icon: <Users className="h-4 w-4" /> },
      { key: 'enrollment', label: 'Bulk Enrollment', to: '/corporate/employees/enrollment', icon: <UserCog className="h-4 w-4" /> },
      { key: 'allocation', label: 'Session Allocation', to: '/corporate/employees/allocation', icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    title: 'REPORTS',
    items: [
      { key: 'utilization', label: 'Utilization Reports', to: '/corporate/reports/utilization', icon: <FileText className="h-4 w-4" /> },
      { key: 'wellbeing', label: 'Employee Wellbeing', to: '/corporate/reports/wellbeing', icon: <Shield className="h-4 w-4" /> },
      { key: 'engagement', label: 'Engagement Tracking', to: '/corporate/reports/engagement', icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    title: 'BILLING',
    items: [
      { key: 'payments', label: 'Payment Methods', to: '/corporate/billing/payment-methods', icon: <CreditCard className="h-4 w-4" /> },
      { key: 'plan', label: 'Plan & Subscription', to: '/corporate/billing/plan', icon: <Building2 className="h-4 w-4" /> },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { key: 'sso', label: 'SSO Settings', to: '/corporate/sso', icon: <Lock className="h-4 w-4" /> },
      { key: 'privacy', label: 'Privacy Controls', to: '/corporate/account/help', icon: <Shield className="h-4 w-4" /> },
      { key: 'help', label: 'Help & Support', to: '/corporate/account/help', icon: <HelpCircle className="h-4 w-4" /> },
    ],
  },
];

export const corporateMobileShortcuts: CorporateNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', to: '/corporate/dashboard', icon: <Home className="h-4 w-4" /> },
  { key: 'analytics', label: 'Analytics', to: '/corporate/analytics', icon: <LineChart className="h-4 w-4" /> },
  { key: 'employees', label: 'Employees', to: '/corporate/employees/directory', icon: <Users className="h-4 w-4" /> },
  { key: 'reports', label: 'Reports', to: '/corporate/reports/utilization', icon: <FileText className="h-4 w-4" /> },
  { key: 'settings', label: 'Settings', to: '/corporate/sso', icon: <Settings className="h-4 w-4" /> },
];

export const isCorporateNavActive = (pathname: string, targetPath: string): boolean => {
  if (pathname === targetPath) return true;
  if (targetPath === '/corporate/dashboard' && pathname === '/corporate') return true;
  return pathname.startsWith(`${targetPath}/`);
};
