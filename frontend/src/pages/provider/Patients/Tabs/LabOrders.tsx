import { Beaker, CheckCircle, MessageSquare, Plus, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { usePatientLabs } from '../../../../hooks/usePatientLabs';
import { createLabOrder, updateLabOrder, sendGoalMessage } from '../../../../api/provider';
import type { CreateLabOrderPayload } from '../../../../api/provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const statusColor = (status: string) => {
  switch (status) {
    case 'Results Ready': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Reviewed': return 'bg-[#f0f5ee] text-[#2D4128] border-[#d4e3cf]';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

type ModalType = 'create' | 'message' | null;

export default function LabOrders() {
  const { patientId } = useParams();
  const queryClient = useQueryClient();
  const { data: labs = [], isLoading, isError, refetch } = usePatientLabs(patientId);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedLabId, setSelectedLabId] = useState('');

  // Form state
  const [formTestName, setFormTestName] = useState('');
  const [formInterpretation, setFormInterpretation] = useState('');
  const [formMessage, setFormMessage] = useState('');

  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['patientLabs', patientId] }); };

  const createMutation = useMutation({
    mutationFn: (payload: CreateLabOrderPayload) => createLabOrder(patientId!, payload),
    onSuccess: () => { toast.success('Lab order created'); invalidate(); setModalType(null); },
    onError: () => { toast.error('Failed to create lab order'); },
  });

  const reviewMutation = useMutation({
    mutationFn: (labId: string) => updateLabOrder(patientId!, labId, { status: 'REVIEWED' }),
    onSuccess: () => { toast.success('Lab marked as reviewed'); invalidate(); },
    onError: () => { toast.error('Failed to update lab status'); },
  });

  const openCreateModal = () => {
    setFormTestName(''); setFormInterpretation('');
    setModalType('create');
  };

  const openMessageModal = (labId: string) => {
    setSelectedLabId(labId); setFormMessage('');
    setModalType('message');
  };

  const handleCreateSubmit = () => {
    if (!formTestName.trim()) { toast.error('Test name is required'); return; }
    createMutation.mutate({
      testName: formTestName.trim(),
      interpretation: formInterpretation.trim() || undefined,
    });
  };

  const handleSendMessage = async () => {
    if (!formMessage.trim() || !selectedLabId) return;
    try {
      await sendGoalMessage(patientId!, selectedLabId, formMessage.trim());
      toast.success('Message sent to patient');
      setModalType(null);
    } catch {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="flex flex-col gap-3 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2D4128]">Lab Orders & Results</h2>
          <p className="mt-1 text-sm text-slate-500">Ordering, tracking, and reviewing diagnostic lab work.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128]"
        >
          <Plus className="h-4 w-4" />
          Order New Lab
        </button>
      </header>

      <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
        {isLoading && (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`lab-skeleton-${i}`} className="h-24 animate-pulse rounded-xl bg-[#FAFAF8]" />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="p-5">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="font-display text-sm font-semibold">Unable to load lab orders</p>
              <button type="button" onClick={() => { void refetch(); }} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && labs.length === 0 && (
          <div className="p-5 text-center">
            <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-10">
              <Beaker className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 font-display text-sm font-semibold text-[#2D4128]">No lab orders found</p>
              <p className="mt-1 text-xs text-slate-500">Lab orders and results will appear here.</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && labs.length > 0 && (
          <div className="divide-y divide-[#E5E5E5]">
            {labs.map((lab) => (
              <div key={lab.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Beaker className="h-5 w-5 text-[#4A6741]" />
                    <h3 className="font-display text-base font-semibold text-[#2D4128]">{lab.testName}</h3>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor(lab.status)}`}>
                      {lab.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Ordered: {new Date(lab.dateOrdered).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
                  <p className="mt-1 text-sm text-slate-500">Dr. {lab.orderingPhysician}</p>
                  {lab.interpretation && (
                    <div className="mt-3 rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interpretation</p>
                      <p className="mt-1 text-sm text-[#2D4128]">{lab.interpretation}</p>
                    </div>
                  )}
                  {lab.biomarkers && lab.biomarkers.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Biomarkers</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {lab.biomarkers.map((bm, i) => (
                          <div key={i} className="rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-xs">
                            <p className="font-semibold text-[#2D4128]">{bm.name}</p>
                            <p className="text-slate-600">{bm.value} ({bm.referenceRange})</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {lab.status !== 'Reviewed' && lab.status !== 'Pending' && (
                    <button
                      type="button"
                      onClick={() => reviewMutation.mutate(lab.id)}
                      disabled={reviewMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-semibold text-[#2D4128] hover:bg-[#FAFAF8] disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {reviewMutation.isPending ? 'Marking...' : 'Mark Reviewed'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openMessageModal(lab.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-semibold text-[#2D4128] hover:bg-[#FAFAF8]"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Message Patient
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Lab / Message Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
              <h3 className="font-display text-xl font-semibold text-[#2D4128]">
                {modalType === 'create' ? 'Order New Lab' : 'Message Patient'}
              </h3>
              <button type="button" onClick={() => setModalType(null)} className="rounded-lg p-1 text-slate-400 hover:bg-[#FAFAF8] hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {modalType === 'create' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#2D4128]">Test Name *</label>
                    <input
                      type="text"
                      value={formTestName}
                      onChange={(e) => setFormTestName(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                      placeholder="e.g. Complete Blood Count (CBC)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#2D4128]">Interpretation Notes</label>
                    <textarea
                      rows={3}
                      value={formInterpretation}
                      onChange={(e) => setFormInterpretation(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                      placeholder="Optional initial notes"
                    />
                  </div>
                </>
              )}
              {modalType === 'message' && (
                <div>
                  <label className="block text-sm font-semibold text-[#2D4128]">Message to Patient *</label>
                  <textarea
                    rows={4}
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                    placeholder="Your lab results are in. Let's discuss..."
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-[#E5E5E5] pt-4">
              <button type="button" onClick={() => setModalType(null)} className="rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] hover:bg-[#FAFAF8]">
                Cancel
              </button>
              <button
                type="button"
                onClick={modalType === 'create' ? handleCreateSubmit : () => void handleSendMessage()}
                disabled={createMutation.isPending}
                className="rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2D4128] disabled:opacity-50"
              >
                {createMutation.isPending ? 'Saving...' : modalType === 'create' ? 'Create Lab Order' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}