import { useEffect, useMemo, useState } from 'react';
import { corporateApi } from '../../api/corporate.api';

type CompanyItem = {
  id: string;
  companyKey: string;
  name: string;
};

type CompanySettings = {
  companyName: string;
  employeeLimit: number;
  sessionQuota: number;
  ssoProvider: string;
  supportEmail: string;
  supportPhone: string;
  supportSla: string;
};

type CompanyInvoices = {
  summary: {
    paidAmountPaise: number;
    pendingAmountPaise: number;
  };
  rows: Array<{
    id: string;
    invoiceCode: string;
    title: string;
    billingPeriod: string;
    amountPaise: number;
    currency: string;
    status: string;
    dueDate: string | null;
    paidDate: string | null;
  }>;
};

type CompanyPaymentMethods = {
  primaryMethodId: string | null;
  rows: Array<{
    id: string;
    methodType: string;
    label: string;
    details: string;
    isPrimary: boolean;
    isActive: boolean;
    updatedAt: string;
  }>;
};

const money = (amountPaise: number, currency = 'INR'): string => {
  const value = (amountPaise || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function AdminCompanySubscriptionsPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [companyKey, setCompanyKey] = useState('');

  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [invoices, setInvoices] = useState<CompanyInvoices | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<CompanyPaymentMethods | null>(null);

  const [sessionQuotaInput, setSessionQuotaInput] = useState('');
  const [employeeLimitInput, setEmployeeLimitInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadCompanies = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const rows = (await corporateApi.listCompanies()) as CompanyItem[];
        setCompanies(rows);
        if (rows[0]?.companyKey) setCompanyKey(rows[0].companyKey);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load companies.');
      } finally {
        setLoading(false);
      }
    };

    void loadCompanies();
  }, []);

  useEffect(() => {
    if (!companyKey) return;

    const loadData = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const [nextSettings, nextInvoices, nextPaymentMethods] = await Promise.all([
          corporateApi.getSettings(companyKey),
          corporateApi.getInvoices(companyKey),
          corporateApi.getPaymentMethods(companyKey),
        ]);

        setSettings(nextSettings as CompanySettings);
        setInvoices(nextInvoices as CompanyInvoices);
        setPaymentMethods(nextPaymentMethods as CompanyPaymentMethods);

        const typedSettings = nextSettings as CompanySettings;
        setSessionQuotaInput(String(typedSettings.sessionQuota));
        setEmployeeLimitInput(String(typedSettings.employeeLimit));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load subscription data.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [companyKey]);

  const renewalSignal = useMemo(() => {
    const dueCount = (invoices?.rows || []).filter((invoice) => invoice.status === 'DUE').length;
    if (dueCount === 0) return 'All invoices settled';
    return `${dueCount} invoices pending`; 
  }, [invoices?.rows]);

  const handleSavePlanControls = async (): Promise<void> => {
    if (!companyKey) return;

    const nextSessionQuota = Number(sessionQuotaInput);
    const nextEmployeeLimit = Number(employeeLimitInput);

    if (!Number.isFinite(nextSessionQuota) || !Number.isFinite(nextEmployeeLimit) || nextSessionQuota < 1 || nextEmployeeLimit < 1) {
      setError('Session quota and employee limit must be valid positive numbers.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = (await corporateApi.updateSettings(
        {
          sessionQuota: nextSessionQuota,
          employeeLimit: nextEmployeeLimit,
        },
        companyKey,
      )) as CompanySettings;

      setSettings(updated);
      setSessionQuotaInput(String(updated.sessionQuota));
      setEmployeeLimitInput(String(updated.employeeLimit));
      setSuccess('Plan controls updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update plan controls.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-800">Company Subscriptions</h2>
            <p className="mt-1 text-sm text-ink-600">Billing controls, quota configuration, payment instruments, and invoice lifecycle.</p>
          </div>
          <div className="min-w-[260px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">Company</label>
            <select
              value={companyKey}
              onChange={(event) => setCompanyKey(event.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2"
            >
              <option value="">Choose company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.companyKey}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Paid Amount" value={money(invoices?.summary.paidAmountPaise || 0)} />
        <MetricCard label="Pending Amount" value={money(invoices?.summary.pendingAmountPaise || 0)} />
        <MetricCard label="Renewal Signal" value={renewalSignal} />
        <MetricCard label="Primary Method" value={paymentMethods?.rows.find((row) => row.isPrimary)?.label || 'Not set'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <h3 className="font-display text-base font-bold text-ink-800">Plan Controls</h3>
          <p className="mt-1 text-xs text-ink-500">Adjust contract-level quota and employee limits for the selected company.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-ink-700">
              Session Quota
              <input
                value={sessionQuotaInput}
                onChange={(event) => setSessionQuotaInput(event.target.value)}
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none ring-sage-500 focus:ring-2"
              />
            </label>
            <label className="text-sm text-ink-700">
              Employee Limit
              <input
                value={employeeLimitInput}
                onChange={(event) => setEmployeeLimitInput(event.target.value)}
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none ring-sage-500 focus:ring-2"
              />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-ink-500 sm:grid-cols-2">
            <div className="rounded-lg bg-ink-50 px-3 py-2">SSO: {settings?.ssoProvider || '-'}</div>
            <div className="rounded-lg bg-ink-50 px-3 py-2">Support SLA: {settings?.supportSla || '-'}</div>
          </div>

          <button
            onClick={() => {
              void handleSavePlanControls();
            }}
            disabled={saving || loading || !companyKey}
            className="mt-4 rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Plan Controls'}
          </button>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <h3 className="font-display text-base font-bold text-ink-800">Payment Methods</h3>
          <div className="mt-3 space-y-2">
            {(paymentMethods?.rows || []).map((row) => (
              <div key={row.id} className="rounded-lg border border-ink-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-800">{row.label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.isPrimary ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-600'}`}>
                    {row.isPrimary ? 'Primary' : 'Secondary'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-500">{row.methodType} · {row.details}</p>
                <p className="mt-1 text-[11px] text-ink-400">{row.isActive ? 'Active' : 'Disabled'}</p>
              </div>
            ))}
            {!loading && !paymentMethods?.rows?.length ? <p className="text-sm text-ink-500">No payment methods configured.</p> : null}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-base font-bold text-ink-800">Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {(invoices?.rows || []).slice(0, 8).map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 text-sm text-ink-800">
                    <p className="font-semibold">{invoice.invoiceCode}</p>
                    <p className="text-xs text-ink-500">{invoice.title}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-700">{invoice.billingPeriod}</td>
                  <td className="px-4 py-3 text-sm text-ink-700">{money(invoice.amountPaise, invoice.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && !invoices?.rows?.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-500">No invoices available.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-ink-800">{value}</p>
    </div>
  );
}
