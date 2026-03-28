import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CERTIFICATIONS } from '../CertificationConstants';
import { ShieldCheck, CheckCircle, Lock, CreditCard, Calendar } from 'lucide-react';
import { CardSkeleton } from '../components/CertificationSkeleton';
import { SEO } from '../components/CertificationSEO';
import { useEnrollmentStore } from '../store/CertificationEnrollmentStore';
import { Enrollment } from '../CertificationTypes';
import { useWallet } from '../hooks/useWallet';

export const CheckoutPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { addEnrollment, getEnrollmentBySlug } = useEnrollmentStore();
    const { balance, applyWalletToPayment } = useWallet();

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [plan, setPlan] = useState<'full' | 'installment'>('full');

    const cert = CERTIFICATIONS.find(c => c.slug === slug);
    const existingEnrollment = slug ? getEnrollmentBySlug(slug) : undefined;
    const justPaid = React.useRef(false);

    useEffect(() => {
        // If already enrolled (and not just paid), redirect to my certifications
        if (existingEnrollment && !justPaid.current) {
            navigate('/my-certifications');
            return;
        }
        setTimeout(() => setLoading(false), 500);
    }, [existingEnrollment, navigate]);

    if (!cert) return <div className="p-20 text-center">Invalid certification</div>;

    const installmentAmount = Math.ceil(cert.price_inr / 3);
    const totalToday = plan === 'full' ? cert.price_inr : installmentAmount;

    const today = new Date();
    const nextMonth = new Date(today); nextMonth.setDate(today.getDate() + 30);
    const monthAfter = new Date(today); monthAfter.setDate(today.getDate() + 60);

    const applicableWallet = Math.min(balance || 0, totalToday);
    const finalTotal = totalToday - applicableWallet;

    const handleTransaction = async (isSuccess: boolean) => {
        setProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setProcessing(false);

        if (isSuccess) {
            const enrollmentId = `ENR-${Date.now()}`;
            const fullName = (location.state as any)?.fullName;

            const newEnrollment: Enrollment = {
                id: enrollmentId,
                certificationId: cert.id,
                certificationName: cert.name,
                slug: cert.slug,
                badgeColor: cert.badgeColor,
                enrollmentDate: new Date().toISOString().split('T')[0],
                paymentStatus: plan === 'full' ? 'Paid' : 'Partial',
                paymentPlan: plan,
                amountPaid: totalToday,
                totalAmount: cert.price_inr,
                installmentsPaidCount: 1,
                completionPercentage: 0,
                modulesCompleted: 0,
                nextInstallmentDue: plan === 'installment'
                    ? nextMonth.toISOString()
                    : undefined,
                userName: fullName,
                certId: Math.random().toString(36).substring(2, 8).toUpperCase(),
            };

            justPaid.current = true;
            addEnrollment(newEnrollment);

            if (applicableWallet > 0) {
                try {
                    await applyWalletToPayment({
                        referenceId: enrollmentId,
                        referenceType: 'certification',
                        amount: Math.round(applicableWallet * 100), // amountMinor
                    });
                } catch (err) {
                    console.warn('Failed to apply wallet credits:', err);
                }
            }

            // ── Navigate to the enrollment confirmed/success page ──────────
            navigate('/enrollment-confirmed', {
                state: {
                    certName: cert.name,
                    enrollmentId,
                    fullName,
                    slug: cert.slug,
                },
            });
        } else {
            navigate(`/payment-failed?slug=${cert.slug}`);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <CardSkeleton />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <SEO title={`Checkout - ${cert.name} | MANAS360`} />

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">

                {/* ── Order Summary ── */}
                <div className="space-y-6">
                    <h1 className="text-3xl font-serif font-bold text-slate-800">Checkout</h1>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h2 className="text-sm uppercase tracking-wide text-slate-500 font-bold mb-4">
                            Order Summary
                        </h2>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{cert.name}</h3>
                                <p className="text-sm text-slate-500">
                                    {cert.duration_weeks} Weeks • {cert.tier} Tier
                                </p>
                            </div>
                            <div className={`
                                w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold
                                ${cert.badgeColor === 'purple' ? 'bg-purple-600' : 'bg-blue-500'}
                            `}>
                                {cert.name.charAt(0)}
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>{cert.modulesCount} Modules</span>
                                <span>Included</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Certification Fee</span>
                                <span>₹{cert.price_inr.toLocaleString()}</span>
                            </div>
                            {plan === 'installment' && (
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>Installment Fee</span>
                                    <span>₹0</span>
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
                            <span>
                                {finalTotal === 0 ? 'Free' : `₹${finalTotal.toLocaleString()}`}
                            </span>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                        <ShieldCheck className="text-blue-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-blue-800">30-Day Money Back Guarantee</p>
                            <p className="text-xs text-blue-600 mt-1">
                                If you're not satisfied, get a full refund within 30 days. No questions asked.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Payment Panel ── */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 h-fit">
                    {cert.price_inr === 0 ? (
                        <div className="text-center py-8">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Free Enrollment</h3>
                            <button
                                onClick={() => handleTransaction(true)}
                                disabled={processing}
                                className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition disabled:opacity-50"
                            >
                                {processing ? 'Enrolling...' : 'Confirm Enrollment'}
                            </button>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold text-slate-800 mb-6">Select Payment Plan</h3>

                            <div className="space-y-4 mb-8">
                                {/* Full payment option */}
                                <div
                                    onClick={() => setPlan('full')}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${plan === 'full'
                                            ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600'
                                            : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-800">Pay in Full</span>
                                        {plan === 'full' && <CheckCircle size={20} className="text-purple-600" />}
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900 mt-2">
                                        ₹{cert.price_inr.toLocaleString()}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Save instant access fees</p>
                                </div>

                                {/* Installment option */}
                                <div
                                    onClick={() => setPlan('installment')}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${plan === 'installment'
                                            ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600'
                                            : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-800">3 Monthly Installments</span>
                                        {plan === 'installment' && <CheckCircle size={20} className="text-purple-600" />}
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900 mt-2">
                                        ₹{installmentAmount.toLocaleString()}{' '}
                                        <span className="text-sm font-normal text-slate-500">/mo</span>
                                    </div>

                                    {plan === 'installment' && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Calendar size={12} className="text-purple-500" />
                                                <span>
                                                    Payment 2: ₹{installmentAmount.toLocaleString()} due{' '}
                                                    {nextMonth.toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Calendar size={12} className="text-purple-500" />
                                                <span>
                                                    Payment 3: ₹{installmentAmount.toLocaleString()} due{' '}
                                                    {monthAfter.toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pay button */}
                            <button
                                onClick={() => handleTransaction(true)}
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

                            <div className="flex items-center justify-center gap-2 text-slate-300 text-xs mb-8">
                                <CreditCard size={14} /> Secure Mock Payment
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};