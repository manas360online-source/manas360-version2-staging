import { Link } from 'react-router-dom';

export default function CBTPage() {
  return (
    <div className="mx-auto w-full max-w-[960px] space-y-4 pb-20 lg:pb-6">
      <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-6 shadow-soft-sm">
        <h1 className="text-2xl font-semibold text-charcoal md:text-3xl">CBT Section</h1>
        <p className="mt-2 text-sm text-charcoal/70">
          Select a completed session from My Care and open its Clinical Note to launch the CBT player.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/patient/sessions"
            className="inline-flex min-h-[40px] items-center rounded-full bg-charcoal px-4 text-sm font-medium text-cream"
          >
            Go to My Care
          </Link>
          <Link
            to="/patient/therapy-plan"
            className="inline-flex min-h-[40px] items-center rounded-full border border-calm-sage/25 px-4 text-sm font-medium text-charcoal/75"
          >
            View Therapy Plan
          </Link>
        </div>
      </section>
    </div>
  );
}
