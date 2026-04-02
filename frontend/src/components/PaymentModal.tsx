import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import { Certification } from '../CertificationTypes';
import { useNavigate } from 'react-router-dom';
import useEnrollmentStore from '../store/CertificationEnrollmentStore';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  certification: Certification;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, certification }) => {
  const [step, setStep] = useState<'plan' | 'processing' | 'success' | 'fail'>('plan');
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'installment'>('full');
  const navigate = useNavigate();
  const { addEnrollment } = useEnrollmentStore();

  if (!isOpen) return null;

  const installmentAmount = Math.ceil(certification.price_inr / 3);

  const handlePayment = () => {
    setStep('processing');
    setTimeout(() => {
      const totalAmount = certification.price_inr;
      addEnrollment({
        id: `ENR-${Date.now()}`,
        certificationId: certification.id,
        certificationName: certification.name,
        slug: certification.slug,
        badgeColor: certification.badgeColor,
        enrollmentDate: new Date().toLocaleDateString(),
        paymentStatus: totalAmount === 0 ? 'Paid' : paymentPlan === 'installment' ? 'Partial' : 'Paid',
        paymentPlan,
        amountPaid: totalAmount === 0 ? 0 : paymentPlan === 'full' ? totalAmount : installmentAmount,
        totalAmount,
        installmentsPaidCount: totalAmount === 0 ? 3 : paymentPlan === 'full' ? 3 : 1,
        completionPercentage: 0,
        modulesCompleted: 0,
      });
      setStep('success');
    }, 2000);
  };

  const handleClose = () => {
      setStep('plan');
      onClose();
  };

  const handleGoToDashboard = () => {
      handleClose();
      navigate('/my-certifications');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {step === 'plan' && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-bold text-slate-800">Enrollment</h3>
              <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>

            {/* Demo Banner */}
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r">
                <div className="flex">
                    <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="ml-3">
                    <p className="text-sm text-amber-800 font-bold">
                  Payment completion will be recorded in your certifications dashboard.
                    </p>
                    </div>
                </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-slate-500 uppercase tracking-wide font-bold">Selected Course</p>
              <h4 className="text-xl font-bold text-purple-700 mt-1">{certification.name}</h4>
              <p className="text-slate-600 text-sm mt-1">{certification.duration_weeks} Weeks • {certification.modulesCount || 0} Modules</p>
            </div>

            <div className="space-y-4 mb-8">
              {/* Full Payment Option */}
              <div 
                onClick={() => setPaymentPlan('full')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentPlan === 'full' 
                  ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' 
                  : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">One-time Payment</span>
                  {paymentPlan === 'full' && <CheckCircle size={20} className="text-purple-600" />}
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">₹{certification.price_inr.toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">Best value, instant full access.</p>
              </div>

              {/* Installment Option */}
              {certification.price_inr > 0 && (
                <div 
                    onClick={() => setPaymentPlan('installment')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentPlan === 'installment' 
                    ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' 
                    : 'border-slate-100 hover:border-slate-200'
                    }`}
                >
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">3 Monthly Installments</span>
                        {paymentPlan === 'installment' && <CheckCircle size={20} className="text-purple-600" />}
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                        ₹{installmentAmount.toLocaleString()} <span className="text-sm font-normal text-slate-500">/mo</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <ShieldCheck size={12} />
                        Next installment due in 30 days (demo)
                    </div>
                </div>
              )}
            </div>

            <button 
              onClick={handlePayment}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
            >
              <Lock size={18} className="text-purple-200" />
              {certification.price_inr === 0 
                ? 'Enroll for Free' 
                : `Pay Today: ₹${paymentPlan === 'full' ? certification.price_inr.toLocaleString() : installmentAmount.toLocaleString()}`
              }
            </button>
            <div className="text-center mt-3 text-xs text-slate-400 flex items-center justify-center gap-1">
              <Lock size={10} /> Secure checkout
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-slate-800">Processing Enrollment...</h3>
            <p className="text-slate-500 mt-2">Securing your spot on the journey.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center bg-white">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle size={40} />
            </div>
            
            <h3 className="text-2xl font-serif font-bold text-slate-800">Enrollment Successful</h3>
            
            <p className="text-slate-600 mt-4 mb-8 max-w-xs mx-auto leading-relaxed">
              Your enrollment has been added to My Certifications.
            </p>

            <div className="w-full space-y-3">
                <button 
                onClick={handleGoToDashboard}
                className="w-full px-6 py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                >
                    Go to My Certifications <ArrowRight size={18} />
                </button>

                <button 
                onClick={handleClose}
                className="w-full px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition"
                >
                    Back to Certifications
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
