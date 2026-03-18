import React, { useState, useEffect } from 'react';
import { JourneyMap } from '../components/CertificationJourneyMap';
import { CERTIFICATIONS } from '../CertificationConstants';
import { CardSkeleton } from '../components/CertificationSkeleton';
import { SEO } from '../components/CertificationSEO';

export const CertificationLandingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col font-sans pb-16 bg-white overflow-x-hidden selection:bg-purple-100">
      <SEO title="Certification Journey | MANAS360" />
      
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-[#0F172A] text-white py-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[140px]"></div>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-block px-4 py-1.5 mb-8 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-teal-400 text-xs font-bold uppercase tracking-[0.2em] animate-fade-in">
            India's #1 Mental Health Ecosystem
          </div>
          <h1 className="text-5xl md:text-8xl font-serif font-black leading-[1.1] mb-8 animate-slide-up bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
            Transform Your Career,<br />
            <span className="text-teal-400">Transform Lives.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-16 font-medium leading-relaxed animate-fade-in [animation-delay:200ms]">
            Choose from 6 specialized tracks designed to take you from a community champion to a professional consciousness master.
          </p>
          
          <div className="flex flex-wrap justify-center gap-8 mt-4 animate-fade-in [animation-delay:400ms]">
            {[
              { label: 'Certifications', val: '6' },
              { label: 'Max Income', val: '₹5L/mo' },
              { label: 'Success Rate', val: '98%' }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <span className="block font-serif text-4xl md:text-6xl font-black mb-2 text-white">{stat.val}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Map Section */}
      <section id="journey" className="py-32 bg-slate-50 border-y border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-6 italic">The Professional Pathway</h2>
          <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto">Explore the transition from foundational peer support to elite clinical mastery.</p>
        </div>
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
          {loading ? (
             <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
              <CardSkeleton /><CardSkeleton />
            </div>
          ) : (
            <JourneyMap certifications={CERTIFICATIONS} />
          )}
        </div>
      </section>
    </div>
  );
};

export default CertificationLandingPage;
