interface StickySessionNavProps {
  canGoBack: boolean;
  canSkip: boolean;
  canProceed: boolean;
  busy?: boolean;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
}

export default function StickySessionNav({
  canGoBack,
  canSkip,
  canProceed,
  busy,
  onBack,
  onSkip,
  onNext,
}: StickySessionNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-calm-sage/20 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
      aria-label="Session navigation"
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || busy}
          className="min-h-12 rounded-xl border border-calm-sage/25 bg-white px-3 text-sm font-semibold text-charcoal/75 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={!canSkip || busy}
          className="min-h-12 rounded-xl border border-calm-sage/25 bg-white px-3 text-sm font-semibold text-charcoal/75 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed || busy}
          className="min-h-12 rounded-xl bg-charcoal px-3 text-sm font-semibold text-cream disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Next'}
        </button>
      </div>
    </nav>
  );
}
