import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ssoApi from '../../api/sso.api';
import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';

type Tenant = {
  key?: string;
  provider?: string;
  issuer?: string;
  client_id?: string;
  client_secret?: string;
  metadata_url?: string;
  allowed_domains?: string[];
  enabled?: boolean;
  owner_company_key?: string;
};

export default function SSOSettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const data = await ssoApi.getTenantForCompany();
      setTenant(data);
    } catch (fetchError: any) {
      setError(fetchError?.response?.data?.message || 'Unable to load SSO settings');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!tenant?.key) return;
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await ssoApi.updateTenant(tenant.key, {
        clientId: tenant.client_id,
        clientSecret: tenant.client_secret,
        issuer: tenant.issuer,
        metadataUrl: tenant.metadata_url,
        allowedDomains: tenant.allowed_domains,
        enabled: tenant.enabled,
        owner_company_key: tenant.owner_company_key,
      });
      setStatus('SSO configuration saved successfully.');
      await load();
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || 'Unable to save SSO configuration');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!tenant?.key) return;
    setTesting(true);
    setError('');
    setStatus('');
    try {
      const result = await ssoApi.testTenant(tenant.key);
      setStatus(result?.ok ? 'SSO metadata validated successfully.' : `Validation failed: ${result?.error || 'Unknown error'}`);
    } catch (testError: any) {
      setError(testError?.response?.data?.message || 'Tenant test failed');
    } finally {
      setTesting(false);
    }
  };

  const invite = async () => {
    if (!tenant?.key || !inviteEmail.trim()) return;
    setPromoting(true);
    setError('');
    setStatus('');
    try {
      await ssoApi.inviteCompanyAdmin(tenant.key, inviteEmail.trim());
      setStatus('Invite processed. User promoted if they exist in this company.');
      setInviteEmail('');
    } catch (inviteError: any) {
      setError(inviteError?.response?.data?.message || 'Unable to invite/promote user');
    } finally {
      setPromoting(false);
    }
  };

  return (
    <CorporateShellLayout title="SSO Settings" subtitle="Configure enterprise identity provider and admin mapping.">
      {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      {status ? <div className="mb-4 rounded-xl border border-sage-200 bg-sage-50 p-3 text-sm text-sage-700">{status}</div> : null}

      {!tenant ? (
        <div className="rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-600">Loading SSO settings...</div>
      ) : (
        <>
          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-ink-800">Tenant Configuration</h2>
            <p className="mt-1 text-xs text-ink-500">Provider: {tenant.provider || 'N/A'} | Key: {tenant.key || 'N/A'}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">Issuer URL</label>
                <input
                  value={tenant.issuer || ''}
                  onChange={(event) => setTenant((prev) => ({ ...(prev || {}), issuer: event.target.value }))}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">Client ID</label>
                <input
                  value={tenant.client_id || ''}
                  onChange={(event) => setTenant((prev) => ({ ...(prev || {}), client_id: event.target.value }))}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">Client Secret</label>
                <input
                  type="password"
                  value={tenant.client_secret || ''}
                  onChange={(event) => setTenant((prev) => ({ ...(prev || {}), client_secret: event.target.value }))}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">Metadata URL</label>
                <input
                  value={tenant.metadata_url || ''}
                  onChange={(event) => setTenant((prev) => ({ ...(prev || {}), metadata_url: event.target.value }))}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">Allowed Domains</label>
                <input
                  value={(tenant.allowed_domains || []).join(', ')}
                  onChange={(event) =>
                    setTenant((prev) => ({
                      ...(prev || {}),
                      allowed_domains: event.target.value.split(',').map((domain) => domain.trim()).filter(Boolean),
                    }))
                  }
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={!!tenant.enabled}
                  onChange={(event) => setTenant((prev) => ({ ...(prev || {}), enabled: event.target.checked }))}
                  className="h-4 w-4 rounded border-ink-200"
                />
                Tenant enabled
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
              <button type="button" onClick={test} disabled={testing} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60">
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-ink-100 bg-white p-5">
            <h3 className="font-display text-base font-semibold text-ink-800">Invite / Promote Company Admin</h3>
            <p className="mt-1 text-xs text-ink-500">Promotes an existing company user to company admin for this tenant.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="user@company.com"
                className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={invite}
                disabled={!inviteEmail.trim() || promoting}
                className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60"
              >
                {promoting ? 'Processing...' : 'Promote Admin'}
              </button>
            </div>
            <div className="mt-3 text-xs text-ink-500">
              Need account details? <Link className="font-medium text-sage-700" to="/corporate/account/help">Open Help and Support</Link>
            </div>
          </section>
        </>
      )}
    </CorporateShellLayout>
  );
}
