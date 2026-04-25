import { useEffect, useState } from 'react';
import { corporateApi } from '../../api/corporate.api';
import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';

type PaymentMethod = {
  id: string;
  methodType: string;
  label: string;
  details: string;
  isPrimary: boolean;
  isActive: boolean;
};

export default function CorporatePaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    methodType: 'UPI',
    label: '',
    details: '',
    isPrimary: false,
  });

  const loadMethods = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = (await corporateApi.getPaymentMethods('techcorp-india')) as { rows: PaymentMethod[] };
      setMethods(Array.isArray(result?.rows) ? result.rows : []);
    } catch (fetchError: any) {
      setError(fetchError?.response?.data?.message || 'Unable to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMethods();
  }, []);

  const markPrimary = async (id: string) => {
    setSavingId(id);
    setError(null);
    try {
      const result = (await corporateApi.updatePaymentMethod(id, { isPrimary: true }, 'techcorp-india')) as {
        rows: PaymentMethod[];
      };
      setMethods(Array.isArray(result?.rows) ? result.rows : []);
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || 'Unable to update payment method');
    } finally {
      setSavingId(null);
    }
  };

  const updateMethodStatus = async (id: string, isActive: boolean) => {
    setSavingId(id);
    setError(null);
    try {
      const result = (await corporateApi.updatePaymentMethod(id, { isActive }, 'techcorp-india')) as {
        rows: PaymentMethod[];
      };
      setMethods(Array.isArray(result?.rows) ? result.rows : []);
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || 'Unable to update payment method');
    } finally {
      setSavingId(null);
    }
  };

  const addPaymentMethod = async () => {
    if (!form.label.trim() || !form.details.trim()) {
      setError('Label and details are required to add a payment method.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = (await corporateApi.createPaymentMethod(
        {
          methodType: form.methodType,
          label: form.label.trim(),
          details: form.details.trim(),
          isPrimary: form.isPrimary,
        },
        'techcorp-india',
      )) as { rows: PaymentMethod[] };

      setMethods(Array.isArray(result?.rows) ? result.rows : []);
      setForm({ methodType: 'UPI', label: '', details: '', isPrimary: false });
    } catch (createError: any) {
      setError(createError?.response?.data?.message || 'Unable to add payment method');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CorporateShellLayout title="Payment Methods" subtitle="Manage corporate payment instruments.">
        <div className="rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-600">Loading payment methods...</div>
      </CorporateShellLayout>
    );
  }

  return (
    <CorporateShellLayout title="Payment Methods" subtitle="Manage corporate payment instruments.">
      {error ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-ink-500">Total Methods</p>
          <p className="mt-1 text-xl font-semibold text-ink-800">{methods.length}</p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-ink-500">Active</p>
          <p className="mt-1 text-xl font-semibold text-ink-800">{methods.filter((item) => item.isActive).length}</p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-ink-500">Primary Method</p>
          <p className="mt-1 truncate text-sm font-semibold text-sage-700">{methods.find((item) => item.isPrimary)?.label || 'Not set'}</p>
        </div>
      </div>

      <section className="mb-4 rounded-xl border border-ink-100 bg-white p-4">
        <h2 className="font-display text-base font-semibold text-ink-800">Add Payment Method</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">Type</label>
            <select
              value={form.methodType}
              onChange={(event) => setForm((prev) => ({ ...prev, methodType: event.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
            >
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK">Bank</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">Label</label>
            <input
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="Finance UPI"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">Details</label>
            <input
              value={form.details}
              onChange={(event) => setForm((prev) => ({ ...prev, details: event.target.value }))}
              placeholder="corp.payments@okbank or Visa •••• 4242"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(event) => setForm((prev) => ({ ...prev, isPrimary: event.target.checked }))}
              className="h-4 w-4 rounded border-ink-200"
            />
            Set as primary
          </label>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void addPaymentMethod()}
            disabled={submitting}
            className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Adding...' : 'Add Method'}
          </button>
        </div>
      </section>

      <div className="space-y-3">
        {methods.map((method) => (
          <div key={method.id} className="rounded-xl border border-ink-100 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-800">{method.label}</p>
              <span className="rounded-full bg-ink-100 px-2 py-1 text-xs font-medium text-ink-600">{method.methodType}</span>
            </div>
            <p className="mt-1 text-sm text-ink-600">{method.details}</p>
            <div className="mt-3 flex items-center justify-between">
              <p className={`text-xs ${method.isPrimary ? 'text-sage-700' : 'text-ink-500'}`}>
                {method.isPrimary ? 'Primary' : 'Backup'} · {method.isActive ? 'Active' : 'Inactive'}
              </p>
              <div className="flex items-center gap-2">
                {!method.isPrimary ? (
                  <button
                    type="button"
                    onClick={() => void markPrimary(method.id)}
                    disabled={savingId === method.id}
                    className="rounded-md border border-ink-200 px-2 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingId === method.id ? 'Saving...' : 'Set as primary'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void updateMethodStatus(method.id, !method.isActive)}
                  disabled={savingId === method.id}
                  className="rounded-md border border-ink-200 px-2 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingId === method.id ? 'Saving...' : method.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        ))}
        {!methods.length ? (
          <div className="rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-600">No payment methods configured.</div>
        ) : null}
      </div>
    </CorporateShellLayout>
  );
}
