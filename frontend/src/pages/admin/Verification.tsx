import { useEffect, useState } from 'react';
import { getAdminUsers, verifyAdminTherapist, type AdminUser } from '../../api/admin.api';
import { getApiErrorMessage } from '../../api/auth';

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function AdminVerificationPage() {
  const [therapists, setTherapists] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTherapists = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminUsers({ page: 1, limit: 50, role: 'therapist', status: 'active' });
      setTherapists(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load therapist data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTherapists();
  }, []);

  const onVerify = async (therapistId: string) => {
    setVerifyingId(therapistId);
    setError(null);
    setSuccess(null);

    try {
      const response = await verifyAdminTherapist(therapistId);
      setSuccess(response.message || 'Therapist verification request completed.');
      await loadTherapists();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Verification request failed'));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="font-display text-xl font-bold text-ink-800">Therapist Verification</h2>
        <p className="mt-1 text-sm text-ink-600">Live therapist list from admin users API. Verification action calls backend verify endpoint.</p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Therapist</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-500">Loading therapists...</td>
                </tr>
              ) : therapists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-500">No therapists found.</td>
                </tr>
              ) : (
                therapists.map((therapist) => (
                  <tr key={therapist.id}>
                    <td className="px-4 py-3 text-sm font-medium text-ink-800">{`${therapist.firstName} ${therapist.lastName}`.trim() || 'Unnamed'}</td>
                    <td className="px-4 py-3 text-sm text-ink-700">{therapist.email}</td>
                    <td className="px-4 py-3 text-sm text-ink-700">
                      {therapist.isTherapistVerified ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Pending
                        </span>
                      )}
                      {therapist.therapistVerifiedAt ? (
                        <p className="mt-1 text-[11px] text-ink-500">{formatDate(therapist.therapistVerifiedAt)}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-700">{formatDate(therapist.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          void onVerify(therapist.id);
                        }}
                        disabled={verifyingId === therapist.id || Boolean(therapist.isTherapistVerified)}
                        className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {therapist.isTherapistVerified ? 'Verified' : verifyingId === therapist.id ? 'Verifying...' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
