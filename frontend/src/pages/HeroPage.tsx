import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const HeroPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      // Navigate to landing on any scroll down
      if (window.scrollY > 20) {
        navigate('/landing');
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        navigate('/landing');
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [navigate]);

  return (
    <div className="refined-hero-container" style={{ height: '100vh', width: '100vw', overflowY: 'auto' }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        className="hero-video-bg"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto',
          zIndex: 0,
          transform: 'translateX(-50%) translateY(-50%)',
          objectFit: 'cover'
        }}
      >
        <source src="/HERO-BackgroundVideo.mp4" type="video/mp4" />
      </video>
      <div 
        className="hero-overlay-refined" 
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'linear-gradient(to bottom, rgba(1, 14, 42, 0.4) 0%, rgba(1, 14, 42, 0.7) 100%)'
        }}
      ></div>

      <div className="hero-content-refined" style={{ position: 'relative', zIndex: 10, paddingBottom: '160px' }}>
        <div className="tier-1-refined" style={{ maxWidth: '700px', margin: '0 auto 24px' }}>
          150 million Indians suffer in silence. You don't have to. <br />
          You're not broken. You're just carrying too much alone — and you're not alone.
        </div>

        <div className="tier-2-refined" style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: 'white', lineHeight: 1.1, fontSize: 'clamp(32px, 5vw, 64px)' }}>
            You Deserve <br />
            <span className="highlight-text">Good Vibes & Great Living</span>
          </h1>
        </div>

        <div className="tier-3-refined">
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500, maxWidth: '600px', margin: '0 auto 40px' }}>
            India’s complete mental wellness ecosystem. Verified therapist in your language, 
            AI companion at 2 AM, clinical care from ₹99/month. You don’t have to carry it alone.
          </p>
        </div>

        <div className="tier-4-refined" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <button 
            onClick={() => navigate('/landing')}
            className="cta-main-refined"
            style={{ padding: '20px 60px', fontSize: '20px' }}
          >
            Continue to Home <span className="arrow">→</span>
          </button>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '15px' }}>
             <button onClick={() => navigate('/provider-landing')} className="cta-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 24px', borderRadius: '32px', fontSize: '13px', fontWeight: 600, color: 'rgba(190, 224, 233, 0.8)', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(190, 224, 233, 0.2)', cursor: 'pointer' }}>
               <span style={{ fontSize: '16px' }}>🩺</span> I'm a Therapist
             </button>
             <button onClick={() => navigate('/corporate-landing')} className="cta-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 24px', borderRadius: '32px', fontSize: '13px', fontWeight: 600, color: 'rgba(190, 224, 233, 0.8)', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(190, 224, 233, 0.2)', cursor: 'pointer' }}>
               <span style={{ fontSize: '16px' }}>🏢</span> I'm a CHO — Corp · College · Healthcare
             </button>
             <button onClick={() => navigate('/nri-landing')} className="cta-pill cta-genz" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 24px', borderRadius: '32px', fontSize: '13px', fontWeight: 600, color: '#d4d840', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(164, 168, 48, 0.35)', cursor: 'pointer' }}>
               <span style={{ fontSize: '16px' }}>⚡</span> I'm GenZ
             </button>
          </div>
          
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '16px', maxWidth: '500px', textAlign: 'center', fontWeight: 500 }}>
            No login. No credit card. No email required. Just 7 questions and a path forward.
          </p>
        </div>
      </div>

      <div className="floating-stats-refined" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 0, width: 'fit-content', margin: '0 auto' }}>
        <div className="stat-item-refined" style={{ background: 'rgba(3, 36, 103, 0.65)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(126, 129, 0, 0.3)', borderRight: '1px solid rgba(126, 129, 0, 0.15)', padding: '22px 36px', textAlign: 'center', flex: '0 0 200px' }}>
          <span className="stat-num-refined">5</span>
          <span className="stat-label-refined" style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '5px', display: 'block' }}>Languages<br/>Hindi · English · Tamil · Telugu · Kannada</span>
        </div>
        <div className="stat-item-refined" style={{ background: 'rgba(3, 36, 103, 0.65)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(126, 129, 0, 0.3)', borderRight: '1px solid rgba(126, 129, 0, 0.15)', padding: '22px 36px', textAlign: 'center', flex: '0 0 200px' }}>
          <span className="stat-num-refined">₹99</span>
          <span className="stat-label-refined" style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '5px', display: 'block' }}>Per Month<br/>Platform Access</span>
        </div>
        <div className="stat-item-refined" style={{ background: 'rgba(3, 36, 103, 0.65)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(126, 129, 0, 0.3)', borderRight: '1px solid rgba(126, 129, 0, 0.15)', padding: '22px 36px', textAlign: 'center', flex: '0 0 200px' }}>
          <span className="stat-num-refined">24/7</span>
          <span className="stat-label-refined" style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '5px', display: 'block' }}>AnytimeBuddy<br/>AI Companion</span>
        </div>
        <div className="stat-item-refined" style={{ background: 'rgba(3, 36, 103, 0.65)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(126, 129, 0, 0.3)', borderRight: '1px solid rgba(126, 129, 0, 0.15)', padding: '22px 36px', textAlign: 'center', flex: '0 0 200px' }}>
          <span className="stat-num-refined">2 min</span>
          <span className="stat-label-refined" style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '5px', display: 'block' }}>Free Screening<br/>No Login Needed</span>
        </div>
        <div className="stat-item-refined" style={{ background: 'rgba(3, 36, 103, 0.65)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(126, 129, 0, 0.3)', padding: '22px 36px', textAlign: 'center', flex: '0 0 200px' }}>
          <span className="stat-num-refined">21</span>
          <span className="stat-label-refined" style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '5px', display: 'block' }}>Day Free Trial<br/>No Card Required</span>
        </div>
      </div>
    </div>
  );
};

export default HeroPage;
