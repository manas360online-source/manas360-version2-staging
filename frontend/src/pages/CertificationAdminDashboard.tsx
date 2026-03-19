import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ANALYTICS_DATA, MOCK_ENROLLMENTS } from '../CertificationConstants';
import { Users, DollarSign, Award, TrendingUp } from 'lucide-react';
import { Skeleton } from '../components/CertificationSkeleton';
import { SEO } from '../components/CertificationSEO';

interface AnalyticsItem {
    name: string;
    enrollments: number;
    revenue: number;
}

interface EnrollmentItem {
    id: string;
    certificationName: string;
    enrollmentDate: string;
    amountPaid: number;
    paymentStatus: string;
    completionPercentage: number;
}

export const AdminDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const totalEnrollments = ANALYTICS_DATA.reduce((acc: number, curr: AnalyticsItem) => acc + curr.enrollments, 0);
    const totalRevenue = ANALYTICS_DATA.reduce((acc: number, curr: AnalyticsItem) => acc + curr.revenue, 0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="bg-slate-50 min-h-screen p-4 md:p-8">
            <SEO title="Admin Dashboard | MANAS360" />
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-slate-900">Platform Analytics</h1>
                        <p className="text-sm text-slate-500 mt-1">Real-time overview of certification performance</p>
                    </div>
                    <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded border border-slate-200">
                        Last updated: Just now
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                             <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm h-32 flex flex-col justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-32" />
                             </div>
                        ))
                    ) : (
                        <>
                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
                                    <div className="bg-green-100 p-2 rounded-lg text-green-600"><DollarSign size={18} /></div>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">₹{(totalRevenue / 100000).toFixed(2)} Lakh</p>
                                <p className="text-xs text-green-600 mt-1 flex items-center"><TrendingUp size={12} className="mr-1"/> +12% this week</p>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm text-slate-500 font-medium">Total Enrollments</p>
                                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users size={18} /></div>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{totalEnrollments}</p>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm text-slate-500 font-medium">Avg Completion</p>
                                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Award size={18} /></div>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">84%</p>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm text-slate-500 font-medium">Active Leads</p>
                                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Users size={18} /></div>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">142</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Enrollments Chart */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6">Enrollments by Certification</h3>
                        <div className="h-64">
                            {loading ? <Skeleton className="h-full w-full" /> : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={ANALYTICS_DATA}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} interval={0} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                        <Tooltip cursor={{fill: '#f8fafc'}} />
                                        <Bar dataKey="enrollments" radius={[4, 4, 0, 0]}>
                                            {ANALYTICS_DATA.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#eab308', '#f97316', '#ef4444', '#9333ea'][index] || '#cbd5e1'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Revenue Chart */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6">Revenue Distribution</h3>
                        <div className="h-64">
                            {loading ? <Skeleton className="h-full w-full" /> : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={ANALYTICS_DATA} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                                        <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                                        <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Transactions Table */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50">
                        <h3 className="font-bold text-slate-800">Recent Enrollments</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3">Enrollment ID</th>
                                    <th className="px-6 py-3">Certification</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Amount Paid</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Progress</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                     Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                                            <td className="px-6 py-4"><Skeleton className="h-6 w-12 rounded-full" /></td>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-10" /></td>
                                        </tr>
                                     ))
                                ) : (
                                    MOCK_ENROLLMENTS.map((enr: EnrollmentItem) => (
                                        <tr key={enr.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-medium text-slate-900">{enr.id}</td>
                                            <td className="px-6 py-4">{enr.certificationName}</td>
                                            <td className="px-6 py-4">{enr.enrollmentDate}</td>
                                            <td className="px-6 py-4">₹{enr.amountPaid.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    enr.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {enr.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{enr.completionPercentage}%</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
