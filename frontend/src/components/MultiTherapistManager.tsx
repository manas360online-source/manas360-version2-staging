import { useState, useEffect } from 'react';

interface Therapist {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  isActive: boolean;
}

interface MultiTherapistManagerProps {
  clinicId: string;
}

export default function MultiTherapistManager({ clinicId }: MultiTherapistManagerProps) {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTherapist, setNewTherapist] = useState({ name: '', email: '', specialty: '' });
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    loadTherapists();
  }, [clinicId]);

  const loadTherapists = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTherapists([
        { id: 'th1', name: 'Dr. Sarah Smith', email: 'sarah@clinic.com', specialty: 'CBT', isActive: true },
        { id: 'th2', name: 'Dr. John Doe', email: 'john@clinic.com', specialty: 'DBT', isActive: true },
      ]);
    } catch (error) {
      setMessage('Failed to load therapists');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTherapist = async () => {
    if (!newTherapist.name || !newTherapist.email) {
      setMessage('Name and email are required');
      return;
    }

    setIsLoading(true);
    try {
      // Mock add - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      const therapist: Therapist = {
        id: `th${Date.now()}`,
        name: newTherapist.name,
        email: newTherapist.email,
        specialty: newTherapist.specialty || undefined,
        isActive: true,
      };
      setTherapists([...therapists, therapist]);
      setNewTherapist({ name: '', email: '', specialty: '' });
      setMessage(`✓ Therapist ${newTherapist.name} added successfully`);
    } catch (error) {
      setMessage('Failed to add therapist');
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
          placeholder="Name"
          value={newTherapist.name}
          onChange={(e) => setNewTherapist({ ...newTherapist, name: e.target.value })}
          className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          disabled={isLoading}
        />
        <input
          type="email"
          placeholder="Email"
          value={newTherapist.email}
          onChange={(e) => setNewTherapist({ ...newTherapist, email: e.target.value })}
          className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          disabled={isLoading}
        />
        <input
          type="text"
          placeholder="Specialty (optional)"
          value={newTherapist.specialty}
          onChange={(e) => setNewTherapist({ ...newTherapist, specialty: e.target.value })}
          className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          disabled={isLoading}
        />
        <button
          onClick={handleAddTherapist}
          disabled={isLoading}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-400"
        >
          {isLoading ? 'Adding...' : 'Add Therapist'}
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
                  <p className="font-medium text-gray-900">{therapist.name}</p>
                  <p className="text-xs text-gray-600">{therapist.email}</p>
                  {therapist.specialty && (
                    <p className="text-xs text-gray-500">Specialty: {therapist.specialty}</p>
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
