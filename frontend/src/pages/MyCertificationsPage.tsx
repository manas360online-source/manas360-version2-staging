import React, { useState } from 'react';
import { BookOpen, CheckCircle, Clock, ArrowRight, Loader2, RefreshCcw, Download, AlertCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/CertificationSEO';
import { useEnrollmentStore } from '../store/CertificationEnrollmentStore';
import { CERTIFICATIONS } from '../CertificationConstants';
import { Enrollment } from '../CertificationTypes';
import { useAuth } from '../context/AuthContext';

export const MyCertificationsPage: React.FC = () => {
    const { enrollments, payInstallment, clearEnrollments, syncEnrollments, loading } = useEnrollmentStore();
    const navigate = useNavigate();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { user, becomeProvider } = useAuth();

    React.useEffect(() => {
        void syncEnrollments();
    }, [syncEnrollments]);

    if (loading && enrollments.length === 0) return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
            <Loader2 size={40} className="animate-spin text-emerald-600" />
        </div>
    );

    const displayedEnrollments = enrollments;

    const handlePayInstallment = async (enrollment: Enrollment) => {
        setProcessingId(enrollment.id);
        await new Promise(resolve => setTimeout(resolve, 1500));
        payInstallment(enrollment.id);
        setProcessingId(null);
        alert("Payment Successful! Installment recorded.");
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear all certification data? This action cannot be undone.")) {
            clearEnrollments();
            alert("All certification data has been cleared.");
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'Paid') {
            return (
                <span className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wide bg-green-100 text-green-700 flex items-center gap-1 w-fit border border-green-200">
                    <CheckCircle size={12} /> Fully Paid
                </span>
            );
        } else if (status === 'Partial') {
            return (
                <span className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-700 flex items-center gap-1 w-fit border border-amber-200">
                    <Clock size={12} /> Partially Paid
                </span>
            );
        } else {
            return (
                <span className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wide bg-slate-100 text-slate-600 flex items-center gap-1 w-fit border border-slate-200">
                    <AlertCircle size={12} /> Payment Pending
                </span>
            );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 md:py-12 md:px-8">
            <SEO title="My Certifications | MANAS360" />
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 mb-2">My Certifications</h1>
                        <p className="text-slate-600 text-sm md:text-base">Track your progress, installments, and achievements.</p>
                        
                        {user?.role === 'learner' && (
                            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 mb-4 mt-6 w-full">
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-xl font-bold mb-1">Advance Your Career</h3>
                                    <p className="text-emerald-50 opacity-90 text-sm">Ready to help others professionally? Join the MANAS360 provider network today.</p>
                                </div>
                                <button 
                                    onClick={async () => {
                                        if (window.confirm("Switch to Provider Role? You will be directed to the onboarding setup.")) {
                                            await becomeProvider();
                                            navigate('/onboarding/provider-setup');
                                        }
                                    }}
                                    className="bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-50 transition shadow-lg shrink-0"
                                >
                                    Become a Full Provider →
                                </button>
                            </div>
                        )}
                    </div>
                    {enrollments.length > 0 && (
                        <button
                            onClick={handleReset}
                            className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition flex items-center gap-2"
                        >
                            <Trash2 size={16} /> Reset All Data
                        </button>
                    )}
                </div>

                {displayedEnrollments.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 md:p-12 text-center border border-slate-100 shadow-sm animate-fade-in-up">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BookOpen size={32} className="text-slate-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">No Active Enrollments</h2>
                        <p className="text-slate-500 max-w-md mx-auto mb-8 text-sm md:text-base">
                            You haven't enrolled in any certifications yet. Start your journey to mastery today.
                        </p>
                        <button
                            onClick={() => navigate('/certifications')}
                            className="w-full sm:w-auto bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 transition inline-flex justify-center items-center gap-2 shadow-lg shadow-purple-200"
                        >
                            Explore Certifications <ArrowRight size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {displayedEnrollments.map((enrollment: Enrollment) => {
                            const certDetails = CERTIFICATIONS.find(c => c.id === enrollment.certificationId);
                            const isProcessing = processingId === enrollment.id;
                            const isFullyPaid = enrollment.paymentStatus === 'Paid';

                            return (
                                <div key={enrollment.id} className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-6 md:gap-8 items-start animate-fade-in-up">
                                    {/* Icon & Basic Info */}
                                    <div className="flex flex-row gap-4 md:gap-6 w-full lg:w-1/3">
                                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-bold text-2xl md:text-3xl shadow-lg
                                            ${enrollment.badgeColor === 'purple' ? 'bg-purple-600' :
                                                enrollment.badgeColor === 'blue' ? 'bg-blue-500' :
                                                    enrollment.badgeColor === 'green' ? 'bg-green-500' :
                                                        enrollment.badgeColor === 'yellow' ? 'bg-yellow-500' :
                                                            enrollment.badgeColor === 'orange' ? 'bg-orange-500' : 'bg-red-500'}
                                        `}>
                                            {enrollment.certificationName.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1 leading-tight">{enrollment.certificationName}</h3>
                                            <p className="text-xs md:text-sm text-slate-500 mb-2 md:mb-3">Enrolled on {enrollment.enrollmentDate}</p>
                                            {getStatusBadge(enrollment.paymentStatus)}

                                        </div>
                                    </div>

                                    {/* Progress & Installments */}
                                    <div className="flex-grow w-full lg:w-1/3 space-y-4 md:space-y-6">
                                        {/* Course Progress */}
                                        <div>
                                            <div className="flex justify-between text-xs font-semibold mb-2">
                                                <span className="text-slate-600">Course Progress</span>
                                                <span className="text-purple-600">{enrollment.completionPercentage}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-600 rounded-full transition-all duration-1000"
                                                    style={{ width: `${enrollment.completionPercentage}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">
                                                {enrollment.modulesCompleted} / {certDetails?.modulesCount || 0} Modules Completed
                                            </p>
                                        </div>

                                        {/* Installment Tracker (Only if installment plan) */}
                                        {enrollment.paymentPlan === 'installment' && (
                                            <div>
                                                <div className="flex justify-between text-xs font-semibold mb-2">
                                                    <span className="text-slate-600">Installment Plan</span>
                                                    {enrollment.nextInstallmentDue && !isFullyPaid && (
                                                        <span className="text-amber-600 block text-right sm:inline">Next Due: {new Date(enrollment.nextInstallmentDue).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 mb-1">
                                                    {[1, 2, 3].map((i) => (
                                                        <div key={i} className={`h-2 flex-1 rounded-full ${i <= enrollment.installmentsPaidCount ? 'bg-green-500' : 'bg-slate-200'
                                                            }`} />
                                                    ))}
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">{enrollment.installmentsPaidCount} of 3 Paid</span>
                                                    <span className="text-slate-500 font-medium">₹{enrollment.amountPaid.toLocaleString()} / ₹{enrollment.totalAmount.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 md:gap-3 w-full lg:w-auto lg:min-w-[200px]">
                                        <button
                                        onClick={() => navigate(`/certifications/modules/${enrollment.id}`)}
                                        className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-200 w-full"
                                        >
                                            <BookOpen size={16} /> Continue Learning
                                            </button>
                                        {enrollment.paymentStatus === 'Pending' && (
                                            <button
                                                onClick={() => navigate(`/checkout/${enrollment.slug}`)}
                                                className="px-6 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium text-sm hover:bg-red-100 transition flex items-center justify-center gap-2 w-full"
                                            >
                                                <RefreshCcw size={16} /> Retry Payment
                                            </button>
                                        )}

                                        {enrollment.paymentPlan === 'installment' && !isFullyPaid && (
                                            <button
                                                onClick={() => handlePayInstallment(enrollment as Enrollment)}
                                                disabled={isProcessing}
                                                className="px-6 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-medium text-sm hover:bg-amber-100 transition flex items-center justify-center gap-2 disabled:opacity-70 w-full"
                                            >
                                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                                                {isProcessing ? 'Processing...' : 'Pay Next Installment'}
                                            </button>
                                        )}

                                        {enrollment.completionPercentage === 100 && (
                                            <button
                                                onClick={() => navigate(`/certifications/certificate/${enrollment.id}`)}
                                                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 w-full"
                                            >
                                                <Download size={16} /> View & Download Certificate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
};

export default MyCertificationsPage;
