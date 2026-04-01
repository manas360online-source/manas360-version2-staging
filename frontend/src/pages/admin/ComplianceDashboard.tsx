import { useState, useEffect } from 'react';
import { api } from '../../api/admin.api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function ComplianceDashboard() {
  const [compliance, setCompliance] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [acceptances, setAcceptances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [compRes, docsRes, accRes] = await Promise.all([
        api.get('/v1/admin/compliance/status'),
        api.get('/v1/admin/legal/documents'),
        api.get('/v1/admin/acceptances')
      ]);
      setCompliance(compRes.data);
      setDocuments(docsRes.data.documents || []);
      setAcceptances(accRes.data.acceptances || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load compliance dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading compliance dashboard...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Compliance Dashboard</h1>

      {/* Compliance Status Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <p className="text-sm text-gray-500">Overall Compliance</p>
          <p className="text-5xl font-semibold">{compliance?.compliance_percentage || 0}%</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500">Pending Documents</p>
          <p className="text-5xl font-semibold text-amber-600">{compliance?.pending || 0}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500">Critical Gaps</p>
          <p className="text-5xl font-semibold text-red-600">{compliance?.critical_gaps?.length || 0}</p>
        </Card>
      </div>

      {/* User Acceptance Checklist */}
      <Card className="shadow overflow-hidden mt-8 mb-8">
        <div className="px-6 py-4 border-b font-medium flex justify-between">
          <span>User Acceptance Checklist (English-only + Legal Terms)</span>
          <Badge>{acceptances.length} records</Badge>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b text-xs uppercase">
              <th className="px-6 py-4 text-left">User</th>
              <th className="px-6 py-4 text-left">Document</th>
              <th className="px-6 py-4 text-center">Accepted On</th>
              <th className="px-6 py-4 text-center">IP</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {acceptances.map((acc) => (
              <tr key={acc.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{acc.userName}</td>
                <td className="px-6 py-4">{acc.documentType}</td>
                <td className="px-6 py-4 text-sm text-gray-500 text-center">
                  {new Date(acc.acceptedAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-center">{acc.ip}</td>
                <td className="px-6 py-4 text-center">
                  <Badge variant="default">Accepted</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Legal Documents List */}
      <Card className="shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b font-medium flex items-center justify-between">
          <span>Legal Documents</span>
          <Button variant="secondary" size="sm" onClick={() => window.location.href = '/admin/compliance-documents'}>
            View All Legal Documents
          </Button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b text-xs uppercase">
              <th className="px-6 py-4 text-left">Title</th>
              <th className="px-6 py-4 text-left">Type</th>
              <th className="px-6 py-4 text-center">Version</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">{doc.title}</td>
                <td className="px-6 py-4 capitalize">{doc.document_type}</td>
                <td className="px-6 py-4 text-center">v{doc.current_version}</td>
                <td className="px-6 py-4 text-center">
                  <Badge variant="default">{doc.status}</Badge>
                </td>
                <td className="px-6 py-4 text-center">
                  <Button variant="secondary" size="sm" onClick={() => window.open(`/api/v1/legal/documents/${doc.id}`)}>
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-gray-400 text-center">
        English-only legal documents • All actions are audited
      </p>
    </div>
  );
}
