import type { SaveState } from '../../types/sessionPlayer';

const labelByState: Record<SaveState, string> = {
  idle: 'Ready',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
  offline: 'Offline',
};

const classByState: Record<SaveState, string> = {
  idle: 'bg-white text-charcoal/65 border-calm-sage/20',
  saving: 'bg-blue-50 text-blue-700 border-blue-200',
  saved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
  offline: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function SaveStatusPill({ state }: { state: SaveState }) {
  return (
    <p
      className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium ${classByState[state]}`}
      role="status"
      aria-live="polite"
    >
      {labelByState[state]}
    </p>
  );
}
