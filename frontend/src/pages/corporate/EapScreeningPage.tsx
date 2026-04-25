import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Assessment } from '../Assessment';

type AssessmentResult = {
  symptoms?: string[];
  impact?: string;
  selfHarm?: string;
  totalScore?: number;
  severityLevel?: string;
  interpretation?: string;
  recommendation?: string;
  action?: string;
};

const toBrandLabel = (value: string): string => {
  const cleaned = String(value || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  if (!cleaned) return 'Employee Wellness Program';
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function EapScreeningPage() {
  const navigate = useNavigate();
  const { companyKey = '' } = useParams<{ companyKey: string }>();
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const companyLabel = useMemo(() => toBrandLabel(companyKey), [companyKey]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(60,107,255,0.14),_transparent_38%),linear-gradient(180deg,_#f7fbff_0%,_#eef6ff_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between rounded-3xl border border-white/70 bg-white/80 px-5 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-serif text-2xl font-semibold tracking-wide text-slate-900 transition hover:opacity-80"
          >
            MANAS<span className="text-[#032467]">360</span>
          </button>
          <div className="rounded-full border border-[#032467]/10 bg-[#032467]/6 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#032467]">
            Corporate EAP
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.08)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{companyLabel}</p>
            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Private screening for employees
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              This assessment is anonymous to your employer. Your responses stay private, and only aggregate analytics are visible on the corporate dashboard.
            </p>

            <div className="mt-6 grid gap-4 rounded-[24px] border border-[#032467]/10 bg-[#032467]/4 p-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Private</p>
                <p className="mt-1 text-sm font-medium text-slate-900">No HR visibility into answers</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Fast</p>
                <p className="mt-1 text-sm font-medium text-slate-900">PHQ-9 / GAD-7 screening</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Actionable</p>
                <p className="mt-1 text-sm font-medium text-slate-900">Book covered care if needed</p>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <Assessment
                onSubmit={(assessmentResult) => {
                  setResult(assessmentResult as AssessmentResult);
                }}
              />
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-6">
            <div className="rounded-[32px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_28px_70px_rgba(15,23,42,0.16)] sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Your privacy</p>
              <p className="mt-3 text-2xl font-serif leading-tight text-white">
                Your employer sees trends, not your answers.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The QR code is tied to this company&apos;s wellness program so the dashboard can report scans, screenings, and bookings by standee location.
              </p>
            </div>

            <div className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.07)] sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">After screening</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Next steps</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>• Instant severity summary</li>
                <li>• Therapist matching for covered care</li>
                <li>• Session booking when the employee is ready</li>
              </ul>
              <button
                type="button"
                onClick={() => navigate('/assessment')}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#032467] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Start another screening
              </button>
            </div>

            {result ? (
              <div className="rounded-[32px] border border-[#032467]/15 bg-[#032467]/6 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.07)] sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#032467]">Latest result</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {String(result.severityLevel || 'Assessment complete')}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-700">{result.interpretation || result.recommendation || 'Your screening is complete.'}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-slate-500">Score</p>
                    <p className="mt-1 font-semibold text-slate-950">{typeof result.totalScore === 'number' ? result.totalScore : 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-slate-500">Action</p>
                    <p className="mt-1 font-semibold text-slate-950">{result.action || 'Book if needed'}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
