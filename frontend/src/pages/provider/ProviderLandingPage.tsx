import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './ProviderLandingPage.css';

type Notification = { name: string; action: string; time: string; city: string };
type Milestone = {
  side: 'left' | 'right';
  top: number;
  badge: string;
  title: string;
  timeline: string;
  desc: React.ReactNode;
  incomeLabel?: string;
  incomeAmount?: string;
  incomeSub?: string;
  skills?: string[];
  footer?: React.ReactNode;
  flag: string;
  goldIncome?: boolean;
};

type LeadPlan = {
  name: string;
  price: string;
  suffix: string;
  period: string;
  cta: string;
  ctaClass: 'outline' | 'primary' | 'gold';
  features: string[];
  planKey: string;
  featured?: boolean;
  badge?: string;
};

export const ProviderLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [hours, setHours] = useState('23');
  const [minutes, setMinutes] = useState('59');
  const [seconds, setSeconds] = useState('59');
  const [showNotif, setShowNotif] = useState(false);
  const [notifIndex, setNotifIndex] = useState(0);
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const notifications: Notification[] = useMemo(
    () => [
      { name: 'Dr. Rajesh K.', action: 'Just completed NLP Certification', time: '2 minutes ago', city: 'Mumbai' },
      { name: 'Dr. Priya S.', action: 'Earned ₹32,000 in first month', time: '5 minutes ago', city: 'Delhi' },
      { name: 'Dr. Amit R.', action: 'Just landed ₹2L corporate retainer', time: '8 minutes ago', city: 'Bangalore' },
      { name: 'Dr. Meera J.', action: 'Became Master Mentor', time: '12 minutes ago', city: 'Pune' },
      { name: 'Dr. Karthik V.', action: 'Started group therapy sessions', time: '15 minutes ago', city: 'Chennai' },
      { name: 'Dr. Anjali M.', action: 'Completed Certified Aatman Coach program', time: '18 minutes ago', city: 'Hyderabad' },
    ],
    []
  );

  const milestones: Milestone[] = [
    {
      side: 'left', top: 50, badge: 'FREE', title: '🚀 Week 1: Get Started', timeline: '📅 Week 1-2 • ⏱️ 2 hours',
      desc: <>Submit credentials, complete platform training, get verified. <strong>Zero investment required.</strong></>,
      incomeLabel: 'Investment', incomeAmount: '₹0', flag: '🎯',
    },
    {
      side: 'right', top: 250, badge: 'FREE CERTIFICATION', title: '🧠 Week 3: Master 5 Whys', timeline: '📅 Week 3-4 • ⏱️ 6 hours',
      desc: <>Learn root cause analysis, empathy framework, and projecting questions. Earn your first certification!</>,
      skills: ['Root Cause Analysis', 'Empathy Framework', 'Active Listening'], flag: '🎓',
    },
    {
      side: 'left', top: 450, badge: '💰 REVENUE STARTS', title: '💵 Month 2: First Earnings', timeline: '📅 Week 5+ • 15 sessions/month',
      desc: <>Buy lead package (₹2,500), convert patients, start earning. <strong>ROI: 399%</strong></>,
      incomeLabel: 'Monthly Income', incomeAmount: '₹25,000', footer: <>↗️ Dr. Priya S. earned ₹32,000 in her first month</>, flag: '💰',
    },
    {
      side: 'right', top: 650, badge: '+30% RATES', title: '🧬 Month 3: NLP Master', timeline: '📅 Month 3-4 • ⏱️ 40 hours',
      desc: <>Advanced communication skills. Charge premium rates. Free after 50 sessions!</>,
      incomeLabel: 'New Monthly Income', incomeAmount: '₹33,000', incomeSub: '⬆️ +₹8,000 from previous month',
      skills: ['NLP Practitioner', 'Anchoring', 'Reframing'], flag: '🎯',
    },
    {
      side: 'left', top: 850, badge: '🚀 +150% RATES', title: '🏢 Month 6: Certified Corp-Executive Therapist', timeline: '📅 Month 5-6 • 🎯 B2B Access',
      desc: <>Unlock corporate clients. Deliver workshops. Land retainers. <strong>₹15K-60K per workshop!</strong></>,
      incomeLabel: 'Monthly Income (with workshops)', incomeAmount: '₹65,000', footer: <>💼 Dr. Amit R. landed a ₹2L/month retainer with TCS</>, flag: '🏢',
    },
    {
      side: 'right', top: 1050, badge: '⭐ PREMIUM POSITIONING', title: '🕉️ Month 9: Certified Aatman Coach', timeline: '📅 Month 7-9 • ⏱️ 60 hours + retreat',
      desc: <>Master soul-level transformation. Eastern + Western synthesis. <strong>Top 10% exclusive certification.</strong></>,
      incomeLabel: 'Session Rate', incomeAmount: '₹6,500', incomeSub: '💎 Premium clients only', skills: ['Vedanta', 'Shadow Work', 'Consciousness'], flag: '💎',
    },
    {
      side: 'left', top: 1250, badge: 'DUAL PRACTICE', title: '🎯 Month 12: Certified NRI-Global Indian Coach', timeline: '📅 Month 10-12 • 🎓 ICF-equivalent',
      desc: <>Therapy + Coaching = 2x revenue streams. Executive coaching: <strong>₹8,000/session</strong></>,
      incomeLabel: 'Combined Monthly Income', incomeAmount: '₹1,20,000', flag: '🚀',
    },
    {
      side: 'right', top: 1450, badge: 'SCALE IMPACT', title: '👥 Month 18: Group-Retreat Therapist', timeline: '📅 Month 16-18 • 👥 8 people/session',
      desc: <>Serve 8 people simultaneously. <strong>₹15,000 per group = ₹1,875/person</strong></>,
      incomeLabel: 'With 2 Groups/Week', incomeAmount: '₹1,92,000', incomeSub: '+ Individual sessions', flag: '👥',
    },
    {
      side: 'left', top: 1650, badge: '👑 THE PINNACLE', title: '🏆 Month 18+: Master Mentor', timeline: '📅 Month 18+ • 👑 Top 5% Elite',
      desc: <>Train therapists. Earn passive income from supervisees. <strong>Build your legacy.</strong></>,
      incomeLabel: 'Total Monthly Income', incomeAmount: '₹2,53,000', incomeSub: '💰 Therapy + Coaching + Supervision + Groups',
      footer: <strong style={{ color: '#92400e' }}>🎉 Dr. Meera S. hit ₹3.2L/month in Month 24</strong>, flag: '👑', goldIncome: true,
    },
  ];

  const comparisonRows = [
    ['Monthly Income', '₹40,000', '₹2,53,000 📈'],
    ['Career Control', 'Employee', 'Entrepreneur ⭐'],
    ['Skills', 'Basic therapy', '9 Certifications 🎓'],
    ['Client Access', 'Limited network', 'Unlimited leads 🚀'],
    ['Income Ceiling', 'Fixed salary', "Sky's the limit 🌟"],
    ['Legacy Impact', 'Individual', 'Mentor generations 💙'],
  ];

  const leadPlans: LeadPlan[] = [
    {
      name: 'Starter', price: '₹0', suffix: '/month', period: 'No commitment', cta: 'Get Started Free', ctaClass: 'outline',
      features: ['✅ Profile listing on marketplace', '✅ 1 free lead/month', '✅ Basic dashboard', '❌ No priority matching', '❌ No corporate leads', '❌ No analytics'],
      planKey: 'starter',
    },
    {
      name: 'Growth', price: '₹199', suffix: '/lead', period: '+ ₹99/mo platform access', cta: 'Start Growing →', ctaClass: 'primary',
      features: ['✅ Warm leads (70-89 match)', '✅ Up to 5 leads/month', '✅ Patient preview before buy', '✅ Basic analytics', '❌ No corporate leads', '✅ 50% refund if no response'],
      planKey: 'growth',
    },
    {
      name: 'Professional', price: '₹299', suffix: '/lead', period: '+ ₹99/mo platform access', cta: 'Go Professional →', ctaClass: 'gold',
      features: ['✅ Hot leads (90-100 match)', '✅ Up to 10 leads/month', '✅ Priority matching', '✅ Full analytics dashboard', '✅ Corporate B2B leads', '✅ 50% refund if no response'],
      featured: true, badge: '⭐ MOST POPULAR', planKey: 'professional',
    },
    {
      name: 'Elite', price: '₹399', suffix: '/lead', period: '+ ₹99/mo platform access', cta: 'Go Elite →', ctaClass: 'primary',
      features: ['✅ Premium hot leads only', '✅ Unlimited leads/month', '✅ Auto-matching (AI)', '✅ Executive coaching leads', '✅ NRI client access', '✅ Profile boosting'],
      planKey: 'elite',
    },
  ];

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const total = end.getTime() - now.getTime();
      const h = Math.floor((total / (1000 * 60 * 60)) % 24);
      const m = Math.floor((total / 1000 / 60) % 60);
      const s = Math.floor((total / 1000) % 60);
      setHours(String(h).padStart(2, '0'));
      setMinutes(String(m).padStart(2, '0'));
      setSeconds(String(s).padStart(2, '0'));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const showFirst = setTimeout(() => setShowNotif(true), 3000);
    const interval = setInterval(() => {
      setShowNotif(true);
      setNotifIndex((i) => (i + 1) % notifications.length);
      setTimeout(() => setShowNotif(false), 5000);
    }, 12000);
    return () => {
      clearTimeout(showFirst);
      clearInterval(interval);
    };
  }, [notifications.length]);

  const selectedPlanLabel =
    selectedPlan === 'starter'
      ? 'Starter (Free)'
      : selectedPlan === 'growth'
        ? 'Growth (₹199/lead)'
        : selectedPlan === 'elite'
          ? 'Elite (₹399/lead)'
          : 'Professional (₹299/lead)';

  function goToStep(next: number) {
    if (next === 4 && !selectedPlan) return;
    setStep(next);
    const target = document.getElementById(`step${next}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function pickPlan(plan: string) {
    setSelectedPlan(plan);
  }

  function selectPlanFromCard(plan: string) {
    setSelectedPlan(plan);
    setStep(1);
    const target = document.getElementById('step1');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function completeSignup() {
    setCompleted(true);
  }

  return (
    <div className="provider-landing">
      <div className="top-actions">
        <button className="home-btn" onClick={() => navigate('/landing')}>← Back Home</button>
        <div className="top-auth">
          <Link to="/auth/signup" className="top-register">Register</Link>
          <Link to="/auth/login" className="top-login">Login</Link>
        </div>
      </div>

      <div className="hero">
        <h1>Your Journey to ₹2.5 Lakh/Month Starts Here</h1>
        <p className="subtitle">Join 1,247 therapists already transforming their careers on MANS360</p>

        <div className="stats-bar">
          <div className="stat"><span className="stat-number">₹2.5L</span><span className="stat-label">Avg Income (Master Mentors)</span></div>
          <div className="stat"><span className="stat-number">573%</span><span className="stat-label">Average ROI</span></div>
          <div className="stat"><span className="stat-number">18 months</span><span className="stat-label">To Master Mentor</span></div>
        </div>
      </div>

      <div className="fomo-banner">
        <div className="fomo-title">⚡ Limited Time: Early Bird Discount</div>
        <p style={{ fontSize: 14, margin: '10px 0' }}>Join in the next 24 hours & get:</p>
        <ul style={{ fontSize: 13, marginLeft: 20 }}>
          <li>₹5,000 lead credits FREE</li>
          <li>First certification 50% off</li>
          <li>Priority profile verification</li>
        </ul>
        <div className="timer">
          <div className="timer-block"><span className="timer-number">{hours}</span><span className="timer-label">HOURS</span></div>
          <div className="timer-block"><span className="timer-number">{minutes}</span><span className="timer-label">MINS</span></div>
          <div className="timer-block"><span className="timer-number">{seconds}</span><span className="timer-label">SECS</span></div>
        </div>
      </div>

      <div className={`social-proof ${showNotif ? 'visible' : 'hidden-proof'}`}>
        <div className="social-proof-header">
          <div className="avatar">{notifications[notifIndex].name.split(' ').map((n) => n[0]).join('')}</div>
          <div>
            <div className="social-proof-name">{notifications[notifIndex].name}</div>
            <div className="social-proof-action">{notifications[notifIndex].action}</div>
          </div>
        </div>
        <div className="social-proof-time">🎉 {notifications[notifIndex].time} • {notifications[notifIndex].city}</div>
      </div>

      <div className="journey-container">
        <svg className="wave-line" viewBox="0 0 100 2000" preserveAspectRatio="none">
          <path d="M 50,0 Q 80,100 50,200 T 50,400 T 50,600 T 50,800 T 50,1000 T 50,1200 T 50,1400 T 50,1600 T 50,1800 T 50,2000" />
        </svg>

        <div className="wave-path">
          {milestones.map((milestone, index) => (
            <div key={milestone.title} className={`milestone ${milestone.side}`} style={{ top: milestone.top, animationDelay: `${(index + 1) * 0.1}s` }}>
              <div className="milestone-content">
                <div className="milestone-badge">{milestone.badge}</div>
                <div className="milestone-title">{milestone.title}</div>
                <div className="milestone-timeline">{milestone.timeline}</div>
                <div className="milestone-desc">{milestone.desc}</div>

                {milestone.incomeLabel && milestone.incomeAmount && (
                  <div className={`milestone-income ${milestone.goldIncome ? 'gold' : ''}`}>
                    <div className="income-label">{milestone.incomeLabel}</div>
                    <span className="income-amount">{milestone.incomeAmount}</span>
                    {milestone.incomeSub && <div style={{ fontSize: 14, marginTop: 5 }}>{milestone.incomeSub}</div>}
                  </div>
                )}

                {milestone.skills && (
                  <div className="milestone-skills">
                    {milestone.skills.map((skill) => <span key={skill} className="skill-tag">{skill}</span>)}
                  </div>
                )}

                {milestone.footer && <div className="milestone-footer">{milestone.footer}</div>}
              </div>

              <div className="flag-post">
                <div className="flag">{milestone.flag}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="comparison-table">
        <div className="comparison-title">🔄 Your Career Transformation</div>
        {comparisonRows.map((row, index) => (
          <div key={row[0]} className="comparison-row" style={index === comparisonRows.length - 1 ? { border: 'none' } : {}}>
            <div className="comparison-label">{row[0]}</div>
            <div className="comparison-before">{row[1]}</div>
            <div className="comparison-after">{row[2]}</div>
          </div>
        ))}
      </div>

      <div className="leads-section" id="leadsPricing">
        <div className="leads-header">
          <h2>💰 Choose Your Lead Plan</h2>
          <p>Buy leads, convert patients, earn 60% of every session. Platform access: ₹99/month.</p>
        </div>

        <div className="leads-grid">
          {leadPlans.map((plan) => (
            <div key={plan.name} className={`lead-plan ${plan.featured ? 'featured' : ''}`}>
              {plan.badge && <div className="lead-plan-badge">{plan.badge}</div>}
              <div className="lead-plan-name">{plan.name}</div>
              <div className="lead-plan-price">{plan.price} <span>{plan.suffix}</span></div>
              <div className="lead-plan-period">{plan.period}</div>
              <ul className="lead-plan-features">
                {plan.features.map((feature) => {
                  const isCheck = feature.startsWith('✅');
                  const text = feature.slice(2).trim();
                  return (
                    <li key={feature}><span className="icon">{isCheck ? '✅' : '❌'}</span>{text}</li>
                  );
                })}
              </ul>
              <button className={`lead-plan-cta ${plan.ctaClass}`} onClick={() => selectPlanFromCard(plan.planKey)}>{plan.cta}</button>
            </div>
          ))}
        </div>

        <div className="leads-note">
          <strong>Marketplace Leads:</strong> Unclaimed leads drop in price daily — ₹299 → ₹199 → ₹99.<br />
          Revenue split: <strong>60% therapist / 40% platform</strong> on every session. Always.<br />
          Platform access fee: <strong>₹99/month</strong> applies to all paid plans.
        </div>

        <div className="leads-comparison">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Starter</th>
                <th>Growth</th>
                <th>Professional</th>
                <th>Elite</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Lead price</td><td>Free (1/mo)</td><td>₹199</td><td>₹299</td><td>₹399</td></tr>
              <tr><td>Leads per month</td><td>1</td><td>5</td><td>10</td><td>Unlimited</td></tr>
              <tr><td>Match quality</td><td>Cold (50-69)</td><td>Warm (70-89)</td><td>Hot (90-100)</td><td>Premium hot</td></tr>
              <tr><td>Patient preview</td><td className="cross">—</td><td className="check">✓</td><td className="check">✓</td><td className="check">✓</td></tr>
              <tr><td>Priority matching</td><td className="cross">—</td><td className="cross">—</td><td className="check">✓</td><td className="check">✓</td></tr>
              <tr><td>Corporate / B2B leads</td><td className="cross">—</td><td className="cross">—</td><td className="check">✓</td><td className="check">✓</td></tr>
              <tr><td>Executive coaching leads</td><td className="cross">—</td><td className="cross">—</td><td className="cross">—</td><td className="check">✓</td></tr>
              <tr><td>NRI client access</td><td className="cross">—</td><td className="cross">—</td><td className="cross">—</td><td className="check">✓</td></tr>
              <tr><td>Analytics dashboard</td><td>Basic</td><td>Basic</td><td>Full</td><td>Full + AI</td></tr>
              <tr><td>Profile boosting</td><td className="cross">—</td><td className="cross">—</td><td className="cross">—</td><td className="check">✓</td></tr>
              <tr><td>Refund (no response 7 days)</td><td className="cross">—</td><td>50%</td><td>50%</td><td>50%</td></tr>
              <tr><td>Revenue share (you keep)</td><td>60%</td><td>60%</td><td>60%</td><td>60%</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="cta-section">
        <h2 className="cta-title">Start Your Provider Journey Now</h2>
        <p className="cta-subtitle">No phone calls. No waiting. Self-service from register to earning.</p>

        <div id="step1" className={`signup-flow ${step === 1 ? '' : 'hidden'}`}>
          <div className="signup-card">
            <div className="signup-step-indicator"><div className="step-dot active" /><div className="step-dot" /><div className="step-dot" /><div className="step-dot" /></div>
            <div className="signup-title">Step 1: Register Your Profile</div>
            <div className="signup-sub">Takes 60 seconds. This creates your provider identity on MANAS360.</div>

            <button className="s-btn s-btn-primary" onClick={() => navigate('/auth/signup')}>Register & Continue →</button>
            <div className="s-footer-note">✅ No payment at this step. Your data is encrypted.</div>
          </div>
        </div>

        <div id="step2" className={`signup-flow ${step === 2 ? '' : 'hidden'}`}>
          <div className="signup-card">
            <div className="signup-step-indicator"><div className="step-dot done" /><div className="step-dot active" /><div className="step-dot" /><div className="step-dot" /></div>
            <div className="signup-title">Step 2: Activate Your Platform Access</div>
            <div className="signup-sub">₹99/month keeps your profile live, dashboard open, and leads flowing to you.</div>

            <div className="commitment-box">
              <div className="cb-title">₹99/month — Your Commitment to Growth</div>
              <div className="cb-desc">This isn't a fee — it's your stake in the game.<br />Therapists who pay ₹99 earn <strong>3x more</strong> than free-tier fence-sitters.<br />Why? Because committed providers show up, respond faster, and convert more leads.</div>
            </div>

            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: 'white' }}>₹99<span style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,.4)' }}>/month</span></div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>Cancel anytime. No lock-in. Charged via PhonePe.</div>
            </div>

            <div style={{ padding: 12, background: 'rgba(255,255,255,.04)', borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>
                <strong style={{ color: 'rgba(255,255,255,.8)' }}>What ₹99 unlocks immediately:</strong><br />
                ✅ Live provider profile on MANAS360 marketplace<br />
                ✅ Provider dashboard with lead management<br />
                ✅ Access to browse & discover lead plans<br />
                ✅ Free 5 Whys certification (start earning faster)<br />
                ✅ Session scheduling & Jitsi audio rooms<br />
                ✅ 1 free lead in your first month
              </div>
            </div>

            <button className="s-btn s-btn-gold" onClick={() => goToStep(3)}>Pay ₹99 & Activate →</button>
            <button className="s-btn s-btn-outline" onClick={() => goToStep(1)}>← Back</button>
          </div>
        </div>

        <div id="step3" className={`signup-flow ${step === 3 ? '' : 'hidden'}`}>
          <div className="signup-card">
            <div className="signup-step-indicator"><div className="step-dot done" /><div className="step-dot done" /><div className="step-dot active" /><div className="step-dot" /></div>
            <div className="signup-title">Step 3: Choose Your Lead Plan</div>
            <div className="signup-sub">You're activated! Now pick how you want to receive patient leads. Start with any plan — upgrade anytime as you grow.</div>

            <div className="plan-select-grid">
              <div className={`plan-option ${selectedPlan === 'starter' ? 'selected' : ''}`} onClick={() => pickPlan('starter')}>
                <div className="po-name">Starter</div>
                <div className="po-price">₹0</div>
                <div className="po-note">1 free lead/month<br />Cold leads (50-69 match)</div>
              </div>
              <div className={`plan-option ${selectedPlan === 'growth' ? 'selected' : ''}`} onClick={() => pickPlan('growth')}>
                <div className="po-name">Growth</div>
                <div className="po-price">₹199<span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,.4)' }}>/lead</span></div>
                <div className="po-note">5 warm leads/month<br />Patient preview + 50% refund</div>
              </div>
              <div className={`plan-option featured-opt ${selectedPlan === 'professional' ? 'selected' : ''}`} onClick={() => pickPlan('professional')}>
                <div className="po-tag">⭐ POPULAR</div>
                <div className="po-name">Professional</div>
                <div className="po-price">₹299<span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,.4)' }}>/lead</span></div>
                <div className="po-note">10 hot leads + Corporate B2B<br />Priority matching + full analytics</div>
              </div>
              <div className={`plan-option ${selectedPlan === 'elite' ? 'selected' : ''}`} onClick={() => pickPlan('elite')}>
                <div className="po-name">Elite</div>
                <div className="po-price">₹399<span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,.4)' }}>/lead</span></div>
                <div className="po-note">Unlimited + NRI + Executive<br />AI matching + profile boosting</div>
              </div>
            </div>

            <div style={{ padding: 10, background: 'rgba(255,255,255,.03)', borderRadius: 8, margin: '12px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', lineHeight: 1.4 }}>
                <strong style={{ color: 'rgba(255,255,255,.6)' }}>Marketplace leads:</strong> Unclaimed leads drop daily — ₹299 → ₹199 → ₹99<br />
                You keep <strong style={{ color: '#34d399' }}>60%</strong> of every session. Always. On every plan.
              </div>
            </div>

            <button className="s-btn s-btn-primary" onClick={() => goToStep(4)} style={{ opacity: selectedPlan ? 1 : 0.5, pointerEvents: selectedPlan ? 'auto' : 'none' }}>Select a plan to continue →</button>
            <button className="s-btn s-btn-outline" onClick={() => goToStep(2)}>← Back</button>
          </div>
        </div>

        <div id="step4" className={`signup-flow ${step === 4 ? '' : 'hidden'}`}>
          <div className="signup-card">
            {!completed ? (
              <>
                <div className="signup-step-indicator"><div className="step-dot done" /><div className="step-dot done" /><div className="step-dot done" /><div className="step-dot active" /></div>
                <div className="signup-title">Your Growth Roadmap</div>
                <div className="signup-sub">Here's your journey from activation to ₹2.5L/month. Each step unlocks the next.</div>

                <ul className="onboard-checklist" id="roadmapList">
                  <li><span className="done-icon">✅</span> <strong>Profile registered</strong></li>
                  <li><span className="done-icon">✅</span> <strong>₹99 platform access activated</strong></li>
                  <li><span className="done-icon">✅</span> <strong>{selectedPlanLabel} lead plan selected</strong></li>
                  <li style={{ borderLeft: '2px solid rgba(251,191,36,.3)', paddingLeft: 12, marginLeft: 8 }}><span className="pending-icon">🔓</span> <strong>NOW:</strong> Start 5 Whys certification (free, 2 hrs) — unlocks lead access</li>
                  <li style={{ borderLeft: '2px solid rgba(251,191,36,.3)', paddingLeft: 12, marginLeft: 8 }}><span className="pending-icon">⏳</span> Credential verification runs in background (24-48 hrs)</li>
                  <li style={{ borderLeft: '2px solid rgba(52,211,153,.3)', paddingLeft: 12, marginLeft: 8 }}><span className="pending-icon">📥</span> <strong>Week 1:</strong> Accept first leads → Schedule sessions</li>
                  <li style={{ borderLeft: '2px solid rgba(52,211,153,.3)', paddingLeft: 12, marginLeft: 8 }}><span className="pending-icon">💰</span> <strong>Week 2+:</strong> First sessions → You earn 60% per session</li>
                  <li style={{ borderLeft: '2px solid rgba(102,126,234,.3)', paddingLeft: 12, marginLeft: 8 }}><span className="pending-icon">🔄</span> <strong>Monthly:</strong> Repeat cycle — buy leads, schedule, earn, grow</li>
                  <li style={{ borderLeft: '2px solid rgba(124,58,237,.3)', paddingLeft: 12, marginLeft: 8 }}><span className="pending-icon">🎓</span> <strong>Month 3+:</strong> Discover NLP, Certified Aatman Coach, NRI-Global Indian Coach certifications → higher session rates</li>
                  <li style={{ borderLeft: '2px solid rgba(124,58,237,.3)', paddingLeft: 12, marginLeft: 8 }}><span className="pending-icon">⬆️</span> <strong>Month 6+:</strong> Unlock Corp-Executive, Group-Retreat, NRI-Global leads</li>
                  <li style={{ borderLeft: '2px solid rgba(251,191,36,.3)', paddingLeft: 12, marginLeft: 8 }}><span className="pending-icon">👑</span> <strong>Month 18+:</strong> Master Mentor — train others, earn passive income</li>
                </ul>

                <div className="commitment-box" style={{ borderColor: 'rgba(102,126,234,.3)', background: 'rgba(102,126,234,.06)' }}>
                  <div className="cb-title" style={{ color: '#a5b4fc' }}>The Flywheel</div>
                  <div className="cb-desc" style={{ fontSize: 12 }}>₹99/month commitment → leads flow → sessions happen → you earn 60% → invest in certifications → unlock higher-value leads → earn more → upgrade plan → repeat. <strong>The more you put in, the more you get out.</strong></div>
                </div>

                <button className="s-btn s-btn-green" onClick={completeSignup}>🚀 Open My Dashboard & Start Certification</button>
                <button className="s-btn s-btn-outline" onClick={() => goToStep(3)}>← Change Plan</button>
                <div className="s-footer-note">Your dashboard opens with the 5 Whys certification ready to start.<br />Need help? Call <strong>+91 8867736009</strong> (Mon-Sat 10AM-6PM)</div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                <div className="signup-title">Welcome, Doctor!</div>
                <div className="signup-sub" style={{ marginBottom: 20 }}>
                  Your <strong>{selectedPlanLabel}</strong> profile is live on MANAS360.<br />OTP sent to <strong>your phone</strong> for verification.
                </div>
                <button className="s-btn s-btn-green" onClick={() => navigate('/provider/dashboard')}>🚀 Open My Dashboard & Start Certification</button>
              </div>
            )}
          </div>
        </div>

        <div className="cost-of-waiting">
          <h3>⚠️ The Cost of Waiting</h3>
          <p>
            Every month you delay is <strong>₹25,000-₹2,53,000</strong> you're not earning.
            That's <strong>₹3L-₹30L per year</strong> left on the table.
            <br /><br />
            <strong>Dr. Priya waited 6 months before joining.</strong><br />
            "I thought I wasn't ready. Biggest mistake. I lost ₹1.5L in potential income."
            <br /><br />
            <strong style={{ fontSize: 20 }}>Don't make the same mistake.</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProviderLandingPage;
