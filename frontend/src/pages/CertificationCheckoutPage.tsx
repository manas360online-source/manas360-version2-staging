import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CERTIFICATIONS } from '../CertificationConstants';
import { ShieldCheck, CheckCircle, Lock, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { SEO } from '../components/CertificationSEO';
import { useWallet } from '../hooks/useWallet';
import { useEnrollmentStore } from '../store/CertificationEnrollmentStore';
import { getCertificationsErrorMessage, registerCertificationEnrollment } from '../api/certifications';

export const CheckoutPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { balance } = useWallet();
    const { addEnrollment, getEnrollmentBySlug } = useEnrollmentStore();
    const walletAmount = Number((balance as any)?.total_balance || 0);

    const [processing, setProcessing] = useState(false);
    const [plan, setPlan] = useState<'full' | 'installment'>(() => {
        const q = new URLSearchParams(location.search).get('plan');
        if (q === 'installment') return 'installment';
        const statePlan = (location.state as any)?.paymentPlan;
        return statePlan === 'installment' ? 'installment' : 'full';
    });
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
    const myCertificationsPath = location.pathname.startsWith('/provider') ? '/provider/my-certifications' : '/my-certifications';

    const cert = CERTIFICATIONS.find(c => c.slug === slug);

    const fullName = String((location.state as any)?.fullName || '').trim();
    const mobile = String((location.state as any)?.mobile || '').trim();

    const installmentAmount = useMemo(() => Math.ceil((cert?.price_inr || 0) / 3), [cert?.price_inr]);
    const totalToday = plan === 'full' ? (cert?.price_inr || 0) : installmentAmount;

    const today = new Date();
    const nextMonth = new Date(today); nextMonth.setDate(today.getDate() + 30);
    const monthAfter = new Date(today); monthAfter.setDate(today.getDate() + 60);

    const applicableWallet = Math.min(walletAmount, totalToday);
    const finalTotal = totalToday - applicableWallet;

    React.useEffect(() => {
        if (!cert || getEnrollmentBySlug(cert.slug)) {
            return;
        }

        let active = true;

        const handleTransaction = async () => {
            setProcessing(true);
            try {
                const fullName = (location.state as any)?.fullName;
                const email = (location.state as any)?.email;
                const mobile = (location.state as any)?.mobile;
                const city = (location.state as any)?.city;
                const education = (location.state as any)?.education;
                const motivation = (location.state as any)?.motivation;

                await fetch('/api/v1/enrollment/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullName,
                        email,
                        mobile,
                        city,
                        education,
                        motivation,
                        certName: cert.name,
                        certSlug: cert.slug,
                        price: finalTotal,
                    }),
                });

                if (cert.price_inr === 0) {
                    try {
                        await registerCertificationEnrollment({
                            certSlug: cert.slug,
                            paymentPlan: 'full',
                            installmentCount: 1,
                            bypassPayment: true,
                        });

                        const newEnrollment = {
                            id: `ENR-${Date.now()}`,
                            certificationId: cert.id,
                            certificationName: cert.name,
                            slug: cert.slug,
                            badgeColor: cert.badgeColor,
                            enrollmentDate: new Date().toISOString().split('T')[0],
                            paymentStatus: 'Sponsoring' as const,
                            paymentPlan: 'full' as const,
                            amountPaid: 0,
                            totalAmount: 0,
                            installmentsPaidCount: 1,
                            completionPercentage: 0,
                            modulesCompleted: 0,
                            certId: Math.random().toString(36).substring(2, 8).toUpperCase(),
                        };

                        addEnrollment(newEnrollment as any);
                        navigate(myCertificationsPath, { replace: true });
                    } catch (error: any) {
                        const status = Number(error?.response?.status || 0);
                        if (status !== 409 && active) {
                            setGeneralError(getCertificationsErrorMessage(error, 'Unable to start enrollment.'));
                        }
                    }
                }
            } catch (err: any) {
                console.error('Enrollment transaction failed', err);
                if (active) setGeneralError('Unable to start enrollment.');
            } finally {
                if (active) setProcessing(false);
            }
        };

        void handleTransaction();

        return () => {
            active = false;
        };
    }, [addEnrollment, cert, getEnrollmentBySlug, myCertificationsPath, navigate]);

    const handlePayment = async () => {
        if (!cert || !slug) return;
        setProcessing(true);
        setGeneralError(null);

        const isFree = cert.price_inr === 0;

        try {
            const result = await registerCertificationEnrollment({
                certSlug: cert.slug,
                paymentPlan: plan,
                installmentCount: plan === 'installment' ? 3 : 1,
                bypassPayment: isFree,
            });

            if (result.paymentUrl) {
                window.location.href = result.paymentUrl;
                return;
            }

            if (!getEnrollmentBySlug(cert.slug)) {
                const newEnrollment = {
                    id: `ENR-${Date.now()}`,
                    certificationId: cert.id,
                    certificationName: cert.name,
                    slug: cert.slug,
                    badgeColor: cert.badgeColor,
                    enrollmentDate: new Date().toISOString().split('T')[0],
                    paymentStatus: isFree ? ('Sponsoring' as const) : (plan === 'installment' ? ('Partial' as const) : ('Paid' as const)),
                    paymentPlan: plan,
                    amountPaid: isFree ? 0 : (plan === 'full' ? cert.price_inr : installmentAmount),
                    totalAmount: cert.price_inr,
                    installmentsPaidCount: 1,
                    completionPercentage: 0,
                    modulesCompleted: 0,
                    certId: Math.random().toString(36).substring(2, 8).toUpperCase(),
                };
                addEnrollment(newEnrollment as any);
            }

            navigate(myCertificationsPath, { replace: true });
        } catch (error: any) {
            const status = Number(error?.response?.status || 0);
            if (status !== 409) {
                setGeneralError(getCertificationsErrorMessage(error, 'Unable to initiate payment.'));
            } else {
                navigate(myCertificationsPath, { replace: true });
            }
        } finally {
            setProcessing(false);
        }
    };

    if (!cert) return <div className="p-20 text-center">Invalid certification</div>;

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <SEO title={`Checkout - ${cert.name} | MANAS360`} />

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h1 className="text-3xl font-serif font-bold text-slate-800">Checkout</h1>

                    {generalError && (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
                            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700 font-medium">{generalError}</p>
                        </div>
                    )}

                    {duplicateMessage && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="text-sm text-amber-800 font-semibold mb-3">{duplicateMessage}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate(myCertificationsPath)}
                                    className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold"
                                >
                                    Continue Learning
                                </button>
                                <button
                                    onClick={() => navigate(myCertificationsPath)}
                                    className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-xs font-bold bg-white"
                                >
                                    My Certifications
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h2 className="text-sm uppercase tracking-wide text-slate-500 font-bold mb-4">Order Summary</h2>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{cert.name}</h3>
                                <p className="text-sm text-slate-500">{cert.duration_weeks} Weeks • {cert.tier} Tier</p>
                            </div>
                            <div className={`${cert.badgeColor === 'purple' ? 'bg-purple-600' : 'bg-blue-500'} w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold`}>
                                {cert.name.charAt(0)}
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Certification Fee</span>
                                <span>₹{cert.price_inr.toLocaleString()}</span>
                            </div>
                            {plan === 'installment' && (
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>Installment Plan</span>
                                    <span>3 Months</span>
                                </div>
                            )}
                            {applicableWallet > 0 && (
                                <div className="flex justify-between text-sm font-medium text-teal-600">
                                    <span>Wallet Credits Applied</span>
                                    <span>- ₹{applicableWallet.toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex justify-between items-center font-bold text-slate-800 text-lg">
                            <span>Total Due Today</span>
                            <span>{finalTotal === 0 ? 'Free' : `₹${finalTotal.toLocaleString()}`}</span>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                        <ShieldCheck className="text-blue-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-blue-800">30-Day Money Back Guarantee</p>
                            <p className="text-xs text-blue-600 mt-1">If you're not satisfied, get a full refund within 30 days.</p>
                        </div>
                    </div>
                </div>

                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 h-fit">
                        <h3 className="text-xl font-bold text-slate-800 mb-6"> {cert.price_inr === 0 ? 'Start Training' : 'Payment Method'}</h3>

                        {cert.price_inr > 0 && (
                          <div className="space-y-4 mb-8">
                            <label className="block text-sm font-bold text-slate-700">Choose Payment Frequency</label>
                            <div className="grid grid-cols-1 gap-3">
                              <button 
                                onClick={() => setPlan('full')}
                                className={`p-4 rounded-xl border-2 text-left transition ${plan === 'full' ? 'border-purple-600 bg-purple-50' : 'border-slate-100'}`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold">Full Payment</span>
                                  {plan === 'full' && <CheckCircle size={16} className="text-purple-600" />}
                                </div>
                                <p className="text-xs text-slate-500">Fastest way to unlock certification</p>
                              </button>
                              
                              <button 
                                onClick={() => setPlan('installment')}
                                className={`p-4 rounded-xl border-2 text-left transition ${plan === 'installment' ? 'border-purple-600 bg-purple-50' : 'border-slate-100'}`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold">3 Easy Installments</span>
                                  {plan === 'installment' && <CheckCircle size={16} className="text-purple-600" />}
                                </div>
                                <p className="text-xs text-slate-500">₹{installmentAmount.toLocaleString()} per month</p>
                              </button>
                            </div>
                          </div>
                        )}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 h-fit">
                    {cert.price_inr === 0 ? (
                        <>
                        <div className="text-center py-8">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Free Enrollment</h3>
                            <button
                                onClick={() => handleTransaction()}
                                disabled={processing}
                                className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition disabled:opacity-50"
                            >
                                {processing ? 'Enrolling...' : 'Confirm Enrollment'}
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-8">
                            <div className="flex justify-between items-center text-sm text-slate-600 mb-2">
                                <span>Access</span>
                                <span className="font-bold text-slate-800">{cert.price_inr === 0 ? 'Immediate' : 'Once payment verified'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-600">
                                <span>Secure</span>
                                <span className="font-bold text-emerald-600">PhonePe Protected</span>
                            </div>
                        </div>
                            <div className="text-2xl font-bold text-slate-900 mt-2">₹{installmentAmount.toLocaleString()} <span className="text-sm font-normal text-slate-500">/mo</span></div>

                            {plan === 'installment' && (
                                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <Calendar size={12} className="text-purple-500" />
                                        <span>Payment 2 due {nextMonth.toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <Calendar size={12} className="text-purple-500" />
                                        <span>Payment 3 due {monthAfter.toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )}

                            {/* Pay button */}
                            <button
                                onClick={() => handleTransaction()}
                                disabled={processing}
                                className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-70 mb-6"
                            >
                                {processing ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <Lock size={18} className="text-purple-200" />
                                        Pay ₹{finalTotal.toLocaleString()}
                                    </>
                                )}
                            </button>

                        <button
                            onClick={handlePayment}
                            disabled={processing}
                            className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-70 mb-6 shadow-lg shadow-purple-100"
                        >
                            {processing ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Lock size={18} className="text-purple-200" />
                                    {cert.price_inr === 0 ? 'Start Learning' : `Proceed to Pay ₹${finalTotal.toLocaleString()}`}
                                </>
                            )}
                        </button>

                        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs mb-2">
                            <CreditCard size={14} /> UPI • Cards • Net Banking
                        </div>
                        </>
                    ) : null}
                    </div>
            </div>
        </div>
        </div>
    );
};
