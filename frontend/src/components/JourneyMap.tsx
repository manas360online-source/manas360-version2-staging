import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Certification, BadgeColor } from '../CertificationTypes';

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
      flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 p-6 md:p-10 rounded-2xl md:rounded-3xl border-l-[8px] md:border-l-[12px] 
      transition-all duration-300 hover:shadow-[0_15px_40px_rgba(13,148,136,0.15)]
      ${isMastery ? 'bg-gradient-to-br from-purple-50/50 to-pink-50/50' : 'bg-gradient-to-br from-teal-50/10 to-purple-50/10'}
    `} 
    style={{ borderLeftColor: borderHex }}
  >
    <div className="text-6xl md:text-[5rem] flex-shrink-0 leading-none mb-4 md:mb-0">{icon}</div>
    <div className="flex-1 w-full">
      <h3 className="font-serif text-2xl md:text-4xl font-bold text-slate-900 mb-2 leading-tight">{title}</h3>
      <p className="text-slate-700 text-base md:text-xl mb-6 leading-relaxed">{description}</p>
      <div className="flex flex-wrap gap-2 md:gap-3">
        {tags.map((tag, idx) => (
           <span key={idx} className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-full text-xs md:text-base font-bold bg-white/80 text-slate-700 whitespace-nowrap border border-slate-200 shadow-sm">
             {tag.label}
           </span>
        ))}
      </div>
    </div>
  </div>
);

const IncentivesBanner: React.FC = () => (
  <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-6 md:p-16 rounded-2xl md:rounded-[30px] mb-16 md:mb-24 relative overflow-hidden shadow-2xl">
    {/* Background Watermark */}
    <div className="absolute -top-10 -right-10 text-[150px] md:text-[350px] opacity-10 transform rotate-12 pointer-events-none">🎁</div>
    
    <div className="relative z-10 max-w-6xl">
      <h2 className="font-serif text-2xl md:text-5xl font-black mb-3 md:mb-4">🎁 Special Incentives</h2>
      <p className="text-lg md:text-2xl opacity-90 mb-8 md:mb-12 font-medium">Get exclusive benefits that accelerate your practice growth</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        <div className="bg-white/15 backdrop-blur-md p-5 md:p-8 rounded-xl md:rounded-2xl border border-white/20">
           <div className="text-3xl md:text-5xl mb-3 md:mb-4">⚡</div>
           <strong className="block text-lg md:text-xl font-bold mb-1 md:mb-2">Lead Priority</strong>
           <p className="text-sm md:text-base opacity-90 leading-relaxed">24hr access to new patient referrals</p>
        </div>
        <div className="bg-white/15 backdrop-blur-md p-5 md:p-8 rounded-xl md:rounded-2xl border border-white/20">
           <div className="text-3xl md:text-5xl mb-3 md:mb-4">📈</div>
           <strong className="block text-lg md:text-xl font-bold mb-1 md:mb-2">Visibility</strong>
           <p className="text-sm md:text-base opacity-90 leading-relaxed">Premium listing at top of search</p>
        </div>
        <div className="bg-white/15 backdrop-blur-md p-5 md:p-8 rounded-xl md:rounded-2xl border border-white/20">
           <div className="text-3xl md:text-5xl mb-3 md:mb-4">💰</div>
           <strong className="block text-lg md:text-xl font-bold mb-1 md:mb-2">Flexible Pay</strong>
           <p className="text-sm md:text-base opacity-90 leading-relaxed">3 easy installments available</p>
        </div>
        <div className="bg-white/15 backdrop-blur-md p-5 md:p-8 rounded-xl md:rounded-2xl border border-white/20">
           <div className="text-3xl md:text-5xl mb-3 md:mb-4">🎓</div>
           <strong className="block text-lg md:text-xl font-bold mb-1 md:mb-2">Lifetime Access</strong>
           <p className="text-sm md:text-base opacity-90 leading-relaxed">All training materials & updates</p>
        </div>
      </div>
    </div>
  </div>
);

const CertificationCard: React.FC<{ cert: Certification }> = ({ cert }) => {
  const styles = getStyles(cert.badgeColor);
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/cert/${cert.slug}`)}
      className={`
        group relative bg-white rounded-2xl md:rounded-[30px] p-6 md:p-10 shadow-[0_5px_15px_rgba(0,0,0,0.05)] 
        hover:shadow-[0_25px_70px_rgba(0,0,0,0.15)] transition-all duration-400 
        hover:-translate-y-2 cursor-pointer border-t-[6px] md:border-t-[8px] flex flex-col h-full
        ${styles.border}
      `}
    >
      {/* Badge */}
      <div className={`
        w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-6xl mb-6 md:mb-8 shadow-lg text-white
        ${cert.tier === 'Mastery' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : styles.badgeBg}
      `}>
        {cert.name.charAt(0)}
      </div>

      <h3 className="font-serif text-2xl md:text-4xl leading-tight font-bold text-slate-900 mb-3">
        {cert.name}
      </h3>
      <p className="text-slate-600 text-base md:text-lg mb-6 md:mb-8 min-h-[40px] md:min-h-[60px] leading-relaxed">{cert.description}</p>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 md:gap-6 p-4 md:p-8 rounded-2xl mb-6 md:mb-8 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-100">
        <div className="flex flex-col">
           <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Duration</span>
           <span className="font-serif font-bold text-lg md:text-2xl text-slate-900">{cert.duration_weeks} Weeks</span>
        </div>
        <div className="flex flex-col">
           <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
             {cert.price_inr === 0 ? 'Investment' : 'Income'}
           </span>
           <span className={`font-serif font-bold text-lg md:text-2xl ${cert.price_inr > 0 ? 'text-purple-700' : 'text-slate-900'}`}>
             {cert.price_inr === 0 ? 'Free' : `₹${(cert.monthly_income_min_inr/1000).toFixed(0)}k+`}
           </span>
        </div>
        <div className="flex flex-col">
           <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Fee</span>
           <span className="font-serif font-bold text-lg md:text-2xl text-slate-900">{cert.price_inr === 0 ? 'Sponsored' : `₹${(cert.price_inr/1000).toFixed(0)}k`}</span>
        </div>
      </div>

      {/* Benefits List */}
      <div className="mb-8 flex-grow">
        <ul className="space-y-3 md:space-y-4">
           {cert.requirements.slice(0, 4).map((req, i) => (
             <li key={i} className="flex items-start gap-3 md:gap-4 text-sm md:text-lg text-slate-600 relative pl-1">
               <span className="text-emerald-500 font-bold text-lg md:text-xl flex-shrink-0">✓</span>
               <span className="leading-normal">{req}</span>
             </li>
           ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-auto">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/checkout/${cert.slug}`);
          }}
          className="flex-1 bg-gradient-to-r from-teal-600 to-purple-600 text-white py-3 md:py-5 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl hover:shadow-lg transition-all"
        >
          {cert.price_inr === 0 ? 'Start Free' : 'Enroll Now'}
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/cert/${cert.slug}`);
          }}
          className={`w-full sm:w-auto px-6 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl border-2 transition hover:bg-teal-50 border-teal-600 text-teal-600`}
        >
          Details
        </button>
      </div>

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
      <div className="max-w-[1600px] mx-auto mt-16 md:mt-32 mb-10 md:mb-20 px-0 md:px-4">
        <div className="text-center mb-8 md:mb-16 px-4">
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-slate-900 mb-2 md:mb-4">Quick Comparison</h2>
          <p className="text-slate-600 text-lg md:text-2xl">Compare all certifications at a glance</p>
        </div>
        
        <div className="bg-white md:rounded-[30px] shadow-lg overflow-hidden border-t border-b md:border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
                <thead>
                <tr className="bg-gradient-to-r from-teal-600 to-purple-600 text-white text-left">
                    <th className="p-4 md:p-8 font-bold text-base md:text-xl tracking-wide">Certification</th>
                    <th className="p-4 md:p-8 font-bold text-base md:text-xl tracking-wide">Duration</th>
                    <th className="p-4 md:p-8 font-bold text-base md:text-xl tracking-wide">Investment</th>
                    <th className="p-4 md:p-8 font-bold text-base md:text-xl tracking-wide">Income</th>
                    <th className="p-4 md:p-8 font-bold text-base md:text-xl tracking-wide">Prerequisites</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
                    <td className="p-4 md:p-8 font-bold text-sm md:text-xl text-slate-900 flex items-center gap-3 md:gap-4">
                        <span className={`w-4 h-4 md:w-6 md:h-6 rounded-full ${row.color} flex-shrink-0`}></span>
                        {row.name}
                    </td>
                    <td className="p-4 md:p-8 text-sm md:text-lg text-slate-600">{row.duration}</td>
                    <td className="p-4 md:p-8 text-sm md:text-lg text-slate-600 font-bold">{row.inv}</td>
                    <td className="p-4 md:p-8 text-sm md:text-lg text-slate-600">{row.income}</td>
                    <td className="p-4 md:p-8 text-sm md:text-lg text-slate-600">{row.pre}</td>
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
    <div className="space-y-12 md:space-y-20">
      
      {/* 1. Journey Summary Box */}
      <div className="max-w-[1400px] mx-auto">
        <div className="text-center mb-10 md:mb-16">
           <h2 className="font-serif text-3xl md:text-6xl font-black text-slate-900 mb-4 md:mb-6">Your Journey</h2>
           <p className="text-slate-600 text-lg md:text-2xl max-w-4xl mx-auto leading-relaxed px-2">
              Choose your entry point based on your background and aspirations.
           </p>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[40px] shadow-xl relative overflow-hidden mb-12 md:mb-24 mx-2 md:mx-0">
            {/* Gradient Top Border */}
            <div className="absolute top-0 left-0 right-0 h-2 md:h-3 bg-gradient-to-r from-teal-500 via-purple-500 to-pink-500"></div>
            
            <div className="p-4 md:p-16 flex flex-col gap-6 md:gap-10">
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
      <div className="max-w-[1400px] mx-auto px-2 md:px-0">
        <IncentivesBanner />
      </div>

      {/* 3. Certifications Grid */}
      <div className="max-w-[1600px] mx-auto" id="certifications-grid">
        <div className="text-center mb-10 md:mb-16">
           <h2 className="font-serif text-3xl md:text-6xl font-black text-slate-900 mb-4 md:mb-6">Choose Your Path</h2>
           <p className="text-slate-600 text-lg md:text-2xl max-w-4xl mx-auto">
              Each certification is designed for specific backgrounds and career goals.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 px-2 md:px-0">
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
