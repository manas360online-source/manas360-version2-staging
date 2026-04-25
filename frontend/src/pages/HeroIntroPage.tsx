import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from '../components/Landing/Hero';
import logo from '../assets/manas360_main_logo.png';
import heroBeach from '../assets/You renot alone-Beach.jpeg';
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
    icon: '??',
    title: 'Clinical Therapy',
    description:
      'NMC/RCI-verified psychologists and psychiatrists. Evidence-based therapy (CBT, DBT, ACT) via audio and in-person. In your language.',
    cta: 'Explore Services',
    target: '/landing',
  },
  {
    id: 'anytime-buddy',
    icon: '??',
    title: 'AnytimeBuddy',
    description:
      "Your AI wellness companion for when it is 2 AM and you just need someone to listen. Not a therapist replacement - a bridge to one.",
    cta: 'Meet Buddy',
    target: '/landing',
  },
  {
    id: 'digital-clinic',
    icon: '??',
    title: 'MyDigitalClinic',
    description:
      'Already a practicing therapist? Digitize your clinic - patient records, session notes, prescriptions, scheduling. All DPDPA compliant.',
    cta: 'For Therapists',
    target: '/my-digital-clinic',
  },
];

const metricItems = [
  { value: '5', label: 'Indian Languages', subLabel: 'Hindi · English · Tamil · Telugu · Kannada' },
  { value: '?99', label: 'Platform Access', subLabel: 'Per Month' },
  { value: '24/7', label: 'AnytimeBuddy', subLabel: 'AI Wellness Companion' },
  { value: '0 km', label: 'Distance to', subLabel: 'Your Therapist' },
  { value: '6', label: 'Day Free Trial', subLabel: 'No Card Required' },
];

const rotatingHeadlines = ['Healing in Your', 'Transformation', 'Mental Wellness', 'Accessible'];
const INTRO_ANIMATION_MS = 4000;

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
        <div className="hero-logo-intro" aria-hidden="true">
          <div className="hero-logo-intro-card">
            <img src={logo} alt="" />
          </div>
        </div>
      ) : (
        <Hero />
      )}
    </div>
  );
}
