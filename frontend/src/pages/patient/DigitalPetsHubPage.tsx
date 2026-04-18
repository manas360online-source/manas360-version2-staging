
import React, { useEffect } from "react";
import { Link } from "react-router-dom";

type DigitalPetsHubPageProps = {
  selectedPet?: "golden-puppy" | "wise-owl" | "patience-turtle";
};

const scienceCards = [
  { emoji: '💜', chem: 'Oxytocin', desc: '"Love hormone" - released when your pet greets you, nuzzles, or responds to your care.', trigger: 'Trigger: Pet greetings, nurturing' },
  { emoji: '☀️', chem: 'Serotonin', desc: '"Happy chemical" - boosted by daily routines, care rituals, and watching your pet thrive.', trigger: 'Trigger: Daily check-ins, growth' },
  { emoji: '⚡', chem: 'Dopamine', desc: '"Reward chemical" - released when you unlock milestones, win mini-games, level up your pet.', trigger: 'Trigger: Achievements, games' },
  { emoji: '🧘', chem: 'Endorphins', desc: '"Natural painkiller" - released during breathing exercises, meditation, and laughter with your pet.', trigger: 'Trigger: Breathwork, play' },
];

const schedule = [
  { time: '7:00 AM', emoji: '☀️', title: 'Morning Greeting', text: 'Pet wakes up with you. Happy animation + "Good morning! How did you sleep?" Mood check-in (1-10 scale).', chem: '💜 Oxytocin + ☀️ Serotonin' },
  { time: '7:15 AM', emoji: '🫁', title: 'Breathing Exercise Together', text: "Pet breathes with you. 4-7-8 breathing animation. Pet's belly rises and falls in sync.", chem: '🧘 Endorphins + 💜 Oxytocin' },
  { time: '12:30 PM', emoji: '🐾', title: 'Midday Check-in', text: 'Push notification: "Your puppy misses you! 🐕" Open app -> pet does happy dance -> micro-game (2 min). Stress break.', chem: '⚡ Dopamine + ☀️ Serotonin' },
  { time: '5:00 PM', emoji: '🎮', title: 'Mini-Game Session', text: '5-minute therapeutic game with your pet. Cognitive challenges (Owl), fetch (Puppy), or meditation (Cat). Progress unlocks new environments.', chem: '⚡ Dopamine + 🧘 Endorphins' },
  { time: '9:30 PM', emoji: '🌙', title: 'Bedtime Wind-Down', text: 'Pet yawns, curls up. Guided gratitude: "What made you smile today?" Pet falls asleep with you. Ambient sounds fade in.', chem: '💜 Oxytocin + ☀️ Serotonin + 🧘 Endorphins' },
  { time: 'Weekly', emoji: '📊', title: 'Wellness Report -> Therapist Dashboard', text: 'Mood trends, engagement time, breathing frequency, game scores sent to therapist. Therapist sees: "Patient engaged 6/7 days. Mood improved 2 points. Recommend continuing."', chem: '📋 Therapeutic Integration - Rx Loop Closed' },
];

import { Link } from 'react-router-dom';
import Pt06HeroVideoFrame from '../../components/common/Pt06HeroVideoFrame';

export default function DigitalPetsHubPage() {
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!selectedPet) return;
    const card = document.querySelector(`[data-pet="${selectedPet}"]`) as HTMLElement | null;
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [selectedPet]);

  return (
    <div className="pet360-root min-h-screen">
      <style>{`
        .pet360-root { font-family: 'Outfit', sans-serif; background: #fff; color: #1E293B; line-height: 1.6; }
        .pet360-root h1,.pet360-root h2,.pet360-root h3 { font-family: 'Fraunces', serif; }
        .pet360-root .shell{max-width:1060px;margin:0 auto;padding:0 20px;}
        .pet360-root .badge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:16px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;}
        .pet360-root .nav{padding:12px 0;border-bottom:1px solid #E2E8F0;position:sticky;top:0;z-index:20;background:rgba(255,255,255,.92);backdrop-filter:blur(14px);}
        .pet360-root .nav-inner{display:flex;align-items:center;justify-content:space-between;}
        .pet360-root .logo{font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:#064E5C;}
        .pet360-root .logo em{font-style:normal;color:#C6930A;}
        .pet360-root .nav-crumb{font-size:12px;color:#94A3B8;display:flex;align-items:center;gap:6px;}
        .pet360-root .hero{background:linear-gradient(175deg,#F5F0FF 0%,#EDE9FE 40%,#FFF 100%);padding:48px 0 36px;text-align:center;position:relative;overflow:hidden;}
        .pet360-root .hero-top{display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap;margin-bottom:28px;}
        .pet360-root .video-frame{width:220px;height:390px;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(124,58,237,.15);border:3px solid rgba(124,58,237,.2);background:#000;position:relative;}
        .pet360-root .hero-text{text-align:left;max-width:440px;}
        .pet360-root .hero-text h1{font-size:clamp(28px,4.5vw,38px);font-weight:700;line-height:1.18;margin-bottom:10px;color:#1E293B;}
        .pet360-root .hero-text .accent{color:#7C3AED;}
        .pet360-root .hero-text .sub{font-size:14.5px;color:#475569;line-height:1.65;margin-bottom:16px;}
        .pet360-root .hero-ctas{display:flex;gap:10px;flex-wrap:wrap;}
        .pet360-root .btn{padding:10px 22px;border-radius:24px;font-size:13px;font-weight:700;cursor:pointer;border:none;}
        .pet360-root .btn-primary{background:#7C3AED;color:#fff;}
        .pet360-root .btn-outline{background:#fff;color:#7C3AED;border:1.5px solid #7C3AED;}
        .pet360-root .science,.pet360-root .catalog,.pet360-root .loops,.pet360-root .schedule{padding:32px 0;}
        .pet360-root .science{border-bottom:1px solid #E2E8F0;}
        .pet360-root .sci-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
        .pet360-root .sci-card{text-align:center;padding:18px 12px;border-radius:14px;border:1px solid #E2E8F0;}
        .pet360-root .sci-emoji{font-size:32px;display:block;margin-bottom:6px;}
        .pet360-root .sci-chem{font-size:14px;font-weight:700;color:#7C3AED;}
        .pet360-root .sci-desc{font-size:11.5px;color:#64748B;line-height:1.5;}
        .pet360-root .sci-trigger{font-size:10px;font-weight:600;color:#059669;margin-top:6px;background:#D1FAE5;display:inline-block;padding:2px 8px;border-radius:10px;}
        .pet360-root .pathways,.pet360-root .monetization,.pet360-root .revenue{padding:32px 0;background:#F8FAFC;}
        .pet360-root .path-grid,.pet360-root .loop-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .pet360-root .path-card,.pet360-root .loop-card{background:#fff;border-radius:14px;border:1px solid #E2E8F0;padding:20px;}
        .pet360-root .path-flow{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}
        .pet360-root .path-step{font-size:10px;font-weight:600;padding:3px 9px;border-radius:12px;background:#EDE9FE;color:#7C3AED;}
        .pet360-root .path-step.arrow{background:transparent;color:#94A3B8;padding:3px 2px;}
        .pet360-root .tier-section{margin-bottom:24px;}
        .pet360-root .tier-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
        .pet360-root .pets-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}
        .pet360-root .pet-card{background:#fff;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;position:relative;}
        .pet360-root .pet-visual{height:100px;display:flex;align-items:center;justify-content:center;font-size:48px;}
        .pet360-root .pet-body{padding:10px 14px 14px;}
        .pet360-root .pet-name{font-size:13px;font-weight:700;}
        .pet360-root .pet-env{font-size:10.5px;color:#94A3B8;margin-bottom:6px;}
        .pet360-root .pet-benefit{font-size:10px;font-weight:600;padding:3px 8px;border-radius:10px;display:inline-block;margin-right:3px;margin-bottom:3px;}
        .pet360-root .calm{background:#DBEAFE;color:#1D4ED8;}
        .pet360-root .joy{background:#FEF3C7;color:#92400E;}
        .pet360-root .mind{background:#E0E7FF;color:#4338CA;}
        .pet360-root .growth{background:#D1FAE5;color:#059669;}
        .pet360-root .strength{background:#FCE7F3;color:#9D174D;}
        .pet360-root .pet-price{position:absolute;top:8px;right:8px;font-size:9px;font-weight:700;padding:3px 8px;border-radius:10px;}
        .pet360-root .free{background:#D1FAE5;color:#059669;}
        .pet360-root .paid{background:#EDE9FE;color:#7C3AED;}
        .pet360-root .premium{background:#FEF9EB;color:#C6930A;}
        .pet360-root .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;}
        .pet360-root .price-card{background:#fff;border-radius:16px;padding:24px;border:1.5px solid #E2E8F0;position:relative;}
        .pet360-root .price-card.recommended{border-color:#7C3AED;}
        .pet360-root .price-card.recommended::before{content:'BEST VALUE';position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#7C3AED;color:#fff;font-size:9px;font-weight:700;letter-spacing:1px;padding:3px 12px;border-radius:10px;}
        .pet360-root .pc-price{font-size:28px;font-weight:800;color:#7C3AED;}
        .pet360-root .pc-list{list-style:none;padding:0;margin-top:8px;}
        .pet360-root .pc-list li{font-size:12px;color:#475569;padding:4px 0;}
        .pet360-root .pc-cta{margin-top:14px;width:100%;padding:10px;border-radius:20px;font-size:12px;font-weight:700;border:none;}
        .pet360-root .pc-cta.primary{background:#7C3AED;color:#fff;}
        .pet360-root .pc-cta.secondary{background:#fff;color:#7C3AED;border:1.5px solid #7C3AED;}
        .pet360-root .sched-timeline{display:flex;flex-direction:column;gap:12px;max-width:700px;margin:0 auto;}
        .pet360-root .sched-item{display:flex;align-items:flex-start;gap:14px;padding:14px 18px;background:#fff;border:1px solid #E2E8F0;border-radius:14px;}
        .pet360-root .sched-time{font-size:12px;font-weight:700;color:#7C3AED;min-width:60px;padding-top:2px;}
        .pet360-root .sched-emoji{font-size:24px;}
        .pet360-root .chem{font-size:10px;font-weight:600;color:#059669;background:#D1FAE5;padding:2px 8px;border-radius:8px;display:inline-block;margin-top:4px;}
        .pet360-root .rev-table{width:100%;border-collapse:separate;border-spacing:0;border-radius:14px;overflow:hidden;border:1px solid #E2E8F0;background:#fff;}
        .pet360-root .rev-table th{background:#EDE9FE;color:#7C3AED;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:10px 14px;text-align:left;}
        .pet360-root .rev-table td{padding:10px 14px;font-size:12.5px;color:#475569;border-top:1px solid #E2E8F0;}
        .pet360-root .total td{font-weight:700;color:#7C3AED;background:#EDE9FE;font-size:13px;}
        @media(max-width:768px){
          .pet360-root .hero-top{flex-direction:column;}
          .pet360-root .hero-text{text-align:center;}
          .pet360-root .hero-ctas{justify-content:center;}
          .pet360-root .sci-grid{grid-template-columns:1fr 1fr;}
          .pet360-root .path-grid,.pet360-root .loop-grid,.pet360-root .pricing-grid{grid-template-columns:1fr;}
          .pet360-root .pets-row{grid-template-columns:1fr 1fr;}
        }
      `}</style>

      <div className="nav">
        <div className="shell">
          <div className="nav-inner">
            <div className="logo">MANAS<em>360</em></div>
            <div className="nav-crumb"><span>PT01</span> {'->'} <span>PT06</span> {'->'} <span style={{ color: '#475569', fontWeight: 600 }}>Digital Pet</span></div>
          </div>
        </div>
      </div>

      <div className="hero">
        <div className="shell">
          <div className="hero-top">
            <Pt06HeroVideoFrame className="video-frame" />
            <div className="hero-text">
              <div className="badge" style={{ background: '#EDE9FE', color: '#7C3AED', marginBottom: 12 }}>🐾 PT06 - Digital Pet Hub</div>
              <h1>Your <span className="accent">Oxytocin</span> Engine - A Companion Who&apos;s Always Happy to See You</h1>
              <p className="sub">Science says your brain releases serotonin and oxytocin from connection - and it doesn&apos;t care if that connection has fur or pixels. It only cares if it&apos;s <em>felt</em>.</p>
              <div className="hero-ctas">
                <button type="button" className="btn btn-primary" onClick={() => scrollToId('catalog')}>🐾 Meet Your Pet</button>
                <button type="button" className="btn btn-outline" onClick={() => scrollToId('science')}>🧬 See the Science</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="science" id="science">
        <div className="shell">
          <h2 style={{ textAlign: 'center', marginBottom: 18, fontSize: 22 }}>🧬 The Neurochemistry Behind Digital Companionship</h2>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748B', maxWidth: 560, margin: '0 auto 20px' }}>Every interaction with your digital pet triggers real brain chemistry. This isn&apos;t gaming - it&apos;s <strong>evidence-based emotional wellness</strong>.</p>
          <div className="sci-grid">
            {scienceCards.map((item) => (
              <div className="sci-card" key={item.chem}>
                <span className="sci-emoji">{item.emoji}</span>
                <div className="sci-chem">{item.chem}</div>
                <div className="sci-desc">{item.desc}</div>
                <div className="sci-trigger">{item.trigger}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pathways">
        <div className="shell">
          <h2 style={{ textAlign: 'center', marginBottom: 18, fontSize: 22 }}>🔀 Two Ways to Begin</h2>
          <div className="path-grid">
            <div className="path-card">
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Prescribed by Therapist / Psychiatrist</h3>
              <p style={{ fontSize: 12.5, color: '#64748B' }}>After a coaching session, your therapist prescribes a specific pet type based on your needs - loneliness, anxiety, habit building, or engagement therapy.</p>
              <div className="path-flow"><span className="path-step">Therapy Session</span><span className="path-step arrow">{'->'}</span><span className="path-step">Rx: Digital Pet</span><span className="path-step arrow">{'->'}</span><span className="path-step">Therapist picks species</span><span className="path-step arrow">{'->'}</span><span className="path-step">Unlocked in your Hub</span></div>
            </div>
            <div className="path-card">
              <div style={{ fontSize: 32, marginBottom: 8 }}>🧭</div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Explore Independently</h3>
              <p style={{ fontSize: 12.5, color: '#64748B' }}>Browse the full pet catalog. Start free with an ambient companion, then upgrade to interactive or AI-powered pets as your journey deepens.</p>
              <div className="path-flow"><span className="path-step">PT06 Hub Landing</span><span className="path-step arrow">{'->'}</span><span className="path-step">Watch Avatar Pitch</span><span className="path-step arrow">{'->'}</span><span className="path-step">Choose Free Pet</span><span className="path-step arrow">{'->'}</span><span className="path-step">Upgrade when ready</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="catalog" id="catalog">
        <div className="shell">
          <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: 24 }}>🐾 Pet Companion Catalog</h2>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748B', maxWidth: 500, margin: '0 auto 24px' }}>Each species is designed for a specific therapeutic purpose. Your pet isn&apos;t just cute - it&apos;s medicine.</p>

          <div className="tier-section">
            <div className="tier-header"><h2>Tier 1 - Ambient Companions</h2></div>
            <div className="pets-row">
              <div className="pet-card">
                <div style={{ padding: '177.78% 0 0 0', position: 'relative' }}>
                  <iframe
                    src="https://player.vimeo.com/video/1184033995?title=0&amp;byline=0&amp;portrait=0&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    title="MANAS360 MentalWellness Intro_1080p_caption"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    
                  />
                </div>
                <div className="pet-body"><div className="pet-name">1 Ponda</div></div>
              </div>

              <div className="pet-card">
                <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
                  <iframe
                    src="https://player.vimeo.com/video/1184033994?title=0&amp;byline=0&amp;portrait=0&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    title="FindingStillness"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    
                  />
                </div>
                <div className="pet-body"><div className="pet-name">2 ClownFish</div></div>
              </div>

              <div className="pet-card">
                <div style={{ padding: '177.78% 0 0 0', position: 'relative' }}>
                  <iframe
                    src="https://player.vimeo.com/video/1184033993?title=0&amp;byline=0&amp;portrait=0&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    title="3 NavilCheerful"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    
                  />
                </div>
                <div className="pet-body"><div className="pet-name">3 NavilCheerful</div></div>
              </div>
            </div>
          </div>

          <div className="tier-section">
            <div className="tier-header"><h2>Tier 2 - Interactive Companions</h2></div>
            <div className="pets-row">
              <Link to="/chintu" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className={`pet-card ${selectedPet === 'wise-owl' ? 'pet-focus' : ''}`} data-pet="wise-owl"><div className="pet-visual" style={{ background: 'linear-gradient(135deg,#FFE4CC,#FFD1AA)' }}>🦊</div><div className="pet-body"><div className="pet-name">Chintu - The Clever Fox</div><div className="pet-env">🔥 Dopamine Engine</div><span className="pet-benefit joy">Dopamine Boost</span><span className="pet-benefit joy">Rewards &amp; Play</span></div></div>
              </Link>
              <Link to="/dino" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className={`pet-card ${selectedPet === 'golden-puppy' ? 'pet-focus' : ''}`} data-pet="golden-puppy"><div className="pet-visual" style={{ background: 'linear-gradient(135deg,#D1FAE5,#A7F3D0)' }}>🦕</div><div className="pet-body"><div className="pet-name">Baby Dino</div><div className="pet-env">🌿 Love Nest</div><span className="pet-benefit calm">Oxytocin Bond</span><span className="pet-benefit growth">Nurturing Care</span></div></div>
              </Link>
              <Link to="/elephant" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className="pet-card"><div className="pet-visual" style={{ background: 'linear-gradient(135deg,#D1FAE5,#6EE7B7)' }}>🐘</div><div className="pet-body"><div className="pet-name">Appu - Healing Elephant</div><div className="pet-env">🌳 Sacred Grove</div><span className="pet-benefit strength">Emotional Strength</span><span className="pet-benefit mind">Memory</span></div></div>
              </Link>
              <Link to="/goldenPup" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className={`pet-card ${selectedPet === 'patience-turtle' ? 'pet-focus' : ''}`} data-pet="patience-turtle"><div className="pet-visual" style={{ background: 'linear-gradient(135deg,#FFE4CC,#FFD1AA)' }}>🐕</div><div className="pet-body"><div className="pet-name">Golden Pup</div><div className="pet-env">🏡 Home Base</div><span className="pet-benefit calm">Loyalty</span><span className="pet-benefit joy">Playfulness</span></div></div>
              </Link>
            </div>
          </div>

          <div className="tier-section">
            <div className="tier-header">
              <h2>Tier 3 - AI Companions</h2>
              <span className="badge" style={{ background: '#FEF3C7', color: '#D97706' }}>Coming Soon</span>
            </div>
            <div className="pets-row">
              <div className="pet-card" style={{ opacity: 0.85 }}>
                <div className="pet-visual" style={{ background: 'linear-gradient(135deg,#FCE7F3,#FBCFE8)' }}>🦋</div>
                <div className="pet-body">
                  <div className="pet-name">Phoenix Friend</div>
                  <div className="pet-env">🔥 Rebirth Temple</div>
                  <span className="pet-benefit strength">Transformation</span><span className="pet-benefit growth">Crisis Support</span>
                  <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: '#D97706' }}>Coming Soon</div>
                </div>
              </div>
              <div className="pet-card" style={{ opacity: 0.85 }}>
                <div className="pet-visual" style={{ background: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)' }}>🐉</div>
                <div className="pet-body">
                  <div className="pet-name">Guardian Dragon</div>
                  <div className="pet-env">⛰️ Crystal Cave</div>
                  <span className="pet-benefit strength">Protection</span><span className="pet-benefit mind">Voice Chat</span>
                  <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: '#D97706' }}>Coming Soon</div>
                </div>
              </div>
              <div className="pet-card" style={{ opacity: 0.85 }}>
                <div className="pet-visual" style={{ background: 'linear-gradient(135deg,#FEF9EB,#FEF3C7)' }}>🦚</div>
                <div className="pet-body">
                  <div className="pet-name">Wisdom Peacock</div>
                  <div className="pet-env">🕉️ Lotus Garden</div>
                  <span className="pet-benefit mind">Vedic Wisdom</span><span className="pet-benefit growth">Self-Discovery</span>
                  <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: '#D97706' }}>Coming Soon</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="addons" id="addons">
        <div className="shell">
          <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: 22 }}>Add-On Features (À la Carte)</h2>
          <div className="addons-card">
            <div style={{ overflowX: 'auto' }}>
              <table className="addons-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>1 Hour</th>
                    <th>3 Hours ⭐</th>
                    <th>5 Hours</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>🤖 AnytimeBuddy</td>
                    <td>₹399</td>
                    <td>₹999</td>
                    <td>₹1,699</td>
                    <td>On-demand emotional support chat (24/7 AI companion)</td>
                  </tr>
                  <tr>
                    <td>🐾 Digital Pet Hub</td>
                    <td colSpan={3}>Free starter + Premium unlock via subscription</td>
                    <td>Neurotransmitter companions (Chintu, Bholu, Mithi, Dheeraj)</td>
                  </tr>
                  <tr>
                    <td>📞 IVR Therapy</td>
                    <td colSpan={3}>Pay-per-session (same as standard fees)</td>
                    <td>Voice-based therapy + PHQ screening via phone call</td>
                  </tr>
                  <tr>
                    <td>💬 VentBuddy</td>
                    <td colSpan={3}>3 free/day, Premium unlimited</td>
                    <td>Anonymous venting with trained AI listener</td>
                  </tr>
                  <tr>
                    <td>🎵 Sound Therapy</td>
                    <td>₹30/track</td>
                    <td>₹250/bundle (10 tracks)</td>
                    <td></td>
                    <td>Own forever, unlimited play + download</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="schedule" id="schedule">
        <div className="shell">
          <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: 22 }}>⏰ A Day With Your Digital Pet - The Oxytocin Schedule</h2>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748B', maxWidth: 520, margin: '0 auto 20px' }}>Each touchpoint is designed to trigger specific neurochemicals. This is prescribable wellness.</p>
          <div className="sched-timeline">
            {schedule.map((item) => (
              <div className="sched-item" key={item.title + item.time}>
                <div className="sched-time">{item.time}</div>
                <div className="sched-emoji">{item.emoji}</div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</h4>
                  <p style={{ fontSize: 11.5, color: '#64748B' }}>{item.text}</p>
                  <span className="chem">{item.chem}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 0', borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
        <div className="shell">
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: '#064E5C' }}>MANAS<em style={{ color: '#C6930A', fontStyle: 'normal' }}>360</em></p>
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Digital Pet Hub - PT06</p>
        </div>
      </div>
    </div>
  );
}

export default DigitalPetsHubPage;
