import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Header,
  Hero,
  GroupSessionsStrip,
  TrustMetrics,
  HowItWorks,
  PatientCapabilitiesSection,
  ProviderCapabilitiesSection,
  PlatformFeaturesSection,
  PricingSection,
  SecuritySection,
  Testimonial,
  FAQSection,
  FinalCtaSection,
  Footer,
  QuickAccessRail,
} from '../components/Landing';

/**
 * LandingPage Component
 *
 * Production-ready landing page for MANAS360 mental health platform.
 * Features:
 * - Responsive design (mobile-first)
 * - Semantic HTML with ARIA labels
 * - Smooth animations and transitions
 * - Performance optimized (lazy loading, intersection observers)
 * - SEO optimized with meta tags
 * - Accessibility best practices
 * - Crisis support always visible
 *
 * Stack: React + TailwindCSS + React Router
 */
export const LandingPage: React.FC = () => {
  useEffect(() => {
    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    // Scroll position restoration
    const handlePopState = () => {
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>MANAS360 - You're Not Alone | Mental Health Support</title>
        <meta
          name="description"
          content="Get a 60-second mental health assessment and connect with licensed therapists. Confidential, non-judgmental support for anxiety, depression, and more."
        />
        <meta
          name="keywords"
          content="mental health, therapy, anxiety, depression, counseling, therapist"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#A8B5A0" />

        {/* Open Graph */}
        <meta
          property="og:title"
          content="MANAS360 - You're Not Alone | Mental Health Support"
        />
        <meta
          property="og:description"
          content="Get a 60-second mental health assessment and connect with licensed therapists."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.manas360.com" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="MANAS360 - You're Not Alone | Mental Health Support"
        />
        <meta
          name="twitter:description"
          content="Get a 60-second mental health assessment and connect with licensed therapists."
        />

        {/* Structured Data - Organization */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'MANAS360',
            url: 'https://www.manas360.com',
            logo: 'https://www.manas360.com/logo.png',
            description:
              'Mental health support platform connecting users with licensed therapists',
            sameAs: [
              'https://www.facebook.com/manas360',
              'https://twitter.com/manas360',
              'https://www.linkedin.com/company/manas360',
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'Crisis Support',
              telephone: '+91-1800-599-0019',
            },
          })}
        </script>

        {/* Structured Data - HealthAndBeautyBusiness */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HealthAndBeautyBusiness',
            name: 'MANAS360',
            description: 'Mental health therapy and counseling platform',
            priceRange: '₹500',
            areaServed: 'IN',
            serviceType: 'Mental Health Therapy',
          })}
        </script>
        {/* Preload hero image for better LCP */}
        <link rel="preload" as="image" href="/You%20renot%20alone-Beach.jpeg" />
      </Helmet>

      {/* Main Page Structure */}
      <div className="landing-root relative min-h-screen overflow-x-hidden bg-[#f5f3ef] text-charcoal">
        <Header />
        <QuickAccessRail />
        <Hero />
        <GroupSessionsStrip />

        {/* Content sections with visual rhythm */}
        <main className="lg:pl-16">
          {/* Trust metrics */}
          <section className="bg-cream px-4 pt-10 pb-2 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <TrustMetrics />
            </div>
          </section>

          <section className="bg-white px-4 py-6 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-emerald-900 sm:text-2xl">Play Hit a Sixer for Free</h2>
                  <p className="mt-1 text-sm text-emerald-800 sm:text-base">
                    Anyone can play now. Create a patient account to claim winnings directly in wallet.
                  </p>
                </div>
                <Link
                  to="/hit-a-sixer"
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  Play Now
                </Link>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="bg-white px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <HowItWorks />
            </div>
          </section>

          {/* Patient capabilities */}
          <section className="bg-cream px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <PatientCapabilitiesSection />
            </div>
          </section>

          {/* Provider capabilities */}
          <section className="bg-wellness-surface px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <ProviderCapabilitiesSection />
            </div>
          </section>

          {/* Platform features */}
          <section className="bg-cream px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <PlatformFeaturesSection />
            </div>
          </section>

          {/* Pricing */}
          <section className="bg-white px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <PricingSection />
            </div>
          </section>

          {/* Security */}
          <section className="bg-cream px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <SecuritySection />
            </div>
          </section>

          {/* Testimonials */}
          <section className="bg-white px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <Testimonial />
            </div>
          </section>

          {/* FAQ */}
          <section className="bg-cream px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <FAQSection />
            </div>
          </section>

          {/* Final CTA */}
          <section className="bg-cream px-4 pb-6 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <FinalCtaSection />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default LandingPage;
