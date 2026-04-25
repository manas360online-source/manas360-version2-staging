import { useState, useEffect } from 'react';

interface MultiTherapistManagerProps {
  clinicId: string;
}

export default function MultiTherapistManager({ clinicId }: MultiTherapistManagerProps) {
  const [therapists, setTherapists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTherapist, setNewTherapist] = useState({ name: '', email: '', phone: '', specialty: '', loginSuffix: '' });
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    loadTherapists();
  }, [clinicId]);

  const loadTherapists = async () => {
    if (!clinicId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/mdc/clinics/${clinicId}/staff`);
      const data = await response.json();
      setTherapists(data);
    } catch (error) {
      setMessage('Failed to load therapists');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTherapist = async () => {
    if (!newTherapist.name || !newTherapist.phone || !newTherapist.loginSuffix) {
      setMessage('Name, Phone, and Login Suffix are required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/mdc/clinics/${clinicId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newTherapist.name,
          email: newTherapist.email,
          phone: newTherapist.phone,
          role: 'therapist',
          loginSuffix: newTherapist.loginSuffix,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTherapists([...therapists, data]);
        setNewTherapist({ name: '', email: '', phone: '', specialty: '', loginSuffix: '' });
        setMessage(`✓ Therapist ${newTherapist.name} added successfully. Login Code: ${data.loginCode}`);
      } else {
        throw new Error(data.message || 'Failed to add therapist');
      }
    } catch (error: any) {
      setMessage(`✗ ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTherapistStatus = async (therapistId: string) => {
    try {
      setTherapists(
        therapists.map((t) =>
          t.id === therapistId ? { ...t, isActive: !t.isActive } : t
        )
      );
    } catch (error) {
      setMessage('Failed to update therapist status');
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Multi-Therapist Manager</h2>

      <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4">
        <h3 className="font-medium text-gray-900">Add New Therapist</h3>
        <input
          type="text"
          placeholder="Full Name"
          value={newTherapist.name}
          onChange={(e) => setNewTherapist({ ...newTherapist, name: e.target.value })}
          className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          disabled={isLoading}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="tel"
            placeholder="Phone (+91...)"
            value={newTherapist.phone}
            onChange={(e) => setNewTherapist({ ...newTherapist, phone: e.target.value })}
            className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            disabled={isLoading}
          />
          <input
            type="text"
            placeholder="Login Suffix (e.g. 1)"
            value={newTherapist.loginSuffix}
            onChange={(e) => setNewTherapist({ ...newTherapist, loginSuffix: e.target.value.toUpperCase() })}
            className="block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
            disabled={isLoading}
          />
        </div>
        <input
          type="email"
          placeholder="Email (Optional)"
          value={newTherapist.email}
          onChange={(e) => setNewTherapist({ ...newTherapist, email: e.target.value })}
          className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          disabled={isLoading}
        />
        <button
          onClick={handleAddTherapist}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:bg-gray-400 transition-all active:scale-95"
        >
          {isLoading ? 'Processing...' : 'Authorize New Therapist'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 rounded-lg p-3 ${message.startsWith('✓') ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
          <p className="text-sm">{message}</p>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-medium text-gray-900">Therapists ({therapists.length})</h3>
        {therapists.length === 0 ? (
          <p className="text-sm text-gray-500">No therapists added yet</p>
        ) : (
          <div className="space-y-2">
            {therapists.map((therapist) => (
              <div
                key={therapist.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
              >
                <div>
                  <p className="font-bold text-slate-900">{therapist.fullName}</p>
                  <p className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">ID: {therapist.loginCode}</p>
                  <p className="text-xs text-slate-600 mt-1">{therapist.phone}</p>
                  {therapist.email && (
                    <p className="text-xs text-slate-500">{therapist.email}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleTherapistStatus(therapist.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    therapist.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {therapist.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-600">
        <p className="font-medium">Clinic ID: {clinicId}</p>
      </div>
    </div>
  );
}
