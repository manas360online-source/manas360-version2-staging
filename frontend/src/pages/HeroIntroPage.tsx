import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from '../components/Landing/Hero';
import logo from '../assets/manas360_main_logo.png';
import './HeroIntroPage.css';

const INTRO_ANIMATION_MS = 4000;
const HERO_VIDEO_SESSION_KEY = 'manas360:hero-video-seen';

export default function HeroIntroPage() {
  const navigate = useNavigate();
  const [showIntroSplash, setShowIntroSplash] = useState(true);

  useEffect(() => {
    if (window.sessionStorage.getItem(HERO_VIDEO_SESSION_KEY) === '1') {
      navigate('/landing', { replace: true });
      return undefined;
    }

    const introTimer = window.setTimeout(() => {
      setShowIntroSplash(false);
    }, INTRO_ANIMATION_MS);

    return () => {
      window.clearTimeout(introTimer);
    };
  }, [navigate]);

  const handleHeroComplete = () => {
    window.sessionStorage.setItem(HERO_VIDEO_SESSION_KEY, '1');
    navigate('/landing', { replace: true });
  };

  return (
    <div className="hero-intro-page">
      {showIntroSplash ? (
        <div className="hero-logo-intro" aria-hidden="true">
          <div className="hero-logo-intro-card">
            <img src={logo} alt="" />
          </div>
        </div>
      ) : (
        <Hero onFinish={handleHeroComplete} />
      )}
    </div>
  );
}