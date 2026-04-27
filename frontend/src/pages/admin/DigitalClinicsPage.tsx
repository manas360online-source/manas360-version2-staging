import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, Clock, ExternalLink, Filter, Search, XCircle } from 'lucide-react';
import { API_BASE } from '../../lib/runtimeEnv';

interface Clinic {
  id: string;
  clinicCode: string;
  name: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  city: string;
  subscriptionStatus: string;
  trialEndsAt: string;
  createdAt: string;
  subscriptions: any[];
}

export default function DigitalClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchClinics = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/v1/admin/mdc-clinics`);
      setClinics(res.data);
    } catch (err: any) {
      setError('Failed to fetch digital clinics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  const handleUpdateSubscription = async (clinicId: string, status: string, days: number) => {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + days);

    try {
      await axios.patch(`${API_BASE}/v1/admin/mdc-clinics/${clinicId}/subscription`, {
        status,
        trialEndsAt: trialEndsAt.toISOString(),
      });
      fetchClinics(); // Refresh list
    } catch (err) {
      alert('Failed to update subscription');
    }
  };

  const filteredClinics = clinics.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.clinicCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.subscriptionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Digital Clinics Management | Admin</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Digital Clinics</h1>
          <p className="text-sm text-slate-500 font-medium">Manage and approve MyDigitalClinic tenants</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search clinic or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending_agreement">Pending Agreement</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-700 text-center">
          <XCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-bold">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Clinic Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Owner info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClinics.map((clinic) => (
                  <tr key={clinic.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{clinic.name}</span>
                        <span className="text-xs font-mono text-blue-600">{clinic.clinicCode}</span>
                        <span className="text-[10px] text-slate-400 mt-1">Joined {new Date(clinic.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">{clinic.ownerName}</span>
                        <span className="text-xs text-slate-500">{clinic.ownerPhone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        clinic.subscriptionStatus === 'active' ? 'bg-green-100 text-green-700' :
                        clinic.subscriptionStatus === 'trial' ? 'bg-blue-100 text-blue-700' :
                        clinic.subscriptionStatus === 'pending_agreement' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {clinic.subscriptionStatus === 'pending_agreement' ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        {clinic.subscriptionStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {clinic.trialEndsAt ? new Date(clinic.trialEndsAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {clinic.subscriptionStatus === 'pending_agreement' && (
                          <button 
                            onClick={() => handleUpdateSubscription(clinic.id, 'trial', 21)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700"
                          >
                            Approve Trial
                          </button>
                        )}
                        <button 
                          onClick={() => handleUpdateSubscription(clinic.id, 'active', 30)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                        >
                          Activate (30d)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredClinics.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              No clinics found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
