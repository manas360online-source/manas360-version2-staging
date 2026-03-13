import { AlertTriangle, Pill, Plus, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { usePatientPrescriptions } from '../../../../hooks/usePatientPrescriptions';

type MedicationStatus = 'Active' | 'Discontinued';

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

const statusClass = (status: MedicationStatus) => {
  if (status === 'Active') return 'bg-[#f0f5ee] text-[#2D4128]';
  return 'bg-gray-100 text-gray-600';
};

export default function Prescriptions() {
  const { patientId } = useParams();
  const { data: medications = [], isLoading, isError, refetch } = usePatientPrescriptions(patientId);
  const [selectedMedicationId, setSelectedMedicationId] = useState('');

  useEffect(() => {
    if (!medications.length) {
      setSelectedMedicationId('');
      return;
    }

    const hasSelected = medications.some((item) => item.id === selectedMedicationId);
    if (!hasSelected) {
      setSelectedMedicationId(medications[0].id);
    }
  }, [medications, selectedMedicationId]);

  const selectedMedication = useMemo(
    () => medications.find((item) => item.id === selectedMedicationId) ?? medications[0],
    [medications, selectedMedicationId],
  );

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="flex flex-col gap-3 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2D4128]">Prescriptions & E-Rx</h2>
          <p className="mt-1 text-sm text-slate-500">Medication management and safety review for patient ID {patientId || '123'}.</p>
        </div>
        <button
          type="button"
          onClick={() => toast.success('New order submitted')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128]"
        >
          <Plus className="h-4 w-4" />
          New Prescription
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
              <div>
                <p className="font-display text-lg font-semibold text-[#2D4128]">Medication List</p>
                <p className="text-sm text-slate-500">Current and historical prescriptions</p>
              </div>
              <div className="rounded-full bg-[#FAFAF8] px-3 py-1 text-xs font-semibold text-slate-500">
                {isLoading ? 'Loading...' : `${medications.length} meds`}
              </div>
            </div>

            <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1">
              {isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`rx-skeleton-${index}`} className="h-20 animate-pulse rounded-xl border border-[#E5E5E5] bg-[#FAFAF8]" />
                  ))}
                </div>
              )}

              {!isLoading && medications.map((medication) => {
                const isActive = medication.id === selectedMedication?.id;

                return (
                  <button
                    key={medication.id}
                    type="button"
                    onClick={() => setSelectedMedicationId(medication.id)}
                    className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-[#E5E5E5] border-l-4 border-l-[#4A6741] bg-[#E8EFE6]'
                        : 'border-[#E5E5E5] bg-white hover:bg-[#FAFAF8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-semibold text-[#2D4128]">{medication.drugName}</p>
                        <p className="mt-1 text-sm text-slate-600">{medication.dosage}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(medication.status)}`}>
                        {medication.status}
                      </span>
                    </div>
                  </button>
                );
              })}

              {!isLoading && !isError && medications.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-8 text-center">
                  <p className="font-display text-sm font-semibold text-[#2D4128]">No prescriptions found</p>
                  <p className="mt-1 text-xs text-slate-500">Medication records will appear here once available.</p>
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
                <div className="h-40 animate-pulse rounded-xl bg-[#FAFAF8]" />
                <div className="h-32 animate-pulse rounded-xl bg-[#FAFAF8]" />
              </div>
            )}

            {!isLoading && isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <p className="font-display text-sm font-semibold">Unable to load prescriptions</p>
                <p className="mt-1 text-sm">Please try again.</p>
                <button
                  type="button"
                  onClick={() => { void refetch(); }}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !isError && selectedMedication && (
              <>
                <div className="flex flex-col gap-4 border-b border-[#E5E5E5] pb-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[#4A6741]">
                      <Pill className="h-5 w-5" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Medication Details</p>
                    </div>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-[#2D4128]">{selectedMedication.drugName}</h3>
                    <p className="mt-1 text-sm text-slate-500">{selectedMedication.dosage}</p>
                  </div>

                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusClass(selectedMedication.status as MedicationStatus)}`}>
                    {selectedMedication.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4 md:col-span-2">
                    <p className="font-display text-sm font-semibold text-[#2D4128]">Sig / Instructions</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{selectedMedication.instructions}</p>
                  </div>

                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prescribed Date</p>
                    <p className="mt-2 font-display text-lg font-semibold text-[#2D4128]">{formatDate(selectedMedication.prescribedDate)}</p>
                  </div>

                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Refills Remaining</p>
                    <p className="mt-2 font-display text-lg font-semibold text-[#2D4128]">{selectedMedication.refillsRemaining}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-sm font-semibold text-[#2D4128]">Adherence</p>
                      <p className="text-sm font-semibold text-[#4A6741]">Adherence: {selectedMedication.adherenceRate}%</p>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-[#E5E5E5]">
                      <div
                        className="h-2.5 rounded-full bg-[#4A6741]"
                        style={{ width: `${selectedMedication.adherenceRate}%` }}
                      />
                    </div>
                  </div>

                  {selectedMedication.warnings.length > 0 ? (
                    <div className="space-y-3">
                      {selectedMedication.warnings.map((warning, index) => (
                        <div key={`${selectedMedication.id}-warning-${index}`} className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5" />
                            <div>
                              <p className="font-display text-sm font-semibold">Warnings / Interactions</p>
                              <p className="mt-1 text-sm leading-6">{warning}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-[#E5E5E5] pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Request Refill
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8]"
                  >
                    <Pill className="h-4 w-4" />
                    Adjust Dosage
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Discontinue Medication
                  </button>
                </div>
              </>
            )}

            {!isLoading && !isError && !selectedMedication && (
              <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-10 text-center">
                <p className="font-display text-base font-semibold text-[#2D4128]">No prescription selected</p>
                <p className="mt-1 text-sm text-slate-500">Select a medication on the left to view details and safety warnings.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}