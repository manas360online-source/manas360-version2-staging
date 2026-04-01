import React from 'react';
import { TrendingUp } from 'lucide-react';

interface YieldEngineProps {
  isGroupActive?: boolean;
}

export const YieldEngine: React.FC<YieldEngineProps> = ({ isGroupActive }) => {
  const payout = isGroupActive ? "₹1,198" : "₹899";
  const gross = isGroupActive ? "₹1,998" : "₹1,499";
  const split = isGroupActive ? "₹800" : "₹600";

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-100 border border-blue-50 relative overflow-hidden transition-all duration-500">
      <div className="absolute top-6 right-6 text-blue-200">
        <div className="border-2 border-blue-100 rounded-md p-1"><TrendingUp size={16}/></div>
      </div>
      
      <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] mb-4">Yield Engine</p>
      
      <div className="mb-8">
        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Therapist Payout (60%)</p>
        <h2 className="text-6xl font-black text-blue-950 transition-all duration-500">{payout}</h2>
      </div>

      <div className="space-y-3 pt-6 border-t border-gray-100">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
          <span className="text-gray-400">Gross Revenue</span>
          <span className="text-blue-900 transition-all duration-500">{gross}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
          <span className="text-red-400">Platform Split (40%)</span>
          <span className="text-red-400 transition-all duration-500">{split}</span>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 rounded-2xl p-4">
        <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Impact Insight</p>
        <p className="text-xs text-blue-800 leading-relaxed italic">
          "You are earning 2x more per hour with Group Vibes than individual sessions."
        </p>
        <div className="w-full bg-blue-200 h-1.5 rounded-full mt-4 overflow-hidden">
          <div className="bg-blue-600 h-full w-2/3 rounded-full relative">
            {isGroupActive && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
          </div>
        </div>
      </div>
    </div>
  );
};