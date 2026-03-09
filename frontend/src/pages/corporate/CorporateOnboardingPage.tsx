import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, BriefcaseBusiness, Globe2, Mail, ShieldCheck, User2, Users } from 'lucide-react';
import { corporateApi } from '../../api/corporate.api';
import { getApiErrorMessage } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

type Mode = 'demo' | 'create';

const inputClassName =
  'w-full rounded-xl border border-[#D9E0DA] bg-white px-3 py-2.5 text-sm text-[#18302E] shadow-sm outline-none transition focus:border-[#4E8F86] focus:ring-2 focus:ring-[#4E8F86]/20';

export default function CorporateOnboardingPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>('demo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companySize, setCompanySize] = useState('200');
  const [industry, setIndustry] = useState('Technology');
  const [country, setCountry] = useState('India');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const modeCopy = useMemo(
    () => ({
      demo: {
        title: 'Request Enterprise Demo',
        subtitle:
          'Talk to our enterprise team. We will configure your company tenant, privacy controls, and rollout plan.',
        cta: 'Request Demo',
      },
      create: {
        title: 'Create Corporate Account',
        subtitle:
          'Create your tenant now, become a corporate member instantly, and start onboarding employees right away.',
        cta: 'Create Corporate Account',
      },
    }),
    [],
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    setLoading(true);
    try {
      if (mode === 'demo') {
        await corporateApi.requestDemo({
          companyName,
          workEmail,
          companySize,
          industry,
          country,
          contactName,
          phone,
        });
        setSuccess('Demo request submitted. Our enterprise team will contact you shortly.');
        return;
      }

      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }

      await corporateApi.createCorporateAccount({
        companyName,
        workEmail,
        password,
        companySize,
        industry,
        country,
        contactName,
      });

      await login(workEmail, password);
      navigate('/corporate/dashboard', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to process corporate onboarding request.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#D8ECE7_0,#F5F7F2_35%,#EEF4F1_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-[#D4E3DE] bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-[#20554D] hover:bg-white">
          <img src="/Untitled.png" alt="MANAS360" className="h-5 w-5 rounded-md object-cover" />
          MANAS360 Corporate Wellness
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
          <section className="rounded-3xl border border-[#D5E0DA] bg-white/85 p-6 shadow-[0_18px_50px_rgba(8,57,53,0.12)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B766E]">Enterprise Mental Wellness</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-[#173836] sm:text-4xl">
              Bring clinically guided mental health support to your organization
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[#335C58] sm:text-base">
              One platform for HR leaders, people managers, and employees. Strong privacy defaults, measurable outcomes,
              and phased rollout built for modern enterprises.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FeatureCard icon={<Users className="h-4 w-4" />} title="Employee Directory" subtitle="Bulk upload or invite employees in minutes." />
              <FeatureCard icon={<BriefcaseBusiness className="h-4 w-4" />} title="Session Allocation" subtitle="Department-level quota planning and utilization controls." />
              <FeatureCard icon={<Building2 className="h-4 w-4" />} title="Executive Analytics" subtitle="Participation, stress trend, and wellbeing outcomes." />
              <FeatureCard icon={<ShieldCheck className="h-4 w-4" />} title="Privacy by Design" subtitle="HR sees aggregate insights, not personal clinical records." />
            </div>

            <div className="mt-6 rounded-2xl border border-[#D5E4DF] bg-[#F3F8F6] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3D6E68]">How it works</p>
              <ol className="mt-2 space-y-1 text-sm text-[#315A56]">
                <li>1. Register company from this page.</li>
                <li>2. HR becomes a corporate member.</li>
                <li>3. Add employees via CSV or invite links.</li>
                <li>4. Employees log in through normal login flow.</li>
              </ol>
            </div>
          </section>

          <section className="rounded-3xl border border-[#D5E0DA] bg-white p-6 shadow-[0_18px_50px_rgba(8,57,53,0.1)] sm:p-8">
            <div className="inline-flex rounded-full bg-[#EFF6F3] p-1">
              <button
                type="button"
                onClick={() => setMode('demo')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  mode === 'demo' ? 'bg-white text-[#1B4F49] shadow-sm' : 'text-[#4F6E69]'
                }`}
              >
                Request Demo
              </button>
              <button
                type="button"
                onClick={() => setMode('create')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  mode === 'create' ? 'bg-white text-[#1B4F49] shadow-sm' : 'text-[#4F6E69]'
                }`}
              >
                Create Account
              </button>
            </div>

            <h2 className="mt-4 font-display text-2xl font-bold text-[#193D3A]">{modeCopy[mode].title}</h2>
            <p className="mt-1 text-sm text-[#446662]">{modeCopy[mode].subtitle}</p>

            <form className="mt-5 space-y-3" onSubmit={onSubmit}>
              <Field label="Company Name" icon={<Building2 className="h-4 w-4" />}>
                <input className={inputClassName} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </Field>

              <Field label="Work Email" icon={<Mail className="h-4 w-4" />}>
                <input className={inputClassName} type="email" value={workEmail} onChange={(e) => setWorkEmail(e.target.value)} required />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Company Size" icon={<Users className="h-4 w-4" />}>
                  <input className={inputClassName} value={companySize} onChange={(e) => setCompanySize(e.target.value)} placeholder="200" />
                </Field>
                <Field label="Industry" icon={<BriefcaseBusiness className="h-4 w-4" />}>
                  <input className={inputClassName} value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Country" icon={<Globe2 className="h-4 w-4" />}>
                  <input className={inputClassName} value={country} onChange={(e) => setCountry(e.target.value)} />
                </Field>
                <Field label="Contact Name" icon={<User2 className="h-4 w-4" />}>
                  <input className={inputClassName} value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </Field>
              </div>

              {mode === 'demo' ? (
                <Field label="Phone (optional)" icon={<User2 className="h-4 w-4" />}>
                  <input className={inputClassName} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
              ) : (
                <Field label="Create Password" icon={<ShieldCheck className="h-4 w-4" />}>
                  <input
                    className={inputClassName}
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                  />
                </Field>
              )}

              {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
              {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#1E6C61] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#18574F] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Processing...' : modeCopy[mode].cta}
              </button>

              <p className="text-xs text-[#5A7873]">
                Employees will continue to use the same normal login flow. Corporate access is enabled automatically by account mapping.
              </p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-[#456B66]">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function FeatureCard({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-[#DCE8E3] bg-[#F8FBFA] p-3">
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#214D47]">{icon}{title}</p>
      <p className="mt-1 text-xs text-[#4D716D]">{subtitle}</p>
    </div>
  );
}
