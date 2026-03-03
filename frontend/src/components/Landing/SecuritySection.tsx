import React from 'react';

const cards = [
  { title: '🔐 End-to-End Encryption', description: 'Strong transport and storage encryption standards for sensitive workflows.' },
  { title: '🇮🇳 DPDPA Alignment', description: 'Consent-first handling with privacy-conscious processing principles.' },
  { title: '☁️ India Data Residency', description: 'Architecture aligned to local hosting and residency expectations.' },
  { title: '👤 Role-Based Controls', description: 'Access boundaries by role and use-case with secure session patterns.' },
  { title: '📋 Audit Logging', description: 'Action-level traceability for governance and accountability.' },
  { title: '🔑 MFA & Session Controls', description: 'Multi-factor checks and timeout controls for safer account access.' },
];

const badges = ['🔒 AES-256 Encryption', '🇮🇳 DPDPA 2023', '☁️ India Residency', '📜 Mental Health Standards', '✅ NMC Verification'];

export const SecuritySection: React.FC = () => {
  return (
    <section className="py-16 md:py-20" aria-labelledby="security-title">
      <div className="rounded-3xl bg-charcoal px-5 py-12 text-cream sm:px-8 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block text-sm font-semibold uppercase tracking-widest text-cream/70">Security & Privacy</span>
          <h2 id="security-title" className="mt-3 font-serif text-3xl font-light md:text-4xl">Your data is handled with care and control</h2>
          <p className="mt-3 text-base text-cream/70">Designed for high-trust care delivery with privacy-aware infrastructure decisions.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-white/20 bg-white/10 p-5">
              <h3 className="text-[15px] font-semibold text-cream">{card.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-cream/85">{card.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {badges.map((badge) => (
            <span key={badge} className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold text-cream/85">{badge}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
