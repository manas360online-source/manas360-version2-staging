import { Link } from 'react-router-dom';

export default function ProviderVerificationPendingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Verification Pending</p>
        <h1 className="mt-2 text-2xl font-semibold text-amber-950">Your provider profile is under review</h1>
        <p className="mt-3 text-sm text-amber-900">
          Onboarding is complete. An admin must verify your profile before dashboard access is enabled.
          You will be able to enter the provider workspace immediately after approval.
        </p>

        <div className="mt-5 rounded-lg border border-amber-300 bg-white p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">What happens next?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Credentials are checked by the admin team.</li>
            <li>Registration number and profile details are validated.</li>
            <li>Access is automatically unlocked once approved.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/auth/login" className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
            Go to Login
          </Link>
          <Link to="/" className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
