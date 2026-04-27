import React from "react";
import { Link } from "react-router-dom";
import "./PremiumTheraphyLandingPage.css";

type HubCard = {
  icon: string;
  title: string;
  description: string;
  tags: string[];
  status?: string;
  action: string;
  price: string;
};

const basicCards: HubCard[] = [
  {
    icon: "🎵",
    title: "Sound Therapy",
    description:
      "Curated soundscapes for sleep, calm, focus, and healing. 200+ tracks across Indian classical ragas, nature sounds, and guided meditations.",
    tags: ["PT04 - Sound Library", "Offline Downloads", "Raga Therapy", "Binaural Beats", "200+ Tracks"],
    status: "ACTIVE",
    action: "Explore Sounds →",
    price: "Free tier + Premium Unlimited"
  },
  {
    icon: "🤖",
    title: "AnytimeBuddy",
    description:
      "Your 24/7 AI companion for between-session support. Quick check-ins, mood tracking conversations, and guided breathing exercises.",
    tags: ["PT07 - AnytimeBuddy", "24/7 Available", "15-min Sessions", "Mood Check-ins", "Breathing Guide"],
    status: "ACTIVE",
    action: "Start Chat →",
    price: "₹150/call or Premium Free"
  },
  {
    icon: "🔥",
    title: "VentBuddy",
    description:
      "A safe, judgment-free space to express overwhelming emotions. Voice or text - let it out with empathetic support.",
    tags: ["PT09 - Vent Buddy", "Voice Venting", "Text Expression", "Empathetic AI", "Auto Journals"],
    status: "ACTIVE",
    action: "Vent Now →",
    price: "3 free/day or Premium Unlimited"
  },
  {
    icon: "🐾",
    title: "Digital Pets Hub",
    description:
      "Nurture virtual companions that grow with your mental wellness journey. Habit loops, mini-games, and mood reward systems.",
    tags: ["PT06 - Digital Pets", "10 Unique Species", "AR Mode", "Mini-Games", "Habit Building"],
    status: "ACTIVE",
    action: "Meet Your Pet →",
    price: "Starter free + Premium All Pets"
  }
];

const advancedCards: HubCard[] = [
  {
    icon: "💡",
    title: "White Light Therapy",
    description:
      "Guided light visualization and chronotherapy sessions designed for seasonal mood support and circadian rhythm alignment.",
    tags: ["PT11 - White Light", "Chronotherapy", "Circadian Sync", "Guided Visualization", "Rx: Insomnia"],
    status: "COMING SOON",
    action: "Notify Me →",
    price: "Expected Q3 2026"
  },
  {
    icon: "✨",
    title: "Happy Vibes",
    description:
      "Positive psychology interventions, gratitude exercises, and joy-building activities for daily emotional uplift.",
    tags: ["PT12 - Happy Vibes", "Gratitude Journal", "Joy Micro-Moments", "Daily Nudges", "Rx: Between Sessions"],
    status: "COMING SOON",
    action: "Notify Me →",
    price: "Expected Q3 2026"
  },
  {
    icon: "🕉️",
    title: "Aatman & More",
    description:
      "India-rooted spiritual wellness with meditation, pranayama, chakra balancing, and culturally-adapted mindfulness.",
    tags: ["PT13 - Aatman", "Vedic Meditation", "Chakra Balancing", "Pranayama", "Mindful Rituals"],
    status: "COMING SOON",
    action: "Notify Me →",
    price: "Expected Q4 2026"
  }
];

const PremiumTheraphyLandingPage: React.FC = () => {
  return (
    <main className="premium-theraphy-page">
      <header className="premium-topbar">
        <div className="premium-shell premium-topbar-inner">
          <div className="premium-logo">
            MANAS<span>360</span>
          </div>
          <div className="premium-nav-actions">
            <button type="button">📋 My Sessions</button>
            <button type="button">💬 Messages</button>
            <button type="button" className="premium-badge">👑 Premium Active</button>
          </div>
        </div>
      </header>

      <section className="premium-hero">
        <div className="premium-shell premium-center">
          <div className="premium-mini-tag">📑 PREMIUM THERAPY HUB</div>
          <h1>Your Complete Healing Ecosystem</h1>
          <p>
            Explore therapeutic tools recommended by your therapist, prescribed by your psychiatrist, or discover them
            independently at your own pace.
          </p>

          <div className="premium-hero-actions">
            <button type="button" className="primary">📋 Via Therapist / Psychiatrist Prescription</button>
            <span>OR</span>
            <button type="button">🧭 Explore Independently</button>
          </div>

          <div className="premium-info-card">
            <div className="icon">🩺</div>
            <p>
              <strong>How prescriptions work:</strong> After a therapy session, your therapist can prescribe specific
              tools. These appear as recommended in your hub, while you can still explore everything freely.
            </p>
          </div>
        </div>
      </section>

      <section className="premium-shell hub-intro">
        <div className="hub-icon">🏠</div>
        <div>
          <h2>PT01 - Therapy Hub</h2>
          <p>
            Your central command center. All therapy sessions, prescriptions, progress tracking, and recommended tools
            live here.
          </p>
          <div className="chips">
            <span>✓ 5 Basic Practices</span>
            <span>⏳ 3 Advanced Therapy</span>
            <span>📊 Progress Dashboard</span>
          </div>
        </div>
      </section>

      <section className="premium-shell section-head">
        <h3>🟢 Active Therapies <span>LIVE NOW</span></h3>
        <p>{basicCards.length} therapeutic tools available</p>
      </section>

      <section className="premium-shell tool-grid basic">
        {basicCards.map((card) => (
          <article key={card.title} className="tool-card">
            <div className="tool-card-head">
              <div className="tool-icon">{card.icon}</div>
              <div>
                <h4>{card.title}</h4>
              </div>
              {card.status && <span className="status active">{card.status}</span>}
            </div>
            <p>{card.description}</p>
            <div className="tags">
              {card.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <div className="tool-footer">
              {card.title === "Sound Therapy" ? (
                <Link to="/sound-therapy">{card.action}</Link>
              ) : card.title.includes("Digital Pets") || card.title === "Digital Pets Hub" ? (
                <Link to="/pet">{card.action}</Link>
              ) : (
                <a href="#">{card.action}</a>
              )}
              <strong>{card.price}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="premium-shell section-head">
        <h3>⏳ Coming Soon <span className="soon">IN DEVELOPMENT</span></h3>
        <p>3 advanced therapies on the horizon - Premium users get first access</p>
      </section>

      <section className="premium-shell tool-grid advanced">
        {advancedCards.map((card) => (
          <article key={card.title} className="tool-card">
            <div className="tool-card-head">
              <div className="tool-icon">{card.icon}</div>
              <div>
                <h4>{card.title}</h4>
              </div>
              {card.status && <span className="status soon">{card.status}</span>}
            </div>
            <p>{card.description}</p>
            <div className="tags">
              {card.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <div className="tool-footer">
              <a href="#">{card.action}</a>
              <strong>{card.price}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="premium-shell sitemap">
        <h3>📐 Complete Patient Therapy Sitemap - V2</h3>
        <p>Screen inventory after cleanup. Strikethrough items were merged or removed.</p>
      </section>

      <footer className="premium-page-footer">
        <div className="premium-footer-brand">MANAS<span>360</span></div>
        <p className="premium-footer-copy">Premium Therapy Hub - Your complete healing ecosystem. Explore freely or follow your therapist's prescription.</p>
      </footer>
    </main>
  );
};

export default PremiumTheraphyLandingPage;
