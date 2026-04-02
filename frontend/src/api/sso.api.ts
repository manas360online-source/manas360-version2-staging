import { http } from '../lib/http';

const unwrap = (payload: any) => (payload && payload.data ? payload.data : payload);

export const ssoApi = {
  getTenantForCompany: async () => {
    const resp = await http.get('/sso/tenant/me');
    return unwrap(resp.data);
  },
  updateTenant: async (tenantKey: string, payload: Record<string, any>) => {
    const resp = await http.patch(`/v1/sso/${tenantKey}`, payload);
    return unwrap(resp.data);
  },
  testTenant: async (tenantKey: string) => {
    const resp = await http.post(`/v1/sso/${tenantKey}/test`);
    return unwrap(resp.data);
  },
  inviteCompanyAdmin: async (tenantKey: string, email: string) => {
    const resp = await http.post(`/v1/sso/${tenantKey}/invite`, { email });
    return unwrap(resp.data);
  },
};

export default ssoApi;
