import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ShieldCheck, CheckCircle, ArrowLeft, Calendar,
  User, Phone, AlertCircle, Loader2, FastForward
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage, signupWithPhone, verifyPhoneSignupOtp } from '../api/auth';

const EnrollmentRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const { user, checkAuth } = useAuth();

  const certName = (location.state as any)?.certName || 'Certification Program';
  const price = (location.state as any)?.price || 'Free';
  const slug = routeSlug || (location.state as any)?.slug;
  const normalizedRole = String(user?.role || '').toLowerCase();
  const isLoggedInProvider = ['learner', 'therapist', 'psychiatrist', 'psychologist', 'coach'].includes(normalizedRole);
  const isAuthenticated = Boolean(user);
  const providerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Provider';


  const [processing, setProcessing] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'installment'>('full');

  const validateMobile = (value: string): boolean => value.replace(/\D/g, '').length >= 10;

  const continueToCheckout = (input: { fullName?: string; mobile?: string }) => {
    if (!slug) {
      setGeneralError('Certification link is invalid. Please reopen from certification details.');
      return;
    }

    const query = paymentPlan === 'installment' ? '?plan=installment' : '?plan=full';
    const inProviderShell = location.pathname.startsWith('/provider');
    const checkoutPath = inProviderShell ? `/provider/checkout/${slug}${query}` : `/checkout/${slug}${query}`;
    navigate(checkoutPath, {
      state: {
        certName,
        slug,
        price,
        fullName: String(input.fullName || '').trim() || providerName,
        mobile: String(input.mobile || '').trim() || undefined,
        paymentPlan,
        installmentCount: paymentPlan === 'installment' ? 3 : 1,
      },
    });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!slug) {
      setGeneralError('Certification link is invalid. Please open enrollment from certification details.');
      return;
    }

    if (!validateMobile(mobile)) {
      setGeneralError('Please enter a valid mobile number to continue.');
      return;
    }

    setProcessing(true);
    try {
      const response = await signupWithPhone(mobile, {
        name: fullName.trim() || undefined,
        role: 'learner',
      });
      setOtpSent(true);
      setDevOtp(response.devOtp || null);
    } catch (error: any) {
      setGeneralError(getApiErrorMessage(error, 'Unable to send OTP. Please try again.'));
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyOtpAndEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!otp.trim()) {
      setGeneralError('Please enter the OTP sent to your phone.');
      return;
    }

    setProcessing(true);
    try {
      await verifyPhoneSignupOtp(mobile, otp.trim(), { acceptedTerms: true });
      await checkAuth({ force: true });
      continueToCheckout({ fullName, mobile });
    } catch (error: any) {
      setGeneralError(getApiErrorMessage(error, 'OTP verification failed. Please try again.'));
      setProcessing(false);
    }
  };

  const handleQuickEnroll = async () => {
    setProcessing(true);
    setGeneralError(null);

    const quickMobile = (user?.phone || '').trim();
    if (!quickMobile) {
      setGeneralError('Your account is missing a phone number. Please enter mobile number below to continue.');
      setProcessing(false);
      return;
    }

    if (!slug) {
      setGeneralError('Certification link is invalid. Please reopen enrollment from certification details.');
      setProcessing(false);
      return;
    }

    continueToCheckout({
      fullName: providerName,
      mobile: quickMobile,
    });
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition mb-6 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back to Details
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-purple-600 p-6 text-white">
            <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-1">
              Program Registration
            </p>
            <h1 className="text-xl font-bold">{certName}</h1>
            <p className="text-teal-100 text-sm mt-1">Complete your enrollment below</p>
          </div>

          <div className="p-6">
            {generalError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{generalError}</p>
              </div>
            )}

            {isAuthenticated ? (
              <div className="text-center py-6">
                 <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                    <FastForward className="text-teal-600 w-8 h-8" />
                 </div>
                 <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome Back, {providerName}!</h2>
                 <p className="text-slate-500 text-sm mb-6">
                  {isLoggedInProvider
                   ? "You're already logged in as a provider. Skip auth and enroll instantly."
                   : 'You are already logged in. Continue with quick enrollment.'}
                 </p>
                 
                 <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left mb-6">
                    <div className="flex justify-between items-center mb-2">
                       <span className="font-bold text-slate-800 text-sm">Program Fee</span>
                       <span className="font-bold text-purple-600 text-base">{price}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                       <ShieldCheck size={14} className="text-teal-500" />
                       Includes +30 Lead Match Boost after clinical verification
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2 mb-5">
                    <button
                      type="button"
                      onClick={() => setPaymentPlan('full')}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold ${paymentPlan === 'full' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600'}`}
                    >
                      Pay Full
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPlan('installment')}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold flex items-center justify-center gap-1 ${paymentPlan === 'installment' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600'}`}
                    >
                      <Calendar size={12} /> Installments
                    </button>
                 </div>

                 <button
                    onClick={handleQuickEnroll}
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-teal-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                 >
                    {processing ? <><Loader2 size={16} className="animate-spin" /> Preparing Checkout...</> : `Confirm & Pay ${price} →`}
                 </button>
              </div>
            ) : (
              <form onSubmit={otpSent ? handleVerifyOtpAndEnroll : handleSendOtp} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Full Name (Optional)
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 XXXXX XXXXX"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition"
                    />
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition"
                    />
                    {devOtp && (
                      <p className="text-[11px] text-amber-700 mt-2">Dev OTP: {devOtp}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => setPaymentPlan('full')}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold ${paymentPlan === 'full' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    Pay Full
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentPlan('installment')}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold flex items-center justify-center gap-1 ${paymentPlan === 'installment' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    <Calendar size={12} /> Installments
                  </button>
                </div>

              {/* Fee Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-slate-800 text-sm">Program Fee</span>
                  <span className="font-bold text-purple-600 text-base">{price}</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    'Lifetime access to modules',
                    'Certificate with blockchain verification',
                    'Listed on MANAS360 Coach Directory',
                    'Patient matching after certification',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle size={12} className="text-teal-500 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Money Back */}
              <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                <ShieldCheck size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 font-medium">
                  30-Day Money Back Guarantee — No questions asked.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-gradient-to-r from-teal-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {otpSent ? 'Verifying OTP...' : 'Sending OTP...'}
                  </>
                ) : (
                  otpSent ? `Verify OTP & Pay ${price} ->` : 'Get OTP to Continue'
                )}
              </button>

              {otpSent && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={processing}
                  className="w-full text-xs text-slate-500 hover:text-slate-700 font-semibold"
                >
                  Resend OTP
                </button>
              )}

            </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentRegistrationPage;