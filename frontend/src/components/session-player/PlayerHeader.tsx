import type { SessionPlayerProgress } from '../../types/sessionPlayer';

interface PlayerHeaderProps {
  title: string;
  progress: SessionPlayerProgress;
  offline: boolean;
}

export default function PlayerHeader({ title, progress, offline }: PlayerHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-calm-sage/15 bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-md px-4 py-3">
        <p className="font-serif text-lg font-light text-charcoal">{title}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-charcoal/60">
          <span>{progress.visitedCount}/{Math.max(1, progress.totalCount)} visited</span>
          <span>{progress.completionPercent}% complete</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-calm-sage/15" aria-hidden="true">
          <div
            className="h-full bg-calm-sage transition-[width] duration-100 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress.completionPercent))}%` }}
          />
        </div>
        {offline ? (
          <p className="mt-2 text-xs font-medium text-amber-700" role="status" aria-live="polite">
            Offline mode: answers are stored locally and will sync automatically.
          </p>
        ) : null}
      </div>
    </header>
  );
}
