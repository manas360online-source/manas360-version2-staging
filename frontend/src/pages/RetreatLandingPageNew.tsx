import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitRetreatIntentApi } from '../api/retreat.api';
import './RetreatLandingPageNew.css';

type FormState = {
  name: string;
  phone: string;
  email: string;
  theme: string;
  preferredDates: string;
  groupSize: string;
  budgetRange: string;
  personalNote: string;
  consentContact: boolean;
};

const RETREAT_THEMES = [
  {
    id: 'digital_detox',
    icon: '📵',
    subtitle: 'UNPLUGGED',
    title: 'Digital Detox: The Unplugged Executive',
    desc: '72 hours without screens. Guided silence. Journaling at sunrise. Designed for founders, leaders, and high-performers who\'ve forgotten what stillness sounds like.',
    location: 'Sakaleshpura',
    locationDesc: 'Western Ghats, coffee estates, river streams, zero cell coverage zones',
    tags: ['3 Nights', 'Silent Morning', 'Burnout Recovery', 'Executive'],
    price: '₹18,999',
    color: '#7C3AED',
  },
  {
    id: 'slow_living',
    icon: '🐌',
    subtitle: 'SLOW LIVING',
    title: 'Slow Living: Time Moves Differently Here',
    desc: 'Cook with a village grandmother. Walk barefoot on wet earth. Watch mist rise from valleys. This isn\'t about doing less — it\'s about feeling more.',
    location: 'Coorg (Kodagu)',
    locationDesc: 'Spice plantations, misty hills, Kodava culture, waterfalls',
    tags: ['4 Nights', 'Farm-to-Table', 'Anxiety', 'Couples Welcome'],
    price: '₹14,999',
    color: '#8B7355',
  },
  {
    id: 'eco_living',
    icon: '🌿',
    subtitle: 'ECO LIVING',
    title: 'Eco Living: Heal the Earth, Heal Yourself',
    desc: 'Organic farming mornings. Solar-powered evenings. Reconnect with the planet — and with the version of yourself that cares about something bigger.',
    location: 'Sakaleshpura',
    locationDesc: 'Certified organic farms, Western Ghats, Hemavathi River, solar homesteads',
    tags: ['3 Nights', 'Organic Farm', 'Purpose', 'Group Therapy'],
    price: '₹12,999',
    color: '#059669',
  },
  {
    id: 'village_life',
    icon: '🏡',
    subtitle: 'VILLAGE LIFE',
    title: 'Village Life: Roots Before Wings',
    desc: 'Sleep in a Malnad homestay. Wake to roosters. Milk a cow. Eat what the earth gave today. For those who\'ve been running so fast they forgot where they started.',
    location: 'Magod / Sirsi',
    locationDesc: 'Jog Falls region, Uttara Kannada villages, paddy fields, fireflies',
    tags: ['3 Nights', 'Homestay', 'Depression', 'First-Timer Friendly'],
    price: '₹9,999',
    color: '#D97706',
  },
  {
    id: 'saattvik_divine',
    icon: '🙏',
    subtitle: 'SAATTVIK DIVINE',
    title: 'Saattvik Divine Vibes: Where the Sea Meets Shiva',
    desc: 'Dawn aarti at the 123-ft Shiva. Saattvik meals. Ocean meditation. Temple silence. For those seeking not therapy, but surrender — letting something larger hold the weight.',
    location: 'Murdeshwar',
    locationDesc: 'Arabian Sea coast, Shiva temple, Netrani Island, Apsarakonda Falls',
    tags: ['3 Nights', 'Spiritual', 'Grief & Loss', 'Saattvik Meals'],
    price: '₹11,999',
    color: '#002365',
  },
  {
    id: 'ocean_reset',
    icon: '🌊',
    subtitle: 'OCEAN RESET',
    title: 'Ocean Reset: Let the Waves Carry It Away',
    desc: 'Beach walks at 5am. Sound therapy with the sea. Guided breathwork on sand. St. Mary\'s Island day trip. For anxiety that lives in the body, not just the mind.',
    location: 'Malpe / Udupi',
    locationDesc: 'Malpe Beach, St. Mary\'s Island, Krishna Temple, fishing village culture',
    tags: ['3 Nights', 'Breathwork', 'Sound Therapy', 'Anxiety / PTSD'],
    price: '₹13,999',
    color: '#0C7C8A',
  },
];

export default function RetreatLandingPageNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    theme: '',
    preferredDates: '',
    groupSize: '',
    budgetRange: '',
    personalNote: '',
    consentContact: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const scrollToIntentForm = () => {
    const target = document.getElementById('intent-form');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.phone || !form.theme || !form.consentContact) {
      setError('Please fill in all required fields and consent checkbox.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitRetreatIntentApi({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        theme: form.theme,
        preferredDates: form.preferredDates || undefined,
        groupSize: form.groupSize || undefined,
        budgetRange: form.budgetRange || undefined,
        personalNote: form.personalNote || undefined,
        consentContact: form.consentContact,
      });

      setSubmitted(true);
      setTimeout(() => {
        setForm({
          name: '',
          phone: '',
          email: '',
          theme: '',
          preferredDates: '',
          groupSize: '',
          budgetRange: '',
          personalNote: '',
          consentContact: false,
        });
        navigate('/');
      }, 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="retreat-page retreat-success-state">
        <div className="retreat-success-overlay">
          <div className="retreat-success-card">
            <div className="success-emoji">🌿</div>
            <h2>Thank You, {form.name}!</h2>
            <p>Your retreat intent for <strong>{form.theme}</strong> has been received.</p>
            <p>Our retreat team will contact you on WhatsApp within 48 hours with a custom plan.</p>
            <p><small>No payment needed yet — this is just the start of a conversation.</small></p>
            <button onClick={() => navigate('/')}>← Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="retreat-page">
      {/* BRAND BAR */}
      <div className="brand-bar">
        <div className="brand-row">
          <a href="/" className="logo">MANAS<em>360</em></a>
          <a href="/" className="back-link">← Back to Home</a>
        </div>
      </div>

      {/* HERO */}
      <div className="hero">
        <div className="hero-emoji">🏔️</div>
        <h1>Heal in <i>Nature's Embrace</i></h1>
        <p className="tagline">Not a vacation. A transformation. Curated wellness retreats across Karnataka's most healing landscapes — where therapy meets terrain.</p>
        <p className="sub">Handcrafted by MANAS360 · Admin-curated · Small groups (6-12) · Therapist-guided</p>
      </div>

      {/* PHILOSOPHY */}
      <div className="philosophy">
        <h2>Why Retreats Heal Differently</h2>
        <p>A therapy session lasts 50 minutes. A retreat rewires 50 hours. When you remove the noise — the notifications, the commute, the performance — something shifts. You stop coping and start <em>healing</em>. Each retreat is designed around a single emotional truth: <strong>the environment changes the conversation your mind has with itself.</strong></p>
      </div>

      {/* RETREAT THEMES */}
      <div className="section">
        <div className="container">
          <h2 className="section-title">Choose Your Healing Terrain</h2>
          <p className="section-sub">Each theme is mapped to a landscape that amplifies its intention. Tell us which calls to you.</p>

          <div className="theme-grid">
            {RETREAT_THEMES.map((theme) => (
              <div key={theme.id} className="theme-card">
                <div className="theme-header">
                  <span className="emoji">{theme.icon}</span>
                  <div className="subtitle" style={{ color: theme.color }}>{theme.subtitle}</div>
                  <h3>{theme.title}</h3>
                  <p>{theme.desc}</p>
                </div>
                <div className="theme-location">
                  <span className="pin">📍</span>
                  <strong>{theme.location}</strong> — {theme.locationDesc}
                </div>
                <div className="theme-details">
                  {theme.tags.map((tag, i) => (
                    <span key={i} className="theme-tag">{tag}</span>
                  ))}
                </div>
                <div className="theme-footer">
                  <div className="theme-price">From <strong>{theme.price}</strong>/person</div>
                  <a
                    href="#intent-form"
                    className="theme-cta"
                    style={{ background: theme.color }}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToIntentForm();
                    }}
                  >
                    Express Interest →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-sub">These aren't pre-packaged tours. Each retreat is handcrafted by MANAS360's retreat team after understanding your needs.</p>
          <div className="steps">
            <div className="step">
              <div className="num">1</div>
              <h4>Express Intent</h4>
              <p>Tell us which theme resonates, your dates, group size, and anything on your mind.</p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <h4>We Curate Your Plan</h4>
              <p>Our retreat admin hand-builds your itinerary — location, therapist, meals, activities.</p>
            </div>
            <div className="step">
              <div className="num">3</div>
              <h4>Review & Pay</h4>
              <p>You receive a detailed plan via WhatsApp/email. Approve it, pay via PhonePe.</p>
            </div>
            <div className="step">
              <div className="num">4</div>
              <h4>Heal & Return</h4>
              <p>Post-retreat follow-up with your therapist. Carry the stillness home.</p>
            </div>
          </div>
        </div>
      </div>

      {/* INTENT FORM */}
      <div className="container">
        <div className="intent-section" id="intent-form">
          <h2>Share Your Intent</h2>
          <p className="sub">Not a booking. Not a commitment. Just a conversation starter. Our retreat team will reach out within 48 hours.</p>

          <div className="intent-form">
            <form onSubmit={handleSubmit}>
              {error && <div className="form-error">{error}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label>Your Name *</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone (WhatsApp) *</label>
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                  />
                  <p className="field-note">This WhatsApp number will be shared with our retreat operations team for prompt follow-up.</p>
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@email.com (optional — for plan PDF)"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Which retreat theme calls to you? *</label>
                <select value={form.theme} onChange={(e) => handleChange('theme', e.target.value)} required>
                  <option value="">Select a theme...</option>
                  {RETREAT_THEMES.map(t => (
                    <option key={t.id} value={t.id}>{t.icon} {t.title}</option>
                  ))}
                  <option value="not_sure">🤔 Not sure — help me choose</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Preferred Dates</label>
                  <input
                    type="text"
                    placeholder="e.g., 'Any weekend in May' or 'June 15-18'"
                    value={form.preferredDates}
                    onChange={(e) => handleChange('preferredDates', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Group Size</label>
                  <select value={form.groupSize} onChange={(e) => handleChange('groupSize', e.target.value)}>
                    <option value="">Select size...</option>
                    <option value="solo">Solo (just me)</option>
                    <option value="couple">Couple (2 people)</option>
                    <option value="small_group">Small group (3-5)</option>
                    <option value="team">Team / Corporate (6-12)</option>
                    <option value="custom">Custom (tell us below)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Budget Comfort Zone</label>
                <select value={form.budgetRange} onChange={(e) => handleChange('budgetRange', e.target.value)}>
                  <option value="">Select range per person...</option>
                  <option value="economy">₹8,000 – ₹12,000 (Homestay + shared)</option>
                  <option value="comfort">₹12,000 – ₹18,000 (Private room + meals)</option>
                  <option value="premium">₹18,000 – ₹25,000 (Boutique + therapist)</option>
                  <option value="luxury">₹25,000+ (Exclusive + fully customized)</option>
                </select>
              </div>

              <div className="form-group">
                <label>What's on your mind? (Optional)</label>
                <textarea
                  placeholder="Share anything: what you're going through, what you hope to feel after, dietary needs, mobility concerns, or just 'I need a break.'"
                  value={form.personalNote}
                  onChange={(e) => handleChange('personalNote', e.target.value)}
                />
              </div>

              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="consent"
                  checked={form.consentContact}
                  onChange={(e) => handleChange('consentContact', e.target.checked)}
                  required
                />
                <label htmlFor="consent">
                  I consent to MANAS360 contacting me via WhatsApp/phone to discuss retreat options. My information is confidential and will not be shared with third parties.
                </label>
              </div>

              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? '⏳ Submitting...' : '🌿 Share My Intent'}
              </button>

              <p className="form-note">This is NOT a booking or payment. Our retreat admin will personally review your intent and contact you within 48 hours with a custom plan. Plans are created manually — each one is different.</p>
            </form>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-brand">MANAS<em>360</em></div>
          <p>From Episodic to Transformational</p>
          <p className="footer-links">
            <a href="/">Home</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/refund">Refund</a> · <a href="/contact">Contact</a>
          </p>
          <p className="footer-legal">
            MANAS360 Mental Wellness Pvt. Ltd. · Bengaluru, Karnataka, India<br/>
            © 2026 All rights reserved. Crisis? Call KIRAN: 1800-599-0019 (24/7, Free)
          </p>
        </div>
      </footer>
    </div>
  );
}
