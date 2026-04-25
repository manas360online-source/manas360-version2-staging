import { useEffect, useMemo, useRef } from 'react';
import { Chart, type ChartConfiguration } from 'chart.js/auto';

type TherapistEarningsChartProps = {
  labels: string[];
  therapistShare: number[];
  platformShare: number[];
};

export default function TherapistEarningsChart({ labels, therapistShare, platformShare }: TherapistEarningsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const config = useMemo<ChartConfiguration<'bar'>>(() => ({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Your Share (60%)',
          data: therapistShare,
          backgroundColor: '#4A6741',
          borderRadius: 6,
          barPercentage: 0.6,
        },
        {
          label: 'Platform (40%)',
          data: platformShare,
          backgroundColor: '#E8EFE6',
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { family: 'DM Sans', size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          titleFont: { family: 'Outfit', size: 12 },
          bodyFont: { family: 'DM Sans', size: 11 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label(context) {
              const value = Number(context.parsed.y || 0);
              return `${context.dataset.label}: ₹${value.toLocaleString('en-IN')}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f5f5f5', drawBorder: false },
          ticks: {
            font: { family: 'DM Sans', size: 10 },
            color: '#6B6B6B',
            callback(value) {
              const numeric = Number(value || 0);
              return `₹${(numeric / 1000).toFixed(0)}K`;
            },
          },
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'DM Sans', size: 11 }, color: '#6B6B6B' },
        },
      },
    },
  }), [labels, platformShare, therapistShare]);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [config]);

  return <canvas ref={canvasRef} />;
}
