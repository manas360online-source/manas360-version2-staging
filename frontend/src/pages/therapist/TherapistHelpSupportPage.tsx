import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function TherapistHelpSupportPage() {
  return (
    <TherapistPageShell title="Help & Support" subtitle="Find guidance, FAQs, and support channels.">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TherapistCard className="p-5">
          <h3 className="font-display text-base font-bold text-ink-800">Frequently Asked Questions</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>• How to reschedule sessions quickly?</li>
            <li>• How payout cycles are calculated?</li>
            <li>• How to assign home exercises?</li>
          </ul>
        </TherapistCard>

        <TherapistCard className="p-5">
          <h3 className="font-display text-base font-bold text-ink-800">Contact Support</h3>
          <p className="mt-2 text-sm text-ink-500">Need immediate assistance with platform operations?</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <TherapistButton className="w-full sm:w-auto">Email Support</TherapistButton>
            <TherapistButton variant="secondary" className="w-full sm:w-auto">Live Chat</TherapistButton>
          </div>
        </TherapistCard>
      </section>
    </TherapistPageShell>
  );
}
