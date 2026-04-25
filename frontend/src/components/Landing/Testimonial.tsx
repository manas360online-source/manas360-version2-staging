import React from 'react';

const testimonials = [
  {
    quote:
      'I thought therapy was not for me. With a language-matched provider and structured support, I finally felt understood and consistent with care.',
    author: 'Priya K.',
    location: 'IT Professional, Bengaluru',
  },
  {
    quote:
      'As a therapist in a Tier-2 city, I struggled with discoverability. MANAS360 gave me matched patients and better continuity in sessions.',
    author: 'Dr. Suresh M.',
    location: 'Clinical Psychologist, Dharwad',
  },
  {
    quote:
      'Our team needed dependable wellness access. The platform helped us introduce practical mental health support across the organization.',
    author: 'Ramesh T.',
    location: 'HR Head, Bengaluru',
  },
];

export const Testimonial: React.FC = () => {
  return (
    <section className="py-16 md:py-20" aria-labelledby="testimonial-heading">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block text-sm font-semibold uppercase tracking-widest text-calm-sage">Real Stories</span>
        <h2 id="testimonial-heading" className="mt-3 font-serif text-3xl font-light text-charcoal md:text-4xl">
          From those who took the first step
        </h2>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        {testimonials.map((item) => (
          <article key={item.author} className="rounded-2xl border border-calm-sage/15 bg-white p-6 shadow-soft-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-sm">
            <p className="text-[15px] tracking-wide text-accent-coral">★★★★★</p>
            <p className="mt-3 text-[15px] leading-relaxed text-charcoal/75">“{item.quote}”</p>
            <div className="mt-5 border-t border-calm-sage/15 pt-3">
              <p className="text-[15px] font-semibold text-charcoal">{item.author}</p>
              <p className="text-[13px] text-charcoal/60">{item.location}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Testimonial;
