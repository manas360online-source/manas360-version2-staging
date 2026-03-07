import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  Calendar,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Pill,
  Search,
  Settings,
  ShieldAlert,
  User,
  Users,
  X,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  psychiatristApi,
  type PsychiatristDashboard,
  type PsychiatristPatient,
} from '../../api/psychiatrist.api';
import { useAuth } from '../../context/AuthContext';
import { ProviderDashboardContext, type ProviderDashboardMode } from '../../context/ProviderDashboardContext';

type NavItem = {
  to: string;
  label: string;
  icon: any;
  badge?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const professionalSections: NavSection[] = [
  {
    title: 'Professional Mode',
    items: [
      { to: '/psychiatrist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/psychiatrist/patients', label: 'My Patients', icon: Users },
      { to: '/psychiatrist/consultations', label: 'Consultations', icon: Calendar },
      { to: '/psychiatrist/assessments', label: 'Assessments', icon: ClipboardList },
      { to: '/psychiatrist/prescriptions', label: 'Prescriptions', icon: Pill },
      { to: '/psychiatrist/drug-interactions', label: 'Drug Interactions', icon: ShieldAlert },
      { to: '/psychiatrist/parameter-tracking', label: 'Parameter Tracking', icon: Activity },
      { to: '/psychiatrist/medication-history', label: 'Medication History', icon: Calendar },
      { to: '/psychiatrist/care-team', label: 'Care Team', icon: Users },
      { to: '/psychiatrist/messages', label: "Dr. Meera 'Ai Chatbot", icon: MessageSquare },
      { to: '/psychiatrist/reports', label: 'Reports', icon: ShieldAlert },
    ],
  },
];

const selfSections: NavSection[] = [
  {
    title: 'Self Mode',
    items: [
      { to: '/psychiatrist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/psychiatrist/patients', label: 'My Patients', icon: Users },
      { to: '/psychiatrist/consultation-analytics', label: 'Consultation Analytics', icon: Calendar },
      { to: '/psychiatrist/prescription-analytics', label: 'Prescription Analytics', icon: Pill },
    ],
  },
  {
    title: 'My Practice',
    items: [
      { to: '/psychiatrist/medication-library', label: 'Medication Library', icon: Pill },
      { to: '/psychiatrist/assessment-templates', label: 'Assessment Templates', icon: ClipboardList },
      { to: '/psychiatrist/reports', label: 'Practice Reports', icon: ShieldAlert },
      { to: '/psychiatrist/earnings', label: 'Earnings', icon: Activity },
    ],
  },
  {
    title: 'Settings',
    items: [
      { to: '/psychiatrist/settings', label: 'Settings', icon: Settings },
      { to: '/psychiatrist/help-support', label: 'Help & Support', icon: CircleHelp },
    ],
  },
];

const professionalMobileNavItems: NavItem[] = [
  { to: '/psychiatrist/patients', label: 'Patients', icon: Users },
  { to: '/psychiatrist/consultations', label: 'Consults', icon: Calendar },
  { to: '/psychiatrist/prescriptions', label: 'Rx', icon: Pill },
  { to: '/psychiatrist/drug-interactions', label: 'Interactions', icon: ShieldAlert },
  { to: '/psychiatrist/messages', label: "Dr. Meera 'Ai", icon: MessageSquare },
];

const selfMobileNavItems: NavItem[] = [
  { to: '/psychiatrist/patients', label: 'Patients', icon: Users },
  { to: '/psychiatrist/reports', label: 'Reports', icon: ShieldAlert },
  { to: '/psychiatrist/earnings', label: 'Earnings', icon: Activity },
  { to: '/psychiatrist/settings', label: 'Settings', icon: Settings },
  { to: '/psychiatrist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/psychiatrist/help-support', label: 'Help', icon: CircleHelp },
];

const titleMap: Record<string, string> = {
  '/psychiatrist/dashboard': 'Dashboard',
  '/psychiatrist/patients': 'My Patients',
  '/psychiatrist/consultations': 'Consultations',
  '/psychiatrist/assessments': 'Assessments',
  '/psychiatrist/prescriptions': 'Prescriptions',
  '/psychiatrist/drug-interactions': 'Drug Interactions',
  '/psychiatrist/parameter-tracking': 'Parameter Tracking',
  '/psychiatrist/medication-history': 'Medication History',
  '/psychiatrist/care-team': 'Care Team',
  '/psychiatrist/messages': "Dr. Meera 'Ai Chatbot",
  '/psychiatrist/reports': 'Reports',
  '/psychiatrist/consultation-analytics': 'Consultation Analytics',
  '/psychiatrist/prescription-analytics': 'Prescription Analytics',
  '/psychiatrist/medication-library': 'Medication Library',
  '/psychiatrist/assessment-templates': 'Assessment Templates',
  '/psychiatrist/earnings': 'Earnings',
  '/psychiatrist/settings': 'Settings',
  '/psychiatrist/help-support': 'Help & Support',
};

const DASHBOARD_MODE_STORAGE_KEY = 'manas360.psychiatrist.dashboardMode';
const DASHBOARD_PATIENT_STORAGE_KEY = 'manas360.psychiatrist.selectedPatientId';

const initialsFromName = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PS';

export default function PsychiatristDashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [dashboardMeta, setDashboardMeta] = useState<PsychiatristDashboard | null>(null);
  const [patientOptions, setPatientOptions] = useState<PsychiatristPatient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [dashboardMode, setDashboardMode] = useState<ProviderDashboardMode>(() => {
    if (typeof window === 'undefined') return 'professional';
    return window.localStorage.getItem(DASHBOARD_MODE_STORAGE_KEY) === 'practice' ? 'practice' : 'professional';
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(DASHBOARD_PATIENT_STORAGE_KEY) || '';
  });

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || 'Psychiatrist';
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

  const isActive = (path: string) => {
    const normalizedPath = path.split('?')[0];
    return location.pathname === normalizedPath || location.pathname.startsWith(`${normalizedPath}/`);
  };

  useEffect(() => {
    setMobileSidebarOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const loadSidebarMeta = async () => {
      try {
        const patientsRes = await psychiatristApi.getPatients();
        const patients = patientsRes.items || [];
        setPatientOptions(patients);

        const hasSelectedPatient = selectedPatientId
          ? patients.some((patient) => patient.patientId === selectedPatientId)
          : false;
        const fallbackPatientId = patients[0]?.patientId || '';
        const effectivePatientId = hasSelectedPatient ? selectedPatientId : fallbackPatientId;

        if (selectedPatientId && !hasSelectedPatient) {
          setSelectedPatientId(effectivePatientId);
        }

        if (dashboardMode === 'practice') {
          const selfRes = await psychiatristApi.getSelfMode();
          setDashboardMeta({
            mode: 'self',
            patientSelected: false,
            medicationReviewsDue: Number(selfRes.activePrescriptions || 0),
          });
        } else {
          const dashboardRes = await psychiatristApi.getDashboard(effectivePatientId || undefined);
          setDashboardMeta(dashboardRes);
        }
      } catch {
        setDashboardMeta(null);
        setPatientOptions([]);
      }
    };

    void loadSidebarMeta();
  }, [dashboardMode, selectedPatientId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DASHBOARD_MODE_STORAGE_KEY, dashboardMode);
  }, [dashboardMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DASHBOARD_PATIENT_STORAGE_KEY, selectedPatientId);
  }, [selectedPatientId]);

  useEffect(() => {
    if (mobileSidebarOpen || profileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen, profileMenuOpen]);

  const onLogout = async () => {
    await logout();
    navigate('/auth/login', { replace: true });
  };

  const filteredPatients = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return patientOptions;
    return patientOptions.filter((patient) => {
      return (
        String(patient.name || '').toLowerCase().includes(term) ||
        String(patient.patientUserId || '').toLowerCase().includes(term)
      );
    });
  }, [patientOptions, patientSearch]);

  const sections = useMemo(() => {
    const sourceSections = dashboardMode === 'professional' ? professionalSections : selfSections;
    const patientsCount = patientOptions.length;
    const reviewsDue = dashboardMeta?.medicationReviewsDue;

    return sourceSections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.to === '/psychiatrist/patients') {
          return { ...item, badge: patientsCount > 0 ? String(patientsCount) : undefined };
        }
        if (item.to === '/psychiatrist/prescriptions') {
          return { ...item, badge: typeof reviewsDue === 'number' ? `${reviewsDue} due` : undefined };
        }
        return item;
      }),
    }));
  }, [dashboardMeta, dashboardMode, patientOptions.length]);

  const mobileNavItems = dashboardMode === 'professional' ? professionalMobileNavItems : selfMobileNavItems;

  return (
    <ProviderDashboardContext.Provider
      value={{
        selectedPatientId,
        setSelectedPatientId,
        dashboardMode,
        setDashboardMode,
      }}
    >
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
            <span className="ml-auto rounded-full bg-sage-50 px-2 py-0.5 text-[10px] font-medium text-sage-500">Psychiatrist</span>
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
                        key={`${item.to}-${item.label}`}
                        to={item.to}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                          active ? 'bg-sage-50 font-semibold text-sage-500' : 'text-ink-500 hover:bg-[#EFEDE9]'
                        }`}
                      >
                        <Icon className={`h-[18px] w-[18px] ${active ? 'text-sage-500' : 'text-ink-500'}`} />
                        <span>{item.label}</span>
                        {item.badge ? (
                          <span className="ml-auto rounded-full bg-sage-50 px-1.5 py-0.5 text-[11px] font-medium text-sage-500">
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
                <p className="text-[11px] text-ink-500">Psychiatrist</p>
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

            <div className="ml-4 hidden items-center rounded-xl border border-ink-100 bg-white p-1 md:inline-flex">
              <button
                type="button"
                onClick={() => setDashboardMode('professional')}
                className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  dashboardMode === 'professional' ? 'bg-sage-500 text-white' : 'text-ink-500 hover:bg-sage-50'
                }`}
              >
                Professional Mode
              </button>
              <button
                type="button"
                onClick={() => setDashboardMode('practice')}
                className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  dashboardMode === 'practice' ? 'bg-sky-600 text-white' : 'text-ink-500 hover:bg-sky-50'
                }`}
              >
                Self Mode
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 rounded-lg bg-ink-100 px-3 py-2 lg:flex lg:w-52">
                <Search className="h-4 w-4 text-ink-500" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  className="w-full border-0 bg-transparent p-0 text-sm text-ink-800 placeholder:text-ink-500 focus:ring-0"
                />
              </div>

              <label className={`hidden items-center gap-2 rounded-lg border border-ink-100 bg-white px-2 py-1 md:flex ${dashboardMode === 'professional' ? '' : 'md:hidden'}`} htmlFor="psychiatrist-patient-select">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">Select Patient</span>
                <select
                  id="psychiatrist-patient-select"
                  value={selectedPatientId}
                  onChange={(event) => setSelectedPatientId(event.target.value)}
                  className="min-w-[180px] border-0 bg-transparent py-1 pl-2 pr-6 text-sm text-ink-800 focus:ring-0"
                >
                  <option value="">All Patients</option>
                  {filteredPatients.map((patient) => (
                    <option key={patient.patientId} value={patient.patientId}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="hidden items-center gap-2 rounded-full bg-sage-50 px-3 py-1.5 text-xs font-medium text-sage-500 sm:flex">
                <span className="h-2 w-2 rounded-full bg-sage-500" />
                Online
              </div>

              <button type="button" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              </button>

              <button
                type="button"
                onClick={() => setProfileMenuOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg p-1 pr-3 hover:bg-ink-100"
                aria-label="Open profile menu"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-50 font-display text-xs font-bold text-sage-500">{initials}</div>
                <ChevronDown className="hidden h-3.5 w-3.5 text-ink-500 sm:block" />
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] px-4 py-4 pb-24 lg:px-6 lg:py-6 lg:pb-6">
            <Outlet />
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-100 bg-white/95 px-2 py-1.5 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] backdrop-blur md:hidden">
            <ul className="grid grid-cols-5 gap-1">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <li key={`${item.to}-${item.label}`}>
                    <Link
                      to={item.to}
                      className={`flex min-h-[56px] flex-col items-center justify-center rounded-lg px-1 py-1 text-[11px] font-medium transition ${
                        active ? 'bg-sage-50 text-sage-500' : 'text-ink-500 hover:bg-ink-100'
                      }`}
                    >
                      <Icon className="mb-1 h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {profileMenuOpen && (
          <div
            className="fixed inset-0 z-[70] flex items-start justify-end bg-charcoal/20 p-3 pt-16 backdrop-blur-sm sm:p-4 sm:pt-20"
            onClick={() => setProfileMenuOpen(false)}
          >
            <div
              className="w-full max-w-xs rounded-2xl border border-ink-100 bg-[#F5F3F0]/95 p-3 shadow-soft-sm"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Profile menu"
            >
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/85 px-3 py-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-50 text-xs font-semibold text-sage-500">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-800">{userName}</p>
                  <p className="text-[11px] text-ink-500">Psychiatrist Account</p>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/psychiatrist/dashboard');
                  }}
                  className="flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
                >
                  <User className="h-[18px] w-[18px] text-ink-500" />
                  <span>My Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/psychiatrist/settings');
                  }}
                  className="flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
                >
                  <Settings className="h-[18px] w-[18px] text-ink-500" />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/psychiatrist/reports');
                  }}
                  className="flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
                >
                  <ShieldAlert className="h-[18px] w-[18px] text-ink-500" />
                  <span>Practice Reports</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/psychiatrist/help-support');
                  }}
                  className="flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
                >
                  <CircleHelp className="h-[18px] w-[18px] text-ink-500" />
                  <span>Help & Support</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    void onLogout();
                  }}
                  className="flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
                >
                  <LogOut className="h-[18px] w-[18px] text-ink-500" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProviderDashboardContext.Provider>
  );
}
