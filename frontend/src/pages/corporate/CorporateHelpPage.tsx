import { useEffect, useState } from 'react';
import { corporateApi } from '../../api/corporate.api';
import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';

type CorporateSupportSettings = {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  supportSla: string;
  privacyPolicy: string;
  ssoProvider: string;
};

export default function CorporateHelpPage() {
  const [settings, setSettings] = useState<CorporateSupportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await corporateApi.getSettings('techcorp-india')) as CorporateSupportSettings;
        setSettings(data);
      } catch (fetchError: any) {
        setError(fetchError?.response?.data?.message || 'Unable to load support details');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <CorporateShellLayout title="Help & Support" subtitle="Support channels for corporate members.">
      {loading ? <div className="text-sm text-ink-600">Loading support details...</div> : null}
      {error ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      {!loading && settings ? (
        <div className="space-y-3 rounded-xl border border-ink-100 bg-white p-5 text-sm text-ink-700">
          <p><strong>Company:</strong> {settings.companyName}</p>
          <p><strong>Email:</strong> {settings.supportEmail}</p>
          <p><strong>Phone:</strong> {settings.supportPhone}</p>
          <p><strong>SLA:</strong> {settings.supportSla}</p>
          <p><strong>SSO Provider:</strong> {settings.ssoProvider}</p>
          <p><strong>Privacy Note:</strong> {settings.privacyPolicy}</p>
        </div>
      ) : null}
    </CorporateShellLayout>
  );
}
