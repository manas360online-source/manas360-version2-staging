import { useState, useEffect, useRef, useCallback } from "react";

// ── VOICE MAP ──
const VOICE_MAP = {
  morning_walk:   { phrase: "Serotonin rising! A beautiful morning walk with your golden buddy!",      pitch: 1.1, rate: 0.95 },
  groom_brush:    { phrase: "Calm and steady. Repetitive care — serotonin's favourite ritual.",        pitch: 1.0, rate: 0.88 },
  fetch_game:     { phrase: "Throw it! Every return is a promise kept. Serotonin loves that!",        pitch: 1.2, rate: 1.0  },
  feed_schedule:  { phrase: "On time, every time. Routine is serotonin's love language.",             pitch: 1.0, rate: 0.92 },
  belly_rub:      { phrase: "Warmth spreading… parasympathetic calm… you feel it too.",               pitch: 0.95,rate: 0.85 },
  sit_stay:       { phrase: "Sit. Stay. Beautiful. Mastery built through patience. Serotonin blooms.",pitch: 1.1, rate: 0.95 },
  sunset_together:{ phrase: "Just being here together. Baseline serotonin. You are not alone.",       pitch: 0.9, rate: 0.82 },
  gratitude_lick: { phrase: "You showed up today. That's everything. Serotonin says: well done.",     pitch: 1.0, rate: 0.90 },
  bark:           { phrase: "Woof! Woof woof! Hello! Hello! I'm so happy you're here!",              pitch: 1.3, rate: 1.1  },
};

let cachedVoice = null;
const getPreferredVoice = () => new Promise(resolve => {
  const pick = (list) =>
    list.find(v => /neerja|microsoft.*india/i.test(v.name)) ||
    list.find(v => v.lang === 'en-IN') ||
    list.find(v => v.name === 'Samantha') ||
    list.find(v => /zira|hazel|karen|victoria|moira|fiona|tessa/i.test(v.name)) ||
    list.find(v => v.lang.startsWith('en')) ||
    list[0];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) return resolve(pick(voices));
  window.speechSynthesis.addEventListener('voiceschanged', () => resolve(pick(window.speechSynthesis.getVoices())), { once: true });
});

const speakFor = async (key) => {
  const v = VOICE_MAP[key];
  if (!v || !window.speechSynthesis) return;
  if (!cachedVoice) cachedVoice = await getPreferredVoice();
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(v.phrase);
  utt.pitch = v.pitch; utt.rate = v.rate; utt.volume = 1;
  if (cachedVoice) utt.voice = cachedVoice;
  window.speechSynthesis.speak(utt);
};

const ANIM_MAP = {
  morning_walk:    ['Walk_Forward', 'Run_Forward'],
  groom_brush:     ['idleA', 'idleB'],
  fetch_game:      ['Run_Forward', 'Walk_Forward'],
  feed_schedule:   ['Eat', 'idleA'],
  belly_rub:       ['IdleB', 'idleB'],
  sit_stay:        ['idleA', 'idleC'],
  sunset_together: ['Walk_Forward', 'idleA'],
  gratitude_lick:  ['Hit'],
};

const ST_GRANT = {
  morning_walk: 20, groom_brush: 15, fetch_game: 18, feed_schedule: 22,
  belly_rub: 25, sit_stay: 20, sunset_together: 28, gratitude_lick: 30,
};

const GOLD_PALETTE   = ['#FFD700','#FFC107','#FFECB3','#fff8e1','#ffe082','#fff'];
const WARM_PALETTE   = ['#FFD700','#FF8F00','#FFF9C4','#FFECB3','#fff'];
const SUNSET_PALETTE = ['#FF7043','#FFB300','#FF8F00','#FFF3E0','#FFD180','#fff'];

const hexToRgba = (hex, alpha) => {
  const normalized = String(hex || '').replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;

  if (full.length !== 6) {
    return hex;
  }

  const value = Number.parseInt(full, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

/* ─────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800;900&family=Nunito:wght@300;400;600;700;800&display=swap');

  .pup-root *, .pup-root *::before, .pup-root *::after { margin:0; padding:0; box-sizing:border-box; }

  .pup-root {
    --bg:#fdf8ef; --bg2:#fff8e6; --panel:#fffbf2; --border:#f0e0b0;
    --gold:#E8A000; --goldLt:#FFD700; --goldPale:#FFF8DC; --amber:#FF8F00;
    --cream:#FFFDE7; --text:#3d2b00; --text-mid:#7a5c1e; --text-dim:#b89a4a;
    --sun1:#FFD700; --sun2:#FF8F00; --sero:#66BB6A; --sero-lt:#A5D6A7;
    font-family:'Nunito',sans-serif; background:var(--bg); color:var(--text);
    overflow-x:hidden; min-height:100vh; position:relative;
  }

  @keyframes pup-breathe      { 0%,100%{opacity:.12;transform:scale(1)} 50%{opacity:.22;transform:scale(1.06)} }
  @keyframes pup-shimmer      { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes pup-bulge        { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
  @keyframes pup-sunPulse     { 0%,100%{box-shadow:0 0 24px 6px #FFD70066,0 0 50px 16px #FFC10733} 50%{box-shadow:0 0 44px 14px #FFD700AA,0 0 80px 28px #FF8F0055} }
  @keyframes pup-seroglow     { 0%,100%{box-shadow:0 0 20px 5px #66BB6A55,0 0 50px 14px #A5D6A733} 50%{box-shadow:0 0 40px 14px #66BB6A88,0 0 80px 30px #A5D6A755} }
  @keyframes pup-subtleBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes pup-heartbeat    { 0%,100%{transform:scale(1)} 14%{transform:scale(1.12)} 28%{transform:scale(1)} 42%{transform:scale(1.08)} }
  @keyframes pup-textPop      { 0%{transform:translate(-50%,-50%) scale(0) rotate(-8deg);opacity:0} 60%{transform:translate(-50%,-50%) scale(1.1) rotate(2deg);opacity:1} 100%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1} }
  @keyframes pup-pawPrint     { 0%{transform:translate(-50%,-50%) scale(0);opacity:0} 50%{transform:translate(-50%,-50%) scale(1.2);opacity:1} 100%{transform:translate(-50%,-50%) scale(1);opacity:.8} }
  @keyframes pup-spin         { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes pup-warmFlood    { 0%,100%{opacity:0} 40%{opacity:1} }
  @keyframes pup-gentlePulse  { 0%,100%{opacity:.15;transform:scale(1)} 50%{opacity:.28;transform:scale(1.04)} }
  @keyframes pup-streak       { 0%{transform:scaleX(0) translateX(-20px);opacity:0} 60%{transform:scaleX(1.06) translateX(2px);opacity:1} 100%{transform:scaleX(1) translateX(0);opacity:1} }

  /* ── DOGHOUSE ── */
  @keyframes dh-slide-up      { 0%{transform:translateY(110%) scale(.9);opacity:0} 60%{transform:translateY(-8%) scale(1.02);opacity:1} 80%{transform:translateY(3%);} 100%{transform:translateY(0) scale(1);opacity:1} }
  @keyframes dh-door-open     { 0%{transform:scaleX(1)} 100%{transform:scaleX(0)} }
  @keyframes dh-pup-emerge    { 0%{transform:translateX(-80px) scaleX(-1);opacity:0} 40%{opacity:1} 100%{transform:translateX(0) scaleX(1);opacity:1} }
  @keyframes dh-shake         { 0%,100%{transform:rotate(0deg)} 20%{transform:rotate(-3deg)} 40%{transform:rotate(3deg)} 60%{transform:rotate(-2deg)} 80%{transform:rotate(2deg)} }
  @keyframes dh-bounce-in     { 0%{transform:scale(0) rotate(-15deg);opacity:0} 60%{transform:scale(1.15) rotate(4deg);opacity:1} 80%{transform:scale(.95) rotate(-2deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
  @keyframes dh-star-burst    { 0%{transform:translate(-50%,-50%) scale(0) rotate(0deg);opacity:1} 100%{transform:translate(-50%,-50%) scale(2.5) rotate(180deg);opacity:0} }
  @keyframes dh-float-up      { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-60px);opacity:0} }
  @keyframes dh-woof-pop      { 0%{transform:translate(-50%,-50%) scale(0) rotate(-12deg);opacity:0} 40%{transform:translate(-50%,-50%) scale(1.2) rotate(3deg);opacity:1} 70%{transform:translate(-50%,-50%) scale(.95) rotate(-1deg);opacity:1} 100%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1} }
  @keyframes dh-woof-fade     { 0%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.3) translateY(-20px)} }
  @keyframes dh-grass-sway    { 0%,100%{transform:rotate(0deg) scaleY(1)} 50%{transform:rotate(4deg) scaleY(1.05)} }
  @keyframes dh-sun-rise-anim { 0%{transform:translateY(40px);opacity:0} 100%{transform:translateY(0);opacity:1} }
  @keyframes dh-cloud-drift   { 0%{transform:translateX(-20px)} 100%{transform:translateX(20px)} }
  @keyframes dh-overlay-fade  { 0%{opacity:1} 100%{opacity:0} }
  @keyframes dh-run-bounce    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes dh-bark-shake    { 0%,100%{transform:rotate(0) scale(1)} 25%{transform:rotate(-4deg) scale(1.04)} 75%{transform:rotate(4deg) scale(1.04)} }
  @keyframes dh-paw-stamp     { 0%{transform:scale(0) rotate(-20deg);opacity:0} 50%{transform:scale(1.3) rotate(5deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:.85} }

  /* ── INTRO OVERLAY ── */
  .dh-intro-overlay {
    position:fixed; inset:0; z-index:9999;
    background:linear-gradient(180deg,#87CEEB 0%,#B0E0FF 35%,#90EE90 65%,#5DBB63 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:flex-end;
    overflow:hidden; transition:opacity .8s ease-out, transform .8s ease-out;
  }
  .dh-intro-overlay.exit { opacity:0; transform:scale(1.04); pointer-events:none; }

  /* sky elements */
  .dh-sun { position:absolute; top:48px; left:50%; transform:translateX(-50%); width:90px; height:90px; border-radius:50%; background:radial-gradient(circle,#FFE566,#FFD700 55%,#FF8F00); box-shadow:0 0 60px 20px #FFD70077,0 0 120px 50px #FF8F0033; animation:dh-sun-rise-anim .9s .3s both; }
  .dh-cloud { position:absolute; display:flex; gap:0; }
  .dh-cloud-blob { border-radius:50%; background:rgba(255,255,255,.85); }
  .dh-cloud:nth-child(2) { top:90px; left:8%; animation:dh-cloud-drift 6s ease-in-out infinite alternate; }
  .dh-cloud:nth-child(3) { top:70px; right:10%; animation:dh-cloud-drift 8s ease-in-out infinite alternate-reverse; }

  /* scene */
  .dh-scene { position:relative; width:100%; max-width:560px; margin:0 auto; }
  .dh-grass-strip { width:100%; height:80px; background:linear-gradient(180deg,#5DBB63,#3d8b40); border-radius:0; position:relative; overflow:hidden; }
  .dh-grass-blade { position:absolute; bottom:0; width:6px; border-radius:3px 3px 0 0; background:linear-gradient(180deg,#76c442,#4a9e2f); transform-origin:bottom center; }

  /* doghouse */
  .dh-house-wrap { position:absolute; bottom:60px; left:50%; transform:translateX(-50%); animation:dh-slide-up .85s cubic-bezier(.34,1.56,.64,1) .15s both; }
  .dh-house { position:relative; width:200px; }
  .dh-roof { width:0; height:0; border-left:114px solid transparent; border-right:114px solid transparent; border-bottom:80px solid #C0392B; filter:drop-shadow(0 -4px 8px rgba(0,0,0,.18)); }
  .dh-roof-ridge { position:absolute; top:-6px; left:50%; transform:translateX(-50%); width:30px; height:12px; background:#922B21; border-radius:3px; }
  .dh-roof-shingle-row { position:absolute; display:flex; gap:2px; }
  .dh-wall { width:180px; margin:0 auto; height:110px; background:#D4A373; border:3px solid #B8860B; border-top:none; border-radius:0 0 6px 6px; position:relative; overflow:hidden; }
  .dh-wall::after { content:''; position:absolute; inset:0; background:repeating-linear-gradient(90deg,transparent,transparent 29px,rgba(0,0,0,.06) 30px); }
  .dh-door-frame { position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:68px; height:80px; background:#8B4513; border-radius:34px 34px 0 0; display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .dh-door-panel { position:absolute; width:100%; height:100%; background:linear-gradient(180deg,#5a2d0c,#3d1a04); border-radius:inherit; transform-origin:left center; }
  .dh-door-panel.open { animation:dh-door-open .55s cubic-bezier(.4,0,.2,1) .9s forwards; }
  .dh-nameplate { position:absolute; top:12px; left:50%; transform:translateX(-50%); background:#FFD700; border:2px solid #B8860B; border-radius:6px; padding:3px 10px; font-family:'Playfair Display',serif; font-size:.65rem; font-weight:800; color:#3d2b00; white-space:nowrap; letter-spacing:1px; box-shadow:0 2px 6px rgba(0,0,0,.15); }
  .dh-base { width:196px; margin:0 auto; height:12px; background:#8B4513; border-radius:0 0 8px 8px; box-shadow:0 4px 12px rgba(0,0,0,.2); }
  .dh-chimney { position:absolute; top:-58px; right:28px; width:24px; height:44px; background:#A93226; border:2px solid #922B21; border-radius:3px 3px 0 0; }
  .dh-smoke { position:absolute; top:-20px; left:50%; transform:translateX(-50%); }
  .dh-smoke span { display:block; width:12px; height:12px; border-radius:50%; background:rgba(200,200,200,.6); margin:0 auto 4px; animation:dh-float-up 2s ease-in-out infinite; }
  .dh-smoke span:nth-child(2){animation-delay:.7s;width:10px;height:10px;}
  .dh-smoke span:nth-child(3){animation-delay:1.4s;width:8px;height:8px;}

  /* paw steps */
  .dh-paw-trail { position:absolute; bottom:65px; left:50%; display:flex; gap:18px; pointer-events:none; }
  .dh-paw-step  { font-size:1.3rem; opacity:0; transform:scale(0) rotate(-20deg); animation:dh-paw-stamp .4s cubic-bezier(.34,1.56,.64,1) both; }

  /* woof bubble */
  .dh-woof-bubble { position:absolute; background:#fff; border:3px solid #FFD700; border-radius:22px 22px 22px 4px; padding:8px 16px; font-family:'Playfair Display',serif; font-weight:900; font-size:1.6rem; color:#E8A000; white-space:nowrap; box-shadow:0 4px 20px rgba(255,215,0,.35); pointer-events:none; }
  .dh-woof-bubble::after { content:''; position:absolute; bottom:-14px; left:14px; border:7px solid transparent; border-top-color:#FFD700; }
  .dh-woof-bubble::before { content:''; position:absolute; bottom:-10px; left:16px; border:5px solid transparent; border-top-color:#fff; z-index:1; }

  /* progress bar inside overlay */
  .dh-progress-wrap { position:absolute; bottom:28px; left:50%; transform:translateX(-50%); width:220px; text-align:center; }
  .dh-progress-track { height:5px; background:rgba(255,255,255,.25); border-radius:3px; overflow:hidden; }
  .dh-progress-fill  { height:100%; background:#FFD700; border-radius:3px; transition:width .3s ease; box-shadow:0 0 10px #FFD700; }
  .dh-progress-label { font-family:'Nunito',sans-serif; font-size:.7rem; color:rgba(255,255,255,.8); margin-top:6px; letter-spacing:2px; text-transform:uppercase; }

  /* stars burst */
  .dh-star { position:absolute; pointer-events:none; animation:dh-star-burst .7s ease-out both; font-size:1.4rem; }

  /* ── LOADING ── */
  .pup-loading-overlay { position:fixed; inset:0; background:#fdf8ef; display:flex; align-items:center; justify-content:center; z-index:9998; transition:opacity .7s ease-out; }
  .pup-loading-overlay.hidden { opacity:0; pointer-events:none; }
  .pup-loading-rings { position:relative; width:80px; height:80px; margin:0 auto 32px; }
  .pup-loading-ring  { position:absolute; border:3px solid transparent; border-radius:50%; animation:pup-spin 1.4s linear infinite; }
  .pup-loading-ring:nth-child(1) { width:80px;height:80px; border-top-color:#FFD700; border-right-color:#FFC107; }
  .pup-loading-ring:nth-child(2) { width:58px;height:58px; top:11px;left:11px; border-top-color:#FFC107; border-right-color:#FF8F00; animation-direction:reverse; animation-delay:.25s; }
  .pup-loading-ring:nth-child(3) { width:38px;height:38px; top:21px;left:21px; border-top-color:#FF8F00; border-right-color:#FFD700; animation-delay:.5s; }
  .pup-loading-text   { font-family:'Playfair Display',serif; font-size:1.3rem; font-weight:700; color:#3d2b00; margin-bottom:12px; letter-spacing:.5px; }
  .pup-loading-status { font-size:.84rem; color:#b89a4a; display:flex; align-items:center; justify-content:center; gap:8px; }
  .pup-status-indicator { display:inline-block; width:8px; height:8px; border-radius:50%; background:#ddd; animation:pup-gentlePulse 1.6s ease-in-out infinite; }
  .pup-status-indicator.ready { background:#66BB6A; box-shadow:0 0 12px #66BB6A; }

  /* ── AMBIENT ── */
  .pup-ambient { position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden; }
  .pup-ambient span { position:absolute; border-radius:50%; filter:blur(100px); animation:pup-breathe 8s ease-in-out infinite; }
  .pup-ambient span:nth-child(1) { width:600px;height:600px; background:radial-gradient(circle,#FFD70028,transparent 70%); top:-180px;left:-140px; }
  .pup-ambient span:nth-child(2) { width:380px;height:380px; background:radial-gradient(circle,#FFC10720,transparent 70%); bottom:-100px;right:-80px; animation-delay:3.5s; }
  .pup-ambient span:nth-child(3) { width:300px;height:300px; background:radial-gradient(circle,#FF8F0018,transparent 70%); top:38%;left:55%; animation-delay:1.8s; }
  .pup-ambient span:nth-child(4) { width:460px;height:460px; background:radial-gradient(circle,#66BB6A1A,transparent 70%); top:20%;left:28%; animation:pup-gentlePulse 6s ease-in-out infinite; animation-delay:2s; opacity:0; transition:opacity 1.2s; }
  .pup-ambient.sero-active span:nth-child(4) { opacity:1; }

  /* ── LAYOUT ── */
  .pup-layout { position:relative; z-index:1; min-height:100vh; display:grid; grid-template-rows:auto 1fr auto; max-width:1100px; margin:0 auto; padding:26px 20px 30px; }
  .pup-header { display:flex; align-items:center; justify-content:space-between; padding-bottom:18px; border-bottom:1px solid var(--border); margin-bottom:18px; }
  .pup-logo   { display:flex; align-items:center; gap:14px; }
  .pup-logo-icon { width:50px;height:50px; background:linear-gradient(135deg,#FFD700,#FF8F00); border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:26px; box-shadow:0 0 28px rgba(255,215,0,.45); transition:background .5s,box-shadow .5s; }
  .pup-logo-icon.sero-mode { background:linear-gradient(135deg,#A5D6A7,#66BB6A); box-shadow:0 0 28px rgba(102,187,106,.4); }
  .pup-logo-text h1 { font-family:'Playfair Display',serif; font-size:1.55rem; font-weight:800; color:var(--text); letter-spacing:-.3px; }
  .pup-logo-text p  { font-size:.7rem; font-weight:400; color:var(--text-dim); letter-spacing:3px; text-transform:uppercase; margin-top:1px; }
  .pup-status-pill  { display:flex; align-items:center; gap:8px; background:var(--panel); border:1px solid var(--border); border-radius:50px; padding:7px 14px; font-size:.75rem; color:var(--text-mid); box-shadow:0 2px 12px rgba(255,215,0,.08); }
  .pup-status-dot   { width:7px;height:7px; border-radius:50%; background:#ccc; transition:background .4s,box-shadow .4s; }
  .pup-status-dot.ready { background:#66BB6A; box-shadow:0 0 8px #66BB6A; }
  .pup-status-dot.busy  { background:var(--gold); box-shadow:0 0 8px var(--gold); }
  .pup-status-dot.sero  { background:#A5D6A7; box-shadow:0 0 10px #66BB6A; animation:pup-heartbeat 2s ease-in-out infinite; }
  .pup-main { display:grid; grid-template-columns:1fr 306px; gap:16px; align-items:start; }

  /* ── VIEWER ── */
  .pup-viewer-wrap { position:relative; border-radius:22px; overflow:hidden; border:1.5px solid var(--border); background:#fffdf5; box-shadow:0 4px 0 #f0e0b0,0 8px 40px rgba(255,215,0,.12),inset 0 0 50px rgba(255,215,0,.04); transition:box-shadow .6s; }
  .pup-viewer-wrap.sun-active  { animation:pup-sunPulse 1.4s ease-in-out infinite; }
  .pup-viewer-wrap.sero-active { animation:pup-seroglow 1.6s ease-in-out infinite; }
  .pup-viewer-glow { position:absolute; inset:0; pointer-events:none; z-index:2; transition:opacity .6s,background .6s; background:radial-gradient(ellipse at 50% 85%,rgba(255,215,0,.06),transparent 70%); }
  .pup-viewer-glow.warm     { background:radial-gradient(ellipse at 50% 70%,rgba(255,176,0,.18),transparent 70%); }
  .pup-viewer-glow.sun-mode { background:radial-gradient(ellipse at 50% 90%,rgba(255,215,0,.22),rgba(255,143,0,.12) 40%,transparent 70%); }
  .pup-viewer-glow.sero-mode{ background:radial-gradient(ellipse at 50% 55%,rgba(102,187,106,.16),rgba(165,214,167,.08) 50%,transparent 75%); }

  /* ── IFRAME ── */
  .pup-iframe-container { position:relative; width:100%; height:500px; overflow:hidden; }
  .pup-iframe { position:absolute; top:0;left:0; width:100%;height:100%; border:none; display:block; pointer-events:all; z-index:1; }
  .pup-mask-top, .pup-mask-bottom { position:absolute; left:0;right:0; z-index:10; pointer-events:none; background:var(--bg); }
  .pup-mask-top    { top:0;    height:44px; }
  .pup-mask-bottom { bottom:0; height:52px; }

  .pup-spark-canvas  { position:absolute; inset:0; pointer-events:none; z-index:18; }
  .pup-sun-canvas    { position:absolute; bottom:0;left:0;right:0;height:200px; pointer-events:none; z-index:19; opacity:0; transition:opacity .4s; }
  .pup-sun-canvas.active { opacity:1; }
  .pup-warm-canvas   { position:absolute; inset:0; pointer-events:none; z-index:20; opacity:0; transition:opacity .6s; }
  .pup-warm-canvas.active { opacity:1; }
  .pup-warm-overlay  { position:absolute; inset:0; pointer-events:none; z-index:21; opacity:0; background:radial-gradient(ellipse at 50% 55%,rgba(255,213,79,.22),transparent 65%); }
  .pup-warm-overlay.flash { animation:pup-warmFlood .9s ease-out forwards; }
  .pup-sero-overlay  { position:absolute; inset:0; pointer-events:none; z-index:21; opacity:0; background:radial-gradient(ellipse at 50% 50%,rgba(102,187,106,.18),rgba(165,214,167,.09) 50%,transparent 72%); }
  .pup-sero-overlay.flash { animation:pup-warmFlood .9s ease-out forwards; }
  .pup-paw-text { position:absolute; top:32%;left:50%; font-size:2.8rem; pointer-events:none; z-index:22; opacity:0; transform:translate(-50%,-50%) scale(0); }
  .pup-paw-text.pop { animation:pup-pawPrint .5s cubic-bezier(.34,1.56,.64,1) forwards; }
  .pup-feel-text { position:absolute; top:30%;left:50%; transform:translate(-50%,-50%) scale(0); font-family:'Playfair Display',serif; font-size:2.4rem; font-weight:800; color:var(--gold); text-shadow:0 0 22px rgba(255,215,0,.6),0 0 44px rgba(255,143,0,.4); pointer-events:none; z-index:23; white-space:nowrap; opacity:0; }
  .pup-feel-text.pop { animation:pup-textPop .55s cubic-bezier(.34,1.56,.64,1) forwards; opacity:1; }
  .pup-sero-text { position:absolute; top:35%;left:50%; transform:translate(-50%,-50%) scale(0); font-family:'Playfair Display',serif; font-size:2rem; font-weight:800; color:#66BB6A; text-shadow:0 0 18px rgba(102,187,106,.5),0 0 36px rgba(165,214,167,.4); pointer-events:none; z-index:23; white-space:nowrap; opacity:0; }
  .pup-sero-text.pop { animation:pup-textPop .5s cubic-bezier(.34,1.56,.64,1) forwards; opacity:1; }
  .pup-now-playing { position:absolute; bottom:52px;left:16px; background:rgba(255,253,245,.9); backdrop-filter:blur(12px); border:1px solid var(--border); border-radius:10px; padding:8px 14px; font-family:'Playfair Display',serif; font-size:.78rem; color:var(--gold); display:none; align-items:center; gap:8px; z-index:24; pointer-events:none; box-shadow:0 2px 10px rgba(255,215,0,.12); }
  .pup-now-playing.show { display:flex; }
  .pup-now-playing .anim-dot { width:6px;height:6px; border-radius:50%; background:var(--gold); box-shadow:0 0 6px var(--gold); animation:pup-breathe 1s ease-in-out infinite; }
  .pup-now-playing.sero-badge { color:#66BB6A; border-color:rgba(102,187,106,.25); }
  .pup-now-playing.sero-badge .anim-dot { background:#66BB6A; box-shadow:0 0 6px #66BB6A; }
  .pup-drag-hint { position:absolute; bottom:60px;right:14px; background:rgba(255,253,245,.85); backdrop-filter:blur(8px); border:1px solid var(--border); border-radius:8px; padding:5px 10px; font-size:.65rem; color:var(--text-mid); pointer-events:none; z-index:25; display:flex; align-items:center; gap:5px; opacity:1; transition:opacity 1s; }
  .pup-drag-hint.fade { opacity:0; }

  /* intro badge on main viewer (run counter) */
  .pup-intro-badge { position:absolute; top:56px; left:50%; transform:translateX(-50%); background:rgba(255,253,245,.92); backdrop-filter:blur(10px); border:1.5px solid var(--border); border-radius:40px; padding:7px 18px; font-family:'Playfair Display',serif; font-size:.85rem; font-weight:800; color:var(--gold); display:flex; align-items:center; gap:8px; z-index:26; pointer-events:none; box-shadow:0 2px 16px rgba(255,215,0,.18); opacity:0; transition:opacity .3s; }
  .pup-intro-badge.show { opacity:1; }
  .pup-intro-badge .run-dot { width:8px;height:8px; border-radius:50%; background:var(--gold); animation:pup-heartbeat .6s ease-in-out infinite; }

  /* ── SIDEBAR ── */
  .pup-sidebar { display:flex; flex-direction:column; gap:12px; }
  .pup-st-meter { background:var(--panel); border:1.5px solid var(--border); border-radius:18px; padding:18px; position:relative; overflow:hidden; box-shadow:0 2px 16px rgba(255,215,0,.06); }
  .pup-st-meter::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 50% 100%,rgba(255,215,0,.06),transparent 60%); pointer-events:none; }
  .pup-st-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .pup-st-label  { font-family:'Playfair Display',serif; font-size:.62rem; font-weight:700; letter-spacing:3.5px; text-transform:uppercase; color:var(--text-dim); }
  .pup-st-value  { font-family:'Playfair Display',serif; font-size:1.7rem; font-weight:900; color:var(--gold); line-height:1; transition:color .3s; }
  .pup-st-value.maxed { color:var(--amber); text-shadow:0 0 18px var(--goldLt); animation:pup-bulge .4s ease; }
  .pup-st-bar-track { height:8px; background:#faeec8; border-radius:4px; overflow:hidden; }
  .pup-st-bar-fill  { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--gold),var(--goldLt),#ffe082); transition:width .85s cubic-bezier(.34,1.56,.64,1); position:relative; }
  .pup-st-bar-fill::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent); background-size:200% 100%; animation:pup-shimmer 2.2s infinite; }
  .pup-st-desc { font-size:.64rem; color:rgba(184,154,74,.7); letter-spacing:.8px; line-height:1.6; font-style:italic; margin-top:8px; }
  .pup-st-desc strong { color:var(--gold); font-style:normal; }
  .pup-st-sublabels { display:flex; gap:8px; margin-top:12px; }
  .pup-st-sub { flex:1; background:#fffbf0; border:1px solid var(--border); border-radius:10px; padding:8px 6px; text-align:center; }
  .pup-st-sub .sub-val { font-family:'Playfair Display',serif; font-size:1.05rem; font-weight:800; color:var(--text); transition:all .4s; }
  .pup-st-sub .sub-lbl { font-size:.58rem; color:var(--text-dim); letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
  .streak-glow { color:var(--amber) !important; text-shadow:0 0 10px var(--goldLt); animation:pup-bulge .3s ease; }

  .pup-reward-panel { background:var(--panel); border:1.5px solid var(--border); border-radius:18px; padding:14px; box-shadow:0 2px 12px rgba(255,215,0,.06); }
  .pup-section-label { font-family:'Playfair Display',serif; font-size:.62rem; font-weight:700; letter-spacing:3.5px; text-transform:uppercase; color:var(--text-dim); padding:0 2px 10px; border-bottom:1px solid var(--border); margin-bottom:10px; }
  .pup-reward-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }

  .pup-reward-btn { position:relative; overflow:hidden; border:1.5px solid var(--border); border-radius:14px; font-family:'Nunito',sans-serif; font-weight:700; cursor:pointer; transition:all .18s ease; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:14px 8px; background:linear-gradient(145deg,#fffdf5,#fff9e6); color:var(--text-mid); text-align:center; }
  .pup-reward-btn:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(255,215,0,.15); }
  .pup-reward-btn:active { transform:scale(.95); }
  .pup-reward-btn.active { animation:pup-subtleBounce .5s ease infinite; }
  .pup-reward-btn .r-icon  { font-size:1.6rem; line-height:1; display:block; transition:transform .2s; z-index:2; position:relative; }
  .pup-reward-btn:hover .r-icon { transform:scale(1.15) rotate(-5deg); }
  .pup-reward-btn .r-label { font-size:.72rem; font-weight:800; letter-spacing:.5px; z-index:2; position:relative; color:var(--text); }
  .pup-reward-btn .r-sub   { font-size:.58rem; color:var(--text-dim); letter-spacing:1.2px; text-transform:uppercase; z-index:2; position:relative; }
  .pup-reward-btn .r-st    { position:absolute; top:6px;right:6px; font-size:.54rem; font-family:'Playfair Display',serif; font-weight:800; padding:2px 5px; border-radius:4px; background:rgba(255,215,0,.15); color:var(--gold); letter-spacing:.5px; z-index:3; }

  .btn-walk:hover,.btn-walk.active       { border-color:var(--goldLt); color:var(--amber); background:linear-gradient(145deg,#fffce0,#fff9d0); }
  .btn-groom:hover,.btn-groom.active     { border-color:#FFC107; color:#FF8F00; background:linear-gradient(145deg,#fff8e1,#fff3cd); }
  .btn-fetch:hover,.btn-fetch.active     { border-color:var(--gold); color:var(--gold); background:linear-gradient(145deg,#fffde0,#fff8c0); }
  .btn-feed:hover,.btn-feed.active       { border-color:#A5D6A7; color:#388E3C; background:linear-gradient(145deg,#f1f8e9,#e8f5e9); }
  .btn-belly:hover,.btn-belly.active     { border-color:#FF8A65; color:#E64A19; background:linear-gradient(145deg,#fff3e0,#fbe9e7); animation:pup-heartbeat .8s ease infinite; }
  .btn-sit:hover,.btn-sit.active         { border-color:var(--gold); color:var(--amber); background:linear-gradient(145deg,#fffde0,#fff8c0); }
  .btn-sunset:hover,.btn-sunset.active   { border-color:#FF7043; color:#BF360C; background:linear-gradient(145deg,#fff3e0,#fce4ec); }
  .btn-gratitude { grid-column:1/-1; flex-direction:row; justify-content:flex-start; gap:12px; padding:12px 16px; }
  .btn-gratitude:hover,.btn-gratitude.active { border-color:var(--goldLt); color:var(--text); background:linear-gradient(145deg,#fffce0,#fff9d6); box-shadow:0 6px 22px rgba(255,215,0,.2); }

  .pup-statusbar { margin-top:16px; padding-top:14px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; font-size:.72rem; color:var(--text-dim); }
  .pup-statusbar .msg { display:flex; align-items:center; gap:6px; }

  @media (max-width:768px) {
    .pup-main { grid-template-columns:1fr; }
    .pup-iframe-container { height:320px; }
  }
`;

/* ─────────────────────────────────────────────────────────────
   INTRO OVERLAY COMPONENT
───────────────────────────────────────────────────────────── */
function DogHouseIntro({ onComplete }) {
  const [phase, setPhase]       = useState('enter');   // enter → door → run → bark → exit
  const [progress, setProgress] = useState(0);
  const [pawSteps, setPawSteps] = useState([]);
  const [woofBubbles, setWoofBubbles] = useState([]);
  const [stars, setStars]       = useState([]);
  const progressMsg = {
    enter: 'Your golden is waking up…',
    door:  'The door is opening…',
    run:   'Here he comes! 🐾',
    bark:  'Woof woof! Hello! 🐶',
    exit:  'Ready to play!',
  }[phase];

  useEffect(() => {
    // Phase timeline
    const t1 = setTimeout(() => { setPhase('door'); setProgress(25); }, 900);
    const t2 = setTimeout(() => { setPhase('run');  setProgress(50); }, 1800);
    const t3 = setTimeout(() => {
      setPhase('bark'); setProgress(80);
      // spawn woof bubbles
      setWoofBubbles([
        { id:1, text:'Woof!',     x:'30%',  y:'28%', delay:0    },
        { id:2, text:'Woof!',     x:'62%',  y:'22%', delay:.35  },
        { id:3, text:'Woof woof!',x:'45%',  y:'15%', delay:.65  },
      ]);
      // stars
      setStars([
        { id:1, top:'25%', left:'22%', delay:0   },
        { id:2, top:'18%', left:'70%', delay:.2  },
        { id:3, top:'30%', left:'55%', delay:.4  },
        { id:4, top:'12%', left:'40%', delay:.6  },
      ]);
    }, 4400);
    const t4 = setTimeout(() => { setProgress(100); }, 5400);
    const t5 = setTimeout(() => { setPhase('exit'); onComplete(); }, 5900);

    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, [onComplete]);

  // Spawn paw steps during 'run' phase
  useEffect(() => {
    if (phase !== 'run') return;
    const steps = [];
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        setPawSteps(p => [...p, { id: Date.now()+i, delay: 0 }]);
      }, i * 320);
    }
    return () => {};
  }, [phase]);

  const grassBlades = Array.from({ length: 28 }, (_, i) => ({
    left: `${(i / 27) * 100}%`,
    height: `${22 + Math.random() * 24}px`,
    delay: `${Math.random() * 2}s`,
    duration: `${1.8 + Math.random() * 1.2}s`,
  }));

  return (
    <div className={`dh-intro-overlay${phase === 'exit' ? ' exit' : ''}`}>
      {/* Sky */}
      <div className="dh-sun" />
      <div className="dh-cloud" style={{ top: 90, left: '8%' }}>
        <div className="dh-cloud-blob" style={{ width: 50, height: 30 }} />
        <div className="dh-cloud-blob" style={{ width: 35, height: 22, marginLeft: -10, marginTop: 8 }} />
        <div className="dh-cloud-blob" style={{ width: 40, height: 26, marginLeft: -15, marginTop: 4 }} />
      </div>
      <div className="dh-cloud" style={{ top: 70, right: '10%' }}>
        <div className="dh-cloud-blob" style={{ width: 44, height: 26 }} />
        <div className="dh-cloud-blob" style={{ width: 30, height: 20, marginLeft: -8, marginTop: 6 }} />
      </div>

      {/* Stars burst during bark */}
      {stars.map(s => (
        <div key={s.id} className="dh-star" style={{ top: s.top, left: s.left, animationDelay: `${s.delay}s` }}>⭐</div>
      ))}

      {/* Woof bubbles */}
      {woofBubbles.map(w => (
        <div key={w.id} className="dh-woof-bubble" style={{
          top: w.y, left: w.x, transform: 'translate(-50%,-50%)',
          position: 'absolute',
          animation: `dh-woof-pop .5s cubic-bezier(.34,1.56,.64,1) ${w.delay}s both, dh-woof-fade .5s ease-in ${w.delay + 1.1}s both`,
          zIndex: 10,
        }}>
          {w.text}
        </div>
      ))}

      {/* Paw trail */}
      {phase === 'run' || phase === 'bark' ? (
        <div className="dh-paw-trail" style={{ position: 'absolute', bottom: 135, left: '12%', gap: 22 }}>
          {Array.from({ length: Math.min(pawSteps.length, 6) }, (_, i) => (
            <span key={i} className="dh-paw-step" style={{
              animationDelay: `${i * .12}s`,
              fontSize: '1.4rem',
              transform: i % 2 === 0 ? 'rotate(-15deg)' : 'rotate(15deg)',
            }}>🐾</span>
          ))}
        </div>
      ) : null}

      {/* Scene */}
      <div className="dh-scene">
        {/* Doghouse */}
        <div className="dh-house-wrap">
          <div className="dh-house">
            {/* Chimney */}
            <div className="dh-chimney">
              <div className="dh-smoke">
                <span/><span/><span/>
              </div>
            </div>
            {/* Roof */}
            <div style={{ position: 'relative' }}>
              <div className="dh-roof" />
              <div className="dh-roof-ridge" />
            </div>
            {/* Wall */}
            <div className="dh-wall">
              <div className="dh-nameplate">🐶 GOLDEN</div>
              <div className="dh-door-frame">
                <div className={`dh-door-panel${phase !== 'enter' ? ' open' : ''}`} />
                {/* Dog emoji emerging */}
                {phase !== 'enter' && (
                  <div style={{
                    position: 'absolute', bottom: 0, fontSize: '2.4rem',
                    animation: phase === 'bark'
                      ? 'dh-bark-shake .18s ease-in-out infinite'
                      : 'dh-pup-emerge .6s cubic-bezier(.34,1.56,.64,1) both',
                    zIndex: 5,
                  }}>
                    🐕
                  </div>
                )}
              </div>
            </div>
            <div className="dh-base" />
          </div>
        </div>

        {/* Grass */}
        <div className="dh-grass-strip">
          {grassBlades.map((b, i) => (
            <div key={i} className="dh-grass-blade" style={{
              left: b.left, height: b.height,
              animation: `dh-grass-sway ${b.duration} ${b.delay} ease-in-out infinite alternate`,
            }} />
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="dh-progress-wrap">
        <div className="dh-progress-track">
          <div className="dh-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="dh-progress-label">{progressMsg}</div>
      </div>
      <div style={{ height: 48 }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function GoldenPup() {
  const [serotonin, setSerotonin]   = useState(28);
  const [routine, setRoutine]       = useState(0);
  const [walks, setWalks]           = useState(0);
  const [grooms, setGrooms]         = useState(0);
  const [statusDot, setStatusDot]   = useState('');
  const [statusText, setStatusText] = useState('Loading model…');
  const [msgText, setMsgText]       = useState('Initialising viewer…');
  const [badgeName, setBadgeName]   = useState('Idle');
  const [badgeShow, setBadgeShow]   = useState(false);
  const [badgeSero, setBadgeSero]   = useState(false);
  const [activeBtn, setActiveBtn]   = useState(null);
  const [glowClass, setGlowClass]   = useState('');
  const [viewerClass, setViewerClass] = useState('');
  const [ambientSero, setAmbientSero] = useState(false);
  const [logoSero, setLogoSero]       = useState(false);
  const [warmFlash, setWarmFlash]     = useState(false);
  const [seroFlash, setSeroFlash]     = useState(false);
  const [feelTextStr, setFeelTextStr] = useState('Good Boy! 🐾');
  const [feelTextPop, setFeelTextPop] = useState(false);
  const [seroTextStr, setSeroTextStr] = useState('Serotonin! 🌿');
  const [seroTextPop, setSeroTextPop] = useState(false);
  const [pawPop, setPawPop]           = useState(false);
  const [pawEmoji, setPawEmoji]       = useState('🐾');
  const [streakBlink, setStreakBlink] = useState(false);
  const [warmActive, setWarmActive]   = useState(false);
  const [sunCanvasActive, setSunCanvasActive] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [showPup, setShowPup]           = useState(false);
  const [hintFade, setHintFade]         = useState(false);

  // Intro states
  const [showIntro, setShowIntro]         = useState(true);
  const [introDone, setIntroDone]         = useState(false);
  const [runCount, setRunCount]           = useState(0);
  const [showRunBadge, setShowRunBadge]   = useState(false);
  const introSequenceDone = useRef(false);

  const iframeRef = useRef(null);
  const sparkRef  = useRef(null);
  const sunRef    = useRef(null);
  const warmRef   = useRef(null);
  const apiRef    = useRef(null);
  const animsRef  = useRef([]);
  const sparksRef = useRef([]);
  const petalRef  = useRef([]);
  const confettiRef = useRef([]);
  const heartRef    = useRef([]);
  const sunParRef   = useRef([]);
  const warmRingRef = useRef([]);
  const seroTimerRef  = useRef(null);
  const streakTimerRef= useRef(null);
  const sunLoopRef    = useRef(null);
  const sunActiveRef  = useRef(false);
  const rafIdRef  = useRef(null);
  const sRafIdRef = useRef(null);
  const wRafIdRef = useRef(null);

  useEffect(() => {
    const id = 'pup-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id; tag.textContent = CSS;
      document.head.appendChild(tag);
    }
  }, []);

  useEffect(() => {
    if (isModelReady && !showPup) {
      const t = setTimeout(() => setShowPup(true), 500);
      return () => clearTimeout(t);
    }
  }, [isModelReady, showPup]);

  useEffect(() => {
    if (statusDot === 'ready' && !isModelReady) setIsModelReady(true);
  }, [statusDot, isModelReady]);

  useEffect(() => {
    if (isModelReady) {
      const t = setTimeout(() => setHintFade(true), 5000);
      return () => clearTimeout(t);
    }
  }, [isModelReady]);

  // ── Trigger intro sequence once model is ready & intro overlay is gone ──
  useEffect(() => {
    if (!introDone || !isModelReady || introSequenceDone.current) return;
    introSequenceDone.current = true;
    playIntroSequence();
  }, [introDone, isModelReady]);

  const findAnim = useCallback((names) => {
    for (const name of names) {
      const m = animsRef.current.find(a =>
        a[1].toLowerCase().replace(/[\s_]/g, '') === name.toLowerCase().replace(/[\s_]/g, '')) ||
        animsRef.current.find(a => a[1].toLowerCase().includes(name.toLowerCase().substring(0, 5)));
      if (m) return m;
    }
    return animsRef.current[0];
  }, []);

  const playIntroSequence = useCallback(() => {
    if (!apiRef.current || animsRef.current.length === 0) return;

    const runAnim  = findAnim(['Run_Forward', 'Walk_Forward']);
    const barkAnim = findAnim(['Hit']);
    const idleAnim = findAnim(['idleA', 'idleB']);

    if (!runAnim) return;

    const RUN_LAPS   = 4;
    const LAP_MS     = 1400; // each run lap duration
    const BARK_PAUSE = 600;

    // Show run badge
    setShowRunBadge(true);
    setRunCount(1);
    setBadgeName('Run_Forward');
    setBadgeShow(true);
    setStatusDot('busy');
    setStatusText('🐾 Running!');

    // Burst some particles for excitement
    burst(40, { colors: GOLD_PALETTE, big: true });

    // Play run animation
    apiRef.current.setCurrentAnimationByUID(runAnim[0], () => {
      apiRef.current.play();
    });

    // Cycle through RUN_LAPS laps
    for (let lap = 1; lap <= RUN_LAPS; lap++) {
      setTimeout(() => {
        setRunCount(lap);
        if (lap < RUN_LAPS) {
          burst(20, { colors: WARM_PALETTE, cx: 0.5, cy: 0.6 });
        }
        if (lap === RUN_LAPS) {
          // Last lap — add confetti finish
          burstPetals(35);
          burst(50, { colors: [...GOLD_PALETTE, '#fff'], big: true });
          showFeelText('Ready! 🐾');
        }
      }, (lap - 1) * LAP_MS);
    }

    // After all laps, switch to BARK (Hit anim)
    const barkStart = RUN_LAPS * LAP_MS + BARK_PAUSE;
    setTimeout(() => {
      setShowRunBadge(false);
      setBadgeShow(false);

      if (barkAnim) {
        speakFor('bark');
        setStatusDot('busy');
        setStatusText('🐶 Barking!');
        setBadgeName('Bark!');
        setBadgeShow(true);

        // Triple bark sequence
        const doBark = (times, done) => {
          if (times <= 0) { done(); return; }
          apiRef.current.setCurrentAnimationByUID(barkAnim[0], () => {
            apiRef.current.play();
          });
          // Woof text pop
          showSeroText(`Woof${times < 3 ? '!' : ' Woof!'} 🐶`);
          // Spark burst on each bark
          burst(28, { colors: ['#FFD700','#FFF9C4','#fff','#FFC107'], cx: 0.45, cy: 0.45 });

          // Paw print
          showPawPrint(['🐾','🐶','⭐'][3 - times]);

          // Warm ring pulse
          const wc = warmRef.current;
          if (wc) {
            warmRingRef.current.push({ x: wc.width * .5, y: wc.height * .55, r: 18, alpha: .65, color: '#FFD700', speed: 2.5 });
            warmRingRef.current.push({ x: wc.width * .5, y: wc.height * .55, r: 12, alpha: .5,  color: '#FFC107', speed: 1.8 });
          }

          setTimeout(() => doBark(times - 1, done), 950);
        };

        doBark(3, () => {
          // Settle to idle
          setTimeout(() => {
            setBadgeShow(false);
            if (idleAnim) {
              apiRef.current.setCurrentAnimationByUID(idleAnim[0], () => apiRef.current.play());
            }
            setStatusDot('ready');
            setStatusText('Ready');
            setMsgText('🐾 Drag to rotate · tap buttons to boost serotonin');
          }, 500);
        });
      } else {
        // No bark anim — just idle
        if (idleAnim) {
          apiRef.current.setCurrentAnimationByUID(idleAnim[0], () => apiRef.current.play());
        }
        setStatusDot('ready');
        setStatusText('Ready');
      }
    }, barkStart);
  }, [findAnim]);

  useEffect(() => {
    function resize() {
      const wrap = sparkRef.current?.parentElement;
      if (!wrap) return;
      const w = wrap.offsetWidth, h = wrap.offsetHeight;
      if (sparkRef.current)  { sparkRef.current.width = w;  sparkRef.current.height = h; }
      if (sunRef.current)    { sunRef.current.width = w;    sunRef.current.height = 200; }
      if (warmRef.current)   { warmRef.current.width = w;   warmRef.current.height = h; }
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Main spark canvas loop ──
  useEffect(() => {
    const canvas = sparkRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparksRef.current = sparksRef.current.filter(s => s.alpha > .04);
      sparksRef.current.forEach(s => {
        s.x += s.vx; s.y += s.vy; s.vy += .1; s.vx *= .97; s.alpha *= .95; s.size *= .97;
        ctx.save(); ctx.globalAlpha = s.alpha; ctx.fillStyle = s.color; ctx.shadowBlur = s.glow; ctx.shadowColor = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill(); ctx.restore();
      });
      petalRef.current = petalRef.current.filter(p => p.alpha > .04);
      petalRef.current.forEach(p => {
        p.x += p.vx + Math.sin(p.t * .04) * .5; p.y += p.vy; p.vy += .04; p.alpha *= .988; p.rot += p.rotV; p.t++;
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.shadowBlur = 8; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
      });
      confettiRef.current = confettiRef.current.filter(c => c.alpha > .04);
      confettiRef.current.forEach(c => {
        c.x += c.vx; c.y += c.vy; c.vy += .08; c.vx *= .99; c.alpha *= .987; c.rot += c.rotV;
        ctx.save(); ctx.globalAlpha = c.alpha; ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        ctx.fillStyle = c.color; ctx.fillRect(-c.w/2,-c.h/2,c.w,c.h); ctx.restore();
      });
      heartRef.current = heartRef.current.filter(h => h.alpha > .04);
      heartRef.current.forEach(h => {
        h.x += h.vx; h.y += h.vy; h.vy += .03; h.alpha *= .972;
        ctx.save(); ctx.globalAlpha = h.alpha; ctx.font = `${h.size}px serif`; ctx.textAlign = 'center';
        ctx.shadowBlur = 12; ctx.shadowColor = '#FFB300'; ctx.fillText(h.emoji, h.x, h.y); ctx.restore();
      });
      rafIdRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  // ── Sun canvas loop ──
  useEffect(() => {
    const canvas = sunRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sunParRef.current = sunParRef.current.filter(p => p.alpha > .03);
      sunParRef.current.forEach(p => {
        p.x += p.vx; p.y -= p.speed; p.speed += .04; p.alpha -= .01; p.size *= .98;
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);
        g.addColorStop(0, p.color); g.addColorStop(.5, hexToRgba(p.color, 0.53)); g.addColorStop(1,'transparent');
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = g; ctx.shadowBlur = 14; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); ctx.restore();
      });
      sRafIdRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(sRafIdRef.current);
  }, []);

  // ── Warm ring canvas loop ──
  useEffect(() => {
    const canvas = warmRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      warmRingRef.current = warmRingRef.current.filter(r => r.alpha > .01);
      warmRingRef.current.forEach(r => {
        r.r += r.speed; r.alpha -= .007;
        ctx.save(); ctx.globalAlpha = r.alpha * .6; ctx.strokeStyle = r.color; ctx.lineWidth = 2.5;
        ctx.shadowBlur = 20; ctx.shadowColor = r.color;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.stroke(); ctx.restore();
      });
      wRafIdRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(wRafIdRef.current);
  }, []);

  const burst = useCallback((count, cfg={}) => {
    const canvas = sparkRef.current; if (!canvas) return;
    const cx = canvas.width*(cfg.cx||0.44), cy = canvas.height*(cfg.cy||0.52);
    const colors = cfg.colors||GOLD_PALETTE, big = cfg.big||false;
    for (let i=0;i<count;i++) {
      const angle=Math.random()*Math.PI*2, speed=(big?5:2)+Math.random()*(big?7:4);
      sparksRef.current.push({ x:cx+(Math.random()-.5)*(big?110:50), y:cy+(Math.random()-.5)*(big?70:28), vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-(big?3.5:1.8), color:colors[Math.floor(Math.random()*colors.length)], alpha:1, size:(big?6:3)+Math.random()*(big?5:3), glow:big?18:8 });
    }
  }, []);

  const burstPetals = useCallback((n, warm=true) => {
    const canvas = sparkRef.current; if (!canvas) return;
    const palette = warm ? ['#FFD700','#FFF9C4','#FFE082','#ffe57f','#FFCA28'] : ['#A5D6A7','#C8E6C9','#66BB6A','#fff','#DCEDC8'];
    for (let i=0;i<n;i++) {
      petalRef.current.push({ x:canvas.width*(.18+Math.random()*.64), y:canvas.height*.12, vx:(Math.random()-.5)*4, vy:-2-Math.random()*3, color:palette[Math.floor(Math.random()*palette.length)], alpha:1, rx:4+Math.random()*6, ry:2+Math.random()*3, rot:Math.random()*Math.PI*2, rotV:(Math.random()-.5)*.18, t:0 });
    }
  }, []);

  const burstConfetti = useCallback((n) => {
    const canvas = sparkRef.current; if (!canvas) return;
    for (let i=0;i<n;i++) {
      confettiRef.current.push({ x:canvas.width*(.2+Math.random()*.6), y:canvas.height*.1, vx:(Math.random()-.5)*5.5, vy:-3-Math.random()*4, color:WARM_PALETTE[Math.floor(Math.random()*WARM_PALETTE.length)], alpha:1, w:6+Math.random()*8, h:3+Math.random()*4, rot:Math.random()*Math.PI*2, rotV:(Math.random()-.5)*.2 });
    }
  }, []);

  const spawnHeart = useCallback((cx,cy,emoji='❤️') => {
    heartRef.current.push({ x:cx, y:cy, vx:(Math.random()-.5)*3, vy:-2-Math.random()*2, alpha:1, size:14+Math.random()*12, emoji });
  }, []);

  const spawnSunParticle = useCallback(() => {
    const canvas=sunRef.current; if(!canvas) return;
    const cx=canvas.width/2, spread=canvas.width*.3;
    sunParRef.current.push({ x:cx+(Math.random()-.5)*spread, y:canvas.height*.95, vx:(Math.random()-.5)*1.8, speed:1.8+Math.random()*2.5, size:7+Math.random()*12, alpha:.75+Math.random()*.2, color:GOLD_PALETTE[Math.floor(Math.random()*GOLD_PALETTE.length)] });
  }, []);

  const startSunrise = useCallback(() => {
    sunActiveRef.current = true; setSunCanvasActive(true);
    setViewerClass(v => v.includes('sun-active')?v:(v+' sun-active').trim());
    setGlowClass('sun-mode');
    function loop() { if(!sunActiveRef.current) return; for(let i=0;i<3;i++) spawnSunParticle(); sunLoopRef.current=setTimeout(loop,55); }
    loop();
  }, [spawnSunParticle]);

  const stopSunrise = useCallback(() => {
    sunActiveRef.current=false; setSunCanvasActive(false);
    setViewerClass(v=>v.replace('sun-active','').trim()); setGlowClass('');
    if(sunLoopRef.current) clearTimeout(sunLoopRef.current);
  }, []);

  const startSeroAura = useCallback(() => {
    setViewerClass(v => v.includes('sero-active')?v:(v+' sero-active').trim());
    setGlowClass('sero-mode'); setAmbientSero(true); setLogoSero(true);
    setStatusDot('sero'); setStatusText('🌿 Serotonin');
    if(seroTimerRef.current) clearTimeout(seroTimerRef.current);
    seroTimerRef.current = setTimeout(() => {
      setViewerClass(v=>v.replace('sero-active','').trim()); setGlowClass('');
      setAmbientSero(false); setLogoSero(false); setStatusDot('ready'); setStatusText('Ready');
    }, 5500);
  }, []);

  const flashWarm = useCallback(() => {
    setWarmFlash(false); requestAnimationFrame(()=>setWarmFlash(true)); setTimeout(()=>setWarmFlash(false),950);
  }, []);

  const flashSero = useCallback(() => {
    setSeroFlash(false); requestAnimationFrame(()=>setSeroFlash(true)); setTimeout(()=>setSeroFlash(false),950);
  }, []);

  const showFeelText = useCallback((msg) => {
    setFeelTextStr(msg); setFeelTextPop(false); requestAnimationFrame(()=>setFeelTextPop(true)); setTimeout(()=>setFeelTextPop(false),1400);
  }, []);

  const showSeroText = useCallback((msg) => {
    setSeroTextStr(msg); setSeroTextPop(false); requestAnimationFrame(()=>setSeroTextPop(true)); setTimeout(()=>setSeroTextPop(false),1400);
  }, []);

  const showPawPrint = useCallback((emoji='🐾') => {
    setPawEmoji(emoji); setPawPop(false); requestAnimationFrame(()=>setPawPop(true)); setTimeout(()=>setPawPop(false),800);
  }, []);

  const triggerReward = useCallback((key) => {
    speakFor(key);
    if (!apiRef.current || animsRef.current.length === 0) { setMsgText('⚠️ Model not ready yet.'); return; }
    setActiveBtn(key);
    setSerotonin(s => Math.min(100, s + (ST_GRANT[key]||12)));
    const canvas = sparkRef.current; if (!canvas) return;
    const cx = canvas.width*.44, cy = canvas.height*.5;

    if (key === 'morning_walk') {
      startSunrise(); burst(60,{colors:GOLD_PALETTE,big:true}); burstPetals(40);
      setWalks(w=>w+1); setRoutine(r=>r+1); setStreakBlink(true); setTimeout(()=>setStreakBlink(false),500);
      showFeelText('Morning Walk! 🌅');
      if(streakTimerRef.current) clearTimeout(streakTimerRef.current);
      streakTimerRef.current = setTimeout(stopSunrise,4500);
    } else if (key === 'groom_brush') {
      startSeroAura(); flashWarm();
      for(let i=0;i<6;i++) setTimeout(()=>{ const wc=warmRef.current; if(!wc) return; warmRingRef.current.push({x:wc.width*.5,y:wc.height*.55,r:24,alpha:.55,color:Math.random()>.5?'#FFD700':'#FFC107',speed:1.3+Math.random()*.7});},i*260);
      burst(40,{colors:['#FFD700','#FFC107','#fff','#FFF9C4'],big:false});
      setGrooms(g=>g+1); setRoutine(r=>r+1);
      showSeroText('Groomed! ✨'); setWarmActive(true); setTimeout(()=>setWarmActive(false),4500);
    } else if (key === 'fetch_game') {
      burst(50,{colors:WARM_PALETTE,big:true}); burstPetals(30);
      setTimeout(()=>burst(40,{colors:['#FFD700','#fff'],big:true}),350);
      showPawPrint('🎾'); showFeelText('Fetch! 🎾'); setRoutine(r=>r+1);
    } else if (key === 'feed_schedule') {
      startSeroAura(); flashSero(); burstPetals(50,false);
      for(let i=0;i<8;i++) setTimeout(()=>spawnHeart(cx+(Math.random()-.5)*130,cy+(Math.random()-.5)*80,'🦴'),i*80);
      setRoutine(r=>r+1); showSeroText('Fed! 🍖'); setGlowClass('sero-mode');
    } else if (key === 'belly_rub') {
      flashWarm(); startSeroAura();
      for(let i=0;i<8;i++) setTimeout(()=>{ const wc=warmRef.current; if(!wc) return; warmRingRef.current.push({x:wc.width*.5,y:wc.height*.6,r:18,alpha:.7,color:['#FFD700','#FF8F00','#FFC107'][Math.floor(Math.random()*3)],speed:1+Math.random()*1.2});},i*200);
      burst(55,{colors:['#FFD700','#FF8A65','#FFF9C4','#fff'],big:true});
      for(let i=0;i<10;i++) setTimeout(()=>spawnHeart(cx+(Math.random()-.5)*160,cy+(Math.random()-.5)*90,'❤️'),i*70);
      showFeelText('Good Boy! 🥰');
    } else if (key === 'gratitude_lick') {
      startSeroAura(); flashSero(); flashWarm();
      burstPetals(70,false); burstPetals(50,true);
      burst(90,{colors:[...GOLD_PALETTE,'#A5D6A7','#66BB6A'],big:true}); burstConfetti(80);
      for(let i=0;i<14;i++) setTimeout(()=>spawnHeart(cx+(Math.random()-.5)*200,cy+(Math.random()-.5)*120,['❤️','🐾','✨','💛'][Math.floor(Math.random()*4)]),i*60);
      showSeroText('You showed up 💛');
      setTimeout(()=>{burstPetals(40,false); burst(50,{colors:['#fff','#FFD700','#66BB6A'],big:true});},600);
    }

    // Play matching animation
    const candidates = ANIM_MAP[key] || [];
    let match = null;
    for (const name of candidates) {
      match = animsRef.current.find(a => a[1].toLowerCase().replace(/[\s_]/g,'') === name.toLowerCase().replace(/[\s_]/g,''))
           || animsRef.current.find(a => a[1].toLowerCase().includes(name.toLowerCase().substring(0,5)));
      if (match) break;
    }
    if (!match) match = animsRef.current.find(a => a[1].toLowerCase().includes('idle')) || animsRef.current[0];
    if (match) {
      const isSero = ['groom_brush','belly_rub','sunset_together','gratitude_lick','feed_schedule'].includes(key);
      if (!isSero) { setStatusDot('busy'); setStatusText('Playing…'); }
      apiRef.current.setCurrentAnimationByUID(match[0], (err) => {
        if (!err) {
          apiRef.current.play();
          setBadgeName(match[1]); setBadgeShow(false);
          requestAnimationFrame(()=>setBadgeShow(true));
          setBadgeSero(isSero);
          setMsgText(`▶ ${match[1]}`);
          if (!isSero) setTimeout(()=>{ setStatusDot('ready'); setStatusText('Ready'); },600);
        }
      });
    }
    setTimeout(()=>setActiveBtn(null),2200);
  }, [burst, burstPetals, burstConfetti, spawnHeart, spawnSunParticle, startSunrise, stopSunrise, startSeroAura, flashWarm, flashSero, showFeelText, showSeroText, showPawPrint]);

  // ── Sketchfab init ──
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
      client.init('ae93d7be74b9470498bfad188ecd2116', {
        success(sfApi) {
          apiRef.current = sfApi; sfApi.start();
          sfApi.addEventListener('viewerready', () => {
            sfApi.getAnimations((err, anims) => {
              if (!err) {
                animsRef.current = anims;
                setStatusDot('ready'); setStatusText('Model ready');
                setMsgText(`${anims.length} animations loaded`);
                const idle = anims.find(a => /idleA/i.test(a[1])) || anims[0];
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

  const handleIntroDone = useCallback(() => {
    setIntroDone(true);
    setTimeout(() => setShowIntro(false), 900);
  }, []);

  const buttons = [
    { key:'morning_walk',  icon:'🌅', label:'Morning Walk',  sub:'daily ritual',    st:'+20 ST', cls:'btn-walk'  },
    { key:'groom_brush',   icon:'🪮', label:'Groom & Brush', sub:'calming loop',    st:'+15 ST', cls:'btn-groom' },
    { key:'fetch_game',    icon:'🎾', label:'Fetch!',         sub:'reward loop',     st:'+18 ST', cls:'btn-fetch' },
    { key:'feed_schedule', icon:'🍖', label:'Feed Time',      sub:'routine signal',  st:'+22 ST', cls:'btn-feed'  },
    { key:'belly_rub',     icon:'🤍', label:'Belly Rub',      sub:'parasympathetic', st:'+25 ST', cls:'btn-belly' },
  ];

  return (
    <div className="pup-root">
      {/* ── INTRO OVERLAY ── */}
      {showIntro && <DogHouseIntro onComplete={handleIntroDone} />}

      {/* ── MAIN LOADING (while SF model loads, behind intro) ── */}
      {!showPup && !showIntro && (
        <div className={`pup-loading-overlay${isModelReady?' hidden':''}`}>
          <div style={{textAlign:'center'}}>
            <div className="pup-loading-rings">
              <div className="pup-loading-ring"/><div className="pup-loading-ring"/><div className="pup-loading-ring"/>
            </div>
            <div className="pup-loading-text">Waking up your Golden…</div>
            <div className="pup-loading-status">
              <span>Status:</span>
              <span><span className={`pup-status-indicator${isModelReady?' ready':''}`}/></span>
              <span>{isModelReady ? 'Ready to play!' : 'Loading model…'}</span>
            </div>
          </div>
        </div>
      )}

      <div className={`pup-ambient${ambientSero?' sero-active':''}`}><span/><span/><span/><span/></div>

      <div className="pup-layout">
        <header className="pup-header">
          <div className="pup-logo">
            <div className={`pup-logo-icon${logoSero?' sero-mode':''}`}>🐶</div>
            <div className="pup-logo-text">
              <h1>Golden</h1>
              <p>Serotonin Engine · MANAS360</p>
              <div style={{fontSize:'.64rem',color:'rgba(232,160,0,.65)',marginTop:'4px',letterSpacing:'1.5px',textTransform:'uppercase'}}>🌿 Routine builds you up</div>
            </div>
          </div>
          <div className="pup-status-pill">
            <div className={`pup-status-dot${statusDot?' '+statusDot:''}`}/>
            <span>{statusText}</span>
          </div>
        </header>

        <div className="pup-main">
          {/* VIEWER */}
          <div className={`pup-viewer-wrap${viewerClass?' '+viewerClass:''}`}>
            <div className={`pup-viewer-glow${glowClass?' '+glowClass:''}`}/>
            <div className="pup-iframe-container">
              <iframe
                ref={iframeRef}
                className="pup-iframe"
                title="Golden Retriever Puppy"
                frameBorder="0"
                allow="autoplay"
                src="https://sketchfab.com/models/ae93d7be74b9470498bfad188ecd2116/embed?api_version=1.0.0&autostart=0&camera=0&preload=1&transparent=1&ui_hint=0&dnt=1&ui_controls=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark=0&ui_ar=0&ui_vr=0&ui_help=0&ui_settings=0&ui_annotations=0"
              />
              <div className="pup-mask-top"/>
              <div className="pup-mask-bottom"/>
              <canvas ref={sparkRef} className="pup-spark-canvas"/>
              <canvas ref={sunRef}   className={`pup-sun-canvas${sunCanvasActive?' active':''}`}/>
              <canvas ref={warmRef}  className={`pup-warm-canvas${warmActive?' active':''}`}/>
              <div className={`pup-warm-overlay${warmFlash?' flash':''}`}/>
              <div className={`pup-sero-overlay${seroFlash?' flash':''}`}/>
              <div className={`pup-paw-text${pawPop?' pop':''}`}>{pawEmoji}</div>
              <div className={`pup-feel-text${feelTextPop?' pop':''}`}>{feelTextStr}</div>
              <div className={`pup-sero-text${seroTextPop?' pop':''}`}>{seroTextStr}</div>

              {/* Run lap badge */}
              <div className={`pup-intro-badge${showRunBadge?' show':''}`}>
                <div className="run-dot"/>
                <span>Run lap {runCount} / 4 🐾</span>
              </div>

              <div className={`pup-now-playing${badgeShow?' show':''}${badgeSero?' sero-badge':''}`}>
                <div className="anim-dot"/><span>{badgeName}</span>
              </div>
              {isModelReady && (
                <div className={`pup-drag-hint${hintFade?' fade':''}`}>
                  🖱️ Drag to rotate · scroll to zoom
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="pup-sidebar">
            <div className="pup-st-meter">
              <div className="pup-st-header">
                <div className="pup-st-label">🌿 Serotonin</div>
                <div className={`pup-st-value${serotonin>=100?' maxed':''}`}>{serotonin}</div>
              </div>
              <div className="pup-st-bar-track"><div className="pup-st-bar-fill" style={{width:`${serotonin}%`}}/></div>
              <div className="pup-st-desc"><strong>Calm, stable well-being</strong> — serotonin grows through routines, care, and steady presence</div>
              <div className="pup-st-sublabels">
                <div className="pup-st-sub"><div className={`sub-val${streakBlink?' streak-glow':''}`}>{routine}</div><div className="sub-lbl">🔁 Routine</div></div>
                <div className="pup-st-sub"><div className="sub-val">{walks}</div><div className="sub-lbl">🌅 Walks</div></div>
                <div className="pup-st-sub"><div className="sub-val">{grooms}</div><div className="sub-lbl">🪮 Grooms</div></div>
              </div>
            </div>

            <div className="pup-reward-panel">
              <div className="pup-section-label">Care Rituals</div>
              <div className="pup-reward-grid">
                {buttons.map(b => (
                  <button key={b.key} className={`pup-reward-btn ${b.cls}${activeBtn===b.key?' active':''}`}
                    onClick={()=>triggerReward(b.key)}
                    onMouseEnter={()=>setActiveBtn(b.key)}
                    onMouseLeave={()=>setActiveBtn(null)}>
                    <span className="r-st">{b.st}</span>
                    <span className="r-icon">{b.icon}</span>
                    <span className="r-label">{b.label}</span>
                    <span className="r-sub">{b.sub}</span>
                  </button>
                ))}
                <button className={`pup-reward-btn btn-gratitude${activeBtn==='gratitude_lick'?' active':''}`}
                  onClick={()=>triggerReward('gratitude_lick')}
                  onMouseEnter={()=>setActiveBtn('gratitude_lick')}
                  onMouseLeave={()=>setActiveBtn(null)}>
                  <span className="r-st">+30 ST</span>
                  <span className="r-icon">💛</span>
                  <div style={{flex:1,textAlign:'left'}}>
                    <div className="r-label">Daily Gratitude Lick</div>
                    <div className="r-sub">you showed up today</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pup-statusbar">
          <div className="msg"><span>🐾</span><span>{msgText}</span></div>
          <div style={{color:'var(--text-dim)',fontSize:'.68rem',letterSpacing:'1px'}}>MANAS360 · Golden v1.1</div>
        </div>
      </div>
    </div>
  );
}