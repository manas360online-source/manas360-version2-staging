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
          <p className="nri-kicker">FOR NRIS & GLOBAL INDIANS</p>
          <h1>
            Find Your <em>Janmabhoomi</em>
            <br />
            Connection - Heal
          </h1>
          <p className="nri-subtitle">
            Therapy in your mother tongue with Indian therapists who understand your desi dilemma - career pressure
            abroad, family guilt, identity crisis, relationship bridges across continents.
          </p>
          <div className="nri-hero-chips">
            <span>🕒 Sessions in YOUR Timezone</span>
            <span>🗣️ Hindi · Tamil · Telugu · Kannada · English</span>
            <span>🔒 DPDPA Compliant</span>
            <span>💳 Pay in USD</span>
            <span>👨‍👩‍👧 Gift Sessions to Family in India</span>
          </div>
        </div>
      </section>

      <section className="nri-shell nri-section-head">
        <h2>Choose Your Plan</h2>
        <p>All plans include 21-day free trial with AnytimeBuddy AI access</p>
      </section>

      <section className="nri-shell nri-plan-grid">
        <article className="nri-plan-card">
          <span className="plan-badge starter">Starter</span>
          <h3>Saathi</h3>
          <p className="plan-tagline">"Your companion on the journey"</p>
          <p className="plan-price">$49<span>/month</span></p>
          <ul>
            <li>2 group sessions/month</li>
            <li>AnytimeBuddy AI support</li>
            <li>Digital Pets + Sound Library</li>
            <li>PHQ-9 / GAD-7 monthly check-in</li>
          </ul>
          <button type="button" className="ghost">Start Free Trial →</button>
        </article>

        <article className="nri-plan-card featured">
          <span className="plan-badge popular">Most Popular</span>
          <h3>Bandham</h3>
          <p className="plan-tagline">"The bond that heals"</p>
          <p className="plan-price">$99<span>/month</span></p>
          <ul>
            <li>2 individual sessions/month</li>
            <li>2 group sessions/month</li>
            <li>Guided journaling with AI prompts</li>
            <li>Gift 1 session/month to family in India</li>
          </ul>
          <button type="button">Start Free Trial →</button>
        </article>

        <article className="nri-plan-card">
          <span className="plan-badge premium">Premium</span>
          <h3>Kutumbam</h3>
          <p className="plan-tagline">"For the whole family"</p>
          <p className="plan-price">$179<span>/month</span></p>
          <ul>
            <li>4 individual sessions/month</li>
            <li>Unlimited group sessions</li>
            <li>Quarterly psychiatrist consultation</li>
            <li>Up to 3 family members in India</li>
          </ul>
          <button type="button">Start Free Trial →</button>
        </article>
      </section>

      <section className="nri-shell nri-table-wrap">
        <h2>Feature Comparison</h2>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Saathi ($49)</th>
              <th>Bandham ($99)</th>
              <th>Kutumbam ($179)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Individual sessions/month</td><td>-</td><td>2</td><td>4</td></tr>
            <tr><td>Group sessions/month</td><td>2</td><td>2</td><td>Unlimited</td></tr>
            <tr><td>AnytimeBuddy AI</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr><td>Gift sessions to India family</td><td>Screening only</td><td>1/month</td><td>3 members</td></tr>
            <tr><td>Psychiatrist consultation</td><td>-</td><td>-</td><td>1/quarter</td></tr>
          </tbody>
        </table>
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
          Kutumbam supports up to 3 family members.
        </p>
      </section>

      <section className="nri-cta-strip">
        <div className="nri-shell">
          <h3>Your Roots. Your Language. Your Healing.</h3>
          <p>Start your 21-day free trial today. No payment required until your therapist match is confirmed.</p>
          <button type="button">IN Start Free Trial - Connect to Home →</button>
        </div>
      </section>

      <footer className="nri-legal-footer">
        © 2025 MANAS360 Mental Wellness Pvt. Ltd. - Bengaluru, Karnataka, India | Home · Privacy · Terms
      </footer>
    </main>
  );
};

export default NRILandingPage;
