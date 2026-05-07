import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { groupTherapyApi } from '../../api/groupTherapy';

export default function GroupTherapySessionsPage() {
  const [publicSessions, setPublicSessions] = useState<any[]>([]);
  const [privateInvites, setPrivateInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sessions, invites] = await Promise.all([
        groupTherapyApi.listPublicSessions(),
        groupTherapyApi.listMyPrivateInvites(),
      ]);
      setPublicSessions(Array.isArray(sessions.items) ? sessions.items : []);
      setPrivateInvites(Array.isArray(invites.items) ? invites.items : []);
    } catch {
      setPublicSessions([]);
      setPrivateInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handlePublicJoin = async (sessionId: string) => {
    try {
      const result = await groupTherapyApi.createPublicJoinPaymentIntent(sessionId);
      if (!result.redirectUrl) throw new Error('Payment link not available');
      window.location.href = result.redirectUrl;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to start payment');
    }
  };

  const handleInviteAction = async (inviteId: string, action: 'accept' | 'decline') => {
    try {
      await groupTherapyApi.respondPrivateInvite(inviteId, action);
      toast.success(action === 'accept' ? 'Invite accepted. Complete payment to join.' : 'Invite declined.');
      void load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Action failed');
    }
  };

  const handlePrivatePayment = async (inviteId: string) => {
    try {
      const result = await groupTherapyApi.createPrivateInvitePaymentIntent(inviteId);
      if (!result.redirectUrl) throw new Error('Payment link not available');
      window.location.href = result.redirectUrl;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to start payment');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading group sessions...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <section className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Group Therapy Sessions</h1>
        <p className="text-sm text-slate-600 mt-1">Published sessions available for immediate paid join.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {publicSessions.length === 0 && (
            <div className="text-sm text-gray-500">No public sessions are currently published.</div>
          )}
          {publicSessions.map((row: any) => (
            <div key={row.id} className="rounded-xl border border-slate-200 p-4">
              <p className="font-bold text-slate-900">{row.title}</p>
              <p className="text-sm text-slate-600 mt-1">{row.topic}</p>
              <p className="text-xs text-slate-500 mt-2">{new Date(row.scheduledAt).toLocaleString()}</p>
              <p className="text-xs text-slate-500">Capacity: {row.joinedCount || 0}/{row.maxMembers}</p>
              <p className="text-sm font-semibold text-emerald-700 mt-2">Fee: ₹{Math.round(Number(row.priceMinor || 0) / 100)}</p>
              <button
                onClick={() => void handlePublicJoin(row.id)}
                className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                Pay & Join
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-bold text-slate-900">Private Invites</h2>
        <p className="text-sm text-slate-600 mt-1">Therapist-invited private sessions require acceptance and payment.</p>

        <div className="mt-4 space-y-3">
          {privateInvites.length === 0 && (
            <div className="text-sm text-gray-500">No private invites yet.</div>
          )}
          {privateInvites.map((invite: any) => (
            <div key={invite.id} className="rounded-xl border border-slate-200 p-4">
              <p className="font-bold text-slate-900">{invite.session?.title || 'Private Session Invite'}</p>
              <p className="text-xs text-slate-500 mt-1">From: {invite.invitedBy?.firstName} {invite.invitedBy?.lastName}</p>
              <p className="text-xs text-slate-500">Status: {invite.status}</p>
              <p className="text-sm font-semibold text-emerald-700 mt-2">Fee: ₹{Math.round(Number(invite.amountMinor || 0) / 100)}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {invite.status === 'INVITED' && (
                  <>
                    <button onClick={() => void handleInviteAction(invite.id, 'accept')} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold">Accept</button>
                    <button onClick={() => void handleInviteAction(invite.id, 'decline')} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold">Decline</button>
                  </>
                )}
                {(invite.status === 'PAYMENT_PENDING' || invite.status === 'ACCEPTED') && (
                  <button onClick={() => void handlePrivatePayment(invite.id)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Pay to Join</button>
                )}
                {invite.status === 'PAID' && (
                  <span className="text-xs font-semibold text-emerald-700">Payment completed. Join unlocked.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
