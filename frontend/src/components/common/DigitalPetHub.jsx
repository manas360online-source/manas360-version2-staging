import { useState } from "react";
import { Link } from "react-router-dom";
import Chintu from "./Chintu";
import Dino from "./Dino";
import Pt06HeroVideoFrame from "./Pt06HeroVideoFrame";

const tokens = {
  teal: "#0C7C8A", tealDeep: "#064E5C", tealLight: "#E8F6F8", tealMist: "#F0FAFB",
  gold: "#C6930A", goldLight: "#FEF9EB",
  violet: "#7C3AED", violetLight: "#EDE9FE", violetDeep: "#5B21B6",
  rose: "#E11D48", roseLight: "#FFE4E6",
  green: "#059669", greenLight: "#D1FAE5", greenBg: "#ECFDF5",
  amber: "#D97706", amberLight: "#FEF3C7",
  slate: "#1E293B", slate2: "#334155", slate3: "#475569", slate4: "#64748B",
  stone: "#94A3B8", stoneLight: "#CBD5E1", stoneLighter: "#E2E8F0", stoneBg: "#F8FAFC",
  white: "#FFF",
};

/* ─── Primitives ─── */
const Badge = ({ children, bg, color, style = {} }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "4px 12px", borderRadius: 16,
    fontSize: 10, fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase",
    background: bg, color, ...style,
  }}>{children}</span>
);

const Btn = ({ children, variant = "primary", onClick, style = {} }) => {
  const [hov, setHov] = useState(false);
  const base = {
    padding: "10px 22px", borderRadius: 24, fontSize: 13, fontWeight: 700,
    cursor: "pointer", border: "none", transition: "all .2s", fontFamily: "inherit",
  };
  const variants = {
    primary: { background: hov ? tokens.violetDeep : tokens.violet, color: "#fff", transform: hov ? "translateY(-2px)" : "none", boxShadow: hov ? "0 6px 20px rgba(124,58,237,.25)" : "none" },
    outline: { background: hov ? tokens.violetLight : "#fff", color: tokens.violet, border: `1.5px solid ${tokens.violet}`, transform: hov ? "translateY(-2px)" : "none" },
    secondary: { background: "#fff", color: tokens.violet, border: `1.5px solid ${tokens.violet}`, width: "100%" },
    primaryFull: { background: hov ? tokens.violetDeep : tokens.violet, color: "#fff", width: "100%" },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {children}
    </button>
  );
};

/* ─── NAV ─── */
const Nav = () => (
  <nav style={{
    padding: "12px 0", borderBottom: `1px solid ${tokens.stoneLighter}`,
    position: "sticky", top: 0, zIndex: 50,
    background: "rgba(255,255,255,.92)", backdropFilter: "blur(14px)",
  }}>
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: tokens.tealDeep }}>
        MANAS<span style={{ color: tokens.gold }}>360</span>
      </div>
      <div style={{ fontSize: 12, color: tokens.stone, display: "flex", alignItems: "center", gap: 6 }}>
        <a href="#" style={{ color: tokens.teal, textDecoration: "none", fontWeight: 600 }}>PT01</a>
        {" → "}
        <a href="#" style={{ color: tokens.teal, textDecoration: "none", fontWeight: 600 }}>PT06</a>
        {" → "}
        <span style={{ color: tokens.slate3, fontWeight: 600 }}>Digital Pet</span>
      </div>
    </div>
  </nav>
);

/* ─── HERO ─── */
const Hero = () => {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <section style={{
      background: "linear-gradient(175deg,#F5F0FF 0%,#EDE9FE 40%,#fff 100%)",
      padding: "48px 0 36px", textAlign: "center", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -60, right: -80, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(124,58,237,.07),transparent 70%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
          <Pt06HeroVideoFrame style={{
            width: 220, height: 390, borderRadius: 20, overflow: "hidden",
            boxShadow: "0 12px 40px rgba(124,58,237,.15)", border: "3px solid rgba(124,58,237,.2)",
            flexShrink: 0, background: "#1a1a2e", position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
            animation: "glow 3s ease infinite",
          }} />

          <div style={{ textAlign: "left", maxWidth: 440 }}>
            <Badge bg={tokens.violetLight} color={tokens.violet} style={{ marginBottom: 12 }}>🐾 PT06 — Digital Pet Hub</Badge>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(28px,4.5vw,38px)", fontWeight: 700, lineHeight: 1.18, marginBottom: 10, color: tokens.slate }}>
              Your <span style={{ color: tokens.violet }}>Oxytocin</span> Engine — A Companion Who's Always Happy to See You
            </h1>
            <p style={{ fontSize: 14.5, color: tokens.slate3, lineHeight: 1.65, marginBottom: 16 }}>
              Science says your brain releases serotonin and oxytocin from connection — and it doesn't care if that connection has fur or pixels. It only cares if it's <em>felt</em>.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn variant="primary" onClick={() => scrollTo("catalog")}>🐾 Meet Your Pet</Btn>
              <Btn variant="outline" onClick={() => scrollTo("science")}>🧬 See the Science</Btn>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── SCIENCE ─── */
const sciCards = [
  { emoji: "💜", chem: "Oxytocin", desc: '"Love hormone" — released when your pet greets you, nuzzles, or responds to your care.', trigger: "Trigger: Pet greetings, nurturing" },
  { emoji: "☀️", chem: "Serotonin", desc: '"Happy chemical" — boosted by daily routines, care rituals, and watching your pet thrive.', trigger: "Trigger: Daily check-ins, growth" },
  { emoji: "⚡", chem: "Dopamine", desc: '"Reward chemical" — released when you unlock milestones, win mini-games, level up your pet.', trigger: "Trigger: Achievements, games" },
  { emoji: "🧘", chem: "Endorphins", desc: '"Natural painkiller" — released during breathing exercises, meditation, and laughter with your pet.', trigger: "Trigger: Breathwork, play" },
];

const SciCard = ({ emoji, chem, desc, trigger }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      textAlign: "center", padding: "18px 12px", borderRadius: 14,
      border: `1px solid ${hov ? "rgba(124,58,237,.2)" : tokens.stoneLighter}`,
      boxShadow: hov ? "0 8px 24px rgba(0,0,0,.05)" : "none",
      transform: hov ? "translateY(-3px)" : "none", transition: "all .2s",
    }}>
      <span style={{ fontSize: 32, marginBottom: 6, display: "block" }}>{emoji}</span>
      <div style={{ fontSize: 14, fontWeight: 700, color: tokens.violet, marginBottom: 2 }}>{chem}</div>
      <div style={{ fontSize: 11.5, color: tokens.slate4, lineHeight: 1.5 }}>{desc}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: tokens.green, marginTop: 6, background: tokens.greenLight, display: "inline-block", padding: "2px 8px", borderRadius: 10 }}>{trigger}</div>
    </div>
  );
};

const ScienceStrip = () => (
  <section id="science" style={{ background: tokens.white, padding: "32px 0", borderBottom: `1px solid ${tokens.stoneLighter}` }}>
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px" }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", textAlign: "center", marginBottom: 18, fontSize: 22 }}>🧬 The Neurochemistry Behind Digital Companionship</h2>
      <p style={{ textAlign: "center", fontSize: 13, color: tokens.slate4, maxWidth: 560, margin: "0 auto 20px" }}>
        Every interaction triggers real brain chemistry. This isn't gaming — it's <strong>evidence-based emotional wellness</strong>.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
        {sciCards.map((c) => <SciCard key={c.chem} {...c} />)}
      </div>
    </div>
  </section>
);

/* ─── PATHWAYS ─── */
const pathwayData = [
  { icon: "📋", title: "Prescribed by Therapist / Psychiatrist", desc: "After a coaching session, your therapist prescribes a specific pet type based on your needs — loneliness, anxiety, habit building, or engagement therapy.", steps: ["Therapy Session", "Rx: Digital Pet", "Therapist picks species", "Unlocked in your Hub"] },
  { icon: "🧭", title: "Explore Independently", desc: "Browse the full pet catalog. Start free with an ambient companion, then upgrade to interactive or AI-powered pets as your journey deepens.", steps: ["PT06 Hub Landing", "Watch Avatar Pitch", "Choose Free Pet", "Upgrade when ready"] },
];

const PathCard = ({ icon, title, desc, steps }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: tokens.white, borderRadius: 16, padding: 24,
      border: `1.5px solid ${hov ? tokens.violet : tokens.stoneLighter}`,
      boxShadow: hov ? "0 8px 28px rgba(0,0,0,.06)" : "none",
      transform: hov ? "translateY(-2px)" : "none", transition: "all .2s", cursor: "pointer",
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 16, fontWeight: 700, color: tokens.slate, marginBottom: 4 }}>{title}</h3>
      <p style={{ fontSize: 12.5, color: tokens.slate4, lineHeight: 1.6, marginBottom: 10 }}>{desc}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        {steps.map((s, i) => (
          <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: tokens.violetLight, color: tokens.violet }}>{s}</span>
            {i < steps.length - 1 && <span style={{ fontSize: 10, color: tokens.stone }}>→</span>}
          </span>
        ))}
      </div>
    </div>
  );
};

const Pathways = () => (
  <section style={{ padding: "32px 0", background: tokens.stoneBg }}>
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px" }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", textAlign: "center", marginBottom: 18, fontSize: 22 }}>🔀 Two Ways to Begin</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
        {pathwayData.map((p) => <PathCard key={p.title} {...p} />)}
      </div>
    </div>
  </section>
);

/* ─── PET CATALOG ─── */
const benefitColors = {
  calm: { bg: "#DBEAFE", color: "#1D4ED8" },
  joy: { bg: "#FEF3C7", color: "#92400E" },
  mind: { bg: "#E0E7FF", color: "#4338CA" },
  strength: { bg: "#FCE7F3", color: "#9D174D" },
  growth: { bg: tokens.greenLight, color: tokens.green },
};

const PetCard = ({ emoji, name, env, bg, benefits, price, priceColor, priceBg }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: tokens.white, border: `1px solid ${hov ? "rgba(124,58,237,.25)" : tokens.stoneLighter}`,
      borderRadius: 14, overflow: "hidden",
      boxShadow: hov ? "0 10px 32px rgba(0,0,0,.07)" : "none",
      transform: hov ? "translateY(-4px)" : "none", transition: "all .25s", cursor: "pointer", position: "relative",
    }}>
      <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, background: bg, position: "relative" }}>
        <span style={{ position: "absolute", top: 8, right: 8, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 10, letterSpacing: ".5px", background: priceBg, color: priceColor }}>{price}</span>
        {emoji}
      </div>
      <div style={{ padding: "10px 14px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: tokens.slate, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 10.5, color: tokens.stone, marginBottom: 6 }}>{env}</div>
        {benefits.map((b) => (
          <span key={b.label} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 10, display: "inline-block", marginRight: 3, marginBottom: 3, background: benefitColors[b.cls].bg, color: benefitColors[b.cls].color }}>{b.label}</span>
        ))}
      </div>
    </div>
  );
};

const TierSection = ({ title, badge, sub, children }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700 }}>{title}</h2>
      {badge}
      <span style={{ fontSize: 12, color: tokens.stone }}>{sub}</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
      {children}
    </div>
  </div>
);

const PetCatalog = () => (
  <section id="catalog" style={{ padding: "36px 0" }}>
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px" }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", textAlign: "center", marginBottom: 8, fontSize: 24 }}>🐾 Pet Companion Catalog</h2>
      <p style={{ textAlign: "center", fontSize: 13, color: tokens.slate4, maxWidth: 500, margin: "0 auto 24px" }}>Each species is designed for a specific therapeutic purpose. Your pet isn't just cute — it's medicine.</p>

      <TierSection title="Tier 1 — Ambient Companions" badge={<Badge bg={tokens.greenLight} color={tokens.green}>FREE</Badge>} sub="Watch, breathe, be present">
        <PetCard emoji="🐟" name="Koi Fish" env="🌊 Zen Pond" bg="linear-gradient(135deg,#DBEAFE,#BFDBFE)" benefits={[{label:"Anxiety",cls:"calm"},{label:"Stress Relief",cls:"calm"}]} price="FREE" priceColor={tokens.green} priceBg={tokens.greenLight} />
        <PetCard emoji="🐱" name="Lotus Cat" env="🏯 Garden Temple" bg="linear-gradient(135deg,#D1FAE5,#A7F3D0)" benefits={[{label:"Grounding",cls:"calm"},{label:"Mindfulness",cls:"mind"}]} price="FREE" priceColor={tokens.green} priceBg={tokens.greenLight} />
        <PetCard emoji="✨" name="Cloud Sprite" env="☁️ Sky Realm" bg="linear-gradient(135deg,#E0E7FF,#C7D2FE)" benefits={[{label:"Lightness",cls:"calm"},{label:"Letting Go",cls:"growth"}]} price="FREE" priceColor={tokens.green} priceBg={tokens.greenLight} />
      </TierSection>

      <TierSection title="Tier 2 — Interactive Companions" badge={<Badge bg={tokens.violetLight} color={tokens.violet}>₹99/mo or ₹199 OWN</Badge>} sub="Pet, play, breathe, grow">
        <Link to="/chintu" style={{textDecoration:'none',color:'inherit'}}><PetCard emoji="🦊" name="Chintu - The Clever Fox" env="🔥 Dopamine Engine" bg="linear-gradient(135deg,#FFE4CC,#FFD1AA)" benefits={[{label:"Dopamine Boost",cls:"joy"},{label:"Rewards & Play",cls:"joy"}]} price="₹99/mo" priceColor={tokens.violet} priceBg={tokens.violetLight} /></Link>
        <Link to="/dino" style={{textDecoration:'none',color:'inherit'}}><PetCard emoji="🦕" name="Baby Dino" env="🌿 Love Nest" bg="linear-gradient(135deg,#D1FAE5,#A7F3D0)" benefits={[{label:"Oxytocin Bond",cls:"calm"},{label:"Nurturing Care",cls:"growth"}]} price="₹99/mo" priceColor={tokens.violet} priceBg={tokens.violetLight} /></Link>
        <Link to="/elephant" style={{textDecoration:'none',color:'inherit'}}><PetCard emoji="🐘" name="Appu - Healing Elephant" env="🌳 Sacred Grove" bg="linear-gradient(135deg,#D1FAE5,#6EE7B7)" benefits={[{label:"Emotional Strength",cls:"strength"},{label:"Memory",cls:"mind"}]} price="₹99/mo" priceColor={tokens.violet} priceBg={tokens.violetLight} /></Link>
        <Link to="/goldenPup" style={{textDecoration:'none',color:'inherit'}}><PetCard emoji="🐕" name="Golden Pup" env="🏡 Home Base" bg="linear-gradient(135deg,#FFE4CC,#FFD1AA)" benefits={[{label:"Loyalty",cls:"calm"},{label:"Playfulness",cls:"joy"}]} price="₹99/mo" priceColor={tokens.violet} priceBg={tokens.violetLight} /></Link>
      </TierSection>

      <TierSection title="Tier 3 — AI Companions" badge={<Badge bg={tokens.goldLight} color={tokens.gold}>₹299/mo or ₹499 OWN</Badge>} sub="Talk, remember, evolve, heal">
        <PetCard emoji="🦋" name="Phoenix Friend" env="🔥 Rebirth Temple" bg="linear-gradient(135deg,#FCE7F3,#FBCFE8)" benefits={[{label:"Transformation",cls:"strength"},{label:"Crisis Support",cls:"growth"}]} price="₹299/mo" priceColor={tokens.violet} priceBg={tokens.violetLight} />
        <PetCard emoji="🐉" name="Guardian Dragon" env="⛰️ Crystal Cave" bg="linear-gradient(135deg,#EDE9FE,#DDD6FE)" benefits={[{label:"Protection",cls:"strength"},{label:"Voice Chat",cls:"mind"}]} price="₹299/mo" priceColor={tokens.violet} priceBg={tokens.violetLight} />
        <PetCard emoji="🦚" name="Wisdom Peacock" env="🕉️ Lotus Garden" bg="linear-gradient(135deg,#FEF9EB,#FEF3C7)" benefits={[{label:"Vedic Wisdom",cls:"mind"},{label:"Self-Discovery",cls:"growth"}]} price="₹299/mo" priceColor={tokens.violet} priceBg={tokens.violetLight} />
      </TierSection>
    </div>
  </section>
);

/* ─── MONETIZATION ─── */
const pricePlans = [
  { icon: "🌱", name: "Starter", price: "₹0", period: "/forever", sub: "Try before you commit", features: ["1 ambient pet (Koi, Cat, or Sprite)", "2 environments", "View-only mode (watch, breathe)", "Basic mood check-in", "3 breathing exercises", "Therapist Rx pets always unlocked"], cta: "Get Started — Free", ctaVariant: "secondary" },
  { icon: "🐾", name: "Per Pet", price: "₹99-299", period: "/mo per pet", sub: "Or ₹199-499 to own forever", recommended: true, features: ["Choose any Tier 2 or 3 pet", "Full interactions + mini-games", "Pet's dedicated environment", "AR mode (place pet in your room)", "Progress tracking per pet", "Therapist dashboard integration", "Offline mode for owned pets"], cta: "Choose Your Pet →", ctaVariant: "primaryFull" },
  { icon: "👑", name: "Pet Paradise", price: "₹299", period: "/month", sub: "All 10 pets + all features", features: ["All 10 pet species unlocked", "All environments + seasonal themes", "AI voice conversation (Tier 3 pets)", "Unlimited mini-games", "Pet evolves with your wellness journey", "Family sharing (up to 4 members)", "Priority access to new pets", "Connects to MANAS360 Premium ₹299"], cta: "Upgrade to Paradise", ctaVariant: "secondary" },
];

const PriceCard = ({ icon, name, price, period, sub, features, cta, ctaVariant, recommended }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: tokens.white, borderRadius: 16, padding: 24, position: "relative",
      border: `1.5px solid ${recommended ? tokens.violet : tokens.stoneLighter}`,
      boxShadow: recommended ? "0 8px 28px rgba(124,58,237,.12)" : hov ? "0 10px 30px rgba(0,0,0,.06)" : "none",
      transform: hov ? "translateY(-3px)" : "none", transition: "all .2s",
    }}>
      {recommended && (
        <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: tokens.violet, color: "#fff", fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: "3px 12px", borderRadius: 10 }}>BEST VALUE</div>
      )}
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: tokens.slate, marginBottom: 2 }}>{name}</h3>
      <div style={{ fontSize: 28, fontWeight: 800, color: tokens.violet, marginBottom: 2 }}>
        {price} <span style={{ fontSize: 13, color: tokens.stone, fontWeight: 500 }}>{period}</span>
      </div>
      <div style={{ fontSize: 11, color: tokens.stone, marginBottom: 12 }}>{sub}</div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {features.map((f) => (
          <li key={f} style={{ fontSize: 12, color: tokens.slate3, padding: "4px 0", display: "flex", alignItems: "flex-start", gap: 6 }}>
            <span style={{ color: tokens.green, fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 14 }}>
        <Btn variant={ctaVariant}>{cta}</Btn>
      </div>
    </div>
  );
};

const Monetization = () => (
  <section id="pricing" style={{ padding: "36px 0", background: tokens.stoneBg }}>
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px" }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", textAlign: "center", marginBottom: 8, fontSize: 24 }}>💰 Pricing Architecture — Hybrid Model</h2>
      <p style={{ textAlign: "center", fontSize: 13, color: tokens.slate4, maxWidth: 500, margin: "0 auto 22px" }}>Same proven model as Sound Therapy. Low barrier entry → à la carte exploration → subscription conversion.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, marginBottom: 24 }}>
        {pricePlans.map((p) => <PriceCard key={p.name} {...p} />)}
      </div>
      <div style={{ background: tokens.white, border: `1px solid ${tokens.stoneLighter}`, borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>🧠 Smart Upsell Logic (Dan Ariely — Behavioral Economics)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
          {[
            { bg: tokens.greenBg, color: tokens.green, label: "Week 1-2: Anchoring", text: 'Free pet creates attachment. User spends 5-10 min/day. Push notification: "Your Koi Fish missed you today! 🐟" → Opens app → engagement loop starts.' },
            { bg: tokens.amberLight, color: tokens.amber, label: "Week 3-4: Endowment Effect", text: 'User\'s free pet "introduces" a Tier 2 friend. "Hey! My friend Chintu wants to play with you! 🦊" → 72-hour free trial of Tier 2 → loss aversion kicks in.' },
            { bg: tokens.violetLight, color: tokens.violet, label: "Month 2: Decoy + Conversion", text: 'If user bought 2+ pets (₹198+/mo) → show: "You\'re spending ₹198/mo. For ₹299, unlock ALL 10 pets + AI voice + family sharing." Decoy makes Paradise look like a steal.' },
          ].map((u) => (
            <div key={u.label} style={{ padding: 12, background: u.bg, borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: u.color, marginBottom: 4 }}>{u.label}</div>
              <div style={{ fontSize: 11, color: tokens.slate3, lineHeight: 1.5 }}>{u.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

/* ─── SCHEDULE ─── */
const scheduleItems = [
  { time: "7:00 AM", emoji: "☀️", title: "Morning Greeting", desc: 'Pet wakes up with you. Happy animation + "Good morning! How did you sleep?" Mood check-in (1-10 scale).', chem: "💜 Oxytocin + ☀️ Serotonin" },
  { time: "7:15 AM", emoji: "🫁", title: "Breathing Exercise Together", desc: "Pet breathes with you. 4-7-8 breathing animation. Pet's belly rises and falls in sync.", chem: "🧘 Endorphins + 💜 Oxytocin" },
  { time: "12:30 PM", emoji: "🐾", title: "Midday Check-in", desc: 'Push notification: "Your puppy misses you! 🐕" Open app → pet does happy dance → micro-game (2 min). Stress break.', chem: "⚡ Dopamine + ☀️ Serotonin" },
  { time: "5:00 PM", emoji: "🎮", title: "Mini-Game Session", desc: "5-minute therapeutic game with your pet. Cognitive challenges (Owl), fetch (Puppy), or meditation (Cat). Progress unlocks new environments.", chem: "⚡ Dopamine + 🧘 Endorphins" },
  { time: "9:30 PM", emoji: "🌙", title: "Bedtime Wind-Down", desc: 'Pet yawns, curls up. Guided gratitude: "What made you smile today?" Pet falls asleep with you. Ambient sounds fade in.', chem: "💜 Oxytocin + ☀️ Serotonin + 🧘 Endorphins" },
  { time: "Weekly", emoji: "📊", title: "Wellness Report → Therapist Dashboard", desc: 'Mood trends, engagement time, breathing frequency, game scores sent to therapist. Therapist sees: "Patient engaged 6/7 days. Mood improved 2 points. Recommend continuing."', chem: "📋 Therapeutic Integration — Rx Loop Closed" },
];

const SchedItem = ({ time, emoji, title, desc, chem, isLast }) => {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
        display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px",
        background: tokens.white, border: `1px solid ${hov ? "rgba(124,58,237,.2)" : tokens.stoneLighter}`,
        borderRadius: 14, transition: "all .2s", boxShadow: hov ? "0 4px 16px rgba(0,0,0,.04)" : "none",
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: tokens.violet, minWidth: 60, paddingTop: 2 }}>{time}</div>
        <div style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</div>
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: tokens.slate, marginBottom: 2 }}>{title}</h4>
          <p style={{ fontSize: 11.5, color: tokens.slate4, lineHeight: 1.5 }}>{desc}</p>
          <span style={{ fontSize: 10, fontWeight: 600, color: tokens.green, background: tokens.greenLight, padding: "2px 8px", borderRadius: 8, display: "inline-block", marginTop: 4 }}>{chem}</span>
        </div>
      </div>
      {!isLast && <div style={{ position: "absolute", left: 32, top: "100%", width: 2, height: 12, background: tokens.stoneLighter }} />}
    </div>
  );
};

const Schedule = () => (
  <section id="schedule" style={{ padding: "36px 0" }}>
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px" }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", textAlign: "center", marginBottom: 8, fontSize: 22 }}>⏰ A Day With Your Digital Pet — The Oxytocin Schedule</h2>
      <p style={{ textAlign: "center", fontSize: 13, color: tokens.slate4, maxWidth: 520, margin: "0 auto 20px" }}>Each touchpoint is designed to trigger specific neurochemicals. This is prescribable wellness.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 700, margin: "0 auto" }}>
        {scheduleItems.map((item, i) => <SchedItem key={item.time} {...item} isLast={i === scheduleItems.length - 1} />)}
      </div>
    </div>
  </section>
);

/* ─── LOOPS ─── */
const loopCards = [
  { icon: "🪴", title: "Pet Growth = User Growth", desc: "Your pet visually evolves as YOU complete wellness activities. Skip a week? Pet looks sad, smaller. Consistent care? Pet glows, unlocks new abilities. Mirror of your own healing.", metric: "Retention driver: +35% DAU" },
  { icon: "🏆", title: "Achievement System", desc: '"7-Day Streak", "First Breathing Exercise", "Pet reached Level 5". Each badge releases dopamine. Shareable to social media — organic growth engine.', metric: "Virality driver: 12% share rate" },
  { icon: "👫", title: "Social Pet Playdates", desc: "Premium feature: Let your pet visit a friend's pet. Shared environments, cooperative mini-games. Builds real human connections through digital pet proxy.", metric: "Network effect: +22% referrals" },
  { icon: "🎄", title: "Seasonal + Festival Events", desc: "Diwali: Pet gets rangoli decorations. Christmas: Snow environment. Holi: Colors everywhere. Limited-time content creates urgency and return visits.", metric: "Re-engagement: 40% dormant user return" },
];

const LoopCard = ({ icon, title, desc, metric }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: tokens.white, border: `1px solid ${hov ? "rgba(124,58,237,.2)" : tokens.stoneLighter}`,
      borderRadius: 14, padding: 20, transition: "all .2s", boxShadow: hov ? "0 6px 20px rgba(0,0,0,.05)" : "none",
    }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: tokens.slate, marginBottom: 4 }}>{title}</h3>
      <p style={{ fontSize: 12, color: tokens.slate4, lineHeight: 1.6 }}>{desc}</p>
      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: tokens.violet, background: tokens.violetLight, display: "inline-block", padding: "3px 10px", borderRadius: 10 }}>{metric}</div>
    </div>
  );
};

const Loops = () => (
  <section style={{ padding: "36px 0" }}>
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px" }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", textAlign: "center", marginBottom: 18, fontSize: 22 }}>🔄 Retention Loops — Why They Keep Coming Back</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {loopCards.map((c) => <LoopCard key={c.title} {...c} />)}
      </div>
    </div>
  </section>
);

/* ─── REVENUE ─── */
const revenueRows = [
  { segment: "Free Tier (ambient pets)", users: "25,000", arpu: "₹0", revenue: "₹0 (funnel)", notes: "Gateway. 40% of total users. Feed into paid via endowment effect" },
  { segment: "À la carte (₹99-299/pet)", users: "4,500", arpu: "₹140/mo avg", revenue: "₹75.6 Lakh", notes: "7.2% conversion. Avg 1.3 pets purchased. Loss aversion from trial" },
  { segment: "Pet Paradise (₹299/mo)", users: "2,200", arpu: "₹299/mo", revenue: "₹78.9 Lakh", notes: "3.5% conversion. High LTV. 8-month avg retention" },
  { segment: "Rx-Prescribed (therapist pathway)", users: "1,800", arpu: "₹150/mo avg", revenue: "₹32.4 Lakh", notes: "Included in therapy cost or separate ₹99 add-on. High compliance" },
  { segment: "One-time Purchases (₹199-499)", users: "3,000", arpu: "₹280 once", revenue: "₹8.4 Lakh", notes: 'Users who want to "own" their pet. Zero recurring cost' },
];

const tdStyle = { padding: "10px 14px", fontSize: 12.5, color: tokens.slate3, borderTop: `1px solid ${tokens.stoneLighter}` };

const Revenue = () => (
  <section style={{ padding: "36px 0", background: tokens.stoneBg }}>
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px" }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", textAlign: "center", marginBottom: 18, fontSize: 22 }}>📊 Revenue Projection — Year 1</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${tokens.stoneLighter}`, background: tokens.white }}>
          <thead>
            <tr>{["Segment","Users (Mo 12)","ARPU","Annual Revenue","Notes"].map((h) => (
              <th key={h} style={{ background: tokens.violetLight, color: tokens.violet, fontSize: 11, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", padding: "10px 14px", textAlign: "left" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {revenueRows.map((r) => (
              <tr key={r.segment}>
                <td style={tdStyle}><strong>{r.segment}</strong></td>
                <td style={tdStyle}>{r.users}</td>
                <td style={tdStyle}>{r.arpu}</td>
                <td style={tdStyle}>{r.revenue}</td>
                <td style={tdStyle}>{r.notes}</td>
              </tr>
            ))}
            <tr>
              {["TOTAL YEAR 1","36,500 users","—","₹1.95 Crore","62% margin (low infra cost, one-time pet design)"].map((v, i) => (
                <td key={i} style={{ ...tdStyle, fontWeight: 700, color: tokens.violet, background: tokens.violetLight, fontSize: 13 }}>{v}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16, padding: 16, background: tokens.white, borderRadius: 14, border: `1px solid ${tokens.stoneLighter}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: tokens.slate, marginBottom: 8 }}>📈 How Digital Pets compares to other MANAS360 revenue streams:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: tokens.slate3 }}>
          {[
            { e: "🎵", l: "Sound Therapy", v: "₹4.7 Cr/yr", c: tokens.teal },
            { e: "🐾", l: "Digital Pets", v: "₹1.95 Cr/yr", c: tokens.violet },
            { e: "🤖", l: "AnytimeBuddy", v: "₹12-27 Cr/yr", c: tokens.gold },
            { e: "📱", l: "Therapy Sessions", v: "₹7+ Cr/yr", c: tokens.green },
          ].map((x) => <div key={x.l}>{x.e} {x.l}: <strong style={{ color: x.c }}>{x.v}</strong></div>)}
        </div>
      </div>
    </div>
  </section>
);

/* ─── ARCHITECTURE ─── */
const archSteps = [
  { icon: "🎬", bg: tokens.violetLight, color: tokens.violet, title: "Hero: Avatar Video Pitch (82s)", desc: 'Auto-plays on landing. "When was the last time someone was genuinely happy to see you?" Your HeyGen video.' },
  { icon: "🧬", bg: tokens.greenBg, color: tokens.green, title: "Science Strip: 4 Neurochemicals", desc: "Oxytocin, Serotonin, Dopamine, Endorphins — credibility + permission." },
  { icon: "🐾", bg: tokens.goldLight, color: tokens.gold, title: "Pet Catalog: 3 Tiers (10 species)", desc: "Swipeable cards. Free tier → Interactive → AI Companion. Each shows therapeutic purpose." },
  { icon: "💰", bg: tokens.amberLight, color: tokens.amber, title: "Pricing: Free / Per Pet / Paradise", desc: "Hybrid model. Decoy effect. Smart upsell triggers. PhonePe payment." },
  { icon: "❤️", bg: tokens.roseLight, color: tokens.rose, title: 'Emotional Close: "They\'re already waiting"', desc: 'CTA button: "Meet Your Companion →" with animated pet peek-in from side of screen.' },
];

const Architecture = () => (
  <section style={{ padding: "36px 0" }}>
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px" }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", textAlign: "center", marginBottom: 18, fontSize: 22 }}>🏗️ Digital Pet Hub — Landing Page Architecture</h2>
      <div style={{ background: tokens.white, border: `1px solid ${tokens.stoneLighter}`, borderRadius: 16, padding: 24, maxWidth: 700, margin: "0 auto" }}>
        <div style={{ fontSize: 11, color: tokens.stone, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Screen Flow: PT06</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {archSteps.map((s) => (
            <div key={s.title} style={{ padding: "10px 14px", background: s.bg, borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.title}</div>
                <div style={{ fontSize: 11, color: tokens.slate4 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

/* ─── FOOTER ─── */
const Footer = () => (
  <footer style={{ padding: "24px 0", borderTop: `1px solid ${tokens.stoneLighter}`, textAlign: "center" }}>
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px" }}>
      <p style={{ fontFamily: "'Fraunces',serif", fontSize: 16, fontWeight: 700, color: tokens.tealDeep }}>MANAS<span style={{ color: tokens.gold }}>360</span></p>
      <p style={{ fontSize: 11, color: tokens.stone, marginTop: 4 }}>Digital Pet Hub — PT06 Strategy & Product Architecture</p>
      <p style={{ fontSize: 11, color: tokens.stone, marginTop: 2 }}>Oxytocin Engine: "Your brain doesn't care if connection has fur or pixels. It only cares if it's <em>felt</em>."</p>
    </div>
  </footer>
);

/* ─── ROOT ─── */
export default function DigitalPetHub() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,800;1,9..144,400&family=Outfit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes glow {
          0%,100% { box-shadow: 0 0 15px rgba(124,58,237,.15); }
          50% { box-shadow: 0 0 30px rgba(124,58,237,.25); }
        }
      `}</style>
      <div style={{ fontFamily: "'Outfit', sans-serif", background: "#fff", color: tokens.slate, lineHeight: 1.6 }}>
        <Nav />
        <Hero />
        <ScienceStrip />
        <Pathways />
        <PetCatalog />
        <Monetization />
        <Schedule />
        <Loops />
        <Revenue />
        <Architecture />
        <Footer />
      </div>
    </>
  );
}