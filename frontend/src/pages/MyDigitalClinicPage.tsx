import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ClinicTeamManager from '../components/clinic/ClinicTeamManager';
import PatientModule from '../components/clinic/PatientModule';
import NotesModule from '../components/clinic/NotesModule';
import SchedulingModule from '../components/clinic/SchedulingModule';

type TabType = 'overview' | 'team' | 'patients' | 'sessions' | 'settings';

export const MyDigitalClinicPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Mock Clinic ID - In production, this would come from auth/context
  const clinicId = 'trial-clinic-123';

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'team', label: 'My Team', icon: '👥' },
    { id: 'patients', label: 'Patients', icon: '🏥' },
    { id: 'sessions', label: 'Sessions', icon: '📅' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <>
      <Helmet>
        <title>MyDigitalClinic Dashboard - MANAS360</title>
        <meta name="description" content="SaaS Practice Management for Clinical Providers" />
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200">
                MDC
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">MyDigitalClinic</h1>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-widest">Siloed Practice Mode</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-semibold text-slate-900">Wellness Mind Clinic</div>
                <div className="text-xs text-slate-500">ID: MDC-2026-001</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-8 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Stats Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Total Patients', value: '42 / 50', trend: 'Trial Limit', color: 'blue' },
                  { label: 'Active Therapists', value: '3 / 5', trend: 'Standard Tier', color: 'indigo' },
                  { label: 'Sessions (Month)', value: '127', trend: '↑ 12% vs last month', color: 'green' },
                  { label: 'Trial Days Left', value: '14', trend: 'Expires May 10', color: 'orange' },
                ].map((stat, idx) => (
                  <div key={idx} className="rounded-2xl border border-white bg-white p-6 shadow-sm shadow-slate-200">
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                    </div>
                    <p className={`mt-1 text-xs font-medium text-${stat.color}-600`}>{stat.trend}</p>
                  </div>
                ))}
              </div>

              {/* Today's Schedule (Placeholder) */}
              <div className="rounded-2xl border border-white bg-white p-6 shadow-sm shadow-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Today's Schedule</h3>
                <div className="space-y-4">
                  {[
                    { time: '10:00 AM', patient: 'Rahul Kumar', therapist: 'Dr. Anjali (T1)', status: 'Confirmed' },
                    { time: '11:30 AM', patient: 'Priya Sharma', therapist: 'Dr. John (T2)', status: 'In Progress' },
                    { time: '02:00 PM', patient: 'Amit Patel', therapist: 'Dr. Anjali (T1)', status: 'Scheduled' },
                  ].map((session, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-bold text-blue-600 w-20">{session.time}</div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{session.patient}</div>
                          <div className="text-xs text-slate-500">{session.therapist}</div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.status === 'In Progress' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && <ClinicTeamManager clinicId={clinicId} />}
          
          {activeTab === 'patients' && <PatientModule />}

          {activeTab === 'sessions' && (
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900">Clinic Calendar</h3>
                <SchedulingModule />
              </div>
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900">Session Notes</h3>
                <NotesModule />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl rounded-2xl border border-white bg-white p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Clinic Settings</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border border-orange-100 bg-orange-50/50">
                  <div>
                    <p className="font-semibold text-orange-900">24h Auto-Purge (S3 Reports)</p>
                    <p className="text-xs text-orange-700">Patient reports will be permanently deleted from S3 after 24 hours.</p>
                  </div>
                  <div className="h-6 w-11 rounded-full bg-orange-200 relative cursor-not-allowed">
                    <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 opacity-60">
                  <p className="font-semibold text-slate-900">Custom Branding</p>
                  <p className="text-xs text-slate-600 italic">Available in Large Clinic tier.</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default MyDigitalClinicPage;
