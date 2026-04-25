import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getAdminModuleSummary, type AdminModuleSummary } from '../../api/admin.api';

type AdminSectionPageProps = {
  title: string;
  description: string;
  bullets?: string[];
};

export default function AdminSectionPage({ title, description, bullets = [] }: AdminSectionPageProps) {
  const location = useLocation();
  const [summary, setSummary] = useState<AdminModuleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const module = location.pathname.split('/').filter(Boolean).pop() || 'dashboard';
        const response = await getAdminModuleSummary(module);
        setSummary(response.data);
      } catch (err) {
        setSummary(null);
        setError(err instanceof Error ? err.message : 'Unable to load live module data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [location.pathname]);

  return (
    <div className="space-y-4 rounded-xl border border-ink-100 bg-white p-5">
      <div>
        <h2 className="font-display text-xl font-bold text-ink-800">{title}</h2>
        <p className="mt-1 text-sm text-ink-600">{description}</p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, idx) => <LiveStat key={idx} label="Loading" value="..." />)
        ) : (
          (summary?.stats ?? []).map((stat) => <LiveStat key={stat.label} label={stat.label} value={stat.value} note={stat.note} />)
        )}
      </div>

      {summary?.items?.length ? (
        <div className="space-y-2">
          <h3 className="font-display text-base font-semibold text-ink-800">Live Records</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {summary.items.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
                <p className="font-semibold text-ink-800">{item.title}</p>
                <p className="text-xs text-ink-600">{item.subtitle}</p>
                {item.meta ? <p className="mt-1 text-[11px] text-ink-500">{item.meta}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : bullets.length ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {bullets.map((item) => (
            <div key={item} className="rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
              {item}
            </div>
          ))}
        </div>
      ) : null}

      {summary?.refreshedAt ? (
        <p className="text-[11px] text-ink-500">Last refreshed: {new Date(summary.refreshedAt).toLocaleString('en-IN')}</p>
      ) : null}
    </div>
  );
}

function LiveStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink-800">{value}</p>
      {note ? <p className="mt-1 text-[11px] text-ink-500">{note}</p> : null}
    </div>
  );
}
