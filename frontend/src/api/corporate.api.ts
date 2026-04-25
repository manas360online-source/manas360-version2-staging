import { http } from '../lib/http';
import { getApiBaseUrl } from '../lib/runtimeEnv';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type CreateAdminContractPayload = {
  entity_id: string | null;
  contract_type: string;
  pricing_model: string;
  price_per_member_per_year: number | null;
  flat_annual_rate: number | null;
  max_members: number;
  contract_start_date: string;
  contract_end_date: string;
  payment_terms: string;
  discount_percent: number;
  signed_by_entity: string;
  signed_date: string;
};

const unwrap = <T>(payload: ApiEnvelope<T> | T): T => {
  const maybe = payload as ApiEnvelope<T>;
  if (maybe && typeof maybe === 'object' && 'data' in maybe) {
    return maybe.data as T;
  }
  return payload as T;
};

const isRouteNotFoundError = (error: any): boolean => {
  const status = Number(error?.response?.status || 0);
  const message = String(error?.response?.data?.message || '').toLowerCase();
  return status === 404 && message.includes('route not found');
};

const normalizePath = (value: string): string => String(value || '').replace(/^\/+/, '');

const joinBaseAndPath = (base: string, path: string): string => {
  const cleanBase = String(base || '').replace(/\/+$/, '');
  let cleanPath = normalizePath(path);
  const lowerBase = cleanBase.toLowerCase();

  if (lowerBase.endsWith('/api/v1') && cleanPath.toLowerCase().startsWith('api/v1/')) {
    cleanPath = cleanPath.slice(7);
  }
  if (lowerBase.endsWith('/api') && cleanPath.toLowerCase().startsWith('api/')) {
    cleanPath = cleanPath.slice(4);
  }
  if (lowerBase.endsWith('/v1') && cleanPath.toLowerCase().startsWith('v1/')) {
    cleanPath = cleanPath.slice(3);
  }

  return `${cleanBase}/${cleanPath}`;
};

const buildAgreementUrlCandidates = (v1Path: string, fallbackPath: string): string[] => {
  const base = String(getApiBaseUrl() || '/api').replace(/\/+$/, '');
  const baseCandidates = new Set<string>([base, '/api', '/api/v1']);
  if (typeof window !== 'undefined' && /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname)) {
    baseCandidates.add('http://localhost:5001/api');
    baseCandidates.add('http://localhost:3000/api');
  }
  const pathCandidates = new Set<string>([
    normalizePath(v1Path),
    normalizePath(fallbackPath),
  ]);

  if (/\/api\/v1$/i.test(base)) {
    baseCandidates.add(base.replace(/\/v1$/i, ''));
  } else if (/\/api$/i.test(base)) {
    baseCandidates.add(`${base}/v1`);
  } else {
    baseCandidates.add(`${base}/api`);
    baseCandidates.add(`${base}/api/v1`);
  }

  const urls = new Set<string>();
  for (const candidateBase of baseCandidates) {
    for (const candidatePath of pathCandidates) {
      urls.add(joinBaseAndPath(candidateBase, candidatePath));
    }
  }

  return Array.from(urls);
};

const toAbsoluteAgreementUrl = (path: string): string => {
  const base = String(getApiBaseUrl() || '/api').replace(/\/+$/, '');
  const cleanPath = String(path || '').replace(/^\/+/, '');
  return `${base}/${cleanPath}`;
};

const requestAgreementApi = async <T = unknown>(
  method: 'get' | 'post',
  v1Path: string,
  fallbackPath: string,
  payload?: unknown,
  params?: Record<string, unknown>,
): Promise<T> => {
  const candidates = [
    toAbsoluteAgreementUrl(v1Path),
    toAbsoluteAgreementUrl(fallbackPath),
    ...buildAgreementUrlCandidates(v1Path, fallbackPath),
  ];

  const tried = new Set<string>();
  let lastError: any;

  for (const url of candidates) {
    if (!url || tried.has(url)) continue;
    tried.add(url);

    try {
      const response = await http.request({ method, url, data: payload, params });
      return unwrap(response.data as ApiEnvelope<T> | T);
    } catch (error: any) {
      lastError = error;
      const status = Number(error?.response?.status || 0);
      if (status > 0 && status !== 404) {
        throw error;
      }
      if (status === 404 && !isRouteNotFoundError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
};

export type BulkEmployeeRow = {
  employeeId?: string;
  name: string;
  email: string;
  department: string;
  location?: string;
  manager?: string;
};

export type CorporateDemoRequestPayload = {
  companyName: string;
  companySize?: string;
  industry?: string;
  country?: string;
  contactName?: string;
  phone?: string;
  email?: string;
};

type CorporateDemoRequestApiPayload = {
  company_name: string;
  work_email: string;
  company_size: string;
  industry: string;
  country: string;
  contact_name: string;
  phone_number: string;
};

export type CorporateOtpRequestPayload = {
  companyName: string;
  phone: string;
  companySize?: string;
  industry?: string;
  country?: string;
  contactName?: string;
  email?: string;
};

export type CorporateCreateAccountPayload = {
  companyName: string;
  phone: string;
  otp: string;
  companySize?: string;
  industry?: string;
  country?: string;
  contactName?: string;
  email?: string;
};

export type CreateAgreementPayload = {
  template_id: number;
  agreement_type: string;
  partner_name: string;
  partner_type: 'school' | 'corporate' | 'insurance' | 'vendor' | string;
  partner_contact_name: string;
  partner_contact_email: string;
  partner_contact_phone: string;
  start_date: string;
  end_date?: string | null;
  annual_value?: number | null;
  payment_terms?: string | null;
  billing_cycle?: string | null;
  template_data: Record<string, unknown>;
};
export type AdminCreateAgreementPayload = {
  company_legal_name: string;
  signatory_email: string;
  signatory_phone: string;
  selected_tier: 'startup' | 'growth' | 'enterprise' | 'custom';
  employee_count: number;
};

export type AdminCreateAgreementResponse = {
  agreement_id: string;
  agreement_number: string;
  share_token: string;
  share_url: string;
};

export const corporateApi = {
  requestDemo: async (payload: CorporateDemoRequestPayload) => {
    const requestBody: CorporateDemoRequestApiPayload = {
      company_name: String(payload.companyName || '').trim(),
      work_email: String(payload.email || '').trim(),
      company_size: String(payload.companySize || '').trim(),
      industry: String(payload.industry || '').trim(),
      country: String(payload.country || '').trim(),
      contact_name: String(payload.contactName || '').trim(),
      phone_number: String(payload.phone || '').trim(),
    };

    const response = await fetch('/api/corporate/demo-request', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    let responsePayload: {
      success?: boolean;
      message?: string;
      data?: unknown;
      error?: { message?: string };
    } = {};

    try {
      responsePayload = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: unknown;
        error?: { message?: string };
      };
    } catch (parseError) {
      console.error('Corporate demo request: failed to parse response JSON', {
        status: response.status,
        statusText: response.statusText,
        parseError,
      });
    }

    if (!response.ok || responsePayload.success === false) {
      let message = 'Failed to submit demo request';
      if (responsePayload?.message) {
        message = responsePayload.message;
      } else if (responsePayload?.error?.message) {
        message = responsePayload.error.message;
      }

      console.error('Corporate demo request failed', {
        status: response.status,
        statusText: response.statusText,
        requestBody,
        responsePayload,
      });

      throw new Error(message);
    }

    return unwrap(responsePayload as ApiEnvelope<unknown> | unknown);
  },
  requestCorporateOtp: async (payload: CorporateOtpRequestPayload) => {
    const response = await http.post('/v1/corporate/public/request-otp', payload);
    return unwrap(response.data);
  },
  createCorporateAccount: async (payload: CorporateCreateAccountPayload) => {
    const response = await http.post('/v1/corporate/public/create-account', payload);
    return unwrap(response.data);
  },
  createAdminContract: async (payload: CreateAdminContractPayload) => {
    const response = await http.post('/v1/admin/contracts/create', payload);
    return unwrap(response.data);
  },
  createAgreement: async (payload: CreateAgreementPayload) => {
    return requestAgreementApi('post', '/v1/corporate/agreements', '/v1/agreements/create', payload);
  },
  getAgreements: async (params?: { status?: string; partner_type?: string; limit?: number; offset?: number }) => {
    const requestParams = {
      ...(params || {}),
      _ts: Date.now(),
    };
    try {
      const response = await http.get(toAbsoluteAgreementUrl('/v1/corporate/agreements'), {
        params: requestParams,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      return unwrap(response.data);
    } catch {
      return requestAgreementApi('get', '/v1/corporate/agreements', '/v1/agreements', undefined, requestParams);
    }
  },
  getAgreementTemplates: async (params?: { include_inactive?: boolean }) => {
    return requestAgreementApi('get', '/v1/corporate/agreement-templates', '/v1/agreements/templates', undefined, params || undefined);
  },
  sendForSignature: async (id: number | string) => {
    return requestAgreementApi('post', `/v1/corporate/agreements/${id}/send`, `/v1/agreements/${id}/send`);
  },
  checkStatus: async (id: number | string) => {
    return requestAgreementApi('get', `/v1/corporate/agreements/${id}/status`, `/v1/agreements/${id}/status`);
  },
  listCompanies: async () => {
    const response = await http.get('/v1/corporate/companies');
    return unwrap(response.data);
  },
  getDashboard: async (companyKey?: string) => {
    const response = await http.get('/v1/corporate/dashboard', { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  getEapQrAnalytics: async (companyKey?: string) => {
    const params = companyKey ? { companyKey } : undefined;
    try {
      const response = await http.get('/v1/corporate/qr/eap/analytics', { params });
      return unwrap(response.data);
    } catch (error: any) {
      if (Number(error?.response?.status || 0) !== 404) throw error;
      const fallback = await http.get('/v1/corporate/eap-qr/analytics', { params });
      return unwrap(fallback.data);
    }
  },
  createEapQr: async (payload: Record<string, unknown>, companyKey?: string) => {
    const params = companyKey ? { companyKey } : undefined;
    try {
      // Primary endpoint - /qr/eap/generate
      const response = await http.post('/v1/corporate/qr/eap/generate', payload, { params });
      return unwrap(response.data);
    } catch (error: any) {
      if (Number(error?.response?.status || 0) !== 404) throw error;
      try {
        // Fallback 1: legacy nested path
        const fallback1 = await http.post('/v1/corporate/qr/eap', payload, { params });
        return unwrap(fallback1.data);
      } catch (err: any) {
        if (Number(err?.response?.status || 0) !== 404) throw err;
        // Fallback 2: historical endpoints
        const fallback2 = await http.post('/v1/corporate/eap-qr', payload, { params });
        return unwrap(fallback2.data);
      }
    }
  },
  getPrograms: async (companyKey?: string) => {
    const response = await http.get('/v1/corporate/programs', { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  createProgram: async (payload: Record<string, unknown>, companyKey?: string) => {
    const response = await http.post('/v1/corporate/programs', payload, { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  getWorkshops: async (companyKey?: string) => {
    const response = await http.get('/v1/corporate/workshops', { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  createWorkshop: async (payload: Record<string, unknown>, companyKey?: string) => {
    const response = await http.post('/v1/corporate/workshops', payload, { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  getCampaigns: async (companyKey?: string) => {
    const response = await http.get('/v1/corporate/campaigns', { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  createCampaign: async (payload: Record<string, unknown>, companyKey?: string) => {
    const response = await http.post('/v1/corporate/campaigns', payload, { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  getReports: async (companyKey?: string) => {
    const response = await http.get('/v1/corporate/reports', { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  getEmployees: async (companyKey?: string, params?: { department?: string; query?: string; limit?: number; offset?: number }) => {
    const response = await http.get('/v1/corporate/employees', {
      params: {
        ...(companyKey ? { companyKey } : {}),
        ...(params || {}),
      },
    });
    return unwrap(response.data);
  },
  getInvoices: async (companyKey?: string) => {
    const response = await http.get('/v1/corporate/invoices', { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  getPaymentMethods: async (companyKey?: string) => {
    const response = await http.get('/v1/corporate/payment-methods', { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  createPaymentMethod: async (
    payload: { methodType?: string; label: string; details: string; isPrimary?: boolean },
    companyKey?: string,
  ) => {
    const response = await http.post('/v1/corporate/payment-methods', payload, { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  updatePaymentMethod: async (
    id: string,
    payload: { label?: string; details?: string; isPrimary?: boolean; isActive?: boolean },
    companyKey?: string,
  ) => {
    const response = await http.patch(`/v1/corporate/payment-methods/${id}`, payload, {
      params: companyKey ? { companyKey } : undefined,
    });
    return unwrap(response.data);
  },
  getSessionAllocation: async (companyKey?: string) => {
    const response = await http.get('/v1/corporate/session-allocation', { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  updateSessionAllocation: async (allocations: Array<{ department: string; allocatedSessions: number }>, companyKey?: string) => {
    const response = await http.patch('/v1/corporate/session-allocation', { allocations }, { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  getRoi: async (companyKey?: string) => {
    const response = await http.get('/v1/corporate/roi', { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  getSettings: async (companyKey?: string) => {
    const response = await http.get('/v1/corporate/settings', { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  updateSettings: async (payload: Record<string, unknown>, companyKey?: string) => {
    const response = await http.patch('/v1/corporate/settings', payload, { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  bulkUploadEmployees: async (rows: BulkEmployeeRow[], companyKey?: string) => {
    const response = await http.post('/v1/corporate/employees/bulk-upload', { rows }, { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
  },
  bulkUploadEmployeesFile: async (file: File, companyKey?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await http.post('/v1/corporate/employees/bulk-upload', formData, {
      params: companyKey ? { companyKey } : undefined,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrap(response.data);
  },
};

export const createAgreement = async (payload: AdminCreateAgreementPayload): Promise<AdminCreateAgreementResponse> => {
  try {
    const response = await http.post('/v1/admin/agreements', payload);
    return unwrap(response.data) as AdminCreateAgreementResponse;
  } catch (error: any) {
    const message =
      String(error?.response?.data?.message || error?.response?.data?.error?.message || error?.message || 'Failed to create agreement');
    const wrappedError = new Error(message);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
};

export const createCorporateAgreement = (data: CreateAgreementPayload) => corporateApi.createAgreement(data);
export const getAgreements = () => corporateApi.getAgreements();
export const getAgreementTemplates = () => corporateApi.getAgreementTemplates();
export const sendForSignature = (id: number | string) => corporateApi.sendForSignature(id);
export const checkStatus = (id: number | string) => corporateApi.checkStatus(id);
