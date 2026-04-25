import { Link } from 'react-router-dom';

export default function ProviderDashboardHubPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Provider Dashboard Hub</h1>
        <p className="mt-2 text-sm text-slate-600">
          Unified provider workspace is active. Use the common sidebar to navigate shared and role-aware modules.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100" to="/provider/patients">
            Open Patients
          </Link>
          <Link className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100" to="/provider/messages">
            Open Messages
          </Link>
          <Link className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100" to="/provider/settings">
            Open Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
