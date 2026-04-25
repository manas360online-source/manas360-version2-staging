import React from 'react';

interface StatsProps {
  totalPatients: number;
  totalTherapists: number;
  totalSessions: number;
  therapistLimit: number;
}

export const AdminStats: React.FC<StatsProps> = ({
  totalPatients,
  totalTherapists,
  totalSessions,
  therapistLimit,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Patients</div>
        <div className="text-3xl font-black text-slate-900">{totalPatients}</div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Active Staff</div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-black text-slate-900">{totalTherapists}</div>
          <div className="text-slate-400 text-sm">/ {therapistLimit}</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Sessions (MTD)</div>
        <div className="text-3xl font-black text-slate-900">{totalSessions}</div>
      </div>

      <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white">
        <div className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Mood Score</div>
        <div className="flex items-center gap-2">
          <div className="text-3xl font-black">7.4</div>
          <div className="text-blue-200 text-xs bg-blue-500/30 px-2 py-0.5 rounded-full font-bold">↑ 12%</div>
        </div>
      </div>
    </div>
  );
};
