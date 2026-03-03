import React from 'react';
import { Link } from 'react-router-dom';

const tiers = [
  {
    name: 'Free Forever',
    price: '₹0',
    period: '/month',
    description: 'Start your wellness journey with essential tools.',
    features: ['Limited AI conversations/day', 'Basic mood tracking', 'Free assessment', 'Browse therapist profiles'],
    cta: 'Get Started Free',
    featured: false,
  },
  {
    name: 'Premium',
    price: '₹299',
    period: '/month',
    description: 'Full support experience with therapy enablement and guided programs.',
    features: ['Everything in Free', 'Unlimited AI conversations', 'Priority matching', 'Full CBT and support programs'],
    cta: 'Start 7-Day Trial',
    featured: true,
  },
  {
    name: 'Premium Annual',
    price: '₹2,999',
    period: '/year',
    description: 'Best value for long-term care continuity.',
    features: ['Everything in Premium', 'Annual savings', 'Priority support', 'Extended insights'],
    cta: 'Get Annual Plan',
    featured: false,
  },
];

export const PricingSection: React.FC = () => {
  return (
    <section id="pricing" className="py-16 md:py-20" aria-labelledby="pricing-title">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block text-sm font-semibold uppercase tracking-widest text-calm-sage">Transparent Pricing</span>
        <h2 id="pricing-title" className="mt-3 font-serif text-3xl font-light text-charcoal md:text-4xl">Care plans that fit your budget</h2>
        <p className="mt-3 text-base text-charcoal/65">No hidden charges. Start free and upgrade when ready.</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.name}
            className={`rounded-2xl border p-6 shadow-soft-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-md ${
              tier.featured ? 'border-charcoal bg-charcoal text-cream' : 'border-calm-sage/15 bg-white text-charcoal'
            }`}
          >
            {tier.featured && <p className="inline-flex rounded-full bg-cream/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest">Most Popular</p>}
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest opacity-70">{tier.name}</p>
            <p className="mt-2 font-serif text-4xl">
              {tier.price} <span className="font-sans text-sm opacity-70">{tier.period}</span>
            </p>
            <p className="mt-2 text-sm opacity-80">{tier.description}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {tier.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
            <Link
              to="/auth/login?next=/patient/billing"
              className={`mt-6 inline-flex min-h-[42px] w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                tier.featured ? 'bg-cream text-charcoal hover:bg-white' : 'bg-gradient-calm text-white hover:opacity-90'
              }`}
            >
              {tier.cta}
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-charcoal/60">Corporate and clinic pricing available on request.</p>
    </section>
  );
};

export default PricingSection;
