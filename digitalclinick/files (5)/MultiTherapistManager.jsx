import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api/mdc';

export default function MultiTherapistManager({ clinicId }) {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [error, setError] = useState(null);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  };

  const fetchTherapists = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/therapists`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClinic(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTherapists(); }, [fetchTherapists]);

  const addTherapist = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/therapists`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ displayName: newName.trim(), specialization: newSpec.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewName('');
      setNewSpec('');
      await fetchTherapists();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const deactivateTherapist = async (therapistId, name) => {
    if (!confirm(`Deactivate ${name}? They will lose access to the clinic.`)) return;
    try {
      const res = await fetch(`${API_BASE}/therapists/${therapistId}`, { method: 'DELETE', headers });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await fetchTherapists();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">Loading therapist accounts...</div>;

  return (
    <div className="rounded-xl border-2 border-[#4A6741] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4A6741] to-[#3a5631] text-white px-5 py-3 flex items-center gap-2">
        <span className="text-xl">👥</span>
        <h4 className="font-bold text-sm font-['Outfit']">Multi-Therapist Accounts</h4>
        <span className="ml-auto bg-white/20 px-3 py-0.5 rounded-full text-[10px] font-semibold">
          Max {clinic?.maxTherapists || 5} therapists
        </span>
      </div>

      <div className="p-5">
        {/* Clinic ID */}
        <div className="bg-[#f4f8f2] rounded-xl p-4 mb-4">
          <div className="text-xs font-semibold text-gray-500 mb-1">Your Clinic ID</div>
          <div className="font-mono text-2xl font-bold text-[#4A6741] bg-white py-3 px-4 rounded-lg border-2 border-gray-200 text-center tracking-widest">
            {clinic?.clinicCode || 'MDC-XXXX'}
          </div>
          <div className="text-[10px] text-gray-400 text-center mt-1">
            Each therapist logs in with this clinic ID + their personal suffix
          </div>
        </div>

        {/* Therapist slots */}
        <div className="text-xs font-semibold text-gray-500 mb-2">
          Therapist Slots ({clinic?.slotsUsed || 0} of {clinic?.maxTherapists || 5} used)
        </div>

        <div className="space-y-2 mb-3">
          {clinic?.therapists?.map((t) => (
            <div key={t.id} className="grid grid-cols-[40px_1fr_120px_70px_32px] gap-2 items-center bg-white p-3 rounded-lg border border-gray-200">
              <div className="font-['Outfit'] font-bold text-[#4A6741] text-sm">#{t.slotNumber}</div>
              <div>
                <div className="text-xs font-semibold text-gray-800">{t.displayName}</div>
                {t.specialization && (
                  <div className="text-[10px] text-gray-400">{t.specialization}</div>
                )}
              </div>
              <div className="font-mono text-[11px] text-[#4A6741] bg-[#e8f0e5] py-1 px-2 rounded text-center">
                {t.loginSuffix}
              </div>
              <div className={`text-[10px] font-bold py-1 px-2 rounded text-center ${
                t.role === 'admin' ? 'bg-[#d1fae5] text-[#065f46]' :
                t.isActive ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {t.role === 'admin' ? 'Admin' : t.isActive ? 'Active' : 'Inactive'}
              </div>
              <div>
                {t.role !== 'admin' && t.isActive && (
                  <button onClick={() => deactivateTherapist(t.id, t.displayName)}
                    className="text-red-400 hover:text-red-600 text-sm" title="Deactivate">
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add therapist form */}
        {(clinic?.slotsRemaining || 0) > 0 ? (
          <div className="border-2 border-dashed border-[#4A6741] rounded-xl p-4 bg-[#f4f8f2]">
            <div className="text-xs font-semibold text-[#4A6741] mb-2">
              + Add Therapist ({clinic.slotsRemaining} slot{clinic.slotsRemaining > 1 ? 's' : ''} remaining)
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="text" placeholder="Therapist name *" value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-xs px-3 py-2 border border-gray-300 rounded-md focus:border-[#4A6741] outline-none"
              />
              <input
                type="text" placeholder="Specialization (optional)" value={newSpec}
                onChange={(e) => setNewSpec(e.target.value)}
                className="text-xs px-3 py-2 border border-gray-300 rounded-md focus:border-[#4A6741] outline-none"
              />
            </div>
            <button onClick={addTherapist} disabled={adding || !newName.trim()}
              className="bg-[#4A6741] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#3a5631] disabled:opacity-40 transition w-full">
              {adding ? '⏳ Adding...' : '+ Add Therapist'}
            </button>
          </div>
        ) : (
          <div className="text-center py-3 bg-gray-50 rounded-lg text-xs text-gray-400 font-medium">
            Maximum {clinic?.maxTherapists || 5} therapists reached
          </div>
        )}

        {/* How it works */}
        <div className="mt-4 p-3 bg-[#faf3e0] rounded-lg border-l-3 border-[#d4a853] text-[11px] text-gray-600">
          <strong className="text-gray-800">How it works:</strong> Each therapist gets their own login suffix
          (e.g., <code className="bg-white px-1 rounded">{clinic?.clinicCode || 'MDC-XXXX'}-02</code>). They see only
          their own patients and session notes. The Clinic Admin can view all therapists' dashboards
          but cannot edit their clinical notes.
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700 font-semibold">
            ❌ {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">dismiss</button>
          </div>
        )}
      </div>
    </div>
  );
}
