import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HeroIntroPage.css';

type OfferCard = {
  id: string;
  icon: string;
  title: string;
  description: string;
  cta: string;
  target: string;
};

const offerCards: OfferCard[] = [
  {
    id: 'clinical-therapy',
    icon: '🧠',
    title: 'Clinical Therapy',
    description:
      'NMC/RCI-verified psychologists and psychiatrists. Evidence-based therapy (CBT, DBT, ACT) via audio and in-person. In your language.',
    cta: 'Explore Services',
    target: '/landing',
  },
  {
    id: 'anytime-buddy',
    icon: '🤖',
    title: 'AnytimeBuddy',
    description:
      "Your AI wellness companion for when it is 2 AM and you just need someone to listen. Not a therapist replacement - a bridge to one.",
    cta: 'Meet Buddy',
    target: '/landing',
  },
  {
    id: 'digital-clinic',
    icon: '🏥',
    title: 'MyDigitalClinic',
    description:
      'Already a practicing therapist? Digitize your clinic - patient records, session notes, prescriptions, scheduling. All DPDPA compliant.',
    cta: 'For Therapists',
    target: '/my-digital-clinic',
  },
];

const metricItems = [
  { value: '5', label: 'Indian Languages', subLabel: 'Hindi · English · Tamil · Telugu · Kannada' },
  { value: '₹99', label: 'Platform Access', subLabel: 'Per Month' },
  { value: '24/7', label: 'AnytimeBuddy', subLabel: 'AI Wellness Companion' },
  { value: '0 km', label: 'Distance to', subLabel: 'Your Therapist' },
  { value: '21', label: 'Day Free Trial', subLabel: 'No Card Required' },
];

const rotatingHeadlines = ['Healing in Your', 'Transformation', 'Mental Wellness', 'Accessible'];
const INTRO_ANIMATION_MS = 1800;

export default function HeroIntroPage() {
  const navigate = useNavigate();
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [showIntroSplash, setShowIntroSplash] = useState(true);

  const trustBadges = useMemo(
    () => ['DPDPA 2023 Compliant', 'NMC/RCI Verified Providers', 'AWS Mumbai Data Residency', 'DPIIT Recognised Startup'],
    []
  );

  useEffect(() => {
    const rotateTimer = window.setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % rotatingHeadlines.length);
    }, 3500);

    return () => {
      window.clearInterval(rotateTimer);
    };
  }, []);

  useEffect(() => {
    const introTimer = window.setTimeout(() => {
      setShowIntroSplash(false);
    }, INTRO_ANIMATION_MS);

    return () => {
      window.clearTimeout(introTimer);
    };
  }, []);

  return (
    <div className="hero-intro-page">
      {showIntroSplash ? (
        <div className="hero-logo-intro" aria-hidden="true" onClick={() => navigate('/landing')} role="button" tabIndex={0}>
          <div className="hero-logo-intro-card">
            <img src="/Logo.jpeg" alt="" />
          </div>
        </div>
      ) : (
        <div className="hero-content-reveal">
      <section className="hero-intro-surface">
        <header className="hero-intro-nav">
          <div className="hero-brand" onClick={() => navigate('/landing')} role="button" tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate('/landing');
              }
            }}
          >
            MANAS360
          </div>

          <button className="hero-nav-cta" type="button" onClick={() => navigate('/assessment')}>
            Start Free Screening →
          </button>
        </header>

        <div className="hero-main-copy">
          <p className="hero-overline">GOOD VIBES · GREAT LIVING</p>
          <h1>
            <span className="hero-heading-base">Bridging India to</span>
            <span className="hero-heading-rotator" aria-live="polite" aria-atomic="true">
              <span key={rotatingHeadlines[headlineIndex]} className="hero-heading-animated">
                {rotatingHeadlines[headlineIndex]}
              </span>
            </span>
          </h1>
          <p>
            Verified mental health professionals. Five Indian languages. From ₹99/month. On your phone.
            No email needed. Holistic Mental Wellness - Anytime, Anywhere.
          </p>
          <div className="hero-cta-row">
            <button type="button" className="hero-primary-btn" onClick={() => navigate('/assessment')}>
              Take Free 2-Min Screening
            </button>
            <button type="button" className="hero-secondary-btn" onClick={() => navigate('/my-digital-clinic')}>
              I&apos;m a Therapist →
            </button>
          </div>
        </div>

        <div className="hero-trust-row" aria-label="Trust badges">
          {trustBadges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>

        <div className="hero-metrics-grid">
          {metricItems.map((item) => (
            <article key={item.label}>
              <h3>{item.value}</h3>
              <p>{item.label}</p>
              <small>{item.subLabel}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="offer-section">
        <p className="offer-overline">WHAT WE OFFER</p>
        <h2>From Screening to Sustained Wellness</h2>
        <p className="offer-subcopy">
          Not just a therapy marketplace. A complete mental wellness ecosystem - clinical care, AI companionship,
          and practice management tools, all on one platform.
        </p>

        <div className="offer-grid">
          {offerCards.map((card) => (
            <article
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(card.target)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(card.target);
                }
              }}
              aria-label={`${card.title} card`}
            >
              <span className="offer-icon" aria-hidden="true">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <button type="button" onClick={() => navigate(card.target)}>
                {card.cta} →
              </button>
            </article>
          ))}
        </div>

        <button type="button" className="continue-landing-btn" onClick={() => navigate('/landing')}>
          Continue to Home →
        </button>
      </section>
      </div>
      )}
    </div>
  );
}
