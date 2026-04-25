import { useState, useEffect, useCallback } from 'react';
import { 
  getGroupCategories, 
  createGroupCategory, 
  updateGroupCategory, 
  type GroupCategory 
} from '../../api/admin.api';
import { groupTherapyApi } from '../../api/groupTherapy';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function GroupManagement() {
  const [groups, setGroups] = useState<GroupCategory[]>([]);
  const [sessionQueue, setSessionQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [workingRequestId, setWorkingRequestId] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState<Partial<GroupCategory>>({
    name: '',
    type: 'therapy_group',
    max_capacity: 10,
    session_price: 1499,
    is_active: true
  });

  const fetchGroups = useCallback(async () => {
    try {
      const res = await getGroupCategories();
      // API returns ApiEnvelope { success: true, data: GroupCategory[] }
      setGroups(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load group categories');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessionQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await groupTherapyApi.listAdminQueue();
      setSessionQueue(Array.isArray(res.items) ? res.items : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load group therapy review queue');
      setSessionQueue([]);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchSessionQueue();
  }, [fetchGroups, fetchSessionQueue]);

  const handleCreateGroup = async () => {
    if (!newGroup.name || !newGroup.type) {
      toast.error('Please enter a group name and type');
      return;
    }
    
    setIsCreating(true);
    try {
      await createGroupCategory(newGroup);
      toast.success('Group category created successfully');
      setNewGroup({
        name: '',
        type: 'therapy_group',
        max_capacity: 10,
        session_price: 1499,
        is_active: true
      });
      fetchGroups();
    } catch (err) {
      toast.error('Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (group: GroupCategory) => {
    try {
      await updateGroupCategory(group.id, { is_active: !group.is_active });
      toast.success(`Group ${group.is_active ? 'deactivated' : 'activated'}`);
      fetchGroups();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleApprove = async (requestRow: any) => {
    const defaultPrice = Number(requestRow?.priceMinor || 0) > 0 ? Number(requestRow.priceMinor) : 49900;
    setWorkingRequestId(String(requestRow.id));
    try {
      await groupTherapyApi.reviewRequest(String(requestRow.id), {
        decision: 'approve',
        priceMinor: defaultPrice,
        title: String(requestRow?.title || 'Group Therapy Session').trim(),
        topic: String(requestRow?.topic || 'Group Support').trim(),
        scheduledAt: String(requestRow?.scheduledAt || new Date().toISOString()),
        durationMinutes: Number(requestRow?.durationMinutes || 60),
        maxMembers: Number(requestRow?.maxMembers || 10),
        allowGuestJoin: requestRow?.allowGuestJoin !== false,
        requiresPayment: requestRow?.requiresPayment !== false,
      });
      toast.success('Request approved. Publish to make it public online.');
      await fetchSessionQueue();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to approve request');
    } finally {
      setWorkingRequestId(null);
    }
  };

  const handleReject = async (requestRow: any) => {
    const rejectionReason = window.prompt('Enter rejection reason for provider:') || '';
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    setWorkingRequestId(String(requestRow.id));
    try {
      await groupTherapyApi.reviewRequest(String(requestRow.id), {
        decision: 'reject',
        rejectionReason: rejectionReason.trim(),
      });
      toast.success('Request rejected');
      await fetchSessionQueue();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to reject request');
    } finally {
      setWorkingRequestId(null);
    }
  };

  const handlePublish = async (requestRow: any) => {
    setWorkingRequestId(String(requestRow.id));
    try {
      await groupTherapyApi.publishRequest(String(requestRow.id));
      toast.success('Session published and now visible on landing/group pages');
      await fetchSessionQueue();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to publish request');
    } finally {
      setWorkingRequestId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 italic">Synchronizing Dynamic Groups...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dynamic Group Management</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Create and supervise unlimited dynamic clusters (Therapy, Corporate, ASHA, Support).</p>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="soft" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50">
             V1 API Live
           </Badge>
        </div>
      </div>

      {/* Quick Create Console */}
      <div className="bg-white rounded-[2rem] p-8 shadow-2xl shadow-gray-100 border border-gray-100 mb-10">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Group Configuration Lab</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
          <div className="lg:col-span-2">
             <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Group Name</label>
             <Input
                placeholder="e.g. Anxiety Support Circle (Delhi-NC)"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="rounded-xl border-gray-200 focus:ring-blue-500"
             />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Category Type</label>
            <select
              className="w-full h-[42px] border border-gray-200 rounded-xl px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={newGroup.type}
              onChange={(e) => setNewGroup({ ...newGroup, type: e.target.value })}
            >
              <option value="therapy_group">Therapy Group</option>
              <option value="corporate">Corporate Wellness</option>
              <option value="support">Support Group</option>
              <option value="asha">ASHA Batch</option>
              <option value="wellness_circle">Wellness Circle</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Capacity</label>
            <Input
              type="number"
              placeholder="10"
              value={newGroup.max_capacity}
              onChange={(e) => setNewGroup({ ...newGroup, max_capacity: parseInt(e.target.value) })}
              className="rounded-xl border-gray-200"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Price (₹)</label>
            <Input
              type="number"
              placeholder="1499"
              value={newGroup.session_price}
              onChange={(e) => setNewGroup({ ...newGroup, session_price: parseInt(e.target.value) })}
              className="rounded-xl border-gray-200"
            />
          </div>
        </div>
        <div className="mt-8 flex justify-end">
           <Button 
             onClick={handleCreateGroup} 
             disabled={isCreating}
             className="bg-gray-900 hover:bg-black text-white px-8 rounded-xl font-black uppercase tracking-widest text-xs h-12 shadow-xl shadow-gray-200"
           >
             {isCreating ? 'Deploying...' : 'Deploy Group Module'}
           </Button>
        </div>
      </div>

      <div className="mb-10 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-soft-sm">
        <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50/50 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-indigo-900">Group Therapy Session Governance</h3>
            <p className="text-xs font-medium text-indigo-700">Provider requests require admin approval and publish before going online.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchSessionQueue}>Refresh Queue</Button>
        </div>

        {queueLoading ? (
          <div className="p-6 text-sm text-gray-500">Loading governance queue...</div>
        ) : sessionQueue.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No pending/approved/published group therapy requests in queue.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3">Session</th>
                  <th className="px-6 py-3">Host Therapist</th>
                  <th className="px-6 py-3">Schedule</th>
                  <th className="px-6 py-3 text-center">Seats</th>
                  <th className="px-6 py-3 text-right">Price</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {sessionQueue.map((row) => {
                  const status = String(row?.status || '').toUpperCase();
                  const isWorking = workingRequestId === String(row?.id);
                  const hostName = [row?.hostTherapist?.firstName, row?.hostTherapist?.lastName].filter(Boolean).join(' ').trim() || 'Unassigned';

                  return (
                    <tr key={row.id} className="align-top">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{row.title}</p>
                        <p className="mt-1 text-xs text-gray-500">{row.topic || 'General support'}</p>
                        <p className="mt-1 text-[11px] text-gray-400">Mode: {String(row?.sessionMode || 'PUBLIC')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-700">{hostName}</p>
                        <p className="text-xs text-gray-500">{row?.hostTherapist?.email || '-'}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        <p>{new Date(String(row?.scheduledAt || '')).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{Number(row?.durationMinutes || 60)} mins</p>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-gray-700">{Number(row?.maxMembers || 0)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-700">₹{Math.round(Number(row?.priceMinor || 0) / 100)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                          status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' :
                          status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                          status === 'PUBLISHED' || status === 'LIVE' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {status || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-center gap-2">
                          {status === 'PENDING_APPROVAL' && (
                            <>
                              <Button size="sm" className="h-8 bg-blue-600 px-3 text-[10px] font-bold uppercase" disabled={isWorking} onClick={() => void handleApprove(row)}>Approve</Button>
                              <Button size="sm" variant="secondary" className="h-8 px-3 text-[10px] font-bold uppercase text-rose-600" disabled={isWorking} onClick={() => void handleReject(row)}>Reject</Button>
                            </>
                          )}
                          {status === 'APPROVED' && (
                            <Button size="sm" className="h-8 bg-emerald-600 px-3 text-[10px] font-bold uppercase" disabled={isWorking} onClick={() => void handlePublish(row)}>Publish</Button>
                          )}
                          {(status === 'PUBLISHED' || status === 'LIVE') && (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">Online</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Groups Inventory */}
      <div className="bg-white rounded-2xl shadow-soft-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
           <h3 className="font-bold text-gray-800 text-base uppercase tracking-wider">Operational Groups Inventory</h3>
           <Badge variant="secondary" className="text-[10px] font-black">{groups.length} Records Found</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                <th className="px-6 py-4">Group Name / ID</th>
                <th className="px-6 py-4">Context</th>
                <th className="px-6 py-4 text-center">Batch Size</th>
                <th className="px-6 py-4 text-right">Fee Rate</th>
                <th className="px-6 py-4 text-center">Protocol Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400 italic">
                    No group categories defined. Deploy your first cluster above.
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-base">{group.name}</span>
                        <span className="font-mono font-black text-gray-300 text-[10px]">UUID:{group.id.slice(-8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize">
                       <Badge variant="soft" className="text-[10px] font-black tracking-tight border border-gray-200 text-gray-600 bg-white">
                         {group.type.replace('_', ' ')}
                       </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex flex-col items-center">
                          <span className="font-black text-gray-900">{group.max_capacity}</span>
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter">Slots MAX</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex flex-col items-end">
                          <span className="font-black text-gray-900">₹{group.session_price}</span>
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter">Per Session</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <Badge 
                         variant={group.is_active ? 'soft' : 'secondary'}
                         className={`text-[10px] font-black uppercase tracking-wider px-2 ${
                           group.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'
                         }`}
                       >
                         {group.is_active ? 'Operational' : 'Decommissioned'}
                       </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleStatus(group)}
                          className={`text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-lg border-gray-100 ${
                             group.is_active ? 'text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'
                          }`}
                        >
                          {group.is_active ? 'Halt Service' : 'Resume Service'}
                        </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-12 text-center uppercase font-bold tracking-widest font-mono">
        Dynamic Group Provisioning • API: Admin.v1 • Platform Multi-tenancy Engine
      </p>
    </div>
  );
}
