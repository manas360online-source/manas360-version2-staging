import { useEffect, useState } from 'react';
import { psychologistApi, PsychologistDashboardResponse } from '../../api/psychologist.api';

export default function PsychologistDashboardPage() {
  const [data, setData] = useState<PsychologistDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    psychologistApi
      .getDashboard()
      .then((res) => {
        if (!mounted) return;
        setData(res);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Failed to load dashboard');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Psychologist Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">Overview of your patients and recent activity.</p>

      {loading && <div className="mt-6 text-sm text-gray-500">Loading dashboard...</div>}
      {error && <div className="mt-6 text-sm text-red-600">{error}</div>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white shadow rounded p-4">
              <div className="text-xs text-gray-500">Total patients</div>
              <div className="mt-2 text-2xl font-semibold">{data.cards.totalPatients}</div>
            </div>

            <div className="bg-white shadow rounded p-4">
              <div className="text-xs text-gray-500">Pending evaluations</div>
              <div className="mt-2 text-2xl font-semibold">{data.cards.pendingEvaluations}</div>
            </div>

            <div className="bg-white shadow rounded p-4">
              <div className="text-xs text-gray-500">Reports submitted</div>
              <div className="mt-2 text-2xl font-semibold">{data.cards.reportsSubmitted}</div>
            </div>

            <div className="bg-white shadow rounded p-4">
              <div className="text-xs text-gray-500">Upcoming evaluations</div>
              <div className="mt-2 text-2xl font-semibold">{data.cards.upcomingEvaluations}</div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-medium">Recent activity</h2>
            <ul className="mt-3 space-y-2">
              {(data.recentActivity || []).slice(0, 10).map((item: any, idx: number) => (
                <li key={idx} className="bg-white p-3 rounded shadow-sm flex justify-between">
                  <div className="text-sm text-gray-700">{item.type.replace('_', ' ')}</div>
                  <div className="text-xs text-gray-500">{item.at ? new Date(item.at).toLocaleString() : '—'}</div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
