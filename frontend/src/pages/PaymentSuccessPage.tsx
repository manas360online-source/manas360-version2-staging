import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';
import { SEO } from '../components/CertificationSEO';
import { CERTIFICATIONS } from '../CertificationConstants';

export const PaymentSuccessPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const slug = searchParams.get('slug');
    const plan = searchParams.get('plan');
    
    const cert = CERTIFICATIONS.find(c => c.slug === slug);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <SEO title="Enrollment Successful" />
            <div className="bg-white p-12 rounded-3xl shadow-xl max-w-lg w-full text-center animate-fade-in-up border border-slate-100">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 mx-auto animate-bounce">
                    <CheckCircle size={48} />
                </div>
                
                <h1 className="text-3xl font-serif font-bold text-slate-800 mb-2">Payment Successful!</h1>
                <p className="text-slate-600 mb-6">
                    You have successfully enrolled in <br/>
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

export default PaymentSuccessPage;
