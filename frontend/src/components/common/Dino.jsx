import { useState, useEffect, useRef, useCallback } from "react";

// ── VOICE MAP ──
const VOICE_MAP = {
  hatch:       { phrase: "Aww! The egg is hatching! Welcome, little one!", pitch: 1.3, rate: 0.95 },
  feed:        { phrase: "Yummy yummy! Your dino loves you for feeding it!", pitch: 1.3, rate: 1.0 },
  nuzzle:      { phrase: "Nuzzle nuzzle! Feel that love bond growing!", pitch: 1.25, rate: 0.95 },
  lullaby:     { phrase: "Shh… rocking to sleep… oxytocin flowing… night night…", pitch: 1.1, rate: 0.75 },
  name:        { phrase: "Your dino has a name! The bond just deepened!", pitch: 1.3, rate: 1.0 },
  heal:        { phrase: "You healed the scratch! Protective love activated!", pitch: 1.3, rate: 1.0 },
  roar:        { phrase: "Raaaawr! Teaching your dino to roar together!", pitch: 1.2, rate: 1.0 },
  goodnight:   { phrase: "Goodnight little one. Sleep tight under the stars.", pitch: 1.1, rate: 0.8 },
};

let cachedVoice = null;
const getPreferredVoice = () => new Promise(resolve => {
  const pick = (list) =>
    list.find(v => /swara|microsoft.*hindi/i.test(v.name)) ||
    list.find(v => v.lang === 'hi-IN') ||
    list.find(v => /neerja|microsoft.*india/i.test(v.name)) ||
    list.find(v => v.lang === 'en-IN') ||
    list.find(v => v.name === 'Samantha') ||
    list.find(v => /zira|hazel|karen|victoria|moira|fiona|tessa/i.test(v.name)) ||
    list.find(v => v.lang.startsWith('en')) || list[0];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) return resolve(pick(voices));
  window.speechSynthesis.addEventListener('voiceschanged', () => resolve(pick(window.speechSynthesis.getVoices())), { once: true });
});
const speakFor = async (key) => {
  const v = VOICE_MAP[key]; if (!v || !window.speechSynthesis) return;
  if (!cachedVoice) cachedVoice = await getPreferredVoice();
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(v.phrase);
  utt.pitch = v.pitch; utt.rate = v.rate; utt.volume = 1;
  if (cachedVoice) utt.voice = cachedVoice;
  window.speechSynthesis.speak(utt);
};

// ── ANIMATION MAP ──
const ANIM_MAP = {
  hatch:     ['Get_Up', 'Land', 'Idle'],
  feed:      ['Bite', 'Shake', 'Idle'],
  nuzzle:    ['Look_Back', 'Shake', 'Idle'],
  // FIX: lullaby uses Die at 0.1x speed (same as goodnight)
  lullaby:   ['Die'],
  name:      ['Roar', 'Shake', 'Idle'],
  heal:      ['Scratch', 'Idle'],
  roar:      ['Roar', 'Idle'],
  goodnight: ['Die'],
  idle:      ['Idle'],
};

const OX_GRANT = {
  hatch: 30, feed: 20, nuzzle: 25, lullaby: 20,
  name: 35, heal: 40, roar: 15, goodnight: 25,
};

const PASTEL_COLORS = ['#a8e6cf','#dcedc1','#fff9c4','#f0fff0','#b2dfdb','#e8f5e9','#fff'];
const HEART_COLORS  = ['#ff8fab','#ffb3c6','#ffc8dd','#ffafc5','#ff85a1','#fff'];
const SPARKLE_COLS  = ['#a8e6cf','#69d2a0','#fff','#fffde7','#c8f7c5','#80cbc4'];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Quicksand:wght@400;500;600;700&display=swap');

  .dino-root *, .dino-root *::before, .dino-root *::after { margin:0; padding:0; box-sizing:border-box; }

  .dino-root {
    --bg:        #f0faf4;
    --bg2:       #e8f5e9;
    --panel:     #ffffff;
    --border:    #c8e6c9;
    --green:     #2e7d32;
    --greenLt:   #66bb6a;
    --greenPal:  #a5d6a7;
    --mint:      #b2dfdb;
    --sage:      #80cbc4;
    --gold:      #fff9c4;
    --cream:     #fffde7;
    --text:      #1b5e20;
    --text-mid:  #388e3c;
    --text-dim:  #81c784;
    --rose:      #ff8fab;
    --oxytocin:  #69d2a0;
    font-family:'Quicksand',sans-serif;
    background:var(--bg);
    color:var(--text);
    overflow-x:hidden;
    min-height:100vh;
    position:relative;
  }

  @keyframes dino-breathe   { 0%,100%{opacity:.15;transform:scale(1)} 50%{opacity:.28;transform:scale(1.05)} }
  @keyframes dino-float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes dino-shimmer   { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes dino-bulge     { 0%,100%{transform:scale(1)} 50%{transform:scale(1.14)} }
  @keyframes dino-heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.2)} 28%{transform:scale(1)} 42%{transform:scale(1.18)} }
  @keyframes dino-pop       { 0%{transform:translate(-50%,-50%) scale(0) rotate(-8deg);opacity:0} 60%{transform:translate(-50%,-50%) scale(1.1) rotate(2deg);opacity:1} 100%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1} }
  @keyframes dino-starDrop  { 0%{transform:translateY(-20px) scale(0);opacity:0} 60%{transform:translateY(4px) scale(1.2);opacity:1} 100%{transform:translateY(0) scale(1);opacity:1} }
  @keyframes dino-spin      { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
  @keyframes dino-gentlePulse { 0%,100%{transform:scale(1);opacity:.65} 50%{transform:scale(1.1);opacity:1} }
  @keyframes dino-leafSway  { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
  @keyframes dino-bounce    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes dino-eggWobble { 0%,100%{transform:rotate(0) scale(1)} 20%{transform:rotate(-8deg) scale(1.04)} 40%{transform:rotate(8deg) scale(1.04)} 60%{transform:rotate(-5deg) scale(1.02)} 80%{transform:rotate(5deg) scale(1.02)} }
  @keyframes dino-eggFall   { 0%{transform:translateY(-120px) rotate(-15deg);opacity:0} 60%{transform:translateY(8px) rotate(5deg);opacity:1} 80%{transform:translateY(-4px) rotate(-2deg)} 100%{transform:translateY(0) rotate(0);opacity:1} }
  @keyframes dino-eggCrack  { 0%{transform:scale(1) rotate(0)} 25%{transform:scale(1.08) rotate(-10deg)} 50%{transform:scale(1.12) rotate(10deg)} 75%{transform:scale(1.05) rotate(-5deg)} 100%{transform:scale(0) rotate(20deg);opacity:0} }
  @keyframes dino-hatchRise { 0%{transform:translateY(40px) scale(0.5);opacity:0} 70%{transform:translateY(-8px) scale(1.08);opacity:1} 100%{transform:translateY(0) scale(1);opacity:1} }
  @keyframes dino-bgPulse   { 0%,100%{opacity:.18} 50%{opacity:.32} }

  /* ── LOADING ── */
  .dino-loading { position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:9999;transition:opacity .6s; }
  .dino-loading.hidden { opacity:0;pointer-events:none; }
  .dino-egg-loader { font-size:3.5rem;animation:dino-eggWobble 1.2s ease-in-out infinite; }
  .dino-load-text  { font-family:'Nunito',sans-serif;font-size:1.1rem;font-weight:800;color:var(--green);margin:16px 0 8px;letter-spacing:.5px; }
  .dino-load-sub   { font-size:.8rem;color:var(--text-dim);font-weight:600; }
  .dino-load-dots  { display:inline-flex;gap:5px;margin-top:12px; }
  .dino-load-dot   { width:8px;height:8px;border-radius:50%;background:var(--greenPal);animation:dino-gentlePulse 1.2s ease-in-out infinite; }
  .dino-load-dot:nth-child(2){animation-delay:.2s} .dino-load-dot:nth-child(3){animation-delay:.4s}

  /* ── AMBIENT ── */
  .dino-ambient { position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden; }
  .dino-ambient span { position:absolute;border-radius:50%;filter:blur(90px);animation:dino-breathe 7s ease-in-out infinite; }
  .dino-ambient span:nth-child(1){width:600px;height:600px;background:radial-gradient(circle,#a5d6a755,transparent 70%);top:-200px;left:-150px;}
  .dino-ambient span:nth-child(2){width:400px;height:400px;background:radial-gradient(circle,#b2dfdb44,transparent 70%);bottom:-100px;right:-80px;animation-delay:3s;}
  .dino-ambient span:nth-child(3){width:350px;height:350px;background:radial-gradient(circle,#fff9c455,transparent 70%);top:35%;left:55%;animation-delay:1.5s;}
  .dino-ambient span:nth-child(4){width:500px;height:500px;background:radial-gradient(circle,#ff8fab22,transparent 70%);top:20%;left:25%;animation:dino-bgPulse 5s ease-in-out infinite;animation-delay:2s;}

  /* ── LAYOUT ── */
  .dino-layout { position:relative;z-index:1;min-height:100vh;display:grid;grid-template-rows:auto 1fr auto;max-width:1100px;margin:0 auto;padding:28px 20px 32px; }
  .dino-header { display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:2px solid var(--border);margin-bottom:20px; }
  .dino-logo   { display:flex;align-items:center;gap:14px; }
  .dino-logo-icon { width:52px;height:52px;background:linear-gradient(135deg,#66bb6a,#2e7d32);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 4px 24px rgba(46,125,50,.25);animation:dino-bounce 3s ease-in-out infinite; }
  .dino-logo-text h1 { font-family:'Nunito',sans-serif;font-size:1.6rem;font-weight:900;color:var(--green);letter-spacing:-.5px; }
  .dino-logo-text p  { font-size:.7rem;font-weight:600;color:var(--text-dim);letter-spacing:3px;text-transform:uppercase;margin-top:1px; }
  .dino-logo-love     { font-size:.65rem;color:#ff8fab;margin-top:3px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700; }
  .dino-status-pill { display:flex;align-items:center;gap:8px;background:var(--panel);border:2px solid var(--border);border-radius:50px;padding:7px 16px;font-size:.75rem;color:var(--text-mid);font-weight:700;box-shadow:0 2px 12px rgba(46,125,50,.08); }
  .dino-status-dot  { width:8px;height:8px;border-radius:50%;background:#c8e6c9;transition:all .4s; }
  .dino-status-dot.ready { background:#66bb6a;box-shadow:0 0 8px #66bb6a; }
  .dino-status-dot.busy  { background:#ff8fab;box-shadow:0 0 8px #ff8fab;animation:dino-gentlePulse 1s infinite; }
  .dino-main { display:grid;grid-template-columns:1fr 310px;gap:18px;align-items:start; }

  /* ── VIEWER ── */
  .dino-viewer-wrap { position:relative;border-radius:28px;overflow:hidden;border:2px solid var(--border);background:linear-gradient(160deg,#f9fff9,#e8f5e9);box-shadow:0 8px 60px rgba(46,125,50,.12),0 2px 0 #fff,inset 0 0 80px rgba(165,214,167,.1);transition:box-shadow .5s; }
  .dino-viewer-wrap.love-active { box-shadow:0 0 0 3px #ff8fab55,0 8px 60px rgba(255,143,171,.2),0 2px 0 #fff; }
  .dino-viewer-glow { position:absolute;inset:0;pointer-events:none;z-index:2;background:radial-gradient(ellipse at 50% 85%,rgba(165,214,167,.15),transparent 70%);transition:background .6s; }
  .dino-viewer-glow.warm   { background:radial-gradient(ellipse at 50% 70%,rgba(255,143,171,.2),transparent 65%); }
  .dino-viewer-glow.night  { background:radial-gradient(ellipse at 50% 50%,rgba(178,223,219,.2),rgba(255,249,196,.12) 50%,transparent 80%); }

  .dino-iframe-container { position:relative;width:100%;height:500px;overflow:hidden;border-radius:26px; }
  .dino-iframe { position:absolute;
    /* Pull the iframe outside the container on all sides to hide Sketchfab chrome */
    top:-52px;
    left:-1px;
    width:calc(100% + 2px);
    /* Add extra height to compensate for the negative top offset + bottom bar */
    height:calc(100% + 52px + 60px);
    border:none;
    display:block;
    pointer-events:all;
    z-index:1;
    opacity:1;
    transition:opacity .6s ease;
  }
  .dino-iframe.hidden { opacity:0;pointer-events:none; }

  /* ── MASKS: sit on top of the iframe (z-index > iframe's 1), solid color to fully cover chrome ── */
  .dino-mask-top {
    position:absolute;
    top:0; left:0; right:0;
    height:52px;
    z-index:10;
    pointer-events:none;
    /* Use the exact same color as the viewer background */
    background:#eef7ef;
    border-radius:26px 26px 0 0;
  }
  .dino-mask-bottom {
    position:absolute;
    bottom:0; left:0; right:0;
    height:60px;
    z-index:10;
    pointer-events:none;
    background:#eef7ef;
    border-radius:0 0 26px 26px;
  }

  /* ── EGG OVERLAY ── */
  .dino-egg-overlay { position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;background:linear-gradient(160deg,#f9fff9ee,#e8f5e9ee); }
  .dino-egg-overlay.hidden { opacity:0;pointer-events:none;transition:opacity .8s; }
  .dino-egg-main { font-size:7rem;line-height:1;filter:drop-shadow(0 8px 24px rgba(46,125,50,.2)); }
  .dino-egg-main.falling { animation:dino-eggFall .8s cubic-bezier(.34,1.56,.64,1) forwards; }
  .dino-egg-main.cracking { animation:dino-eggCrack .6s ease-in-out forwards; }
  .dino-egg-hint { font-family:'Nunito',sans-serif;font-size:1.1rem;font-weight:800;color:var(--green);margin-top:16px;opacity:.8;animation:dino-bounce 2s ease-in-out infinite; }
  .dino-egg-sub  { font-size:.8rem;color:var(--text-dim);margin-top:6px;font-weight:600; }
  .dino-egg-tap-btn { margin-top:24px;background:linear-gradient(135deg,#66bb6a,#2e7d32);color:#fff;font-family:'Nunito',sans-serif;font-weight:800;font-size:1rem;padding:12px 28px;border-radius:50px;border:none;cursor:pointer;pointer-events:all;box-shadow:0 4px 20px rgba(46,125,50,.3);transition:transform .15s;letter-spacing:.5px; }
  .dino-egg-tap-btn:hover { transform:scale(1.05); }
  .dino-egg-tap-btn:active { transform:scale(.96); }

  /* ── NAME INPUT ── */
  .dino-name-overlay { position:absolute;inset:0;z-index:28;display:flex;align-items:center;justify-content:center;background:rgba(240,250,244,.92);backdrop-filter:blur(8px); }
  .dino-name-box { background:#fff;border:2px solid var(--border);border-radius:20px;padding:28px 24px;text-align:center;box-shadow:0 8px 40px rgba(46,125,50,.12);width:280px; }
  .dino-name-box h3 { font-family:'Nunito',sans-serif;font-weight:900;font-size:1.2rem;color:var(--green);margin-bottom:8px; }
  .dino-name-box p  { font-size:.8rem;color:var(--text-dim);margin-bottom:16px;font-weight:600; }
  .dino-name-input { width:100%;border:2px solid var(--border);border-radius:12px;padding:10px 14px;font-family:'Nunito',sans-serif;font-size:1rem;font-weight:700;color:var(--green);background:#f9fff9;outline:none;text-align:center;transition:border-color .2s; }
  .dino-name-input:focus { border-color:var(--greenLt); }
  .dino-name-btn { margin-top:12px;background:linear-gradient(135deg,#66bb6a,#2e7d32);color:#fff;font-family:'Nunito',sans-serif;font-weight:800;font-size:.9rem;padding:10px 22px;border-radius:50px;border:none;cursor:pointer;box-shadow:0 3px 14px rgba(46,125,50,.25);transition:transform .15s; }
  .dino-name-btn:hover { transform:scale(1.04); }

  .dino-spark-canvas  { position:absolute;inset:0;pointer-events:none;z-index:20; }
  .dino-float-text { position:absolute;top:28%;left:50%;transform:translate(-50%,-50%) scale(0);font-family:'Nunito',sans-serif;font-size:2.6rem;font-weight:900;color:var(--green);text-shadow:0 4px 20px rgba(46,125,50,.2),0 0 40px rgba(165,214,167,.5);pointer-events:none;z-index:25;white-space:nowrap;opacity:0; }
  .dino-float-text.pop { animation:dino-pop .5s cubic-bezier(.34,1.56,.64,1) forwards;opacity:1; }
  .dino-stars-overlay { position:absolute;top:10px;left:50%;transform:translateX(-50%);font-size:2rem;pointer-events:none;z-index:24;opacity:0; }
  .dino-stars-overlay.show { animation:dino-starDrop .5s cubic-bezier(.34,1.56,.64,1) forwards; }
  .dino-now-playing { position:absolute;bottom:68px;left:16px;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border:2px solid var(--border);border-radius:12px;padding:8px 14px;font-family:'Nunito',sans-serif;font-size:.78rem;color:var(--green);display:none;align-items:center;gap:8px;z-index:26;pointer-events:none;font-weight:700; }
  .dino-now-playing.show { display:flex; }
  .dino-now-playing .anim-dot { width:7px;height:7px;border-radius:50%;background:var(--greenLt);box-shadow:0 0 6px var(--greenLt);animation:dino-gentlePulse 1s ease-in-out infinite; }
  .dino-drag-hint { position:absolute;bottom:68px;right:14px;background:rgba(255,255,255,.82);backdrop-filter:blur(8px);border:2px solid var(--border);border-radius:10px;padding:5px 12px;font-size:.65rem;color:var(--text-mid);pointer-events:none;z-index:27;display:flex;align-items:center;gap:5px;font-weight:600;opacity:1;transition:opacity 1.2s; }
  .dino-drag-hint.fade { opacity:0; }

  /* ── SIDEBAR ── */
  .dino-sidebar { display:flex;flex-direction:column;gap:12px; }

  .dino-ox-meter { background:var(--panel);border:2px solid var(--border);border-radius:20px;padding:18px;position:relative;overflow:hidden;box-shadow:0 4px 24px rgba(46,125,50,.07); }
  .dino-ox-meter::before { content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 110%,rgba(165,214,167,.12),transparent 60%);pointer-events:none; }
  .dino-ox-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:12px; }
  .dino-ox-label  { font-family:'Nunito',sans-serif;font-size:.6rem;font-weight:800;letter-spacing:3.5px;text-transform:uppercase;color:var(--text-dim); }
  .dino-ox-value  { font-family:'Nunito',sans-serif;font-size:1.7rem;font-weight:900;color:var(--green);line-height:1;transition:color .3s; }
  .dino-ox-value.maxed { color:#ff8fab;text-shadow:0 0 16px #ff8fab55;animation:dino-heartbeat .8s ease; }
  .dino-ox-bar-track { height:10px;background:#e8f5e9;border-radius:5px;overflow:hidden; }
  .dino-ox-bar-fill  { height:100%;border-radius:5px;background:linear-gradient(90deg,var(--greenLt),var(--sage),var(--greenPal));transition:width .8s cubic-bezier(.34,1.56,.64,1);position:relative; }
  .dino-ox-bar-fill::after { content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);background-size:200% 100%;animation:dino-shimmer 2s infinite; }
  .dino-ox-tagline { font-size:.65rem;color:var(--text-dim);letter-spacing:1px;line-height:1.6;font-weight:600;margin-top:10px; }
  .dino-ox-tagline strong { color:var(--green); }
  .dino-ox-sublabels { display:flex;gap:8px;margin-top:12px; }
  .dino-ox-sub { flex:1;background:#f0faf4;border:2px solid var(--border);border-radius:10px;padding:8px 6px;text-align:center; }
  .dino-ox-sub .sub-val { font-family:'Nunito',sans-serif;font-size:1.1rem;font-weight:900;color:var(--green); }
  .dino-ox-sub .sub-lbl { font-size:.57rem;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-top:2px;font-weight:700; }
  .dino-name-display { margin-top:10px;text-align:center;padding:8px 14px;background:#f0faf4;border-radius:12px;border:2px solid var(--border); }
  .dino-name-display .dn-name { font-family:'Nunito',sans-serif;font-size:1.1rem;font-weight:900;color:var(--green); }
  .dino-name-display .dn-label { font-size:.62rem;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-top:2px; }

  .dino-action-panel { background:var(--panel);border:2px solid var(--border);border-radius:20px;padding:16px;box-shadow:0 4px 24px rgba(46,125,50,.07); }
  .dino-section-label { font-family:'Nunito',sans-serif;font-size:.6rem;font-weight:800;letter-spacing:3.5px;text-transform:uppercase;color:var(--text-dim);padding:0 2px 10px;border-bottom:2px solid var(--border);margin-bottom:12px; }
  .dino-action-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px; }

  .dino-action-btn { position:relative;overflow:hidden;border:2px solid var(--border);border-radius:14px;font-family:'Quicksand',sans-serif;font-weight:700;cursor:pointer;transition:all .18s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:14px 8px;background:linear-gradient(145deg,#ffffff,#f0faf4);color:var(--text-mid);text-align:center; }
  .dino-action-btn:hover { transform:translateY(-3px);box-shadow:0 6px 20px rgba(46,125,50,.15); }
  .dino-action-btn:active { transform:scale(.95); }
  .dino-action-btn.active { animation:dino-bounce .5s ease infinite; }
  .dino-action-btn .a-icon  { font-size:1.7rem;line-height:1;display:block;z-index:2;position:relative; }
  .dino-action-btn .a-label { font-size:.72rem;font-weight:800;letter-spacing:.3px;z-index:2;position:relative; }
  .dino-action-btn .a-sub   { font-size:.58rem;color:var(--text-dim);letter-spacing:1.5px;text-transform:uppercase;z-index:2;position:relative; }
  .dino-action-btn .a-ox    { position:absolute;top:6px;right:6px;font-size:.52rem;font-family:'Nunito',sans-serif;font-weight:900;padding:2px 6px;border-radius:6px;background:rgba(105,210,160,.15);color:var(--green);letter-spacing:.5px;z-index:3; }

  .btn-hatch:hover,.btn-hatch.active     { border-color:#66bb6a;color:#2e7d32;box-shadow:0 0 18px rgba(102,187,106,.25); }
  .btn-feed:hover,.btn-feed.active       { border-color:#80cbc4;color:#00695c;box-shadow:0 0 16px rgba(128,203,196,.25); }
  .btn-nuzzle:hover,.btn-nuzzle.active   { border-color:#ff8fab;color:#c2185b;box-shadow:0 0 18px rgba(255,143,171,.25); }
  .btn-lullaby:hover,.btn-lullaby.active { border-color:#b2dfdb;color:#00796b;box-shadow:0 0 20px rgba(178,223,219,.3); }
  .btn-name:hover,.btn-name.active       { border-color:#69d2a0;color:#1b5e20;box-shadow:0 0 16px rgba(105,210,160,.3); }
  .btn-heal:hover,.btn-heal.active       { border-color:#ffcdd2;color:#c62828;box-shadow:0 0 18px rgba(255,205,210,.4); }
  .btn-roar:hover,.btn-roar.active       { border-color:#a5d6a7;color:#1b5e20;box-shadow:0 0 18px rgba(165,214,167,.3); }
  .btn-goodnight:hover,.btn-goodnight.active { border-color:#b2dfdb;color:#004d40;box-shadow:0 0 20px rgba(178,223,219,.35); }
  .btn-dying:hover,.btn-dying.active { border-color:#b2dfdb;color:#00796b;box-shadow:0 0 18px rgba(178,223,219,.3); }

  .dino-statusbar { margin-top:18px;padding-top:16px;border-top:2px solid var(--border);display:flex;align-items:center;justify-content:space-between;font-size:.72rem;color:var(--text-dim);font-weight:700; }

  @media (max-width:768px) {
    .dino-main { grid-template-columns:1fr; }
    .dino-iframe-container { height:320px; }
  }
`;

export default function Dino() {
  const [oxytocin, setOxytocin]     = useState(15);
  const [bonds, setBonds]           = useState(0);
  const [hugs, setHugs]             = useState(0);
  const [feeds, setFeeds]           = useState(0);
  const [hatched, setHatched]       = useState(false);
  const [eggPhase, setEggPhase]     = useState('idle');
  const [dinoName, setDinoName]     = useState('');
  const [nameInput, setNameInput]   = useState('');
  const [showNameBox, setShowNameBox] = useState(false);
  const [statusDot, setStatusDot]   = useState('');
  const [statusText, setStatusText] = useState('Loading…');
  const [msgText, setMsgText]       = useState('Preparing nest…');
  const [activeBtn, setActiveBtn]   = useState(null);
  const [glowClass, setGlowClass]   = useState('');
  const [viewerClass, setViewerClass] = useState('');
  const [badgeName, setBadgeName]   = useState('Idle');
  const [badgeShow, setBadgeShow]   = useState(false);
  const [floatText, setFloatText]   = useState('');
  const [floatPop, setFloatPop]     = useState(false);
  const [starsShow, setStarsShow]   = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [showDino, setShowDino]     = useState(false);
  const [hintFade, setHintFade]     = useState(false);

  const iframeRef = useRef(null);
  const sparkRef  = useRef(null);
  const apiRef    = useRef(null);
  const animsRef  = useRef([]);

  // FIX: Use a single flat array per type — faster than filtering objects each frame
  const sparksRef = useRef([]);
  const heartsRef = useRef([]);
  const leavesRef = useRef([]);
  const starsRef  = useRef([]);
  const confRef   = useRef([]);
  const rafIdRef  = useRef(null);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    const id = 'dino-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id; tag.textContent = CSS;
      document.head.appendChild(tag);
    }
  }, []);

  useEffect(() => {
    if (statusDot === 'ready' && !isModelReady) {
      setIsModelReady(true);
      setTimeout(() => setShowDino(true), 400);
    }
  }, [statusDot, isModelReady]);

  useEffect(() => {
    if (isModelReady) {
      const t = setTimeout(() => setHintFade(true), 5000);
      return () => clearTimeout(t);
    }
  }, [isModelReady]);

  useEffect(() => {
    function resize() {
      const c = sparkRef.current; if (!c) return;
      const w = c.parentElement?.offsetWidth||600, h = c.parentElement?.offsetHeight||500;
      c.width = w; c.height = h;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── OPTIMISED canvas loop — target 60fps, skip frame if <14ms since last ──
  useEffect(() => {
    const canvas = sparkRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    // FIX: faster decay rates so particles don't linger / feel laggy
    const ALPHA_DECAY_SPARK = 0.88;   // was 0.94
    const ALPHA_DECAY_HEART = 0.93;   // was 0.97
    const ALPHA_DECAY_LEAF  = 0.96;   // was 0.985
    const ALPHA_DECAY_STAR  = 0.95;   // was 0.983
    const ALPHA_DECAY_CONF  = 0.96;   // was 0.985
    const SIZE_DECAY_SPARK  = 0.94;   // was 0.97
    const THRESHOLD = 0.06;

    function loop(ts) {
      // throttle: skip if <14ms since last frame (≈72fps cap, avoids double-draws)
      if (ts - lastFrameRef.current < 14) {
        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }
      lastFrameRef.current = ts;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── sparks ──
      const nextSparks = [];
      for (let i = 0; i < sparksRef.current.length; i++) {
        const s = sparksRef.current[i];
        s.x += s.vx; s.y += s.vy; s.vy += .12; s.vx *= .96;
        s.alpha *= ALPHA_DECAY_SPARK; s.size *= SIZE_DECAY_SPARK;
        if (s.alpha <= THRESHOLD) continue;
        nextSparks.push(s);
        ctx.save(); ctx.globalAlpha = s.alpha; ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill(); ctx.restore();
      }
      sparksRef.current = nextSparks;

      // ── hearts ──
      const nextHearts = [];
      for (let i = 0; i < heartsRef.current.length; i++) {
        const h = heartsRef.current[i];
        h.x += h.vx; h.y += h.vy; h.vy -= .05; h.vx *= .99;
        h.alpha *= ALPHA_DECAY_HEART; h.size *= 1.004;
        if (h.alpha <= THRESHOLD) continue;
        nextHearts.push(h);
        ctx.save(); ctx.globalAlpha = h.alpha;
        ctx.font = `${h.size}px serif`; ctx.textAlign = 'center';
        ctx.fillText('❤️', h.x, h.y); ctx.restore();
      }
      heartsRef.current = nextHearts;

      // ── leaves ──
      const nextLeaves = [];
      for (let i = 0; i < leavesRef.current.length; i++) {
        const l = leavesRef.current[i];
        l.x += l.vx; l.y += l.vy; l.vy += .05; l.vx *= .995;
        l.alpha *= ALPHA_DECAY_LEAF; l.rot += l.rotV;
        if (l.alpha <= THRESHOLD) continue;
        nextLeaves.push(l);
        ctx.save(); ctx.globalAlpha = l.alpha; ctx.translate(l.x, l.y); ctx.rotate(l.rot);
        ctx.font = `${l.size}px serif`; ctx.textAlign = 'center';
        ctx.fillText(['🍃','🌿','✨','🌱'][l.type], 0, 0); ctx.restore();
      }
      leavesRef.current = nextLeaves;

      // ── stars ──
      const nextStars = [];
      for (let i = 0; i < starsRef.current.length; i++) {
        const s = starsRef.current[i];
        s.x += s.vx; s.y += s.vy; s.vy -= .06;
        s.alpha *= ALPHA_DECAY_STAR; s.size *= 1.008;
        if (s.alpha <= THRESHOLD) continue;
        nextStars.push(s);
        ctx.save(); ctx.globalAlpha = s.alpha;
        ctx.font = `${s.size}px serif`; ctx.textAlign = 'center';
        ctx.fillText('⭐', s.x, s.y); ctx.restore();
      }
      starsRef.current = nextStars;

      // ── confetti ──
      const nextConf = [];
      for (let i = 0; i < confRef.current.length; i++) {
        const c = confRef.current[i];
        c.x += c.vx; c.y += c.vy; c.vy += .09; c.vx *= .99;
        c.alpha *= ALPHA_DECAY_CONF; c.rot += c.rotV;
        if (c.alpha <= THRESHOLD) continue;
        nextConf.push(c);
        ctx.save(); ctx.globalAlpha = c.alpha; ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        ctx.fillStyle = c.color; ctx.fillRect(-c.w/2, -c.h/2, c.w, c.h); ctx.restore();
      }
      confRef.current = nextConf;

      rafIdRef.current = requestAnimationFrame(loop);
    }
    rafIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  const burst = useCallback((n, cfg={}) => {
    const canvas = sparkRef.current; if (!canvas) return;
    const cx = canvas.width*(cfg.cx||0.45), cy = canvas.height*(cfg.cy||0.52);
    const colors = cfg.colors || SPARKLE_COLS;
    for (let i=0;i<n;i++) {
      const angle = Math.random()*Math.PI*2, spd = 2+Math.random()*5;
      sparksRef.current.push({
        x:cx+(Math.random()-.5)*80, y:cy+(Math.random()-.5)*50,
        vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd-2.5,
        color:colors[Math.floor(Math.random()*colors.length)],
        alpha:1, size:3+Math.random()*5,
      });
    }
  }, []);

  const spawnHearts = useCallback((n, cx, cy) => {
    for (let i=0;i<n;i++) {
      heartsRef.current.push({
        x:cx+(Math.random()-.5)*120, y:cy+(Math.random()-.5)*80,
        vx:(Math.random()-.5)*2, vy:-1.5-Math.random()*2,
        alpha:1, size:14+Math.random()*14,
      });
    }
  }, []);

  const spawnLeaves = useCallback((n) => {
    const canvas = sparkRef.current; if (!canvas) return;
    for (let i=0;i<n;i++) {
      leavesRef.current.push({
        x:canvas.width*(.1+Math.random()*.8), y:canvas.height*.1,
        vx:(Math.random()-.5)*2.5, vy:-1-Math.random()*2,
        alpha:1, rot:Math.random()*Math.PI*2,
        rotV:(Math.random()-.5)*.1, size:16+Math.random()*12,
        type:Math.floor(Math.random()*4),
      });
    }
  }, []);

  const spawnStars = useCallback((n) => {
    const canvas = sparkRef.current; if (!canvas) return;
    for (let i=0;i<n;i++) {
      starsRef.current.push({
        x:canvas.width*(.15+Math.random()*.7), y:canvas.height*.55,
        vx:(Math.random()-.5)*2, vy:-2-Math.random()*3,
        alpha:1, size:12+Math.random()*10,
      });
    }
  }, []);

  const spawnConfetti = useCallback((n) => {
    const canvas = sparkRef.current; if (!canvas) return;
    for (let i=0;i<n;i++) {
      confRef.current.push({
        x:canvas.width*(.2+Math.random()*.6), y:canvas.height*.15,
        vx:(Math.random()-.5)*5, vy:-3-Math.random()*4,
        color:PASTEL_COLORS[Math.floor(Math.random()*PASTEL_COLORS.length)],
        alpha:1, w:6+Math.random()*8, h:4+Math.random()*4,
        rot:Math.random()*Math.PI*2, rotV:(Math.random()-.5)*.18,
      });
    }
  }, []);

  const showFloat = useCallback((msg) => {
    setFloatText(msg); setFloatPop(false);
    requestAnimationFrame(() => setFloatPop(true));
    setTimeout(() => setFloatPop(false), 1600);
  }, []);

  const showStarsAnim = useCallback(() => {
    apiRef.current.setSpeed(0.1);
    requestAnimationFrame(() => setStarsShow(true));
    setTimeout(() => setStarsShow(false), 2000);
  }, []);

  // ── FIX: unified helper to play a Die animation at slow speed ──
  const playSleepAnim = useCallback(() => {
    if (!apiRef.current || animsRef.current.length === 0) return;
    const dieAnim = animsRef.current.find(a => a[1].toLowerCase().includes('die')) || animsRef.current[0];
    if (!dieAnim) return;
    apiRef.current.setCurrentAnimationByUID(dieAnim[0], (err) => {
      if (err) return;
      // Disable loop so it plays once and holds the final frame
      if (apiRef.current.setLoopMode) {
        try { apiRef.current.setLoopMode(0); } catch(e) {}
      }
      // FIX: play Die at 0.1x speed for sleep effect
      if (apiRef.current.setSpeed) {
        try { apiRef.current.setSpeed(0.1); } catch(e) {}
      }
      apiRef.current.play();
      setBadgeName(`Sleep`);
      setBadgeShow(false);
      requestAnimationFrame(() => setBadgeShow(true));
      setMsgText(`▶ ${dieAnim[1]} (0.1x — sleeping…)`);
    });
  }, []);

  const playAnim = useCallback((key, speed = 1) => {
    // FIX: lullaby and goodnight both use the sleep helper
    if (key === 'lullaby' || key === 'goodnight' || key === 'dying') {
      playSleepAnim();
      return;
    }

    if (!apiRef.current || animsRef.current.length === 0) return;
    const candidates = ANIM_MAP[key] || ['Idle'];
    let match = null;
    for (const name of candidates) {
      match = animsRef.current.find(a => a[1].toLowerCase().replace(/[\s_]/g,'') === name.toLowerCase().replace(/[\s_]/g,''))
           || animsRef.current.find(a => a[1].toLowerCase().includes(name.toLowerCase()));
      if (match) break;
    }
    if (!match) match = animsRef.current.find(a => a[1].toLowerCase().includes('idle')) || animsRef.current[0];
    if (match) {
      apiRef.current.setCurrentAnimationByUID(match[0], (err) => {
        if (!err) {
          const isOneTime = ['Get_Up', 'Die'].some(n => match[1].toLowerCase().includes(n.toLowerCase()));
          if (isOneTime && apiRef.current.setLoopMode) {
            try { apiRef.current.setLoopMode(0); } catch(e) {}
          }
          if (speed !== 1 && apiRef.current.setSpeed) {
            try { apiRef.current.setSpeed(speed); } catch(e) {}
          }
          apiRef.current.play();
          setBadgeName(match[1]); setBadgeShow(false);
          requestAnimationFrame(() => setBadgeShow(true));
          setMsgText(`▶ ${match[1]}${speed !== 1 ? ` (${speed}x)` : ''}`);

          if (isOneTime) {
            setTimeout(() => {
              if (!apiRef.current) return;
              const idle = animsRef.current.find(a => a[1].toLowerCase().includes('idle')) || animsRef.current[0];
              if (idle) {
                apiRef.current.setCurrentAnimationByUID(idle[0], (e) => {
                  if (!e) {
                    if (apiRef.current.setLoopMode) { try { apiRef.current.setLoopMode(1); } catch(ex) {} }
                    if (apiRef.current.setSpeed)    { try { apiRef.current.setSpeed(1); } catch(ex) {} }
                    apiRef.current.play();
                  }
                });
              }
            }, 2000);
          }
        }
      });
    }
  }, [playSleepAnim]);

  const triggerAction = useCallback((key) => {
    if (!hatched && key !== 'hatch') { showFloat('Hatch the egg first! 🥚'); return; }
    speakFor(key);
    setActiveBtn(key);
    setStatusDot('busy'); setStatusText('Playing…');
    setOxytocin(d => Math.min(100, d + (OX_GRANT[key]||15)));
    const canvas = sparkRef.current;
    const cx = (canvas?.width||600)*.45, cy = (canvas?.height||500)*.5;
    apiRef.current.setSpeed(1.0);
    if (key === 'hatch') {
      if (hatched) { showFloat('Already hatched! 🦕'); return; }
      setEggPhase('falling');
      burst(30, {colors:['#a5d6a7','#fff9c4','#fff']});
      setTimeout(() => {
        setEggPhase('cracking');
        burst(60, {colors:SPARKLE_COLS, cx:.45, cy:.5});
        spawnLeaves(10);
        spawnConfetti(60);
        setTimeout(() => {
          setEggPhase('hidden');
          setHatched(true);
          burst(80, {colors:['#69d2a0','#fff','#a5d6a7'], cx:.45, cy:.55});
          spawnLeaves(15);
          spawnHearts(8, cx, cy);
          showFloat('Welcome! 🦕💚');
          setBonds(b => b+1);
          playAnim('hatch');
          showStarsAnim();
          setGlowClass('warm');
          setTimeout(() => setGlowClass(''), 3000);
        }, 700);
      }, 900);

    } else if (key === 'feed') {
      setFeeds(f=>f+1); setBonds(b=>b+1);
      burst(50, {colors:['#80cbc4','#a5d6a7','#fff9c4']});
      spawnLeaves(8);
      showFloat('Yum yum! 🌿');
      playAnim('feed');

    } else if (key === 'nuzzle') {
      setHugs(h=>h+1); setBonds(b=>b+1);
      spawnHearts(16, cx, cy);
      burst(40, {colors:HEART_COLORS});
      showFloat('Nuzzle! 💕');
      setViewerClass('love-active');
      setTimeout(() => setViewerClass(''), 3000);
      playAnim('nuzzle');

    } else if (key === 'lullaby') {
      spawnStars(10);
      burst(30, {colors:['#b2dfdb','#fff9c4','#fff']});
      showFloat('💤 Shh…');
      setGlowClass('night');
      setTimeout(() => setGlowClass(''), 6000);
      // FIX: calls playSleepAnim via playAnim routing
      playAnim('lullaby');
      showStarsAnim();

    } else if (key === 'name') {
      setShowNameBox(true);
      return;

    } else if (key === 'heal') {
      setBonds(b=>b+1);
      spawnHearts(10, cx, cy);
      burst(40, {colors:['#ffcdd2','#f48fb1','#fff']});
      showFloat('All healed! 🩹💚');
      playAnim('heal');

    } else if (key === 'roar') {
      burst(50, {colors:['#a5d6a7','#66bb6a','#fff']});
      spawnLeaves(12);
      showFloat('RAAWR! 🦕');
      playAnim('roar');

    } else if (key === 'goodnight') {
      spawnStars(15);
      spawnConfetti(40);
      showFloat('🌙 Good night!');
      setGlowClass('night');
      setTimeout(() => setGlowClass(''), 7000);
      // FIX: routes through playSleepAnim → Die at 0.1x
      playAnim('goodnight');
      showStarsAnim();

    } else if (key === 'dying') {
      spawnStars(8);
      showFloat('💤 Sleeping...');
      setGlowClass('night');
      setTimeout(() => setGlowClass(''), 8000);
      playAnim('dying');
      showStarsAnim();
    }

    setTimeout(() => { setStatusDot('ready'); setStatusText('Ready'); setActiveBtn(null); }, 2000);
  }, [hatched, burst, spawnHearts, spawnLeaves, spawnStars, spawnConfetti, showFloat, showStarsAnim, playAnim]);

  const handleNameSubmit = useCallback(() => {
    const n = nameInput.trim(); if (!n) return;
    setDinoName(n); setShowNameBox(false);
    speakFor('name');
    setActiveBtn('name');
    setOxytocin(d => Math.min(100, d + OX_GRANT.name));
    setBonds(b => b+1);
    showFloat(`${n}! 💚`);
    showStarsAnim();
    playAnim('name');
    const canvas = sparkRef.current;
    const cx = (canvas?.width||600)*.45, cy = (canvas?.height||500)*.5;
    spawnHearts(12, cx, cy);
    spawnLeaves(8);
    spawnConfetti(60);
    setStatusDot('busy'); setStatusText('Playing…');
    setTimeout(() => { setStatusDot('ready'); setStatusText('Ready'); setActiveBtn(null); }, 2000);
  }, [nameInput, showFloat, showStarsAnim, playAnim, spawnHearts, spawnLeaves, spawnConfetti]);

  // ── Sketchfab init ──
  useEffect(() => {
    if (!iframeRef.current) return;
    function initSF() {
      const client = new window.Sketchfab(iframeRef.current);
      client.init('631c323cd98c4d5da0fc059a938144fd', {
        success(sfApi) {
          apiRef.current = sfApi; sfApi.start();
          sfApi.addEventListener('viewerready', () => {
            sfApi.getAnimations((err, anims) => {
              if (!err) {
                animsRef.current = anims;
                setStatusDot('ready'); setStatusText('Ready!');
                setMsgText(`${anims.length} animations ready — hatch the egg to meet your dino!`);
                const idle = anims.find(a => a[1].toLowerCase().includes('idle')) || anims[0];
                if (idle) sfApi.setCurrentAnimationByUID(idle[0], () => sfApi.play());
              } else { setMsgText('⚠️ Could not load animations.'); }
            });
          });
        },
        error() { setStatusDot(''); setStatusText('Failed'); setMsgText('❌ Failed to connect.'); },
        autostart:1, transparent:1, ui_controls:0, ui_infos:0, ui_stop:0,
        ui_inspector:0, ui_watermark:0, ui_ar:0, ui_vr:0, ui_help:0,
        ui_settings:0, ui_annotations:0, dnt:1,
      });
    }
    if (!window.Sketchfab) {
      const s = document.createElement('script');
      s.src = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
      s.async = true; s.onload = initSF;
      document.head.appendChild(s);
    } else { initSF(); }
  }, []);

  const actions = [
    // { key:'hatch',     icon:'🥚', label:'Hatch!',      sub:'meet your dino',    ox:'+30 OX', cls:'btn-hatch' },
    { key:'feed',      icon:'🌿', label:'Feed',         sub:'berries & leaves',  ox:'+20 OX', cls:'btn-feed' },
    { key:'nuzzle',    icon:'💕', label:'Nuzzle',       sub:'cheek to cheek',    ox:'+25 OX', cls:'btn-nuzzle' },
    { key:'lullaby',   icon:'🌙', label:'Lullaby',      sub:'rock to sleep',     ox:'+20 OX', cls:'btn-lullaby' },
    { key:'name',      icon:'🏷️', label:'Name Dino',    sub:'forge the bond',    ox:'+35 OX', cls:'btn-name' },
    { key:'heal',      icon:'🩹', label:'Heal',         sub:'protective love',   ox:'+40 OX', cls:'btn-heal' },
    { key:'roar',      icon:'🦕', label:'Teach Roar',   sub:'roar together',     ox:'+15 OX', cls:'btn-roar' },
    // { key:'goodnight', icon:'⭐', label:'Goodnight',    sub:'tuck in & stars',   ox:'+25 OX', cls:'btn-goodnight' },
    // { key:'dying',     icon:'😴', label:'Deep Sleep',   sub:'slow rest mode',    ox:'+20 OX', cls:'btn-dying' },
  ];

  return (
    <div className="dino-root">
      {!showDino && (
        <div className={`dino-loading${isModelReady?' hidden':''}`}>
          <div style={{textAlign:'center'}}>
            <div className="dino-egg-loader">🥚</div>
            <div className="dino-load-text">Preparing the Nest…</div>
            <div className="dino-load-sub">Your baby dino is almost ready</div>
            <div className="dino-load-dots">
              <div className="dino-load-dot"/><div className="dino-load-dot"/><div className="dino-load-dot"/>
            </div>
          </div>
        </div>
      )}

      <div className="dino-ambient"><span/><span/><span/><span/></div>

      <div className="dino-layout">
        <header className="dino-header">
          <div className="dino-logo">
            <div className="dino-logo-icon">🦕</div>
            <div className="dino-logo-text">
              <h1>{dinoName ? `${dinoName} 🦕` : 'Baby Dino'}</h1>
              <p>Oxytocin Engine · MANAS360</p>
              <div className="dino-logo-love">💚 Love & Bonding Companion</div>
            </div>
          </div>
          <div className="dino-status-pill">
            <div className={`dino-status-dot${statusDot ? ' '+statusDot : ''}`}/>
            <span>{statusText}</span>
          </div>
        </header>

        <div className="dino-main">
          {/* ── VIEWER ── */}
          <div className={`dino-viewer-wrap${viewerClass ? ' '+viewerClass : ''}`}>
            <div className={`dino-viewer-glow${glowClass ? ' '+glowClass : ''}`}/>
            <div className="dino-iframe-container">
              <iframe
                ref={iframeRef}
                className={`dino-iframe${!hatched ? ' hidden' : ''}`}
                title="Baby Dino Companion"
                frameBorder="0"
                allow="autoplay"
                src="https://sketchfab.com/models/631c323cd98c4d5da0fc059a938144fd/embed?api_version=1.0.0&autostart=1&camera=0&preload=1&transparent=1&ui_hint=0&dnt=1&ui_controls=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark=0&ui_ar=0&ui_vr=0&ui_help=0&ui_settings=0&ui_annotations=0"
              />

              {/* FIX: masks use solid #eef7ef (matches viewer bg) and proper z-index */}
              <div className="dino-mask-top"/>
              <div className="dino-mask-bottom"/>

              {/* ── EGG OVERLAY ── */}
              {!hatched && (
                <div className={`dino-egg-overlay${eggPhase==='hidden'?' hidden':''}`}>
                  <div className={`dino-egg-main${eggPhase==='falling'?' falling':''}${eggPhase==='cracking'?' cracking':''}`}>
                    {eggPhase==='cracking' ? '🐣' : '🥚'}
                  </div>
                  {eggPhase==='idle' && <>
                    <div className="dino-egg-hint">A mysterious egg…</div>
                    <div className="dino-egg-sub">Something is about to hatch!</div>
                    <button className="dino-egg-tap-btn" onClick={() => triggerAction('hatch')}>
                      🥚 Tap to Hatch!
                    </button>
                  </>}
                  {eggPhase==='falling' && <div className="dino-egg-hint">It's falling! 🌿</div>}
                  {eggPhase==='cracking' && <div className="dino-egg-hint">It's hatching!! 🐣✨</div>}
                </div>
              )}

              {/* ── NAME INPUT ── */}
              {showNameBox && (
                <div className="dino-name-overlay">
                  <div className="dino-name-box">
                    <h3>💚 Name Your Dino!</h3>
                    <p>Give your companion a special name to deepen the bond</p>
                    <input
                      className="dino-name-input"
                      placeholder="e.g. Kiku, Rex, Mochi…"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && handleNameSubmit()}
                      autoFocus
                      maxLength={20}
                    />
                    <br/>
                    <button className="dino-name-btn" onClick={handleNameSubmit}>
                      💚 Name {nameInput||'…'}!
                    </button>
                  </div>
                </div>
              )}

              <canvas ref={sparkRef} className="dino-spark-canvas"/>
              <div className={`dino-float-text${floatPop?' pop':''}`}>{floatText}</div>
              <div className={`dino-stars-overlay${starsShow?' show':''}`}>🌟✨🌿</div>
              <div className={`dino-now-playing${badgeShow?' show':''}`}>
                <div className="anim-dot"/><span>{badgeName}</span>
              </div>
              {isModelReady && (
                <div className={`dino-drag-hint${hintFade?' fade':''}`}>
                  🖱️ Drag to rotate · scroll to zoom
                </div>
              )}
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <div className="dino-sidebar">
            <div className="dino-ox-meter">
              <div className="dino-ox-header">
                <div className="dino-ox-label">🧪 Oxytocin</div>
                <div className={`dino-ox-value${oxytocin>=100?' maxed':''}`}>{oxytocin}</div>
              </div>
              <div className="dino-ox-bar-track">
                <div className="dino-ox-bar-fill" style={{width:`${oxytocin}%`}}/>
              </div>
              <div className="dino-ox-tagline">
                <strong>Love Hormone</strong> — nurturing, caregiving & bonding with your baby dino raises oxytocin
              </div>
              {dinoName && (
                <div className="dino-name-display">
                  <div className="dn-label">Your Dino's Name</div>
                  <div className="dn-name">🦕 {dinoName}</div>
                </div>
              )}
              <div className="dino-ox-sublabels">
                <div className="dino-ox-sub">
                  <div className="sub-val">{bonds}</div>
                  <div className="sub-lbl">💚 Bonds</div>
                </div>
                <div className="dino-ox-sub">
                  <div className="sub-val">{hugs}</div>
                  <div className="sub-lbl">💕 Hugs</div>
                </div>
                <div className="dino-ox-sub">
                  <div className="sub-val">{feeds}</div>
                  <div className="sub-lbl">🌿 Feeds</div>
                </div>
              </div>
            </div>

            <div className="dino-action-panel">
              <div className="dino-section-label">💚 Bonding Actions</div>
              <div className="dino-action-grid">
                {actions.map(a => (
                  <button
                    key={a.key}
                    className={`dino-action-btn ${a.cls}${activeBtn===a.key?' active':''}`}
                    onClick={() => triggerAction(a.key)}
                    onMouseEnter={() => setActiveBtn(a.key)}
                    onMouseLeave={() => { if (activeBtn === a.key) setActiveBtn(null); }}
                  >
                    <span className="a-ox">{a.ox}</span>
                    <span className="a-icon">{a.icon}</span>
                    <span className="a-label">{a.label}</span>
                    <span className="a-sub">{a.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="dino-statusbar">
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span>🌿</span><span>{msgText}</span>
          </div>
          <div>MANAS360 · Oxytocin v1.0</div>
        </div>
      </div>
    </div>
  );
}