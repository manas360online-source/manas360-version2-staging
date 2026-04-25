import React from 'react';
import { Video } from 'lucide-react';

interface AdmitPatientScreenProps {
  patientName: string;
  onAdmit: () => void;
}

export const AdmitPatientScreen: React.FC<AdmitPatientScreenProps> = ({ patientName, onAdmit }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white rounded-[2rem] p-10 flex flex-col items-center text-center shadow-2xl shadow-blue-100/50 max-w-[340px] w-full border border-blue-50">
        
        {/* Icon Circle */}
        <div className="w-16 h-16 rounded-full border-2 border-blue-600 flex items-center justify-center text-blue-600 mb-6">
          <Video size={24} />
        </div>
        
        {/* Text */}
        <h2 className="text-sm font-black text-blue-950 uppercase tracking-widest mb-3">
          Patient is Ready
        </h2>
        <p className="text-[11px] text-gray-500 font-bold mb-8 leading-relaxed">
          {patientName} is in the waiting room.<br/>
          Start the session when you are ready.
        </p>
        
        {/* Action Button */}
        <button
          onClick={onAdmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] py-4 rounded-full uppercase tracking-widest transition-colors shadow-lg shadow-blue-200"
        >
          Admit Patient
        </button>
      </div>
    </div>
  );
};