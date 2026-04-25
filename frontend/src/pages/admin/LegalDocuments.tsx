import { useState, useEffect } from 'react';
import { api } from '../../api/admin.api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';

export default function LegalDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/v1/admin/legal/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load legal documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading legal documents...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Legal Documents &amp; Compliance</h1>

      <Card className="shadow overflow-hidden">
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
                <td className="px-6 py-4 font-medium">{doc.title}</td>
                <td className="px-6 py-4 capitalize">{doc.document_type}</td>
                <td className="px-6 py-4 text-center">v{doc.current_version}</td>
                <td className="px-6 py-4 text-center">
                  <Badge variant="default">{doc.status}</Badge>
                </td>
                <td className="px-6 py-4 text-center">
                  <Button variant="secondary" size="sm" onClick={() => window.open(`/api/v1/admin/legal/documents/${doc.id}/download`)}>
                    Download PDF
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-gray-400 mt-6 text-center">
        All legal documents are in English only • English version is legally binding
      </p>
    </div>
  );
}
