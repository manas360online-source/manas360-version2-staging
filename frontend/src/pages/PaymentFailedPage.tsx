import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, RefreshCcw, ArrowLeft } from 'lucide-react';
import { SEO } from '../components/CertificationSEO';
import { CERTIFICATIONS } from '../CertificationConstants';

export const PaymentFailedPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const slug = searchParams.get('slug');
    const cert = CERTIFICATIONS.find(c => c.slug === slug);

    const handleRetry = () => {
        if (slug) {
            navigate(`/checkout/${slug}`);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <SEO title="Payment Failed" />
            <div className="bg-white p-12 rounded-3xl shadow-xl max-w-lg w-full text-center animate-fade-in-up border border-slate-100">
                <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <XCircle size={48} />
                </div>
                
                <h1 className="text-3xl font-serif font-bold text-slate-800 mb-2">Payment Failed</h1>
                <p className="text-slate-600 mb-8">
                    We couldn't process your transaction for <span className="font-bold">{cert?.name}</span>. This might be due to a network error or declined card (simulation).
                </p>

                <div className="space-y-3">
                    <button 
                        onClick={handleRetry}
                        className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
                    >
                        <RefreshCcw size={18} /> Retry Payment
                    </button>
                    
                    {slug && (
                        <button 
                            onClick={() => navigate(`/certification/${slug}`)}
                            className="w-full bg-white border border-slate-200 text-slate-600 py-4 rounded-xl font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={18} /> Back to Certification Details
                        </button>
                    )}
                    
                    <button 
                        onClick={() => navigate('/')}
                        className="w-full text-slate-400 text-sm hover:text-slate-600 py-2"
                    >
                        Cancel and Return Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentFailedPage;
