import { Activity, AlertCircle, Download, FileText, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { usePatientLabs } from '../../../../hooks/usePatientLabs';

type LabStatus = 'Pending' | 'Results Ready' | 'Reviewed';
type BiomarkerStatus = 'High' | 'Normal' | 'Low';

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

const labStatusClass = (status: LabStatus) => {
  if (status === 'Pending') return 'bg-amber-50 text-amber-700';
  if (status === 'Results Ready') return 'bg-blue-50 text-blue-700';
  return 'bg-[#f0f5ee] text-[#2D4128]';
};

const biomarkerStatusClass = (status: BiomarkerStatus) => {
  if (status === 'High') return 'bg-red-50 text-red-700';
  if (status === 'Low') return 'bg-amber-50 text-amber-700';
  return 'bg-[#f0f5ee] text-[#2D4128]';
};

export default function LabOrders() {
  const { patientId } = useParams();
  const { data: labOrders = [], isLoading, isError, refetch } = usePatientLabs(patientId);
  const [selectedLabId, setSelectedLabId] = useState('');

  useEffect(() => {
    if (!labOrders.length) {
      setSelectedLabId('');
      return;
    }

    const hasSelected = labOrders.some((lab) => lab.id === selectedLabId);
    if (!hasSelected) {
      setSelectedLabId(labOrders[0].id);
    }
  }, [labOrders, selectedLabId]);

  const selectedLab = useMemo(
    () => labOrders.find((lab) => lab.id === selectedLabId) ?? labOrders[0],
    [labOrders, selectedLabId],
  );

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="flex flex-col gap-3 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2D4128]">Lab Orders & Results</h2>
          <p className="mt-1 text-sm text-slate-500">Review diagnostic orders and abnormal biomarker flags for patient ID {patientId || '123'}.</p>
        </div>
        <button
          type="button"
          onClick={() => toast.success('New order submitted')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128]"
        >
          <Plus className="h-4 w-4" />
          Order New Lab
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
              <div>
                <p className="font-display text-lg font-semibold text-[#2D4128]">Lab History</p>
                <p className="text-sm text-slate-500">Recent orders and review status</p>
              </div>
              <div className="rounded-full bg-[#FAFAF8] px-3 py-1 text-xs font-semibold text-slate-500">
                {isLoading ? 'Loading...' : `${labOrders.length} orders`}
              </div>
            </div>

            <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1">
              {isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`lab-skeleton-${index}`} className="h-20 animate-pulse rounded-xl border border-[#E5E5E5] bg-[#FAFAF8]" />
                  ))}
                </div>
              )}

              {!isLoading && labOrders.map((lab) => {
                const isActive = lab.id === selectedLab?.id;

                return (
                  <button
                    key={lab.id}
                    type="button"
                    onClick={() => setSelectedLabId(lab.id)}
                    className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-[#E5E5E5] border-l-4 border-l-[#4A6741] bg-[#E8EFE6]'
                        : 'border-[#E5E5E5] bg-white hover:bg-[#FAFAF8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-semibold text-[#2D4128]">{lab.testName}</p>
                        <p className="mt-1 text-xs text-slate-500">Ordered {formatDate(lab.dateOrdered)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${labStatusClass(lab.status as LabStatus)}`}>
                        {lab.status}
                      </span>
                    </div>
                  </button>
                );
              })}

              {!isLoading && !isError && labOrders.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-8 text-center">
                  <p className="font-display text-sm font-semibold text-[#2D4128]">No lab orders found</p>
                  <p className="mt-1 text-xs text-slate-500">Lab orders and results will appear here once available.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="lg:col-span-2">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
            {isLoading && (
              <div className="space-y-4">
                <div className="h-20 animate-pulse rounded-xl bg-[#FAFAF8]" />
                <div className="h-48 animate-pulse rounded-xl bg-[#FAFAF8]" />
                <div className="h-24 animate-pulse rounded-xl bg-[#FAFAF8]" />
              </div>
            )}

            {!isLoading && isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <p className="font-display text-sm font-semibold">Unable to load lab orders</p>
                <p className="mt-1 text-sm">Please try again.</p>
                <button
                  type="button"
                  onClick={() => { void refetch(); }}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <Download className="h-4 w-4" />
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !isError && selectedLab && (
              <>
                <div className="flex flex-col gap-4 border-b border-[#E5E5E5] pb-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[#4A6741]">
                      <Activity className="h-5 w-5" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Lab Detail</p>
                    </div>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-[#2D4128]">{selectedLab.testName}</h3>
                    <p className="mt-1 text-sm text-slate-500">Ordering physician: {selectedLab.orderingPhysician}</p>
                    <p className="mt-1 text-sm text-slate-500">Date ordered: {formatDate(selectedLab.dateOrdered)}</p>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8]"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-[#E5E5E5]">
                  <table className="min-w-full divide-y divide-[#E5E5E5]">
                    <thead className="bg-[#FAFAF8]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Biomarker</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Value</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reference Range</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5] bg-white">
                      {selectedLab.biomarkers.map((result) => (
                        <tr key={`${selectedLab.id}-${result.name}`}>
                          <td className="px-4 py-4 text-sm text-[#2D4128]">{result.name}</td>
                          <td className="px-4 py-4 text-sm text-slate-700">{result.value}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{result.referenceRange}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${biomarkerStatusClass(result.status as BiomarkerStatus)}`}>
                              {result.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-slate-500" />
                    <div>
                      <p className="font-display text-sm font-semibold text-[#2D4128]">Clinical Interpretation</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{selectedLab.interpretation}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-[#E5E5E5] pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128]"
                  >
                    <FileText className="h-4 w-4" />
                    Mark as Reviewed
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8]"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Message Patient
                  </button>
                </div>
              </>
            )}

            {!isLoading && !isError && !selectedLab && (
              <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-10 text-center">
                <p className="font-display text-base font-semibold text-[#2D4128]">No lab selected</p>
                <p className="mt-1 text-sm text-slate-500">Select a lab order to review biomarkers and clinical interpretation.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}