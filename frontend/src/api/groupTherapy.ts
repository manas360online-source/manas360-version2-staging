import { http } from '../lib/http';
import { publicHttp } from './publicHttp';

export type GroupTherapySession = {
  id: string;
  title: string;
  topic: string;
  description?: string | null;
  sessionMode: 'PUBLIC' | 'PRIVATE';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'LIVE' | 'ENDED' | 'REJECTED';
  scheduledAt: string;
  durationMinutes: number;
  maxMembers: number;
  priceMinor: number;
  allowGuestJoin: boolean;
  requiresPayment: boolean;
  jitsiRoomName?: string | null;
  hostTherapistId: string;
  joinedCount?: number;
};

const unwrap = <T = any>(payload: any): T => {
  if (payload && typeof payload === 'object' && payload.data !== undefined) return unwrap<T>(payload.data);
  return payload as T;
};

export const groupTherapyApi = {
  listPublicSessions: async (): Promise<{ items: GroupTherapySession[] }> => {
    const res = await publicHttp.get('/v1/group-therapy/public/sessions');
    return unwrap<{ items: GroupTherapySession[] }>(res.data);
  },

  createRequest: async (payload: {
    title: string;
    topic: string;
    description?: string;
    sessionMode: 'PUBLIC' | 'PRIVATE';
    scheduledAt: string;
    durationMinutes: number;
    maxMembers: number;
    hostTherapistId?: string;
  }): Promise<GroupTherapySession> => {
    const res = await http.post('/group-therapy/requests', payload);
    return unwrap<GroupTherapySession>(res.data);
  },

  listMyRequests: async (): Promise<{ items: GroupTherapySession[] }> => {
    const res = await http.get('/group-therapy/requests/mine');
    return unwrap<{ items: GroupTherapySession[] }>(res.data);
  },

  listAdminQueue: async (): Promise<{ items: any[] }> => {
    const res = await http.get('/group-therapy/admin/requests');
    return unwrap<{ items: any[] }>(res.data);
  },

  reviewRequest: async (id: string, payload: {
    decision: 'approve' | 'reject';
    title?: string;
    topic?: string;
    scheduledAt?: string;
    durationMinutes?: number;
    maxMembers?: number;
    priceMinor?: number;
    allowGuestJoin?: boolean;
    requiresPayment?: boolean;
    rejectionReason?: string;
  }) => {
    const res = await http.patch(`/v1/group-therapy/admin/requests/${encodeURIComponent(id)}/review`, payload);
    return unwrap<any>(res.data);
  },

  publishRequest: async (id: string) => {
    const res = await http.patch(`/v1/group-therapy/admin/requests/${encodeURIComponent(id)}/publish`);
    return unwrap<any>(res.data);
  },

  createPublicJoinPaymentIntent: async (
    sessionId: string,
    payload?: { guestName?: string; guestEmail?: string },
  ) => {
    const res = await publicHttp.post(`/v1/group-therapy/public/sessions/${encodeURIComponent(sessionId)}/join/payment-intent`, payload || {});
    return unwrap<{ transactionId: string; redirectUrl: string; enrollmentId: string; amountMinor: number }>(res.data);
  },

  listProviderPatients: async (): Promise<{ items: Array<{ id: string; name: string; email?: string | null; phone?: string | null }> }> => {
    const res = await http.get('/group-therapy/private/patients');
    return unwrap<{ items: Array<{ id: string; name: string; email?: string | null; phone?: string | null }> }>(res.data);
  },

  createPrivateInvite: async (payload: {
    sessionId: string;
    patientUserId: string;
    amountMinor: number;
    message?: string;
    paymentDeadline?: string;
  }) => {
    const res = await http.post('/group-therapy/private/invites', payload);
    return unwrap<any>(res.data);
  },

  listMyPrivateInvites: async (): Promise<{ items: any[] }> => {
    const res = await http.get('/group-therapy/private/invites/mine');
    return unwrap<{ items: any[] }>(res.data);
  },

  respondPrivateInvite: async (inviteId: string, action: 'accept' | 'decline') => {
    const res = await http.patch(`/v1/group-therapy/private/invites/${encodeURIComponent(inviteId)}/respond`, { action });
    return unwrap<any>(res.data);
  },

  createPrivateInvitePaymentIntent: async (inviteId: string) => {
    const res = await http.post(`/v1/group-therapy/private/invites/${encodeURIComponent(inviteId)}/payment-intent`);
    return unwrap<{ transactionId: string; redirectUrl: string; amountMinor: number }>(res.data);
  },
};
