import { useNavigate } from 'react-router-dom';

const AGREEMENT_HISTORY = [
  { name: 'Privacy Policy', version: '1.2', status: 'ACTIVE', hash: '4b29-92c1-a83d-0' },
  { name: 'Terms of Service', version: '1.0', status: 'ACTIVE', hash: '4b29-92c1-a83d-1' },
  { name: 'NRI Jurisdiction Waiver', version: '1.0', status: 'ACTIVE', hash: '4b29-92c1-a83d-2' },
];

const LEGAL_RIGHTS = [
  {
    title: 'Right to Portability',
    description: 'Download your complete medical and personal history in machine-readable JSON format.',
    cta: 'DOWNLOAD JSON DATA',
    tone: 'neutral',
  },
  {
    title: 'Right to Correction',
    description: 'Update incorrect personal data or add supplementary information to your legal record.',
    cta: 'UPDATE PROFILE RECORD',
    tone: 'neutral',
    meta: 'CURRENT: DEMO PATIENT',
  },
  {
    title: 'Withdraw Consent',
    description: 'Manage specific permissions for marketing, research, or third-party data sharing.',
    cta: 'GRANULAR CONTROLS',
    tone: 'neutral',
    meta: '2 ACTIVE',
  },
  {
    title: 'Right to Erasure',
    description: 'Revoke all consent and initiate 30-day "Right to be Forgotten" protocol under Sec 12.',
    cta: 'INITIATE DATA ERASURE',
    tone: 'danger',
  },
];

export default function AdminDataPrivacyHubPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#e9eff8]">
      <header className="w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto w-full max-w-screen-xl px-6 py-4">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="inline-flex min-w-0 items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">M</div>
              <div className="min-w-0">
                <p className="truncate text-2xl font-bold leading-tight tracking-tight text-slate-900">MANAS360</p>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">PRIVACY SUITE</p>
              </div>
            </button>

            <div className="flex w-full flex-wrap items-center justify-start gap-3 sm:w-auto sm:justify-end">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Exit to Dashboard
              </button>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold tracking-wide text-emerald-700">
                + COMPLIANT
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1100px] px-6 py-8">
        <div>
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold tracking-wider text-blue-600 uppercase">
            DPDPA Right To Transparency
          </span>
          <h1 className="mt-3 text-[46px] leading-[1.08] font-bold tracking-tight text-slate-900">Your Data Privacy Hub</h1>
          <p className="mt-2 max-w-4xl text-[16px] leading-7 text-slate-600">
            Manage your binding agreements and exercise your rights under the Digital Personal Data Protection Act, 2023.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-6">
          <div className="col-span-2 rounded-2xl bg-[#2f73e0] p-8 text-white shadow-md">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">Authorized Legal Identity</p>
            <h2 className="mt-3 text-[42px] leading-[1.05] font-bold">Demo Patient</h2>
            <p className="mt-2 text-[18px] leading-tight text-blue-100">patient@example.com</p>
            <p className="mt-1 text-[16px] text-blue-100">+91 98765 43210</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-semibold">DPDPA Verified</span>
              <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-semibold">2 Consents Active</span>
              <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-semibold">Karnataka Jurisdiction</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0a1538] p-8 text-white shadow-md">
            <h3 className="text-[36px] leading-[1.05] font-bold text-teal-100">Legal Contact</h3>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-blue-300">Data Protection Officer</p>
            <p className="mt-1 text-[22px] font-semibold">Mahan S.</p>
            <p className="text-[16px] text-slate-300">Privacy Operations Lead</p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-blue-300">Inquiries</p>
            <p className="mt-1 text-[20px] font-semibold">privacy@manas360.com</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-[34px] leading-[1.1] font-bold text-slate-900">Binding Agreements History</h3>
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Agreement Name</span>
                <span>Version</span>
                <span>Status</span>
                <span>Verification</span>
              </div>
              {AGREEMENT_HISTORY.map((agreement) => (
                <div key={agreement.name} className="grid grid-cols-4 items-center border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-[24px] font-semibold leading-tight text-blue-700">{agreement.name}</p>
                    <p className="text-xs text-slate-500">HASH: {agreement.hash}</p>
                  </div>
                  <span className="text-[14px] text-slate-600">{agreement.version}</span>
                  <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">{agreement.status}</span>
                  <button className="w-fit text-sm font-bold text-blue-600 hover:text-blue-700">VIEW COPY</button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-700">Important Note</p>
            <p className="mt-3 text-sm leading-relaxed text-amber-800">
              Exercising the "Right to Erasure" will result in immediate termination of the platform license.
              Mandatory clinical records are retained for 7 years as per Indian Health Ministry guidelines and cannot be erased by request.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-[34px] leading-[1.1] font-bold text-slate-900">Exercise Your Legal Rights</h3>
          <div className="mt-6 grid grid-cols-2 gap-4">
            {LEGAL_RIGHTS.map((right) => (
              <div
                key={right.title}
                className={`rounded-xl border p-5 ${
                  right.tone === 'danger' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <p className={`text-[24px] leading-tight font-semibold ${right.tone === 'danger' ? 'text-red-700' : 'text-slate-900'}`}>
                  {right.title}
                </p>
                <p className={`mt-2 text-sm leading-6 ${right.tone === 'danger' ? 'text-red-700' : 'text-slate-600'}`}>
                  {right.description}
                </p>
                {right.meta && <p className="mt-3 text-xs font-bold uppercase tracking-wider text-blue-600">{right.meta}</p>}
                <button
                  className={`mt-4 rounded-full border px-4 py-2 text-sm font-bold ${
                    right.tone === 'danger'
                      ? 'border-red-200 text-red-700 hover:bg-red-100'
                      : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {right.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
