import { useState, useEffect, useRef, useCallback } from "react";

if (typeof window !== 'undefined' && !document.querySelector('meta[http-equiv="Permissions-Policy"]')) {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Permissions-Policy';
  meta.content = 'accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), xr-spatial-tracking=(), geolocation=(), interest-cohort=()';
  document.head.appendChild(meta);
}

// ── VOICE MAP ──
const VOICE_MAP = {
  streak_fire:     { phrase: "Keep that streak alive! You're on fire!",      pitch: 1.2,  rate: 1.0  },
  celebrate:       { phrase: "Yes! That's absolutely incredible!",            pitch: 1.2,  rate: 1.0  },
  challenge_focus: { phrase: "Lock in. Total focus. Let's go.",               pitch: 1.2,  rate: 1.0  },
  trick_show:      { phrase: "Watch this — nobody saw that coming!",          pitch: 1.2,  rate: 1.0  },
  level_up:        { phrase: "Come on ! You're unstoppable!",         pitch: 1.2,  rate: 1.0  },
  fly:             { phrase: "Soaring high — nothing can stop us now!",       pitch: 1.2,  rate: 1.0  },
  plotting:        { phrase: "Hmm… the wheels are turning… almost there.",    pitch: 1.2,  rate: 1.0  },
  high_five:       { phrase: "High five! You crushed it!",                    pitch: 1.2,  rate: 1.0  },
  coin_chase:      { phrase: "Coins, coins, coins — collect them all!",       pitch: 1.2,  rate: 1.0  },
  pounce:          { phrase: "Gotcha! Pounce!",                               pitch: 1.2,  rate: 1.0  },
  breathe:         { phrase: "Breathe in... slowly... and hold. Now breathe out... slowly... and relax.",         pitch: 1.2, rate: 1.0  },
  laugh:           { phrase: "Ha ha ha! That made my trunk curl!",            pitch: 1.2,  rate: 1.0  },
  play_time:       { phrase: "Play time! Come on, let's bounce!",             pitch: 1.2,  rate: 1.0  },
};

let cachedVoice = null;

const getPreferredVoice = () => new Promise(resolve => {
  const pick = (list) => {
    return (
      list.find(v => v.name === 'Microsoft Swara Online (Natural) - Hindi (India)') ||
      list.find(v => /swara|microsoft.*hindi/i.test(v.name)) ||
      list.find(v => v.lang === 'hi-IN') ||
      list.find(v => v.name === 'Microsoft Uzma Online (Natural) - Urdu (Pakistan)') ||
      list.find(v => /uzma|microsoft.*urdu|microsoft.*pakistan/i.test(v.name)) ||
      list.find(v => v.lang === 'ur-PK') ||
      list.find(v => v.name === 'Microsoft Neerja Online (Natural) - English (India)') ||
      list.find(v => /neerja|microsoft.*india/i.test(v.name)) ||
      list.find(v => v.lang === 'en-IN') ||
      list.find(v => v.name === 'Samantha') ||
      list.find(v => v.name === 'Google Indian English Female') ||
      list.find(v => v.name === 'Microsoft Zira - English (United States)') ||
      list.find(v => /zira|hazel|samantha|karen|victoria|moira|fiona|tessa/i.test(v.name)) ||
      list.find(v => v.lang.startsWith('en')) ||
      list[0]
    );
  };
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) return resolve(pick(voices));
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    resolve(pick(window.speechSynthesis.getVoices()));
  }, { once: true });
});

const speakFor = async (key, loops = 1) => {
  const v = VOICE_MAP[key];
  if (!v || !window.speechSynthesis) return;
  if (!cachedVoice) cachedVoice = await getPreferredVoice();
  for (let i = 0; i < loops; i++) {
    await new Promise(resolve => {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(v.phrase);
      utt.pitch  = v.pitch;
      utt.rate   = v.rate;
      utt.volume = v.volume ?? 1;
      if (cachedVoice) utt.voice = cachedVoice;
      utt.onend = () => resolve();
      window.speechSynthesis.speak(utt);
    });
    if (i < loops - 1) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,500;0,700;1,300&display=swap');

  .tembo-root *, .tembo-root *::before, .tembo-root *::after { margin:0; padding:0; box-sizing:border-box; }

  .tembo-root {
    --bg:      #060a0e;
    --panel:   #080e14;
    --border:  #0f2030;
    --blue:    #1565C0;
    --blue-lt: #64B5F6;
    --teal:    #00BCD4;
    --slate:   #B0BEC5;
    --water1:  #0288d1;
    --water2:  #00acc1;
    --water3:  #b2ebf2;
    --text-dim: #2e4a5e;
    --text-mid: #4a8aaa;
    --text-hi:  #90cfe8;
    --endo-gold:   #FFD54F;
    --endo-rose:   #F48FB1;
    --endo-peach:  #FFAB91;
    --endo-glow:   #FF8A65;
    --endo-soft:   #FFF9C4;
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--text-hi);
    overflow-x: hidden;
    min-height: 100vh;
    position: relative;
  }

  @keyframes tembo-breathe      { 0%,100%{opacity:.18;transform:scale(1)} 50%{opacity:.30;transform:scale(1.06)} }
  @keyframes tembo-shimmer      { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes tembo-bulge        { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
  @keyframes tembo-waterAura    { 0%,100%{box-shadow:0 0 20px 4px #0288d1,0 0 40px 8px #00bcd455} 50%{box-shadow:0 0 36px 10px #00bcd4,0 0 70px 20px #0288d155} }
  @keyframes tembo-endoAura     { 0%,100%{box-shadow:0 0 20px 6px #FFD54F55,0 0 50px 15px #F48FB133} 50%{box-shadow:0 0 40px 14px #FFD54F99,0 0 80px 30px #FF8A6555} }
  @keyframes tembo-lightningBolt{ 0%,100%{opacity:0} 10%,30%,50%{opacity:1} 20%,40%{opacity:.3} }
  @keyframes tembo-endoFlash    { 0%,100%{opacity:0} 10%,40%{opacity:1} 25%{opacity:.5} }
  @keyframes tembo-crownDrop    { 0%{transform:translateX(-50%) translateY(-30px) scale(0);opacity:0} 60%{transform:translateX(-50%) translateY(4px) scale(1.2);opacity:1} 100%{transform:translateX(-50%) translateY(0) scale(1);opacity:1} }
  @keyframes tembo-subtleBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes tembo-breathePulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.18);opacity:1} }
  @keyframes tembo-laughBounce  { 0%,100%{transform:scale(1) rotate(0)} 25%{transform:scale(1.15) rotate(-3deg)} 75%{transform:scale(1.1) rotate(3deg)} }
  @keyframes tembo-endoTextPop  { 0%{transform:translate(-50%,-50%) scale(0) rotate(-10deg);opacity:0} 60%{transform:translate(-50%,-50%) scale(1.1) rotate(2deg);opacity:1} 100%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1} }
  @keyframes tembo-ekaurPop     { 0%{transform:translate(-50%,-50%) scale(0);opacity:0} 70%{transform:translate(-50%,-50%) scale(1.05);opacity:1} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
  @keyframes tembo-endoGlow     { 0%,100%{opacity:.18;transform:scale(1)} 50%{opacity:.35;transform:scale(1.08)} }
  @keyframes tembo-spin         { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

  /* ── LOADING ── */
  .tembo-loading-overlay { position:fixed; inset:0; background:#060a0e; display:flex; align-items:center; justify-content:center; z-index:9999; transition:opacity .6s ease-out; }
  .tembo-loading-overlay.hidden { opacity:0; pointer-events:none; }
  .tembo-loading-container { text-align:center; }
  .tembo-loading-rings { position:relative; width:80px; height:80px; margin:0 auto 32px; }
  .tembo-loading-ring { position:absolute; border:3px solid transparent; border-radius:50%; border-top-color:#1565C0; border-right-color:#00BCD4; animation:tembo-spin 1.2s linear infinite; }
  .tembo-loading-ring:nth-child(1) { width:80px; height:80px; }
  .tembo-loading-ring:nth-child(2) { width:60px; height:60px; top:10px; left:10px; border-top-color:#00BCD4; border-right-color:#26a69a; animation-direction:reverse; animation-delay:.2s; }
  .tembo-loading-ring:nth-child(3) { width:40px; height:40px; top:20px; left:20px; border-top-color:#26a69a; border-right-color:#1565C0; animation-delay:.4s; }
  .tembo-loading-text { font-family:'Syne',sans-serif; font-size:1.2rem; font-weight:700; color:#90cfe8; margin-bottom:16px; letter-spacing:1px; }
  .tembo-loading-status { font-family:'DM Sans',sans-serif; font-size:.85rem; color:#4a8aaa; display:flex; align-items:center; justify-content:center; gap:8px; }
  .tembo-status-indicator { display:inline-block; width:8px; height:8px; border-radius:50%; background:#555; animation:tembo-breathePulse 1.5s ease-in-out infinite; }
  .tembo-status-indicator.ready { background:#26a69a; box-shadow:0 0 12px #26a69a; }

  /* ── AMBIENT ── */
  .tembo-ambient { position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden; }
  .tembo-ambient span { position:absolute; border-radius:50%; filter:blur(110px); animation:tembo-breathe 7s ease-in-out infinite; }
  .tembo-ambient span:nth-child(1) { width:650px;height:650px; background:radial-gradient(circle,#1565C0,transparent 70%); top:-220px;left:-180px; }
  .tembo-ambient span:nth-child(2) { width:420px;height:420px; background:radial-gradient(circle,#003a56,transparent 70%); bottom:-120px;right:-100px; animation-delay:3s; }
  .tembo-ambient span:nth-child(3) { width:320px;height:320px; background:radial-gradient(circle,#00bcd422,transparent 70%); top:40%;left:58%; animation-delay:1.5s; }
  .tembo-ambient span:nth-child(4) { width:500px;height:500px; background:radial-gradient(circle,#FFD54F18,transparent 70%); top:25%;left:30%; animation:tembo-endoGlow 5s ease-in-out infinite; animation-delay:2s; opacity:0; transition:opacity 1s; }
  .tembo-ambient.endo-active span:nth-child(4) { opacity:1; }

  /* ── LAYOUT ── */
  .tembo-layout { position:relative; z-index:1; min-height:100vh; display:grid; grid-template-rows:auto 1fr auto; max-width:1100px; margin:0 auto; padding:28px 20px 32px; }
  .tembo-header { display:flex; align-items:center; justify-content:space-between; padding-bottom:20px; border-bottom:1px solid var(--border); margin-bottom:20px; }
  .tembo-logo { display:flex; align-items:center; gap:14px; }
  .tembo-logo-icon { width:48px;height:48px; background:linear-gradient(135deg,#1565C0,#0d47a1); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 0 28px rgba(21,101,192,.5); transition:background .6s,box-shadow .6s; }
  .tembo-logo-icon.endo-mode { background:linear-gradient(135deg,#FF8A65,#FFD54F); box-shadow:0 0 28px rgba(255,171,145,.5); }
  .tembo-logo-text h1 { font-family:'Syne',sans-serif; font-size:1.5rem; font-weight:800; color:var(--text-hi); letter-spacing:-.5px; }
  .tembo-logo-text p  { font-size:.72rem; font-weight:300; color:var(--text-dim); letter-spacing:3px; text-transform:uppercase; margin-top:1px; }
  .tembo-status-pill  { display:flex; align-items:center; gap:8px; background:#060e16; border:1px solid var(--border); border-radius:50px; padding:7px 14px; font-size:.75rem; color:var(--text-mid); }
  .tembo-status-dot   { width:7px;height:7px; border-radius:50%; background:#555; transition:background .4s,box-shadow .4s; }
  .tembo-status-dot.ready { background:#26a69a; box-shadow:0 0 8px #26a69a; }
  .tembo-status-dot.busy  { background:var(--teal); box-shadow:0 0 8px var(--teal); }
  .tembo-status-dot.endo  { background:var(--endo-gold); box-shadow:0 0 10px var(--endo-gold); animation:tembo-breathePulse 2s ease-in-out infinite; }
  .tembo-main { display:grid; grid-template-columns:1fr 300px; gap:16px; align-items:start; }

  /* ── VIEWER WRAP ── */
  .tembo-viewer-wrap {
    position: relative;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: #030810;
    box-shadow: 0 0 0 1px #040d18, 0 20px 80px rgba(0,0,0,.75), inset 0 0 60px rgba(21,101,192,.06);
    transition: box-shadow .6s;
  }
  .tembo-viewer-wrap.water-active { animation:tembo-waterAura 1.2s ease-in-out infinite; }
  .tembo-viewer-wrap.endo-active  { animation:tembo-endoAura 1.5s ease-in-out infinite; }
  .tembo-viewer-glow { position:absolute; inset:0; pointer-events:none; z-index:2; transition:opacity .6s,background .6s;
    background:radial-gradient(ellipse at 50% 80%,rgba(21,101,192,.10),transparent 70%); }
  .tembo-viewer-glow.hot        { background:radial-gradient(ellipse at 50% 70%,rgba(0,188,212,.22),transparent 70%); }
  .tembo-viewer-glow.water-mode { background:radial-gradient(ellipse at 50% 90%,rgba(2,136,209,.3),rgba(0,188,212,.15) 40%,transparent 70%); }
  .tembo-viewer-glow.endo-mode  { background:radial-gradient(ellipse at 50% 60%,rgba(255,213,79,.18),rgba(244,143,177,.10) 50%,transparent 75%); }

  /* ── IFRAME CONTAINER ── */
  .tembo-iframe-container {
    position: relative;
    width: 100%;
    height: 500px;
    overflow: hidden;
  }

  /* KEY FIX: iframe is fully interactive — pointer-events enabled */
  .tembo-iframe {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    border: none;
    display: block;
    pointer-events: all;
    z-index: 1;
  }

  .tembo-mask-top,
  .tembo-mask-bottom {
    position: absolute;
    left: 0; right: 0;
    /* sit above iframe but below canvas overlays */
    z-index: 10;
    pointer-events: none;
    background: #030810;
  }
  .tembo-mask-top    { top: 0;    height: 48px; }
  .tembo-mask-bottom { bottom: 0; height: 56px; }

  /* All canvas overlays and effects sit above iframe but don't block mouse */
  .tembo-spark-canvas  { position:absolute; inset:0; pointer-events:none; z-index:18; }
  .tembo-water-canvas  { position:absolute; bottom:0; left:0; right:0; height:200px; pointer-events:none; z-index:19; opacity:0; transition:opacity .4s; }
  .tembo-water-canvas.active { opacity:1; }
  .tembo-breath-canvas { position:absolute; inset:0; pointer-events:none; z-index:20; opacity:0; transition:opacity .6s; }
  .tembo-breath-canvas.active { opacity:1; }
  .tembo-lightning-overlay { position:absolute; inset:0; pointer-events:none; z-index:21; opacity:0; background:radial-gradient(ellipse at 50% 40%,rgba(100,181,246,.25),transparent 60%); }
  .tembo-lightning-overlay.flash { animation:tembo-lightningBolt .5s ease-out forwards; }
  .tembo-endo-overlay { position:absolute; inset:0; pointer-events:none; z-index:21; opacity:0; background:radial-gradient(ellipse at 50% 50%,rgba(255,213,79,.18),rgba(244,143,177,.10) 50%,transparent 70%); }
  .tembo-endo-overlay.flash { animation:tembo-endoFlash .8s ease-out forwards; }
  .tembo-crown-el { position:absolute; top:20px; left:50%; transform:translateX(-50%); font-size:2.5rem; pointer-events:none; z-index:22; opacity:0; }
  .tembo-crown-el.show { animation:tembo-crownDrop .5s cubic-bezier(.34,1.56,.64,1) forwards; }
  .tembo-ekaaur-text { position:absolute; top:30%; left:50%; transform:translate(-50%,-50%) scale(0); font-family:'Syne',sans-serif; font-size:2.8rem; font-weight:900; color:var(--teal); text-shadow:0 0 20px var(--blue),0 0 40px var(--teal); pointer-events:none; z-index:23; white-space:nowrap; opacity:0; transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .25s; }
  .tembo-ekaaur-text.pop { transform:translate(-50%,-50%) scale(1); opacity:1; }
  .tembo-endo-text { position:absolute; top:35%; left:50%; transform:translate(-50%,-50%) scale(0); font-family:'Syne',sans-serif; font-size:2.2rem; font-weight:900; color:var(--endo-gold); text-shadow:0 0 18px var(--endo-rose),0 0 36px var(--endo-peach); pointer-events:none; z-index:23; white-space:nowrap; opacity:0; }
  .tembo-endo-text.pop { animation:tembo-endoTextPop .5s cubic-bezier(.34,1.56,.64,1) forwards; opacity:1; }
  .tembo-now-playing { position:absolute; bottom:50px; left:16px; background:rgba(6,10,14,.88); backdrop-filter:blur(12px); border:1px solid var(--border); border-radius:10px; padding:8px 14px; font-family:'Syne',sans-serif; font-size:.78rem; color:var(--blue-lt); display:none; align-items:center; gap:8px; z-index:24; pointer-events:none; }
  .tembo-now-playing.show { display:flex; }
  .tembo-now-playing .anim-dot { width:6px;height:6px; border-radius:50%; background:var(--teal); box-shadow:0 0 6px var(--teal); animation:tembo-breathe 1s ease-in-out infinite; }
  .tembo-now-playing.endo-badge { color:var(--endo-gold); border-color:rgba(255,213,79,.25); }
  .tembo-now-playing.endo-badge .anim-dot { background:var(--endo-gold); box-shadow:0 0 6px var(--endo-gold); }

  /* drag hint tooltip */
  .tembo-drag-hint { position:absolute; bottom:62px; right:14px; background:rgba(6,10,14,.75); backdrop-filter:blur(8px); border:1px solid var(--border); border-radius:8px; padding:5px 10px; font-size:.65rem; color:var(--text-mid); pointer-events:none; z-index:25; display:flex; align-items:center; gap:5px; opacity:1; transition:opacity 1s; }
  .tembo-drag-hint.fade { opacity:0; }

  /* ── SIDEBAR ── */
  .tembo-sidebar { display:flex; flex-direction:column; gap:12px; }
  .tembo-dp-meter { background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:16px; position:relative; overflow:hidden; }
  .tembo-dp-meter::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 50% 100%,rgba(0,188,212,.06),transparent 60%); pointer-events:none; }
  .tembo-dp-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .tembo-dp-label  { font-family:'Syne',sans-serif; font-size:.62rem; font-weight:700; letter-spacing:3.5px; text-transform:uppercase; color:var(--text-dim); }
  .tembo-dp-value  { font-family:'Syne',sans-serif; font-size:1.6rem; font-weight:900; color:var(--teal); line-height:1; transition:color .3s; }
  .tembo-dp-value.maxed { color:#fff; text-shadow:0 0 20px var(--teal); animation:tembo-bulge .4s ease; }
  .tembo-dp-bar-track { height:8px; background:#0a1520; border-radius:4px; overflow:hidden; }
  .tembo-dp-bar-fill  { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--blue),var(--teal)); transition:width .8s cubic-bezier(.34,1.56,.64,1); position:relative; }
  .tembo-dp-bar-fill::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent); background-size:200% 100%; animation:tembo-shimmer 2s infinite; }
  .tembo-dp-sublabels { display:flex; gap:8px; margin-top:10px; }
  .tembo-dp-sub { flex:1; background:#060e16; border:1px solid var(--border); border-radius:8px; padding:8px 6px; text-align:center; }
  .tembo-dp-sub .sub-val { font-family:'Syne',sans-serif; font-size:1rem; font-weight:800; color:var(--text-hi); transition:all .4s; }
  .tembo-dp-sub .sub-lbl { font-size:.58rem; color:var(--text-dim); letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
  .streak-val-water { color:var(--teal) !important; text-shadow:0 0 10px var(--blue); animation:tembo-bulge .3s ease; }
  .tembo-endo-meter { background:var(--panel); border:1px solid rgba(255,213,79,.12); border-radius:16px; padding:16px; position:relative; overflow:hidden; transition:border-color .4s; }
  .tembo-endo-meter::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 50% 100%,rgba(255,171,145,.07),transparent 60%); pointer-events:none; }
  .tembo-endo-meter.active { border-color:rgba(255,213,79,.3); }
  .tembo-endo-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
  .tembo-endo-label  { font-family:'Syne',sans-serif; font-size:.62rem; font-weight:700; letter-spacing:3.5px; text-transform:uppercase; color:rgba(255,171,145,.5); }
  .tembo-endo-value  { font-family:'Syne',sans-serif; font-size:1.4rem; font-weight:900; color:var(--endo-gold); line-height:1; transition:color .3s; }
  .tembo-endo-value.maxed { color:#fff; text-shadow:0 0 20px var(--endo-gold),0 0 40px var(--endo-rose); animation:tembo-laughBounce .5s ease; }
  .tembo-endo-bar-track { height:6px; background:#0d0a08; border-radius:4px; overflow:hidden; margin-bottom:8px; }
  .tembo-endo-bar-fill  { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--endo-rose),var(--endo-gold),var(--endo-peach)); transition:width .8s cubic-bezier(.34,1.56,.64,1); position:relative; }
  .tembo-endo-bar-fill::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent); background-size:200% 100%; animation:tembo-shimmer 1.8s infinite; }
  .tembo-endo-tagline { font-size:.65rem; color:rgba(255,171,145,.45); letter-spacing:1px; line-height:1.5; font-style:italic; }
  .tembo-endo-tagline strong { color:rgba(255,213,79,.7); font-style:normal; }
  .tembo-endo-sublabels { display:flex; gap:8px; margin-top:10px; }
  .tembo-endo-sub { flex:1; background:#0d0a08; border:1px solid rgba(255,213,79,.08); border-radius:8px; padding:7px 6px; text-align:center; }
  .tembo-endo-sub .sub-val { font-family:'Syne',sans-serif; font-size:.95rem; font-weight:800; color:rgba(255,213,79,.8); transition:all .4s; }
  .tembo-endo-sub .sub-lbl { font-size:.56rem; color:rgba(255,171,145,.4); letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
  .tembo-endo-sub .sub-val.pop { color:var(--endo-gold) !important; text-shadow:0 0 10px var(--endo-gold); animation:tembo-bulge .3s ease; }
  .tembo-reward-panel { background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:14px; }
  .tembo-section-label { font-family:'Syne',sans-serif; font-size:.62rem; font-weight:700; letter-spacing:3.5px; text-transform:uppercase; color:var(--text-dim); padding:0 2px 10px; border-bottom:1px solid var(--border); margin-bottom:10px; }
  .tembo-reward-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .tembo-reward-btn { position:relative; overflow:hidden; border:1px solid transparent; border-radius:12px; font-family:'DM Sans',sans-serif; font-weight:700; cursor:pointer; transition:all .18s ease; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:14px 8px; background:#060e16; color:var(--text-mid); text-align:center; }
  .tembo-reward-btn:hover { transform:translateY(-2px); }
  .tembo-reward-btn:active { transform:scale(.95); }
  .tembo-reward-btn.active { animation:tembo-subtleBounce .5s ease infinite; }
  .tembo-reward-btn .r-icon  { font-size:1.6rem; line-height:1; display:block; transition:transform .2s; }
  .tembo-reward-btn:hover .r-icon { transform:scale(1.15); }
  .tembo-reward-btn .r-image { width:40px; height:40px; object-fit:contain; margin-bottom:2px; opacity:0.7; transition:all .3s ease; }
  .tembo-reward-btn:hover .r-image { opacity:1; transform:scale(1.15); }
  .tembo-reward-btn .r-image-preview { position:fixed; display:none; z-index:9999; background:#030810; border:2px solid var(--blue); border-radius:12px; padding:8px; box-shadow:0 0 40px rgba(21,101,192,.5); max-width:200px; max-height:200px; }
  .tembo-reward-btn .r-label { font-size:.72rem; font-weight:700; letter-spacing:.5px; }
  .tembo-reward-btn .r-sub   { font-size:.58rem; color:var(--text-dim); letter-spacing:1.5px; text-transform:uppercase; }
  .tembo-reward-btn .r-dp    { position:absolute; top:6px; right:6px; font-size:.55rem; font-family:'Syne',sans-serif; font-weight:800; padding:2px 5px; border-radius:4px; background:rgba(0,188,212,.12); color:var(--teal); letter-spacing:.5px; }
  .r-ep { position:absolute; top:6px; left:6px; font-size:.52rem; font-family:'Syne',sans-serif; font-weight:800; padding:2px 5px; border-radius:4px; background:rgba(255,213,79,.12); color:var(--endo-gold); letter-spacing:.5px; }
  .btn-highfive   { background:linear-gradient(145deg,#071622,#050f18); border-color:#0d2535; }
  .btn-highfive:hover,.btn-highfive.active { border-color:#64B5F6; color:#64B5F6; box-shadow:0 0 16px rgba(100,181,246,.2); }
  .btn-streak     { background:linear-gradient(145deg,#041520,#030d16); border-color:#082030; }
  .btn-streak:hover,.btn-streak.active { border-color:#0288d1; color:#0288d1; box-shadow:0 0 20px rgba(2,136,209,.3),0 0 40px rgba(0,188,212,.1); }
  .btn-coin       { background:linear-gradient(145deg,#081a20,#050f15); border-color:#0a2530; }
  .btn-coin:hover,.btn-coin.active { border-color:var(--teal); color:var(--teal); box-shadow:0 0 16px rgba(0,188,212,.2); }
  .btn-celebrate  { background:linear-gradient(145deg,#0a0e1e,#060a14); border-color:#101828; }
  .btn-celebrate:hover,.btn-celebrate.active { border-color:#7986cb; color:#7986cb; box-shadow:0 0 20px rgba(121,134,203,.25); }
  .btn-challenge  { background:linear-gradient(145deg,#051020,#030a16); border-color:#081828; }
  .btn-challenge:hover,.btn-challenge.active { border-color:#00acc1; color:#00acc1; box-shadow:0 0 16px rgba(0,172,193,.2); }
  .btn-trick      { background:linear-gradient(145deg,#081525,#05101a); border-color:#0d2035; }
  .btn-trick:hover,.btn-trick.active { border-color:#80deea; color:#80deea; box-shadow:0 0 14px rgba(128,222,234,.2); }
  .btn-levelup    { background:linear-gradient(145deg,#061420,#040e18); border-color:#0a2030; }
  .btn-levelup:hover,.btn-levelup.active { border-color:var(--teal); color:#fff; box-shadow:0 0 24px rgba(0,188,212,.4),0 0 50px rgba(0,188,212,.1); }
  .btn-pounce     { background:linear-gradient(145deg,#071a14,#050f0e); border-color:#0c2820; }
  .btn-pounce:hover,.btn-pounce.active { border-color:#26a69a; color:#26a69a; box-shadow:0 0 14px rgba(38,166,154,.2); }
  .btn-plotting   { grid-column:1/-1; flex-direction:row; justify-content:flex-start; gap:12px; padding:10px 14px; background:linear-gradient(145deg,#060e18,#040a12); border-color:#0d1e2e; }
  .btn-plotting:hover,.btn-plotting.active { border-color:var(--text-mid); color:var(--text-hi); box-shadow:0 0 12px rgba(74,138,170,.15); }
  .btn-plotting .r-icon { font-size:1.2rem; }
  .btn-breathe    { background:linear-gradient(145deg,#1a1208,#120d06); border-color:rgba(255,213,79,.12); }
  .btn-breathe:hover,.btn-breathe.active { border-color:var(--endo-gold); color:var(--endo-gold); box-shadow:0 0 20px rgba(255,213,79,.25),0 0 40px rgba(255,171,145,.10); }
  .btn-laugh      { background:linear-gradient(145deg,#1a0e10,#12080a); border-color:rgba(244,143,177,.12); }
  .btn-laugh:hover,.btn-laugh.active { border-color:var(--endo-rose); color:var(--endo-rose); box-shadow:0 0 18px rgba(244,143,177,.25); animation:tembo-laughBounce .4s ease infinite; }
  .btn-play       { grid-column:1/-1; flex-direction:row; justify-content:flex-start; gap:12px; padding:10px 14px; background:linear-gradient(145deg,#1a1008,#120b06); border-color:rgba(255,171,145,.12); }
  .btn-play:hover,.btn-play.active { border-color:var(--endo-peach); color:var(--endo-peach); box-shadow:0 0 16px rgba(255,171,145,.25); }
  .tembo-endo-section-label { font-family:'Syne',sans-serif; font-size:.58rem; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:rgba(255,171,145,.35); padding:8px 2px 8px; border-top:1px solid rgba(255,213,79,.08); margin-top:4px; display:flex; align-items:center; gap:8px; grid-column:1/-1; }
  .tembo-endo-section-label::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,rgba(255,213,79,.12),transparent); }
  .tembo-statusbar { margin-top:18px; padding-top:16px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; font-size:.72rem; color:var(--text-dim); }
  .tembo-statusbar .msg { display:flex; align-items:center; gap:6px; }

  @media (max-width:768px) {
    .tembo-main { grid-template-columns:1fr; }
    .tembo-iframe-container { height:320px; }
  }
`;

const ANIM_MAP = {
  high_five:['Talk'], streak_fire:['Run'], coin_chase:['Walk'], celebrate:['Success'],
  challenge_focus:['Idle_2','Talk'], trick_show:['Roll'], level_up:['Success'],
  pounce:['Roll'], plotting:['Walk'], breathe:['Idle'],
  laugh:['Land','Jump'], play_time:['Run','Walk'],
  fly :['Jump']
};
const DP_GRANT = { high_five:15, streak_fire:25, coin_chase:10, celebrate:30, challenge_focus:20, trick_show:18, level_up:50, pounce:8, plotting:5, breathe:8, laugh:12, play_time:10 };
const EP_GRANT = { breathe:20, laugh:25, play_time:15 };
const CONFETTI_COLORS = ['#00BCD4','#64B5F6','#7986cb','#26a69a','#80deea','#fff'];
const ENDO_CONFETTI   = ['#FFD54F','#F48FB1','#FFAB91','#FFF9C4','#FF8A65','#fff'];

export default function Tembo() {
  const [dopamine, setDopamine]       = useState(30);
  const [streak, setStreak]           = useState(0);
  const [coins, setCoins]             = useState(0);
  const [level, setLevel]             = useState(1);
  const [endorphins, setEndorphins]   = useState(0);
  const [breaths, setBreaths]         = useState(0);
  const [laughs, setLaughs]           = useState(0);
  const [playCount, setPlayCount]     = useState(0);
  const [statusDot, setStatusDot]     = useState('');
  const [statusText, setStatusText]   = useState('Loading model…');
  const [msgText, setMsgText]         = useState('Initialising viewer…');
  const [badgeName, setBadgeName]     = useState('Idle');
  const [badgeShow, setBadgeShow]     = useState(false);
  const [badgeEndo, setBadgeEndo]     = useState(false);
  const [activeBtn, setActiveBtn]     = useState(null);
  const [glowClass, setGlowClass]     = useState('');
  const [viewerClass, setViewerClass] = useState('');
  const [ambientEndo, setAmbientEndo] = useState(false);
  const [logoEndo, setLogoEndo]       = useState(false);
  const [lightFlash, setLightFlash]   = useState(false);
  const [endoFlash, setEndoFlash]     = useState(false);
  const [crownShow, setCrownShow]     = useState(false);
  const [ekaurPop, setEkaurPop]       = useState(false);
  const [endoTextStr, setEndoTextStr] = useState('Feel Good! 🌟');
  const [endoTextPop, setEndoTextPop] = useState(false);
  const [streakBlink, setStreakBlink] = useState(false);
  const [breathActive, setBreathActive]           = useState(false);
  const [waterCanvasActive, setWaterCanvasActive] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [showTembo, setShowTembo]       = useState(false);
  const [hintFade, setHintFade]         = useState(false);

  const iframeRef  = useRef(null);
  const sparkRef   = useRef(null);
  const waterRef   = useRef(null);
  const breathRef  = useRef(null);
  const apiRef     = useRef(null);
  const animsRef   = useRef([]);
  const sparksRef  = useRef([]);
  const coinsParRef  = useRef([]);
  const confettiRef  = useRef([]);
  const heartsRef    = useRef([]);
  const waterParRef  = useRef([]);
  const breathRingsRef = useRef([]);
  const waterActiveRef = useRef(false);
  const endoTimerRef   = useRef(null);
  const streakTimerRef = useRef(null);
  const waterLoopRef   = useRef(null);
  const rafIdRef  = useRef(null);
  const wRafIdRef = useRef(null);
  const bRafIdRef = useRef(null);

  // Fade out the drag hint after 5 seconds once model is ready
  useEffect(() => {
    if (isModelReady) {
      const t = setTimeout(() => setHintFade(true), 5000);
      return () => clearTimeout(t);
    }
  }, [isModelReady]);

  useEffect(() => {
    const id = 'tembo-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id; tag.textContent = CSS;
      document.head.appendChild(tag);
    }
  }, []);

  useEffect(() => {
    if (statusDot === 'ready' && !isModelReady) {
      setIsModelReady(true);
      const t = setTimeout(() => setShowTembo(true), 500);
      return () => clearTimeout(t);
    }
  }, [statusDot, isModelReady]);

  useEffect(() => {
    function resize() {
      const wrap = sparkRef.current?.parentElement;
      if (!wrap) return;
      const w = wrap.offsetWidth, h = wrap.offsetHeight;
      if (sparkRef.current)  { sparkRef.current.width = w;  sparkRef.current.height = h; }
      if (waterRef.current)  { waterRef.current.width = w;  waterRef.current.height = 200; }
      if (breathRef.current) { breathRef.current.width = w; breathRef.current.height = h; }
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── spark / coin / confetti / heart canvas loop ──
  useEffect(() => {
    const canvas = sparkRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparksRef.current = sparksRef.current.filter(s => s.alpha > .05);
      sparksRef.current.forEach(s => {
        s.x += s.vx; s.y += s.vy; s.vy += .12; s.vx *= .96; s.alpha *= .94; s.size *= .97;
        ctx.save(); ctx.globalAlpha = s.alpha; ctx.fillStyle = s.color; ctx.shadowBlur = s.glow; ctx.shadowColor = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill(); ctx.restore();
      });
      coinsParRef.current = coinsParRef.current.filter(c => c.alpha > .05);
      coinsParRef.current.forEach(c => {
        c.x += c.vx; c.y += c.vy; c.vy += .04; c.alpha *= .96; c.spin += c.spinV;
        ctx.save(); ctx.globalAlpha = c.alpha; ctx.translate(c.x, c.y); ctx.rotate(c.spin);
        ctx.fillStyle = '#00BCD4'; ctx.shadowBlur = 12; ctx.shadowColor = '#00BCD4';
        ctx.beginPath(); ctx.ellipse(0, 0, c.size * Math.abs(Math.cos(c.spin)), c.size, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.ellipse(-c.size*.2, -c.size*.2, c.size*.3*Math.abs(Math.cos(c.spin)), c.size*.3, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      });
      confettiRef.current = confettiRef.current.filter(c => c.alpha > .04);
      confettiRef.current.forEach(c => {
        c.x += c.vx; c.y += c.vy; c.vy += .08; c.vx *= .99; c.alpha *= .985; c.rot += c.rotV;
        ctx.save(); ctx.globalAlpha = c.alpha; ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        ctx.fillStyle = c.color; ctx.fillRect(-c.w/2, -c.h/2, c.w, c.h); ctx.restore();
      });
      heartsRef.current = heartsRef.current.filter(h => h.alpha > .05);
      heartsRef.current.forEach(h => {
        h.x += h.vx; h.y += h.vy; h.vy += .04; h.alpha *= .97;
        ctx.save(); ctx.globalAlpha = h.alpha; ctx.font = `${h.size}px serif`; ctx.textAlign = 'center';
        ctx.shadowBlur = 12; ctx.shadowColor = '#F48FB1'; ctx.fillText('❤️', h.x, h.y); ctx.restore();
      });
      rafIdRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  // ── water canvas loop ──
  useEffect(() => {
    const canvas = waterRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      waterParRef.current = waterParRef.current.filter(p => p.alpha > .03);
      waterParRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vx += (Math.random()-.5)*.2; p.vy += .03; p.alpha *= .96; p.size *= .98;
        ctx.save(); ctx.globalAlpha = p.alpha * .8;
        if (p.isRipple) {
          ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; ctx.shadowBlur = 10; ctx.shadowColor = p.color;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size*1.5, p.size*.6, 0, 0, Math.PI*2); ctx.stroke();
        } else {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, p.color); g.addColorStop(.6, p.color+'88'); g.addColorStop(1,'transparent');
          ctx.fillStyle = g; ctx.shadowBlur = 15; ctx.shadowColor = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
      });
      wRafIdRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(wRafIdRef.current);
  }, []);

  // ── breath canvas loop ──
  useEffect(() => {
    const canvas = breathRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      breathRingsRef.current = breathRingsRef.current.filter(r => r.alpha > .01);
      breathRingsRef.current.forEach(r => {
        r.r += r.speed; r.alpha -= .008;
        ctx.save(); ctx.globalAlpha = r.alpha * .6; ctx.strokeStyle = r.color; ctx.lineWidth = 2;
        ctx.shadowBlur = 18; ctx.shadowColor = r.color;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.stroke(); ctx.restore();
      });
      bRafIdRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(bRafIdRef.current);
  }, []);

  const burst = useCallback((count, cfg={}) => {
    const canvas = sparkRef.current; if (!canvas) return;
    const cx = canvas.width*(cfg.cx||0.42), cy = canvas.height*(cfg.cy||0.55);
    const colors = cfg.colors||['#00BCD4','#64B5F6','#fff'], big = cfg.big||false;
    for (let i=0;i<count;i++) {
      const angle = Math.random()*Math.PI*2, speed = (big?6:2)+Math.random()*(big?8:4);
      sparksRef.current.push({ x:cx+(Math.random()-.5)*(big?120:50), y:cy+(Math.random()-.5)*(big?80:30), vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-(big?4:2), color:colors[Math.floor(Math.random()*colors.length)], alpha:1, size:(big?6:3)+Math.random()*(big?5:3), glow:big?20:8 });
    }
  }, []);

  const burstGold = useCallback((count, cx, cy) => {
    for (let i=0;i<count;i++) {
      const angle=Math.random()*Math.PI*2, speed=1.5+Math.random()*4;
      sparksRef.current.push({ x:cx+(Math.random()-.5)*60, y:cy+(Math.random()-.5)*40, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-1.5, color:['#FFD54F','#F48FB1','#FFAB91','#FFF9C4'][Math.floor(Math.random()*4)], alpha:1, size:3+Math.random()*5, glow:14 });
    }
  }, []);

  const burstConfetti = useCallback((n, warm=false) => {
    const canvas = sparkRef.current; if (!canvas) return;
    const palette = warm?ENDO_CONFETTI:CONFETTI_COLORS;
    for (let i=0;i<n;i++) {
      confettiRef.current.push({ x:canvas.width*(.2+Math.random()*.6), y:canvas.height*.15, vx:(Math.random()-.5)*5, vy:-3-Math.random()*4, color:palette[Math.floor(Math.random()*palette.length)], alpha:1, w:6+Math.random()*8, h:4+Math.random()*4, rot:Math.random()*Math.PI*2, rotV:(Math.random()-.5)*.2 });
    }
  }, []);

  const spawnHeart = useCallback((cx, cy) => { heartsRef.current.push({ x:cx, y:cy, vx:(Math.random()-.5)*3, vy:-2-Math.random()*2, alpha:1, size:16+Math.random()*12, life:0 }); }, []);
  const spawnCoin  = useCallback(() => {
    const canvas=sparkRef.current; if(!canvas) return;
    coinsParRef.current.push({ x:canvas.width*(.3+Math.random()*.4), y:canvas.height*.55, vy:-1-Math.random()*2, vx:(Math.random()-.5)*2, alpha:1, size:10+Math.random()*8, spin:Math.random()*Math.PI*2, spinV:.1+Math.random()*.15 });
  }, []);
  const spawnWaterDrop = useCallback(() => {
    const canvas=waterRef.current; if(!canvas) return;
    const cx=canvas.width/2, spread=canvas.width*.3;
    waterParRef.current.push({ x:cx+(Math.random()-.5)*spread, y:canvas.height*.7, vx:(Math.random()-.5)*1.5, vy:-(1.5+Math.random()*3), size:5+Math.random()*12, alpha:.7+Math.random()*.3, color:Math.random()>.5?(Math.random()>.5?'#0288d1':'#00acc1'):'#b2ebf2', isRipple:Math.random()>.6 });
  }, []);

  const startWater = useCallback(() => {
    waterActiveRef.current = true;
    setWaterCanvasActive(true);
    setViewerClass(v => v.includes('water-active')?v:(v+' water-active').trim());
    setGlowClass('water-mode');
    function loop() { if(!waterActiveRef.current) return; for(let i=0;i<3;i++) spawnWaterDrop(); waterLoopRef.current=setTimeout(loop,60); }
    loop();
  }, [spawnWaterDrop]);

  const stopWater = useCallback(() => {
    waterActiveRef.current = false; setWaterCanvasActive(false);
    setViewerClass(v => v.replace('water-active','').trim()); setGlowClass('');
    if(waterLoopRef.current) clearTimeout(waterLoopRef.current);
  }, []);

  const startEndoAura = useCallback(() => {
    setViewerClass(v => v.includes('endo-active')?v:(v+' endo-active').trim());
    setGlowClass('endo-mode'); setAmbientEndo(true); setLogoEndo(true);
    setStatusDot('endo'); setStatusText('🌿 Endorphins');
    if(endoTimerRef.current) clearTimeout(endoTimerRef.current);
    endoTimerRef.current = setTimeout(() => {
      setViewerClass(v => v.replace('endo-active','').trim()); setGlowClass('');
      setAmbientEndo(false); setLogoEndo(false); setStatusDot('ready'); setStatusText('Ready');
    }, 5000);
  }, []);

  const flashLightning = useCallback(() => {
    setLightFlash(false); requestAnimationFrame(() => setLightFlash(true)); setTimeout(() => setLightFlash(false), 600);
  }, []);
  const flashEndoOverlay = useCallback(() => {
    setEndoFlash(false); requestAnimationFrame(() => setEndoFlash(true)); setTimeout(() => setEndoFlash(false), 900);
  }, []);
  const showEkAur = useCallback(() => { setEkaurPop(true); setTimeout(() => setEkaurPop(false), 1200); }, []);
  const showCrown = useCallback(() => {
    setCrownShow(false); requestAnimationFrame(() => setCrownShow(true)); setTimeout(() => setCrownShow(false), 2500);
  }, []);
  const showEndoText = useCallback((msg) => {
    setEndoTextStr(msg); setEndoTextPop(false); requestAnimationFrame(() => setEndoTextPop(true)); setTimeout(() => setEndoTextPop(false), 1400);
  }, []);

  const triggerReward = useCallback((key) => {
    if (key === 'breathe') {
      speakFor(key, 5);
    } else {
      speakFor(key);
    }

    if (!apiRef.current || animsRef.current.length === 0) { setMsgText('⚠️ Model not ready yet.'); return; }
    setActiveBtn(key);
    setDopamine(d => Math.min(100, d + (DP_GRANT[key]||10)));
    const canvas = sparkRef.current; if (!canvas) return;
    const cx = canvas.width*.45, cy = canvas.height*.5;

    if (key==='high_five') {
      burst(60,{colors:['#64B5F6','#fff','#00BCD4'],big:true}); setTimeout(()=>burst(40,{colors:['#64B5F6','#1565C0'],big:true}),200);
    } else if (key==='streak_fire') {
      setStreak(s=>s+1); setStreakBlink(true); setTimeout(()=>setStreakBlink(false),400);
      startWater(); burst(50,{colors:['#0288d1','#00acc1','#b2ebf2'],big:true});
      if(streakTimerRef.current) clearTimeout(streakTimerRef.current);
      streakTimerRef.current = setTimeout(stopWater, 4000);
    } else if (key==='coin_chase') {
      setCoins(c=>c+3+Math.floor(Math.random()*4));
      const t0=Date.now();
      function coinLoop(){if(Date.now()-t0>3000) return; spawnCoin(); burst(5,{colors:['#00BCD4','#b2ebf2'],cx:.35+Math.random()*.3}); setTimeout(coinLoop,200);}
      coinLoop();
    } else if (key==='celebrate') {
      burstConfetti(120); burst(80,{colors:['#7986cb','#00BCD4','#64B5F6','#80deea'],big:true});
      setTimeout(()=>burstConfetti(60),400); setTimeout(()=>burst(50,{colors:['#fff','#00BCD4','#7986cb'],big:true}),600);
      setGlowClass('hot'); setTimeout(()=>setGlowClass(''),3000);
    } else if (key==='challenge_focus') {
      burst(30,{colors:['#00acc1','#0288d1','#fff']});
      setTimeout(()=>{burst(80,{colors:['#00BCD4','#64B5F6','#fff'],big:true}); flashLightning();},2000);
    } else if (key==='trick_show') {
      burst(40,{colors:['#80deea','#00BCD4']}); setTimeout(()=>burst(60,{colors:['#64B5F6','#fff','#00acc1'],big:true}),400);
      for(let i=0;i<8;i++) waterParRef.current.push({x:waterRef.current.width*(.3+Math.random()*.4),y:waterRef.current.height*.8,vx:(Math.random()-.5)*3,vy:-(2+Math.random()*2),size:15+Math.random()*20,alpha:.9,color:'#00BCD4',isRipple:true});
      setWaterCanvasActive(true); setTimeout(()=>{if(!waterActiveRef.current) setWaterCanvasActive(false);},2000);
    } else if (key==='level_up') {
      flashLightning(); showEkAur(); showCrown(); setLevel(l=>l+1);
      burst(100,{colors:['#00BCD4','#fff','#64B5F6'],big:true}); setTimeout(()=>burstConfetti(80),200);
      setTimeout(()=>burst(60,{colors:['#00BCD4','#7986cb','#fff'],big:true}),500);
      setTimeout(()=>{flashLightning(); burst(40,{colors:['#fff','#00BCD4']});},900);
    } else if (key==='pounce') {
      burst(35,{colors:['#26a69a','#00BCD4','#fff']}); setCoins(c=>c+1); spawnCoin(); spawnCoin(); spawnCoin();
    } else if (key==='plotting') {
      burst(15,{colors:['#00BCD4','#4a8aaa']});
    } else if (key==='breathe') {
      setBreaths(b=>b+1); setEndorphins(e=>Math.min(100,e+EP_GRANT.breathe));
      startEndoAura(); setBreathActive(true);
      for(let i=0;i<5;i++) setTimeout(()=>{const bc=breathRef.current;if(!bc) return; breathRingsRef.current.push({x:bc.width/2,y:bc.height*.52,r:20,alpha:.6,color:Math.random()>.5?'#FFD54F':'#F48FB1',speed:1.2+Math.random()*.8});},i*300);
      setTimeout(()=>{for(let i=0;i<5;i++) setTimeout(()=>{const bc=breathRef.current;if(!bc) return; breathRingsRef.current.push({x:bc.width/2,y:bc.height*.52,r:20,alpha:.6,color:Math.random()>.5?'#FFD54F':'#F48FB1',speed:1.2+Math.random()*.8});},i*400);},1800);
      burstGold(25,cx,cy); setTimeout(()=>burstGold(20,cx,cy),800);
      showEndoText('Breathe… 🌿'); setTimeout(()=>setBreathActive(false),5500);
    } else if (key==='laugh') {
      setLaughs(l=>l+1); setEndorphins(e=>Math.min(100,e+EP_GRANT.laugh));
      startEndoAura(); flashEndoOverlay();
      for(let i=0;i<12;i++) setTimeout(()=>spawnHeart(cx+(Math.random()-.5)*140,cy+(Math.random()-.5)*80),i*80);
      burstConfetti(80,true); setTimeout(()=>burstConfetti(50,true),350); burstGold(40,cx,cy);
      showEndoText('Ha ha ha! 😂'); setBadgeEndo(true); setTimeout(()=>setBadgeEndo(false),4000);
    } else if (key==='play_time') {
      setPlayCount(p=>p+1); setEndorphins(e=>Math.min(100,e+EP_GRANT.play_time));
      startEndoAura();
      for(let i=0;i<8;i++) setTimeout(()=>{const bx=cx+(Math.random()-.5)*200,by=cy+(Math.random()-.5)*100; burstGold(12,bx,by); spawnHeart(bx,by);},i*150);
      burstConfetti(60,true); burstGold(30,cx,cy); showEndoText('Play Time! 🎈');
      const wc=waterRef.current;
      if(wc) for(let i=0;i<5;i++) waterParRef.current.push({x:wc.width*(.35+Math.random()*.3),y:wc.height*.85,vx:(Math.random()-.5)*2,vy:-(1+Math.random()*1.5),size:10+Math.random()*14,alpha:.7,color:'#FFD54F',isRipple:true});
      setWaterCanvasActive(true); setTimeout(()=>{if(!waterActiveRef.current) setWaterCanvasActive(false);},2500);
    }

    const candidates = ANIM_MAP[key]||[];
    let match = null;
    for (const name of candidates) {
      match = animsRef.current.find(a=>a[1].toLowerCase().replace(/[\s_]/g,'')=== name.toLowerCase().replace(/[\s_]/g,''))
           || animsRef.current.find(a=>a[1].toLowerCase().includes(name.toLowerCase()));
      if (match) break;
    }
    if (!match) match = animsRef.current[0];
    if (match) {
      const isEndo = ['breathe','laugh','play_time'].includes(key);
      if (!isEndo) { setStatusDot('busy'); setStatusText('Playing…'); }
      apiRef.current.setCurrentAnimationByUID(match[0], (err) => {
        if (!err) {
          apiRef.current.play();
          setBadgeName(match[1]); setBadgeShow(false);
          requestAnimationFrame(()=>setBadgeShow(true));
          setMsgText(`▶ ${match[1]}`);
          if (!isEndo) setTimeout(()=>{setStatusDot('ready'); setStatusText('Ready');},600);
        }
      });
    }
    setTimeout(()=>setActiveBtn(null), 2000);
  }, [burst,burstGold,burstConfetti,spawnCoin,spawnHeart,startWater,stopWater,startEndoAura,flashLightning,showEkAur,showCrown,showEndoText,flashEndoOverlay]);

  useEffect(() => {
    if (!iframeRef.current) return;
    if (!window.Sketchfab) {
      const script = document.createElement('script');
      script.src = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
      script.async = true; script.onload = initSF;
      document.head.appendChild(script);
    } else { initSF(); }
    function initSF() {
      const client = new window.Sketchfab(iframeRef.current);
      client.init('52401c7067f54ff3813da84df073b5f6', {
        success(sfApi) {
          apiRef.current = sfApi; sfApi.start();
          sfApi.addEventListener('viewerready', () => {
            sfApi.getAnimations((err, anims) => {
              if (!err) {
                animsRef.current = anims;
                setStatusDot('ready'); setStatusText('Model ready');
                setMsgText(`${anims.length} animations loaded — drag to rotate · use buttons to trigger rewards`);
                const idle = anims.find(a=>a[1].toLowerCase()==='idle')||anims[0];
                if (idle) sfApi.setCurrentAnimationByUID(idle[0], ()=>sfApi.play());
              } else { setMsgText('⚠️ Could not load animations.'); }
            });
          });
        },
        error() { setStatusDot(''); setStatusText('Load failed'); setMsgText('❌ Failed to connect to Sketchfab.'); },
        autostart:1, transparent:1, ui_controls:0, ui_infos:0, ui_stop:0, ui_inspector:0, ui_watermark:0, ui_ar:0, ui_vr:0, ui_help:0, ui_settings:0, ui_annotations:0, dnt:1,
      });
    }
  }, []);

  const buttons = [
    {key:'streak_fire',icon:'💧',label:'Streak',sub:'water aura',dp:'+25 DP',cls:'btn-streak',img:'/streak.png'},
    {key:'celebrate',icon:'🎉',label:'Celebrate',sub:'victory dance',dp:'+30 DP',cls:'btn-celebrate',img:'/celebrate.png'},
    {key:'challenge_focus',icon:'🎯',label:'Challenge',sub:'focus + burst',dp:'+20 DP',cls:'btn-challenge',img:'/challenge.png'},
    {key:'trick_show',icon:'🌀',label:'Trick Show',sub:'stomp splash',dp:'+18 DP',cls:'btn-trick',img:'/trick.png'},
    {key:'level_up',icon:'⚡',label:'Level Up!',sub:'ek aur!',dp:'+50 DP',cls:'btn-levelup',img:'/levelup.png'},
    {key:'fly',icon:'🦅',label:'Fly',sub:'soar & swoop',dp:'+12 DP',cls:'btn-fly',img:'/fly.png'},
  ];
  const endoButtons = [
    {key:'breathe',icon:'🫁',label:'Breathwork',sub:'calm glow',ep:'+20 EP',cls:'btn-breathe',img:'/breathe.png'},
    {key:'laugh',icon:'😂',label:'Laughter',sub:'joy burst',ep:'+25 EP',cls:'btn-laugh',img:'/laugh.png'},
  ];

  return (
    <div className="tembo-root">
      {!showTembo && (
        <div className={`tembo-loading-overlay${isModelReady?' hidden':''}`}>
          <div className="tembo-loading-container">
            <div className="tembo-loading-rings">
              <div className="tembo-loading-ring"/><div className="tembo-loading-ring"/><div className="tembo-loading-ring"/>
            </div>
            <div className="tembo-loading-text">Initializing Appu...</div>
            <div className="tembo-loading-status">
              <span>Status:</span>
              <span><span className={`tembo-status-indicator${isModelReady?' ready':''}`}/></span>
              <span>{isModelReady?'Model Ready':'Loading Model…'}</span>
            </div>
          </div>
        </div>
      )}

      <div className={`tembo-ambient${ambientEndo?' endo-active':''}`}><span/><span/><span/><span/></div>

      <div className="tembo-layout">
        <header className="tembo-header">
          <div className="tembo-logo">
            <div className={`tembo-logo-icon${logoEndo?' endo-mode':''}`}>🐘</div>
            <div className="tembo-logo-text"><h1>Appu</h1><p>Endorphine Engine · MANAS360</p></div>
          </div>
          <div className="tembo-status-pill">
            <div className={`tembo-status-dot${statusDot?' '+statusDot:''}`}/>
            <span>{statusText}</span>
          </div>
        </header>

        <div className="tembo-main">
          {/* VIEWER */}
          <div className={`tembo-viewer-wrap${viewerClass?' '+viewerClass:''}`}>
            <div className={`tembo-viewer-glow${glowClass?' '+glowClass:''}`}/>

            <div className="tembo-iframe-container">
              <iframe
                ref={iframeRef}
                className="tembo-iframe"
                title="Jungle Animal: Cartoon Elephant"
                frameBorder="0"
                allow="autoplay"
                src="https://sketchfab.com/models/52401c7067f54ff3813da84df073b5f6/embed?api_version=1.0.0&autostart=1&camera=0&preload=1&transparent=1&ui_hint=0&dnt=1&ui_controls=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark=0&ui_ar=0&ui_vr=0&ui_help=0&ui_settings=0&ui_annotations=0"
              />
              {/* masks sit above iframe via z-index, pointer-events:none so they don't block clicks */}
              <div className="tembo-mask-top" />
              <div className="tembo-mask-bottom" />
              <canvas ref={sparkRef}  className="tembo-spark-canvas"/>
              <canvas ref={waterRef}  className={`tembo-water-canvas${waterCanvasActive?' active':''}`}/>
              <canvas ref={breathRef} className={`tembo-breath-canvas${breathActive?' active':''}`}/>
              <div className={`tembo-lightning-overlay${lightFlash?' flash':''}`}/>
              <div className={`tembo-endo-overlay${endoFlash?' flash':''}`}/>
              <div className={`tembo-crown-el${crownShow?' show':''}`}>👑</div>
              <div className={`tembo-ekaaur-text${ekaurPop?' pop':''}`}>Ek Aur! 💧</div>
              <div className={`tembo-endo-text${endoTextPop?' pop':''}`}>{endoTextStr}</div>
              <div className={`tembo-now-playing${badgeShow?' show':''}${badgeEndo?' endo-badge':''}`}>
                <div className="anim-dot"/><span>{badgeName}</span>
              </div>
              {/* drag hint — fades after 5s */}
              {isModelReady && (
                <div className={`tembo-drag-hint${hintFade?' fade':''}`}>
                  🖱️ Drag to rotate · scroll to zoom
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="tembo-sidebar">
            <div className="tembo-dp-meter">
              <div className="tembo-dp-header">
                <div className="tembo-dp-label">🧪 Dopamine</div>
                <div className={`tembo-dp-value${dopamine>=100?' maxed':''}`}>{dopamine}</div>
              </div>
              <div className="tembo-dp-bar-track"><div className="tembo-dp-bar-fill" style={{width:`${dopamine}%`}}/></div>
              <div className="tembo-dp-sublabels">
                <div className="tembo-dp-sub"><div className={`sub-val${streakBlink?' streak-val-water':''}`}>{streak}</div><div className="sub-lbl">💧 Streak</div></div>
                <div className="tembo-dp-sub"><div className="sub-val">{coins}</div><div className="sub-lbl">🪙 Coins</div></div>
                <div className="tembo-dp-sub"><div className="sub-val">{level}</div><div className="sub-lbl">⚡ Level</div></div>
              </div>
            </div>

            <div className={`tembo-endo-meter${endorphins>0?' active':''}`}>
              <div className="tembo-endo-header">
                <div className="tembo-endo-label">🌿 Endorphins</div>
                <div className={`tembo-endo-value${endorphins>=100?' maxed':''}`}>{endorphins}</div>
              </div>
              <div className="tembo-endo-bar-track"><div className="tembo-endo-bar-fill" style={{width:`${endorphins}%`}}/></div>
              <div className="tembo-endo-tagline"><strong>Natural painkiller</strong> — breathwork, play &amp; laughter with your elephant</div>
              <div className="tembo-endo-sublabels">
                <div className="tembo-endo-sub"><div className="sub-val">{breaths}</div><div className="sub-lbl">🫁 Breaths</div></div>
                <div className="tembo-endo-sub"><div className="sub-val">{laughs}</div><div className="sub-lbl">😂 Laughs</div></div>
                <div className="tembo-endo-sub"><div className="sub-val">{playCount}</div><div className="sub-lbl">🎈 Play</div></div>
              </div>
            </div>

            <div className="tembo-reward-panel">
              <div className="tembo-section-label">Reward Actions</div>
              <div className="tembo-reward-grid">
                {buttons.map(b=>(
                  <button key={b.key} className={`tembo-reward-btn ${b.cls}${activeBtn===b.key?' active':''}`} onClick={()=>triggerReward(b.key)} onMouseEnter={(e) => {const img = e.currentTarget.querySelector('.r-image-preview'); if(img) { img.style.display='block'; img.style.left = e.currentTarget.getBoundingClientRect().right + 12 + 'px'; img.style.top = e.currentTarget.getBoundingClientRect().top + 'px'; }}} onMouseLeave={(e) => {const img = e.currentTarget.querySelector('.r-image-preview'); if(img) img.style.display='none';}}>
                    <span className="r-dp">{b.dp}</span>{b.img ? <img src={b.img} alt={b.label} className="r-image" /> : <span className="r-icon">{b.icon}</span>}
                    <span className="r-label">{b.label}</span><span className="r-sub">{b.sub}</span>
                    {b.img && <img src={b.img} alt={`${b.label} preview`} className="r-image-preview" />}
                  </button>
                ))}
                <button className={`tembo-reward-btn btn-plotting${activeBtn==='plotting'?' active':''}`} onClick={()=>triggerReward('plotting')}>
                  <span className="r-dp">+5 DP</span><span className="r-icon">💡</span>
                  <div style={{flex:1,textAlign:'left'}}><div className="r-label">Plotting…</div><div className="r-sub">scheming loop</div></div>
                </button>
                <div className="tembo-endo-section-label">🌿 Endorphins</div>
                {endoButtons.map(b=>(
                  <button key={b.key} className={`tembo-reward-btn ${b.cls}${activeBtn===b.key?' active':''}`} onClick={()=>triggerReward(b.key)} onMouseEnter={(e) => {const img = e.currentTarget.querySelector('.r-image-preview'); if(img) { img.style.display='block'; img.style.left = e.currentTarget.getBoundingClientRect().right + 12 + 'px'; img.style.top = e.currentTarget.getBoundingClientRect().top + 'px'; }}} onMouseLeave={(e) => {const img = e.currentTarget.querySelector('.r-image-preview'); if(img) img.style.display='none';}}>
                    <span className="r-ep">{b.ep}</span>{b.img ? <img src={b.img} alt={b.label} className="r-image" /> : <span className="r-icon">{b.icon}</span>}
                    <span className="r-label">{b.label}</span><span className="r-sub">{b.sub}</span>
                    {b.img && <img src={b.img} alt={`${b.label} preview`} className="r-image-preview" />}
                  </button>
                ))}
                <button className={`tembo-reward-btn btn-play${activeBtn==='play_time'?' active':''}`} onClick={()=>triggerReward('play_time')} onMouseEnter={(e) => {const img = e.currentTarget.querySelector('.r-image-preview'); if(img) { img.style.display='block'; img.style.left = e.currentTarget.getBoundingClientRect().right + 12 + 'px'; img.style.top = e.currentTarget.getBoundingClientRect().top + 'px'; }}} onMouseLeave={(e) => {const img = e.currentTarget.querySelector('.r-image-preview'); if(img) img.style.display='none';}}>
                  <span className="r-ep">+15 EP</span><img src="/playtime.png" alt="Play Time" className="r-image" />
                  <div style={{flex:1,textAlign:'left'}}><div className="r-label">Play Time</div><div className="r-sub">bounce &amp; float</div></div>
                  <img src="/playtime.png" alt="Play Time preview" className="r-image-preview" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="tembo-statusbar">
          <div className="msg"><span>⏳</span><span>{msgText}</span></div>
          <div style={{color:'var(--text-dim)',fontSize:'.68rem',letterSpacing:'1px'}}>MANAS360 · v3.5</div>
        </div>
      </div>
    </div>
  );
}