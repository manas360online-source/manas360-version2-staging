import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Certification, BadgeColor } from '../CertificationTypes';
import { useAuth } from '../context/AuthContext';
import { useEnrollmentStore } from '../store/CertificationEnrollmentStore';
import { getCertificationsErrorMessage, registerCertificationEnrollment } from '../api/certifications';

interface JourneyMapProps {
  certifications: Certification[];
}

// Map styles exactly to the HTML reference
const getStyles = (color: BadgeColor) => {
  switch (color) {
    case 'blue': return { 
      border: 'border-blue-500', 
      badgeBg: 'bg-blue-500', 
      text: 'text-blue-600',
      lightBg: 'bg-blue-50',
      shadow: 'shadow-blue-100'
    };
    case 'green': return { 
      border: 'border-emerald-500', 
      badgeBg: 'bg-emerald-500', 
      text: 'text-emerald-600',
      lightBg: 'bg-emerald-50',
      shadow: 'shadow-emerald-100'
    };
    case 'yellow': return { 
      border: 'border-amber-500', 
      badgeBg: 'bg-amber-500', 
      text: 'text-amber-600',
      lightBg: 'bg-amber-50',
      shadow: 'shadow-amber-100'
    };
    case 'orange': return { 
      border: 'border-orange-500', 
      badgeBg: 'bg-orange-500', 
      text: 'text-orange-600',
      lightBg: 'bg-orange-50',
      shadow: 'shadow-orange-100'
    };
    case 'red': return { 
      border: 'border-red-500', 
      badgeBg: 'bg-red-500', 
      text: 'text-red-600',
      lightBg: 'bg-red-50',
      shadow: 'shadow-red-100'
    };
    case 'purple': return { 
      border: 'border-purple-600', 
      badgeBg: 'bg-purple-600', // Or gradient
      text: 'text-purple-600',
      lightBg: 'bg-purple-50',
      shadow: 'shadow-purple-100'
    };
    default: return { 
      border: 'border-slate-500', 
      badgeBg: 'bg-slate-500', 
      text: 'text-slate-600',
      lightBg: 'bg-slate-50',
      shadow: 'shadow-slate-100'
    };
  }
};

const JourneyLevelItem: React.FC<{
  title: string;
  description: string;
  tags: { label: string; color: BadgeColor }[];
  borderHex: string;
  icon: string;
  isMastery?: boolean;
}> = ({ title, description, tags, borderHex, icon, isMastery }) => (
  <div 
    className={`
      flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-8 p-5 md:p-8 rounded-2xl md:rounded-3xl border-l-[6px] md:border-l-[8px] 
      transition-all duration-300 hover:shadow-[0_10px_30px_rgba(13,148,136,0.1)]
      ${isMastery ? 'bg-gradient-to-br from-purple-50/50 to-pink-50/50' : 'bg-gradient-to-br from-teal-50/10 to-purple-50/10'}
    `} 
    style={{ borderLeftColor: borderHex }}
  >
    <div className="text-4xl md:text-6xl flex-shrink-0 leading-none mb-3 md:mb-0">{icon}</div>
    <div className="flex-1 w-full">
      <h3 className="font-serif text-xl md:text-2xl font-bold text-slate-900 mb-2 leading-tight">{title}</h3>
      <p className="text-slate-700 text-sm md:text-base mb-4 leading-relaxed">{description}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, idx) => (
           <span key={idx} className="px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs font-semibold bg-white/80 text-slate-700 whitespace-nowrap border border-slate-200 shadow-sm">
             {tag.label}
           </span>
        ))}
      </div>
    </div>
  </div>
);

const IncentivesBanner: React.FC = () => (
  <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-6 md:p-10 rounded-2xl md:rounded-[24px] mb-12 md:mb-20 relative overflow-hidden shadow-xl">
    {/* Background Watermark */}
    <div className="absolute -top-10 -right-10 text-[120px] md:text-[250px] opacity-10 transform rotate-12 pointer-events-none">🎁</div>
    
    <div className="relative z-10 max-w-6xl">
      <h2 className="font-serif text-2xl md:text-3xl font-black mb-2 md:mb-3">🎁 Special Incentives</h2>
      <p className="text-base md:text-lg opacity-90 mb-6 md:mb-8 font-medium">Get exclusive benefits that accelerate your practice growth</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/15 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/20">
           <div className="text-2xl md:text-3xl mb-2 md:mb-3">⚡</div>
           <strong className="block text-base md:text-lg font-bold mb-1">Lead Priority</strong>
           <p className="text-xs md:text-sm opacity-90 leading-relaxed">24hr access to new patient referrals</p>
        </div>
        <div className="bg-white/15 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/20">
           <div className="text-2xl md:text-3xl mb-2 md:mb-3">📈</div>
           <strong className="block text-base md:text-lg font-bold mb-1">Visibility</strong>
           <p className="text-xs md:text-sm opacity-90 leading-relaxed">Premium listing at top of search</p>
        </div>
        <div className="bg-white/15 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/20">
           <div className="text-2xl md:text-3xl mb-2 md:mb-3">💰</div>
           <strong className="block text-base md:text-lg font-bold mb-1">Flexible Pay</strong>
           <p className="text-xs md:text-sm opacity-90 leading-relaxed">3 easy installments available</p>
        </div>
        <div className="bg-white/15 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/20">
           <div className="text-2xl md:text-3xl mb-2 md:mb-3">🎓</div>
           <strong className="block text-base md:text-lg font-bold mb-1">Lifetime Access</strong>
           <p className="text-xs md:text-sm opacity-90 leading-relaxed">All training materials & updates</p>
        </div>
      </div>
    </div>
  </div>
);

const CertificationCard: React.FC<{ cert: Certification }> = ({ cert }) => {
  const styles = getStyles(cert.badgeColor);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addEnrollment, getEnrollmentBySlug } = useEnrollmentStore();
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inProviderShell = location.pathname.startsWith('/provider');
  const detailPath = inProviderShell ? `/provider/certifications/${cert.slug}` : `/certifications/${cert.slug}`;
  const enrollPath = inProviderShell
    ? `/provider/certification/enroll/${cert.slug}`
    : `/certification/enroll/${cert.slug}`;
  const guestAuthPath = `/auth/signup?next=${encodeURIComponent(enrollPath)}`;
  const myCertificationsPath = inProviderShell ? '/provider/my-certifications' : '/my-certifications';

  const startCertificationNow = async () => {
    if (!user) {
      navigate(guestAuthPath);
      return;
    }

    if (getEnrollmentBySlug(cert.slug)) {
      navigate(myCertificationsPath);
      return;
    }

    setError(null);
    setProcessing(true);

    const isFree = cert.price_inr === 0;

    if (!isFree) {
      navigate(`/checkout/${cert.slug}`);
      return;
    }

    try {
      const result = await registerCertificationEnrollment({
        certSlug: cert.slug,
        paymentPlan: 'full',
        installmentCount: 1,
        bypassPayment: true,
      });

      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      if (status !== 409) {
        setError(getCertificationsErrorMessage(err, 'Unable to start enrollment. Please try again.'));
        setProcessing(false);
        return;
      }
      
      // If 409, they are already enrolled remotely. Don't create duplicate, just navigate.
      navigate(myCertificationsPath);
      setProcessing(false);
      return;
    }

    const newEnrollment = {
      id: `ENR-${Date.now()}`,
      certificationId: cert.id,
      certificationName: cert.name,
      slug: cert.slug,
      badgeColor: cert.badgeColor,
      enrollmentDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'Paid',
      paymentPlan: 'full' as const,
      amountPaid: cert.price_inr,
      totalAmount: cert.price_inr,
      installmentsPaidCount: 1,
      completionPercentage: 0,
      modulesCompleted: 0,
      certId: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };

    addEnrollment(newEnrollment as any);
    navigate(myCertificationsPath);
    setProcessing(false);
  };

  return (
    <div 
      onClick={() => navigate(detailPath)}
      className={`
        group relative bg-white rounded-2xl p-5 md:p-7 shadow-[0_4px_12px_rgba(0,0,0,0.05)] 
        hover:shadow-[0_15px_40px_rgba(0,0,0,0.1)] transition-all duration-400 
        hover:-translate-y-1 cursor-pointer border-t-[4px] md:border-t-[6px] flex flex-col h-full
        ${styles.border}
      `}
    >
      {/* Badge */}
      <div className={`
        w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 shadow-md text-white
        ${cert.tier === 'Mastery' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : styles.badgeBg}
      `}>
        {cert.name.charAt(0)}
      </div>

      <h3 className="font-serif text-lg md:text-2xl leading-tight font-bold text-slate-900 mb-2">
        {cert.name}
      </h3>
      <p className="text-slate-600 text-sm mb-5 md:mb-6 min-h-[40px] leading-relaxed line-clamp-2">{cert.description}</p>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 p-3 md:p-5 rounded-xl mb-5 md:mb-6 bg-slate-50 border border-slate-100">
        <div className="flex flex-col">
           <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Duration</span>
           <span className="font-serif font-bold text-sm md:text-lg text-slate-900">{cert.duration_weeks} Weeks</span>
        </div>
        <div className="flex flex-col">
           <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">
             {cert.price_inr === 0 ? 'Investment' : 'Income'}
           </span>
           <span className={`font-serif font-bold text-sm md:text-lg ${cert.price_inr > 0 ? 'text-purple-700' : 'text-slate-900'}`}>
             {cert.price_inr === 0 ? 'Free' : `₹${(cert.monthly_income_min_inr/1000).toFixed(0)}k+`}
           </span>
        </div>
        <div className="flex flex-col">
           <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Fee</span>
           <span className="font-serif font-bold text-sm md:text-lg text-slate-900">{cert.price_inr === 0 ? 'Sponsored' : `₹${(cert.price_inr/1000).toFixed(0)}k`}</span>
        </div>
      </div>

      {/* Benefits List */}
      <div className="mb-6 flex-grow">
        <ul className="space-y-2.5">
           {cert.requirements.slice(0, 4).map((req, i) => (
             <li key={i} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-600 relative pl-1">
               <span className="text-emerald-500 font-bold text-sm flex-shrink-0 mt-0.5">✓</span>
               <span className="leading-snug">{req}</span>
             </li>
           ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-auto">
        <button 
        onClick={(e) => {
          e.stopPropagation();
          if (!user) {
            navigate(guestAuthPath);
            return;
          }
          startCertificationNow();
        }}
        className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3.5 md:py-4 rounded-xl font-bold text-sm md:text-base shadow-lg shadow-teal-200 hover:shadow-xl hover:shadow-teal-300 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2"
        disabled={processing}
        >
          {processing ? 'Starting...' : (cert.price_inr === 0 ? 'Start Free' : 'Enroll Now')}
          <span className="text-lg">→</span>
          </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate(detailPath);
          }}
          className="w-full sm:w-auto px-6 md:px-8 py-3.5 md:py-4 rounded-xl font-bold text-sm md:text-base border-2 border-slate-800 text-slate-800 bg-white shadow-md hover:bg-slate-800 hover:text-white hover:shadow-lg hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
        >
          Details
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

    </div>
  );
};

const ComparisonTable: React.FC = () => {
    const rows = [
      { color: 'bg-blue-500', name: 'Certified Practitioner', duration: '3 months', inv: 'Free', income: 'Personal growth', pre: 'None' },
      { color: 'bg-emerald-500', name: 'Certified ASHA Champion', duration: '5 weeks', inv: 'Free', income: '₹1,500+', pre: 'ASHA/community worker' },
      { color: 'bg-amber-500', name: 'Certified NLP Therapist', duration: '6 weeks', inv: '₹15,000', income: '₹16K-60K', pre: 'None' },
      { color: 'bg-orange-500', name: 'Certified Psychologist', duration: '10 weeks', inv: '₹20,000', income: '₹50K-87K', pre: 'M.Phil/Ph.D + RCI' },
      { color: 'bg-red-500', name: 'Certified Psychiatrist', duration: '8 weeks', inv: '₹25,000', income: '₹75K-1.5L', pre: 'MD Psychiatry + NMC' },
      { color: 'bg-purple-600', name: 'Certified Executive Therapist', duration: '6 months', inv: '₹40,000', income: '₹70K-1.8L', pre: 'One of above 3 professional certs' },
    ];
  
    return (
      <div className="max-w-[1400px] mx-auto mt-12 md:mt-24 mb-8 md:mb-16 px-0 md:px-4">
        <div className="text-center mb-6 md:mb-10 px-4">
          <h2 className="font-serif text-2xl md:text-4xl font-bold text-slate-900 mb-2">Quick Comparison</h2>
          <p className="text-slate-600 text-base md:text-lg">Compare all certifications at a glance</p>
        </div>
        
        <div className="bg-white md:rounded-[20px] shadow-sm overflow-hidden border-t border-b md:border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                <tr className="bg-slate-50 text-slate-700 text-left border-b border-slate-200">
                    <th className="p-4 md:p-5 font-bold text-sm tracking-wide">Certification</th>
                    <th className="p-4 md:p-5 font-bold text-sm tracking-wide">Duration</th>
                    <th className="p-4 md:p-5 font-bold text-sm tracking-wide">Investment</th>
                    <th className="p-4 md:p-5 font-bold text-sm tracking-wide">Income Potential</th>
                    <th className="p-4 md:p-5 font-bold text-sm tracking-wide">Prerequisites</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
                    <td className="p-4 md:p-5 font-bold text-slate-900 flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${row.color} flex-shrink-0`}></span>
                        {row.name}
                    </td>
                    <td className="p-4 md:p-5 text-slate-600">{row.duration}</td>
                    <td className="p-4 md:p-5 text-slate-600 font-bold">{row.inv}</td>
                    <td className="p-4 md:p-5 text-slate-600">{row.income}</td>
                    <td className="p-4 md:p-5 text-slate-600">{row.pre}</td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

export const JourneyMap: React.FC<JourneyMapProps> = ({ certifications }) => {
  return (
    <div className="space-y-12 md:space-y-16">
      
      {/* 1. Journey Summary Box */}
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-8 md:mb-12">
           <h2 className="font-serif text-3xl md:text-5xl font-black text-slate-900 mb-3 md:mb-4">Your Journey</h2>
           <p className="text-slate-600 text-base md:text-xl max-w-3xl mx-auto leading-relaxed px-4">
              Choose your entry point based on your background and aspirations.
           </p>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[30px] shadow-lg relative overflow-hidden mb-10 md:mb-16 mx-4 md:mx-0 border border-slate-100">
            {/* Gradient Top Border */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-purple-500 to-pink-500"></div>
            
            <div className="p-5 md:p-10 flex flex-col gap-6 md:gap-8">
                 <JourneyLevelItem 
                   title="Entry Level"
                   description="Start your mental wellness journey with patient psychoeducation."
                   borderHex="#3B82F6"
                   icon="🟦"
                   tags={[
                     { label: "Certified Practitioner", color: 'blue' },
                     { label: "ASHA Champion", color: 'green' }
                   ]}
                 />
                 <JourneyLevelItem 
                   title="Professional Level"
                   description="Build your professional practice with recognized clinical credentials."
                   borderHex="#F59E0B"
                   icon="🟨"
                   tags={[
                     { label: "NLP Therapist", color: 'yellow' },
                     { label: "Certified Psychologist", color: 'orange' },
                     { label: "Psychiatrist", color: 'red' }
                   ]}
                 />
                 <JourneyLevelItem 
                   title="Mastery Level"
                   description="Integrate Western psychology with Eastern wisdom."
                   borderHex="#8B5CF6"
                   icon="🟪"
                   isMastery
                   tags={[
                     { label: "Executive Therapist", color: 'purple' },
                     { label: "Master Faculty", color: 'purple' }
                   ]}
                 />
            </div>
        </div>
      </div>

      {/* 2. Incentives Banner */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-0">
        <IncentivesBanner />
      </div>

      {/* 3. Certifications Grid */}
      <div className="max-w-[1400px] mx-auto" id="certifications-grid">
        <div className="text-center mb-8 md:mb-12">
           <h2 className="font-serif text-3xl md:text-5xl font-black text-slate-900 mb-3 md:mb-4">Choose Your Path</h2>
           <p className="text-slate-600 text-base md:text-xl max-w-3xl mx-auto">
              Each certification is designed for specific backgrounds and career goals.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 px-4 md:px-6">
          {certifications.map(cert => (
            <CertificationCard key={cert.id} cert={cert} />
          ))}
        </div>
      </div>

      {/* 4. Comparison Table */}
      <ComparisonTable />
      
    </div>
  );
};

export default JourneyMap;
