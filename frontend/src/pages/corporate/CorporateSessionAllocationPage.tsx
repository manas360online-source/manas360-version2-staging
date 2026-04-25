import { useEffect, useState } from 'react';
import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';
import { corporateApi } from '../../api/corporate.api';

type AllocationRow = { department: string; allocatedSessions: number; usedSessions: number };

export default function CorporateSessionAllocationPage() {
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await corporateApi.getSessionAllocation('techcorp-india');
        setRows(data?.rows || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Unable to load allocations');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <CorporateShellLayout title="Session Allocation" subtitle="Department-wise allocated and used sessions.">
      {loading ? <div className="text-sm text-ink-600">Loading allocations...</div> : null}
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {!loading && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.department} className="rounded-xl border border-ink-100 bg-white p-4">
              <p className="font-semibold text-ink-800">{r.department}</p>
              <p className="mt-2 text-sm text-ink-600">Allocated: {r.allocatedSessions}</p>
              <p className="text-sm text-ink-600">Used: {r.usedSessions}</p>
            </div>
          ))}
        </div>
      ) : null}
    </CorporateShellLayout>
  );
}
