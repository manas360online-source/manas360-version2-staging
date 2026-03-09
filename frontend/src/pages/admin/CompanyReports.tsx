import { useEffect, useMemo, useState } from 'react';
import { corporateApi } from '../../api/corporate.api';

type CompanyItem = {
  id: string;
  companyKey: string;
  name: string;
};

type CompanyReport = {
  id: string;
  type: string;
  quarter: string;
  format: string;
  generatedAt: string;
  downloadUrl?: string;
};

type CompanyRoi = {
  programCost: number;
  productivityGain: number;
  retentionGain: number;
  healthcareSavings: number;
  roiMultiple: number;
};

const inr = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function AdminCompanyReportsPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [companyKey, setCompanyKey] = useState('');
  const [reports, setReports] = useState<CompanyReport[]>([]);
  const [roi, setRoi] = useState<CompanyRoi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCompanies = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const rows = (await corporateApi.listCompanies()) as CompanyItem[];
        setCompanies(rows);
        if (rows[0]?.companyKey) {
          setCompanyKey(rows[0].companyKey);
        }
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

    const loadReportData = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const [reportRows, roiResponse] = await Promise.all([
          corporateApi.getReports(companyKey),
          corporateApi.getRoi(companyKey),
        ]);

        setReports((reportRows as CompanyReport[]) || []);
        setRoi(roiResponse as CompanyRoi);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load report data.');
      } finally {
        setLoading(false);
      }
    };

    void loadReportData();
  }, [companyKey]);

  const totalValueUnlocked = useMemo(() => {
    if (!roi) return 0;
    return roi.productivityGain + roi.retentionGain + roi.healthcareSavings;
  }, [roi]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-800">Company Reports</h2>
            <p className="mt-1 text-sm text-ink-600">Quarterly report operations with ROI intelligence for enterprise customers.</p>
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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Kpi label="Program Cost" value={inr(roi?.programCost || 0)} />
        <Kpi label="Productivity Gain" value={inr(roi?.productivityGain || 0)} />
        <Kpi label="Retention Gain" value={inr(roi?.retentionGain || 0)} />
        <Kpi label="Healthcare Savings" value={inr(roi?.healthcareSavings || 0)} />
        <Kpi label="ROI Multiple" value={`${roi?.roiMultiple || 0}x`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-base font-bold text-ink-800">Generated Reports</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-100">
              <thead className="bg-ink-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Quarter</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Format</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 bg-white">
                {(reports || []).map((report) => (
                  <tr key={report.id}>
                    <td className="px-4 py-3 text-sm font-semibold text-ink-800">{report.type}</td>
                    <td className="px-4 py-3 text-sm text-ink-700">{report.quarter}</td>
                    <td className="px-4 py-3 text-sm text-ink-700">{String(report.format).toUpperCase()}</td>
                    <td className="px-4 py-3 text-sm text-ink-700">{formatDate(report.generatedAt)}</td>
                  </tr>
                ))}
                {!loading && !reports.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-500">No reports available.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <h3 className="font-display text-base font-bold text-ink-800">Value Summary</h3>
          <div className="mt-3 space-y-2 text-sm">
            <ValueRow label="Total Value Unlocked" value={inr(totalValueUnlocked)} />
            <ValueRow label="Program Cost" value={inr(roi?.programCost || 0)} />
            <ValueRow label="ROI" value={`${roi?.roiMultiple || 0}x`} />
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600">
            Exports are currently sourced from generated backend report records. Download links can be enabled once signed URLs are activated in production storage.
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-ink-800">{value}</p>
    </div>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-ink-50 px-2.5 py-2">
      <span className="text-ink-600">{label}</span>
      <span className="font-semibold text-ink-800">{value}</span>
    </div>
  );
}
