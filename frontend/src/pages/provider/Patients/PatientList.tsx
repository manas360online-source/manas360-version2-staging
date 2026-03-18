import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Search } from 'lucide-react';
import { useProviderPatients } from '../../../hooks/useProviderPatients';

type PatientRow = {
  id: string;
  name: string;
  email: string | null;
  diagnosis: string;
  sessionDate: string;
  status: 'Active' | 'At Risk' | 'Needs Review';
};

const statusClass = (status: PatientRow['status']) => {
  if (status === 'At Risk') return 'bg-red-50 text-red-600';
  if (status === 'Needs Review') return 'bg-amber-50 text-amber-700';
  return 'bg-[#E8EFE6] text-[#4A6741]';
};

const getInitials = (name: string): string => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const getSessionText = (item: { nextSessionDate: string | null; lastSessionDate: string | null }): string => {
  if (item.nextSessionDate) return `Next: ${item.nextSessionDate}`;
  if (item.lastSessionDate) return `Last: ${item.lastSessionDate}`;
  return 'No sessions yet';
};

const loadingRows = Array.from({ length: 6 });

type StatusFilter = 'All' | 'Active' | 'At Risk' | 'Needs Review';

export default function PatientList() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const {
    data: patients = [],
    isLoading,
    isError,
    refetch,
  } = useProviderPatients();

  const filtered = useMemo(() => {
    let result = patients;

    if (statusFilter !== 'All') {
      result = result.filter((item) => item.status === statusFilter);
    }

    const term = query.trim().toLowerCase();
    if (term) {
      result = result.filter((item) => {
        return (
          item.name.toLowerCase().includes(term) ||
          String(item.email || '').toLowerCase().includes(term) ||
          item.primaryConcern.toLowerCase().includes(term)
        );
      });
    }

    return result;
  }, [query, patients, statusFilter]);

  const mappedRows: PatientRow[] = useMemo(() => {
    return filtered.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      diagnosis: item.primaryConcern,
      sessionDate: getSessionText(item),
      status: item.status,
    }));
  }, [filtered]);

  return (
    <section className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-sans text-2xl font-bold text-[#2D4128]">Master Patient List</h2>
          <p className="mt-1 text-sm text-slate-500">Search and open patient charts from one clinical queue.</p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <label className="flex min-w-[280px] flex-1 items-center gap-2 rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 sm:flex-none">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient, email, or diagnosis"
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none"
            />
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5 ${
                statusFilter !== 'All' ? 'border-[#4A6741] bg-[#E8EFE6] text-[#2D4128]' : 'border-[#E5E5E5] bg-white text-slate-700'
              }`}
            >
              <Filter className="h-4 w-4" />
              {statusFilter === 'All' ? 'Filter' : statusFilter}
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-[#E5E5E5] bg-white py-1 shadow-lg">
                {(['All', 'Active', 'At Risk', 'Needs Review'] as StatusFilter[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setStatusFilter(opt); setShowFilterMenu(false); }}
                    className={`w-full px-4 py-2 text-left text-sm transition ${
                      statusFilter === opt ? 'bg-[#E8EFE6] font-semibold text-[#2D4128]' : 'text-slate-700 hover:bg-[#FAFAF8]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAF8]">
                <th className="px-4 py-3 text-left font-sans text-xs font-bold uppercase tracking-wider text-slate-600">Patient</th>
                <th className="px-4 py-3 text-left font-sans text-xs font-bold uppercase tracking-wider text-slate-600">Diagnosis/Tag</th>
                <th className="px-4 py-3 text-left font-sans text-xs font-bold uppercase tracking-wider text-slate-600">Next/Last Session</th>
                <th className="px-4 py-3 text-left font-sans text-xs font-bold uppercase tracking-wider text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-sans text-xs font-bold uppercase tracking-wider text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && loadingRows.map((_, index) => (
                <tr key={`patient-loading-${index}`} className="border-b border-[#E5E5E5] last:border-b-0 animate-pulse">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-200" />
                      <div className="space-y-2">
                        <div className="h-3 w-32 rounded bg-slate-200" />
                        <div className="h-2.5 w-44 rounded bg-slate-100" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="h-3 w-28 rounded bg-slate-200" /></td>
                  <td className="px-4 py-3"><div className="h-3 w-36 rounded bg-slate-200" /></td>
                  <td className="px-4 py-3"><div className="h-6 w-20 rounded-full bg-slate-200" /></td>
                  <td className="px-4 py-3"><div className="h-8 w-24 rounded-lg bg-slate-200" /></td>
                </tr>
              ))}

              {!isLoading && isError && (
                <tr>
                  <td className="px-4 py-8 text-center" colSpan={5}>
                    <p className="text-sm font-medium text-slate-700">We could not load your patient list right now.</p>
                    <p className="mt-1 text-xs text-slate-500">Please check your connection and try again.</p>
                    <button
                      type="button"
                      onClick={() => void refetch()}
                      className="mt-3 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8]"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && mappedRows.map((item) => (
                <tr key={item.id} className="border-b border-[#E5E5E5] last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f5ee] text-xs font-bold text-[#4A6741]">
                        {getInitials(item.name)}
                      </div>
                      <div>
                        <p className="font-sans text-sm font-bold text-[#2D4128]">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.email || 'No email available'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.diagnosis}</td>
                  <td className="px-4 py-3 text-slate-700">{item.sessionDate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/provider/patient/${item.id}/overview`)}
                      className="rounded-lg bg-[#4A6741] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2D4128]"
                    >
                      Open Chart
                    </button>
                  </td>
                </tr>
              ))}

              {!isLoading && !isError && mappedRows.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>
                    No patients matched your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
