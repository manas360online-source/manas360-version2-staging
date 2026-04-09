import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import AuditExportExample from '../../components/patient/AuditExportExample';
import NotesModule from '../../components/clinic/NotesModule';
import HomeworkModule from '../../components/clinic/HomeworkModule';
import PatientModule from '../../components/clinic/PatientModule';
import PrescriptionModule from '../../components/clinic/PrescriptionModule';
import ProgressModule from '../../components/clinic/ProgressModule';
import SchedulingModule from '../../components/clinic/SchedulingModule';
import BulkPatientImport from '../../components/BulkPatientImport';
import MultiTherapistManager from '../../components/MultiTherapistManager';
import JitsiSessionLauncher from '../../components/JitsiSessionLauncher';

type ClinicTab = 'patients' | 'sessions' | 'notes' | 'progress' | 'prescriptions' | 'homework' | 'audit' | 'bulk' | 'therapists' | 'jitsi';
type DashboardFeatureKey =
  | 'patient-database'
  | 'session-notes'
  | 'scheduling'
  | 'progress-tracking'
  | 'prescriptions'
  | 'homework'
  | 'audit-export'
  | 'bulk-import'
  | 'multi-therapist'
  | 'jitsi-session';

const STORAGE_KEY = 'selectedFeatures';

type TabConfig = {
  key: ClinicTab;
  label: string;
  featureKey: DashboardFeatureKey;
};

const TABS: TabConfig[] = [
  { key: 'patients', label: 'Patient Database', featureKey: 'patient-database' },
  { key: 'sessions', label: 'Scheduling', featureKey: 'scheduling' },
  { key: 'notes', label: 'Session Notes', featureKey: 'session-notes' },
  { key: 'progress', label: 'Progress Tracking', featureKey: 'progress-tracking' },
  { key: 'prescriptions', label: 'Prescriptions', featureKey: 'prescriptions' },
  { key: 'homework', label: 'Homework', featureKey: 'homework' },
  { key: 'audit', label: 'Audit / Export', featureKey: 'audit-export' },
  { key: 'bulk', label: 'Bulk Import', featureKey: 'bulk-import' },
  { key: 'therapists', label: 'Therapists', featureKey: 'multi-therapist' },
  { key: 'jitsi', label: 'Live Session', featureKey: 'jitsi-session' },
];

const isDashboardFeatureKey = (value: unknown): value is DashboardFeatureKey => {
  return (
    value === 'patient-database'
    || value === 'session-notes'
    || value === 'scheduling'
    || value === 'progress-tracking'
    || value === 'prescriptions'
    || value === 'homework'
    || value === 'audit-export'
    || value === 'bulk-import'
    || value === 'multi-therapist'
    || value === 'jitsi-session'
  );
};

export default function ClinicDashboard() {
  const [features, setFeatures] = useState<DashboardFeatureKey[]>([]);
  const [activeTab, setActiveTab] = useState<ClinicTab | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setFeatures([]);
        return;
      }

      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        setFeatures([]);
        return;
      }

      const validFeatures = parsed.filter(isDashboardFeatureKey);
      setFeatures(Array.from(new Set(validFeatures)));
    } catch (error) {
      console.error('Failed to read selected features from localStorage', error);
      setFeatures([]);
    }
  }, []);

  const allowedTabs = useMemo(() => {
    return TABS.filter((tab) => features.includes(tab.featureKey));
  }, [features]);

  useEffect(() => {
    if (allowedTabs.length === 0) {
      setActiveTab(null);
      return;
    }

    if (!activeTab || !allowedTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(allowedTabs[0].key);
    }
  }, [activeTab, allowedTabs]);

  const content = useMemo(() => {
    if (!activeTab) return null;
    if (activeTab === 'patients') return <PatientModule />;
    if (activeTab === 'sessions') return <SchedulingModule />;
    if (activeTab === 'notes') return <NotesModule />;
    if (activeTab === 'progress') return <ProgressModule />;
    if (activeTab === 'prescriptions') return <PrescriptionModule />;
    if (activeTab === 'homework') return <HomeworkModule />;
    if (activeTab === 'bulk') return <BulkPatientImport clinicId="demo-clinic" />;
    if (activeTab === 'therapists') return <MultiTherapistManager clinicId="demo-clinic" />;
    if (activeTab === 'jitsi') return <JitsiSessionLauncher sessionId="demo-session" clinicId="demo-clinic" patientName="Test Patient" />;
    return <AuditExportExample />;
  }, [activeTab]);

  return (
    <>
      <Helmet>
        <title>MyDigitalClinic Dashboard - MANAS360</title>
      </Helmet>

      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">MyDigitalClinic Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Unified clinical workspace for patient records, sessions, notes, progress, prescriptions, homework, and audit controls.
            </p>
          </header>

          <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            {allowedTabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {allowedTabs.length === 0 ? (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">No modules enabled</h2>
              <p className="mt-1 text-sm text-slate-600">
                Select one or more features in pricing to unlock dashboard modules.
              </p>
              <Link
                to="/my-digital-clinic"
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Go to Pricing Page
              </Link>
            </section>
          ) : (
            <section>{content}</section>
          )}
        </div>
      </main>
    </>
  );
}
