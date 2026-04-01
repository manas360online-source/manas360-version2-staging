import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Users, Clock3, Globe2, Lock, CalendarDays, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { groupTherapyApi } from '../../api/groupTherapy';

type SessionMode = 'PUBLIC' | 'PRIVATE';

type CreateForm = {
  title: string;
  topic: string;
  description: string;
  sessionMode: SessionMode;
  scheduledAt: string;
  durationMinutes: number;
  maxMembers: number;
};

type InviteForm = {
  sessionId: string;
  patientUserId: string;
  amountInr: number;
  message: string;
  paymentDeadline: string;
};

const formatDateTimeLocal = (value: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const toDateTimeLocalInput = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const ProviderPortalPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [patients, setPatients] = useState<Array<{ id: string; name: string; email?: string | null; phone?: string | null }>>([]);
  const [form, setForm] = useState<CreateForm>({
    title: '',
    topic: '',
    description: '',
    sessionMode: 'PUBLIC',
    scheduledAt: toDateTimeLocalInput(new Date(Date.now() + 60 * 60 * 1000)),
    durationMinutes: 60,
    maxMembers: 12,
  });
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    sessionId: '',
    patientUserId: '',
    amountInr: 499,
    message: '',
    paymentDeadline: '',
  });

  const pendingCount = useMemo(
    () => requests.filter((row) => String(row.status || '').toUpperCase() === 'PENDING_APPROVAL').length,
    [requests],
  );

  const publishedCount = useMemo(
    () => requests.filter((row) => ['PUBLISHED', 'LIVE'].includes(String(row.status || '').toUpperCase())).length,
    [requests],
  );

  const approvedCount = useMemo(
    () => requests.filter((row) => String(row.status || '').toUpperCase() === 'APPROVED').length,
    [requests],
  );

  const privateInvitableSessions = useMemo(
    () => requests.filter((row) => {
      const mode = String(row.sessionMode || '').toUpperCase();
      const status = String(row.status || '').toUpperCase();
      return mode === 'PRIVATE' && ['APPROVED', 'PUBLISHED', 'LIVE'].includes(status);
    }),
    [requests],
  );

  const loadRequests = async () => {
    setIsRefreshing(true);
    try {
      const result = await groupTherapyApi.listMyRequests();
      setRequests(Array.isArray(result.items) ? result.items : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to load your group therapy requests.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadPatients = async () => {
    setIsLoadingPatients(true);
    try {
      const result = await groupTherapyApi.listProviderPatients();
      setPatients(Array.isArray(result.items) ? result.items : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to load your patient list.');
    } finally {
      setIsLoadingPatients(false);
    }
  };

  React.useEffect(() => {
    void loadRequests();
    void loadPatients();
  }, []);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.topic.trim()) {
      toast.error('Please fill in session title and clinical focus area.');
      return;
    }

    setIsSubmitting(true);
    try {
      await groupTherapyApi.createRequest({
        title: form.title.trim(),
        topic: form.topic.trim(),
        description: form.description.trim() || undefined,
        sessionMode: form.sessionMode,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes || 60),
        maxMembers: Number(form.maxMembers || 10),
      });

      toast.success('Group therapy request submitted. Awaiting admin approval.');
      setForm((prev) => ({
        ...prev,
        title: '',
        topic: '',
        description: '',
        scheduledAt: toDateTimeLocalInput(new Date(Date.now() + 60 * 60 * 1000)),
      }));
      await loadRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPrivateInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!inviteForm.sessionId || !inviteForm.patientUserId) {
      toast.error('Please select private session and patient.');
      return;
    }

    const amountInr = Number(inviteForm.amountInr || 0);
    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      toast.error('Invite fee must be greater than INR 0.');
      return;
    }

    setIsInviting(true);
    try {
      await groupTherapyApi.createPrivateInvite({
        sessionId: inviteForm.sessionId,
        patientUserId: inviteForm.patientUserId,
        amountMinor: Math.round(amountInr * 100),
        message: inviteForm.message.trim() || undefined,
        paymentDeadline: inviteForm.paymentDeadline ? new Date(inviteForm.paymentDeadline).toISOString() : undefined,
      });

      toast.success('Private invite sent successfully. Patient can now accept and pay.');
      setInviteForm((prev) => ({
        ...prev,
        patientUserId: '',
        message: '',
        paymentDeadline: '',
      }));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to send private invite.');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Group Therapy Workspace | MANAS360</title>
      </Helmet>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Group Therapy Workspace</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create public or private group therapy sessions. Every request is reviewed by admin before publication.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Pending Approval</p>
          <p className="mt-1 text-3xl font-black text-amber-900">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Approved</p>
          <p className="mt-1 text-3xl font-black text-blue-900">{approvedCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Published / Live</p>
          <p className="mt-1 text-3xl font-black text-emerald-900">{publishedCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Create Group Therapy Request</h2>
        </div>

        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={submitRequest}>
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Session Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Anxiety Stabilization Circle"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              required
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Clinical Focus Area</span>
            <input
              value={form.topic}
              onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
              placeholder="e.g., Anxiety Disorders, Grief Processing, Parenting Stress"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              required
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Session Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Brief therapeutic objective and session structure"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-gray-700">Session Mode</span>
            <select
              value={form.sessionMode}
              onChange={(e) => setForm((prev) => ({ ...prev, sessionMode: e.target.value as SessionMode }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="PUBLIC">Public Group</option>
              <option value="PRIVATE">Private Cohort</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-gray-700">Start Date & Time</span>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              required
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-gray-700">Duration (minutes)</span>
            <input
              type="number"
              min={15}
              max={180}
              value={form.durationMinutes}
              onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-gray-700">Max Participants</span>
            <input
              type="number"
              min={2}
              max={100}
              value={form.maxMembers}
              onChange={(e) => setForm((prev) => ({ ...prev, maxMembers: Number(e.target.value) }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit For Admin Approval'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Invite Patients to Private Session</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadPatients()}
            disabled={isLoadingPatients}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {isLoadingPatients ? 'Loading...' : 'Refresh Patients'}
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          Workflow: Create session as <span className="font-semibold">PRIVATE</span> then wait for admin approval, then invite selected patients.
        </p>

        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-600">Approved Private Sessions</p>
          {privateInvitableSessions.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">No approved private session yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {privateInvitableSessions.map((s) => (
                <div key={s.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-500">{s.topic} | {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : '-'} | {String(s.status || '').toUpperCase()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInviteForm((prev) => ({ ...prev, sessionId: s.id }))}
                    className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Use For Invite
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {privateInvitableSessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
            No approved private sessions available for invite yet.
          </p>
        ) : patients.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
            No patients found. Complete at least one therapy session with patients to build your invite list.
          </p>
        ) : (
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={submitPrivateInvite}>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Private Session</span>
              <select
                value={inviteForm.sessionId}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, sessionId: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                required
              >
                <option value="">Select private session</option>
                {privateInvitableSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({String(s.status || '').toUpperCase()})
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Patient</span>
              <select
                value={inviteForm.patientUserId}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, patientUserId: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                required
              >
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.phone ? ` (${p.phone})` : (p.email ? ` (${p.email})` : '')}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-700">Invite Fee (INR)</span>
              <input
                type="number"
                min={1}
                value={inviteForm.amountInr}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, amountInr: Number(e.target.value) }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                required
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-700">Payment Deadline (optional)</span>
              <input
                type="datetime-local"
                value={inviteForm.paymentDeadline}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, paymentDeadline: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Clinical Message (optional)</span>
              <textarea
                rows={3}
                value={inviteForm.message}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Personalized invite note for patient"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isInviting}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {isInviting ? 'Sending Invite...' : 'Send Private Invite'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">My Group Therapy Requests</h2>

        {requests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
            No requests yet. Create your first group therapy request above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Session</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Schedule</th>
                  <th className="px-3 py-2">Capacity</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((row) => {
                  const mode = String(row.sessionMode || '').toUpperCase();
                  const status = String(row.status || '').toUpperCase();
                  return (
                    <tr key={row.id} className="border-b border-gray-100 align-top">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-gray-900">{row.title}</p>
                        <p className="text-xs text-gray-500">{row.topic || '-'}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold">
                          {mode === 'PRIVATE' ? <Lock className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}
                          {mode || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        <div className="flex items-center gap-1 text-xs">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDateTimeLocal(row.scheduledAt)}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          {Number(row.durationMinutes || 0)} mins
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        <div className="inline-flex items-center gap-1 text-xs">
                          <Users className="h-3.5 w-3.5" />
                          {Number(row.maxMembers || 0)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={[
                            'inline-flex rounded-full px-2 py-1 text-xs font-bold',
                            status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : '',
                            status === 'APPROVED' ? 'bg-blue-100 text-blue-800' : '',
                            status === 'PUBLISHED' || status === 'LIVE' ? 'bg-emerald-100 text-emerald-800' : '',
                            status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : '',
                          ].join(' ')}
                        >
                          {status || '-'}
                        </span>
                        {row.rejectionReason ? (
                          <p className="mt-1 max-w-xs text-xs text-rose-600">Reason: {row.rejectionReason}</p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProviderPortalPage;
