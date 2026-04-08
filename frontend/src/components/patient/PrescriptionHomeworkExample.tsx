import { FormEvent, useMemo, useState } from 'react';
import {
  assignHomework,
  createPrescription,
  deliverPrescription,
  getHomework,
  getPrescriptionPDF,
  updateHomework,
  type DeliveryChannel,
  type HomeworkItem,
  type MdcPrescriptionHomeworkApiError,
  type Prescription,
} from '../../api/mdcPrescriptionHomework.api';

type PrescriptionForm = {
  patientId: string;
  title: string;
  instructions: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: string;
};

type HomeworkForm = {
  patientId: string;
  title: string;
  description: string;
  dueDate: string;
};

const defaultPrescriptionForm: PrescriptionForm = {
  patientId: '',
  title: '',
  instructions: '',
  medicineName: '',
  dosage: '',
  frequency: '',
  durationDays: '7',
};

const defaultHomeworkForm: HomeworkForm = {
  patientId: '',
  title: '',
  description: '',
  dueDate: '',
};

const getErrorMessage = (error: unknown): string => {
  const apiError = error as MdcPrescriptionHomeworkApiError;
  return apiError?.message || 'Unable to process Prescription/Homework request.';
};

const toLocalDateInput = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function PrescriptionHomeworkExample() {
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionForm>(defaultPrescriptionForm);
  const [homeworkForm, setHomeworkForm] = useState<HomeworkForm>(defaultHomeworkForm);

  const [createdPrescription, setCreatedPrescription] = useState<Prescription | null>(null);
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>('whatsapp');

  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [editingHomeworkId, setEditingHomeworkId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');

  const [isCreatingPrescription, setIsCreatingPrescription] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const [isAssigningHomework, setIsAssigningHomework] = useState(false);
  const [isLoadingHomework, setIsLoadingHomework] = useState(false);
  const [actionHomeworkId, setActionHomeworkId] = useState<string | null>(null);

  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);
  const [homeworkError, setHomeworkError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sortedHomework = useMemo(() => {
    return [...homeworkList].sort((a, b) => {
      const aTime = new Date(a.dueDate || a.createdAt || 0).getTime();
      const bTime = new Date(b.dueDate || b.createdAt || 0).getTime();
      return aTime - bTime;
    });
  }, [homeworkList]);

  const handleCreatePrescription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!prescriptionForm.patientId.trim() || !prescriptionForm.medicineName.trim()) {
      setPrescriptionError('Patient ID and medicine name are required.');
      return;
    }

    setIsCreatingPrescription(true);
    setPrescriptionError(null);
    setStatusMessage(null);

    try {
      const created = await createPrescription({
        patientId: prescriptionForm.patientId.trim(),
        title: prescriptionForm.title.trim() || 'Prescription',
        instructions: prescriptionForm.instructions.trim(),
        medicines: [
          {
            name: prescriptionForm.medicineName.trim(),
            dosage: prescriptionForm.dosage.trim() || 'As directed',
            frequency: prescriptionForm.frequency.trim() || 'Once daily',
            durationDays: Number.parseInt(prescriptionForm.durationDays, 10) || 7,
          },
        ],
      });

      setCreatedPrescription(created);
      setStatusMessage('Prescription created successfully.');
    } catch (error) {
      setPrescriptionError(getErrorMessage(error));
    } finally {
      setIsCreatingPrescription(false);
    }
  };

  const handleDeliverPrescription = async () => {
    if (!createdPrescription?.id) {
      setPrescriptionError('Create a prescription before sending it to patient.');
      return;
    }

    setIsDelivering(true);
    setPrescriptionError(null);
    setStatusMessage(null);

    try {
      const result = await deliverPrescription(createdPrescription.id, deliveryChannel);
      setStatusMessage(result.message || `Prescription sent via ${deliveryChannel}.`);
    } catch (error) {
      setPrescriptionError(getErrorMessage(error));
    } finally {
      setIsDelivering(false);
    }
  };

  const handleDownloadPrescriptionPdf = async () => {
    if (!createdPrescription?.id) {
      setPrescriptionError('Create a prescription before downloading PDF.');
      return;
    }

    setIsDownloadingPdf(true);
    setPrescriptionError(null);

    try {
      const pdfBlob = await getPrescriptionPDF(createdPrescription.id);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prescription-${createdPrescription.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatusMessage('Prescription PDF downloaded.');
    } catch (error) {
      setPrescriptionError(getErrorMessage(error));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleAssignHomework = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!homeworkForm.patientId.trim() || !homeworkForm.title.trim()) {
      setHomeworkError('Patient ID and homework title are required.');
      return;
    }

    setIsAssigningHomework(true);
    setHomeworkError(null);
    setStatusMessage(null);

    try {
      await assignHomework({
        patientId: homeworkForm.patientId.trim(),
        title: homeworkForm.title.trim(),
        description: homeworkForm.description.trim(),
        dueDate: homeworkForm.dueDate ? new Date(homeworkForm.dueDate).toISOString() : new Date().toISOString(),
        status: 'pending',
      });

      setStatusMessage('Homework assigned successfully.');
      await handleLoadHomework(homeworkForm.patientId.trim());
      setHomeworkForm((prev) => ({ ...prev, title: '', description: '', dueDate: '' }));
    } catch (error) {
      setHomeworkError(getErrorMessage(error));
    } finally {
      setIsAssigningHomework(false);
    }
  };

  const handleLoadHomework = async (patientIdOverride?: string) => {
    const patientId = (patientIdOverride || homeworkForm.patientId).trim();
    if (!patientId) {
      setHomeworkError('Patient ID is required to load homework.');
      return;
    }

    setIsLoadingHomework(true);
    setHomeworkError(null);

    try {
      const items = await getHomework(patientId);
      setHomeworkList(items);
    } catch (error) {
      setHomeworkError(getErrorMessage(error));
    } finally {
      setIsLoadingHomework(false);
    }
  };

  const startStatusEdit = (item: HomeworkItem) => {
    setEditingHomeworkId(item.id);
    const nextStatus = item.status === 'in_progress' || item.status === 'completed' ? item.status : 'pending';
    setEditingStatus(nextStatus);
  };

  const handleUpdateHomeworkStatus = async (item: HomeworkItem) => {
    setActionHomeworkId(item.id);
    setHomeworkError(null);
    setStatusMessage(null);

    try {
      const updated = await updateHomework(item.id, { status: editingStatus });
      setHomeworkList((prev) => prev.map((existing) => (existing.id === item.id ? updated : existing)));
      setEditingHomeworkId(null);
      setStatusMessage('Homework status updated.');
    } catch (error) {
      setHomeworkError(getErrorMessage(error));
    } finally {
      setActionHomeworkId(null);
    }
  };

  return (
    <section className="space-y-4">
      {statusMessage && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusMessage}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Prescription Form</h2>
        <p className="mt-1 text-sm text-slate-500">Create and deliver prescription to patient.</p>

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreatePrescription}>
          <label className="block text-sm font-medium text-slate-700">
            Patient ID
            <input
              value={prescriptionForm.patientId}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, patientId: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Enter patient ID"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Title
            <input
              value={prescriptionForm.title}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Prescription title"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Medicine Name
            <input
              value={prescriptionForm.medicineName}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, medicineName: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Medicine"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Dosage
            <input
              value={prescriptionForm.dosage}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, dosage: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="e.g. 10 mg"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Frequency
            <input
              value={prescriptionForm.frequency}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, frequency: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="e.g. Twice daily"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Duration (days)
            <input
              type="number"
              min={1}
              value={prescriptionForm.durationDays}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, durationDays: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Instructions
            <textarea
              rows={3}
              value={prescriptionForm.instructions}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, instructions: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Additional instructions"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isCreatingPrescription}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreatingPrescription ? 'Creating...' : 'Create Prescription'}
            </button>

            <select
              value={deliveryChannel}
              onChange={(event) => setDeliveryChannel(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>

            <button
              type="button"
              onClick={() => void handleDeliverPrescription()}
              disabled={!createdPrescription?.id || isDelivering}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDelivering ? 'Sending...' : 'Send to Patient'}
            </button>

            <button
              type="button"
              onClick={() => void handleDownloadPrescriptionPdf()}
              disabled={!createdPrescription?.id || isDownloadingPdf}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDownloadingPdf ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </form>

        {createdPrescription?.id && (
          <p className="mt-3 text-sm text-slate-600">Created prescription ID: {createdPrescription.id}</p>
        )}
        {prescriptionError && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{prescriptionError}</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Homework Assignment</h3>
        <p className="mt-1 text-sm text-slate-500">Assign and track patient homework.</p>

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleAssignHomework}>
          <label className="block text-sm font-medium text-slate-700">
            Patient ID
            <input
              value={homeworkForm.patientId}
              onChange={(event) => setHomeworkForm((prev) => ({ ...prev, patientId: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Enter patient ID"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Homework Title
            <input
              value={homeworkForm.title}
              onChange={(event) => setHomeworkForm((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="e.g. Breathing exercise"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Due Date
            <input
              type="date"
              value={homeworkForm.dueDate}
              onChange={(event) => setHomeworkForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Description
            <textarea
              rows={3}
              value={homeworkForm.description}
              onChange={(event) => setHomeworkForm((prev) => ({ ...prev, description: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Homework instructions"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isAssigningHomework}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAssigningHomework ? 'Assigning...' : 'Assign Homework'}
            </button>
            <button
              type="button"
              onClick={() => void handleLoadHomework()}
              disabled={isLoadingHomework}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoadingHomework ? 'Loading...' : 'Load Homework'}
            </button>
          </div>
        </form>

        {homeworkError && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{homeworkError}</p>
        )}

        <div className="mt-4 space-y-2">
          {sortedHomework.length === 0 && !isLoadingHomework && (
            <p className="text-sm text-slate-500">No homework items found.</p>
          )}

          {sortedHomework.map((item) => {
            const isEditing = editingHomeworkId === item.id;
            const isBusy = actionHomeworkId === item.id;

            return (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.description || 'No description'}</p>
                    <p className="mt-1 text-xs text-slate-500">Due: {toLocalDateInput(item.dueDate) || '-'}</p>
                  </div>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => startStatusEdit(item)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Update Status
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={editingStatus}
                        onChange={(event) => setEditingStatus(event.target.value as 'pending' | 'in_progress' | 'completed')}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleUpdateHomeworkStatus(item)}
                        disabled={isBusy}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-70"
                      >
                        {isBusy ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingHomeworkId(null)}
                        disabled={isBusy}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-700">Status: {item.status}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
