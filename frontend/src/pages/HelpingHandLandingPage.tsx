import React from "react";
import { useNavigate } from "react-router-dom";
import "./HelpingHandLandingPage.css";

type SupportCard = {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
};

const supportCards: SupportCard[] = [
  {
    icon: "🩺",
    title: "Free Screening",
    description: "2-minute PHQ-9 mood assessment. No signup needed. Instant results in 5 languages.",
    badge: "Free",
    badgeBg: "#e0f3e7",
    badgeColor: "#2d8a4e"
  },
  {
    icon: "🧠",
    title: "Find a Therapist",
    description: "500+ NMC-verified psychologists and counselors. Matched to your needs, language, and budget."
  },
  {
    icon: "⚕️",
    title: "See a Psychiatrist",
    description: "Licensed psychiatrists for medication review and diagnosis. Sessions from ₹999.",
    badge: "₹999",
    badgeBg: "#e4eaf4",
    badgeColor: "#35588d"
  },
  {
    icon: "🎯",
    title: "Specialized Care",
    description: "Expert help for OCD, PTSD, addiction, child psychology, and more. Evidence-based therapy."
  },
  {
    icon: "👥",
    title: "Group Sessions",
    description: "Peer support circles from ₹99. Anxiety, grief, parenting, couples - led by licensed therapists.",
    badge: "₹99",
    badgeBg: "#f7e8d2",
    badgeColor: "#c06a00"
  },
  {
    icon: "🆘",
    title: "Crisis Support",
    description: "Immediate 24/7 help. KIRAN helpline: 1800-599-0019 (free). You are not alone.",
    badge: "24/7",
    badgeBg: "#f8dde5",
    badgeColor: "#db3d6d"
  }
];

const HelpingHandLandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="helping-hand-page">
      <header className="helping-hand-header">
        <div className="helping-hand-container helping-hand-header-inner">
          <div className="helping-hand-logo">
            MANAS<span>360</span>
          </div>
          <button type="button" className="helping-hand-back" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
      </header>

      <section className="helping-hand-hero">
        <div className="helping-hand-container">
          <div className="helping-hand-heart" aria-hidden>
            💚
          </div>
          <h1>I Need a Helping Hand</h1>
          <p>
            Start your healing journey. Free screening, verified therapists, and 24/7 AI support - in your language,
            at your pace.
          </p>
          <button type="button" className="helping-hand-primary" onClick={() => navigate("/assessment")}>
            Take Free 3-Min Screening →
          </button>
        </div>
      </section>

      <section className="helping-hand-container helping-hand-grid" aria-label="Mental health support options">
        {supportCards.map((card) => (
          <article key={card.title} className="helping-hand-card">
            <div className="helping-hand-icon" aria-hidden>
              {card.icon}
            </div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            {card.badge && (
              <span
                className="helping-hand-pill"
                style={{
                  background: card.badgeBg,
                  color: card.badgeColor
                }}
              >
                {card.badge}
              </span>
            )}
          </article>
        ))}
      </section>

      <section className="helping-hand-container helping-hand-cta">
        <h2>Your Mental Health Matters</h2>
        <p>Take the free PHQ-9 screening. 3 minutes. No judgment. Just clarity.</p>
        <button type="button" onClick={() => navigate("/assessment")}>
          Start Free Screening →
        </button>
      </section>

      <footer className="helping-hand-footer">
        <div className="helping-hand-footer-logo">
          MANAS<span>360</span>
        </div>
        <p className="helping-hand-footer-tagline">From Episodic to Transformational</p>

        <div className="helping-hand-footer-links">
          <button type="button" onClick={() => navigate("/")}>
            Home
          </button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/privacy")}>Privacy</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/terms")}>Terms</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/refunds")}>Refund</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/")}>Contact</button>
        </div>

        <p className="helping-hand-footer-copy">
          MANAS360 Mental Wellness Pvt. Ltd. - Bengaluru, Karnataka, India
          <br />
          © 2026 All rights reserved. MANAS360 is a technology aggregator, not a healthcare provider.
          <br />
          Crisis? Call KIRAN: 1800-599-0019 (24/7, Free)
        </p>
      </footer>
    </main>
  );
};

export default HelpingHandLandingPage;
