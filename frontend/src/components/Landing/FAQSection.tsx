import React, { useState } from 'react';

const faqs = [
  {
    q: 'How is MANAS360 different from generic health platforms?',
    a: 'MANAS360 focuses specifically on sustained mental wellness care, combining human care and guided digital support.',
  },
  {
    q: 'Are therapists and psychiatrists verified?',
    a: 'Yes. Provider onboarding includes credential checks and role-specific verification processes.',
  },
  {
    q: 'Is my data private?',
    a: 'The platform is designed with privacy-first controls, encrypted workflows, and access boundaries by role.',
  },
  {
    q: 'Can I use the platform in my language?',
    a: 'The product experience supports multilingual workflows and language-aware matching options.',
  },
  {
    q: 'What are the pricing options?',
    a: 'You can start with a free plan and choose monthly or annual paid options based on your needs.',
  },
  {
    q: 'Is support available during high-risk moments?',
    a: 'Escalation pathways and support guidance are designed for rapid intervention and continuity of care.',
  },
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 md:py-20" aria-labelledby="faq-title">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block text-sm font-semibold uppercase tracking-widest text-calm-sage">FAQ</span>
        <h2 id="faq-title" className="mt-3 font-serif text-3xl font-light text-charcoal md:text-4xl">Questions we hear most</h2>
      </div>

      <div className="mx-auto mt-10 max-w-4xl divide-y divide-calm-sage/15 rounded-2xl border border-calm-sage/15 bg-white px-5 py-2 shadow-soft-xs sm:px-7">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={item.q} className="py-3">
              <button
                type="button"
                onClick={() => setOpenIndex((prev) => (prev === index ? null : index))}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="text-[15px] font-semibold text-charcoal">{item.q}</span>
                <span className="text-calm-sage">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && <p className="mt-2 pr-6 text-[15px] leading-relaxed text-charcoal/65">{item.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FAQSection;
