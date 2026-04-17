import React from "react";
import { useNavigate } from "react-router-dom";
import "./CorporateLandingPage.css";

type CorporateCard = {
  icon: string;
  title: string;
  description: string;
};

const corporateCards: CorporateCard[] = [
  {
    icon: "🏢",
    title: "Corporate Wellness / EAP",
    description: "Employee Assistance Program from ₹2L/year. 24/7 AI chatbot, unlimited therapy, manager training. CSR Section 135 eligible."
  },
  {
    icon: "🏫",
    title: "Education Institutions",
    description: "Student mental health programs for schools and colleges. NEP 2020 compliant. Counsellor access + AI chatbot."
  },
  {
    icon: "🏥",
    title: "Healthcare Units",
    description: "Hospital and clinic integration. Digital referral platform, DPDPA compliant, telepsychiatry infrastructure."
  },
  {
    icon: "🏛️",
    title: "Government Agency",
    description: "Tele-MANAS integration, ASHA worker training programs, DMHP digital support. Public health partnerships."
  }
];

const CorporateLandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="corporate-landing-page">
      <header className="corporate-landing-header">
        <div className="corporate-landing-container corporate-landing-header-inner">
          <div className="corporate-landing-logo">
            MANAS<span>360</span>
          </div>
          <button type="button" className="corporate-landing-back" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
      </header>

      <section className="corporate-landing-hero">
        <div className="corporate-landing-container">
          <div className="corporate-landing-hero-icon" aria-hidden>
            🏢
          </div>
          <h1>For Corporates, Education & Healthcare</h1>
          <p>Employee wellness, student mental health, and hospital integration - scalable programs for institutions.</p>
          <button type="button" className="corporate-landing-primary">Get Custom Quote →</button>
        </div>
      </section>

      <section className="corporate-landing-container corporate-landing-grid" aria-label="Institutional programs">
        {corporateCards.map((card) => (
          <article key={card.title} className="corporate-landing-card">
            <div className="corporate-landing-icon" aria-hidden>
              {card.icon}
            </div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </section>

      <section className="corporate-landing-container corporate-landing-cta">
        <h2>Invest in Your People</h2>
        <p>CSR Section 135 tax deduction eligible. 25-30% tax benefit on mental health spend.</p>
        <button type="button">Request Demo →</button>
      </section>

      <footer className="corporate-landing-footer">
        <div className="corporate-landing-footer-logo">
          MANAS<span>360</span>
        </div>
        <p className="corporate-landing-footer-tagline">From Episodic to Transformational</p>

        <div className="corporate-landing-footer-links">
          <button type="button" onClick={() => navigate("/")}>Home</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/privacy")}>Privacy</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/terms")}>Terms</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/refunds")}>Refund</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/")}>Contact</button>
        </div>

        <p className="corporate-landing-footer-copy">
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

export default CorporateLandingPage;
