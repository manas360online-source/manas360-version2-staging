import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './ProviderLandingPage.css';

const ProviderLandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [hours, setHours] = useState('23');
    const [minutes, setMinutes] = useState('47');
    const [seconds, setSeconds] = useState('32');
    const [selectedPlan, setSelectedPlan] = useState('professional');
    const [notification, setNotification] = useState({ name: 'Dr. Rajesh K.', action: 'Just completed NLP Certification', time: '2 minutes ago', city: 'Mumbai' });
    const [showNotification, setShowNotification] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        qualification: '',
        registration: ''
    });

    useEffect(() => {
        const timerInterval = setInterval(() => {
            const now = new Date();
            const end = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
            const total = end.getTime() - now.getTime();

            const h = Math.floor((total / (1000 * 60 * 60)) % 24);
            const m = Math.floor((total / 1000 / 60) % 60);
            const s = Math.floor((total / 1000) % 60);

            setHours(h.toString().padStart(2, '0'));
            setMinutes(m.toString().padStart(2, '0'));
            setSeconds(s.toString().padStart(2, '0'));
        }, 1000);

        const notifications = [
            { name: 'Dr. Rajesh K.', action: 'Just completed NLP Certification', time: '2 minutes ago', city: 'Mumbai' },
            { name: 'Dr. Priya S.', action: 'Earned ₹32,000 in first month', time: '5 minutes ago', city: 'Delhi' },
            { name: 'Dr. Amit R.', action: 'Just landed ₹2L corporate retainer', time: '8 minutes ago', city: 'Bangalore' },
            { name: 'Dr. Meera J.', action: 'Became Master Mentor', time: '12 minutes ago', city: 'Pune' },
            { name: 'Dr. Karthik V.', action: 'Started group therapy sessions', time: '15 minutes ago', city: 'Chennai' },
        ];

        let notifIndex = 0;
        const notifInterval = setInterval(() => {
            setShowNotification(false);
            setTimeout(() => {
                notifIndex = (notifIndex + 1) % notifications.length;
                setNotification(notifications[notifIndex]);
                setShowNotification(true);
            }, 1000);
        }, 8000);

        return () => {
            clearInterval(timerInterval);
            clearInterval(notifInterval);
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id.replace('s', '').toLowerCase()]: value }));
    };

    const goToStep = (s: number) => {
        setStep(s);
        window.scrollTo({ top: document.getElementById(`step${s}`)?.offsetTop || 0, behavior: 'smooth' });
    };

    const completeSignup = () => {
        // In a real app, you'd save the form data here
        navigate('/auth/signup');
    };

    return (
        <div className="provider-landing">
            {/* Top Navigation Bar */}
            <div className="top-actions">
                <button className="home-btn" onClick={() => navigate('/landing')}>← Home</button>
                <div className="top-auth">
                    <Link to="/auth/signup" className="top-register">Register</Link>
                    <Link to="/auth/login" className="top-login">Login</Link>
                </div>
            </div>

            {/* FOMO Timer Banner */}
            <div className="fomo-banner">
                <div className="fomo-title">⚡ Limited Time: Early Bird Discount</div>
                <p style={{ fontSize: '14px', margin: '10px 0' }}>Join in the next 24 hours & get:</p>
                <ul style={{ fontSize: '13px', marginLeft: '20px' }}>
                    <li>₹5,000 lead credits FREE</li>
                    <li>First certification 50% off</li>
                    <li>Priority profile verification</li>
                </ul>
                <div className="timer">
                    <div className="timer-block">
                        <span className="timer-number">{hours}</span>
                        <span className="timer-label">HOURS</span>
                    </div>
                    <div className="timer-block">
                        <span className="timer-number">{minutes}</span>
                        <span className="timer-label">MINS</span>
                    </div>
                    <div className="timer-block">
                        <span className="timer-number">{seconds}</span>
                        <span className="timer-label">SECS</span>
                    </div>
                </div>
            </div>

            {/* Social Proof Notifications */}
            <div className={`social-proof ${!showNotification ? 'hidden-proof' : ''}`}>
                <div className="social-proof-header">
                    <div className="avatar">{notification.name.split(' ')[0][0]}{notification.name.split(' ')[1][0]}</div>
                    <div>
                        <div className="social-proof-name">{notification.name}</div>
                        <div className="social-proof-action">{notification.action}</div>
                    </div>
                </div>
                <div className="social-proof-time">🎉 {notification.time} • {notification.city}</div>
            </div>

            {/* Hero Section */}
            <div className="hero">
                <h1>Your Journey to ₹2.5 Lakh/Month Starts Here</h1>
                <p className="subtitle">Join 1,247 therapists already transforming their careers on MANAS360</p>

                <div className="stats-bar">
                    <div className="stat">
                        <span className="stat-number">₹2.5L</span>
                        <span className="stat-label">Avg Income (Master Mentors)</span>
                    </div>
                    <div className="stat">
                        <span className="stat-number">573%</span>
                        <span className="stat-label">Average ROI</span>
                    </div>
                    <div className="stat">
                        <span className="stat-number">18 months</span>
                        <span className="stat-label">To Master Mentor</span>
                    </div>
                </div>
            </div>

            {/* Journey Wave Path */}
            <div className="journey-container">
                <svg className="wave-line" viewBox="0 0 100 2000" preserveAspectRatio="none">
                    <path d="M 50,0 Q 80,100 50,200 T 50,400 T 50,600 T 50,800 T 50,1000 T 50,1200 T 50,1400 T 50,1600 T 50,1800 T 50,2000" />
                </svg>

                <div className="wave-path">
                    {/* Milestone 1: Onboarding */}
                    <div className="milestone left" style={{ top: '50px' }}>
                        <div className="milestone-content">
                            <div className="milestone-badge">FREE</div>
                            <div className="milestone-title">🚀 Week 1: Get Started</div>
                            <div className="milestone-timeline">📅 Week 1-2 • ⏱️ 2 hours</div>
                            <div className="milestone-desc">
                                Submit credentials, complete platform training, get verified.
                                <strong>Zero investment required.</strong>
                            </div>
                            <div className="milestone-income">
                                <div className="income-label">Investment</div>
                                <span className="income-amount">₹0</span>
                            </div>
                        </div>
                        <div className="flag-post">
                            <div className="flag">🎯</div>
                        </div>
                    </div>

                    {/* Milestone 2: 5 Whys Certification */}
                    <div className="milestone right" style={{ top: '250px' }}>
                        <div className="milestone-content">
                            <div className="milestone-badge">FREE CERTIFICATION</div>
                            <div className="milestone-title">🧠 Week 3: Master 5 Whys</div>
                            <div className="milestone-timeline">📅 Week 3-4 • ⏱️ 6 hours</div>
                            <div className="milestone-desc">
                                Learn root cause analysis, empathy framework, and projecting questions.
                                Earn your first certification!
                            </div>
                            <div className="milestone-skills">
                                <span className="skill-tag">Root Cause Analysis</span>
                                <span className="skill-tag">Empathy Framework</span>
                                <span className="skill-tag">Active Listening</span>
                            </div>
                        </div>
                        <div className="flag-post">
                            <div className="flag">🎓</div>
                        </div>
                    </div>

                    {/* Milestone 3: First Revenue */}
                    <div className="milestone left" style={{ top: '450px' }}>
                        <div className="milestone-content">
                            <div className="milestone-badge">💰 REVENUE STARTS</div>
                            <div className="milestone-title">💵 Month 2: First Earnings</div>
                            <div className="milestone-timeline">📅 Week 5+ • 15 sessions/month</div>
                            <div className="milestone-desc">
                                Buy lead package (₹2,500), convert patients, start earning.
                                <strong>ROI: 399%</strong>
                            </div>
                            <div className="milestone-income">
                                <div className="income-label">Monthly Income</div>
                                <span className="income-amount">₹25,000</span>
                            </div>
                            <div className="milestone-footer">
                                ↗️ Dr. Priya S. earned ₹32,000 in her first month
                            </div>
                        </div>
                        <div className="flag-post">
                            <div className="flag">💰</div>
                        </div>
                    </div>

                    {/* Milestone 4: NLP Certification */}
                    <div className="milestone right" style={{ top: '650px' }}>
                        <div className="milestone-content">
                            <div className="milestone-badge">+30% RATES</div>
                            <div className="milestone-title">🧬 Month 3: NLP Master</div>
                            <div className="milestone-timeline">📅 Month 3-4 • ⏱️ 40 hours</div>
                            <div className="milestone-desc">
                                Advanced communication skills. Charge premium rates.
                                Free after 50 sessions!
                            </div>
                            <div className="milestone-income">
                                <div className="income-label">New Monthly Income</div>
                                <span className="income-amount">₹33,000</span>
                                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                                    ⬆️ +₹8,000 from previous month
                                </div>
                            </div>
                            <div className="milestone-skills">
                                <span className="skill-tag">NLP Practitioner</span>
                                <span className="skill-tag">Anchoring</span>
                                <span className="skill-tag">Reframing</span>
                            </div>
                        </div>
                        <div className="flag-post">
                            <div className="flag">🎯</div>
                        </div>
                    </div>

                    {/* Milestone 5: Corporate Access */}
                    <div className="milestone left" style={{ top: '850px' }}>
                        <div className="milestone-content">
                            <div className="milestone-badge">🚀 +150% RATES</div>
                            <div className="milestone-title">🏢 Month 6: Certified Corp-Executive Therapist</div>
                            <div className="milestone-timeline">📅 Month 5-6 • 🎯 B2B Access</div>
                            <div className="milestone-desc">
                                Unlock corporate clients. Deliver workshops. Land retainers.
                                <strong>₹15K-60K per workshop!</strong>
                            </div>
                            <div className="milestone-income">
                                <div className="income-label">Monthly Income (with workshops)</div>
                                <span className="income-amount">₹65,000</span>
                            </div>
                            <div className="milestone-footer">
                                💼 Dr. Amit R. landed a ₹2L/month retainer with TCS
                            </div>
                        </div>
                        <div className="flag-post">
                            <div className="flag">🏢</div>
                        </div>
                    </div>

                    {/* Milestone 6: Certified Aatman Coach */}
                    <div className="milestone right" style={{ top: '1050px' }}>
                        <div className="milestone-content">
                            <div className="milestone-badge">⭐ PREMIUM POSITIONING</div>
                            <div className="milestone-title">🕉️ Month 9: Certified Aatman Coach</div>
                            <div className="milestone-timeline">📅 Month 7-9 • ⏱️ 60 hours + retreat</div>
                            <div className="milestone-desc">
                                Master soul-level transformation. Eastern + Western synthesis.
                                <strong>Top 10% exclusive certification.</strong>
                            </div>
                            <div className="milestone-income">
                                <div className="income-label">Session Rate</div>
                                <span className="income-amount">₹6,500</span>
                                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                                    💎 Premium clients only
                                </div>
                            </div>
                            <div className="milestone-skills">
                                <span className="skill-tag">Vedanta</span>
                                <span className="skill-tag">Shadow Work</span>
                                <span className="skill-tag">Consciousness</span>
                            </div>
                        </div>
                        <div className="flag-post">
                            <div className="flag">💎</div>
                        </div>
                    </div>

                    {/* Milestone 7: Certified NRI-Global Indian Coach */}
                    <div className="milestone left" style={{ top: '1250px' }}>
                        <div className="milestone-content">
                            <div className="milestone-badge">DUAL PRACTICE</div>
                            <div className="milestone-title">🎯 Month 12: Certified NRI-Global Indian Coach</div>
                            <div className="milestone-timeline">📅 Month 10-12 • 🎓 ICF-equivalent</div>
                            <div className="milestone-desc">
                                Therapy + Coaching = 2x revenue streams.
                                Executive coaching: <strong>₹8,000/session</strong>
                            </div>
                            <div className="milestone-income">
                                <div className="income-label">Combined Monthly Income</div>
                                <span className="income-amount">₹1,20,000</span>
                            </div>
                        </div>
                        <div className="flag-post">
                            <div className="flag">🚀</div>
                        </div>
                    </div>

                    {/* Milestone 8: Group-Retreat Therapist */}
                    <div className="milestone right" style={{ top: '1450px' }}>
                        <div className="milestone-content">
                            <div className="milestone-badge">SCALE IMPACT</div>
                            <div className="milestone-title">👥 Month 18: Group-Retreat Therapist</div>
                            <div className="milestone-timeline">📅 Month 16-18 • 👥 8 people/session</div>
                            <div className="milestone-desc">
                                Serve 8 people simultaneously.
                                <strong>₹15,000 per group = ₹1,875/person</strong>
                            </div>
                            <div className="milestone-income">
                                <div className="income-label">With 2 Groups/Week</div>
                                <span className="income-amount">₹1,92,000</span>
                                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                                    + Individual sessions
                                </div>
                            </div>
                        </div>
                        <div className="flag-post">
                            <div className="flag">👥</div>
                        </div>
                    </div>

                    {/* Milestone 9: Master Mentor */}
                    <div className="milestone left" style={{ top: '1650px' }}>
                        <div className="milestone-content">
                            <div className="milestone-badge">👑 THE PINNACLE</div>
                            <div className="milestone-title">🏆 Month 18+: Master Mentor</div>
                            <div className="milestone-timeline">📅 Month 18+ • 👑 Top 5% Elite</div>
                            <div className="milestone-desc">
                                Train therapists. Earn passive income from supervisees.
                                <strong>Build your legacy.</strong>
                            </div>
                            <div className="milestone-income gold">
                                <div className="income-label">Total Monthly Income</div>
                                <span className="income-amount">₹2,53,000</span>
                                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                                    💰 Therapy + Coaching + Supervision + Groups
                                </div>
                            </div>
                            <div style={{ marginTop: '15px', padding: '15px', background: '#fef3c7', borderRadius: '10px' }}>
                                <strong style={{ color: '#92400e' }}>🎉 Dr. Meera S. hit ₹3.2L/month in Month 24</strong>
                            </div>
                        </div>
                        <div className="flag-post">
                            <div className="flag">👑</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparison: Before vs After */}
            <div className="comparison-table">
                <div className="comparison-title">🔄 Your Career Transformation</div>

                <div className="comparison-row">
                    <div className="comparison-label">Monthly Income</div>
                    <div className="comparison-before">₹40,000</div>
                    <div className="comparison-after">₹2,53,000 📈</div>
                </div>

                <div className="comparison-row">
                    <div className="comparison-label">Career Control</div>
                    <div className="comparison-before">Employee</div>
                    <div className="comparison-after">Entrepreneur ⭐</div>
                </div>

                <div className="comparison-row">
                    <div className="comparison-label">Skills</div>
                    <div className="comparison-before">Basic therapy</div>
                    <div className="comparison-after">9 Certifications 🎓</div>
                </div>

                <div className="comparison-row">
                    <div className="comparison-label">Client Access</div>
                    <div className="comparison-before">Limited network</div>
                    <div className="comparison-after">Unlimited leads 🚀</div>
                </div>

                <div className="comparison-row">
                    <div className="comparison-label">Income Ceiling</div>
                    <div className="comparison-before">Fixed salary</div>
                    <div className="comparison-after">Sky's the limit 🌟</div>
                </div>

                <div className="comparison-row" style={{ border: 'none' }}>
                    <div className="comparison-label">Legacy Impact</div>
                    <div className="comparison-before">Individual</div>
                    <div className="comparison-after">Mentor generations 💙</div>
                </div>
            </div>

            {/* LEADS PRICING PLANS */}
            <div className="leads-section" id="leadsPricing">
                <div className="leads-header">
                    <h2>💰 Choose Your Lead Plan</h2>
                    <p>Buy leads, convert patients, earn 60% of every session. Platform access: ₹99/month.</p>
                </div>

                <div className="leads-grid">
                    {/* Plan 1: Starter (Free) */}
                    <div className="lead-plan">
                        <div className="lead-plan-name">Starter</div>
                        <div className="lead-plan-price">₹0 <span>/month</span></div>
                        <div className="lead-plan-period">No commitment</div>
                        <ul className="lead-plan-features">
                            <li><span className="icon">✅</span> Profile listing on marketplace</li>
                            <li><span className="icon">✅</span> 1 free lead/month</li>
                            <li><span className="icon">✅</span> Basic dashboard</li>
                            <li><span className="icon">❌</span> No priority matching</li>
                            <li><span className="icon">❌</span> No corporate leads</li>
                            <li><span className="icon">❌</span> No analytics</li>
                        </ul>
                        <button className="lead-plan-cta outline" onClick={() => goToStep(1)}>Get Started Free</button>
                    </div>

                    {/* Plan 2: Growth */}
                    <div className="lead-plan">
                        <div className="lead-plan-name">Growth</div>
                        <div className="lead-plan-price">₹199 <span>/lead</span></div>
                        <div className="lead-plan-period">+ ₹99/mo platform access</div>
                        <ul className="lead-plan-features">
                            <li><span className="icon">✅</span> Warm leads (70-89 match)</li>
                            <li><span className="icon">✅</span> Up to 5 leads/month</li>
                            <li><span className="icon">✅</span> Patient preview before buy</li>
                            <li><span className="icon">✅</span> Basic analytics</li>
                            <li><span className="icon">❌</span> No corporate leads</li>
                            <li><span className="icon">✅</span> 50% refund if no response</li>
                        </ul>
                        <button className="lead-plan-cta primary" onClick={() => goToStep(1)}>Start Growing →</button>
                    </div>

                    {/* Plan 3: Professional (Featured) */}
                    <div className="lead-plan featured">
                        <div className="lead-plan-badge">⭐ MOST POPULAR</div>
                        <div className="lead-plan-name">Professional</div>
                        <div className="lead-plan-price">₹299 <span>/lead</span></div>
                        <div className="lead-plan-period">+ ₹99/mo platform access</div>
                        <ul className="lead-plan-features">
                            <li><span className="icon">✅</span> Hot leads (90-100 match)</li>
                            <li><span className="icon">✅</span> Up to 10 leads/month</li>
                            <li><span className="icon">✅</span> Priority matching</li>
                            <li><span className="icon">✅</span> Full analytics dashboard</li>
                            <li><span className="icon">✅</span> Corporate B2B leads</li>
                            <li><span className="icon">✅</span> 50% refund if no response</li>
                        </ul>
                        <button className="lead-plan-cta gold" onClick={() => goToStep(1)}>Go Professional →</button>
                    </div>

                    {/* Plan 4: Elite */}
                    <div className="lead-plan">
                        <div className="lead-plan-name">Elite</div>
                        <div className="lead-plan-price">₹399 <span>/lead</span></div>
                        <div className="lead-plan-period">+ ₹99/mo platform access</div>
                        <ul className="lead-plan-features">
                            <li><span className="icon">✅</span> Premium hot leads only</li>
                            <li><span className="icon">✅</span> Unlimited leads/month</li>
                            <li><span className="icon">✅</span> Auto-matching (AI)</li>
                            <li><span className="icon">✅</span> Executive coaching leads</li>
                            <li><span className="icon">✅</span> NRI client access</li>
                            <li><span className="icon">✅</span> Profile boosting</li>
                        </ul>
                        <button className="lead-plan-cta primary" onClick={() => goToStep(1)}>Go Elite →</button>
                    </div>
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
                            <tr>
                                <td>Lead price</td>
                                <td>Free (1/mo)</td>
                                <td>₹199</td>
                                <td>₹299</td>
                                <td>₹399</td>
                            </tr>
                            <tr>
                                <td>Leads per month</td>
                                <td>1</td>
                                <td>5</td>
                                <td>10</td>
                                <td>Unlimited</td>
                            </tr>
                            <tr>
                                <td>Match quality</td>
                                <td>Cold (50-69)</td>
                                <td>Warm (70-89)</td>
                                <td>Hot (90-100)</td>
                                <td>Premium hot</td>
                            </tr>
                            <tr>
                                <td>Patient preview</td>
                                <td className="cross">—</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                            </tr>
                            <tr>
                                <td>Revenue share (you keep)</td>
                                <td>60%</td>
                                <td>60%</td>
                                <td>60%</td>
                                <td>60%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CTA Section — Self-Service Provider Lifecycle */}
            <div className="cta-section">
                <h2 className="cta-title">Start Your Provider Journey Now</h2>
                <p className="cta-subtitle">No phone calls. No waiting. Self-service from register to earning.</p>

                {/* STEP 1: Register Profile */}
                <div className={`signup-flow ${step !== 1 ? 'hidden' : ''}`} id="step1">
                    <div className="signup-card">
                        <div className="signup-step-indicator">
                            <div className="step-dot active"></div>
                            <div className="step-dot"></div>
                            <div className="step-dot"></div>
                            <div className="step-dot"></div>
                        </div>
                        <div className="signup-title">Step 1: Register Your Profile</div>
                        <div className="signup-sub">Takes 60 seconds. This creates your provider identity on MANAS360.</div>

                        <div className="s-input-group">
                            <label>Full Name</label>
                            <input className="s-input" id="sName" type="text" placeholder="Dr. Priya Sharma" value={formData.name} onChange={handleInputChange} />
                        </div>
                        <div className="s-input-group">
                            <label>Mobile Number</label>
                            <input className="s-input" id="sPhone" type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={handleInputChange} />
                        </div>
                        <div className="s-input-group">
                            <label>Qualification</label>
                            <select className="s-input" id="sQual" value={formData.qualification} onChange={handleInputChange}>
                                <option value="">Select your qualification</option>
                                <option>M.Phil Clinical Psychology</option>
                                <option>MA Clinical Psychology</option>
                                <option>PhD Psychology</option>
                                <option>MD Psychiatry</option>
                                <option>MSW / Counseling</option>
                                <option>NLP Practitioner / Coach</option>
                                <option>Executive / Life Coach</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div className="s-input-group">
                            <label>RCI / NMC Registration (optional — verified later)</label>
                            <input className="s-input" id="sReg" type="text" placeholder="Will be verified during onboarding" value={formData.registration} onChange={handleInputChange} />
                        </div>

                        <button className="s-btn s-btn-primary" onClick={() => goToStep(2)}>Register & Continue →</button>
                        <div className="s-footer-note">✅ No payment at this step. Your data is encrypted.</div>
                    </div>
                </div>

                {/* STEP 2: Pay ₹99 Platform Commitment */}
                <div className={`signup-flow ${step !== 2 ? 'hidden' : ''}`} id="step2">
                    <div className="signup-card">
                        <div className="signup-step-indicator">
                            <div className="step-dot done"></div>
                            <div className="step-dot active"></div>
                            <div className="step-dot"></div>
                            <div className="step-dot"></div>
                        </div>
                        <div className="signup-title">Step 2: Activate Your Platform Access</div>
                        <div className="signup-sub">₹99/month keeps your profile live, dashboard open, and leads flowing to you.</div>

                        <div className="commitment-box">
                            <div className="cb-title">₹99/month — Your Commitment to Growth</div>
                            <div className="cb-desc">
                                This isn't a fee — it's your stake in the game.<br />
                                Therapists who pay ₹99 earn <strong>3x more</strong> than free-tier fence-sitters.<br />
                                Why? Because committed providers show up, respond faster, and convert more leads.
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', margin: '16px 0' }}>
                            <div style={{ fontSize: '42px', fontWeight: 800, color: 'white' }}>₹99<span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,.4)' }}>/month</span></div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)', marginTop: '4px' }}>Cancel anytime. No lock-in. Charged via PhonePe.</div>
                        </div>

                        <div style={{ padding: '12px', background: 'rgba(255,255,255,.04)', borderRadius: '10px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>
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

                {/* STEP 3: Discover Plans & Select */}
                <div className={`signup-flow ${step !== 3 ? 'hidden' : ''}`} id="step3">
                    <div className="signup-card">
                        <div className="signup-step-indicator">
                            <div className="step-dot done"></div>
                            <div className="step-dot done"></div>
                            <div className="step-dot active"></div>
                            <div className="step-dot"></div>
                        </div>
                        <div className="signup-title">Step 3: Choose Your Lead Plan</div>
                        <div className="signup-sub">You're activated! Now pick how you want to receive patient leads. Start with any plan — upgrade anytime as you grow.</div>

                        <div className="plan-select-grid">
                            <div className={`plan-option ${selectedPlan === 'starter' ? 'selected' : ''}`} onClick={() => setSelectedPlan('starter')}>
                                <div className="po-name">Starter</div>
                                <div className="po-price">₹0</div>
                                <div className="po-note">1 free lead/month<br />Cold leads (50-69 match)</div>
                            </div>
                            <div className={`plan-option ${selectedPlan === 'growth' ? 'selected' : ''}`} onClick={() => setSelectedPlan('growth')}>
                                <div className="po-name">Growth</div>
                                <div className="po-price">₹199<span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,.4)' }}>/lead</span></div>
                                <div className="po-note">5 warm leads/month<br />Patient preview + 50% refund</div>
                            </div>
                            <div className={`plan-option featured-opt ${selectedPlan === 'professional' ? 'selected' : ''}`} onClick={() => setSelectedPlan('professional')}>
                                <div className="po-tag">⭐ POPULAR</div>
                                <div className="po-name">Professional</div>
                                <div className="po-price">₹299<span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,.4)' }}>/lead</span></div>
                                <div className="po-note">10 hot leads + Corporate B2B<br />Priority matching + full analytics</div>
                            </div>
                            <div className={`plan-option ${selectedPlan === 'elite' ? 'selected' : ''}`} onClick={() => setSelectedPlan('elite')}>
                                <div className="po-name">Elite</div>
                                <div className="po-price">₹399<span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,.4)' }}>/lead</span></div>
                                <div className="po-note">Unlimited + NRI + Executive<br />AI matching + profile boosting</div>
                            </div>
                        </div>

                        <div style={{ padding: '10px', background: 'rgba(255,255,255,.03)', borderRadius: '8px', margin: '12px 0', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', lineHeight: 1.4 }}>
                                <strong style={{ color: 'rgba(255,255,255,.6)' }}>Marketplace leads:</strong> Unclaimed leads drop daily — ₹299 → ₹199 → ₹99<br />
                                You keep <strong style={{ color: '#34d399' }}>60%</strong> of every session. Always. On every plan.
                            </div>
                        </div>

                        <button className="s-btn s-btn-primary" onClick={() => goToStep(4)}>Select Plan & Continue →</button>
                        <button className="s-btn s-btn-outline" onClick={() => goToStep(2)}>← Back</button>
                    </div>
                </div>

                {/* STEP 4: Your Growth Roadmap */}
                <div className={`signup-flow ${step !== 4 ? 'hidden' : ''}`} id="step4">
                    <div className="signup-card">
                        <div className="signup-step-indicator">
                            <div className="step-dot done"></div>
                            <div className="step-dot done"></div>
                            <div className="step-dot done"></div>
                            <div className="step-dot active"></div>
                        </div>
                        <div className="signup-title">Your Growth Roadmap</div>
                        <div className="signup-sub">Here's your journey from activation to ₹2.5L/month. Each step unlocks the next.</div>

                        <ul className="onboard-checklist">
                            <li><span className="done-icon">✅</span> <strong>Profile registered</strong></li>
                            <li><span className="done-icon">✅</span> <strong>₹99 platform access activated</strong></li>
                            <li><span className="done-icon">✅</span> <strong><span style={{ textTransform: 'capitalize' }}>{selectedPlan}</span> lead plan selected</strong></li>
                            <li style={{ borderLeft: '2px solid rgba(251,191,36,.3)', paddingLeft: '12px', marginLeft: '8px' }}>
                                <span className="pending-icon">🔓</span> <strong>NOW:</strong> Start 5 Whys certification (free, 2 hrs) — unlocks lead access
                            </li>
                            <li style={{ borderLeft: '2px solid rgba(251,191,36,.3)', paddingLeft: '12px', marginLeft: '8px' }}>
                                <span className="pending-icon">⏳</span> Credential verification runs in background (24-48 hrs)
                            </li>
                            <li style={{ borderLeft: '2px solid rgba(52,211,153,.3)', paddingLeft: '12px', marginLeft: '8px' }}>
                                <span className="pending-icon">📥</span> <strong>Week 1:</strong> Accept first leads → Schedule sessions
                            </li>
                            <li style={{ borderLeft: '2px solid rgba(52,211,153,.3)', paddingLeft: '12px', marginLeft: '8px' }}>
                                <span className="pending-icon">💰</span> <strong>Week 2+:</strong> First sessions → You earn 60% per session
                            </li>
                            <li style={{ borderLeft: '2px solid rgba(102,126,234,.3)', paddingLeft: '12px', marginLeft: '8px' }}>
                                <span className="pending-icon">🔄</span> <strong>Monthly:</strong> Repeat cycle — buy leads, schedule, earn, grow
                            </li>
                            <li style={{ borderLeft: '2px solid rgba(124,58,237,.3)', paddingLeft: '12px', marginLeft: '8px' }}>
                                <span className="pending-icon">🎓</span> <strong>Month 3+:</strong> Discover NLP, Certified Aatman Coach, NRI-Global Indian Coach certifications → higher session rates
                            </li>
                            <li style={{ borderLeft: '2px solid rgba(124,58,237,.3)', paddingLeft: '12px', marginLeft: '8px' }}>
                                <span className="pending-icon">⬆️</span> <strong>Month 6+:</strong> Unlock Corp-Executive, Group-Retreat, NRI-Global leads
                            </li>
                            <li style={{ borderLeft: '2px solid rgba(251,191,36,.3)', paddingLeft: '12px', marginLeft: '8px' }}>
                                <span className="pending-icon">👑</span> <strong>Month 18+:</strong> Master Mentor — train others, earn passive income
                            </li>
                        </ul>

                        <div className="commitment-box" style={{ borderColor: 'rgba(102,126,234,.3)', background: 'rgba(102,126,234,.06)' }}>
                            <div className="cb-title" style={{ color: '#a5b4fc' }}>The Flywheel</div>
                            <div className="cb-desc" style={{ fontSize: '12px' }}>
                                ₹99/month commitment → leads flow → sessions happen → you earn 60% → invest in certifications → unlock higher-value leads → earn more → upgrade plan → repeat. <strong>The more you put in, the more you get out.</strong>
                            </div>
                        </div>

                        <button className="s-btn s-btn-green" onClick={completeSignup}>🚀 Open My Dashboard & Start Certification</button>
                        <button className="s-btn s-btn-outline" onClick={() => goToStep(3)}>← Change Plan</button>

                        <div className="s-footer-note">
                            Your dashboard opens with the 5 Whys certification ready to start.<br />
                            Need help? Call <strong>+91 8867736009</strong> (Mon-Sat 10AM-6PM)
                        </div>
                    </div>
                </div>

                <div className="cost-of-waiting">
                    <h3 style={{ color: '#92400e', fontSize: '24px', marginBottom: '20px' }}>⚠️ The Cost of Waiting</h3>
                    <p style={{ color: '#78350f', fontSize: '16px', lineHeight: '1.8' }}>
                        Every month you delay is <strong>₹25,000-₹2,53,000</strong> you're not earning.
                        That's <strong>₹3L-₹30L per year</strong> left on the table.
                        <br /><br />
                        <strong>Dr. Priya waited 6 months before joining.</strong><br />
                        "I thought I wasn't ready. Biggest mistake. I lost ₹1.5L in potential income."
                        <br /><br />
                        <strong style={{ fontSize: '20px' }}>Don't make the same mistake.</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProviderLandingPage;
