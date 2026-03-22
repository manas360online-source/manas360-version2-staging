import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CERTIFICATIONS } from '../CertificationConstants';
import { Breadcrumbs } from '../components/CertificationBreadcrumbs';
import { Skeleton, TextSkeleton } from '../components/CertificationSkeleton';
import { Check, Clock, Calendar, DollarSign, Award, ChevronDown, ChevronUp, PlayCircle, FileText, Star, ShieldCheck } from 'lucide-react';
import { SEO } from '../components/CertificationSEO';

export const CertificationDetailsPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'modules' | 'faq'>('modules');
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const cert = CERTIFICATIONS.find(c => c.slug === slug);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, [slug]);

    const handleEnroll = () => {
        navigate('/registration', {
            state: {
                certName: cert?.name,
                price: cert?.price_inr === 0 ? 'Free' : `₹${cert?.price_inr.toLocaleString()}`,
                slug: cert?.slug,
            }
        });
    };

    if (!cert && !loading) return <div className="p-20 text-center">Certification not found</div>;

    const schema = cert ? {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": cert.name,
        "description": cert.description,
        "provider": {
            "@type": "Organization",
            "name": "MANAS360",
            "sameAs": "https://www.manas360.com"
        }
    } : undefined;

    return (
        <div className="bg-slate-50 min-h-screen pb-24 md:pb-20">
            {cert && (
                <SEO
                    title={`${cert.name} | MANAS360 Certification`}
                    description={cert.description}
                    schema={schema}
                />
            )}

            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
                    {!loading && cert && (
                        <div className="hidden md:block">
                            <Breadcrumbs
                                items={[
                                    { label: 'Certifications', path: '/' },
                                    { label: cert.name }
                                ]}
                            />
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2 md:mt-4">
                        <div className="w-full md:w-2/3">
                            {loading ? (
                                <>
                                    <Skeleton className="h-6 w-24 rounded-full mb-4" />
                                    <Skeleton className="h-10 w-3/4 mb-4" />
                                    <Skeleton className="h-4 w-full" />
                                </>
                            ) : (
                                <>
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide mb-3 ${cert!.tier === 'Mastery' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {cert!.tier} Level
                                    </span>
                                    <h1 className="text-2xl md:text-4xl font-serif font-bold text-slate-900 mb-3 leading-tight">{cert!.name}</h1>
                                    <p className="text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">{cert!.description}</p>
                                </>
                            )}
                        </div>

                        <div className="hidden md:block bg-slate-50 p-5 rounded-xl border border-slate-100 min-w-[220px]">
                            {loading ? (
                                <>
                                    <Skeleton className="h-4 w-20 mb-2" />
                                    <Skeleton className="h-8 w-32" />
                                </>
                            ) : (
                                <>
                                    <p className="text-slate-500 text-xs mb-1">Investment</p>
                                    <p className="text-2xl font-bold text-slate-900">
                                        {cert!.price_inr === 0 ? 'Free' : `₹${cert!.price_inr.toLocaleString()}`}
                                    </p>
                                    {cert!.price_inr > 0 && <p className="text-xs text-purple-600 mt-1 font-medium">EMI Available</p>}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

                {/* Mobile Price Card (Visible only on small screens) */}
                {!loading && cert && (
                    <div className="md:hidden bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-slate-500 text-xs">Investment</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {cert.price_inr === 0 ? 'Free' : `₹${cert.price_inr.toLocaleString()}`}
                                </p>
                            </div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base
                    ${cert.badgeColor === 'purple' ? 'bg-purple-600' : 'bg-blue-500'}
                 `}>
                                {cert.name.charAt(0)}
                            </div>
                        </div>
                        <button
                            onClick={handleEnroll}
                            className="w-full bg-gradient-to-r from-teal-500 to-purple-600 text-white font-bold py-3 rounded-lg shadow-md text-sm"
                        >
                            Enroll Now
                        </button>
                    </div>
                )}

                {/* Main Content */}
                <div className="md:col-span-2 space-y-6 md:space-y-8">

                    {/* Key Stats */}
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm h-20 flex flex-col justify-center">
                                    <Skeleton className="h-3 w-8 mb-2" />
                                    <Skeleton className="h-3 w-16 mb-1" />
                                    <Skeleton className="h-4 w-20" />
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <Clock className="text-purple-500 mb-2" size={18} />
                                    <p className="text-[10px] md:text-xs text-slate-500">Duration</p>
                                    <p className="font-bold text-slate-800 text-sm md:text-base">{cert!.duration_weeks} Weeks</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <Calendar className="text-teal-500 mb-2" size={18} />
                                    <p className="text-[10px] md:text-xs text-slate-500">Modules</p>
                                    <p className="font-bold text-slate-800 text-sm md:text-base">{cert!.modulesCount}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <DollarSign className="text-green-500 mb-2" size={18} />
                                    <p className="text-[10px] md:text-xs text-slate-500">Potential</p>
                                    <p className="font-bold text-slate-800 text-sm md:text-base">₹{(cert!.monthly_income_max_inr / 1000).toFixed(0)}k/mo</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <Award className="text-orange-500 mb-2" size={18} />
                                    <p className="text-[10px] md:text-xs text-slate-500">Badge</p>
                                    <p className="font-bold text-slate-800 text-sm md:text-base capitalize">{cert!.badgeColor}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Requirements Checklist */}
                    {loading ? (
                        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
                            <Skeleton className="h-6 w-48 mb-4" />
                            <TextSkeleton />
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-5 md:p-6 border border-slate-100 shadow-sm">
                            <h3 className="font-serif font-bold text-lg md:text-xl text-slate-800 mb-4">Certification Requirements</h3>
                            <ul className="space-y-3">
                                {cert!.requirements.map((req, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="mt-0.5 bg-green-100 rounded-full p-0.5 flex-shrink-0">
                                            <Check size={12} className="text-green-600" />
                                        </div>
                                        <span className="text-slate-700 text-sm">{req}</span>
                                    </li>
                                ))}
                                {cert!.prerequisites.length > 0 && cert!.prerequisites[0] !== "None" && (
                                    <li className="flex items-start gap-3">
                                        <div className="mt-0.5 bg-amber-100 rounded-full p-0.5 flex-shrink-0">
                                            <ShieldCheck size={12} className="text-amber-600" />
                                        </div>
                                        <span className="text-slate-700 font-medium text-sm">Prerequisite: {cert!.prerequisites.join(", ")}</span>
                                    </li>
                                )}
                            </ul>
                            <div className="mt-6">
                                <button onClick={() => window.open(cert!.syllabusPdfUrl, '_blank')} className="flex items-center text-purple-600 font-bold hover:text-purple-700 transition text-xs md:text-sm">
                                    <FileText size={16} className="mr-2" />
                                    Download Detailed Syllabus (PDF)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Certificate Preview */}
                    {!loading && (
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 md:p-8 text-center text-white relative overflow-hidden">
                            <div className="relative z-10 flex flex-col items-center">
                                <Award size={32} className="mx-auto text-yellow-400 mb-3" />
                                <h3 className="font-serif font-bold text-lg md:text-xl mb-1">Earn Your Certificate</h3>
                                <p className="text-slate-300 mb-6 max-w-md mx-auto text-xs md:text-sm">
                                    Upon successful completion, you will receive a verifiable digital certificate.
                                </p>

                                <div className="hidden sm:flex bg-white text-slate-900 p-4 rounded-sm shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500 w-full max-w-[200px] aspect-[1/1.414] relative text-[0.4rem] flex-col items-center border border-slate-200">
                                    <div className="absolute inset-1.5 border border-blue-100 pointer-events-none"></div>
                                    <div className="absolute top-2 right-2 bg-purple-600 text-white px-1 py-0.5 rounded-full text-[4px] font-bold flex items-center gap-0.5">
                                        <Check size={4} /> CERTIFIED
                                    </div>
                                    <div className="mt-4 text-center">
                                        <div className="font-serif font-bold text-blue-900 text-[6px] tracking-wide">MANAS360</div>
                                    </div>
                                    <div className="mt-2 font-serif font-bold text-blue-600 text-[5px] text-center px-2 leading-tight">
                                        {cert!.name}
                                    </div>
                                    <div className="mt-2 flex-1 flex flex-col items-center justify-center w-full px-2 text-center">
                                        <p className="font-serif font-bold text-[8px] text-slate-900 mb-1">Sudhanshu</p>
                                        <p className="font-bold text-blue-600 text-[6px] mb-1">{cert!.name}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2"></div>
                            <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl translate-x-1/2 translate-y-1/2"></div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div>
                        <div className="flex border-b border-slate-200 mb-4 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('modules')}
                                className={`pb-2 pr-5 font-medium text-sm md:text-base transition-colors whitespace-nowrap ${activeTab === 'modules' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Curriculum
                            </button>
                            <button
                                onClick={() => setActiveTab('faq')}
                                className={`pb-2 px-5 font-medium text-sm md:text-base transition-colors whitespace-nowrap ${activeTab === 'faq' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                FAQ
                            </button>
                        </div>

                        {loading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-16 w-full rounded-lg" />
                                <Skeleton className="h-16 w-full rounded-lg" />
                            </div>
                        ) : (
                            <>
                                {activeTab === 'modules' && (
                                    <div className="space-y-3">
                                        {cert!.modules.map((module, i) => (
                                            <div key={module.id} className="bg-white border border-slate-100 rounded-lg p-3 md:p-4 hover:border-purple-200 transition-colors shadow-sm">
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center">
                                                        <span className="bg-slate-100 text-slate-500 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs mr-2 flex-shrink-0">
                                                            {i + 1}
                                                        </span>
                                                        {module.title}
                                                    </h3>
                                                    <span className="text-slate-400 text-xs flex items-center whitespace-nowrap ml-2">
                                                        <PlayCircle size={12} className="mr-1" />
                                                        {module.duration_minutes} min
                                                    </span>
                                                </div>
                                                <div className="pl-7 md:pl-8">
                                                    <ul className="list-disc list-inside text-slate-600 text-xs space-y-0.5">
                                                        {module.topics.map((topic, idx) => (
                                                            <li key={idx}>{topic}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'faq' && (
                                    <div className="space-y-3">
                                        {cert!.faqs.map((faq, i) => (
                                            <div key={i} className="bg-white border border-slate-100 rounded-lg overflow-hidden shadow-sm">
                                                <button
                                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                                    className="w-full text-left p-3 md:p-4 flex justify-between items-center font-medium text-slate-800 text-sm"
                                                >
                                                    {faq.question}
                                                    {openFaq === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                                {openFaq === i && (
                                                    <div className="px-3 pb-3 md:px-4 md:pb-4 text-slate-600 text-xs leading-relaxed border-t border-slate-50 pt-3 bg-slate-50/50">
                                                        {faq.answer}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                </div>

                {/* Sidebar */}
                <div className="md:col-span-1 space-y-6">
                    {!loading && cert && (
                        <div className="hidden md:block bg-white rounded-xl shadow-lg shadow-slate-200 p-5 sticky top-24 border border-slate-100">
                            <h3 className="font-bold text-lg text-slate-900 mb-3">Ready to start?</h3>
                            <div className="space-y-2 mb-5">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Check size={14} className="text-green-500" />
                                    <span>Instant Access</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Check size={14} className="text-green-500" />
                                    <span>Mobile Friendly</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Check size={14} className="text-green-500" />
                                    <span>Official Certification</span>
                                </div>
                            </div>

                            <button
                                onClick={handleEnroll}
                                className="w-full bg-gradient-to-r from-teal-500 to-purple-600 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] transition-all text-sm"
                            >
                                Enroll Now
                            </button>
                            <p className="text-center text-[10px] text-slate-400 mt-2">30-day money-back guarantee</p>
                        </div>
                    )}

                    {/* Testimonials */}
                    {!loading && cert && (
                        <div>
                            <h4 className="font-serif font-bold text-slate-800 text-base mb-3">What Students Say</h4>
                            <div className="space-y-3">
                                {cert.testimonials.map(t => (
                                    <div key={t.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                        <div className="flex text-yellow-400 mb-1.5">
                                            {Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                                        </div>
                                        <p className="text-slate-600 italic text-xs mb-2">"{t.text}"</p>
                                        <div className="flex items-center gap-2">
                                            <img src={t.avatar} alt={t.name} className="w-6 h-6 rounded-full" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">{t.name}</p>
                                                <p className="text-[10px] text-slate-500">{t.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <TextSkeleton />
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Sticky Enrollment Button */}
            {!loading && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={handleEnroll}
                        className="w-full bg-gradient-to-r from-teal-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg text-sm"
                    >
                        Enroll Now
                    </button>
                </div>
            )}
        </div>
    );
};
