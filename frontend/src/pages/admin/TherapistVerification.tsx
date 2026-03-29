import { useState, useEffect, useCallback } from 'react';
import { 
  getAdminVerifications, 
  getAdminVerificationDocuments, 
  updateAdminVerification, 
  type AdminUser, 
  type AdminVerificationDocument 
} from '../../api/admin.api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function TherapistVerification() {
  const [verifications, setVerifications] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<AdminVerificationDocument[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [selectedTherapistName, setSelectedTherapistName] = useState('');

  const fetchVerifications = useCallback(async () => {
    try {
      const res = await getAdminVerifications();
      // Only show PENDING verifications by default as per requirement
      const pending = (res.data || []).filter(u => u.onboardingStatus === 'PENDING');
      setVerifications(pending);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleViewDocs = async (user: AdminUser) => {
    setSelectedTherapistName(`${user.firstName} ${user.lastName}`);
    setIsModalOpen(true);
    setIsDocLoading(true);
    try {
      const res = await getAdminVerificationDocuments(user.id);
      setSelectedDocs(res.data || []);
    } catch (err) {
      toast.error('Failed to load documents');
      setIsModalOpen(false);
    } finally {
      setIsDocLoading(false);
    }
  };

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    let reason: string | undefined;
    if (action === 'reject') {
      reason = prompt('Enter rejection reason:') || undefined;
      if (!reason) return; // Cancelled
    }

    try {
      await updateAdminVerification(userId, action, reason);
      toast.success(`Therapist ${action === 'approve' ? 'approved' : 'rejected'}`);
      fetchVerifications();
    } catch (err) {
      toast.error('Action failed');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 italic">Synchronizing verification queue...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Therapist Verification</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Review and validate clinical credentials for platform onboarding.</p>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="soft" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50">
             Clinical Gatekeeper
           </Badge>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
           <h3 className="font-bold text-gray-800 text-base uppercase tracking-wider">Pending Credentials Queue</h3>
           <Badge variant="secondary" className="text-[10px] font-black">{verifications.length} Pending</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                <th className="px-6 py-4">Therapist Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Joined Portal</th>
                <th className="px-6 py-4 text-center">Credentials</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {verifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-emerald-600 font-bold italic">
                    <div className="flex flex-col items-center gap-2">
                       <span className="text-3xl">✅</span>
                       All caught up! No pending verifications.
                    </div>
                  </td>
                </tr>
              ) : (
                verifications.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{v.firstName} {v.lastName}</div>
                      <div className="font-mono font-black text-gray-300 text-[10px]">ID:{v.id.slice(-8).toUpperCase()}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{v.email}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="soft" className="text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 border-orange-100">
                        {v.onboardingStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewDocs(v)}
                        className="text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-lg border-gray-100 text-blue-600 hover:bg-blue-50"
                      >
                        Review Docs
                      </Button>
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <Button
                        onClick={() => handleAction(v.id, 'approve')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-lg shadow-md shadow-emerald-100"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleAction(v.id, 'reject')}
                        variant="soft"
                        className="text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
                      >
                        Reject
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credential Review Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`Reviewing: ${selectedTherapistName}`} 
        size="xl"
      >
        {isDocLoading ? (
          <div className="py-20 text-center text-gray-400 italic font-medium">Retrieving secure clinical documents...</div>
        ) : (
          <div className="space-y-8">
            {selectedDocs.length === 0 ? (
              <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">
                No documents found for this therapist.
              </div>
            ) : (
              selectedDocs.map((doc) => (
                <div key={doc.id} className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-b border-gray-100">
                    <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest">{doc.documentType.replace('_', ' ')}</span>
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                    >
                      Open in New Tab
                    </a>
                  </div>
                  <div className="h-[500px] bg-gray-100 flex items-center justify-center">
                    {/* iframe for PDF/Img. iframe is standard for this in the user requirement code */}
                    <iframe
                      src={doc.url}
                      className="w-full h-full border-0"
                      title={doc.documentType}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>

      <p className="text-[10px] text-gray-400 mt-12 text-center uppercase font-bold tracking-widest font-mono">
        Clinical Gatekeeper Protocol • API: Admin.v1 • HIPAA/DPDPA Compliance Node
      </p>
    </div>
  );
}
