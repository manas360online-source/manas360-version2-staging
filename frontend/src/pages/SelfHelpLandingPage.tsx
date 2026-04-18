import React from "react";
import { useNavigate } from "react-router-dom";
import "./SelfHelpLandingPage.css";

type ToolCard = {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
};

const toolCards: ToolCard[] = [
  {
    icon: "📊",
    title: "Mood Tracker",
    description: "Track emotional trends daily. Visual charts show patterns over weeks and months.",
    badge: "Free",
    badgeBg: "#ecebd6",
    badgeColor: "#848000"
  },
  {
    icon: "🎵",
    title: "Sound Therapy",
    description: "200+ calm, focus, and sleep tracks. Raga healing, nature sounds, binaural beats.",
    badge: "Free",
    badgeBg: "#ecebd6",
    badgeColor: "#848000"
  },
  {
    icon: "🌬️",
    title: "Breathing Exercises",
    description: "4-7-8, Box Breathing, Calm Breath - guided sessions with visual timers.",
    badge: "Free",
    badgeBg: "#ecebd6",
    badgeColor: "#848000"
  },
  {
    icon: "📔",
    title: "Journaling Prompts",
    description: "Daily reflection questions to build self-awareness. New prompts every day."
  },
  {
    icon: "🌙",
    title: "Sleep Guide",
    description: "Sleep hygiene checklist, wind-down routine, and bedtime stories for better rest."
  },
  {
    icon: "📝",
    title: "CBT Worksheets",
    description: "Thought records, behavioral experiments, and cognitive restructuring exercises.",
    badge: "Free",
    badgeBg: "#ecebd6",
    badgeColor: "#848000"
  }
];

const SelfHelpLandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="self-help-page">
      <header className="self-help-header">
        <div className="self-help-container self-help-header-inner">
          <div className="self-help-logo">
            MANAS<span>360</span>
          </div>
          <button type="button" className="self-help-back" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
      </header>

      <section className="self-help-hero">
        <div className="self-help-container">
          <div className="self-help-icon-hero" aria-hidden>
            🧘
          </div>
          <h1>Self-Help Tools</h1>
          <p>Free tools you can use right now - no login, no signup, no cost. Build healthy habits at your own pace.</p>
          <button type="button" className="self-help-primary">Explore Free Tools →</button>
        </div>
      </section>

      <section className="self-help-container self-help-grid" aria-label="Self-help tools">
        {toolCards.map((card) => (
          <article key={card.title} className="self-help-card">
            <div className="self-help-icon" aria-hidden>
              {card.icon}
            </div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            {card.badge && (
              <span
                className="self-help-pill"
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

      <section className="self-help-container self-help-cta">
        <h2>Free Tools, Real Results</h2>
        <p>No signup needed. Start using these tools right now.</p>
        <button type="button">Start Now - It's Free →</button>
      </section>

      <footer className="self-help-footer">
        <div className="self-help-footer-logo">
          MANAS<span>360</span>
        </div>
        <p className="self-help-footer-tagline">From Episodic to Transformational</p>

        <div className="self-help-footer-links">
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

        <p className="self-help-footer-copy">
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

export default SelfHelpLandingPage;
