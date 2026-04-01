import React, { useEffect, useState } from 'react';
import { getLandingMetrics, getLandingMetricsErrorMessage } from '../../api/landing';

interface TrustMetricItem {
  key: string;
  label: string;
  displayValue: string;
}

const baseMetrics: TrustMetricItem[] = [
  { key: 'providers', label: 'Verified Providers', displayValue: '0' },
  { key: 'languages', label: 'Regional Languages', displayValue: '5' },
  { key: 'pricing', label: 'Starting Monthly', displayValue: '₹299' },
  { key: 'support', label: 'AI Support', displayValue: '24/7' },
  { key: 'credential', label: 'Credential Verified', displayValue: 'NMC' },
  { key: 'compliance', label: 'Privacy-Ready', displayValue: 'DPDPA' },
];

export const TrustMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<TrustMetricItem[]>(baseMetrics);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      try {
        const response = await getLandingMetrics();
        const providersMetric = response.metrics.find((item) => item.key === 'providers');
        if (mounted && providersMetric) {
          setMetrics((prev) =>
            prev.map((item) =>
              item.key === 'providers'
                ? { ...item, displayValue: providersMetric.displayValue }
                : item
            )
          );
        }
      } catch (err) {
        if (mounted) {
          setError(getLandingMetricsErrorMessage(err));
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="py-8" aria-label="Trust metrics">
      <div className="rounded-2xl border border-calm-sage/15 bg-white px-4 py-5 shadow-soft-xs sm:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {metrics.map((item) => (
            <div key={item.label} className="text-center">
              <p className="font-serif text-2xl text-charcoal md:text-3xl">{item.displayValue}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-charcoal/60">{item.label}</p>
            </div>
          ))}
        </div>
        {error && <p className="mt-3 text-center text-xs text-charcoal/50">{error}</p>}
      </div>
    </section>
  );
};

export default TrustMetrics;
