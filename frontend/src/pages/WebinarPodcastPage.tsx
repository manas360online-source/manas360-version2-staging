import React, { useMemo, useState } from "react";

type FilterKey =
  | "all"
  | "live"
  | "anxiety"
  | "depression"
  | "couples"
  | "workplace"
  | "students"
  | "addiction"
  | "trauma"
  | "parenting";

type WebinarTile = {
  id: string;
  topic: Exclude<FilterKey, "all" | "live">;
  status: "live" | "soon";
  color: string;
  emoji: string;
  title: string;
  format: string;
  audience: Array<{ label: string; className: string }>;
  tagline: string;
  impactLabel: string;
  impactDirection: "down" | "up";
  neuro: string;
  meta: string[];
  cta: "watch" | "notify";
};

const filterChips: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "live", label: "🔴 Live" },
  { key: "anxiety", label: "Anxiety" },
  { key: "depression", label: "Depression" },
  { key: "couples", label: "Couples" },
  { key: "workplace", label: "Workplace" },
  { key: "students", label: "Students" },
  { key: "addiction", label: "Addiction" },
  { key: "trauma", label: "Trauma" },
  { key: "parenting", label: "Parenting" }
];

const webinarTiles: WebinarTile[] = [
  {
    id: "anxiety",
    topic: "anxiety",
    status: "live",
    color: "#3B82F6",
    emoji: "😰",
    title: "Anxiety: Quick Fixes That Actually Work",
    format: "🎙️ Webinar · 45 min",
    audience: [{ label: "Everyone", className: "everyone" }],
    tagline: "5-4-3-2-1 grounding, box breathing, and cognitive tools you can use tonight. The 3-second reset that rewires panic.",
    impactLabel: "Panic Attacks",
    impactDirection: "down",
    neuro: "GABA Activator",
    meta: ["🌐 English", "👁️ 847 watching", "⏱️ Started 18 min ago"],
    cta: "watch"
  },
  {
    id: "depression",
    topic: "depression",
    status: "soon",
    color: "#D4A017",
    emoji: "🌧️",
    title: "Depression: The Silent Weight",
    format: "🎙️ Webinar · 45 min",
    audience: [
      { label: "Everyone", className: "everyone" },
      { label: "Caregivers", className: "caregivers" }
    ],
    tagline: "Understanding the fog, naming the pain, and 5 things you can do today. The Sunday Test — if you dread Monday, this is for you.",
    impactLabel: "Hopelessness",
    impactDirection: "down",
    neuro: "Serotonin Boost",
    meta: ["🌐 English", "⏱️ 45 min"],
    cta: "notify"
  },
  {
    id: "workplace",
    topic: "workplace",
    status: "soon",
    color: "#EA580C",
    emoji: "🏢",
    title: "Toxic Workplace: Thrive, Not Buckle",
    format: "🎙️ Webinar · 45 min",
    audience: [{ label: "Corporate", className: "corporate" }],
    tagline: "The Sunday Evening Test — 45% feel anxiety before Monday. POSH, OSH, boundaries, and the 4-step detox from toxicity.",
    impactLabel: "Burnout",
    impactDirection: "down",
    neuro: "Cortisol Reducer",
    meta: ["🌐 English", "⏱️ 45 min"],
    cta: "notify"
  },
  {
    id: "couples",
    topic: "couples",
    status: "soon",
    color: "#E53E6B",
    emoji: "💔",
    title: "Couples: When the Spark Dies",
    format: "🎙️ Podcast · 40 min",
    audience: [{ label: "Couples", className: "couples" }],
    tagline: "When romance became routine. The 4 horsemen of relationship death, Gottman's repair toolkit, and rebuilding from ashes.",
    impactLabel: "Connection",
    impactDirection: "up",
    neuro: "Oxytocin Enhancer",
    meta: ["🌐 English", "⏱️ 40 min"],
    cta: "notify"
  },
  {
    id: "students",
    topic: "students",
    status: "soon",
    color: "#06B6D4",
    emoji: "📚",
    title: "Exam Stress: Battle Half Won",
    format: "🎙️ Webinar · 45 min",
    audience: [
      { label: "Students", className: "students" },
      { label: "Parents", className: "parents" }
    ],
    tagline: "2-Minute Morning Visualization, cognitive reframing flips, and \"If You Overthink — Overthink Positive.\" For JEE/NEET/CUET aspirants.",
    impactLabel: "Focus & Clarity",
    impactDirection: "up",
    neuro: "Dopamine Enhancer",
    meta: ["🌐 English", "⏱️ 45 min"],
    cta: "notify"
  },
  {
    id: "ivf",
    topic: "parenting",
    status: "soon",
    color: "#0D9488",
    emoji: "🌱",
    title: "IVF Journey: You Are More Than Fertility",
    format: "🎙️ Podcast · 45 min",
    audience: [
      { label: "Couples", className: "couples" },
      { label: "Women", className: "women" }
    ],
    tagline: "The menstrual cycle of hope and despair. Your worth is not measured by a pregnancy test. Gendered shame and breaking the silence.",
    impactLabel: "Self-Worth",
    impactDirection: "up",
    neuro: "Oxytocin Enhancer",
    meta: ["🌐 English", "⏱️ 45 min"],
    cta: "notify"
  },
  {
    id: "trauma",
    topic: "trauma",
    status: "soon",
    color: "#7C3AED",
    emoji: "🕊️",
    title: "Trauma & PTSD: Your Body Remembers",
    format: "🎙️ Webinar · 45 min",
    audience: [{ label: "Everyone", className: "everyone" }],
    tagline: "Flashback grounding, the window of tolerance, and why \"just forget it\" is the worst advice. Body-based healing approaches.",
    impactLabel: "Flashbacks",
    impactDirection: "down",
    neuro: "GABA Activator",
    meta: ["🌐 English", "⏱️ 45 min"],
    cta: "notify"
  },
  {
    id: "eating",
    topic: "addiction",
    status: "soon",
    color: "#F43F5E",
    emoji: "🍽️",
    title: "Eating Disorders: Food ≠ Love",
    format: "🎙️ Podcast · 40 min",
    audience: [
      { label: "Women", className: "women" },
      { label: "Parents", className: "parents" }
    ],
    tagline: "Breaking the Indian family pattern where every emotion is fed, not felt. Binge-restrict cycles and the mirror that lies.",
    impactLabel: "Body Acceptance",
    impactDirection: "up",
    neuro: "Serotonin Boost",
    meta: ["🌐 English", "⏱️ 40 min"],
    cta: "notify"
  },
  {
    id: "digital",
    topic: "addiction",
    status: "soon",
    color: "#EF4444",
    emoji: "📱",
    title: "Digital Addiction: Peaceful ≠ Healthy",
    format: "🎙️ Webinar · 45 min",
    audience: [
      { label: "Parents", className: "parents" },
      { label: "GenZ", className: "students" }
    ],
    tagline: "When the screen is a babysitter. Dopamine hijacking, the 20-min rule, and reclaiming real life for families and young adults.",
    impactLabel: "Screen Time",
    impactDirection: "down",
    neuro: "Dopamine Rebalance",
    meta: ["🌐 English", "⏱️ 45 min"],
    cta: "notify"
  },
  {
    id: "bipolar",
    topic: "depression",
    status: "soon",
    color: "#A855F7",
    emoji: "🎭",
    title: "Bipolar: The Medication Trap",
    format: "🎙️ Webinar · 45 min",
    audience: [
      { label: "Caregivers", className: "caregivers" },
      { label: "Everyone", className: "everyone" }
    ],
    tagline: "Why \"I feel great\" can be dangerous. Understanding mania vs depression, medication myths, and caregiver burnout prevention.",
    impactLabel: "Stability",
    impactDirection: "up",
    neuro: "Norepinephrine Balance",
    meta: ["🌐 English", "⏱️ 45 min"],
    cta: "notify"
  }
];

const WebinarPodcastPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const visibleTiles = useMemo(() => {
    if (activeFilter === "all") return webinarTiles;
    if (activeFilter === "live") return webinarTiles.filter((tile) => tile.status === "live");
    return webinarTiles.filter((tile) => tile.topic === activeFilter);
  }, [activeFilter]);

  const watchNow = () => {
    window.open("https://youtube.com/@MANAS360MentalWellness", "_blank", "noopener,noreferrer");
  };

  const notifyMe = (id: string) => {
    const msg = encodeURIComponent(`Hi MANAS360, please notify me when the ${id} webinar goes live · Source: WebinarLanding`);
    window.open(`https://wa.me/918867736009?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0F1724", color: "#E8EDF2", fontFamily: "\"DM Sans\", sans-serif" }}>
      <nav
        style={{
          background: "rgba(15,23,36,.96)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #1A2538",
          padding: "12px 20px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div>
          <span style={{ fontFamily: "\"Outfit\", sans-serif", fontSize: "18px", fontWeight: 800, color: "#E8EDF2" }}>
            MANAS<span style={{ color: "#B8D44F" }}>360</span>
          </span>
          <span style={{ fontSize: "11px", color: "#666680", marginLeft: "8px", fontWeight: 500 }}>Webinars & Podcasts</span>
        </div>
        <a
          href="/landing"
          style={{
            padding: "8px 14px",
            borderRadius: "999px",
            border: "1px solid #2A3548",
            color: "#E8EDF2",
            textDecoration: "none",
            fontSize: "12px",
            fontWeight: 700,
            background: "transparent"
          }}
        >
          Back Home
        </a>
      </nav>

      <section
        style={{
          background: "linear-gradient(160deg,#001A4D 0%,#002365 40%,#0A3A5F 70%,#0F1724 100%)",
          padding: "40px 20px 32px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#B8D44F", marginBottom: "10px", position: "relative", zIndex: 2 }}>
          Learn · Heal · Grow
        </div>
        <h1 style={{ fontFamily: "\"Outfit\", sans-serif", fontSize: "clamp(24px,4.5vw,38px)", fontWeight: 800, lineHeight: 1.12, marginBottom: "10px", position: "relative", zIndex: 2 }}>
          Webinars & <span style={{ color: "#B8D44F" }}>Podcasts</span>
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,.55)", maxWidth: "480px", margin: "0 auto 20px", lineHeight: 1.5, position: "relative", zIndex: 2 }}>
          Free expert sessions on mental health topics that matter. Watch live or catch the replay. Currently in English. Hindi, Kannada — coming soon.
        </p>
        <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", position: "relative", zIndex: 2 }}>
          {[
            { num: "10", label: "Topics" },
            { num: "Free", label: "Always" },
            { num: "45 min", label: "Each Session" },
            { num: "5", label: "Languages Hindi · English · Tamil · Telugu · Kannada" }
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "\"Outfit\", sans-serif", fontSize: "20px", fontWeight: 800, color: "#B8D44F" }}>{stat.num}</div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".6px", maxWidth: "110px" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div
        style={{
          display: "flex",
          gap: "6px",
          padding: "12px 16px",
          overflowX: "auto",
          background: "#0F1724",
          borderBottom: "1px solid #1A2538",
          position: "sticky",
          top: "53px",
          zIndex: 90,
          scrollbarWidth: "none"
        }}
      >
        {filterChips.map((chip) => {
          const active = activeFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveFilter(chip.key)}
              style={{
                padding: "7px 14px",
                borderRadius: "20px",
                border: active ? "1px solid #002365" : "1px solid #2A3548",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                background: active ? "#002365" : "transparent",
                color: active ? "#fff" : "#8899AA",
                whiteSpace: "nowrap",
                flexShrink: 0
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          margin: "14px 16px 0",
          padding: "12px 16px",
          background: "linear-gradient(135deg,rgba(239,68,68,.1),rgba(239,68,68,.03))",
          border: "1px solid rgba(239,68,68,.2)",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap"
        }}
      >
        <div style={{ width: "8px", height: "8px", background: "#EF4444", borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#F87171" }}>TRENDING LIVE — Anxiety: Quick Fixes That Actually Work</div>
          <div style={{ fontSize: "10px", color: "#666680", marginTop: "1px" }}>847 watching · Started 18 min ago</div>
        </div>
        <button
          type="button"
          onClick={watchNow}
          style={{ padding: "7px 16px", background: "#EF4444", borderRadius: "8px", fontSize: "11px", fontWeight: 700, color: "#fff", cursor: "pointer", border: "none", whiteSpace: "nowrap" }}
        >
          WATCH NOW
        </button>
      </div>

      <section style={{ padding: "18px 16px" }}>
        <div style={{ fontFamily: "\"Outfit\", sans-serif", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "#4A90D9", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>All Sessions</span>
          <span style={{ flex: 1, height: "1px", background: "#1A2538" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "12px" }}>
          {visibleTiles.map((tile) => (
            <div
              key={tile.id}
              style={{
                background: "#1A2538",
                borderRadius: "14px",
                border: "1px solid #2A3548",
                overflow: "hidden",
                position: "relative"
              }}
            >
              <div style={{ height: "3px", background: tile.color }} />
              <div style={{ padding: "16px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div style={{ fontSize: "30px", lineHeight: 1, flexShrink: 0 }}>{tile.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "\"Outfit\", sans-serif", fontSize: "15px", fontWeight: 700, lineHeight: 1.25, marginBottom: "3px" }}>{tile.title}</div>
                    <div style={{ fontSize: "10px", color: "#666680", display: "flex", alignItems: "center", gap: "4px" }}>{tile.format}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-end", flexShrink: 0 }}>
                    {tile.audience.map((tag) => (
                      <span
                        key={`${tile.id}-${tag.label}`}
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "9px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: ".3px",
                          whiteSpace: "nowrap",
                          background:
                            tag.className === "everyone" ? "rgba(52,211,153,.1)" :
                            tag.className === "parents" ? "rgba(249,115,22,.1)" :
                            tag.className === "students" ? "rgba(6,182,212,.1)" :
                            tag.className === "couples" ? "rgba(229,62,107,.1)" :
                            tag.className === "women" ? "rgba(244,63,94,.1)" :
                            tag.className === "corporate" ? "rgba(234,88,12,.1)" :
                            "rgba(168,85,247,.1)",
                          color:
                            tag.className === "everyone" ? "#34D399" :
                            tag.className === "parents" ? "#FB923C" :
                            tag.className === "students" ? "#06B6D4" :
                            tag.className === "couples" ? "#E53E6B" :
                            tag.className === "women" ? "#F43F5E" :
                            tag.className === "corporate" ? "#EA580C" :
                            "#A855F7"
                        }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: "12px", color: "#8899AA", lineHeight: 1.4, marginBottom: "12px" }}>{tile.tagline}</div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 10px",
                      borderRadius: "8px",
                      fontSize: "10px",
                      fontWeight: 700,
                      background: tile.impactDirection === "down" ? "rgba(52,211,153,.08)" : "rgba(251,191,36,.08)",
                      color: tile.impactDirection === "down" ? "#34D399" : "#FBBF24"
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 800, lineHeight: 1 }}>{tile.impactDirection === "down" ? "↓" : "↑"}</span>
                    {tile.impactLabel}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "5px 10px",
                      borderRadius: "8px",
                      fontSize: "10px",
                      fontWeight: 600,
                      background: "rgba(168,85,247,.08)",
                      color: "#C084FC",
                      border: "1px solid rgba(168,85,247,.12)"
                    }}
                  >
                    <span style={{ fontSize: "12px" }}>🧬</span>
                    {tile.neuro}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {tile.meta.map((meta) => (
                    <div key={`${tile.id}-${meta}`} style={{ fontSize: "10px", color: "#666680", display: "flex", alignItems: "center", gap: "3px" }}>
                      {meta}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  {tile.status === "live" ? (
                    <span style={{ padding: "4px 10px", borderRadius: "8px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", background: "rgba(239,68,68,.15)", color: "#F87171" }}>
                      ● LIVE
                    </span>
                  ) : (
                    <a
                      href="/screening"
                      style={{ padding: "4px 10px", borderRadius: "8px", fontSize: "9px", fontWeight: 700, letterSpacing: ".4px", background: "rgba(184,212,79,.08)", color: "#B8D44F", textDecoration: "none" }}
                    >
                      Connect Me to a Specialist →
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => (tile.cta === "watch" ? watchNow() : notifyMe(tile.id))}
                    style={{
                      padding: "8px 16px",
                      border: tile.cta === "watch" ? "none" : "1px solid rgba(74,144,217,.2)",
                      borderRadius: "8px",
                      fontFamily: "\"DM Sans\", sans-serif",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      background: tile.cta === "watch" ? tile.color : "rgba(74,144,217,.1)",
                      color: tile.cta === "watch" ? "#fff" : "#4A90D9"
                    }}
                  >
                    {tile.cta === "watch" ? "WATCH NOW" : "🔔 NOTIFY ME"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ padding: "20px", textAlign: "center", borderTop: "1px solid #1A2538", marginTop: "8px" }}>
        <p style={{ fontSize: "11px", color: "#4A5568", lineHeight: 1.5, maxWidth: "480px", margin: "0 auto" }}>
          All webinars and podcasts are free, always. Recorded sessions available on demand after live broadcast.
          <br />
          Want to host a session? <a href="mailto:webinars@manas360.com" style={{ color: "#4A90D9", textDecoration: "none" }}>webinars@manas360.com</a>
          <br />
          <a href="https://manas360.com" style={{ color: "#4A90D9", textDecoration: "none" }}>manas360.com</a> · WhatsApp <a href="https://wa.me/918867736009" style={{ color: "#4A90D9", textDecoration: "none" }}>+91 8867736009</a>
        </p>
      </div>
    </div>
  );
};

export default WebinarPodcastPage;
