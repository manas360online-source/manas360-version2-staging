import { useState, useEffect } from 'react';
import { ShoppingCart, Filter, Lock, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchProviderMarketplace, fetchProviderLeadStats, purchaseProviderLead } from '../../api/provider';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface MarketplaceLead {
  id: string;
  leadType: string;
  matchScore: number | null;
  basePrice: number;
  discount: number;
  finalPrice: number;
  createdAt: string;
}

interface LeadStats {
  currentPlan: string;
  leadsPerWeek: number;
  leadsAssigned: number;
  leadsClaimed: number;
  leadsRemaining: number;
}

const typeColors: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
  hot:  { bg: 'bg-red-50',   text: 'text-red-700',   label: 'Hot Lead',  emoji: '🔥' },
  warm: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Warm Lead', emoji: '🌟' },
  cold: { bg: 'bg-blue-50',  text: 'text-blue-700',  label: 'Cold Lead', emoji: '❄️'  },
};

export default function ProviderMarketplacePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leads, setLeads] = useState<MarketplaceLead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const isPlatformActive = user?.platformAccessActive;
  const leadsRemaining = stats?.leadsRemaining ?? 0;
  const isQuotaExhausted = leadsRemaining === 0;
  const canPurchase = isPlatformActive && isQuotaExhausted;

  useEffect(() => {
    Promise.all([
      fetchProviderMarketplace(),
      fetchProviderLeadStats().catch(() => null)
    ])
      .then(([marketplaceData, statsData]) => {
        setLeads(marketplaceData || []);
        setStats(statsData);
      })
      .catch((err: any) => {
        if (err?.response?.status === 403) {
          toast.error('Access restricted');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredLeads = filter === 'all' ? leads : leads.filter((l) => l.leadType === filter);

  const onPurchase = async (leadId: string) => {
    if (!canPurchase) {
      toast.error('Please exhaust your weekly quota first');
      return;
    }
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
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Premium Header */}
      <section className="bg-slate-900 px-6 py-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-teal-400 uppercase">Growth Marketplace</span>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">Buy Additional Leads</h1>
              <p className="mt-4 text-slate-400 max-w-xl leading-relaxed">
                Scale your practice beyond your weekly plan constraints. First-come, first-served premium patient matches.
              </p>
            </div>
            
            {/* Status Pill */}
            {stats && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Your Weekly Quota</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                       <div 
                        className={`h-full ${isQuotaExhausted ? 'bg-amber-500' : 'bg-teal-500'}`}
                        style={{ width: `${Math.min(100, (stats.leadsAssigned / stats.leadsPerWeek) * 100)}%` }}
                       />
                    </div>
                    <span className="text-xs font-black text-white">{stats.leadsAssigned}/{stats.leadsPerWeek}</span>
                  </div>
                </div>
                {isQuotaExhausted ? (
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Info className="h-6 w-6" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 mt-10">
        
        {/* Requirement Banner */}
        {!canPurchase && isPlatformActive && (
          <div className="mb-10 p-6 rounded-3xl bg-amber-50 border border-amber-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm shadow-amber-200/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900 leading-tight">Weekly Quota Detected</h3>
                <p className="text-sm text-amber-700 font-medium mt-0.5">
                  Finish your {leadsRemaining} remaining weekly leads before purchasing one-time add-ons.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/provider/dashboard')}
              className="px-6 py-2.5 rounded-xl bg-amber-600 text-white font-black text-sm hover:bg-amber-700 transition"
            >
               View Current Leads →
            </button>
          </div>
        )}

        {/* Global Marketplace Locked Banner */}
        {!isPlatformActive && (
          <div className="mb-10 p-8 rounded-3xl bg-slate-100 border border-slate-200 flex flex-col items-center text-center gap-6">
            <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
              <Lock className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Marketplace Locked</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Platform access is required to view and purchase marketplace leads. 
                Activate your subscription to go live.
              </p>
            </div>
            <button 
              onClick={() => navigate('/provider/subscription')}
              className="px-8 py-3 rounded-2xl bg-[#1f6f5f] text-white font-black text-lg hover:bg-[#145347] transition shadow-xl shadow-[#1f6f5f]/20"
            >
               Activate Platform Access
            </button>
          </div>
        )}

        {isPlatformActive && (
          <>
            {/* Filters */}
            <div className={`mb-8 flex flex-wrap items-center gap-4 ${!canPurchase ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-2 text-slate-400 mr-2">
                <Filter className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest text-[#1f6f5f]">Filter By</span>
              </div>
              {['all', 'hot', 'warm', 'cold'].map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={!canPurchase}
                  onClick={() => setFilter(type)}
                  className={`rounded-xl px-5 py-2.5 text-xs font-black capitalize transition-all border-b-2 transform active:scale-95 ${
                    filter === type
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {type === 'all' ? 'All Leads' : typeColors[type]?.label || type}
                </button>
              ))}
              <span className="ml-auto text-sm font-bold text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-200">
                {filteredLeads.length} Matches Found
              </span>
            </div>

            {/* Lead Cards */}
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-64 rounded-3xl bg-white border border-slate-200 animate-pulse" />
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 border-dashed py-24 flex flex-col items-center gap-4">
                 <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                    <ShoppingCart className="h-8 w-8" />
                 </div>
                 <p className="text-slate-400 font-bold">No leads available right now. Check back soon!</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredLeads.map((lead) => {
                  const tc = typeColors[lead.leadType] || typeColors.cold;
                  const hasDiscount = lead.discount > 0;
                  return (
                    <article key={lead.id} className={`group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all border-b-4 border-b-slate-100 hover:border-b-[#1f6f5f] ${!canPurchase ? 'opacity-60 grayscale' : ''}`}>
                      {/* Type Badge */}
                      <div className="flex items-center justify-between mb-8">
                        <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-tight ${tc.bg} ${tc.text}`}>
                          {tc.emoji} {tc.label}
                        </span>
                        {lead.matchScore != null && (
                          <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Match %</p>
                             <p className="text-sm font-black text-slate-900">{lead.matchScore}%</p>
                          </div>
                        )}
                      </div>

                      {/* Price Section */}
                      <div className="mb-8">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">One-time Fee</p>
                        <div className="flex items-baseline gap-2">
                           <span className="text-4xl font-black text-slate-900 tracking-tight">₹{lead.finalPrice}</span>
                           {hasDiscount && (
                             <span className="text-sm text-slate-400 line-through font-bold">₹{lead.basePrice}</span>
                           )}
                        </div>
                        {hasDiscount && (
                          <div className="mt-2 text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded w-fit uppercase">
                             Flash Deal: {lead.discount}% OFF
                          </div>
                        )}
                      </div>

                      {/* Buy Button */}
                      <button
                        type="button"
                        onClick={() => void onPurchase(lead.id)}
                        disabled={purchasing === lead.id || !canPurchase}
                        className={`group/btn mt-auto flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-sm font-black transition-all ${
                          canPurchase 
                            ? 'bg-slate-900 text-white hover:bg-[#1f6f5f] shadow-lg shadow-slate-900/10' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {purchasing === lead.id ? (
                           <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : !canPurchase ? (
                           <Lock className="h-4 w-4" />
                        ) : (
                           <ShoppingCart className="h-4 w-4 group-hover/btn:scale-110 transition" />
                        )}
                        {!canPurchase ? 'Quota Locked' : purchasing === lead.id ? 'Processing...' : 'Buy This Lead'}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
