import React from 'react';
import { Link } from 'react-router-dom';

const capabilities = [
  {
    title: '🎯 Smart Patient Matching',
    description: 'Receive relevant, pre-screened patient leads aligned with your specialization and language preferences.',
    tags: ['AI Matching', 'Qualified Leads', 'Specialization Filter'],
  },
  {
    title: '📅 Scheduling & Session Ops',
    description: 'Manage slots, reminders, and therapy sessions through one integrated workflow.',
    tags: ['Calendar', 'Video Sessions', 'Auto Reminders'],
  },
  {
    title: '📝 Clinical Notes & Plans',
    description: 'Track outcomes with structured notes, progress indicators, and care planning.',
    tags: ['Structured Notes', 'Outcome Tracking', 'Care Plans'],
  },
  {
    title: '💊 Digital Prescriptions',
    description: 'For psychiatry workflows, generate compliant digital prescriptions and medication references.',
    tags: ['eRx Ready', 'Compliance', 'Medication Support'],
  },
  {
    title: '📊 Earnings & Analytics',
    description: 'Monitor session volume, earnings, and quality indicators in a single dashboard.',
    tags: ['Revenue View', 'Payout Tracking', 'Growth Analytics'],
  },
  {
    title: '🏥 Clinic Digitization',
    description: 'Support multi-provider operations with centralized workflow and digital operations readiness.',
    tags: ['Multi-Provider', 'Workflow Ops', 'Billing Ready'],
  },
];

export const ProviderCapabilitiesSection: React.FC = () => {
  return (
    <section id="for-providers" className="py-16 md:py-20" aria-labelledby="providers-title">
      <span className="inline-block text-sm font-semibold uppercase tracking-widest text-calm-sage">For Providers</span>
      <h2 id="providers-title" className="mt-3 font-serif text-3xl font-light text-charcoal md:text-4xl">Grow your practice. Focus on care.</h2>
      <p className="mt-3 max-w-3xl text-base text-charcoal/65">MANAS360 helps reduce admin overhead so clinicians can prioritize patient outcomes.</p>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {capabilities.map((item) => (
          <article key={item.title} className="rounded-2xl border border-calm-sage/15 bg-white p-6 shadow-soft-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-sm">
            <h3 className="text-[17px] font-semibold text-charcoal">{item.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-charcoal/65">{item.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-calm-sage/20 bg-cream px-2.5 py-1 text-[11px] font-semibold text-charcoal/70">{tag}</span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-2xl bg-charcoal px-6 py-7 text-cream shadow-soft-md sm:px-8">
        <h3 className="font-serif text-2xl">Join 500+ mental health professionals on MANAS360</h3>
        <p className="mt-2 text-sm text-cream/75">See your first matched patient soon after onboarding and operate with a unified care workflow.</p>
        <div className="mt-4">
          <Link to="/join" className="inline-flex min-h-[42px] items-center rounded-full bg-cream px-5 py-2 text-sm font-semibold text-charcoal transition-colors duration-200 hover:bg-white">Apply as a Provider</Link>
        </div>
      </div>
    </section>
  );
};

export default ProviderCapabilitiesSection;
