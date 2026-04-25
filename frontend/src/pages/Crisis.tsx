import React, { useEffect, useState } from 'react';
import { patientApi } from '../api/patient';
import PatientWalletWidget from '../components/patient/PatientWalletWidget';

export const CrisisPage: React.FC = () => {
  const [showCounselor, setShowCounselor] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await patientApi.getWalletBalance();
        const payload = (res as any)?.data ?? res ?? {};
        setWalletBalance(Number(payload?.total_balance ?? 0));
      } catch {
        // Crisis page should never block the user if wallet is unavailable.
        setWalletBalance(null);
      } finally {
        setWalletLoading(false);
      }
    })();
  }, []);

  return (
    <div className="responsive-page bg-[#FEF2F2] flex flex-col items-center justify-center text-center animate-fade-in">
      
      <div className="responsive-container max-w-screen-md bg-white p-6 sm:p-8 md:p-12 rounded-[40px] shadow-xl border border-red-100">
        
        {/* Warning Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
          🚨
        </div>

        <h1 className="font-serif text-[2.5rem] font-bold text-red-700 leading-tight mb-4">
          CRITICAL: HIGH SUICIDE RISK
        </h1>
        
        <p className="text-xl font-medium text-slate-700 mb-2">
          Immediate Action Required
        </p>
        
        <p className="text-lg text-slate-500 mb-10">
          You are not alone. Help is available <span className="font-bold text-red-600">RIGHT NOW</span>.
        </p>

        <div className="mb-12 w-full max-w-md mx-auto">
          <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-stretch justify-center">
            <div className="section-stack w-full flex-1">
              <a href="tel:18005990019" className="block w-full py-4 bg-red-600 text-white rounded-full font-bold text-lg hover:bg-red-700 transition shadow-lg shadow-red-200">
                📞 CALL TELE-MANAS: 1800-599-0019
              </a>
              
              <a href="sms:988?body=HELP" className="block w-full py-4 bg-white text-red-600 border-2 border-red-100 rounded-full font-bold text-lg hover:bg-red-50 transition">
                💬 TEXT "HELP" to Crisis Line
              </a>
              
              <a href="tel:112" className="block w-full py-4 bg-slate-800 text-white rounded-full font-bold text-lg hover:bg-slate-900 transition">
                EMERGENCY: Call 112
              </a>
            </div>

            <div className="flex-1 flex justify-center md:justify-end">
              <PatientWalletWidget
                compact
                loading={walletLoading}
                balance={{
                  total_balance: walletBalance ?? 0,
                }}
              />
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-red-50">
          <p className="font-serif text-2xl text-slate-800 mb-6">Are you safe right now?</p>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowCounselor(true)}
              className="responsive-action-btn px-8 bg-emerald-100 text-emerald-800 font-bold rounded-full hover:bg-emerald-200 transition"
            >
              Yes, I'm safe – Connect me to a counselor
            </button>
            <a 
              href="tel:112"
              className="responsive-action-btn px-8 bg-red-100 text-red-800 font-bold rounded-full hover:bg-red-200 transition"
            >
              No, I need help now – Call 112
            </a>
          </div>

          {showCounselor && (
            <div className="mt-6 p-4 bg-emerald-50 rounded-2xl text-emerald-800 text-sm animate-fade-in-up">
              Great. Please stay on the line or visit the nearest hospital. We recommend calling Tele-MANAS immediately for a safe conversation.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
