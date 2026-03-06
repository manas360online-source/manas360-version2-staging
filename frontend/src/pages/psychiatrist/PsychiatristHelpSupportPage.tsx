import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function PsychiatristHelpSupportPage() {
  return (
    <TherapistPageShell
      title="Help & Support"
      subtitle="Role-specific operational guidance for psychiatrist workflows."
    >
      <TherapistCard className="p-4">
        <h3 className="font-display text-lg font-semibold text-ink-800">Support</h3>
        <p className="mt-2 text-sm text-ink-600">
          For clinical workflow support, contact the MANAS360 operations team and include patient ID, prescription ID,
          and timestamp for faster resolution.
        </p>
      </TherapistCard>
    </TherapistPageShell>
  );
}
