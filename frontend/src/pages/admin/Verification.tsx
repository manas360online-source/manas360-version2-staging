import { useEffect, useState } from 'react';
import { 
  getAdminVerifications, 
  updateAdminVerification, 
  getAdminVerificationDocuments,
  type AdminUser,
  type AdminVerificationDocument
} from '../../api/admin.api';
import { getApiErrorMessage } from '../../api/auth';
import { CheckCircleIcon, XCircleIcon, DocumentMagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function AdminVerificationPage() {
  const [therapists, setTherapists] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal State
  const [selectedTherapist, setSelectedTherapist] = useState<AdminUser | null>(null);
  const [documents, setDocuments] = useState<AdminVerificationDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const loadVerifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAdminVerifications();
      setTherapists(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load verifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVerifications();
  }, []);

  const openDocuments = async (therapist: AdminUser) => {
    setSelectedTherapist(therapist);
    setDocsLoading(true);
    setDocuments([]);
    setShowRejectInput(false);
    setRejectReason('');
    try {
      const resp = await getAdminVerificationDocuments(therapist.id);
      setDocuments(resp.data);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setDocsLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedTherapist) return;
    if (action === 'reject' && !rejectReason) {
      setShowRejectInput(true);
      return;
    }

    setActionLoading(selectedTherapist.id);
    setError(null);
    setSuccess(null);

    try {
      await updateAdminVerification(selectedTherapist.id, action, action === 'reject' ? rejectReason : undefined);
      setSuccess(`Therapist ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setSelectedTherapist(null);
      await loadVerifications();
    } catch (err) {
      setError(getApiErrorMessage(err, `Action failed` ));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900 tracking-tight">Therapist Verification</h1>
          <p className="mt-2 text-sm text-ink-600">Review onboarding documents and manage therapist clinical credentials.</p>
        </div>
        <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-amber-800">{therapists.length} Pending Verifications</span>
        </div>
      </div>

      {error && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 rounded-xl border-l-4 border-emerald-500 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-3" />
            <p className="text-sm font-medium text-emerald-800">{success}</p>
          </div>
        </div>
      )}

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-ink-100 transition-all duration-300 hover:shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-widest">Therapist Details</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-widest">Joined On</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-ink-500 uppercase tracking-widest">Manage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-ink-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8 h-20 bg-ink-50/20" />
                  </tr>
                ))
              ) : therapists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <CheckCircleIcon className="h-12 w-12 text-ink-200 mb-3" />
                      <p className="text-lg font-medium text-ink-400">All caught up! No pending verifications.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                therapists.map((therapist) => (
                  <tr key={therapist.id} className="hover:bg-ink-50/30 transition-colors duration-150">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                          {therapist.firstName?.[0] || 'T'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-ink-900">{`${therapist.firstName} ${therapist.lastName}`}</div>
                          <div className="text-xs text-ink-500">ID: {therapist.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-ink-800 font-medium">{therapist.email}</div>
                      <div className="text-xs text-ink-500">{(therapist as any).phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                        PENDING REVIEW
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-ink-600 font-medium">
                      {formatDate(therapist.createdAt)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => openDocuments(therapist)}
                        className="inline-flex items-center px-4 py-2 border border-indigo-600 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-all duration-200 shadow-sm active:scale-95"
                      >
                        <DocumentMagnifyingGlassIcon className="h-4 w-4 mr-2" />
                        REVIEW DOCS
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal */}
      {selectedTherapist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-ink-900/40 backdrop-blur-md transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="px-8 py-6 border-b border-ink-100 flex justify-between items-center bg-ink-50/30">
              <div>
                <h3 className="text-2xl font-black text-ink-900 tracking-tight">Review Credentials</h3>
                <p className="text-sm font-medium text-ink-500 mt-1">{selectedTherapist.firstName} {selectedTherapist.lastName}</p>
              </div>
              <button onClick={() => setSelectedTherapist(null)} className="p-2 rounded-full hover:bg-ink-100 transition-colors">
                <XMarkIcon className="h-6 w-6 text-ink-400" />
              </button>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8">
              {docsLoading ? (
                <div className="flex flex-col items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mb-4" />
                  <p className="text-sm font-bold text-ink-500 uppercase tracking-widest">Fetching Encrypted Records...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-start">
                  <XCircleIcon className="h-6 w-6 text-amber-500 mr-4 mt-0.5" />
                  <div>
                    <p className="text-lg font-bold text-amber-900">No documents found!</p>
                    <p className="text-sm text-amber-800 mt-1">This provider hasn't uploaded any verification documents yet. You should reject and ask for resubmission.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <a 
                      key={doc.id} 
                      href={doc.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="group flex items-center p-5 bg-ink-50 rounded-2xl border border-ink-100 hover:border-indigo-400 hover:bg-white hover:shadow-lg transition-all duration-200"
                    >
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center border border-ink-100 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-colors shadow-sm">
                        <DocumentMagnifyingGlassIcon className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-black text-ink-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{doc.documentType.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mt-0.5">Click to preview (PDF)</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {showRejectInput && (
                <div className="animate-in slide-in-from-bottom-2 duration-200 p-6 bg-red-50 border border-red-200 rounded-2xl">
                  <label className="block text-sm font-black text-red-900 uppercase tracking-widest mb-2">Rejection Reason (Required)</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-red-200 focus:ring-2 focus:ring-red-500 outline-none text-ink-900 font-medium placeholder-red-300"
                    placeholder="e.g., Degree certificate is blurred. RCI license expired."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-t border-ink-100 bg-ink-50/50 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleAction('approve')}
                disabled={actionLoading === selectedTherapist.id || docsLoading}
                className="flex-1 inline-flex justify-center items-center px-6 py-4 bg-emerald-600 text-white text-sm font-black rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
              >
                {actionLoading === selectedTherapist.id ? 'PROCESSING...' : 'APPROVE & ACTIVATED'}
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={actionLoading === selectedTherapist.id || docsLoading}
                className="flex-1 inline-flex justify-center items-center px-6 py-4 bg-white border-2 border-red-200 text-red-600 text-sm font-black rounded-2xl hover:bg-red-50 hover:border-red-400 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
              >
                {showRejectInput ? 'CONFIRM REJECTION' : 'REJECT & REQUEST RESUBMISSION'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
