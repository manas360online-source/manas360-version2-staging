import React from "react";
import { Link, useNavigate } from "react-router-dom";
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

type PricingSegment = "corporate" | "healthcare" | "education";

type PricingPlan = {
  key: "startup" | "growth" | "enterprise";
  name: string;
  size: string;
  annualBase: number;
  perEmployeeBase: number;
  featured?: boolean;
  ctaClass: "pc-cta-outline" | "pc-cta-primary" | "pc-cta-gold";
  ctaHref: string;
  features: string[];
};

const segmentDiscount: Record<PricingSegment, number> = {
  corporate: 0,
  healthcare: 0.1,
  education: 0.25,
};

const pricingPlans: PricingPlan[] = [
  {
    key: "startup",
    name: "Startup",
    size: "50 - 200 employees",
    annualBase: 200000,
    perEmployeeBase: 1000,
    ctaClass: "pc-cta-outline",
    ctaHref: "/corporate?mode=demo&tier=startup",
    features: [
      "Unlimited 1:1 therapy sessions",
      "24/7 AnytimeBuddy AI chatbot",
      "1 group session per quarter",
      "Crisis support + helpline access",
      "Anonymous QR screening standees",
      "HR dashboard (anonymous analytics)",
      "CSR Section 135 (25% deduction)",
      "No manager training",
      "No dedicated account manager",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    size: "200 - 1,000 employees",
    annualBase: 500000,
    perEmployeeBase: 500,
    featured: true,
    ctaClass: "pc-cta-primary",
    ctaHref: "/corporate?mode=demo&tier=growth",
    features: [
      "Everything in Startup",
      "2 group sessions per quarter",
      "Manager mental health training (2/yr)",
      "Custom wellness workshops",
      "Dedicated account manager",
      "Monthly anonymous usage reports",
      "SSO / email domain login",
      "CSR Section 135 (25% deduction)",
      "No executive coaching",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    size: "1,000 - 5,000 employees",
    annualBase: 1200000,
    perEmployeeBase: 250,
    ctaClass: "pc-cta-gold",
    ctaHref: "/corporate?mode=demo&tier=enterprise",
    features: [
      "Everything in Growth",
      "4 group sessions per quarter",
      "Executive coaching access",
      "Leadership resilience workshops",
      "Multilingual (5 languages)",
      "Custom ROI dashboard",
      "API / HRIS integration",
      "On-site wellness day (1/year)",
      "CSR Section 135 (30% deduction)",
    ],
  },
];

const formatLakhs = (value: number): string => {
  if (value >= 100000) {
    const inLakhs = value / 100000;
    return `${Number.isInteger(inLakhs) ? inLakhs.toFixed(0) : inLakhs.toFixed(1)}L`;
  }
  return value.toLocaleString("en-IN");
};

const CorporateLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [segment, setSegment] = React.useState<PricingSegment>("corporate");

  const discount = segmentDiscount[segment];

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
          <Link className="corporate-landing-primary" to="/corporate">
            How it works ? →
          </Link>
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

      <section className="section pricing-section">
        <div className="corporate-landing-container">
          <div className="section-title">Pricing Plans</div>

          <div className="pricing-toggle">
            <button className={`toggle-btn ${segment === "corporate" ? "active" : ""}`} onClick={() => setSegment("corporate")}>🏢 Corporate</button>
            <button className={`toggle-btn ${segment === "healthcare" ? "active" : ""}`} onClick={() => setSegment("healthcare")}>🏥 Healthcare <span className="discount-badge discount-10">10% OFF</span></button>
            <button className={`toggle-btn ${segment === "education" ? "active" : ""}`} onClick={() => setSegment("education")}>🏫 Education <span className="discount-badge discount-25">25% OFF</span></button>
          </div>

          <div className="pricing-grid">
            {pricingPlans.map((plan) => {
              const discountedAnnual = Math.round(plan.annualBase * (1 - discount));
              const discountedPerEmployee = Math.round(plan.perEmployeeBase * (1 - discount));
              const annualSavings = plan.annualBase - discountedAnnual;

              return (
                <div key={plan.key} className={`price-card ${plan.featured ? "featured" : ""}`}>
                  <div className="pc-name">{plan.name}</div>
                  <div className="pc-size">{plan.size}</div>
                  <div className="pc-price">₹{formatLakhs(discountedAnnual)} <span>/year</span></div>
                  <div className="pc-per">₹{discountedPerEmployee.toLocaleString("en-IN")} per employee</div>
                  {discount > 0 && <div className="pc-original">₹{formatLakhs(plan.annualBase)}/year (Corporate rate)</div>}
                  {discount > 0 && <div className="pc-savings">You save ₹{formatLakhs(annualSavings)}/year</div>}
                  <ul className="pc-features">
                    {plan.features.map((feature) => {
                      const isNoFeature = feature.startsWith("No ");
                      return (
                        <li key={feature}>{isNoFeature ? "❌" : "✅"} {feature}</li>
                      );
                    })}
                  </ul>
                  <Link className={`pc-cta ${plan.ctaClass}`} to={plan.ctaHref}>Request Demo →</Link>
                </div>
              );
            })}
          </div>

          <div className="pricing-note">
            <strong>5,000+ employees?</strong> Custom pricing. <Link to="/corporate?mode=demo" style={{ color: "var(--sky)" }}>Contact us →</Link><br />
            All plans: DPDPA compliant · NMC/RCI verified therapists · AWS Mumbai data residency · MANAS360 is a technology aggregator, not a healthcare provider.
          </div>

          <div className="badge-section">
            <div className="badge-section-title">🏆 Your Badge of Honor - What You&apos;re Really Paying</div>
            <div className="badge-grid">
              <div className="honor-badge badge-bronze">
                <div className="hb-star">⭐</div>
                <div className="hb-tier">Bronze Wellness Champion</div>
                <div className="hb-emps">5,000</div>
                <div className="hb-label">employees</div>
                <div className="hb-daily">₹0.68</div>
                <div className="hb-daily-label">per employee per day</div>
                <div className="hb-daily-compare">Less than a matchstick. For a human life.</div>
                <div className="hb-badges">
                  <div className="hb-mini hb-mini-csr"><span className="hb-mini-icon">💰</span><div className="hb-mini-text"><strong>CSR Fund: ₹12.5L/year</strong><span>Sec 135 · 30% tax deduction = ₹3.75L saved</span></div></div>
                  <div className="hb-mini hb-mini-compliance"><span className="hb-mini-icon">🛡️</span><div className="hb-mini-text"><strong>5 Compliances in One Shot</strong><span>DPDPA · NMC/RCI · POSH · OSH Act · CSR Sec 135</span></div></div>
                </div>
              </div>

              <div className="honor-badge badge-silver">
                <div className="hb-star">⭐⭐</div>
                <div className="hb-tier">Silver Wellness Champion</div>
                <div className="hb-emps">10,000</div>
                <div className="hb-label">employees</div>
                <div className="hb-daily">₹0.68</div>
                <div className="hb-daily-label">per employee per day</div>
                <div className="hb-daily-compare">Less than a single SMS. For total mental wellness.</div>
                <div className="hb-badges">
                  <div className="hb-mini hb-mini-csr"><span className="hb-mini-icon">💰</span><div className="hb-mini-text"><strong>CSR Fund: ₹25L/year</strong><span>Sec 135 · 30% tax deduction = ₹7.5L saved</span></div></div>
                  <div className="hb-mini hb-mini-compliance"><span className="hb-mini-icon">🛡️</span><div className="hb-mini-text"><strong>5 Compliances in One Shot</strong><span>DPDPA · NMC/RCI · POSH · OSH Act · CSR Sec 135</span></div></div>
                </div>
              </div>

              <div className="honor-badge badge-gold">
                <div className="hb-star">⭐⭐⭐</div>
                <div className="hb-tier">Gold Wellness Champion</div>
                <div className="hb-emps">49,000</div>
                <div className="hb-label">employees</div>
                <div className="hb-daily">₹0.68</div>
                <div className="hb-daily-label">per employee per day</div>
                <div className="hb-daily-compare">Less than one chai. For 49,000 lives protected.</div>
                <div className="hb-badges">
                  <div className="hb-mini hb-mini-csr"><span className="hb-mini-icon">💰</span><div className="hb-mini-text"><strong>CSR Fund: ₹1.22Cr/year</strong><span>Sec 135 · 30% tax deduction = ₹36.75L saved</span></div></div>
                  <div className="hb-mini hb-mini-compliance"><span className="hb-mini-icon">🛡️</span><div className="hb-mini-text"><strong>5 Compliances in One Shot</strong><span>DPDPA · NMC/RCI · POSH · OSH Act · CSR Sec 135</span></div></div>
                </div>
              </div>
            </div>
          </div>

          <div className="comparison-wrap">
            <table className="comparison-table">
              <thead><tr><th>Feature</th><th>Startup</th><th>Growth ⭐</th><th>Enterprise</th></tr></thead>
              <tbody>
                <tr><td>Annual fee</td><td>₹{formatLakhs(Math.round(200000 * (1 - discount)))}</td><td>₹{formatLakhs(Math.round(500000 * (1 - discount)))}</td><td>₹{formatLakhs(Math.round(1200000 * (1 - discount)))}</td></tr>
                <tr><td>Per employee</td><td>₹{Math.round(1000 * (1 - discount)).toLocaleString("en-IN")}</td><td>₹{Math.round(500 * (1 - discount)).toLocaleString("en-IN")}</td><td>₹{Math.round(250 * (1 - discount)).toLocaleString("en-IN")}</td></tr>
                <tr><td>Unlimited 1:1 therapy</td><td className="ct-check">✓</td><td className="ct-check">✓</td><td className="ct-check">✓</td></tr>
                <tr><td>24/7 AI chatbot</td><td className="ct-check">✓</td><td className="ct-check">✓</td><td className="ct-check">✓</td></tr>
                <tr><td>Group sessions / quarter</td><td>1</td><td>2</td><td>4</td></tr>
                <tr><td>Crisis support</td><td className="ct-check">✓</td><td className="ct-check">✓</td><td className="ct-check">✓</td></tr>
                <tr><td>Anonymous QR screening</td><td className="ct-check">✓</td><td className="ct-check">✓</td><td className="ct-check">✓</td></tr>
                <tr><td>HR dashboard</td><td className="ct-check">✓</td><td className="ct-check">✓</td><td className="ct-check">✓</td></tr>
                <tr><td>Manager training</td><td className="ct-cross">-</td><td>2/year</td><td>4/year</td></tr>
                <tr><td>Account manager</td><td className="ct-cross">-</td><td className="ct-check">✓</td><td className="ct-check">✓</td></tr>
                <tr><td>SSO / email domain login</td><td className="ct-cross">-</td><td className="ct-check">✓</td><td className="ct-check">✓</td></tr>
                <tr><td>Executive coaching</td><td className="ct-cross">-</td><td className="ct-cross">-</td><td className="ct-check">✓</td></tr>
                <tr><td>Multilingual (5 languages)</td><td className="ct-cross">-</td><td className="ct-cross">-</td><td className="ct-check">✓</td></tr>
                <tr><td>API / HRIS integration</td><td className="ct-cross">-</td><td className="ct-cross">-</td><td className="ct-check">✓</td></tr>
                <tr><td>On-site wellness day</td><td className="ct-cross">-</td><td className="ct-cross">-</td><td>1/year</td></tr>
                <tr><td>CSR tax deduction</td><td>25%</td><td>25%</td><td>30%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="corporate-landing-container corporate-landing-cta">
        <h2>Invest in Your People</h2>
        <p>CSR Section 135 tax deduction eligible. 25-30% tax benefit on mental health spend.</p>
        <Link to="/corporate?mode=demo">
          Request Demo →
        </Link>
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
