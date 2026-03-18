import { useState, useEffect } from 'react';
import { ShoppingCart, Filter } from 'lucide-react';
import { fetchProviderMarketplace, purchaseProviderLead } from '../../api/provider';
import toast from 'react-hot-toast';

interface MarketplaceLead {
  id: string;
  leadType: string;
  matchScore: number | null;
  basePrice: number;
  discount: number;
  finalPrice: number;
  createdAt: string;
}

const typeColors: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
  hot:  { bg: 'bg-red-50',   text: 'text-red-700',   label: 'Hot Lead',  emoji: '🔥' },
  warm: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Warm Lead', emoji: '🌟' },
  cold: { bg: 'bg-blue-50',  text: 'text-blue-700',  label: 'Cold Lead', emoji: '❄️'  },
};

export default function ProviderMarketplacePage() {
  const [leads, setLeads] = useState<MarketplaceLead[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchProviderMarketplace()
      .then((data) => setLeads(data || []))
      .catch((err: any) => {
        if (err?.response?.status === 403) {
          toast.error('Marketplace requires a paid subscription');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredLeads = filter === 'all' ? leads : leads.filter((l) => l.leadType === filter);

  const onPurchase = async (leadId: string) => {
    setPurchasing(leadId);
    try {
      const result: any = await purchaseProviderLead(leadId);
      const redirectUrl = result?.redirectUrl || result?.data?.redirectUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      toast.success('Lead purchased successfully!');
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <section className="bg-gradient-to-br from-teal-700 via-emerald-700 to-teal-900 px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold md:text-4xl">Lead Marketplace</h1>
          <p className="mt-2 text-teal-100 max-w-xl">
            Browse and purchase additional leads beyond your weekly allocation. First-come, first-served.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 mt-8">
        {/* Filters */}
        <div className="mb-6 flex items-center gap-3">
          <Filter className="h-4 w-4 text-slate-500" />
          {['all', 'hot', 'warm', 'cold'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                filter === type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type === 'all' ? 'All Leads' : typeColors[type]?.label || type}
            </button>
          ))}
          <span className="ml-auto text-sm text-slate-500">{filteredLeads.length} leads available</span>
        </div>

        {/* Lead Cards */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading marketplace...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No leads available right now. Check back soon!</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLeads.map((lead) => {
              const tc = typeColors[lead.leadType] || typeColors.cold;
              const hasDiscount = lead.discount > 0;
              return (
                <div key={lead.id} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                  {/* Type Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${tc.bg} ${tc.text}`}>
                      {tc.emoji} {tc.label}
                    </span>
                    {lead.matchScore != null && (
                      <span className="text-xs font-semibold text-slate-500">
                        Match: {lead.matchScore}%
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mt-4">
                    {hasDiscount && (
                      <p className="text-xs text-slate-400 line-through">₹{lead.basePrice}</p>
                    )}
                    <p className="text-2xl font-extrabold text-slate-900">₹{lead.finalPrice}</p>
                    {hasDiscount && (
                      <span className="inline-block mt-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {lead.discount}% OFF
                      </span>
                    )}
                  </div>

                  {/* Buy */}
                  <button
                    type="button"
                    onClick={() => void onPurchase(lead.id)}
                    disabled={purchasing === lead.id}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {purchasing === lead.id ? 'Purchasing...' : 'Buy Lead'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
