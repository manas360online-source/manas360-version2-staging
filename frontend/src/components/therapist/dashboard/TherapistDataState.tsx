import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import TherapistButton from './TherapistButton';
import TherapistCard from './TherapistCard';

type StateProps = {
  title: string;
  description?: string;
};

type ErrorStateProps = StateProps & {
  onRetry?: () => void;
};

export function TherapistLoadingState({ title, description }: StateProps) {
  return (
    <TherapistCard className="p-8">
      <div className="flex flex-col items-center justify-center text-center">
        <Loader2 className="h-6 w-6 animate-spin text-sage-500" />
        <p className="mt-3 text-sm font-semibold text-ink-800">{title}</p>
        {description ? <p className="mt-1 text-xs text-ink-500">{description}</p> : null}
      </div>
    </TherapistCard>
  );
}

export function TherapistErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <TherapistCard className="p-8">
      <div className="flex flex-col items-center justify-center text-center">
        <AlertTriangle className="h-6 w-6 text-clay-500" />
        <p className="mt-3 text-sm font-semibold text-ink-800">{title}</p>
        {description ? <p className="mt-1 text-xs text-ink-500">{description}</p> : null}
        {onRetry ? (
          <TherapistButton onClick={onRetry} className="mt-4">
            Retry
          </TherapistButton>
        ) : null}
      </div>
    </TherapistCard>
  );
}

export function TherapistEmptyState({ title, description }: StateProps) {
  return (
    <TherapistCard className="p-8">
      <div className="flex flex-col items-center justify-center text-center">
        <Inbox className="h-6 w-6 text-ink-500" />
        <p className="mt-3 text-sm font-semibold text-ink-800">{title}</p>
        {description ? <p className="mt-1 text-xs text-ink-500">{description}</p> : null}
      </div>
    </TherapistCard>
  );
}
