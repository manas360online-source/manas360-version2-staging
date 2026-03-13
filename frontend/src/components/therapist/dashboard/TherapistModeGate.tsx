import TherapistButton from './TherapistButton';
import TherapistCard from './TherapistCard';
import { useProviderDashboardContext, type ProviderDashboardMode } from '../../../context/ProviderDashboardContext';

type TherapistModeGateProps = {
  requiredMode: ProviderDashboardMode;
  title: string;
  description: string;
};

export default function TherapistModeGate({ requiredMode, title, description }: TherapistModeGateProps) {
  void useProviderDashboardContext;
  void requiredMode;

  return (
    <TherapistCard className="p-5">
      <h3 className="font-display text-base font-bold text-ink-800">{title}</h3>
      <p className="mt-2 text-sm text-ink-500">{description}</p>
      <div className="mt-4">
        <TherapistButton disabled>Mode switching disabled during provider UI consolidation</TherapistButton>
      </div>
    </TherapistCard>
  );
}
