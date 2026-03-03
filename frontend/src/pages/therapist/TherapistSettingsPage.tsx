import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function TherapistSettingsPage() {
  return (
    <TherapistPageShell title="Settings" subtitle="Manage profile, availability slots, and bank payout details.">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TherapistCard className="p-5">
          <h3 className="font-display text-base font-bold text-ink-800">Profile</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-ink-500">
              First Name
              <input className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" defaultValue="Meera" />
            </label>
            <label className="text-sm text-ink-500">
              Last Name
              <input className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" defaultValue="Krishnan" />
            </label>
          </div>
          <label className="mt-3 block text-sm text-ink-500">
            Bio
            <textarea className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" rows={4} defaultValue="Clinical psychologist with 8+ years in CBT and anxiety care." />
          </label>
        </TherapistCard>

        <TherapistCard className="p-5">
          <h3 className="font-display text-base font-bold text-ink-800">Availability Slots</h3>
          <div className="mt-4 space-y-2">
            {['Mon · 09:00 - 13:00', 'Tue · 10:00 - 16:00', 'Thu · 09:00 - 14:00'].map((slot) => (
              <div key={slot} className="flex items-center justify-between rounded-lg border border-ink-100 bg-surface-bg px-3 py-2">
                <span className="text-sm text-ink-800">{slot}</span>
                <button className="text-xs font-medium text-sage-500 hover:underline">Edit</button>
              </div>
            ))}
          </div>
          <button className="mt-3 text-sm font-semibold text-sage-500 hover:underline">+ Add slot</button>
        </TherapistCard>
      </section>

      <TherapistCard className="p-5">
        <h3 className="font-display text-base font-bold text-ink-800">Bank Details</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-sm text-ink-500 sm:col-span-2">
            Account Holder Name
            <input className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" defaultValue="Dr. Meera Krishnan" />
          </label>
          <label className="text-sm text-ink-500">
            IFSC
            <input className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" defaultValue="HDFC0001234" />
          </label>
          <label className="text-sm text-ink-500 sm:col-span-2">
            Account Number
            <input className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" defaultValue="XXXXXX2387" />
          </label>
          <label className="text-sm text-ink-500">
            UPI ID
            <input className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" defaultValue="meera@bank" />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <TherapistButton>Save Settings</TherapistButton>
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
