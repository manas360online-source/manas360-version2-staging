import { useEffect, useState } from 'react';
import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';
import { corporateApi } from '../../api/corporate.api';

type EmployeeRow = {
  id: string;
  employeeCode?: string;
  name: string;
  email: string;
  department?: string;
  managerName?: string;
  location?: string;
  sessionsUsed: number;
};

export default function CorporateEmployeeDirectoryPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await corporateApi.getEmployees('techcorp-india', { limit: 100 });
        setRows(response?.rows || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Unable to load employee directory');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <CorporateShellLayout title="Employee Directory" subtitle="All enrolled employees for this company.">
      {loading ? <div className="text-sm text-ink-600">Loading employees...</div> : null}
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {!loading && !error ? (
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
          <table className="min-w-full divide-y divide-ink-100 text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-ink-700">{r.name}</td>
                  <td className="px-4 py-3 text-ink-600">{r.email}</td>
                  <td className="px-4 py-3 text-ink-600">{r.department || '-'}</td>
                  <td className="px-4 py-3 text-ink-600">{r.managerName || '-'}</td>
                  <td className="px-4 py-3 text-ink-600">{r.sessionsUsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </CorporateShellLayout>
  );
}
