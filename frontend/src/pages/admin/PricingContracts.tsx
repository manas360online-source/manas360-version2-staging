import { useEffect, useMemo, useState } from 'react';
import { 
  getPricingContracts, 
  createPricingDraft, 
  approvePricingContract,
  getAdminPricingConfig,
  type AdminPricingConfig,
  type PricingContract 
} from '../../api/admin.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Loader } from '../../components/ui/Loader';
import { Modal } from '../../components/ui/Modal';
import { 
  History, 
  FileText, 
  Clock, 
  Zap,
  ArrowRight,
  UserCheck,
  Calendar,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PricingContracts() {
  const [contracts, setContracts] = useState<PricingContract[]>([]);
  const [pricingConfig, setPricingConfig] = useState<AdminPricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<PricingContract | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const categoryCards = useMemo(() => [
    { key: 'patient', label: 'patient' },
    { key: 'provider', label: 'provider' },
    { key: 'corporate', label: 'corporate' },
    { key: 'sessions', label: 'sessions' },
    { key: 'addons', label: 'addons' },
  ], []);

  const fetchContracts = async () => {
    try {
      const [contractsRes, pricingRes] = await Promise.allSettled([
        getPricingContracts(),
        getAdminPricingConfig(),
      ]);

      if (contractsRes.status === 'fulfilled') {
        setContracts(contractsRes.value.data || []);
      }

      if (pricingRes.status === 'fulfilled') {
        setPricingConfig(pricingRes.value.data);
      }
    } catch (err) {
      toast.error('Failed to load pricing history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const buildDraftTemplate = (category: string) => {
    const platformFee = Number(pricingConfig?.platformFee?.monthlyFee ?? 99);
    const surchargePercent = Number(pricingConfig?.surchargePercent ?? 20);
    const sessionPricing = (pricingConfig?.sessionPricing || []).map((row) => ({
      providerType: row.providerType,
      durationMinutes: row.durationMinutes,
      price: row.price,
      providerShare: row.providerShare,
      platformShare: row.platformShare,
      active: row.active,
    }));
    const premiumBundles = (pricingConfig?.premiumBundles || []).map((row) => ({
      bundleName: row.bundleName,
      minutes: row.minutes,
      price: row.price,
      active: row.active,
    }));

    if (category === 'sessions') {
      return {
        category,
        platform_fee: platformFee,
        preferred_time_surcharge: surchargePercent,
        sessionPricing,
        pricing_scope: 'session_rates',
      };
    }

    if (category === 'addons') {
      return {
        category,
        platform_fee: platformFee,
        preferred_time_surcharge: surchargePercent,
        premiumBundles,
        pricing_scope: 'bundles',
      };
    }

    return {
      category,
      platform_fee: platformFee,
      preferred_time_surcharge: surchargePercent,
      sessionPricing,
      premiumBundles,
      pricing_scope: 'full_contract_snapshot',
    };
  };

  const handleCreateDraft = async (category: string) => {
    try {
      const live = contracts.find((c) => c.category === category && c.status === 'live');
      const pricingData = live?.pricingData ?? buildDraftTemplate(category);

      await createPricingDraft({
        category,
        description: live
          ? `New version based on v${live.version}`
          : `Initial draft created from the current admin pricing snapshot`,
        pricingData,
      });
      fetchContracts();
      toast.success(live ? `Draft v${live.version + 1} created` : `Draft created for ${category}`);
    } catch (err) {
      toast.error('Draft creation failed');
    }
  };

  const handleApprove = async () => {
    if (!selectedContract) return;
    try {
      await approvePricingContract(selectedContract.id);
      fetchContracts();
      setShowApproveModal(false);
      setSelectedContract(null);
      toast.success('Pricing is now LIVE!');
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader /></div>;

  const categories = categoryCards;

  const openDetails = (contract: PricingContract) => {
    setSelectedContract(contract);
    setShowDetailsModal(true);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Contracts & Versioning</h1>
          <p className="text-sm text-gray-500">Manage versioned pricing models with draft/live/archive lifecycle</p>
        </div>
      </div>

      {/* Grid for each category */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const live = contracts.find((c) => c.category === cat.key && c.status === 'live');
          const draft = contracts.find((c) => c.category === cat.key && c.status === 'draft');

          return (
            <Card key={cat.key} className="p-5 border-t-4 border-t-calm-sage">
              <div className="flex items-center justify-between mb-4">
                <h3 className="uppercase tracking-widest text-xs font-bold text-gray-400">{cat.label}</h3>
                <Settings className="h-4 w-4 text-gray-300" />
              </div>
              <div className="mb-6">
                <p className="text-2xl font-bold text-gray-800">v{live?.version || '0'}</p>
                <Badge variant={live ? 'success' : 'secondary'} size="sm" className="mt-1">
                  {live ? 'CURRENTLY LIVE' : 'NO LIVE VERSION'}
                </Badge>
              </div>

              <div className="space-y-2">
                {draft ? (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 mb-4 animate-pulse">
                    <p className="text-xs font-bold text-amber-700 uppercase mb-1">Draft v{draft.version} Pending</p>
                    <button 
                      onClick={() => { setSelectedContract(draft); setShowApproveModal(true); }}
                      className="text-xs text-amber-900 font-bold underline flex items-center gap-1"
                    >
                      <UserCheck className="h-3 w-3" /> Approve & Push Live
                    </button>
                  </div>
                ) : (
                  <Button variant="soft" fullWidth onClick={() => handleCreateDraft(cat.key)}>
                    Create New Draft
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Version History Table */}
      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-800">Version History</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[11px] font-bold uppercase text-gray-500 border-b border-gray-100">
                <th className="px-6 py-3">Version</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created At</th>
                <th className="px-6 py-3">Effective Since</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contracts.map(contract => (
                <tr key={contract.id} className="text-sm hover:bg-gray-50/30">
                  <td className="px-6 py-4 font-bold text-gray-700">v{contract.version}</td>
                  <td className="px-6 py-4 capitalize text-gray-600">{contract.category}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={contract.status} />
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(contract.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {contract.effectiveFrom ? (
                      <div className="flex items-center gap-1 text-emerald-600 font-medium">
                        <Calendar className="h-3 w-3" /> {new Date(contract.effectiveFrom).toLocaleDateString()}
                      </div>
                    ) : '---'}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => openDetails(contract)} 
                      className="text-calm-sage hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" /> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Contract Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedContract(null);
        }}
        title="Pricing Contract Details"
      >
        {selectedContract ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400">Category</p>
                <p className="mt-1 font-semibold text-gray-800 capitalize">{selectedContract.category}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400">Version</p>
                <p className="mt-1 font-semibold text-gray-800">v{selectedContract.version}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400">Status</p>
                <p className="mt-1 font-semibold text-gray-800 uppercase">{selectedContract.status}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400">Created At</p>
                <p className="mt-1 font-semibold text-gray-800">{new Date(selectedContract.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Description</p>
              <p className="text-sm text-gray-700">{selectedContract.description || '—'}</p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Pricing Data</p>
                <p className="text-[10px] uppercase text-gray-400">JSON snapshot</p>
              </div>
              <pre className="max-h-72 overflow-auto rounded-lg bg-gray-950 p-3 text-xs leading-5 text-gray-100">
{JSON.stringify(selectedContract.pricingData, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => {
                setShowDetailsModal(false);
                setSelectedContract(null);
              }}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Approval Modal */}
      <Modal 
        isOpen={showApproveModal} 
        onClose={() => setShowApproveModal(false)}
        title="Approve Pricing Contract"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl">
            <p className="text-sm font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 fill-rose-500 text-rose-500" /> Critical Action
            </p>
            <p className="text-xs mt-1">
              Approving <strong>v{selectedContract?.version}</strong> for <strong>{selectedContract?.category}</strong> will instantly 
              archive the current live version and push these prices to all public users. 
              This cannot be undone automatically.
            </p>
          </div>

          <div className="flex items-center gap-4 py-4 justify-center">
            <div className="text-center opacity-50">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Current Live</p>
              <Badge variant="soft">v{selectedContract ? Math.max(selectedContract.version - 1, 0) : 0}</Badge>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-300" />
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-rose-500 mb-1">New Version</p>
              <Badge variant="success">v{selectedContract?.version}</Badge>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="ghost" onClick={() => setShowApproveModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleApprove}>🚀 Push LIVE Now</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    live: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    draft: 'bg-amber-50 text-amber-700 border-amber-100',
    archived: 'bg-gray-50 text-gray-500 border-gray-100'
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles[status]}`}>{status.toUpperCase()}</span>;
}
