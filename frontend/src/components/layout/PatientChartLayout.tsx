import { useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePatientOverview } from '../../hooks/usePatientOverview';

type ProviderKind = 'THERAPIST' | 'PSYCHIATRIST' | 'COACH' | 'PSYCHOLOGIST';

type TabItem = {
  label: string;
  path: string;
};

const toProviderKind = (role: string | undefined): ProviderKind => {
  const normalized = String(role || 'THERAPIST').toUpperCase();
  if (normalized === 'PSYCHIATRIST' || normalized === 'COACH' || normalized === 'PSYCHOLOGIST') {
    return normalized;
  }
  return 'THERAPIST';
};

const tabConfig: Record<ProviderKind, TabItem[]> = {
  THERAPIST: [
    { label: 'Overview', path: 'overview' },
    { label: 'Session Notes', path: 'notes' },
    { label: 'Assessments', path: 'assessments' },
    { label: 'CBT Modules', path: 'cbt' },
    { label: 'Plan Studio', path: 'plan-builder' },
  ],
  PSYCHOLOGIST: [
    { label: 'Overview', path: 'overview' },
    { label: 'Session Notes', path: 'notes' },
    { label: 'Assessments', path: 'assessments' },
    { label: 'CBT Modules', path: 'cbt' },
    { label: 'Plan Studio', path: 'plan-builder' },
  ],
  COACH: [
    { label: 'Overview', path: 'overview' },
    { label: 'Session Notes', path: 'notes' },
    { label: 'Assessments', path: 'assessments' },
    { label: 'Goals & Habits', path: 'goals' },
    { label: 'Plan Studio', path: 'plan-builder' },
  ],
  PSYCHIATRIST: [
    { label: 'Overview', path: 'overview' },
    { label: 'Prescriptions', path: 'prescriptions' },
    { label: 'Lab Orders', path: 'labs' },
    { label: 'Clinical Notes', path: 'clinical-notes' },
    { label: 'Plan Studio', path: 'plan-builder' },
  ],
};

export default function PatientChartLayout() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { user } = useAuth();
  const { data: overview } = usePatientOverview(patientId);

  const providerRole = useMemo(() => toProviderKind(user?.role), [user?.role]);
  const tabs = tabConfig[providerRole];

  const patientName = String(overview?.patient?.name || 'Patient').trim() || 'Patient';
  const patientAge = overview?.patient?.age ? `${overview.patient.age} yrs` : 'Age unavailable';
  const nameParts = patientName.split(/\s+/).filter(Boolean);
  const patientInitials = nameParts.length > 1
    ? `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase()
    : patientName.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <section className="sticky top-0 z-20 rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#E5E5E5] px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/provider/patients')}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] px-3 py-1.5 text-xs font-medium text-[#2D4128] transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Hub
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f5ee] text-xs font-bold text-[#4A6741]">
              {patientInitials}
            </div>

            <div>
              <p className="font-sans text-base font-bold text-[#2D4128]">{patientName}</p>
              <p className="text-xs text-slate-500">{patientAge} • ID {patientId || '123'}</p>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Role Workspace: <span className="font-sans font-bold text-[#4A6741]">{providerRole}</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto px-3 py-2">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `rounded-t-md border-b-2 px-3 py-2 text-sm transition-all ${
                  isActive
                    ? 'border-[#4A6741] font-sans font-bold text-[#2D4128]'
                    : 'border-transparent text-slate-500 hover:text-[#4A6741]'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </section>

      <section className="bg-transparent p-0">
        <Outlet />
      </section>
    </div>
  );
}
