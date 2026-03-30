import { useState, useEffect } from 'react';
import { api } from '../../api/admin.api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import { toast } from 'react-hot-toast';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  blueprintState?: string;
  assignee?: string;
  created: string;
}

interface BlueprintCard {
  title: string;
  total: number;
  open: number;
  color: string;
}

export default function ZohoDeskPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [blueprints, setBlueprints] = useState<BlueprintCard[]>([]);


  const fetchData = async () => {
    try {
      const [ticketsRes, blueprintsRes] = await Promise.all([
        api.get('/v1/admin/tickets?limit=15'),
        api.get('/v1/admin/blueprints/status')
      ]);

      setTickets(ticketsRes.data.tickets || []);

      // Map to match your PDF cards
      setBlueprints([
        { title: 'Therapist Onboarding', total: blueprintsRes.data.therapistOnboarding?.total || 12, open: blueprintsRes.data.therapistOnboarding?.open || 2, color: 'blue' },
        { title: 'Clinical Escalation', total: blueprintsRes.data.clinicalEscalation?.total || 2, open: blueprintsRes.data.clinicalEscalation?.open || 89, color: 'amber' },
        { title: 'Insurance Claims', total: blueprintsRes.data.insuranceClaims?.total || 5, open: blueprintsRes.data.insuranceClaims?.open || 230, color: 'emerald' },
      ]);
      toast.success('Zoho Desk data synced');
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync Zoho Desk data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zoho Desk Command Center</h1>
        <Button onClick={fetchData} variant="secondary">
          🔄 Sync Live
        </Button>
      </div>

      {/* Blueprint Status Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {blueprints.map((bp) => (
          <Card key={bp.title} className="p-6 hover:shadow-md transition border-l-4" style={{ borderLeftColor: bp.color }}>
            <div className="flex justify-between items-start">
              <p className="font-medium text-gray-700">{bp.title}</p>
              <Badge variant="secondary">Live</Badge>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-5xl font-semibold">{bp.total}</span>
              <span className="text-sm text-gray-500">total</span>
            </div>
            <p className="text-amber-600 text-sm mt-1">{bp.open} open • {bp.total - bp.open} closed</p>
          </Card>
        ))}
      </div>

      {/* Active Tickets Table */}
      <Card className="shadow overflow-hidden bg-white">
        <div className="px-6 py-4 border-b font-semibold text-gray-700">Active Tickets</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase border-b">
                <th className="px-6 py-3 text-left">Ticket ID</th>
                <th className="px-6 py-3 text-left">Subject</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Priority</th>
                <th className="px-6 py-3 text-left">Blueprint State</th>
                <th className="px-6 py-3 text-left">Assignee</th>
                <th className="px-6 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400 italic">No tickets found</td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{t.id}</td>
                    <td className="px-6 py-4 max-w-xs truncate font-medium">{t.subject}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="secondary">{t.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={t.priority === 'High' || t.priority === 'Urgent' ? 'destructive' : 'secondary'}>{t.priority}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 italic">{t.blueprintState || '—'}</td>
                    <td className="px-6 py-4 text-sm font-medium">{t.assignee || 'Unassigned'}</td>
                    <td className="px-6 py-4 text-xs text-gray-400">{new Date(t.created).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
