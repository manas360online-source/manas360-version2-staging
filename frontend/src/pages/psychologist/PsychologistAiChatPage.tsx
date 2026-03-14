import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';

export default function PsychologistAiChatPage() {
  return (
    <TherapistPageShell title="AI Therapist" subtitle="Private AI chat for self reflection and support.">
      <TherapistCard className="p-4">
        <div className="h-48 rounded-lg border border-ink-100 bg-surface-bg p-3 text-sm text-ink-500">Start a conversation with Anytime Buddy...</div>
        <div className="mt-3 flex gap-2">
          <input className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm" placeholder="Type your message..." />
          <TherapistButton variant="primary">Send</TherapistButton>
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
