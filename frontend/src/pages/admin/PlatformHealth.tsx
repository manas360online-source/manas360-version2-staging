import { useEffect, useMemo, useState } from 'react';
import { getAdminMetrics, type AdminMetrics } from '../../api/admin.api';

type HealthPing = {
  status: string;
  server: string;
  ok: boolean;
  service: string;
  timestamp: string;
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const getHealthUrl = (): string => {
  const base =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    import.meta.env.VITE_API_URL?.trim() ||
    'http://localhost:3000/api';

  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}/health`;
};

export default function AdminPlatformHealthPage() {
  const [health, setHealth] = useState<HealthPing | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHealth = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const startedAt = performance.now();
        const [healthResponse, metricsResponse] = await Promise.all([
          fetch(getHealthUrl(), { credentials: 'include' }),
          getAdminMetrics(),
        ]);

        if (!healthResponse.ok) {
          throw new Error(`Health endpoint failed with status ${healthResponse.status}`);
        }

        const parsedHealth = (await healthResponse.json()) as HealthPing;
        setHealth(parsedHealth);
        setMetrics(metricsResponse.data);
        setApiLatencyMs(Math.max(1, Math.round(performance.now() - startedAt)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load platform health.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadHealth();
    const timer = window.setInterval(() => {
      void loadHealth();
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const healthStatusTone = useMemo(() => {
    if (!health?.ok) return 'bg-red-100 text-red-700';
    if ((apiLatencyMs || 0) > 700) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  }, [health?.ok, apiLatencyMs]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="font-display text-xl font-bold text-ink-800">Platform Health</h2>
        <p className="mt-1 text-sm text-ink-600">
          Live service heartbeat, API responsiveness, and operational throughput indicators.
        </p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Health" value={health?.ok ? 'Healthy' : 'Degraded'} toneClass={healthStatusTone} />
        <StatCard label="API Latency" value={apiLatencyMs ? `${apiLatencyMs} ms` : '-'} />
        <StatCard label="Completed Sessions" value={String(metrics?.completedSessions ?? 0)} />
        <StatCard label="Active Subscriptions" value={String(metrics?.activeSubscriptions ?? 0)} />
        <StatCard label="Total Revenue" value={`₹${metrics?.totalRevenue ?? 0}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <h3 className="font-display text-base font-bold text-ink-800">Runtime Status</h3>
          <div className="mt-3 space-y-3 text-sm">
            <KeyValue label="Service" value={health?.service || '-'} />
            <KeyValue label="Server" value={health?.server || '-'} />
            <KeyValue label="Status" value={health?.status || '-'} />
            <KeyValue label="Last Health Ping" value={health?.timestamp ? formatDateTime(health.timestamp) : '-'} />
            <KeyValue label="Probe Window" value="Auto-refresh every 30 seconds" />
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <h3 className="font-display text-base font-bold text-ink-800">Operational Signals</h3>
          <div className="mt-3 space-y-2 text-sm text-ink-700">
            <SignalRow
              label="Session Throughput"
              value={`${metrics?.completedSessions ?? 0} completed`}
              level={(metrics?.completedSessions ?? 0) > 0 ? 'normal' : 'warn'}
            />
            <SignalRow
              label="Subscription Activity"
              value={`${metrics?.activeSubscriptions ?? 0} active`}
              level={(metrics?.activeSubscriptions ?? 0) > 0 ? 'normal' : 'warn'}
            />
            <SignalRow
              label="Therapist Capacity"
              value={`${metrics?.totalTherapists ?? 0} therapists`}
              level={(metrics?.totalTherapists ?? 0) > 0 ? 'normal' : 'warn'}
            />
            <SignalRow
              label="User Base"
              value={`${metrics?.totalUsers ?? 0} users`}
              level={(metrics?.totalUsers ?? 0) > 0 ? 'normal' : 'warn'}
            />
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600">
            This module is wired to existing backend health and admin metrics endpoints. Deep infrastructure telemetry can be added once service-level traces are exposed.
          </div>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-ink-500">Refreshing platform health...</p> : null}
    </div>
  );
}

function StatCard({ label, value, toneClass }: { label: string; value: string; toneClass?: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 font-display text-lg font-bold text-ink-800 ${toneClass || ''}`}>{value}</p>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm text-ink-800">{value}</p>
    </div>
  );
}

function SignalRow({ label, value, level }: { label: string; value: string; level: 'normal' | 'warn' }) {
  const dotClass = level === 'normal' ? 'bg-emerald-500' : 'bg-amber-500';
  return (
    <div className="flex items-center justify-between rounded-md bg-ink-50 px-2.5 py-2">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
        <span>{label}</span>
      </div>
      <span className="font-semibold text-ink-800">{value}</span>
    </div>
  );
}
