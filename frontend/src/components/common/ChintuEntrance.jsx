import { useEffect, useRef, useState, useCallback } from "react";

// ─────────────────────────────────────────────────
// CHINTU ENTRANCE — cinematic 2D loading sequence
// Drop-in replacement for the boring loading overlay.
//
// Usage in your Chintu.jsx:
//   import ChintuEntrance from './ChintuEntrance';
//   ...
//   {!showChintu && <ChintuEntrance isReady={isModelReady} />}
// ─────────────────────────────────────────────────

const BUBBLE_TEXTS = [
  "Dopamine spike! Let's gooo! 🔥",
  "You're unstoppable! ⭐",
  "Reward signal: ACTIVATED! 🧪",
  "Keep that momentum alive! 💪",
  "Neural pathways charged! 🧠",
];

const LOAD_TEXTS = [
  "Booting Chintu… 🦊",
  "Loading dopamine… 🧪",
  "Charging motivation… ⚡",
  "Almost ready! 🦊✨",
];

const FIRE   = ["#ff4800","#ff9100","#ffcd00","#FF8A65"];
const GOLDEN = ["#FFD600","#FF8A65","#fff","#ff9100"];
const PARTY  = ["#FFD600","#a78bfa","#FF8A65","#06b6d4","#fff"];
const CONFETTI_PAL = ["#FFD600","#FF8A65","#a78bfa","#06b6d4","#5dba3e","#fff"];

// ── Fox SVG (2D illustration) ──────────────────────
function FoxSVG({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 180"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%" }}
    >
      {/* TAIL */}
      <g id="fox-tail" style={{ transformOrigin: "20px 90px" }}>
        <path d="M 32 100 Q 0 70 10 40 Q 16 20 30 30 Q 42 40 38 65 Q 36 82 45 90 Z"
              fill="#E65100" stroke="#FF8A65" strokeWidth="1"/>
        <path d="M 10 40 Q 14 22 26 28 Q 36 34 32 52"
              fill="#FF8A65" opacity=".6"/>
        <ellipse cx="14" cy="36" rx="8" ry="10" fill="#fff" opacity=".9"
                 transform="rotate(-20,14,36)"/>
      </g>

      {/* BODY */}
      <ellipse cx="80" cy="105" rx="48" ry="32" fill="#E65100"/>
      <ellipse cx="90" cy="112" rx="22" ry="18" fill="#FFAB91" opacity=".8"/>

      {/* BACK LEGS */}
      <g style={{ transformOrigin: "30px 120px" }} id="fox-leg-bl">
        <rect x="26" y="120" width="12" height="32" rx="6" fill="#CC4400"/>
        <ellipse cx="32" cy="154" rx="10" ry="6" fill="#B83800"/>
      </g>
      <g style={{ transformOrigin: "46px 120px" }} id="fox-leg-br">
        <rect x="42" y="120" width="12" height="32" rx="6" fill="#CC4400"/>
        <ellipse cx="48" cy="154" rx="10" ry="6" fill="#B83800"/>
      </g>

      {/* HEAD */}
      <ellipse cx="115" cy="80" rx="34" ry="28" fill="#E65100"/>
      {/* Snout */}
      <ellipse cx="138" cy="88" rx="14" ry="10" fill="#FFAB91"/>
      {/* Nose */}
      <ellipse cx="148" cy="86" rx="5" ry="4" fill="#2D0A00"/>
      <ellipse cx="147" cy="84" rx="2" ry="1.5" fill="#fff" opacity=".7"/>
      {/* Eyes */}
      <circle cx="122" cy="73" r="7" fill="#1a0800"/>
      <circle cx="121" cy="72" r="2.5" fill="#fff"/>
      <circle cx="122" cy="73" r="1.2" fill="#1a0800"/>
      <circle cx="124" cy="70" r="1.8" fill="#fff" opacity=".9"/>
      {/* Brow */}
      <path d="M116 66 Q122 62 130 65" stroke="#CC4400" strokeWidth="2.5"
            fill="none" strokeLinecap="round"/>
      {/* Cheek blush */}
      <ellipse cx="131" cy="82" rx="7" ry="4" fill="#FF8A65" opacity=".4"/>
      {/* Mouth */}
      <path d="M140 90 Q144 93 140 94" stroke="#CC4400" strokeWidth="1.5"
            fill="none" strokeLinecap="round"/>

      {/* EARS */}
      <polygon points="100,58 90,30 115,50" fill="#E65100"/>
      <polygon points="102,56 94,36 113,50" fill="#FF8A65"/>
      <polygon points="126,54 120,26 140,48" fill="#E65100"/>
      <polygon points="127,52 122,32 137,48" fill="#FF8A65"/>
      <polygon points="103,55 96,38 110,50" fill="#FFD4C2" opacity=".6"/>
      <polygon points="128,51 124,34 135,47" fill="#FFD4C2" opacity=".6"/>

      {/* FRONT LEGS */}
      <g style={{ transformOrigin: "72px 120px" }} id="fox-leg-fl">
        <rect x="68" y="120" width="12" height="32" rx="6" fill="#CC4400"/>
        <ellipse cx="74" cy="154" rx="10" ry="6" fill="#B83800"/>
      </g>
      <g style={{ transformOrigin: "88px 120px" }} id="fox-leg-fr">
        <rect x="84" y="120" width="12" height="32" rx="6" fill="#CC4400"/>
        <ellipse cx="90" cy="154" rx="10" ry="6" fill="#B83800"/>
      </g>

      {/* Paw dots */}
      <circle cx="74" cy="158" r="2" fill="#8B2500" opacity=".6"/>
      <circle cx="90" cy="158" r="2" fill="#8B2500" opacity=".6"/>

      {/* SCARF */}
      <path d="M88 100 Q115 94 140 100 Q135 108 115 108 Q92 110 88 100Z"
            fill="#FF3D00" opacity=".85"/>
      <path d="M108 100 Q115 96 124 100" stroke="#FFD600" strokeWidth="1.5"
            fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// ── Main component ─────────────────────────────────
export default function ChintuEntrance({ isReady }) {
  const stageRef   = useRef(null);
  const canvasRef  = useRef(null);
  const foxRef     = useRef(null);
  const rafRef     = useRef(null);
  const timers     = useRef([]);

  const [phase, setPhase]          = useState("run");   // run | idle | exit
  const [titleShow, setTitleShow]  = useState(false);
  const [bubbleShow, setBubbleShow] = useState(false);
  const [bubbleText, setBubbleText] = useState(BUBBLE_TEXTS[0]);
  const [barsShow, setBarsShow]    = useState(false);
  const [barDp, setBarDp]          = useState(0);
  const [barFocus, setBarFocus]    = useState(0);
  const [barEnergy, setBarEnergy]  = useState(0);
  const [loadShow, setLoadShow]    = useState(false);
  const [loadPct, setLoadPct]      = useState(0);
  const [loadText, setLoadText]    = useState(LOAD_TEXTS[0]);
  const [taglineShow, setTaglineShow] = useState(false);
  const [exitGo, setExitGo]        = useState(false);
  const [exitDone, setExitDone]    = useState(false);
  const [auras, setAuras]          = useState([]);
  const [stars]  = useState(() => Array.from({length: 60}, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top:  Math.random() * 65,
    size: Math.random() * 2.5 + 0.5,
    dur:  2 + Math.random() * 4,
    delay: -Math.random() * 4,
  })));

  const particles = useRef([]);

  // ── helper: schedule ─
  const after = useCallback((ms, fn) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  // ── particle burst ─
  const burst = useCallback((x, y, count, colors, big) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = big ? 3 + Math.random() * 7 : 1.5 + Math.random() * 4;
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (big ? 3 : 1.5),
        alpha: 1,
        size: (big ? 4 : 2) + Math.random() * (big ? 5 : 3),
        color: colors[Math.floor(Math.random() * colors.length)],
        glow: big ? 18 : 8,
      });
    }
  }, []);

  const burstConfetti = useCallback((x, y, count) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - .5) * 8,
        vy: -2 - Math.random() * 6,
        alpha: 1, size: 0,
        w: 5 + Math.random() * 8, h: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2, rotV: (Math.random() - .5) * .25,
        color: CONFETTI_PAL[Math.floor(Math.random() * CONFETTI_PAL.length)],
        isConfetti: true,
      });
    }
  }, []);

  // ── trail while running ─
  const trailRef = useRef(null);
  const startTrail = useCallback(() => {
    trailRef.current = setInterval(() => {
      const fox = foxRef.current;
      const stage = stageRef.current;
      if (!fox || !stage) return;
      const fr = fox.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      const cx = fr.left - sr.left + fr.width * .2;
      const cy = fr.top  - sr.top  + fr.height * .6;
      for (let i = 0; i < 3; i++) {
        particles.current.push({
          x: cx + (Math.random() - .5) * 20,
          y: cy + (Math.random() - .5) * 10,
          vx: -2 - Math.random() * 3,
          vy: (Math.random() - .5) * 2,
          alpha: .7, size: 3 + Math.random() * 4,
          color: FIRE[Math.floor(Math.random() * FIRE.length)],
          glow: 10,
        });
      }
    }, 60);
  }, []);
  const stopTrail = useCallback(() => clearInterval(trailRef.current), []);

  // ── aura rings ─
  let auraId = useRef(0);
  const spawnAura = useCallback((x, y, color, size) => {
    const id = ++auraId.current;
    setAuras(prev => [...prev, { id, x, y, color, size }]);
    after(2100, () => setAuras(prev => prev.filter(a => a.id !== id)));
  }, [after]);

  // ── fox center coords ─
  const foxCenter = useCallback(() => {
    const fox = foxRef.current;
    const stage = stageRef.current;
    if (!fox || !stage) return { cx: 400, cy: 280 };
    const fr = fox.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    return {
      cx: fr.left - sr.left + fr.width * .5,
      cy: fr.top  - sr.top  + fr.height * .5,
    };
  }, []);

  // ── particle render loop ─
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resize() {
      const stage = stageRef.current;
      if (!stage) return;
      canvas.width  = stage.offsetWidth;
      canvas.height = stage.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.filter(p => p.alpha > .03);
      particles.current.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += .1;  p.vx *= .97;
        p.alpha *= p.isConfetti ? .986 : .93;
        if (p.isConfetti) {
          p.rot += p.rotV;
          ctx.save(); ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
          ctx.restore();
        } else {
          p.size *= .97;
          ctx.save(); ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = p.glow; ctx.shadowColor = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.1, p.size), 0, Math.PI*2);
          ctx.fill(); ctx.restore();
        }
      });
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ── SEQUENCE ─────────────────────────────────────
  let bubbleTimerRef = useRef(null);
  let loadTimerRef   = useRef(null);
  let auraLoopRef    = useRef(null);
  let bubbleIdx      = useRef(0);
  let loadIdx        = useRef(0);

  useEffect(() => {
    // ── bubble cycling
    function cycleBubble() {
      setBubbleShow(false);
      after(300, () => {
        bubbleIdx.current = (bubbleIdx.current + 1) % BUBBLE_TEXTS.length;
        setBubbleText(BUBBLE_TEXTS[bubbleIdx.current]);
        setBubbleShow(true);
        bubbleTimerRef.current = after(2200, cycleBubble);
      });
    }

    // ── load text cycling
    function cycleLoad() {
      loadIdx.current = (loadIdx.current + 1) % LOAD_TEXTS.length;
      setLoadText(LOAD_TEXTS[loadIdx.current]);
      loadTimerRef.current = after(900, cycleLoad);
    }

    // ── idle aura loop
    function idleAuras() {
      const { cx, cy } = foxCenter();
      spawnAura(cx, cy - 60,
        auraId.current % 2 === 0 ? "#E65100" : "#FFD600",
        120 + (auraId.current % 3) * 40
      );
      auraLoopRef.current = after(1400, idleAuras);
    }

    // START
    startTrail();

    // 1.2s — title
    after(1200, () => setTitleShow(true));

    // 1.8s — bars
    after(1800, () => {
      setBarsShow(true);
      after(100, () => setBarDp(72));
      after(200, () => setBarFocus(58));
      after(300, () => setBarEnergy(84));
    });

    // 2.2s — arrival burst
    after(2200, () => {
      stopTrail();
      const { cx, cy } = foxCenter();
      burst(cx, cy, 60, GOLDEN, true);
      spawnAura(cx, cy, "#E65100", 220);
      after(250, () => spawnAura(cx, cy, "#FFD600", 160));
    });

    // 2.4s — bubble
    after(2400, () => {
      setBubbleShow(true);
      bubbleTimerRef.current = after(2200, cycleBubble);
    });

    // 2.8s — JUMP
    after(2800, () => {
      setPhase("jump");
      after(350, () => {
        const { cx, cy } = foxCenter();
        burst(cx, cy, 80, PARTY, true);
        burstConfetti(cx, cy - 80, 60);
        spawnAura(cx, cy, "#FFD600", 280);
      });
    });

    // 3.9s — IDLE landing
    after(3900, () => {
      setPhase("idle");
      const { cx, cy } = foxCenter();
      burst(cx, cy, 50, ["#5dba3e","#FFD600","#FF8A65","#fff"], true);
      spawnAura(cx, cy, "#5dba3e", 200);
    });

    // 4.3s — load bar + tagline
    after(4300, () => {
      setLoadShow(true);
      after(100, () => setLoadPct(100));
      cycleLoad();
      after(600, () => setTaglineShow(true));
    });

    // 4.6s — idle aura loop
    after(4600, idleAuras);

    // 7.8s — final burst
    after(7800, () => {
      clearTimeout(bubbleTimerRef.current);
      clearTimeout(loadTimerRef.current);
      clearTimeout(auraLoopRef.current);
      setBubbleShow(false);
      setLoadText("🦊 Chintu is Ready!");
      const { cx, cy } = foxCenter();
      burst(cx, cy, 120, PARTY, true);
      burstConfetti(cx - 200, 60, 80);
      burstConfetti(cx + 200, 60, 80);
      spawnAura(cx, cy, "#FFD600", 360);
      spawnAura(cx, cy, "#E65100", 260);
    });

    // 9.2s — exit wipe
    after(9200, () => setExitGo(true));
    after(10000, () => setExitDone(true));

    return () => {
      timers.current.forEach(clearTimeout);
      clearTimeout(bubbleTimerRef.current);
      clearTimeout(loadTimerRef.current);
      clearTimeout(auraLoopRef.current);
      stopTrail();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (exitDone) return null;

  // ── Phase → CSS classes ──────────────────────────
  const foxWrapStyle = {
    position:   "absolute",
    width:      "180px",
    height:     "180px",
    zIndex:     10,
  };
  const foxSvgStyle = {};

  // We apply animation via keyframe injection
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,700;1,300&display=swap');

        .ch-stage {
          position: fixed; inset: 0;
          background: #0a0604;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
          z-index: 9999;
        }

        /* STARS */
        .ch-star {
          position: absolute; border-radius: 50%; background: #fff;
          animation: ch-twinkle var(--d) ease-in-out infinite var(--dl);
        }
        @keyframes ch-twinkle {
          0%,100%{opacity:.15;transform:scale(1)}
          50%{opacity:.9;transform:scale(1.4)}
        }

        /* GROUND */
        .ch-ground {
          position: absolute; bottom: 0; left: 0; right: 0; height: 120px;
          background: linear-gradient(180deg,transparent 0%,#1a0c02 40%,#0a0604 100%);
        }
        .ch-ground-line {
          position: absolute; bottom: 96px; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg,transparent,#E65100 20%,#FFD600 50%,#E65100 80%,transparent);
          box-shadow: 0 0 20px #E65100; opacity: .5;
        }

        /* NEURONS */
        .ch-neuron {
          position: absolute; border-radius: 50%;
          animation: ch-floatN var(--dur) ease-in-out infinite var(--del);
          opacity: .5;
        }
        @keyframes ch-floatN {
          0%,100%{transform:translateY(0) scale(1);opacity:.3}
          50%{transform:translateY(-18px) scale(1.2);opacity:.8}
        }

        /* AURA RINGS */
        .ch-aura {
          position: absolute; border-radius: 50%; border: 1.5px solid;
          pointer-events: none; opacity: 0;
          animation: ch-auraExp 2s ease-out forwards;
        }
        @keyframes ch-auraExp {
          0%{opacity:.8;transform:scale(.15)}
          100%{opacity:0;transform:scale(1)}
        }

        /* FOX RUN */
        .ch-fox-run {
          animation: ch-foxRun 1.6s cubic-bezier(.25,.46,.45,.94) forwards;
          animation-delay: .4s;
          bottom: 90px; left: -200px;
        }
        @keyframes ch-foxRun {
          0%  {left:-200px}
          70% {left:calc(50% - 90px)}
          85% {left:calc(50% - 100px)}
          100%{left:calc(50% - 90px)}
        }

        /* FOX BOB */
        @keyframes ch-foxBob {
          0%{transform:translateY(0) rotate(-.5deg)}
          100%{transform:translateY(-6px) rotate(.5deg)}
        }
        .ch-svg-run {
          animation: ch-foxBob .35s ease-in-out infinite alternate;
        }

        /* LEG ANIMATIONS WHEN RUNNING */
        .ch-fox-run #fox-leg-fl { animation: ch-legA .18s linear infinite alternate; transform-origin:72px 120px; }
        .ch-fox-run #fox-leg-fr { animation: ch-legB .18s linear infinite alternate; transform-origin:88px 120px; }
        .ch-fox-run #fox-leg-bl { animation: ch-legC .18s linear infinite alternate; transform-origin:30px 120px; }
        .ch-fox-run #fox-leg-br { animation: ch-legD .18s linear infinite alternate; transform-origin:46px 120px; }
        .ch-fox-run #fox-tail   { animation: ch-tailR .25s ease-in-out infinite alternate; transform-origin:20px 90px; }
        @keyframes ch-legA {0%{transform:rotate(-25deg)}100%{transform:rotate(25deg)}}
        @keyframes ch-legB {0%{transform:rotate(25deg)} 100%{transform:rotate(-25deg)}}
        @keyframes ch-legC {0%{transform:rotate(20deg)} 100%{transform:rotate(-20deg)}}
        @keyframes ch-legD {0%{transform:rotate(-20deg)}100%{transform:rotate(20deg)}}
        @keyframes ch-tailR {0%{transform:rotate(-15deg)}100%{transform:rotate(10deg)}}

        /* FOX JUMP */
        .ch-fox-jump {
          animation: ch-foxJump 1.1s cubic-bezier(.22,.61,.36,1) forwards !important;
          bottom: 90px; left: calc(50% - 90px);
        }
        @keyframes ch-foxJump {
          0%  {bottom:90px; left:calc(50% - 90px); transform:rotate(0)}
          30% {bottom:260px;left:calc(50% + 10px);  transform:rotate(360deg) scale(1.1)}
          60% {bottom:90px; left:calc(50% + 80px);  transform:rotate(720deg) scale(1)}
          80% {bottom:50px; left:calc(50% + 68px)}
          100%{bottom:90px; left:calc(50% - 90px);  transform:rotate(720deg)}
        }

        /* FOX IDLE */
        .ch-fox-idle {
          left: calc(50% - 90px) !important;
          animation: ch-foxIdle 2.5s ease-in-out infinite !important;
          bottom: 90px;
        }
        @keyframes ch-foxIdle {
          0%,100%{transform:scale(1) rotate(0);bottom:90px}
          50%{transform:scale(1.02) rotate(.3deg);bottom:97px}
        }
        .ch-fox-idle #fox-leg-fl,
        .ch-fox-idle #fox-leg-fr,
        .ch-fox-idle #fox-leg-bl,
        .ch-fox-idle #fox-leg-br { animation: none; transform: none; }
        .ch-fox-idle #fox-tail { animation:ch-tailSlow 1s ease-in-out infinite alternate; transform-origin:20px 90px; }
        @keyframes ch-tailSlow {0%{transform:rotate(-8deg)}100%{transform:rotate(12deg)}}

        /* TITLE */
        .ch-title {
          position: absolute; top: 60px; left: 0; right: 0;
          text-align: center;
          opacity: 0; transform: translateY(-30px);
          transition: opacity .8s, transform .8s;
        }
        .ch-title.show { opacity: 1; transform: translateY(0); }
        .ch-title h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(2rem, 5vw, 3.2rem);
          font-weight: 900; letter-spacing: -1px;
          background: linear-gradient(135deg,#FF8A65,#FFD600,#FF8A65);
          background-size: 200%;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: ch-shimText 2s ease-in-out infinite;
        }
        @keyframes ch-shimText {
          0%,100%{background-position:0% center}
          50%{background-position:200% center}
        }
        .ch-title p {
          font-size: .72rem; font-weight: 300; color: #7A6A5A;
          letter-spacing: 4px; text-transform: uppercase; margin-top: 5px;
        }
        .ch-title small {
          display:block; font-size:.62rem; color:rgba(255,214,0,.5);
          letter-spacing:2px; text-transform:uppercase; margin-top:4px;
        }

        /* SPEECH BUBBLE */
        .ch-bubble {
          position: absolute; top: 158px; left: 50%;
          transform: translateX(-10%);
          background: rgba(20,12,4,.92);
          border: 1px solid #E65100; border-radius: 14px;
          padding: 9px 15px;
          font-family: 'Syne', sans-serif; font-size: .8rem; font-weight: 700;
          color: #FFD600; white-space: nowrap;
          opacity: 0; transition: opacity .35s, transform .35s;
          box-shadow: 0 0 20px rgba(230,81,0,.25); z-index: 30;
        }
        .ch-bubble::before {
          content: ''; position: absolute; bottom: -9px; left: 20px;
          border: 5px solid transparent; border-top-color: #E65100;
        }
        .ch-bubble.show { opacity: 1; transform: translateX(-10%) translateY(-4px); }

        /* DP BARS */
        .ch-bars {
          position: absolute; right: 32px; top: 50%; transform: translateY(-50%);
          display: flex; flex-direction: column; gap: 10px;
          opacity: 0; transition: opacity .8s;
        }
        .ch-bars.show { opacity: 1; }
        .ch-bar-row { display: flex; align-items: center; gap: 10px; }
        .ch-bar-lbl {
          font-size:.58rem; letter-spacing:2px; text-transform:uppercase;
          color:#5A4A3A; font-family:'Syne',sans-serif; font-weight:700;
          width:58px; text-align:right;
        }
        .ch-bar-track {
          width:80px; height:5px; background:#1e1508; border-radius:3px; overflow:hidden;
        }
        .ch-bar-fill {
          height:100%; border-radius:3px; width:0%;
          transition: width 1.8s cubic-bezier(.34,1.56,.64,1);
        }
        .ch-bar-orange { background:linear-gradient(90deg,#E65100,#FFD600); box-shadow:0 0 8px #E65100; }
        .ch-bar-purple { background:linear-gradient(90deg,#7c3aed,#a78bfa); box-shadow:0 0 8px #7c3aed; }
        .ch-bar-teal   { background:linear-gradient(90deg,#06b6d4,#5dba3e); box-shadow:0 0 8px #06b6d4; }

        /* LOADING BAR */
        .ch-loadbar-wrap {
          position:absolute; bottom:68px; left:50%; transform:translateX(-50%);
          width:220px; opacity:0; transition:opacity .6s; z-index:15;
        }
        .ch-loadbar-wrap.show { opacity:1; }
        .ch-loadbar-track {
          height:3px; background:#1e1508; border-radius:2px; overflow:hidden;
        }
        .ch-loadbar-fill {
          height:100%; width:0%; border-radius:2px;
          background: linear-gradient(90deg,#E65100,#FFD600);
          transition: width 3s cubic-bezier(.4,0,.2,1);
          box-shadow: 0 0 10px #E65100;
        }
        .ch-loadbar-text {
          text-align:center; margin-top:8px;
          font-size:.6rem; color:#5A4A3A; letter-spacing:3px;
          text-transform:uppercase; font-family:'Syne',sans-serif; font-weight:700;
        }

        /* TAGLINE */
        .ch-tagline {
          position:absolute; bottom:28px; left:0; right:0;
          text-align:center; font-family:'Syne',sans-serif;
          font-size:clamp(1rem,2.5vw,1.4rem); font-weight:800; color:#E8DCC8;
          opacity:0; transform:scale(.8); transition:opacity .6s, transform .6s;
        }
        .ch-tagline.show { opacity:1; transform:scale(1); }
        .ch-tagline span { color:#FFD600; }

        /* EXIT WIPE */
        .ch-exit {
          position:absolute; inset:0; background:#0a0604;
          clip-path: circle(0% at 50% 50%);
          display:flex; align-items:center; justify-content:center;
          z-index:50;
        }
        .ch-exit.go {
          clip-path: circle(150% at 50% 50%);
          transition: clip-path .85s cubic-bezier(.7,0,.3,1);
        }
        .ch-exit-inner h2 {
          font-family:'Syne',sans-serif; font-size:2.8rem; font-weight:900;
          background:linear-gradient(135deg,#FF8A65,#FFD600);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          background-clip:text; text-align:center; margin-bottom:14px;
        }
        .ch-exit-inner p {
          font-size:.72rem; color:#5A4A3A; letter-spacing:4px;
          text-transform:uppercase; font-family:'Syne',sans-serif; text-align:center;
        }
        .ch-exit-bar-track {
          width:180px; height:3px; background:#1e1508; border-radius:2px;
          margin:18px auto 0; overflow:hidden;
        }
        .ch-exit-bar-fill {
          height:100%; background:linear-gradient(90deg,#E65100,#FFD600);
          box-shadow:0 0 10px #E65100; border-radius:2px;
          animation:ch-exitPulse 1.2s ease-in-out infinite alternate;
        }
        @keyframes ch-exitPulse {
          0%{opacity:.5;transform:scaleX(.3) translateX(-50%)}
          100%{opacity:1;transform:scaleX(1) translateX(0)}
        }

        @media(max-width:600px) {
          .ch-bars { display:none; }
          .ch-bubble { font-size:.7rem; }
        }
      `}</style>

      <div className="ch-stage" ref={stageRef}>
        {/* Particle canvas */}
        <canvas ref={canvasRef} style={{ position:"absolute",inset:0,pointerEvents:"none",zIndex:20 }}/>

        {/* Stars */}
        {stars.map(s => (
          <div key={s.id} className="ch-star" style={{
            left:`${s.left}%`, top:`${s.top}%`,
            width:`${s.size}px`, height:`${s.size}px`,
            "--d":`${s.dur}s`, "--dl":`${-s.delay}s`,
          }}/>
        ))}

        {/* Floating neurons */}
        {Array.from({length:16},(_,i)=>i).map(i => (
          <div key={i} className="ch-neuron" style={{
            left:`${5+Math.random()*88}%`,
            top:`${10+Math.random()*55}%`,
            width:`${4+Math.random()*8}px`, height:`${4+Math.random()*8}px`,
            background:["#E6510033","#FFD60033","#7c3aed33","#06b6d433"][i%4],
            "--dur":`${3+i*.3}s`, "--del":`-${i*.25}s`,
          }}/>
        ))}

        {/* Ground */}
        <div className="ch-ground"><div className="ch-ground-line"/></div>

        {/* Aura rings */}
        {auras.map(a => (
          <div key={a.id} className="ch-aura" style={{
            left: a.x - a.size/2,
            top:  a.y - a.size/2,
            width: a.size, height: a.size,
            borderColor: a.color + "88",
            boxShadow: `0 0 20px ${a.color}44`,
          }}/>
        ))}

        {/* Title */}
        <div className={`ch-title${titleShow?" show":""}`}>
          <h1>Chintu 🦊</h1>
          <p>Dopamine Engine · MANAS360</p>
          <small>💪 You're Not Alone</small>
        </div>

        {/* Fox */}
        <div
          ref={foxRef}
          className={
            phase === "run"  ? "ch-fox-run" :
            phase === "jump" ? "ch-fox-jump" :
            "ch-fox-idle"
          }
          style={{ position:"absolute", width:180, height:180, zIndex:10 }}
        >
          <FoxSVG className={phase === "run" ? "ch-svg-run" : ""} />
        </div>

        {/* Speech bubble */}
        <div className={`ch-bubble${bubbleShow?" show":""}`}>{bubbleText}</div>

        {/* DP bars */}
        <div className={`ch-bars${barsShow?" show":""}`}>
          {[
            {label:"Dopamine", pct:barDp,    cls:"ch-bar-orange"},
            {label:"Focus",    pct:barFocus,  cls:"ch-bar-purple"},
            {label:"Energy",   pct:barEnergy, cls:"ch-bar-teal"},
          ].map(({label,pct,cls})=>(
            <div key={label} className="ch-bar-row">
              <span className="ch-bar-lbl">{label}</span>
              <div className="ch-bar-track">
                <div className={`ch-bar-fill ${cls}`} style={{width:`${pct}%`}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Load bar */}
        <div className={`ch-loadbar-wrap${loadShow?" show":""}`}>
          <div className="ch-loadbar-track">
            <div className="ch-loadbar-fill" style={{width:`${loadPct}%`}}/>
          </div>
          <div className="ch-loadbar-text">{loadText}</div>
        </div>

        {/* Tagline */}
        <div className={`ch-tagline${taglineShow?" show":""}`}>
          💪 You're Not Alone — <span>Let's Go!</span>
        </div>

        {/* Exit wipe */}
        <div className={`ch-exit${exitGo?" go":""}`}>
          <div className="ch-exit-inner">
            <h2>🦊 Chintu Ready!</h2>
            <p>3D Model Loading…</p>
            <div className="ch-exit-bar-track">
              <div className="ch-exit-bar-fill"/>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}