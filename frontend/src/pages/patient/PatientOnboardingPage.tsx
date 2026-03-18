import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/auth';
import { patientApi } from '../../api/patient';

export default function PatientOnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get('next') || '/patient/sessions';
  const [age, setAge] = useState('25');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>('prefer_not_to_say');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [carrier, setCarrier] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setError('Please enter a valid age between 1 and 120.');
      return;
    }

    setSaving(true);
    try {
      await patientApi.createProfile({
        age: parsedAge,
        gender,
        medicalHistory: medicalHistory.trim() || undefined,
        carrier: carrier.trim() || undefined,
      });
      navigate(next, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to complete onboarding.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="responsive-page">
      <div className="responsive-container py-6 sm:py-10">
        <div className="mx-auto w-full max-w-2xl rounded-3xl border border-calm-sage/20 bg-wellness-surface p-5 shadow-soft-md sm:p-8">
          <h1 className="text-2xl font-semibold text-wellness-text sm:text-3xl">Complete Patient Onboarding</h1>
          <p className="mt-2 text-sm text-wellness-muted sm:text-base">
            We need a few details to create your care profile before dashboard and sessions can load.
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm">Age</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-xl border border-calm-sage/25 px-3 py-2"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm">Gender</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other' | 'prefer_not_to_say')}
                  className="w-full rounded-xl border border-calm-sage/25 px-3 py-2"
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm">Medical history (optional)</span>
              <textarea
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                className="min-h-[90px] w-full rounded-xl border border-calm-sage/25 px-3 py-2"
                placeholder="Allergies, chronic conditions, medications..."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm">Carrier (optional)</span>
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full rounded-xl border border-calm-sage/25 px-3 py-2"
                placeholder="Airtel, Jio, VI..."
              />
            </label>

            {error && <p className="text-sm text-rose-700">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[42px] items-center rounded-xl bg-charcoal px-4 text-sm font-medium text-cream disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Complete Onboarding'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
