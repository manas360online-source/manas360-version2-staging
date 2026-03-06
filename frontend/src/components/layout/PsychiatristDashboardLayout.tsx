import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Activity, BarChart3, Calendar, ClipboardList, MessageSquare, Pill, ShieldAlert, Stethoscope, Users } from 'lucide-react';
import { ProviderDashboardContext, type ProviderDashboardMode } from '../../context/ProviderDashboardContext';

type NavItem = { to: string; label: string; icon: any };

const professionalNav: NavItem[] = [
  { to: '/psychiatrist/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/psychiatrist/patients', label: 'Patients', icon: Users },
  { to: '/psychiatrist/assessments', label: 'Psychiatric Assessment', icon: ClipboardList },
  { to: '/psychiatrist/prescriptions', label: 'Prescriptions', icon: Pill },
  { to: '/psychiatrist/parameter-tracking', label: 'Parameter Tracking', icon: Activity },
  { to: '/psychiatrist/medication-history', label: 'Medication History', icon: Calendar },
  { to: '/psychiatrist/care-team', label: 'Care Team', icon: Users },
  { to: '/psychiatrist/messages', label: 'Messages', icon: MessageSquare },
  { to: '/psychiatrist/reports', label: 'Reports', icon: ShieldAlert },
];

const selfNav: NavItem[] = [
  { to: '/psychiatrist/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/psychiatrist/reports', label: 'Practice Reports', icon: ShieldAlert },
];

export default function PsychiatristDashboardLayout() {
  const location = useLocation();
  const [dashboardMode, setDashboardMode] = useState<ProviderDashboardMode>('professional');
  const [selectedPatientId, setSelectedPatientId] = useState('');

  const nav = useMemo(() => (dashboardMode === 'professional' ? professionalNav : selfNav), [dashboardMode]);

  return (
    <ProviderDashboardContext.Provider value={{ dashboardMode, setDashboardMode, selectedPatientId, setSelectedPatientId }}>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-[1400px]">
          <aside className="hidden w-72 border-r border-slate-200 bg-white p-4 lg:block">
            <div className="mb-6 flex items-center gap-2">
              <div className="rounded bg-teal-600 p-2 text-white"><Stethoscope size={16} /></div>
              <div>
                <p className="text-sm font-semibold text-slate-800">MANAS360</p>
                <p className="text-xs text-slate-500">Psychiatrist Console</p>
              </div>
            </div>
            <nav className="space-y-1">
              {nav.map((item) => {
                const active = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to} className={`flex items-center gap-2 rounded px-3 py-2 text-sm ${active ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main className="min-h-screen flex-1 p-4 lg:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Psychiatrist Dashboard</p>
                <p className="text-xs text-slate-500">Professional mode for patient care, self mode for practice analytics</p>
              </div>
              <div className="inline-flex rounded border border-slate-200 bg-slate-50 p-1 text-xs">
                <button
                  type="button"
                  className={`rounded px-3 py-1 ${dashboardMode === 'professional' ? 'bg-teal-600 text-white' : 'text-slate-600'}`}
                  onClick={() => setDashboardMode('professional')}
                >
                  Professional Mode
                </button>
                <button
                  type="button"
                  className={`rounded px-3 py-1 ${dashboardMode === 'practice' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                  onClick={() => setDashboardMode('practice')}
                >
                  Self Mode
                </button>
              </div>
            </div>
            <Outlet />
          </main>
        </div>
      </div>
    </ProviderDashboardContext.Provider>
  );
}
