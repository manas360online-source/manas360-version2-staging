import { useMemo, useState } from 'react';
import {
  getHomework,
  updateHomeworkStatus,
  type HomeworkAdherenceItem,
  type HomeworkStatus,
  type MdcHomeworkAdherenceApiError,
} from '../../api/mdcHomeworkAdherence.api';

const STATUS_OPTIONS: HomeworkStatus[] = ['assigned', 'completed', 'skipped'];

const getErrorMessage = (error: unknown): string => {
  const apiError = error as MdcHomeworkAdherenceApiError;
  return apiError?.message || 'Unable to process homework adherence request.';
};

const toLocalDate = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

export default function HomeworkAdherenceTrackingExample() {
  const [patientId, setPatientId] = useState('');
  const [homework, setHomework] = useState<HomeworkAdherenceItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<HomeworkStatus>('assigned');

  const [isLoading, setIsLoading] = useState(false);
  const [actionHomeworkId, setActionHomeworkId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const completionStats = useMemo(() => {
    const total = homework.length;
    const completed = homework.filter((item) => item.status === 'completed').length;
    const skipped = homework.filter((item) => item.status === 'skipped').length;
    const assigned = homework.filter((item) => item.status === 'assigned').length;
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, skipped, assigned, completionPercent };
  }, [homework]);

  const handleLoadHomework = async () => {
    if (!patientId.trim()) {
      setError('Patient ID is required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      const items = await getHomework(patientId.trim());
      setHomework(items);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  };

  const startUpdate = (item: HomeworkAdherenceItem) => {
    setEditingId(item.id);
    const status = item.status === 'completed' || item.status === 'skipped' ? item.status : 'assigned';
    setSelectedStatus(status);
    setError(null);
    setStatusMessage(null);
  };

  const handleUpdateStatus = async (item: HomeworkAdherenceItem) => {
    setActionHomeworkId(item.id);
    setError(null);
    setStatusMessage(null);

    try {
      const updated = await updateHomeworkStatus(item.id, selectedStatus);
      setHomework((prev) => prev.map((existing) => (existing.id === item.id ? updated : existing)));
      setEditingId(null);
      setStatusMessage('Homework status updated.');
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setActionHomeworkId(null);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Homework Adherence Tracking</h2>
        <p className="mt-1 text-sm text-slate-500">Track assigned, completed, and skipped homework tasks.</p>
      </header>

      <div className="grid gap-3 md:grid-cols-[1fr,auto]">
        <label className="block text-sm font-medium text-slate-700">
          Patient ID
          <input
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="Enter patient ID"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void handleLoadHomework()}
            disabled={isLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Loading...' : 'Load Homework'}
          </button>
        </div>
      </div>

      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {statusMessage && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusMessage}</p>}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-slate-700">Completion Tracking</span>
          <span className="text-slate-600">{completionStats.completed}/{completionStats.total} completed ({completionStats.completionPercent}%)</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${completionStats.completionPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-600">
          Assigned: {completionStats.assigned} | Completed: {completionStats.completed} | Skipped: {completionStats.skipped}
        </p>
      </div>

      <div className="space-y-2">
        {homework.length === 0 && !isLoading && (
          <p className="text-sm text-slate-500">No homework records found.</p>
        )}

        {homework.map((item) => {
          const isEditing = editingId === item.id;
          const isBusy = actionHomeworkId === item.id;

          return (
            <div key={item.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600">{item.description || 'No description'}</p>
                  <p className="mt-1 text-xs text-slate-500">Due: {toLocalDate(item.dueDate)}</p>
                  <p className="mt-1 text-xs text-slate-700">Status: {item.status}</p>
                </div>

                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => startUpdate(item)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Update Status
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStatus}
                      onChange={(event) => setSelectedStatus(event.target.value as HomeworkStatus)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleUpdateStatus(item)}
                      disabled={isBusy}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-70"
                    >
                      {isBusy ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={isBusy}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
