import { logger } from '../utils/logger';
import axios from 'axios';

const ZOHO_DESK_ORG_ID = process.env.ZOHO_DESK_ORG_ID || 'manas360';
const ZOHO_FLOW_WEBHOOK_URL = process.env.ZOHO_FLOW_WEBHOOK_URL || '';
const ZOHO_DESK_BASE_URL = process.env.ZOHO_DESK_BASE_URL || 'https://desk.zoho.in/api/v1';
const ZOHO_ACCOUNTS_URL = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in/oauth/v2/token';
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '';
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || '';

let accessTokenCache: { token: string; expiresAt: number } | null = null;

const hasZohoDeskCredentials = (): boolean =>
  Boolean(
    String(ZOHO_CLIENT_ID).trim()
    && String(ZOHO_CLIENT_SECRET).trim()
    && String(ZOHO_REFRESH_TOKEN).trim()
  );

const getZohoDeskAccessToken = async (): Promise<string> => {
  if (accessTokenCache && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }

  if (!hasZohoDeskCredentials()) {
    throw new Error('Zoho Desk credentials are not configured');
  }

  const payload = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });

  const resp = await axios.post(ZOHO_ACCOUNTS_URL, payload.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const token = String(resp.data?.access_token || '').trim();
  const expiresIn = Number(resp.data?.expires_in || 3600);
  if (!token) {
    throw new Error('Failed to refresh Zoho Desk access token');
  }

  accessTokenCache = {
    token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 30) * 1000,
  };

  return token;
};

const getSimulatedTickets = () => ({
  data: [
    {
      ticketNumber: '1001',
      subject: 'Therapist Onboarding: Dr. Smith',
      status: 'Open',
      priority: 'High',
      departmentId: 'Therapist Onboarding',
      customFields: { cf_blueprint_state: 'Document Verification' },
      assignee: { name: 'Admin User' },
      createdTime: new Date().toISOString(),
    },
    {
      ticketNumber: '1002',
      subject: 'Clinical Escalation: High Risk Alert',
      status: 'In Progress',
      priority: 'Urgent',
      departmentId: 'Clinical Services',
      customFields: { cf_blueprint_state: 'Psychiatrist Review' },
      assignee: { name: 'Lead Psychologist' },
      createdTime: new Date().toISOString(),
    },
  ],
});

export const zohoDesk = {
  /**
   * List tickets in Zoho Desk.
   */
  async listTickets(params: { department?: string; status?: string; priority?: string; limit?: number }) {
    logger.info('[ZohoDesk] Listing tickets', params);

    if (!hasZohoDeskCredentials()) {
      logger.warn('[ZohoDesk] Credentials missing. Returning simulated tickets.');
      return getSimulatedTickets();
    }

    try {
      const token = await getZohoDeskAccessToken();
      const qp: Record<string, string | number> = {
        limit: params.limit || 50,
      };
      if (params.department) qp.department = params.department;
      if (params.status) qp.status = params.status;
      if (params.priority) qp.priority = params.priority;

      const response = await axios.get(`${ZOHO_DESK_BASE_URL}/tickets`, {
        params: qp,
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          orgId: ZOHO_DESK_ORG_ID,
        },
      });

      return { data: Array.isArray(response.data?.data) ? response.data.data : [] };
    } catch (err: any) {
      logger.error('[ZohoDesk] listTickets failed. Returning simulated tickets.', {
        error: err?.message,
      });
      return getSimulatedTickets();
    }
  },

  /**
   * Update a ticket in Zoho Desk.
   */
  async updateTicket(ticketId: string, data: { status: string; comment?: string }) {
    logger.info(`[ZohoDesk] Updating ticket ${ticketId}`, data);

    if (!hasZohoDeskCredentials()) {
      logger.warn('[ZohoDesk] Credentials missing. updateTicket simulated.', { ticketId });
      return { success: true, ticketId, simulated: true };
    }

    const token = await getZohoDeskAccessToken();
    await axios.patch(
      `${ZOHO_DESK_BASE_URL}/tickets/${encodeURIComponent(ticketId)}`,
      { status: data.status },
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          orgId: ZOHO_DESK_ORG_ID,
        },
      }
    );

    if (data.comment) {
      await axios.post(
        `${ZOHO_DESK_BASE_URL}/tickets/${encodeURIComponent(ticketId)}/comments`,
        { content: data.comment, isPublic: false },
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            orgId: ZOHO_DESK_ORG_ID,
          },
        }
      );
    }

    return { success: true, ticketId };
  },

  /**
   * Add a comment to a ticket.
   */
  async addComment(ticketId: string, content: string, isPublic = false) {
    logger.info(`[ZohoDesk] Adding comment to ${ticketId}`, { content, isPublic });

    if (!hasZohoDeskCredentials()) {
      logger.warn('[ZohoDesk] Credentials missing. addComment simulated.', { ticketId });
      return { success: true, commentId: 'c123', simulated: true };
    }

    const token = await getZohoDeskAccessToken();
    const response = await axios.post(
      `${ZOHO_DESK_BASE_URL}/tickets/${encodeURIComponent(ticketId)}/comments`,
      { content, isPublic },
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          orgId: ZOHO_DESK_ORG_ID,
        },
      }
    );

    return { success: true, commentId: response.data?.id || response.data?.commentId || 'unknown' };
  },

  /**
   * Get overall blueprint status.
   */
  async getBlueprintStatus() {
    const tickets = await this.listTickets({ limit: 200 });
    const rows = Array.isArray(tickets.data) ? tickets.data : [];

    const normalized = rows.map((t: any) => {
      const subject = String(t.subject || '').toLowerCase();
      const state = String(t.customFields?.cf_blueprint_state || '').toLowerCase();
      const status = String(t.status || '').toLowerCase();
      return { subject, state, status };
    });

    const count = (predicate: (row: { subject: string; state: string; status: string }) => boolean): number =>
      normalized.filter(predicate).length;

    const isClosed = (status: string): boolean => ['closed', 'resolved', 'completed', 'paid'].some((s) => status.includes(s));

    const onboardingTotal = count((r) => r.subject.includes('onboarding') || r.state.includes('document'));
    const onboardingOpen = count((r) => (r.subject.includes('onboarding') || r.state.includes('document')) && !isClosed(r.status));

    const crisisTotal = count((r) => r.subject.includes('crisis') || r.state.includes('psychiatrist'));
    const crisisOpen = count((r) => (r.subject.includes('crisis') || r.state.includes('psychiatrist')) && !isClosed(r.status));

    const insuranceTotal = count((r) => r.subject.includes('insurance') || r.state.includes('claim'));
    const insuranceOpen = count((r) => (r.subject.includes('insurance') || r.state.includes('claim')) && !isClosed(r.status));

    return {
      onboarding: {
        pending: onboardingOpen,
        approved: Math.max(onboardingTotal - onboardingOpen, 0),
        rejected: 0,
      },
      crisis: {
        open: crisisOpen,
        resolved: Math.max(crisisTotal - crisisOpen, 0),
      },
      insurance: {
        in_review: insuranceOpen,
        paid: Math.max(insuranceTotal - insuranceOpen, 0),
      },
    };
  }
};

/**
 * Trigger a Zoho Flow via webhook.
 */
export const triggerZohoFlow = async (event: string, payload: any) => {
  if (!ZOHO_FLOW_WEBHOOK_URL) {
    logger.warn(`[ZohoFlow] Webhook URL not set. Skipping event: ${event}`);
    return;
  }
  
  try {
    // Flatten payload keys at top-level for easier Zoho Decision mapping,
    // while preserving the nested data object for backward compatibility.
    const safePayload = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : { value: payload };
    await axios.post(ZOHO_FLOW_WEBHOOK_URL, {
      event,
      timestamp: new Date().toISOString(),
      source: 'MANAS360',
      ...safePayload,
      data: safePayload,
    });
    logger.info(`[ZohoFlow] Event triggered: ${event}`);
  } catch (err: any) {
    logger.error(`[ZohoFlow] Trigger failed: ${event}`, { error: err.message });
  }
};
