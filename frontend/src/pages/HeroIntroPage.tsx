import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
const logo = "/Logo.jpeg";
const INTRO_ANIMATION_MS = 4000;
import './HeroIntroPage.css';

export default function HeroIntroPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // If user already saw the intro in this session, skip it and go to landing
    try {
      const seen = window.sessionStorage.getItem('manas360_intro_seen');
      if (seen) {
        navigate('/landing', { replace: true });
        return;
      }
    } catch (err) {
      // ignore storage errors and proceed to show intro
    }

    const introTimer = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem('manas360_intro_seen', '1');
      } catch (e) {
        // ignore storage errors
      }
      navigate('/hero', { replace: true });
    }, INTRO_ANIMATION_MS);

    return () => {
      window.clearTimeout(introTimer);
    };
  }, [navigate]);

  return (
    <div className="hero-intro-page">
      <div className="hero-logo-intro" aria-hidden="true">
        <div className="hero-logo-intro-card">
          <img src={logo} alt="" />
        </div>
      </div>
    </div>
  );
}