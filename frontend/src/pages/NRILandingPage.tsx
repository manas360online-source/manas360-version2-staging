import React from "react";
import { useNavigate } from "react-router-dom";
import "./NRILandingPage.css";

const NRILandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="nri-page">
      <div className="nri-top-strip">
        <div className="nri-shell">
          <span>IN Janmabhoomi Vibes - Therapy in your mother tongue, from anywhere in the world</span>
          <button type="button">View Plans →</button>
        </div>
      </div>

      <header className="nri-header">
        <div className="nri-shell nri-header-inner">
          <div className="nri-logo">
            MANAS<span>360</span>
          </div>
          <button type="button" className="nri-back" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
      </header>

      <section className="nri-hero">
        <div className="nri-shell nri-hero-inner">
          <p className="nri-kicker">FOR NRI & GLOBAL INDIAN COMMUNITY</p>
          <h1>
            Find Your <em>Janmabhoomi</em>
            <br />
            Connection - Heal with the Right Care
          </h1>
          <p className="nri-subtitle">
            Therapy in your mother tongue with Indian experts who understand NRI realities - career pressure
            abroad, family guilt, identity shifts, and relationships across continents.
          </p>
          <div className="nri-hero-chips">
            <span>🕒 IST + Your Local Timezone</span>
            <span>🗣️ Hindi · Tamil · Telugu · Kannada · English</span>
            <span>🔒 DPDPA-aligned care</span>
            <span>💳 USD / GBP / AED / SGD accepted</span>
            <span>👨‍👩‍👧 Gift Sessions to Family in India</span>
          </div>
        </div>
      </section>

      <section className="nri-shell nri-section-head">
        <h2>Choose Your NRI Session Type</h2>
        <p>Use the existing NRI per-session pricing. No legacy monthly bundles.</p>
      </section>

      <section className="nri-shell nri-plan-grid">
        <article className="nri-plan-card">
          <span className="plan-badge starter">NRI Core</span>
          <h3>Psychologist Session</h3>
          <p className="plan-tagline">Focused therapy support with cultural context</p>
          <p className="plan-price">₹2,999<span>/session</span></p>
          <ul>
            <li>1:1 psychologist session</li>
            <li>NRI-friendly matching and timezone support</li>
            <li>AnytimeBuddy AI support</li>
            <li>PHQ-9 / GAD-7 check-ins</li>
          </ul>
          <button type="button" className="ghost">Book Session →</button>
        </article>

        <article className="nri-plan-card featured">
          <span className="plan-badge popular">Most Booked</span>
          <h3>Psychiatrist Session</h3>
          <p className="plan-tagline">Medication review and psychiatric consultation</p>
          <p className="plan-price">₹3,499<span>/session</span></p>
          <ul>
            <li>1:1 psychiatrist consultation</li>
            <li>Suitable for medication and clinical escalation</li>
            <li>Timezone-aligned appointment slots</li>
            <li>Private and compliant care journey</li>
          </ul>
          <button type="button">Book Session →</button>
        </article>

        <article className="nri-plan-card">
          <span className="plan-badge premium">Extended</span>
          <h3>Therapist Session</h3>
          <p className="plan-tagline">Structured therapy for recurring support</p>
          <p className="plan-price">₹3,599<span>/session</span></p>
          <ul>
            <li>1:1 therapist-led session</li>
            <li>Ideal for ongoing emotional regulation work</li>
            <li>Works with existing AI check-ins and reflections</li>
            <li>Session-by-session flexibility</li>
          </ul>
          <button type="button">Book Session →</button>
        </article>
      </section>

      <section className="nri-shell nri-card-muted">
        <h3>Session Pricing Snapshot</h3>
        <p>Existing NRI rates in the platform: Psychologist ₹2,999/session, Psychiatrist ₹3,499/session, Therapist ₹3,599/session.</p>
      </section>

      <section className="nri-shell nri-info-card">
        <h3>🕒 Timezone Scheduling - How It Works</h3>
        <p>Our therapists are based in India (IST). Dedicated pools ensure convenient evening/morning slots in your timezone.</p>
        <div className="zone-grid">
          <div><strong>US EAST COAST</strong><span>6-9 PM EST</span></div>
          <div><strong>US WEST COAST</strong><span>6-9 PM PST</span></div>
          <div><strong>UNITED KINGDOM</strong><span>6-9 PM GMT</span></div>
          <div><strong>AUSTRALIA</strong><span>6-9 PM AEST</span></div>
          <div><strong>SINGAPORE</strong><span>7-10 PM SGT</span></div>
          <div><strong>UAE / GULF</strong><span>7-10 PM GST</span></div>
        </div>
      </section>

      <section className="nri-shell nri-card-muted">
        <h3>🔒 Anonymous Group Attendance</h3>
        <p>Camera-off by default, alias support, and no recordings or participant lists visible to others.</p>
      </section>

      <section className="nri-shell nri-card-success">
        <h3>👨‍👩‍👧 Gift Therapy to Family Back Home</h3>
        <p>
          Pay in USD while your family receives care in their preferred language at IST-convenient hours.
          You can sponsor sessions for family members in India based on availability and consent.
        </p>
      </section>

      <section className="nri-cta-strip">
        <div className="nri-shell">
          <h3>Your Roots. Your Language. Your Healing.</h3>
          <p>Book with the current NRI per-session model and get matched to the right care expert.</p>
          <button type="button">Book NRI Session →</button>
        </div>
      </section>

      <footer className="nri-legal-footer">
        © 2025 MANAS360 Mental Wellness Pvt. Ltd. - Bengaluru, Karnataka, India | Home · Privacy · Terms
      </footer>
    </main>
  );
};

export default NRILandingPage;
