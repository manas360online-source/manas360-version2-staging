import { AlertTriangle, Pill, Plus, RefreshCw, XCircle, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { usePatientPrescriptions } from '../../../../hooks/usePatientPrescriptions';
import { createPrescription, updatePrescription, discontinuePrescription } from '../../../../api/provider';
import type { CreatePrescriptionPayload } from '../../../../api/provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

type ModalType = 'create' | 'adjust' | null;

export default function Prescriptions() {
  const { patientId } = useParams();
  const queryClient = useQueryClient();
  const { data: medications = [], isLoading, isError, refetch } = usePatientPrescriptions(patientId);
  const [selectedMedicationId, setSelectedMedicationId] = useState('');
  const [modalType, setModalType] = useState<ModalType>(null);

  // Form state
  const [formDrugName, setFormDrugName] = useState('');
  const [formDosage, setFormDosage] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formRefills, setFormRefills] = useState(0);
  const [formWarnings, setFormWarnings] = useState('');

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

  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['patientPrescriptions', patientId] }); };

  const createMutation = useMutation({
    mutationFn: (payload: CreatePrescriptionPayload) => createPrescription(patientId!, payload),
    onSuccess: () => { toast.success('Prescription created'); invalidate(); setModalType(null); },
    onError: () => { toast.error('Failed to create prescription'); },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, dosage, instructions }: { id: string; dosage: string; instructions?: string }) =>
      updatePrescription(patientId!, id, { dosage, instructions }),
    onSuccess: () => { toast.success('Dosage updated'); invalidate(); setModalType(null); },
    onError: () => { toast.error('Failed to update dosage'); },
  });

  const discontinueMutation = useMutation({
    mutationFn: (id: string) => discontinuePrescription(patientId!, id),
    onSuccess: () => { toast.success('Medication discontinued'); invalidate(); },
    onError: () => { toast.error('Failed to discontinue'); },
  });

  const refillMutation = useMutation({
    mutationFn: ({ id, refillsRemaining }: { id: string; refillsRemaining: number }) =>
      updatePrescription(patientId!, id, { refillsRemaining: Math.max(0, refillsRemaining - 1) }),
    onSuccess: () => { toast.success('Refill requested'); invalidate(); },
    onError: () => { toast.error('Failed to request refill'); },
  });

  const openCreateModal = () => {
    setFormDrugName(''); setFormDosage(''); setFormInstructions(''); setFormRefills(0); setFormWarnings('');
    setModalType('create');
  };

  const openAdjustModal = () => {
    if (!selectedMedication) return;
    setFormDosage(selectedMedication.dosage);
    setFormInstructions(selectedMedication.instructions);
    setModalType('adjust');
  };

  const handleCreateSubmit = () => {
    if (!formDrugName.trim() || !formDosage.trim() || !formInstructions.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    createMutation.mutate({
      drugName: formDrugName.trim(),
      dosage: formDosage.trim(),
      instructions: formInstructions.trim(),
      refillsRemaining: formRefills,
      warnings: formWarnings.trim() ? formWarnings.split('\n').map((w) => w.trim()).filter(Boolean) : [],
    });
  };

  const handleAdjustSubmit = () => {
    if (!selectedMedication || !formDosage.trim()) return;
    adjustMutation.mutate({
      id: selectedMedication.id,
      dosage: formDosage.trim(),
      instructions: formInstructions.trim() || undefined,
    });
  };

  const handleDiscontinue = () => {
    if (!selectedMedication) return;
    if (!window.confirm(`Discontinue ${selectedMedication.drugName}? This action cannot be undone.`)) return;
    discontinueMutation.mutate(selectedMedication.id);
  };

  const handleRefill = () => {
    if (!selectedMedication) return;
    refillMutation.mutate({ id: selectedMedication.id, refillsRemaining: selectedMedication.refillsRemaining });
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="flex flex-col gap-3 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2D4128]">Prescriptions & E-Rx</h2>
          <p className="mt-1 text-sm text-slate-500">Medication management and safety review for patient ID {patientId || '123'}.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
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
                      <div className="h-2.5 rounded-full bg-[#4A6741]" style={{ width: `${selectedMedication.adherenceRate}%` }} />
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
                    onClick={handleRefill}
                    disabled={refillMutation.isPending || selectedMedication.refillsRemaining <= 0}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8] disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {refillMutation.isPending ? 'Requesting...' : 'Request Refill'}
                  </button>
                  <button
                    type="button"
                    onClick={openAdjustModal}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8]"
                  >
                    <Pill className="h-4 w-4" />
                    Adjust Dosage
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscontinue}
                    disabled={discontinueMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    {discontinueMutation.isPending ? 'Discontinuing...' : 'Discontinue Medication'}
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

      {/* Create / Adjust Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
              <h3 className="font-display text-xl font-semibold text-[#2D4128]">
                {modalType === 'create' ? 'New Prescription' : 'Adjust Dosage'}
              </h3>
              <button type="button" onClick={() => setModalType(null)} className="rounded-lg p-1 text-slate-400 hover:bg-[#FAFAF8] hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {modalType === 'create' && (
                <div>
                  <label className="block text-sm font-semibold text-[#2D4128]">Drug Name *</label>
                  <input
                    type="text"
                    value={formDrugName}
                    onChange={(e) => setFormDrugName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                    placeholder="e.g. Sertraline"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-[#2D4128]">Dosage *</label>
                <input
                  type="text"
                  value={formDosage}
                  onChange={(e) => setFormDosage(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                  placeholder="e.g. 50mg once daily"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2D4128]">Instructions {modalType === 'create' ? '*' : ''}</label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                  placeholder="e.g. Take with food in the morning"
                />
              </div>

              {modalType === 'create' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#2D4128]">Refills</label>
                    <input
                      type="number"
                      min={0}
                      value={formRefills}
                      onChange={(e) => setFormRefills(Number(e.target.value))}
                      className="mt-1.5 w-24 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#2D4128]">Warnings (one per line)</label>
                    <textarea
                      rows={2}
                      value={formWarnings}
                      onChange={(e) => setFormWarnings(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                      placeholder="e.g. May cause drowsiness"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-[#E5E5E5] pt-4">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={modalType === 'create' ? handleCreateSubmit : handleAdjustSubmit}
                disabled={createMutation.isPending || adjustMutation.isPending}
                className="rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128] disabled:opacity-50"
              >
                {(createMutation.isPending || adjustMutation.isPending) ? 'Saving...' : modalType === 'create' ? 'Create Prescription' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}