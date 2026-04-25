import { useState, useEffect } from 'react';
import { getStaff, createStaff, deactivateStaff, Staff } from '../../api/mdc/staff.api';

interface ClinicTeamManagerProps {
  clinicId: string;
}

export default function ClinicTeamManager({ clinicId }: ClinicTeamManagerProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    role: 'therapist' as 'admin' | 'therapist',
    loginSuffix: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStaff();
  }, [clinicId]);

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const data = await getStaff(clinicId);
      setStaff(data);
    } catch (err) {
      setError('Failed to load clinic team');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await createStaff(clinicId, form);
      setForm({ fullName: '', phone: '', email: '', role: 'therapist', loginSuffix: '' });
      setShowAddForm(false);
      await loadStaff();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add team member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this member?')) return;
    try {
      await deactivateStaff(id);
      await loadStaff();
    } catch (err) {
      setError('Failed to deactivate member');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clinic Team</h2>
          <p className="text-sm text-slate-500">Manage your therapists and administrators</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add Team Member'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-100">
          {error}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddStaff} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name</label>
              <input
                required
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 outline-none focus:border-blue-500 transition-colors"
                placeholder="Dr. Rajesh Kumar"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Phone Number</label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 outline-none focus:border-blue-500 transition-colors"
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 outline-none focus:border-blue-500 transition-colors"
                placeholder="rajesh@clinic.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Login Suffix</label>
              <input
                required
                type="text"
                value={form.loginSuffix}
                onChange={(e) => setForm({ ...form, loginSuffix: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 outline-none focus:border-blue-500 transition-colors"
                placeholder="1 (Results in MDC-XXXX-1)"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</label>
              <div className="flex gap-4 pt-2">
                {['therapist', 'admin'].map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={form.role === r}
                      onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium capitalize text-slate-700 group-hover:text-blue-600 transition-colors">{r}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400 transition-all"
            >
              {isLoading ? 'Saving...' : 'Confirm & Add Member'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Name / Role</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Login Code</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading team members...</td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No team members added yet.</td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{member.fullName}</div>
                    <div className="text-xs text-blue-600 font-medium uppercase tracking-tight">{member.role}</div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                      {member.loginCode}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">{member.phone}</div>
                    <div className="text-xs text-slate-400">{member.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      member.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {member.isActive && member.loginSuffix !== 'ADMIN' && (
                      <button
                        onClick={() => handleDeactivate(member.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
