import { useState, useEffect } from 'react';
import { api } from '../../api/admin.api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  FileText, 
  Search,
  Users,
  Calendar,
  Mail,
  Phone,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: 'pending';
  registeredAt: string;
  documentUrl?: string;
}

export default function UserApprovals() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v1/admin/user-approvals');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      setProcessingId(id);
      await api.patch(`/v1/admin/user-approvals/${id}`, { action, reason });
      
      toast.success(
        <div className="flex items-center gap-2">
          {action === 'approve' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
          <span>User successfully {action}ed</span>
        </div>
      );
      
      fetchPendingUsers();
      setSelectedUser(null);
    } catch (err) {
      toast.error('Action failed. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-slate-500 animate-pulse font-medium">Loading pending applications...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Approvals</h1>
          <p className="text-slate-500 mt-1">Review and manage onboarding applications for new platform users.</p>
        </div>
        <div className="flex gap-3">
          <Badge variant="secondary" className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 flex gap-2 items-center">
            <Users className="w-4 h-4" />
            {users.length} Pending
          </Badge>
        </div>
      </div>

      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-center">Role</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Registered</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-center">Verification</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence mode="popLayout">
                {users.map((user) => (
                  <motion.tr 
                    key={user.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold uppercase ring-2 ring-white">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{user.fullName}</div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail className="w-3 h-3" /> {user.email}
                            </span>
                            {user.phone && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Phone className="w-3 h-3" /> {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <Badge 
                        className={`capitalize font-medium shadow-sm ${
                          user.role === 'therapist' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(user.registeredAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {user.documentUrl ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                          className="h-8 gap-2 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Docs
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No docs uploaded</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          onClick={() => handleAction(user.id, 'approve')}
                          disabled={processingId === user.id}
                          className="bg-emerald-600 hover:bg-emerald-700 h-8 gap-1.5 px-4"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={processingId === user.id}
                          onClick={() => {
                            const reason = prompt('Enter rejection reason:');
                            if (reason) handleAction(user.id, 'reject', reason);
                          }}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 h-8 gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-slate-900">All Caught Up!</p>
                        <p className="text-slate-500">There are no pending approvals at the moment.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Document Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-slate-50 border-b flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
                {selectedUser.fullName.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedUser.fullName}</h2>
                <p className="text-sm text-slate-500">Verification documents provided during registration</p>
              </div>
            </div>
            <div className="flex-1 bg-slate-200/50 p-6 flex items-center justify-center overflow-auto">
              {selectedUser.documentUrl ? (
                <div className="w-full h-full bg-white rounded-xl shadow-inner border border-slate-300 overflow-hidden relative">
                  <iframe src={selectedUser.documentUrl} className="w-full h-full" title="User Documents" />
                  <div className="absolute top-4 right-4">
                    <a href={selectedUser.documentUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs font-medium hover:bg-white transition-colors"
                    >
                      Open in New Tab <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-xl shadow-sm text-center">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No preview available for this document.</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-white border-t flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setSelectedUser(null)}>Close Preview</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => handleAction(selectedUser!.id, 'approve')}>
                <UserCheck className="w-4 h-4" /> Approve Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
