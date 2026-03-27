import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage, providerRegister } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

const clinicalCategories = [
  'Depression & Mood Disorders',
  'Anxiety Disorders',
  'ADHD & Neurodevelopmental',
  'Trauma & PTSD',
  'OCD & Behavioral Disorders',
  'Addiction & Substance Use',
  'Child & Adolescent Care',
  'Relationship & Family Therapy',
  'Sleep & Stress Disorders',
];

const LANGUAGES = [
  'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada',
  'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi',
];

const stepLabels = [
  'Identity',
  'Credentials',
  'Specialization',
  'Logistics',
  'Availability',
  'Pricing & Bio',
  'Review & Submit',
];

const shiftOptions = ['MORNING', 'EVENING', 'NIGHT'];

const REGISTRATION_TYPES = [
  { value: 'RCI', label: 'RCI (Rehabilitation Council of India)' },
  { value: 'NMC', label: 'NMC (National Medical Commission)' },
  { value: 'STATE_COUNCIL', label: 'State Medical Council' },
  { value: 'OTHER', label: 'Other / International' },
];

const QUALIFICATION_OPTIONS = [
  'M.Phil (Clinical Psychology)',
  'PhD (Psychology)',
  'MSc (Psychology)',
  'MA (Psychology)',
  'MBBS',
  'MD (Psychiatry)',
  'DPM (Diploma in Psychological Medicine)',
  'PG Diploma (Counselling)',
  'Other',
];

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

type FormState = {
  professionalType: string;
  fullName: string;
  displayName: string;
  gender: string;
  yearsOfExperience: number;
  registrationType: string;
  registrationNum: string;
  highestQual: string;
  email: string;
  education: string;
  licenseRci: string;
  licenseNmc: string;
  clinicalCategories: string[];
  specializations: string;
  selectedLanguages: string[];
  corporateReady: boolean;
  shiftPreferences: string[];
  maxSessionsPerDay: number;
  consultationFee: number;
  upiId: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  tagline: string;
  bio: string;
  ethicsAgreed: boolean;
  digitalSignature: string;
};

const initialForm: FormState = {
  professionalType: 'THERAPIST',
  fullName: '',
  displayName: '',
  gender: '',
  yearsOfExperience: 0,
  registrationType: 'RCI',
  registrationNum: '',
  highestQual: '',
  email: '',
  education: '',
  licenseRci: '',
  licenseNmc: '',
  clinicalCategories: [],
  specializations: '',
  selectedLanguages: ['English'],
  corporateReady: false,
  shiftPreferences: ['MORNING'],
  maxSessionsPerDay: 6,
  consultationFee: 0,
  upiId: '',
  accountName: '',
  accountNumber: '',
  ifsc: '',
  bankName: '',
  tagline: '',
  bio: '',
  ethicsAgreed: false,
  digitalSignature: '',
};

export default function ProviderOnboardingPageWrapper() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      const providerRoles = ['therapist', 'psychiatrist', 'psychologist', 'coach'];
      const role = String(user.role || '').toLowerCase();
      if (providerRoles.includes(role) && !user.platformAccessActive) {
        navigate('/provider/subscription', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  return <ProviderOnboardingPage />;
}
const ONBOARDING_CACHE_KEY = 'manas360_provider_onboarding_temp';

function ProviderOnboardingPage() {
  const navigate = useNavigate();
  const { user, checkAuth, logout } = useAuth();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(`${ONBOARDING_CACHE_KEY}_step`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => {
    const saved = localStorage.getItem(`${ONBOARDING_CACHE_KEY}_form`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse onboarding cache', e);
      }
    }
    return {
      ...initialForm,
      email: String(user?.email || ''),
      fullName: [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim(),
      displayName: [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim(),
    };
  });

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem(`${ONBOARDING_CACHE_KEY}_form`, JSON.stringify(form));
    localStorage.setItem(`${ONBOARDING_CACHE_KEY}_step`, step.toString());
  }, [form, step]);
  const certFileRef = useRef<HTMLInputElement>(null);
  const degreeFileRef = useRef<HTMLInputElement>(null);

  const onboardingStatus = String(user?.onboardingStatus || '').toUpperCase();
  const completion = useMemo(() => Math.round((step / 7) * 100), [step]);
  const bioWordCount = form.bio.trim() ? form.bio.trim().split(/\s+/).length : 0;

  const toggleClinicalCategory = (value: string) => {
    setForm((prev) => {
      if (prev.clinicalCategories.includes(value)) {
        return { ...prev, clinicalCategories: prev.clinicalCategories.filter((item) => item !== value) };
      }
      return { ...prev, clinicalCategories: [...prev.clinicalCategories, value] };
    });
  };

  const toggleLanguage = (value: string) => {
    setForm((prev) => {
      if (prev.selectedLanguages.includes(value)) {
        const filtered = prev.selectedLanguages.filter((l) => l !== value);
        return { ...prev, selectedLanguages: filtered.length ? filtered : ['English'] };
      }
      return { ...prev, selectedLanguages: [...prev.selectedLanguages, value] };
    });
  };

  const toggleShift = (value: string) => {
    setForm((prev) => {
      if (prev.shiftPreferences.includes(value)) {
        const filtered = prev.shiftPreferences.filter((item) => item !== value);
        return { ...prev, shiftPreferences: filtered.length ? filtered : ['MORNING'] };
      }
      return { ...prev, shiftPreferences: [...prev.shiftPreferences, value] };
    });
  };

  const canContinue = (): boolean => {
    if (step === 1) return Boolean(form.professionalType && form.fullName && form.gender && form.yearsOfExperience >= 0);
    if (step === 2) return Boolean(form.registrationType && form.registrationNum && form.highestQual && form.email);
    if (step === 3) return form.clinicalCategories.length > 0;
    if (step === 4) return form.selectedLanguages.length > 0;
    if (step === 5) return form.shiftPreferences.length > 0 && form.maxSessionsPerDay >= 1;
    if (step === 6) return Boolean(form.consultationFee >= 0 && form.accountName && form.accountNumber && form.ifsc && form.bankName && form.tagline && form.bio.trim());
    return Boolean(form.ethicsAgreed && form.digitalSignature.trim());
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await providerRegister({
        professionalType: form.professionalType,
        fullName: form.fullName,
        email: form.email,
        registrationNum: form.registrationNum,
        yearsOfExperience: Number(form.yearsOfExperience || 0),
        education: form.highestQual || form.education,
        licenseRci: form.licenseRci || undefined,
        licenseNmc: form.licenseNmc || undefined,
        clinicalCategories: form.clinicalCategories,
        specializations: form.specializations.split(',').map((item) => item.trim()).filter(Boolean),
        languages: form.selectedLanguages,
        corporateReady: Boolean(form.corporateReady),
        shiftPreferences: form.shiftPreferences,
        consultationFee: Number(form.consultationFee || 0),
        bankDetails: {
          accountName: form.accountName,
          accountNumber: form.accountNumber,
          ifsc: form.ifsc,
          bankName: form.bankName,
          upiId: form.upiId || undefined,
        },
        tagline: form.tagline,
        bio: form.bio,
        digitalSignature: form.digitalSignature,
      });

      localStorage.removeItem(`${ONBOARDING_CACHE_KEY}_form`);
      localStorage.removeItem(`${ONBOARDING_CACHE_KEY}_step`);
      await checkAuth();
      navigate('/onboarding/provider-setup', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to submit provider onboarding.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExitSetup = async () => {
    await logout();
    navigate('/auth/login', { replace: true });
  };

  if (onboardingStatus === 'PENDING') {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => void handleExitSetup()}
              className="rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 transition hover:bg-amber-100"
            >
              Exit setup
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Under Review</p>
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-amber-950">Your application is being reviewed</h1>
          <p className="mt-3 text-sm leading-6 text-amber-800">
            Thank you for completing your provider profile. Our clinical team is currently reviewing your credentials and documents. You will receive an email notification once your application is approved.
          </p>
          <div className="mt-6 space-y-2 rounded-xl border border-amber-200 bg-white p-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">What happens next</p>
            <ol className="mt-3 space-y-2 text-slate-600">
              <li className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">1</span>Our team verifies your registration number and uploaded certificates</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">2</span>We review your clinical experience and specializations</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">3</span>Once approved, your dashboard unlocks automatically on next login</li>
            </ol>
          </div>
          <p className="mt-5 text-xs text-amber-700">Typical review time: 1–2 business days</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      {/* Hidden file inputs for certificate uploads */}
      <input ref={certFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" aria-label="Upload certificate" />
      <input ref={degreeFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" aria-label="Upload degree" />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Provider Onboarding</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Complete your professional profile</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleExitSetup()}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
            >
              Exit setup
            </button>
            <p className="shrink-0 text-sm font-medium text-slate-500">Step {step} of 7</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-emerald-600 transition-all duration-300" style={{ width: `${completion}%` }} />
        </div>

        {/* Step labels */}
        <div className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-7">
          {stepLabels.map((label, index) => {
            const active = index + 1 === step;
            const completed = index + 1 < step;
            return (
              <div
                key={label}
                className={`rounded-lg border px-2 py-2 text-center text-xs font-medium ${active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : completed ? 'border-emerald-200 bg-emerald-50/50 text-emerald-600' : 'border-slate-200 text-slate-400'}`}
              >
                {completed ? '✓ ' : ''}{label}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="mt-8 space-y-4">

          {/* ── Step 1: Identity ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Step 1 · Identity</p>
                <p className="mt-1 text-sm text-slate-600">Tell us about yourself and your professional role.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Professional Type <span className="text-rose-500">*</span></span>
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    value={form.professionalType}
                    onChange={(e) => setForm((p) => ({ ...p, professionalType: e.target.value }))}
                  >
                    <option value="THERAPIST">Therapist</option>
                    <option value="PSYCHIATRIST">Psychiatrist</option>
                    <option value="PSYCHOLOGIST">Psychologist</option>
                    <option value="COACH">Wellness Coach</option>
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Gender <span className="text-rose-500">*</span></span>
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    value={form.gender}
                    onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                  >
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Full Name (legal) <span className="text-rose-500">*</span></span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="As it appears on your certificate"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Display Name</span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Name shown to patients (defaults to full name)"
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Years of Clinical Experience <span className="text-rose-500">*</span></span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  value={form.yearsOfExperience}
                  onChange={(e) => setForm((p) => ({ ...p, yearsOfExperience: Math.max(0, Number(e.target.value || 0)) }))}
                />
              </label>
            </div>
          )}

          {/* ── Step 2: Credentials ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Step 2 · Credentials</p>
                <p className="mt-1 text-sm text-slate-600">Your registration details and academic qualifications.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Registration Type <span className="text-rose-500">*</span></span>
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    value={form.registrationType}
                    onChange={(e) => setForm((p) => ({ ...p, registrationType: e.target.value }))}
                  >
                    {REGISTRATION_TYPES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Registration Number <span className="text-rose-500">*</span></span>
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. RCI/A/12345"
                    value={form.registrationNum}
                    onChange={(e) => setForm((p) => ({ ...p, registrationNum: e.target.value }))}
                  />
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Highest Qualification <span className="text-rose-500">*</span></span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  value={form.highestQual}
                  onChange={(e) => setForm((p) => ({ ...p, highestQual: e.target.value }))}
                >
                  <option value="">Select qualification</option>
                  {QUALIFICATION_OPTIONS.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Contact Email <span className="text-rose-500">*</span></span>
                <input
                  type="email"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">RCI License Number</span>
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="If applicable"
                    value={form.licenseRci}
                    onChange={(e) => setForm((p) => ({ ...p, licenseRci: e.target.value }))}
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">NMC License Number</span>
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="If applicable"
                    value={form.licenseNmc}
                    onChange={(e) => setForm((p) => ({ ...p, licenseNmc: e.target.value }))}
                  />
                </label>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">Upload Documents</p>
                <p className="text-xs text-slate-500">Upload copies of your registration certificate and degree. Accepted formats: PDF, JPG, PNG.</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => certFileRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Registration Certificate
                  </button>
                  <button
                    type="button"
                    onClick={() => degreeFileRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Degree Certificate
                  </button>
                </div>
                <p className="text-xs text-slate-400">Note: Document upload is optional during initial submission. You may provide them during the review phase.</p>
              </div>
            </div>
          )}

          {/* ── Step 3: Specialization ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Step 3 · Specialization</p>
                <p className="mt-1 text-sm text-slate-600">Select the disorder categories you actively work with. Select at least one.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {clinicalCategories.map((item) => {
                  const selected = form.clinicalCategories.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleClinicalCategory(item)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${selected ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      {selected && <span className="mr-1.5 text-emerald-600">✓</span>}
                      {item}
                    </button>
                  );
                })}
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Other Specializations</span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Comma-separated, e.g. Couples therapy, Grief counselling"
                  value={form.specializations}
                  onChange={(e) => setForm((p) => ({ ...p, specializations: e.target.value }))}
                />
              </label>

              <p className="text-xs text-slate-500">{form.clinicalCategories.length} categories selected</p>
            </div>
          )}

          {/* ── Step 4: Logistics ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Step 4 · Logistics</p>
                <p className="mt-1 text-sm text-slate-600">Languages you can conduct sessions in, and corporate availability.</p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Languages <span className="text-rose-500">*</span></p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const selected = form.selectedLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${selected ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">{form.selectedLanguages.join(', ') || 'None selected'}</p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={form.corporateReady}
                  onChange={(e) => setForm((p) => ({ ...p, corporateReady: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">Interest in Corporate Wellness Programs</p>
                  <p className="mt-0.5 text-xs text-slate-500">I am open to conducting group workshops and EAP sessions for corporate clients.</p>
                </div>
              </label>
            </div>
          )}

          {/* ── Step 5: Availability ── */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Step 5 · Availability</p>
                <p className="mt-1 text-sm text-slate-600">When are you available and how many sessions can you take per day?</p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Shift Preferences <span className="text-rose-500">*</span></p>
                <div className="flex flex-wrap gap-3">
                  {shiftOptions.map((shift) => {
                    const selected = form.shiftPreferences.includes(shift);
                    const icons: Record<string, string> = { MORNING: '🌅', EVENING: '🌆', NIGHT: '🌙' };
                    return (
                      <button
                        key={shift}
                        type="button"
                        onClick={() => toggleShift(shift)}
                        className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition ${selected ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span>{icons[shift]}</span>
                        {shift.charAt(0) + shift.slice(1).toLowerCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Max Sessions Per Day <span className="text-rose-500">*</span></span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={form.maxSessionsPerDay}
                    onChange={(e) => setForm((p) => ({ ...p, maxSessionsPerDay: Number(e.target.value) }))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600"
                  />
                  <span className="w-12 text-center text-lg font-bold text-emerald-700">{form.maxSessionsPerDay}</span>
                </div>
                <p className="text-xs text-slate-500">This helps us limit booking slots to protect your wellbeing.</p>
              </label>
            </div>
          )}

          {/* ── Step 6: Pricing & Bio ── */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Step 6 · Pricing & Bio</p>
                <p className="mt-1 text-sm text-slate-600">Set your session rate, payout details, and write your professional bio.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Individual Session Rate (INR) <span className="text-rose-500">*</span></span>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">₹</span>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-8 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
                      value={form.consultationFee}
                      onChange={(e) => setForm((p) => ({ ...p, consultationFee: Number(e.target.value || 0) }))}
                    />
                  </div>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">UPI ID for Payouts</span>
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="yourname@upi"
                    value={form.upiId}
                    onChange={(e) => setForm((p) => ({ ...p, upiId: e.target.value }))}
                  />
                </label>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">Bank Account Details <span className="text-rose-500">*</span></p>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" placeholder="Account holder name" value={form.accountName} onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))} />
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))} />
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" placeholder="IFSC code" value={form.ifsc} onChange={(e) => setForm((p) => ({ ...p, ifsc: e.target.value }))} />
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" placeholder="Bank name" value={form.bankName} onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))} />
                </div>
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Professional Tagline <span className="text-rose-500">*</span></span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Compassionate CBT therapist helping adults with anxiety"
                  value={form.tagline}
                  onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
                />
              </label>

              <label className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Professional Bio <span className="text-rose-500">*</span></span>
                  <span className={`text-xs font-medium ${bioWordCount > 500 ? 'text-rose-600' : 'text-slate-400'}`}>{bioWordCount} / 500 words</span>
                </div>
                <textarea
                  rows={8}
                  className={`rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${bioWordCount > 500 ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-emerald-500'}`}
                  placeholder="Describe your clinical background, therapeutic modalities you use, types of clients you work with, and your approach to sessions. (Up to 500 words)"
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                />
                {bioWordCount > 500 && <p className="text-xs text-rose-600">Bio exceeds 500 words. Please shorten it.</p>}
              </label>
            </div>
          )}

          {/* ── Step 7: Review & Submit ── */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Step 7 · Review & Submit</p>
                <p className="mt-1 text-sm text-slate-600">Review all your information before final submission.</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm">
                  <span className="font-medium text-slate-500">Name</span><span className="text-slate-800">{form.fullName || '—'}</span>
                  <span className="font-medium text-slate-500">Display Name</span><span className="text-slate-800">{form.displayName || form.fullName || '—'}</span>
                  <span className="font-medium text-slate-500">Gender</span><span className="text-slate-800">{form.gender || '—'}</span>
                  <span className="font-medium text-slate-500">Type</span><span className="text-slate-800">{form.professionalType}</span>
                  <span className="font-medium text-slate-500">Experience</span><span className="text-slate-800">{form.yearsOfExperience} years</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm">
                  <span className="font-medium text-slate-500">Registration</span><span className="text-slate-800">{form.registrationType} · {form.registrationNum || '—'}</span>
                  <span className="font-medium text-slate-500">Qualification</span><span className="text-slate-800">{form.highestQual || '—'}</span>
                  <span className="font-medium text-slate-500">Email</span><span className="text-slate-800">{form.email || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm">
                  <span className="font-medium text-slate-500">Categories</span><span className="text-slate-800">{form.clinicalCategories.length} selected</span>
                  <span className="font-medium text-slate-500">Languages</span><span className="text-slate-800">{form.selectedLanguages.join(', ') || '—'}</span>
                  <span className="font-medium text-slate-500">Corporate</span><span className="text-slate-800">{form.corporateReady ? 'Yes' : 'No'}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm">
                  <span className="font-medium text-slate-500">Shifts</span><span className="text-slate-800">{form.shiftPreferences.map((s) => s.charAt(0) + s.slice(1).toLowerCase()).join(', ')}</span>
                  <span className="font-medium text-slate-500">Max Sessions/Day</span><span className="text-slate-800">{form.maxSessionsPerDay}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm">
                  <span className="font-medium text-slate-500">Session Rate</span><span className="text-slate-800">₹{form.consultationFee}</span>
                  <span className="font-medium text-slate-500">UPI ID</span><span className="text-slate-800">{form.upiId || '—'}</span>
                  <span className="font-medium text-slate-500">Bank Account</span><span className="text-slate-800">{form.accountName ? `${form.bankName} · ${form.accountNumber.slice(-4).padStart(form.accountNumber.length, '·')}` : '—'}</span>
                </div>
                <div className="p-4 text-sm">
                  <span className="font-medium text-slate-500">Tagline</span>
                  <p className="mt-1 text-slate-800">{form.tagline || '—'}</p>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-900">Ethics & Professional Conduct Agreement</p>
                <p className="text-xs leading-5 text-amber-800">
                  By submitting this application, I confirm that: (1) all information provided is accurate and complete; (2) I hold the qualifications and registration stated; (3) I will conduct sessions in accordance with the ethical guidelines of my professional body; (4) I have read and agree to the MANAS360 Provider Code of Conduct.
                </p>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.ethicsAgreed}
                    onChange={(e) => setForm((p) => ({ ...p, ethicsAgreed: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-900">I agree to the Ethics & Professional Conduct Agreement</span>
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Digital Signature <span className="text-rose-500">*</span></span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Type your full legal name to sign"
                  value={form.digitalSignature}
                  onChange={(e) => setForm((p) => ({ ...p, digitalSignature: e.target.value }))}
                />
                <p className="text-xs text-slate-400">Your typed name constitutes your digital signature.</p>
              </label>
            </div>
          )}

          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || submitting}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>
          {step < 7 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(7, s + 1))}
              disabled={!canContinue() || submitting}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canContinue() || submitting || bioWordCount > 500}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
