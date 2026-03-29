import { useState, useEffect, useCallback } from 'react';
import { getAdminPayouts, approveAdminPayout } from '../../api/admin.api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

export default function Payouts() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalSplit, setGlobalSplit] = useState(60); // 60% therapist
  const { socket } = useSocket();

  // Helper to format currency from minor units (strings/numbers)
  const formatCurrency = (minor: string | number | undefined) => {
    if (minor === undefined) return '₹0';
    const amount = Number(minor) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch pending payouts
  const fetchPayouts = useCallback(async () => {
    try {
      const res = await getAdminPayouts();
      // Backend returns { success: true, data: [...] }
      setPayouts(res.data || []);
      // If backend later supports dynamic global split, we can map it here.
      // For now, it defaults to 60 as per business logic in controllers.
      setGlobalSplit(60); 
    } catch (err) {
      console.error('Failed to load payouts', err);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  // Real-time update when a payout is processed
  useEffect(() => {
    if (!socket) return;

    const handlePayoutProcessed = () => {
      fetchPayouts(); // refresh list
    };

    socket.on('payout-processed', handlePayoutProcessed);

    return () => {
      socket.off('payout-processed', handlePayoutProcessed);
    };
  }, [socket, fetchPayouts]);

  const approvePayout = async (id: string) => {
    if (!confirm('Approve this payout and process via PhonePe?')) return;
    try {
      await approveAdminPayout(id);
      toast.success('Payout approved and processed');
      fetchPayouts();
    } catch (err) {
      console.error('Approval failed', err);
      toast.error('Failed to approve payout');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading payouts...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Payout & Commission Management</h1>

      {/* Global Split Card */}
      <div className="bg-white p-6 rounded-2xl shadow-soft-md border border-white/60 mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Global Commission Split</p>
          <p className="text-3xl font-semibold text-gray-800">
            {globalSplit}% Therapist / {100 - globalSplit}% Platform
          </p>
        </div>
        <div className="text-right">
          <Badge variant="success" size="sm" className="font-bold">✓ PhonePe Connected</Badge>
          <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">Gateway: Automated Pay-out</p>
        </div>
      </div>

      {/* Pending Payouts Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Pending Payout Requests</h2>
        <Badge variant="soft" className="text-[11px] px-2.5">{payouts.filter(p => p.status === 'REQUESTED').length} Requests Pending</Badge>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-2xl shadow-soft-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-bold uppercase text-gray-400 tracking-wider">Therapist</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase text-gray-400 tracking-wider">Gross Amount</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase text-gray-400 tracking-wider">Therapist Share</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase text-gray-400 tracking-wider">Platform Share</th>
                <th className="px-6 py-4 text-center text-[11px] font-bold uppercase text-gray-400 tracking-wider">Requested On</th>
                <th className="px-6 py-4 text-center text-[11px] font-bold uppercase text-gray-400 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                    No pending payout requests
                  </td>
                </tr>
              ) : (
                payouts.map((p: any) => {
                  const therapistName = p.provider?.provider
                    ? `${p.provider.provider.firstName} ${p.provider.provider.lastName}`
                    : 'Unknown Therapist';
                  
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{therapistName}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-medium">{p.provider?.provider?.email}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-700">{formatCurrency(p.amountMinor)}</td>
                      <td className="px-6 py-4 text-right text-green-600 font-black">{formatCurrency(p.therapistAmount || 0)}</td>
                      <td className="px-6 py-4 text-right text-amber-600 font-bold">{formatCurrency(p.platformAmount || 0)}</td>
                      <td className="px-6 py-4 text-center text-xs text-gray-500 font-medium">
                        {new Date(p.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.status === 'REQUESTED' ? (
                          <Button
                            onClick={() => approvePayout(p.id)}
                            size="sm"
                            className="text-[10px] font-black uppercase tracking-wider py-1.5 px-4 shadow-lg shadow-calm-sage/20"
                          >
                            Approve & Pay
                          </Button>
                        ) : (
                          <Badge variant={p.status === 'PAID' ? 'success' : 'secondary'} className="text-[10px] font-black uppercase italic">
                            {p.status}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-8 text-center uppercase font-bold tracking-widest">
        Integrated Automation • PhonePe Payouts • Zoho Flow WF-3.3 • Live Platform Ledger
      </p>
    </div>
  );
}
