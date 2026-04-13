import { useState, useEffect, useRef, useCallback } from "react";
import ChintuEntrance from "./ChintuEntrance";

// ── VOICE MAP ──
const VOICE_MAP = {
  high_five:       { phrase: "Dopamine spike! High five, you nailed it!",                   pitch: 1.2, rate: 1.0 },
  streak_fire:     { phrase: "Motivation surge! Keep that momentum alive!",                 pitch: 1.2, rate: 1.0 },
  coin_chase:      { phrase: "Reward signal activated! Collect those coins!",              pitch: 1.2, rate: 1.0 },
  celebrate:       { phrase: "Goal achieved! Dopamine flow unlocked!",                      pitch: 1.2, rate: 1.0 },
  challenge_focus: { phrase: "Focus and drive activated. You've got this.",                 pitch: 1.2, rate: 1.0 },
  trick_show:      { phrase: "Confidence boost! Watch this clever move!",                  pitch: 1.2, rate: 1.0 },
  level_up:        { phrase: "Dopamine cascade! You're unstoppable!",                       pitch: 1.2, rate: 1.0 },
  pounce:          { phrase: "Quick reward! Strike while hot!",                            pitch: 1.2, rate: 1.0 },
  pep_talk:        { phrase: "You are capable! Dopamine belief mode activated!",           pitch: 1.2, rate: 1.0 },
  plotting:        { phrase: "Cool Man. Brilliant thinking.",                pitch: 1.2, rate: 1.0 },
  breathe:         { phrase: "Breathe in... slowly... and hold. Endorphins flowing.",      pitch: 1.2, rate: 1.0 },
  laugh:           { phrase: "Ha ha ha! Pure endorphin joy!",                              pitch: 1.2, rate: 1.0 },
  play_time:       { phrase: "Play time! Release those happy chemicals!",                  pitch: 1.2, rate: 1.0 },
};

let cachedVoice = null;

const getPreferredVoice = () => new Promise(resolve => {
  const pick = (list) => {
    return (
      list.find(v => v.name === 'Microsoft Swara Online (Natural) - Hindi (India)') ||
      list.find(v => /swara|microsoft.*hindi/i.test(v.name)) ||
      list.find(v => v.lang === 'hi-IN') ||
      list.find(v => v.name === 'Microsoft Neerja Online (Natural) - English (India)') ||
      list.find(v => /neerja|microsoft.*india/i.test(v.name)) ||
      list.find(v => v.lang === 'en-IN') ||
      list.find(v => v.name === 'Samantha') ||
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
    if (i < loops - 1) await new Promise(r => setTimeout(r, 600));
  }
};

// Chintu fox animation spec:
// Pet (High-5) → Talk (squish/bounce/high-5 pose)
// Streak Fire  → Run  (dash/sprint mode)
// Coin Chase   → Run  (hunt mode, fast sprint)
// Celebrate    → Success (victory lap, spins, hops)
// Challenge    → Idle_2 (focus crouch, ready pose)
// Trick Show   → Roll  (pounce/snap)
// Level Up     → Success (celebration + crown)
// Pounce       → Roll  (snap/strike)
// Plotting     → Idle  (rest/lightbulb moment)
// Breathe      → Idle  (calm meditative)
// Laugh        → Success, Talk (joy bounce)
// Play Time    → Run, Walk (playful dash)
const ANIM_MAP = {
  high_five:       ['Land'],           // Pet state: squish → bounce → high-5 pose
  streak_fire:     ['Run_In_Place'],                     // Sprint/dash mode
  coin_chase:      ['Run_In_Place', 'Walk_In_Place'],             // Hunt mode: chase then snap
  celebrate:       ['Success'],                 // Victory lap: jump → spin → hops → champion
  challenge_focus: ['Idle_2', 'Idle'],          // Focus crouch → ready pose
  trick_show:      ['Roll_In_Place', 'Run_In_Place'],             // Pounce/snap strike
  level_up:        ['Success'],                 // Maximum celebration
  pounce:          ['Jump_Up'],                    // Quick snap/strike
  pep_talk:        ['Talk'],                      // Positive affirmation talk
  plotting:        ['Idle', 'Walk_In_Place'],            // Rest → lightbulb moment
  breathe:         ['Idle'],                    // Meditative calm
  laugh:           ['Success', 'Talk'],          // Joy bounce
  play_time:       ['Run_In_Place', 'Walk_In_Place'],             // Playful dash
};

const DP_GRANT = {
  high_five: 15, streak_fire: 25, coin_chase: 10, celebrate: 30,
  challenge_focus: 20, trick_show: 18, level_up: 50, pounce: 8,
  pep_talk: 16, plotting: 5, breathe: 8, laugh: 12, play_time: 10,
};

const EP_GRANT = { breathe: 20, laugh: 25, play_time: 15 };

const CONFETTI_COLORS  = ['#FFD600', '#FF8A65', '#a78bfa', '#06b6d4', '#5dba3e', '#fff'];
const ENDO_CONFETTI    = ['#FFD54F', '#F48FB1', '#FFAB91', '#FFF9C4', '#FF8A65', '#fff'];
const FIRE_COLORS      = ['#ff4800', '#ff9100', '#ffcd00', '#FF8A65', '#fff'];

const withAlpha = (color, alphaHex = '88') => {
  if (typeof color !== 'string') return color;
  if (!color.startsWith('#')) return color;
  if (color.length === 4) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`;
  }
  if (color.length === 7) return `${color}${alphaHex}`;
  return color;
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,500;0,700;1,300&display=swap');

  .chintu-root *, .chintu-root *::before, .chintu-root *::after { margin:0; padding:0; box-sizing:border-box; }

  .chintu-root {
    --bg:       #0a0604;
    --panel:    #1a1008;
    --border:   #3a2818;
    --orange:   #E65100;
    --orangeLt: #FF8A65;
    --gold:     #FFD600;
    --text:     #E8DCC8;
    --text-mid: #B8A898;
    --text-dim: #7A6A5A;
    --fire1:    #ff4800;
    --fire2:    #ff9100;
    --endo-gold:  #FFD54F;
    --endo-rose:  #F48FB1;
    --endo-peach: #FFAB91;
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
    overflow-x: hidden;
    min-height: 100vh;
    position: relative;
  }

  @keyframes chintu-breathe      { 0%,100%{opacity:.18;transform:scale(1)} 50%{opacity:.30;transform:scale(1.06)} }
  @keyframes chintu-shimmer      { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes chintu-bulge        { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
  @keyframes chintu-fireAura     { 0%,100%{box-shadow:0 0 20px 4px #ff4800,0 0 40px 8px #ff480055} 50%{box-shadow:0 0 36px 10px #ff9100,0 0 70px 20px #ffcd0055} }
  @keyframes chintu-endoAura     { 0%,100%{box-shadow:0 0 20px 6px #FFD54F55,0 0 50px 15px #F48FB133} 50%{box-shadow:0 0 40px 14px #FFD54F99,0 0 80px 30px #FF8A6555} }
  @keyframes chintu-subtleBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes chintu-laughBounce  { 0%,100%{transform:scale(1) rotate(0)} 25%{transform:scale(1.15) rotate(-3deg)} 75%{transform:scale(1.1) rotate(3deg)} }
  @keyframes chintu-lightningBolt{ 0%,100%{opacity:0} 10%,30%,50%{opacity:1} 20%,40%{opacity:.3} }
  @keyframes chintu-endoFlash    { 0%,100%{opacity:0} 10%,40%{opacity:1} 25%{opacity:.5} }
  @keyframes chintu-crownDrop    { 0%{transform:translateX(-50%) translateY(-30px) scale(0);opacity:0} 60%{transform:translateX(-50%) translateY(4px) scale(1.2);opacity:1} 100%{transform:translateX(-50%) translateY(0) scale(1);opacity:1} }
  @keyframes chintu-breathePulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.18);opacity:1} }
  @keyframes chintu-textPop      { 0%{transform:translate(-50%,-50%) scale(0) rotate(-10deg);opacity:0} 60%{transform:translate(-50%,-50%) scale(1.1) rotate(2deg);opacity:1} 100%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1} }
  @keyframes chintu-ekaurPop     { 0%{transform:translate(-50%,-50%) scale(0);opacity:0} 70%{transform:translate(-50%,-50%) scale(1.05);opacity:1} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
  @keyframes chintu-endoGlow     { 0%,100%{opacity:.18;transform:scale(1)} 50%{opacity:.35;transform:scale(1.08)} }
  @keyframes chintu-spin         { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

  /* ── LOADING ── */
  .chintu-loading-overlay { position:fixed; inset:0; background:#0a0604; display:flex; align-items:center; justify-content:center; z-index:9999; transition:opacity .6s ease-out; }
  .chintu-loading-overlay.hidden { opacity:0; pointer-events:none; }
  .chintu-loading-rings { position:relative; width:80px; height:80px; margin:0 auto 32px; }
  .chintu-loading-ring  { position:absolute; border:3px solid transparent; border-radius:50%; animation:chintu-spin 1.2s linear infinite; }
  .chintu-loading-ring:nth-child(1) { width:80px;height:80px; border-top-color:#E65100; border-right-color:#FFD600; }
  .chintu-loading-ring:nth-child(2) { width:60px;height:60px; top:10px;left:10px; border-top-color:#FFD600; border-right-color:#FF8A65; animation-direction:reverse; animation-delay:.2s; }
  .chintu-loading-ring:nth-child(3) { width:40px;height:40px; top:20px;left:20px; border-top-color:#FF8A65; border-right-color:#E65100; animation-delay:.4s; }
  .chintu-loading-text   { font-family:'Syne',sans-serif; font-size:1.2rem; font-weight:700; color:#E8DCC8; margin-bottom:16px; letter-spacing:1px; }
  .chintu-loading-status { font-size:.85rem; color:#7A6A5A; display:flex; align-items:center; justify-content:center; gap:8px; }
  .chintu-status-indicator { display:inline-block; width:8px; height:8px; border-radius:50%; background:#555; animation:chintu-breathePulse 1.5s ease-in-out infinite; }
  .chintu-status-indicator.ready { background:#5dba3e; box-shadow:0 0 12px #5dba3e; }

  /* ── AMBIENT ── */
  .chintu-ambient { position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden; }
  .chintu-ambient span { position:absolute; border-radius:50%; filter:blur(110px); animation:chintu-breathe 7s ease-in-out infinite; }
  .chintu-ambient span:nth-child(1) { width:650px;height:650px; background:radial-gradient(circle,#E6510033,transparent 70%); top:-220px;left:-180px; }
  .chintu-ambient span:nth-child(2) { width:420px;height:420px; background:radial-gradient(circle,#3d1a00,transparent 70%); bottom:-120px;right:-100px; animation-delay:3s; }
  .chintu-ambient span:nth-child(3) { width:320px;height:320px; background:radial-gradient(circle,#7c3aed22,transparent 70%); top:40%;left:58%; animation-delay:1.5s; }
  .chintu-ambient span:nth-child(4) { width:500px;height:500px; background:radial-gradient(circle,#FFD54F18,transparent 70%); top:25%;left:30%; animation:chintu-endoGlow 5s ease-in-out infinite; animation-delay:2s; opacity:0; transition:opacity 1s; }
  .chintu-ambient.endo-active span:nth-child(4) { opacity:1; }

  /* ── LAYOUT ── */
  .chintu-layout { position:relative; z-index:1; min-height:100vh; display:grid; grid-template-rows:auto 1fr auto; max-width:1100px; margin:0 auto; padding:28px 20px 32px; }
  .chintu-header { display:flex; align-items:center; justify-content:space-between; padding-bottom:20px; border-bottom:1px solid var(--border); margin-bottom:20px; }
  .chintu-logo   { display:flex; align-items:center; gap:14px; }
  .chintu-logo-icon { width:48px;height:48px; background:linear-gradient(135deg,var(--orange),#ff3d00); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 0 28px rgba(230,81,0,.5); transition:background .6s,box-shadow .6s; }
  .chintu-logo-icon.endo-mode { background:linear-gradient(135deg,#FF8A65,#FFD54F); box-shadow:0 0 28px rgba(255,171,145,.5); }
  .chintu-logo-text h1 { font-family:'Syne',sans-serif; font-size:1.5rem; font-weight:800; color:var(--text); letter-spacing:-.5px; }
  .chintu-logo-text p  { font-size:.72rem; font-weight:300; color:var(--text-dim); letter-spacing:3px; text-transform:uppercase; margin-top:1px; }
  .chintu-logo-note { font-size:.65rem; color:rgba(255,214,0,.5); margin-top:4px; letter-spacing:1.5px; text-transform:uppercase; }
  .chintu-status-pill  { display:flex; align-items:center; gap:8px; background:var(--panel); border:1px solid var(--border); border-radius:50px; padding:7px 14px; font-size:.75rem; color:var(--text-mid); }
  .chintu-status-dot   { width:7px;height:7px; border-radius:50%; background:#555; transition:background .4s,box-shadow .4s; }
  .chintu-status-dot.ready { background:#5dba3e; box-shadow:0 0 8px #5dba3e; }
  .chintu-status-dot.busy  { background:var(--orange); box-shadow:0 0 8px var(--orange); }
  .chintu-status-dot.endo  { background:var(--endo-gold); box-shadow:0 0 10px var(--endo-gold); animation:chintu-breathePulse 2s ease-in-out infinite; }
  .chintu-main { display:grid; grid-template-columns:1fr 300px; gap:16px; align-items:start; }

  /* ── VIEWER WRAP ── */
  .chintu-viewer-wrap { position:relative; border-radius:20px; overflow:hidden; border:1px solid var(--border); background:#0a0402; box-shadow:0 0 0 1px #1a0a04,0 20px 80px rgba(0,0,0,.75),inset 0 0 60px rgba(230,81,0,.06); transition:box-shadow .6s; }
  .chintu-viewer-wrap.fire-active { animation:chintu-fireAura 1.2s ease-in-out infinite; }
  .chintu-viewer-wrap.endo-active { animation:chintu-endoAura 1.5s ease-in-out infinite; }
  .chintu-viewer-glow { position:absolute; inset:0; pointer-events:none; z-index:2; transition:opacity .6s,background .6s; background:radial-gradient(ellipse at 50% 80%,rgba(230,81,0,.08),transparent 70%); }
  .chintu-viewer-glow.hot       { background:radial-gradient(ellipse at 50% 70%,rgba(255,72,0,.22),transparent 70%); }
  .chintu-viewer-glow.fire-mode { background:radial-gradient(ellipse at 50% 90%,rgba(255,72,0,.3),rgba(255,145,0,.15) 40%,transparent 70%); }
  .chintu-viewer-glow.endo-mode { background:radial-gradient(ellipse at 50% 60%,rgba(255,213,79,.18),rgba(244,143,177,.10) 50%,transparent 75%); }

  /* ── IFRAME CONTAINER ── */
  .chintu-iframe-container { position:relative; width:100%; height:500px; overflow:hidden; }
  .chintu-iframe { position:absolute; top:0;left:0; width:100%;height:100%; border:none; display:block; pointer-events:all; z-index:1; }
  .chintu-mask-top, .chintu-mask-bottom { position:absolute; left:0;right:0; z-index:10; pointer-events:none; background:var(--bg); }
  .chintu-mask-top    { top:0;    height:48px; }
  .chintu-mask-bottom { bottom:0; height:56px; }

  .chintu-spark-canvas  { position:absolute; inset:0; pointer-events:none; z-index:18; }
  .chintu-fire-canvas   { position:absolute; bottom:0;left:0;right:0;height:200px; pointer-events:none; z-index:19; opacity:0; transition:opacity .4s; }
  .chintu-fire-canvas.active { opacity:1; }
  .chintu-breath-canvas { position:absolute; inset:0; pointer-events:none; z-index:20; opacity:0; transition:opacity .6s; }
  .chintu-breath-canvas.active { opacity:1; }
  .chintu-lightning-overlay { position:absolute; inset:0; pointer-events:none; z-index:21; opacity:0; background:radial-gradient(ellipse at 50% 40%,rgba(255,172,64,.25),transparent 60%); }
  .chintu-lightning-overlay.flash { animation:chintu-lightningBolt .5s ease-out forwards; }
  .chintu-endo-overlay  { position:absolute; inset:0; pointer-events:none; z-index:21; opacity:0; background:radial-gradient(ellipse at 50% 50%,rgba(255,213,79,.18),rgba(244,143,177,.10) 50%,transparent 70%); }
  .chintu-endo-overlay.flash { animation:chintu-endoFlash .8s ease-out forwards; }
  .chintu-crown-el { position:absolute; top:20px;left:50%; transform:translateX(-50%); font-size:2.5rem; pointer-events:none; z-index:22; opacity:0; }
  .chintu-crown-el.show { animation:chintu-crownDrop .5s cubic-bezier(.34,1.56,.64,1) forwards; }
  .chintu-ekaaur-text { position:absolute; top:30%;left:50%; transform:translate(-50%,-50%) scale(0); font-family:'Syne',sans-serif; font-size:2.8rem; font-weight:900; color:var(--gold); text-shadow:0 0 20px var(--orange),0 0 40px var(--gold); pointer-events:none; z-index:23; white-space:nowrap; opacity:0; transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .25s; }
  .chintu-ekaaur-text.pop { transform:translate(-50%,-50%) scale(1); opacity:1; }
  .chintu-endo-text  { position:absolute; top:35%;left:50%; transform:translate(-50%,-50%) scale(0); font-family:'Syne',sans-serif; font-size:2.2rem; font-weight:900; color:var(--endo-gold); text-shadow:0 0 18px var(--endo-rose),0 0 36px var(--endo-peach); pointer-events:none; z-index:23; white-space:nowrap; opacity:0; }
  .chintu-endo-text.pop { animation:chintu-textPop .5s cubic-bezier(.34,1.56,.64,1) forwards; opacity:1; }
  .chintu-now-playing { position:absolute; bottom:50px;left:16px; background:rgba(14,10,6,.88); backdrop-filter:blur(12px); border:1px solid var(--border); border-radius:10px; padding:8px 14px; font-family:'Syne',sans-serif; font-size:.78rem; color:var(--orangeLt); display:none; align-items:center; gap:8px; z-index:24; pointer-events:none; }
  .chintu-now-playing.show { display:flex; }
  .chintu-now-playing .anim-dot { width:6px;height:6px; border-radius:50%; background:var(--orange); box-shadow:0 0 6px var(--orange); animation:chintu-breathe 1s ease-in-out infinite; }
  .chintu-now-playing.endo-badge { color:var(--endo-gold); border-color:rgba(255,213,79,.25); }
  .chintu-now-playing.endo-badge .anim-dot { background:var(--endo-gold); box-shadow:0 0 6px var(--endo-gold); }
  .chintu-drag-hint { position:absolute; bottom:62px;right:14px; background:rgba(14,10,6,.75); backdrop-filter:blur(8px); border:1px solid var(--border); border-radius:8px; padding:5px 10px; font-size:.65rem; color:var(--text-mid); pointer-events:none; z-index:25; display:flex; align-items:center; gap:5px; opacity:1; transition:opacity 1s; }
  .chintu-drag-hint.fade { opacity:0; }

  /* ── SIDEBAR ── */
  .chintu-sidebar { display:flex; flex-direction:column; gap:12px; }
  .chintu-dp-meter { background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:16px; position:relative; overflow:hidden; }
  .chintu-dp-meter::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 50% 100%,rgba(255,214,0,.06),transparent 60%); pointer-events:none; }
  .chintu-dp-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .chintu-dp-label  { font-family:'Syne',sans-serif; font-size:.62rem; font-weight:700; letter-spacing:3.5px; text-transform:uppercase; color:var(--text-dim); }
  .chintu-dp-value  { font-family:'Syne',sans-serif; font-size:1.6rem; font-weight:900; color:var(--gold); line-height:1; transition:color .3s; }
  .chintu-dp-value.maxed { color:#fff; text-shadow:0 0 20px var(--gold); animation:chintu-bulge .4s ease; }
  .chintu-dp-bar-track { height:8px; background:#1e1508; border-radius:4px; overflow:hidden; }
  .chintu-dp-bar-fill  { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--orange),var(--gold)); transition:width .8s cubic-bezier(.34,1.56,.64,1); position:relative; }
  .chintu-dp-bar-fill::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent); background-size:200% 100%; animation:chintu-shimmer 2s infinite; }
  .chintu-dp-sublabels { display:flex; gap:8px; margin-top:10px; }
  .chintu-dp-sub { flex:1; background:#1a1008; border:1px solid var(--border); border-radius:8px; padding:8px 6px; text-align:center; }
  .chintu-dp-sub .sub-val { font-family:'Syne',sans-serif; font-size:1rem; font-weight:800; color:var(--text); transition:all .4s; }
  .chintu-dp-sub .sub-lbl { font-size:.58rem; color:var(--text-dim); letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
  .streak-val-fire { color:var(--fire2) !important; text-shadow:0 0 10px var(--fire1); animation:chintu-bulge .3s ease; }

  .chintu-endo-meter { background:var(--panel); border:1px solid rgba(255,213,79,.12); border-radius:16px; padding:16px; position:relative; overflow:hidden; transition:border-color .4s; }
  .chintu-endo-meter::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 50% 100%,rgba(255,171,145,.07),transparent 60%); pointer-events:none; }
  .chintu-endo-meter.active { border-color:rgba(255,213,79,.3); }
  .chintu-endo-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
  .chintu-endo-label  { font-family:'Syne',sans-serif; font-size:.62rem; font-weight:700; letter-spacing:3.5px; text-transform:uppercase; color:rgba(255,171,145,.5); }
  .chintu-endo-value  { font-family:'Syne',sans-serif; font-size:1.4rem; font-weight:900; color:var(--endo-gold); line-height:1; }
  .chintu-endo-value.maxed { color:#fff; text-shadow:0 0 20px var(--endo-gold); animation:chintu-laughBounce .5s ease; }
  .chintu-endo-bar-track { height:6px; background:#1a1008; border-radius:4px; overflow:hidden; margin-bottom:8px; }
  .chintu-endo-bar-fill  { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--endo-rose),var(--endo-gold),var(--endo-peach)); transition:width .8s cubic-bezier(.34,1.56,.64,1); position:relative; }
  .chintu-endo-bar-fill::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent); background-size:200% 100%; animation:chintu-shimmer 1.8s infinite; }
  .chintu-endo-tagline { font-size:.65rem; color:rgba(255,171,145,.45); letter-spacing:1px; line-height:1.5; font-style:italic; }
  .chintu-endo-tagline strong { color:rgba(255,213,79,.7); font-style:normal; }
  .chintu-endo-sublabels { display:flex; gap:8px; margin-top:10px; }
  .chintu-endo-sub { flex:1; background:#1a1008; border:1px solid rgba(255,213,79,.08); border-radius:8px; padding:7px 6px; text-align:center; }
  .chintu-endo-sub .sub-val { font-family:'Syne',sans-serif; font-size:.95rem; font-weight:800; color:rgba(255,213,79,.8); }
  .chintu-endo-sub .sub-lbl { font-size:.56rem; color:rgba(255,171,145,.4); letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
  .chintu-endo-sub .sub-val.pop { color:var(--endo-gold) !important; text-shadow:0 0 10px var(--endo-gold); animation:chintu-bulge .3s ease; }

  .chintu-reward-panel { background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:14px; }
  .chintu-section-label { font-family:'Syne',sans-serif; font-size:.62rem; font-weight:700; letter-spacing:3.5px; text-transform:uppercase; color:var(--text-dim); padding:0 2px 10px; border-bottom:1px solid var(--border); margin-bottom:10px; }
  .chintu-reward-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }

  .chintu-reward-btn { position:relative; overflow:hidden; border:1px solid var(--border); border-radius:12px; font-family:'DM Sans',sans-serif; font-weight:700; cursor:pointer; transition:all .18s ease; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:14px 8px; background:linear-gradient(145deg,#1e0800,#120500); color:var(--text-mid); text-align:center; }
  .chintu-reward-btn:hover { transform:translateY(-2px); }
  .chintu-reward-btn:active { transform:scale(.95); }
  .chintu-reward-btn.active { animation:chintu-subtleBounce .5s ease infinite; }
  .chintu-reward-btn .r-icon  { font-size:1.6rem; line-height:1; display:block; transition:transform .2s; z-index:2; position:relative; }
  .chintu-reward-btn:hover .r-icon { transform:scale(1.15); }
  .chintu-reward-btn .r-label { font-size:.72rem; font-weight:700; letter-spacing:.5px; z-index:2; position:relative; }
  .chintu-reward-btn .r-sub   { font-size:.58rem; color:var(--text-dim); letter-spacing:1.5px; text-transform:uppercase; z-index:2; position:relative; }
  .chintu-reward-btn .r-dp    { position:absolute; top:6px;right:6px; font-size:.55rem; font-family:'Syne',sans-serif; font-weight:800; padding:2px 5px; border-radius:4px; background:rgba(255,214,0,.12); color:var(--gold); letter-spacing:.5px; z-index:3; }
  .r-ep { position:absolute; top:6px;left:6px; font-size:.52rem; font-family:'Syne',sans-serif; font-weight:800; padding:2px 5px; border-radius:4px; background:rgba(255,213,79,.12); color:var(--endo-gold); letter-spacing:.5px; z-index:3; }

  .btn-highfive:hover,.btn-highfive.active     { border-color:#FF8A65; color:#FF8A65; box-shadow:0 0 16px rgba(255,138,101,.2); }
  .btn-streak:hover,.btn-streak.active         { border-color:#ff9100; color:#ff9100; box-shadow:0 0 20px rgba(255,145,0,.3),0 0 40px rgba(255,72,0,.1); }
  .btn-coin:hover,.btn-coin.active             { border-color:var(--gold); color:var(--gold); box-shadow:0 0 16px rgba(255,214,0,.2); }
  .btn-celebrate:hover,.btn-celebrate.active   { border-color:#a78bfa; color:#a78bfa; box-shadow:0 0 20px rgba(167,139,250,.25); }
  .btn-challenge:hover,.btn-challenge.active   { border-color:var(--orange); color:var(--orange); box-shadow:0 0 16px rgba(230,81,0,.2); }
  .btn-trick:hover,.btn-trick.active           { border-color:#FF8A65; color:#FF8A65; box-shadow:0 0 14px rgba(255,138,101,.2); }
  .btn-levelup:hover,.btn-levelup.active       { border-color:var(--gold); color:#fff; box-shadow:0 0 24px rgba(255,214,0,.4),0 0 50px rgba(255,214,0,.1); }
  .btn-pounce:hover,.btn-pounce.active         { border-color:#5dba3e; color:#5dba3e; box-shadow:0 0 14px rgba(93,186,62,.2); }
  .btn-pep-talk:hover,.btn-pep-talk.active     { border-color:#FFD600; color:#FFD600; box-shadow:0 0 18px rgba(255,214,0,.25); }
  .btn-plotting { grid-column:1/-1; flex-direction:row; justify-content:flex-start; gap:12px; padding:10px 14px; }
  .chintu-reward-btn .r-image-preview { position:absolute; inset:0; z-index:1; border-radius:10px; object-fit:cover; pointer-events:none; opacity:.5; }
  .chintu-reward-btn .r-image-preview::after { content:''; position:absolute; inset:0; background:rgba(0,0,0,.35); border-radius:10px; }
  .btn-plotting:hover,.btn-plotting.active     { border-color:var(--orangeLt); color:var(--text); box-shadow:0 0 12px rgba(255,138,101,.15); }
  .btn-plotting .r-icon { font-size:1.2rem; }
  .btn-breathe:hover,.btn-breathe.active       { border-color:var(--endo-gold); color:var(--endo-gold); box-shadow:0 0 20px rgba(255,213,79,.25),0 0 40px rgba(255,171,145,.10); }
  .btn-laugh:hover,.btn-laugh.active           { border-color:var(--endo-rose); color:var(--endo-rose); box-shadow:0 0 18px rgba(244,143,177,.25); animation:chintu-laughBounce .4s ease infinite; }
  .btn-play { grid-column:1/-1; flex-direction:row; justify-content:flex-start; gap:12px; padding:10px 14px; }
  .btn-play:hover,.btn-play.active             { border-color:var(--endo-peach); color:var(--endo-peach); box-shadow:0 0 16px rgba(255,171,145,.25); }

  .chintu-endo-section-label { font-family:'Syne',sans-serif; font-size:.58rem; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:rgba(255,171,145,.35); padding:8px 2px 8px; border-top:1px solid rgba(255,213,79,.08); margin-top:4px; display:flex; align-items:center; gap:8px; grid-column:1/-1; }
  .chintu-endo-section-label::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,rgba(255,213,79,.12),transparent); }

  .chintu-statusbar { margin-top:18px; padding-top:16px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; font-size:.72rem; color:var(--text-dim); }
  .chintu-statusbar .msg { display:flex; align-items:center; gap:6px; }

  @media (max-width:768px) {
    .chintu-layout { padding:12px 10px 18px; }
    .chintu-header { padding-bottom:10px; margin-bottom:10px; }
    .chintu-logo { gap:8px; }
    .chintu-logo-icon { width:36px; height:36px; border-radius:10px; font-size:18px; }
    .chintu-logo-text h1 { font-size:1.1rem; line-height:1.1; }
    .chintu-logo-text p { font-size:.6rem; letter-spacing:1.3px; }
    .chintu-logo-note { font-size:.52rem; letter-spacing:1px; margin-top:2px; }
    .chintu-status-pill { padding:5px 10px; font-size:.64rem; }

    .chintu-main { grid-template-columns:1fr; gap:10px; }
    .chintu-viewer-wrap { position:sticky; top:8px; z-index:12; }
    .chintu-iframe-container { height:300px; }
    .chintu-sidebar { gap:10px; }
    .chintu-reward-btn { padding:11px 7px; }
    .chintu-statusbar { margin-top:12px; padding-top:10px; font-size:.66rem; }
  }
`;

export default function Chintu() {
  const [dopamine, setDopamine]     = useState(30);
  const [streak, setStreak]         = useState(0);
  const [coins, setCoins]           = useState(0);
  const [level, setLevel]           = useState(1);
  const [endorphins, setEndorphins] = useState(0);
  const [breaths, setBreaths]       = useState(0);
  const [laughs, setLaughs]         = useState(0);
  const [playCount, setPlayCount]   = useState(0);
  const [statusDot, setStatusDot]   = useState('');
  const [statusText, setStatusText] = useState('Loading model…');
  const [msgText, setMsgText]       = useState('Initialising viewer…');
  const [badgeName, setBadgeName]   = useState('Idle');
  const [badgeShow, setBadgeShow]   = useState(false);
  const [badgeEndo, setBadgeEndo]   = useState(false);
  const [activeBtn, setActiveBtn]   = useState(null);
  const [glowClass, setGlowClass]   = useState('');
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
  const [breathActive, setBreathActive]       = useState(false);
  const [fireCanvasActive, setFireCanvasActive] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [showChintu, setShowChintu]     = useState(false);
  const [hintFade, setHintFade]         = useState(false);

  const iframeRef  = useRef(null);
  const sparkRef   = useRef(null);
  const fireRef    = useRef(null);
  const breathRef  = useRef(null);
  const apiRef     = useRef(null);
  const animsRef   = useRef([]);
  const sparksRef  = useRef([]);
  const coinsParRef  = useRef([]);
  const confettiRef  = useRef([]);
  const heartsRef    = useRef([]);
  const fireParRef   = useRef([]);
  const breathRingsRef = useRef([]);
  const fireActiveRef  = useRef(false);
  const endoTimerRef   = useRef(null);
  const streakTimerRef = useRef(null);
  const fireLoopRef    = useRef(null);
  const rafIdRef  = useRef(null);
  const fRafIdRef = useRef(null);
  const bRafIdRef = useRef(null);

  useEffect(() => {
    if (isModelReady) {
      const t = setTimeout(() => setHintFade(true), 5000);
      return () => clearTimeout(t);
    }
  }, [isModelReady]);

  useEffect(() => {
    const id = 'chintu-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id; tag.textContent = CSS;
      document.head.appendChild(tag);
    }
  }, []);

  useEffect(() => {
    if (statusDot === 'ready' && !isModelReady) {
      setIsModelReady(true);
      const t = setTimeout(() => setShowChintu(true), 500);
      return () => clearTimeout(t);
    }
  }, [statusDot, isModelReady]);

  useEffect(() => {
    function resize() {
      const wrap = sparkRef.current?.parentElement;
      if (!wrap) return;
      const w = wrap.offsetWidth, h = wrap.offsetHeight;
      if (sparkRef.current)  { sparkRef.current.width = w;  sparkRef.current.height = h; }
      if (fireRef.current)   { fireRef.current.width = w;   fireRef.current.height = 200; }
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
        ctx.fillStyle = '#FFD600'; ctx.shadowBlur = 12; ctx.shadowColor = '#FFD600';
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

  // ── fire canvas loop ──
  useEffect(() => {
    const canvas = fireRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      fireParRef.current = fireParRef.current.filter(p => p.alpha > .03);
      fireParRef.current.forEach(p => {
        p.x += p.vx; p.y -= p.speed; p.speed += .05; p.alpha -= .012; p.size *= .98;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, p.color); g.addColorStop(.6, withAlpha(p.color, '88')); g.addColorStop(1,'transparent');
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = g; ctx.shadowBlur = 16; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); ctx.restore();
      });
      fRafIdRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(fRafIdRef.current);
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
    const colors = cfg.colors||['#FFD600','#FF8A65','#fff'], big = cfg.big||false;
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

  const spawnHeart = useCallback((cx, cy) => { heartsRef.current.push({ x:cx, y:cy, vx:(Math.random()-.5)*3, vy:-2-Math.random()*2, alpha:1, size:16+Math.random()*12 }); }, []);
  const spawnCoin  = useCallback(() => {
    const canvas=sparkRef.current; if(!canvas) return;
    coinsParRef.current.push({ x:canvas.width*(.3+Math.random()*.4), y:canvas.height*.55, vy:-1-Math.random()*2, vx:(Math.random()-.5)*2, alpha:1, size:10+Math.random()*8, spin:Math.random()*Math.PI*2, spinV:.1+Math.random()*.15 });
  }, []);

  const spawnFireParticle = useCallback(() => {
    const canvas=fireRef.current; if(!canvas) return;
    const cx=canvas.width/2, spread=canvas.width*.28;
    fireParRef.current.push({ x:cx+(Math.random()-.5)*spread, y:canvas.height*.95, vx:(Math.random()-.5)*1.5, speed:2+Math.random()*3, size:8+Math.random()*14, alpha:.8+Math.random()*.2, color:FIRE_COLORS[Math.floor(Math.random()*FIRE_COLORS.length)] });
  }, []);

  const startFire = useCallback(() => {
    fireActiveRef.current = true;
    setFireCanvasActive(true);
    setViewerClass(v => v.includes('fire-active')?v:(v+' fire-active').trim());
    setGlowClass('fire-mode');
    function loop() { if(!fireActiveRef.current) return; for(let i=0;i<4;i++) spawnFireParticle(); fireLoopRef.current=setTimeout(loop,50); }
    loop();
  }, [spawnFireParticle]);

  const stopFire = useCallback(() => {
    fireActiveRef.current = false; setFireCanvasActive(false);
    setViewerClass(v => v.replace('fire-active','').trim()); setGlowClass('');
    if(fireLoopRef.current) clearTimeout(fireLoopRef.current);
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
    if (key === 'breathe') speakFor(key, 5);
    else speakFor(key);

    if (!apiRef.current || animsRef.current.length === 0) { setMsgText('⚠️ Model not ready yet.'); return; }
    setActiveBtn(key);
    setDopamine(d => Math.min(100, d + (DP_GRANT[key]||10)));
    const canvas = sparkRef.current; if (!canvas) return;
    const cx = canvas.width*.45, cy = canvas.height*.5;

    if (key==='high_five') {
      burst(60,{colors:['#FF8A65','#fff','#FFD600'],big:true}); setTimeout(()=>burst(40,{colors:['#FF8A65','#E65100'],big:true}),200);
    } else if (key==='streak_fire') {
      setStreak(s=>s+1); setStreakBlink(true); setTimeout(()=>setStreakBlink(false),400);
      startFire(); burst(50,{colors:['#ff4800','#ff9100','#ffcd00'],big:true});
      if(streakTimerRef.current) clearTimeout(streakTimerRef.current);
      streakTimerRef.current = setTimeout(stopFire, 4000);
    } else if (key==='coin_chase') {
      setCoins(c=>c+3+Math.floor(Math.random()*4));
      const t0=Date.now();
      function coinLoop(){if(Date.now()-t0>3000) return; spawnCoin(); burst(5,{colors:['#FFD600','#FFAB91'],cx:.35+Math.random()*.3}); setTimeout(coinLoop,200);}
      coinLoop();
    } else if (key==='celebrate') {
      burstConfetti(120); burst(80,{colors:['#a78bfa','#FFD600','#FF8A65','#06b6d4'],big:true});
      setTimeout(()=>burstConfetti(60),400); setTimeout(()=>burst(50,{colors:['#fff','#FFD600','#a78bfa'],big:true}),600);
      setGlowClass('hot'); setTimeout(()=>setGlowClass(''),3000);
    } else if (key==='challenge_focus') {
      burst(30,{colors:['#E65100','#FF8A65','#fff']});
      setTimeout(()=>{burst(80,{colors:['#FFD600','#FF8A65','#fff'],big:true}); flashLightning();},2000);
    } else if (key==='trick_show') {
      burst(40,{colors:['#FF8A65','#FFD600']}); setTimeout(()=>burst(60,{colors:['#FF8A65','#fff','#ff9100'],big:true}),400);
      for(let i=0;i<6;i++) { const fc=fireRef.current; if(fc) fireParRef.current.push({x:fc.width*(.3+Math.random()*.4),y:fc.height*.9,vx:(Math.random()-.5)*3,speed:3+Math.random()*2,size:18+Math.random()*14,alpha:.9,color:FIRE_COLORS[Math.floor(Math.random()*FIRE_COLORS.length)]}); }
      setFireCanvasActive(true); setTimeout(()=>{if(!fireActiveRef.current) setFireCanvasActive(false);},2000);
    } else if (key==='level_up') {
      flashLightning(); showEkAur(); showCrown(); setLevel(l=>l+1);
      burst(100,{colors:['#FFD600','#fff','#FF8A65'],big:true}); setTimeout(()=>burstConfetti(80),200);
      setTimeout(()=>burst(60,{colors:['#FFD600','#a78bfa','#fff'],big:true}),500);
      setTimeout(()=>{flashLightning(); burst(40,{colors:['#fff','#FFD600']});},900);
    } else if (key==='pounce') {
      burst(35,{colors:['#5dba3e','#FFD600','#fff']}); setCoins(c=>c+1); spawnCoin(); spawnCoin(); spawnCoin();
    } else if (key==='plotting') {
      burst(15,{colors:['#FFD600','#B8A898']});
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
      const fc=fireRef.current;
      if(fc) for(let i=0;i<4;i++) fireParRef.current.push({x:fc.width*(.35+Math.random()*.3),y:fc.height*.95,vx:(Math.random()-.5)*2,speed:2+Math.random()*2,size:10+Math.random()*12,alpha:.7,color:'#FFD54F'});
      setFireCanvasActive(true); setTimeout(()=>{if(!fireActiveRef.current) setFireCanvasActive(false);},2500);
    }

    // ── Play matching Sketchfab animation ──
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
  }, [burst,burstGold,burstConfetti,spawnCoin,spawnHeart,spawnFireParticle,startFire,stopFire,startEndoAura,flashLightning,showEkAur,showCrown,showEndoText,flashEndoOverlay]);

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
      client.init('abf5788c354f4d4b9ff5ea1fd10c6496', {
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

  // Spec states: Pet(High-5), Streak(Run), Coin Chase(Hunt), Celebrate(Victory), Challenge(Focus), Trick(Pounce/Snap), Level Up, Pounce(Strike)
  const buttons = [
    {key:'streak_fire',    icon:'🔥', label:'Streak',     sub:'motivation surge',  dp:'+25 DP', cls:'btn-streak', img:'/chintu-streak.png'},
    // {key:'celebrate',      icon:'🎉', label:'Celebrate',  sub:'goal achievement',  dp:'+30 DP', cls:'btn-celebrate', img:'/chintu-celebrate.png'},
    {key:'challenge_focus',icon:'🎯', label:'Challenge',  sub:'focus & drive',     dp:'+20 DP', cls:'btn-challenge', img:'/chintu-challenge.png'},
    {key:'trick_show',     icon:'🦊', label:'Trick Show', sub:'confidence boost',  dp:'+18 DP', cls:'btn-trick', img:'/chintu-trick.png'},
    {key:'level_up',       icon:'⭐', label:'Level Up!',  sub:'dopamine cascade',  dp:'+50 DP', cls:'btn-levelup', img:'/chintu-levelup.png'},
    {key:'pep_talk',       icon:'💬', label:'Pep Talk',   sub:'self-belief surge', dp:'+16 DP', cls:'btn-pep-talk', img:'/chintu-Talk.png'},
    {key:'pounce',         icon:'🐾', label:'Pounce',     sub:'quick reward',      dp:'+8 DP',  cls:'btn-pounce', img:'/chintu-pounce.png'},
  ];
  const endoButtons = [
    {key:'breathe',  icon:'🫁', label:'Breathwork', sub:'calm glow', ep:'+20 EP', cls:'btn-breathe', img:'/breathe.png'},
    {key:'laugh',    icon:'😂', label:'Laughter',   sub:'joy burst', ep:'+25 EP', cls:'btn-laugh', img:'/laugh.png'},
  ];

  return (
    <div className="chintu-root">
      {!showChintu && <ChintuEntrance isReady={isModelReady} />}

      <div className={`chintu-ambient${ambientEndo?' endo-active':''}`}><span/><span/><span/><span/></div>

      <div className="chintu-layout">
        <header className="chintu-header">
          <div className="chintu-logo">
            <div className={`chintu-logo-icon${logoEndo?' endo-mode':''}`}>🦊</div>
            <div className="chintu-logo-text">
              <h1>Chintu</h1>
              <p>Dopamine Engine · MANAS360</p>
              <div className="chintu-logo-note">💪 You're Not Alone</div>
            </div>
          </div>
          <div className="chintu-status-pill">
            <div className={`chintu-status-dot${statusDot?' '+statusDot:''}`}/>
            <span>{statusText}</span>
          </div>
        </header>

        <div className="chintu-main">
          {/* VIEWER */}
          <div className={`chintu-viewer-wrap${viewerClass?' '+viewerClass:''}`}>
            <div className={`chintu-viewer-glow${glowClass?' '+glowClass:''}`}/>
            <div className="chintu-iframe-container">
              <iframe
                ref={iframeRef}
                className="chintu-iframe"
                title="Chintu 3D Fox Model"
                frameBorder="0"
                allow="autoplay"
                src="https://sketchfab.com/models/39f97fe58f0b47ce80b6e02814001dd7/embed?api_version=1.0.0&autostart=1&camera=0&preload=1&transparent=1&ui_hint=0&dnt=1&ui_controls=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark=0&ui_ar=0&ui_vr=0&ui_help=0&ui_settings=0&ui_annotations=0"
              />
              <div className="chintu-mask-top"/>
              <div className="chintu-mask-bottom"/>
              <canvas ref={sparkRef}  className="chintu-spark-canvas"/>
              <canvas ref={fireRef}   className={`chintu-fire-canvas${fireCanvasActive?' active':''}`}/>
              <canvas ref={breathRef} className={`chintu-breath-canvas${breathActive?' active':''}`}/>
              <div className={`chintu-lightning-overlay${lightFlash?' flash':''}`}/>
              <div className={`chintu-endo-overlay${endoFlash?' flash':''}`}/>
              <div className={`chintu-crown-el${crownShow?' show':''}`}>👑</div>
              <div className={`chintu-ekaaur-text${ekaurPop?' pop':''}`}>Ek Aur! 🔥</div>
              <div className={`chintu-endo-text${endoTextPop?' pop':''}`}>{endoTextStr}</div>
              <div className={`chintu-now-playing${badgeShow?' show':''}${badgeEndo?' endo-badge':''}`}>
                <div className="anim-dot"/><span>{badgeName}</span>
              </div>
              {isModelReady && (
                <div className={`chintu-drag-hint${hintFade?' fade':''}`}>
                  🖱️ Drag to rotate · scroll to zoom
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="chintu-sidebar">
            <div className="chintu-dp-meter">
              <div className="chintu-dp-header">
                <div className="chintu-dp-label">🧪 Dopamine</div>
                <div className={`chintu-dp-value${dopamine>=100?' maxed':''}`}>{dopamine}</div>
              </div>
              <div className="chintu-dp-bar-track"><div className="chintu-dp-bar-fill" style={{width:`${dopamine}%`}}/></div>
              <div style={{fontSize:'.65rem',color:'rgba(255,214,0,.45)',letterSpacing:'1px',lineHeight:'1.5',fontStyle:'italic',marginTop:'8px'}}>
                <strong style={{color:'rgba(255,214,0,.7)',fontStyle:'normal'}}>Motivation & Focus</strong> — dopamine drives reward, motivation, and goal-seeking behavior
              </div>
              <div className="chintu-dp-sublabels">
                <div className="chintu-dp-sub"><div className={`sub-val${streakBlink?' streak-val-fire':''}`}>{streak}</div><div className="sub-lbl">🔥 Streak</div></div>
                <div className="chintu-dp-sub"><div className="sub-val">{coins}</div><div className="sub-lbl">💰 Coins</div></div>
                <div className="chintu-dp-sub"><div className="sub-val">{level}</div><div className="sub-lbl">⭐ Level</div></div>
              </div>
            </div>

            {/* <div className={`chintu-endo-meter${endorphins>0?' active':''}`}>
              <div className="chintu-endo-header">
                <div className="chintu-endo-label">🌿 Endorphins</div>
                <div className={`chintu-endo-value${endorphins>=100?' maxed':''}`}>{endorphins}</div>
              </div>
              <div className="chintu-endo-bar-track"><div className="chintu-endo-bar-fill" style={{width:`${endorphins}%`}}/></div>
              <div className="chintu-endo-tagline"><strong>Natural painkiller</strong> — breathwork, play &amp; laughter with your fox</div>
              <div className="chintu-endo-sublabels">
                <div className="chintu-endo-sub"><div className="sub-val">{breaths}</div><div className="sub-lbl">🫁 Breaths</div></div>
                <div className="chintu-endo-sub"><div className="sub-val">{laughs}</div><div className="sub-lbl">😂 Laughs</div></div>
                <div className="chintu-endo-sub"><div className="sub-val">{playCount}</div><div className="sub-lbl">🎈 Play</div></div>
              </div>
            </div> */}

            <div className="chintu-reward-panel">
              <div className="chintu-section-label">Reward Actions</div>
              <div className="chintu-reward-grid">
                {buttons.map(b=>(
                  <button key={b.key} className={`chintu-reward-btn ${b.cls}${activeBtn===b.key?' active':''}`} onClick={()=>triggerReward(b.key)} onMouseEnter={()=>setActiveBtn(b.key)} onMouseLeave={()=>setActiveBtn(null)}>
                    {b.img && <img src={b.img} alt={b.label} className="r-image-preview" />}
                    <span className="r-dp">{b.dp}</span>
                    <span className="r-icon">{b.icon}</span>
                    <span className="r-label">{b.label}</span>
                    <span className="r-sub">{b.sub}</span>
                  </button>
                ))}
                <button className={`chintu-reward-btn btn-plotting${activeBtn==='plotting'?' active':''}`} onClick={()=>triggerReward('plotting')}>
                  <span className="r-dp">+5 DP</span><span className="r-icon">💡</span>
                  <div style={{flex:1,textAlign:'left'}}><div className="r-label">Cool Move…</div><div className="r-sub">neural pathway</div></div>
                </button>
                {/* <div className="chintu-endo-section-label">🌿 Endorphins</div>
                {endoButtons.map(b=>(
                  <button key={b.key} className={`chintu-reward-btn ${b.cls}${activeBtn===b.key?' active':''}`} onClick={()=>triggerReward(b.key)} onMouseEnter={()=>setActiveBtn(b.key)} onMouseLeave={()=>setActiveBtn(null)}>
                    {b.img && <img src={b.img} alt={b.label} className="r-image-preview" />}
                    <span className="r-ep">{b.ep}</span>
                    <span className="r-icon">{b.icon}</span>
                    <span className="r-label">{b.label}</span>
                    <span className="r-sub">{b.sub}</span>
                  </button>
                ))}
                <button className={`chintu-reward-btn btn-play${activeBtn==='play_time'?' active':''}`} onClick={()=>triggerReward('play_time')} onMouseEnter={()=>setActiveBtn('play_time')} onMouseLeave={()=>setActiveBtn(null)}>
                  <span className="r-ep">+15 EP</span><span className="r-icon">🎈</span>
                  <div style={{flex:1,textAlign:'left'}}><div className="r-label">Play Time</div><div className="r-sub">bounce &amp; float</div></div>
                </button> */}
              </div>
            </div>
          </div>
        </div>

        <div className="chintu-statusbar">
          <div className="msg"><span>⏳</span><span>{msgText}</span></div>
          <div style={{color:'var(--text-dim)',fontSize:'.68rem',letterSpacing:'1px'}}>MANAS360 · v3.5</div>
        </div>
      </div>
    </div>
  );
}