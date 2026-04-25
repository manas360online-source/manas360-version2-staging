
import { useEffect } from "react";
import { Link } from "react-router-dom";

type DigitalPetsHubPageProps = {
  selectedPet?: string;
};

const PETS = [
  {
    key: "baby-dino",
    name: "Baby Dinosaur",
    emoji: "🦕",
    hormone: "Love",
    hormoneDesc: "Oxytocin — nurture, bond, feel loved"
  },
  {
    key: "golden-retriever",
    name: "Golden Retriever",
    emoji: "🐕",
    hormone: "Happy",
    hormoneDesc: "Serotonin — daily routines, calm, stability"
  },
  {
    key: "healing-elephant",
    name: "Healing Elephant",
    emoji: "🐘",
    hormone: "Reward",
    hormoneDesc: "Dopamine — achievements, games, milestones"
  },
  {
    key: "chintu-fox",
    name: "Chintu Fox",
    emoji: "🦊",
    hormone: "Energy",
    hormoneDesc: "Endorphins — breathwork, play, laughter"
  }
];
const scienceCards = [
  { emoji: "🧪", chem: "Oxytocin", desc: "The love hormone", trigger: "Touch/Petting" },
  { emoji: "🧠", chem: "Dopamine", desc: "The reward system", trigger: "Games/Feeding" },
  { emoji: "🌊", chem: "Serotonin", desc: "The mood stabilizer", trigger: "Daily Routine" },
  { emoji: "✨", chem: "Endorphins", desc: "The pain reliever", trigger: "Play/Laughter" }
];

import Pt06HeroVideoFrame from '../../components/common/Pt06HeroVideoFrame';

export default function DigitalPetsHubPage({ selectedPet }: DigitalPetsHubPageProps) {
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
      {selectedPet && (
        <div style={{ textAlign: "center", marginBottom: 24, padding: 16, background: "#f3f4f6", borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            {PETS.find((p) => p.key === selectedPet)?.emoji}
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
            {PETS.find((p) => p.key === selectedPet)?.name}
          </div>
          <div style={{ color: "#7c3aed", fontWeight: 600, marginBottom: 2 }}>
            {PETS.find((p) => p.key === selectedPet)?.hormone}
          </div>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>
            {PETS.find((p) => p.key === selectedPet)?.hormoneDesc}
          </div>
        </div>
      )}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <button
          style={{
            background: "#f472b6",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "14px 28px",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            marginBottom: 8
          }}
        >
          💝 Name Your Pet — Adopt
        </button>
        <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>Free — Choose, name, and start your journey</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <Link to="/">Go Home</Link>
      </div>
    </div>
  );
}
