import React from 'react';

const features = [
  { title: '🌐 Multilingual Engine', description: 'Localized support experiences across major Indian languages.' },
  { title: '🧠 AI-Powered Intelligence', description: 'Guided triage, pattern insights, and support continuity.' },
  { title: '📹 HD Video Therapy', description: 'Stable therapy sessions optimized for varied network quality.' },
  { title: '📞 IVR & Voice Access', description: 'Voice-first support workflows for wider accessibility.' },
  { title: '🏢 Corporate EAP Module', description: 'Organization-ready wellness programs and dashboards.' },
  { title: '🔔 Smart Notifications', description: 'Reminders and engagement workflows for better adherence.' },
  { title: '💳 Seamless Payments', description: 'Integrated billing and payout-ready transaction flows.' },
  { title: '📱 Mobile-First UX', description: 'Optimized for smartphone-first behavior and quick access.' },
];

export const PlatformFeaturesSection: React.FC = () => {
  return (
    <section className="py-16 md:py-20" aria-labelledby="platform-title">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block text-sm font-semibold uppercase tracking-widest text-calm-sage">Platform Capabilities</span>
        <h2 id="platform-title" className="mt-3 font-serif text-3xl font-light text-charcoal md:text-4xl">Built for scale, designed for trust</h2>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <article key={feature.title} className="rounded-2xl border border-calm-sage/15 bg-white p-5 text-center shadow-soft-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-sm">
            <h3 className="text-[15px] font-semibold text-charcoal">{feature.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-charcoal/65">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PlatformFeaturesSection;
