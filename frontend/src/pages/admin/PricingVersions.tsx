import { useState, useEffect, useCallback } from 'react';
import { getPricingContracts, createPricingDraft, approvePricingContract, getAdminPricingConfig } from '../../api/admin.api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import toast from 'react-hot-toast';

export default function PricingVersions() {
  const [versions, setVersions] = useState<any[]>([]);
  const [pricingConfig, setPricingConfig] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVersions = useCallback(async () => {
    try {
      const [contractsRes, pricingRes] = await Promise.allSettled([
        getPricingContracts(),
        getAdminPricingConfig(),
      ]);

      if (contractsRes.status === 'fulfilled') {
        setVersions(contractsRes.value.data || []);
      }

      if (pricingRes.status === 'fulfilled') {
        setPricingConfig(pricingRes.value.data || null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pricing versions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const buildDraftTemplate = (category: string) => {
    const platformFee = Number(pricingConfig?.platformFee?.monthlyFee ?? 99);
    const sessionPricing = (pricingConfig?.sessionPricing || []).map((row: any) => ({
      providerType: row.providerType,
      durationMinutes: row.durationMinutes,
      price: row.price,
      providerShare: row.providerShare,
      platformShare: row.platformShare,
      active: row.active,
    }));
    const premiumBundles = (pricingConfig?.premiumBundles || []).map((row: any) => ({
      bundleName: row.bundleName,
      minutes: row.minutes,
      price: row.price,
      active: row.active,
    }));
    const platformPlans = (pricingConfig?.platformPlans || []).map((row: any) => ({
      planKey: row.planKey,
      planName: row.planName,
      price: row.price,
      billingCycle: row.billingCycle,
      active: row.active,
      description: row.description ?? null,
    }));

    return {
      category,
      platform_fee: platformFee,
      sessionPricing,
      premiumBundles,
      plans: platformPlans,
      pricing_scope: category,
    };
  };

  const createDraft = async (category: string) => {
    try {
      await createPricingDraft({
        category,
        pricingData: buildDraftTemplate(category),
        description: `New ${category} draft created from admin portal using current pricing snapshot`
      });
      toast.success(`Draft created for ${category}`);
      fetchVersions();
    } catch (err) {
      toast.error('Failed to create draft');
    }
  };

  const approveDraft = async (id: string) => {
    if (!confirm('Make this pricing version LIVE? This will archive the previous version.')) return;
    try {
      await approvePricingContract(id);
      toast.success('Pricing version approved and pushed LIVE');
      fetchVersions();
    } catch (err) {
      toast.error('Failed to approve pricing version');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 italic">Loading pricing versions...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Pricing Contracts & Versioning</h1>

      {/* Quick Draft Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {['patient', 'provider', 'corporate', 'sessions', 'addons'].map(cat => (
          <Card key={cat} className="p-4 text-center hover:shadow-soft-md transition-smooth border border-gray-100 bg-white">
            <p className="font-bold capitalize text-gray-700 text-sm tracking-widest">{cat}</p>
            <Button 
              onClick={() => createDraft(cat)} 
              variant="soft" 
              size="sm"
              className="mt-3 w-full text-[10px] font-black uppercase tracking-tighter"
            >
              Create New Draft
            </Button>
          </Card>
        ))}
      </div>

      {/* Version History Table */}
      <div className="bg-white rounded-2xl shadow-soft-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-bold uppercase text-gray-400 tracking-wider">Category</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase text-gray-400 tracking-wider">Version</th>
                <th className="px-6 py-4 text-center text-[11px] font-bold uppercase text-gray-400 tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase text-gray-400 tracking-wider">Effective From</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase text-gray-400 tracking-wider">Description</th>
                <th className="px-6 py-4 text-center text-[11px] font-bold uppercase text-gray-400 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {versions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No version history available.</td>
                </tr>
              ) : (
                versions.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-700 capitalize">{v.category}</td>
                    <td className="px-6 py-4 font-mono text-gray-500">v{v.version}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge 
                        variant={v.status === 'live' ? 'success' : v.status === 'draft' ? 'warning' : 'secondary'}
                        className="text-[10px] font-black uppercase tracking-wider px-2"
                      >
                        {v.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                      {v.effectiveFrom ? new Date(v.effectiveFrom).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 italic truncate max-w-[200px]" title={v.description}>
                      {v.description || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {v.status === 'draft' && (
                        <Button 
                          onClick={() => approveDraft(v.id)} 
                          size="sm"
                          className="text-[10px] font-black uppercase tracking-widest py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                        >
                          Approve & Go Live
                        </Button>
                      )}
                      {v.status === 'live' && (
                        <span className="text-[10px] font-black uppercase italic text-emerald-600 tracking-tighter">Current Live</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-8 text-center uppercase font-bold tracking-widest font-mono">
        Pricing Governance • Immutability Required • Audit Logs Live
      </p>
    </div>
  );
}
