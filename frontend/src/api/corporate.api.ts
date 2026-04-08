import { http } from '../lib/http';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const unwrap = <T>(payload: ApiEnvelope<T> | T): T => {
  const maybe = payload as ApiEnvelope<T>;
  if (maybe && typeof maybe === 'object' && 'data' in maybe) {
    return maybe.data as T;
  }
  return payload as T;
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
  listCompanies: async () => {
    const response = await http.get('/v1/corporate/companies');
    return unwrap(response.data);
  },
  getDashboard: async (companyKey?: string) => {
    const response = await http.get('/v1/corporate/dashboard', { params: companyKey ? { companyKey } : undefined });
    return unwrap(response.data);
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
