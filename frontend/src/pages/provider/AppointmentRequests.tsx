import { Calendar, CheckCircle, Clock, User, XCircle, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPendingAppointmentRequests,
  acceptAppointmentRequest,
  rejectAppointmentRequest,
} from '../../api/provider';
import type { AppointmentRequestItem } from '../../api/provider';

export default function AppointmentRequestsPage() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['pendingAppointmentRequests'],
    queryFn: fetchPendingAppointmentRequests,
    refetchInterval: 30_000,
  });

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AppointmentRequestItem | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['pendingAppointmentRequests'] }); };

  const acceptMutation = useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      acceptAppointmentRequest(id, scheduledAt),
    onSuccess: () => {
      toast.success('Appointment accepted!');
      invalidate();
      setShowAcceptModal(false);
      setSelectedRequest(null);
    },
    onError: () => { toast.error('Failed to accept appointment'); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectAppointmentRequest(id),
    onSuccess: () => { toast.success('Request declined'); invalidate(); },
    onError: () => { toast.error('Failed to decline request'); },
  });

  const openAcceptModal = (req: AppointmentRequestItem) => {
    setSelectedRequest(req);
    setScheduledDate('');
    setScheduledTime('09:00');
    setShowAcceptModal(true);
  };

  const handleAccept = () => {
    if (!selectedRequest || !scheduledDate || !scheduledTime) {
      toast.error('Please select a date and time');
      return;
    }
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
    acceptMutation.mutate({ id: selectedRequest.id, scheduledAt });
  };

  const handleReject = (id: string) => {
    if (!window.confirm('Decline this appointment request?')) return;
    rejectMutation.mutate(id);
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="flex flex-col gap-3 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2D4128]">Appointment Requests</h2>
          <p className="mt-1 text-sm text-slate-500">Pending patient requests awaiting your response. Auto-refreshes every 30s.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#FAFAF8] px-4 py-2 text-sm font-semibold text-slate-600">
          <Clock className="h-4 w-4" />
          {isLoading ? 'Loading...' : `${requests.length} pending`}
        </div>
      </header>

      <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
        {isLoading && (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`appt-skeleton-${i}`} className="h-28 animate-pulse rounded-xl bg-[#FAFAF8]" />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="p-5">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="font-display text-sm font-semibold">Unable to load appointment requests</p>
              <button type="button" onClick={() => { void refetch(); }} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                Retry
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && requests.length === 0 && (
          <div className="p-5 text-center">
            <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-10">
              <Calendar className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 font-display text-sm font-semibold text-[#2D4128]">No pending requests</p>
              <p className="mt-1 text-xs text-slate-500">Patient appointment requests will appear here.</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && requests.length > 0 && (
          <div className="divide-y divide-[#E5E5E5]">
            {requests.map((req) => (
              <div key={req.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8EFE6] text-[#4A6741]">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-[#2D4128]">{req.patientName}</h3>
                      <p className="text-sm text-slate-500">{req.patientEmail}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {req.preferredSpecialization && (
                      <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] px-3 py-2">
                        <p className="text-xs font-semibold text-slate-500">Specialization</p>
                        <p className="mt-0.5 text-sm font-semibold text-[#2D4128]">{req.preferredSpecialization}</p>
                      </div>
                    )}
                    <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] px-3 py-2">
                      <p className="text-xs font-semibold text-slate-500">Duration</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#2D4128]">{req.durationMinutes} min</p>
                    </div>
                    <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] px-3 py-2">
                      <p className="text-xs font-semibold text-slate-500">Requested</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#2D4128]">{new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    {req.expiresAt && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="text-xs font-semibold text-amber-600">Expires</p>
                        <p className="mt-0.5 text-sm font-semibold text-amber-700">{new Date(req.expiresAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openAcceptModal(req)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128]"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Accept & Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(req.id)}
                    disabled={rejectMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accept & Schedule Modal */}
      {showAcceptModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
              <h3 className="font-display text-xl font-semibold text-[#2D4128]">Schedule Appointment</h3>
              <button type="button" onClick={() => setShowAcceptModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-[#FAFAF8] hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] p-3">
                <p className="text-xs font-semibold text-slate-500">Patient</p>
                <p className="mt-0.5 font-display text-sm font-semibold text-[#2D4128]">{selectedRequest.patientName}</p>
                <p className="text-xs text-slate-500">{selectedRequest.durationMinutes} min session</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2D4128]">Date *</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2D4128]">Time *</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/10"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-[#E5E5E5] pt-4">
              <button type="button" onClick={() => setShowAcceptModal(false)} className="rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] hover:bg-[#FAFAF8]">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
                className="rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2D4128] disabled:opacity-50"
              >
                {acceptMutation.isPending ? 'Scheduling...' : 'Confirm & Accept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
