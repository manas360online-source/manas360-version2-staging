import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

type NavItem = {
  to: string;
  label: string;
  icon: any;
  badge?: string;
  dot?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { to: '/therapist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/therapist/patients', label: 'My Patients', icon: Users, badge: '24' },
      { to: '/therapist/sessions', label: 'Sessions', icon: Calendar, badge: '3 today' },
      { to: '/therapist/session-notes', label: 'Session Notes', icon: BookOpen, dot: true },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/therapist/earnings', label: 'Earnings', icon: Wallet },
      { to: '/therapist/payout-history', label: 'Payout History', icon: Wallet },
    ],
  },
  {
    title: 'Communicate',
    items: [
      { to: '/therapist/messages', label: 'Messages', icon: MessageSquare, badge: '5' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { to: '/therapist/exercise-library', label: 'Exercise Library', icon: Wrench },
      { to: '/therapist/analytics', label: 'Analytics', icon: LineChart },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/therapist/settings', label: 'Settings', icon: Settings },
      { to: '/therapist/help-support', label: 'Help & Support', icon: CircleHelp },
    ],
  },
];

const titleMap: Record<string, string> = {
  '/therapist/dashboard': 'Dashboard',
  '/therapist/patients': 'My Patients',
  '/therapist/sessions': 'Sessions',
  '/therapist/session-notes': 'Session Notes',
  '/therapist/earnings': 'Earnings',
  '/therapist/payout-history': 'Payout History',
  '/therapist/messages': 'Messages',
  '/therapist/exercise-library': 'Exercise Library',
  '/therapist/analytics': 'Analytics',
  '/therapist/settings': 'Settings',
  '/therapist/help-support': 'Help & Support',
};

const initialsFromName = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'TH';

export default function TherapistDashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || 'Therapist';
  const initials = initialsFromName(userName);

  const pageTitle = useMemo(() => {
    const exact = titleMap[location.pathname];
    if (exact) return exact;
    const firstMatch = Object.entries(titleMap).find(([path]) => location.pathname.startsWith(path));
    return firstMatch?.[1] || 'Dashboard';
  }, [location.pathname]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

  const onLogout = async () => {
    await logout();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface-bg text-ink-800">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-ink-100 bg-[#F5F3F0] transition-transform duration-300 lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-ink-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-500 text-sm font-bold text-white">M</div>
          <span className="font-display text-lg font-bold text-sage-500">MANAS360</span>
          <span className="ml-auto rounded-full bg-sage-50 px-2 py-0.5 text-[10px] font-medium text-sage-500">Provider</span>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-500">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                        active ? 'bg-sage-50 font-semibold text-sage-500' : 'text-ink-500 hover:bg-[#EFEDE9]'
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] ${active ? 'text-sage-500' : 'text-ink-500'}`} />
                      <span>{item.label}</span>
                      {item.dot ? <span className="ml-auto h-2 w-2 rounded-full bg-clay-500" /> : null}
                      {item.badge ? (
                        <span
                          className={`ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                            item.label === 'Messages' ? 'bg-red-50 text-red-600' : item.label === 'Sessions' ? 'bg-clay-50 text-clay-500' : 'bg-sage-50 text-sage-500'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-ink-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-50 font-display text-sm font-bold text-sage-500">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-800">{userName}</p>
              <p className="text-[11px] text-ink-500">Clinical Psychologist</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-ink-100 bg-surface-card px-3 text-sm font-medium text-ink-500 transition hover:bg-surface-bg"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-ink-100 bg-white/80 px-4 backdrop-blur-lg lg:px-6">
          <button
            type="button"
            className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h1 className="font-display text-lg font-bold text-ink-800">{pageTitle}</h1>
            <p className="hidden text-[11px] text-ink-500 sm:block">{todayLabel}</p>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-lg bg-ink-100 px-3 py-2 md:flex md:w-52">
              <Search className="h-4 w-4 text-ink-500" />
              <input
                type="text"
                placeholder="Search patients..."
                className="w-full border-0 bg-transparent p-0 text-sm text-ink-800 placeholder:text-ink-500 focus:ring-0"
              />
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-sage-50 px-3 py-1.5 text-xs font-medium text-sage-500 sm:flex">
              <span className="h-2 w-2 rounded-full bg-sage-500" />
              Online
            </div>

            <button type="button" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <button type="button" className="inline-flex items-center gap-2 rounded-lg p-1 pr-3 hover:bg-ink-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-50 font-display text-xs font-bold text-sage-500">{initials}</div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-ink-500 sm:block" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
