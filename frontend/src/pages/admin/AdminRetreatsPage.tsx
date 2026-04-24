import React, { useEffect, useState } from 'react';
import { listAdminRetreatIntents, updateAdminRetreatIntentStatus, RetreatIntentRecord } from '../../api/admin.api';

export default function AdminRetreatsPage() {
  const [intents, setIntents] = useState<RetreatIntentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchIntents();
  }, []);

  const fetchIntents = async () => {
    setLoading(true);
    try {
      const response = await listAdminRetreatIntents();
      setIntents(response.data.items);
      setError(null);
    } catch (err: any) {
      setError('Failed to load retreat requests.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await updateAdminRetreatIntentStatus(id, newStatus);
      setIntents(prev => prev.map(intent => intent.id === id ? { ...intent, status: newStatus } : intent));
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div className="p-8 text-ink-500">Loading retreat requests...</div>;
  if (error) return <div className="p-8 text-rose-500">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900">Retreat Requests</h1>
          <p className="text-sm text-ink-500 mt-1">Review and manage patient intents for wellness retreats.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-soft-sm border border-ink-100 overflow-hidden">
        {intents.length === 0 ? (
          <div className="p-8 text-center text-ink-500">No retreat requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-ink-50 text-ink-600 border-b border-ink-100 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4">Client Detail</th>
                  <th className="px-6 py-4">Theme & Logisitics</th>
                  <th className="px-6 py-4">Story</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {intents.map((intent) => (
                  <tr key={intent.id} className="hover:bg-ink-50/50 align-top">
                    <td className="px-6 py-4 text-ink-500">
                      {new Date(intent.createdAt).toLocaleDateString()}<br />
                      <span className="text-[10px]">{new Date(intent.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink-900">{intent.name}</div>
                      <div className="text-ink-500 text-xs mt-1">{intent.phone}</div>
                      {intent.email && <div className="text-ink-500 text-xs">{intent.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-1 bg-sage-50 text-sage-700 rounded text-[11px] font-semibold tracking-wide mb-2">
                        {intent.theme}
                      </span>
                      <div className="text-ink-500 text-xs space-y-1">
                        <div><span className="font-medium text-ink-700">Size:</span> {intent.groupSize || 'N/A'}</div>
                        <div><span className="font-medium text-ink-700">Dates:</span> {intent.preferredDates || 'N/A'}</div>
                        <div><span className="font-medium text-ink-700">Budget:</span> {intent.budgetRange || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-normal min-w-[250px] max-w-sm">
                      <p className="text-ink-600 text-xs italic line-clamp-4">
                        {intent.personalNote || <span className="text-ink-300">No story provided.</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                        intent.status === 'RECEIVED' ? 'bg-amber-100 text-amber-800' :
                        intent.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        intent.status === 'PLANNED' ? 'bg-sage-100 text-sage-800' :
                        'bg-ink-100 text-ink-800'
                      }`}>
                        {intent.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <select 
                          className="bg-white border border-ink-200 text-ink-700 text-xs rounded px-2 py-1"
                          value={intent.status}
                          disabled={updatingId === intent.id}
                          onChange={(e) => handleStatusChange(intent.id, e.target.value)}
                        >
                          <option value="RECEIVED">Mark Received</option>
                          <option value="IN_PROGRESS">Reviewing</option>
                          <option value="PLANNED">Planned</option>
                          <option value="CLOSED">Close</option>
                        </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
