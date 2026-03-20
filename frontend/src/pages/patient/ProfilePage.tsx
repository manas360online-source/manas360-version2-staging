import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { http } from '../../lib/http';
import { patientApi } from '../../api/patient';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showNameToProviders, setShowNameToProviders] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [moodStats, setMoodStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const me = await http.get('/v1/users/me');
        const p = me.data?.data ?? me.data;
        setProfile(p);

        const derivedName = (p.name || '').trim();
        if (derivedName) {
          const parts = derivedName.split(/\s+/);
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' '));
        } else {
          setFirstName(p.firstName || '');
          setLastName(p.lastName || '');
        }

        setShowNameToProviders(typeof p.showNameToProviders === 'boolean' ? p.showNameToProviders : true);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load settings. Please try again.');
      } finally {
        setLoading(false);
      }
    })();




    // load simple mood stats for quick account insights
    (async () => {
      try {
        const stats = await patientApi.getMoodStats();
        setMoodStats((stats as any)?.data ?? stats);
      } catch {
        // ignore
      }
    })();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim();
      const res = await http.patch('/v1/users/me', {
        name,
        showNameToProviders,
      });

      const updated = res.data?.data ?? res.data;
      setProfile(updated);
      setSuccess('Settings updated successfully.');
      toast.success('Profile updated successfully ✨');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="responsive-page"><div className="responsive-container">Loading settings...</div></div>;

  if (!profile) return <div className="responsive-page"><div className="responsive-container">Unable to load settings.</div></div>;

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">Settings</h1>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

      <div className="responsive-card section-stack">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Profile Information</h2>
        <div className="text-sm text-slate-600">Email: {profile.email || 'Not set'}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-slate-700">First Name</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-700">Last Name</span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
        </div>
      </div>

      <div className="responsive-card section-stack">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Privacy Controls</h2>
        <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-slate-50/60">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm sm:text-base font-medium text-slate-900">Show my name to therapists, psychiatrists, and coaches</p>
              <p className="text-xs sm:text-sm text-slate-600">
                Turn off to appear as Anonymous Patient to providers in session views.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNameToProviders((v) => !v)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${showNameToProviders ? 'bg-slate-900' : 'bg-slate-300'}`}
              aria-pressed={showNameToProviders}
              aria-label="Toggle name visibility for providers"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${showNameToProviders ? 'left-6' : 'left-1'}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="responsive-card section-stack">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Account</h2>
        <div className="text-sm text-slate-600">
          Keep your profile details and privacy preferences updated so your care team interactions stay aligned with your comfort level.
        </div>
      </div>

      {moodStats && (
        <div className="responsive-card section-stack">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">My Progress (Quick)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Average Mood (This Week)</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{moodStats.last7DaysAverage ?? (moodStats.averageMood ?? '—')}</p>
              <p className="mt-1 text-xs text-slate-600">Daily Check-in average</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Current Streak</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{moodStats.currentStreak ?? 0}</p>
              <p className="mt-1 text-xs text-slate-600">Consecutive check-in days</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Today's Wellness Score</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{Math.round(((moodStats.averageMood ?? 0) / 5) * 100)} / 100</p>
              <p className="mt-1 text-xs text-slate-600">Based on recent check-ins</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="responsive-action-btn rounded-xl bg-slate-900 text-white disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
      </div>
    </div>
  );
}
