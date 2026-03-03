import React from 'react';
import { Link } from 'react-router-dom';

export const FinalCtaSection: React.FC = () => {
  return (
    <section className="py-16 md:py-20" aria-labelledby="final-cta-title">
      <div className="rounded-3xl bg-charcoal px-6 py-12 text-center text-cream shadow-soft-md sm:px-8 md:py-16">
        <span className="inline-block text-sm font-semibold uppercase tracking-widest text-cream/70">Start Today</span>
        <h2 id="final-cta-title" className="mt-3 font-serif text-3xl font-light md:text-5xl">From episodic support to transformational care</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-cream/70">Whether you are seeking help or providing it, start with a structured and trusted pathway.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/assessment" className="inline-flex min-h-[44px] items-center rounded-full bg-cream px-6 py-2.5 text-sm font-semibold text-charcoal transition-colors duration-200 hover:bg-white">Take Free Assessment</Link>
          <Link to="/join" className="inline-flex min-h-[44px] items-center rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-white/10">Join as a Provider</Link>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
