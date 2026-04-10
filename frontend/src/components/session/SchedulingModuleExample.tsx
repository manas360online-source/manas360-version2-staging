import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createSession,
  getSessions,
  sendReminder,
  updateSession,
  type MdcSchedulingApiError,
  type MdcSession,
} from '../../api/mdcScheduling.api';

type BookSessionForm = {
  patientId: string;
  date: string;
  time: string;
};

type RescheduleDraft = {
  date: string;
  time: string;
};

const defaultForm: BookSessionForm = {
  patientId: '',
  date: '',
  time: '',
};

const getErrorMessage = (error: unknown): string => {
  const apiError = error as MdcSchedulingApiError;
  return apiError?.message || 'Unable to process scheduling request.';
};

const toIsoFromLocal = (date: string, time: string): string => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  const localDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
  return localDate.toISOString();
};

const toLocalDate = (isoDateTime: string): string => {
  const date = new Date(isoDateTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalTime = (isoDateTime: string): string => {
  const date = new Date(isoDateTime);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatSessionDateTime = (isoDateTime: string): string => {
  const date = new Date(isoDateTime);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function SchedulingModuleExample() {
  const [form, setForm] = useState<BookSessionForm>(defaultForm);
  const [sessions, setSessions] = useState<MdcSession[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [rescheduleDraft, setRescheduleDraft] = useState<RescheduleDraft>({ date: '', time: '' });

  const [isListLoading, setIsListLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [actionSessionId, setActionSessionId] = useState<string | null>(null);

  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [sessions]);

  const loadSessions = async () => {
    setIsListLoading(true);
    setListError(null);

    try {
      const records = await getSessions();
      setSessions(records);
    } catch (error) {
      setListError(getErrorMessage(error));
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const onBookSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.patientId.trim() || !form.date || !form.time) {
      setFormError('Patient, date, and time are required.');
      return;
    }

    setIsBooking(true);
    setFormError(null);
    setActionError(null);
    setStatusMessage(null);

    try {
      await createSession({
        patientId: form.patientId.trim(),
        scheduledAt: toIsoFromLocal(form.date, form.time),
      });

      setForm(defaultForm);
      setStatusMessage('Session booked successfully.');
      await loadSessions();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsBooking(false);
    }
  };

  const onStartReschedule = (session: MdcSession) => {
    setEditingSessionId(session.id);
    setRescheduleDraft({
      date: toLocalDate(session.scheduledAt),
      time: toLocalTime(session.scheduledAt),
    });
    setActionError(null);
    setStatusMessage(null);
  };

  const onConfirmReschedule = async (sessionId: string) => {
    if (!rescheduleDraft.date || !rescheduleDraft.time) {
      setActionError('Select both date and time to reschedule.');
      return;
    }

    setActionSessionId(sessionId);
    setActionError(null);
    setStatusMessage(null);

    try {
      await updateSession(sessionId, {
        scheduledAt: toIsoFromLocal(rescheduleDraft.date, rescheduleDraft.time),
      });
      setEditingSessionId(null);
      setStatusMessage('Session rescheduled.');
      await loadSessions();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setActionSessionId(null);
    }
  };

  const onCancelSession = async (sessionId: string) => {
    setActionSessionId(sessionId);
    setActionError(null);
    setStatusMessage(null);

    try {
      await updateSession(sessionId, { status: 'cancelled' });
      setStatusMessage('Session cancelled.');
      await loadSessions();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setActionSessionId(null);
    }
  };

  const onSendReminder = async (sessionId: string) => {
    setActionSessionId(sessionId);
    setActionError(null);
    setStatusMessage(null);

    try {
      const result = await sendReminder(sessionId);
      setStatusMessage(result.message || 'Reminder sent successfully.');
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setActionSessionId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Book Session</h2>
        <p className="mt-1 text-sm text-slate-500">Create a new MyDigitalClinic session for a patient.</p>

        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={onBookSession}>
          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Patient
            <input
              value={form.patientId}
              onChange={(event) => setForm((prev) => ({ ...prev, patientId: event.target.value }))}
              placeholder="Enter patient ID"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Date
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Time
            <input
              type="time"
              value={form.time}
              onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={isBooking}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isBooking ? 'Scheduling...' : 'Schedule a Virtual Therapy Session(audio only)'}
            </button>
          </div>
        </form>

        {formError && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Session List</h3>
          <button
            type="button"
            onClick={() => void loadSessions()}
            disabled={isListLoading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isListLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {listError && <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{listError}</p>}
        {actionError && <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}
        {statusMessage && <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusMessage}</p>}

        {!isListLoading && sortedSessions.length === 0 && !listError && (
          <p className="text-sm text-slate-500">No sessions scheduled yet.</p>
        )}

        <ul className="space-y-3">
          {sortedSessions.map((session) => {
            const isRowBusy = actionSessionId === session.id;
            const isCancelled = String(session.status).toLowerCase() === 'cancelled';
            const isEditing = editingSessionId === session.id;

            return (
              <li key={session.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {session.patientName || session.patientId}
                    </p>
                    <p className="text-xs text-slate-500">{formatSessionDateTime(session.scheduledAt)}</p>
                    <p className="mt-1 text-xs text-slate-600">Status: {session.status}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => onStartReschedule(session)}
                        disabled={isRowBusy || isCancelled}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Reschedule
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void onCancelSession(session.id)}
                      disabled={isRowBusy || isCancelled}
                      className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isRowBusy && !isEditing ? 'Processing...' : 'Cancel'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void onSendReminder(session.id)}
                      disabled={isRowBusy || isCancelled}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isRowBusy && !isEditing ? 'Sending...' : 'Send Reminder'}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
                    <label className="text-xs font-medium text-slate-700 md:col-span-2">
                      Date
                      <input
                        type="date"
                        value={rescheduleDraft.date}
                        onChange={(event) => setRescheduleDraft((prev) => ({ ...prev, date: event.target.value }))}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="text-xs font-medium text-slate-700">
                      Time
                      <input
                        type="time"
                        value={rescheduleDraft.time}
                        onChange={(event) => setRescheduleDraft((prev) => ({ ...prev, time: event.target.value }))}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                      />
                    </label>

                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => void onConfirmReschedule(session.id)}
                        disabled={isRowBusy}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isRowBusy ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSessionId(null)}
                        disabled={isRowBusy}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
