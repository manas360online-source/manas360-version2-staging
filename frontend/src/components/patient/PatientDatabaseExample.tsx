import { FormEvent, useEffect, useState } from 'react';
import {
  createPatient,
  getPatientById,
  getPatients,
  type Patient,
  type PatientApiError,
} from '../../api/patient.api';

type AddPatientForm = {
  fullName: string;
  email: string;
  phone: string;
};

const defaultForm: AddPatientForm = {
  fullName: '',
  email: '',
  phone: '',
};

const getErrorMessage = (error: unknown): string => {
  const apiError = error as PatientApiError;
  return apiError?.message || 'Something went wrong while contacting Patient Database.';
};

export default function PatientDatabaseExample() {
  const [form, setForm] = useState<AddPatientForm>(defaultForm);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [isListLoading, setIsListLoading] = useState(false);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const [listError, setListError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const loadPatients = async () => {
    setIsListLoading(true);
    setListError(null);

    try {
      const records = await getPatients();
      setPatients(records);
    } catch (error) {
      setListError(getErrorMessage(error));
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    void loadPatients();
  }, []);

  const handleAddPatient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreateLoading(true);
    setCreateError(null);

    try {
      const created = await createPatient({
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });

      setForm(defaultForm);
      await loadPatients();
      setSelectedPatient(created);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsCreateLoading(false);
    }
  };

  const handleSelectPatient = async (id: string) => {
    setIsDetailsLoading(true);
    setDetailsError(null);

    try {
      const details = await getPatientById(id);
      setSelectedPatient(details);
    } catch (error) {
      setDetailsError(getErrorMessage(error));
    } finally {
      setIsDetailsLoading(false);
    }
  };

  return (
    <section className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[340px,1fr]">
      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Add Patient</h2>
          <p className="mt-1 text-sm text-slate-600">Create a new patient record in MyDigitalClinic.</p>
        </div>

        <form onSubmit={handleAddPatient} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Full Name
            <input
              required
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Jane Doe"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="jane@clinic.com"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Phone
            <input
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="+91 99999 99999"
            />
          </label>

          <button
            type="submit"
            disabled={isCreateLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCreateLoading ? 'Creating...' : 'Add Patient'}
          </button>
        </form>

        {createError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Patients</h3>
            <button
              type="button"
              onClick={() => void loadPatients()}
              disabled={isListLoading}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isListLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {listError && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{listError}</p>
          )}

          {!listError && patients.length === 0 && !isListLoading && (
            <p className="text-sm text-slate-500">No patients found.</p>
          )}

          <ul className="space-y-2">
            {patients.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  onClick={() => void handleSelectPatient(patient.id)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <p className="text-sm font-medium text-slate-900">{patient.fullName}</p>
                  <p className="text-xs text-slate-500">{patient.email || patient.phone || 'No contact info'}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-slate-900">Patient Details</h3>

          {isDetailsLoading && <p className="text-sm text-slate-500">Loading patient details...</p>}

          {!isDetailsLoading && detailsError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{detailsError}</p>
          )}

          {!isDetailsLoading && !detailsError && !selectedPatient && (
            <p className="text-sm text-slate-500">Select a patient to view details.</p>
          )}

          {!isDetailsLoading && !detailsError && selectedPatient && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">ID</dt>
                <dd className="font-medium text-slate-900">{selectedPatient.id}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium text-slate-900">{selectedPatient.fullName}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{selectedPatient.email || '-'}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">{selectedPatient.phone || '-'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Updated</dt>
                <dd className="font-medium text-slate-900">{selectedPatient.updatedAt || '-'}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
