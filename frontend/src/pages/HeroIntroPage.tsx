import { useEffect, useState } from 'react';
import { Hero } from '../components/Landing/Hero';
import logo from '../assets/manas360_main_logo.png';
import './HeroIntroPage.css';

const INTRO_ANIMATION_MS = 4000;

export default function HeroIntroPage() {
  const [showIntroSplash, setShowIntroSplash] = useState(true);

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
