import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';
import { SEO } from '../components/CertificationSEO';
import { CERTIFICATIONS } from '../CertificationConstants';
import { useEnrollmentStore } from '../store/CertificationEnrollmentStore';
import { Enrollment } from '../CertificationTypes';

export const PaymentSuccessPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const slug = searchParams.get('slug');
    const plan = searchParams.get('plan');

    const cert = CERTIFICATIONS.find(c => c.slug === slug);
    const { addEnrollment, getEnrollmentBySlug } = useEnrollmentStore();

    const isSuccess = searchParams.get('success') === 'true';
    const txnId = searchParams.get('txnId');

    // Handle Enrollment Creation
    React.useEffect(() => {
        if (isSuccess && cert && plan && txnId) {
            // Check if already enrolled to avoid duplicates
            if (getEnrollmentBySlug(cert.slug)) {
                return;
            }

            const installmentAmount = Math.ceil(cert.price_inr / 3);
            const totalPaid = plan === 'full' ? cert.price_inr : installmentAmount;

            // Create Enrollment
            const newEnrollment: Enrollment = {
                id: `ENR-${Date.now()}`,
                certificationId: cert.id,
                certificationName: cert.name,
                slug: cert.slug,
                badgeColor: cert.badgeColor,
                enrollmentDate: new Date().toISOString().split('T')[0],
                paymentStatus: plan === 'full' ? 'Paid' : 'Partial',
                paymentPlan: plan as 'full' | 'installment',
                amountPaid: totalPaid,
                totalAmount: cert.price_inr,
                installmentsPaidCount: 1,
                completionPercentage: 0,
                modulesCompleted: 0,
                nextInstallmentDue: plan === 'installment'
                    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    : undefined
            };

            addEnrollment(newEnrollment);
        }
    }, [isSuccess, cert, plan, txnId, addEnrollment, getEnrollmentBySlug]);

    if (!isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-slate-800">Processing Payment...</h1>
                    <p className="text-slate-500">Please wait while we confirm your enrollment.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <SEO title="Enrollment Successful | MANAS360" />
            <div className="bg-white p-12 rounded-3xl shadow-xl max-w-lg w-full text-center animate-fade-in-up border border-slate-100">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 mx-auto animate-bounce">
                    <CheckCircle size={48} />
                </div>

                <h1 className="text-3xl font-serif font-bold text-slate-800 mb-2">Payment Successful!</h1>
                <p className="text-slate-600 mb-6">
                    You have successfully enrolled in <br />
                    <span className="font-bold text-slate-900">{cert ? cert.name : 'your certification'}</span>.
                </p>

                {plan && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8 text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-slate-500">Payment Plan</span>
                            <span className="font-bold text-slate-800 capitalize">{plan === 'full' ? 'One-time Payment' : 'Installments'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Status</span>
                            <span className="font-bold text-green-600">{plan === 'full' ? 'Completed' : 'Partial Payment'}</span>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/my-certifications')}
                        className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
                    >
                        Go to My Certifications <ArrowRight size={20} />
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-white border border-slate-200 text-slate-600 py-4 rounded-xl font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-2"
                    >
                        <Home size={18} /> Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};
