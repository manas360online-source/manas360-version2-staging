import React, { useState, useEffect } from 'react';
import { MOCK_LEADS } from '../CertificationConstants';
import { Clock, Phone, Mail, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { Lead } from '../CertificationTypes';
import { Skeleton } from '../components/CertificationSkeleton';
import { SEO } from '../components/CertificationSEO';

const CountdownTimer: React.FC<{ targetDate: string }> = ({ targetDate }) => {
  const [timeLeftString, setTimeLeftString] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
        const expires = new Date(targetDate).getTime();
        const now = new Date().getTime();
        const difference = expires - now;

        if (difference > 0) {
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            setTimeLeftString(`${hours}h ${minutes}m`);
        } else {
            setIsExpired(true);
            setTimeLeftString('Expired');
        }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (isExpired) {
      return <span className="text-red-500 font-bold text-xs uppercase">Expired</span>;
  }

  return (
    <div className="flex items-center text-orange-600 font-mono text-xs font-bold gap-1">
        <Clock size={12} /> {timeLeftString} remaining
    </div>
  );
};

export const LeadBoostDashboard: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([...MOCK_LEADS] as Lead[]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const handleMarkContacted = (id: number) => {
        setLeads(leads.map(l => l.id === id ? { ...l, isContacted: true } : l));
    };

    return (
        <div className="bg-slate-50 min-h-screen p-4 md:p-8">
            <SEO title="Lead Boost Dashboard | MANAS360" />
            <div className="max-w-6xl mx-auto">
                <div className="bg-gradient-to-r from-purple-800 to-indigo-900 rounded-3xl p-8 text-white mb-8 shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded uppercase">Premium Feature</span>
                        </div>
                        <h1 className="text-3xl font-serif font-bold mb-2">Lead Boost Dashboard</h1>
                        <p className="text-purple-100 max-w-xl">
                            You have exclusive 24-hour access to these high-intent patient leads. 
                            Connect quickly to improve conversion rates.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Active Leads Column */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-bold text-slate-800">Exclusive Leads</h2>
                            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{leads.filter(l => new Date(l.exclusiveUntil) > new Date()).length} Active</span>
                        </div>
                        
                        {loading ? (
                            <>
                                <Skeleton className="h-40 w-full mb-4" />
                                <Skeleton className="h-40 w-full" />
                            </>
                        ) : (
                            leads.map(lead => {
                                const isExpired = new Date(lead.exclusiveUntil) < new Date();
                                return (
                                    <div key={lead.id} className={`rounded-xl p-6 shadow-sm border transition-all ${
                                        isExpired ? 'bg-slate-100 border-slate-200 opacity-75' : 'bg-white border-slate-100 hover:shadow-md'
                                    }`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-lg text-slate-900">{lead.name}</h3>
                                                    {!isExpired && (
                                                        <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                                                            <Shield size={10} /> Exclusive
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-slate-500 text-sm">{lead.age} years • {lead.concern}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                                        lead.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {lead.severity} Severity
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <CountdownTimer targetDate={lead.exclusiveUntil} />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 border-t border-slate-200/50 pt-4">
                                            {isExpired ? (
                                                <div className="w-full text-center text-sm text-slate-500 italic flex items-center justify-center gap-2">
                                                    <AlertTriangle size={16} /> Moved to General Pool
                                                </div>
                                            ) : (
                                                <>
                                                    {lead.isContacted ? (
                                                        <div className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg font-medium text-sm border border-green-200 flex items-center justify-center gap-2">
                                                            <CheckCircle size={16} /> Contacted
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleMarkContacted(lead.id)}
                                                            className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-purple-700 flex items-center justify-center gap-2"
                                                        >
                                                            <Phone size={16} /> Call Now
                                                        </button>
                                                    )}
                                                    <button className="flex-1 bg-white border border-slate-200 text-slate-700 py-2 rounded-lg font-medium text-sm hover:bg-slate-50 flex items-center justify-center gap-2">
                                                        <Mail size={16} /> Email
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Stats */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4">Analytics</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                    <span className="text-slate-500 text-sm">Exclusive Conversion</span>
                                    <span className="font-bold text-green-600">32%</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                    <span className="text-slate-500 text-sm">General Conversion</span>
                                    <span className="font-bold text-slate-800">8%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
