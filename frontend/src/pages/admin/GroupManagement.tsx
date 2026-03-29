import { useState, useEffect, useCallback } from 'react';
import { 
  getGroupCategories, 
  createGroupCategory, 
  updateGroupCategory, 
  type GroupCategory 
} from '../../api/admin.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function GroupManagement() {
  const [groups, setGroups] = useState<GroupCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
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

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

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
