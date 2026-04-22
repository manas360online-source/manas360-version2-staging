import React from "react";
import { useNavigate } from "react-router-dom";
import { buildPresetAssessmentLink } from "../config/presetDefaults";
import "./FindSparkLandingPage.css";

type SparkCard = {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
};

const sparkCards: SparkCard[] = [
  {
    icon: "💑",
    title: "Couples Therapy",
    description: "Reignite your connection. Licensed couple therapists help you communicate, heal, and grow together."
  },
  {
    icon: "🧑‍🧒",
    title: "Concerned Parent",
    description: "Professional help for your child's emotional wellbeing. Age-appropriate therapy from trained specialists."
  },
  {
    icon: "👨‍👩‍👧",
    title: "Family Plan",
    description: "Care for 2-5 family members under one plan. Shared dashboard, individual sessions.",
    badge: "₹499+",
    badgeBg: "#f7dce8",
    badgeColor: "#e23a6e"
  },
  {
    icon: "🎓",
    title: "Teen & Student",
    description: "Age-appropriate support for teens and students. Exam stress, peer pressure, identity, and more.",
    badge: "50% off",
    badgeBg: "#fdebcf",
    badgeColor: "#d97706"
  }
];

const FindSparkLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const couplesAssessmentLink = buildPresetAssessmentLink('couples', {
    utmSource: 'landing',
    utmMedium: 'quickrail',
    utmCampaign: 'couples-therapy',
  });

  return (
    <main className="spark-page">
      <header className="spark-header">
        <div className="spark-container spark-header-inner">
          <button type="button" className="spark-logo" onClick={() => navigate(couplesAssessmentLink)}>
            MANAS<span>360</span>
          </button>
          <button type="button" className="spark-back" onClick={() => navigate(couplesAssessmentLink)}>
            ← Back to Home
          </button>
        </div>
      </header>

      <section className="spark-hero">
        <div className="spark-container">
          <div className="spark-heart" aria-hidden>
            ❤️
          </div>
          <h1>Find a Spark Again</h1>
          <p>Couples, parents, and families - expert support for the relationships that matter most.</p>
          <button type="button" className="spark-primary" onClick={() => navigate(couplesAssessmentLink)}>Book Couples Session →</button>
        </div>
      </section>

      <section className="spark-container spark-grid" aria-label="Support options for couples and families">
        {sparkCards.map((card) => (
          <article key={card.title} className="spark-card">
            <div className="spark-icon" aria-hidden>
              {card.icon}
            </div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            {card.badge && (
              <span
                className="spark-pill"
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

      <section className="spark-container spark-cta">
        <h2>Every Relationship Deserves Care</h2>
        <p>First couples session at ₹499 (normally ₹999). Take the first step together.</p>
        <button type="button" onClick={() => navigate(couplesAssessmentLink)}>Book Couples Session - ₹499 →</button>
      </section>

      <footer className="spark-footer">
        <div className="spark-footer-logo">
          MANAS<span>360</span>
        </div>
        <p className="spark-footer-tagline">From Episodic to Transformational</p>

        <div className="spark-footer-links">
          <button type="button" onClick={() => navigate(couplesAssessmentLink)}>Home</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/privacy")}>Privacy</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/terms")}>Terms</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/refunds")}>Refund</button>
          <span>·</span>
          <button type="button" onClick={() => navigate(couplesAssessmentLink)}>Contact</button>
        </div>

        <p className="spark-footer-copy">
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

export default FindSparkLandingPage;
