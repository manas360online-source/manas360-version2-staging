import { useEffect, useState } from 'react';
import { corporateApi } from '../../api/corporate.api';
import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';

const currencyInr = (valuePaise: number): string => `₹${Math.round((valuePaise || 0) / 100).toLocaleString('en-IN')}`;

type Invoice = {
  id: string;
  invoiceCode: string;
  title: string;
  billingPeriod: string;
  amountPaise: number;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
};

type InvoicePayload = {
  summary: {
    paidAmountPaise: number;
    pendingAmountPaise: number;
  };
  rows: Invoice[];
};

const formatDate = (value: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function CorporateInvoicesPage() {
  const [payload, setPayload] = useState<InvoicePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await corporateApi.getInvoices('techcorp-india')) as InvoicePayload;
        setPayload(data);
      } catch (fetchError: any) {
        setError(fetchError?.response?.data?.message || 'Invoices unavailable');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) return <div className="p-6 text-sm text-ink-600">Loading invoices...</div>;
  if (error || !payload) return <div className="p-6 text-sm text-rose-600">{error || 'Invoices unavailable'}</div>;

  const invoices = payload.rows || [];

  return (
    <CorporateShellLayout title="Invoices & GST" subtitle="Billing history and invoice status.">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-ink-500">Pending</p>
          <p className="mt-1 text-lg font-semibold text-ink-800">{currencyInr(payload.summary.pendingAmountPaise)}</p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-ink-500">Paid</p>
          <p className="mt-1 text-lg font-semibold text-ink-800">{currencyInr(payload.summary.paidAmountPaise)}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="min-w-full divide-y divide-ink-100 text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {invoices.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3 font-medium text-ink-700">{i.invoiceCode}</td>
                <td className="px-4 py-3 text-ink-600">{i.title}</td>
                <td className="px-4 py-3 text-ink-700">{currencyInr(i.amountPaise)}</td>
                <td className="px-4 py-3 text-ink-600">
                  {i.status === 'PAID' ? `Paid ${formatDate(i.paidDate)}` : `Due ${formatDate(i.dueDate)}`}
                </td>
              </tr>
            ))}
            {!invoices.length ? (
              <tr>
                <td className="px-4 py-4 text-ink-500" colSpan={4}>
                  No invoices found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </CorporateShellLayout>
  );
}
