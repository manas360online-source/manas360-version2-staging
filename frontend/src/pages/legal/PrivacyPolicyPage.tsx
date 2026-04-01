import { useEffect } from 'react';

export default function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <main className="min-h-screen bg-cream px-4 py-10 md:px-6 md:py-14">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-calm-sage/15 bg-white/95 p-6 shadow-soft-sm md:p-10">
        <h1 className="text-3xl font-semibold text-charcoal md:text-4xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-charcoal/65">Content intentionally left blank. Add Privacy content here.</p>
      </div>
    </main>
  );
}
