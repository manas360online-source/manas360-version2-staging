import React, { useState, useEffect, useRef } from 'react';

// ── TEMBO MODAL ──────────────────────────────────────────────────────────────
function TemboModal({ onClose }: { onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // UPDATED: Added padding-left to header in the CSS below to clear the Back Button
  const temboHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tembo — Dopamine Engine</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,500;0,700;1,300&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    :root {
      --bg:#060a0e; --panel:#080e14; --border:#0f2030; --blue:#1565C0;
      --blue-lt:#64B5F6; --teal:#00BCD4; --slate:#B0BEC5;
      --water1:#0288d1; --water2:#00acc1; --water3:#b2ebf2;
      --text-dim:#2e4a5e; --text-mid:#4a8aaa; --text-hi:#90cfe8;
      --endo-gold:#FFD54F; --endo-rose:#F48FB1; --endo-peach:#FFAB91;
      --endo-glow:#FF8A65; --endo-soft:#FFF9C4;
    }
    @keyframes breathe      { 0%,100%{opacity:.18;transform:scale(1)} 50%{opacity:.30;transform:scale(1.06)} }
    @keyframes shimmer      { 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes rumble       { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-3px)} 40%{transform:translateX(3px)} 60%{transform:translateX(-2px)} 80%{transform:translateX(2px)} }
    @keyframes bulge        { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
    @keyframes waterAura    { 0%,100%{box-shadow:0 0 20px 4px #0288d1,0 0 40px 8px #00bcd455} 50%{box-shadow:0 0 36px 10px #00bcd4,0 0 70px 20px #0288d155} }
    @keyframes endoAura     { 0%,100%{box-shadow:0 0 20px 6px #FFD54F55,0 0 50px 15px #F48FB133} 50%{box-shadow:0 0 40px 14px #FFD54F99,0 0 80px 30px #FF8A6555} }
    @keyframes lightningBolt{ 0%,100%{opacity:0} 10%,30%,50%{opacity:1} 20%,40%{opacity:.3} }
    @keyframes endoFlash    { 0%,100%{opacity:0} 10%,40%{opacity:1} 25%{opacity:.5} }
    @keyframes crownDrop    { 0%{transform:translateY(-30px) scale(0);opacity:0} 60%{transform:translateY(4px) scale(1.2);opacity:1} 100%{transform:translateY(0) scale(1);opacity:1} }
    @keyframes subtleBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    @keyframes breathePulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.18);opacity:1} }
    @keyframes laughBounce  { 0%,100%{transform:scale(1) rotate(0)} 25%{transform:scale(1.15) rotate(-3deg)} 75%{transform:scale(1.1) rotate(3deg)} }
    @keyframes endoTextPop  { 0%{transform:translate(-50%,-50%) scale(0) rotate(-10deg);opacity:0} 60%{transform:translate(-50%,-50%) scale(1.1) rotate(2deg);opacity:1} 100%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1} }
    @keyframes endoBarShimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes endoGlow { 0%,100%{opacity:.18;transform:scale(1)} 50%{opacity:.35;transform:scale(1.08)} }

    /* ── LOADING SCREEN ── */
    @keyframes spinRing   { to { transform: rotate(360deg); } }
    @keyframes fadeInUp   { 0%{opacity:0;transform:translateY(14px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes dotPulse   { 0%,80%,100%{transform:scale(0);opacity:0} 40%{transform:scale(1);opacity:1} }
    @keyframes loadShimmer{ 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes trunkWave  { 0%,100%{transform:rotate(0deg)} 30%{transform:rotate(-18deg) translateY(2px)} 60%{transform:rotate(12deg) translateY(-2px)} }
    @keyframes eyeBlink   { 0%,90%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} }
    @keyframes earFlap    { 0%,100%{transform:rotate(0deg) scaleX(1)} 50%{transform:rotate(-8deg) scaleX(1.1)} }

    #loader-screen {
      position: absolute; inset: 0; z-index: 50;
      background: var(--bg);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 0;
      transition: opacity 0.7s ease, visibility 0.7s ease;
    }
    #loader-screen.hidden {
      opacity: 0; visibility: hidden; pointer-events: none;
    }

    /* Elephant SVG loader */
    .loader-elephant-wrap {
      position: relative; width: 120px; height: 120px;
      margin-bottom: 24px;
      animation: fadeInUp .6s ease both;
    }
    .loader-ring {
      position: absolute; inset: -8px;
      border: 2px solid transparent;
      border-top-color: var(--teal);
      border-right-color: var(--blue-lt);
      border-radius: 50%;
      animation: spinRing 1.6s linear infinite;
    }
    .loader-ring-inner {
      position: absolute; inset: 4px;
      border: 1.5px solid transparent;
      border-bottom-color: rgba(0,188,212,.35);
      border-left-color: rgba(100,181,246,.25);
      border-radius: 50%;
      animation: spinRing 2.4s linear infinite reverse;
    }
    .loader-elephant-svg {
      width: 100%; height: 100%;
      filter: drop-shadow(0 0 18px rgba(0,188,212,.5));
    }

    .loader-title {
      font-family: 'Syne', sans-serif;
      font-size: 1.5rem; font-weight: 900;
      color: var(--text-hi);
      letter-spacing: 1px;
      animation: fadeInUp .6s .1s ease both;
      margin-bottom: 6px;
    }
    .loader-sub {
      font-size: .72rem; font-weight: 300;
      color: var(--text-dim); letter-spacing: 3px;
      text-transform: uppercase;
      animation: fadeInUp .6s .3s ease both;
      margin-bottom: 28px;
    }

    /* Progress bar */
    .loader-progress-wrap {
      width: 200px; margin-bottom: 20px;
      animation: fadeInUp .6s .3s ease both;
    }
    .loader-progress-track {
      height: 4px; background: #0a1520; border-radius: 4px; overflow: hidden;
    }
    .loader-progress-fill {
      height: 100%; border-radius: 4px;
      background: linear-gradient(90deg, var(--blue), var(--teal), var(--blue-lt));
      background-size: 200% 100%;
      animation: loadShimmer 1.5s infinite;
      width: 0%;
      transition: width .5s ease;
    }
    .loader-progress-label {
      text-align: center; margin-top: 8px;
      font-size: .62rem; color: var(--text-dim);
      letter-spacing: 2px; text-transform: uppercase;
    }

    /* Dots */
    .loader-dots {
      display: flex; gap: 6px;
      animation: fadeInUp .6s .4s ease both;
    }
    .loader-dots span {
      width: 5px; height: 5px; border-radius: 50%;
      background: var(--teal);
      animation: dotPulse 1.4s ease-in-out infinite;
    }
    .loader-dots span:nth-child(2) { animation-delay: .2s; }
    .loader-dots span:nth-child(3) { animation-delay: .4s; }

    /* Status message */
    #loader-status {
      margin-top: 14px;
      font-size: .65rem; color: var(--text-mid);
      letter-spacing: 1px;
      animation: fadeInUp .6s .5s ease both;
      min-height: 18px;
    }

    /* iframe hidden until ready */
    #elephant-frame {
      opacity: 0;
      transition: opacity 0.8s ease;
    }
    #elephant-frame.visible {
      opacity: 1;
    }

    html, body { height:100%; background:var(--bg); font-family:'DM Sans',sans-serif; color:var(--text-hi); overflow-x:hidden; }
    .ambient { position:fixed; inset:0; pointer-events:none; z-index:0; }
    .ambient span { position:absolute; border-radius:50%; filter:blur(110px); animation:breathe 7s ease-in-out infinite; }
    .ambient span:nth-child(1) { width:500px;height:500px; background:radial-gradient(circle,#1565C0,transparent 70%); top:-180px;left:-140px; }
    .ambient span:nth-child(2) { width:320px;height:320px; background:radial-gradient(circle,#003a56,transparent 70%); bottom:-80px;right:-60px; animation-delay:5s; }
    .ambient span:nth-child(3) { width:240px;height:240px; background:radial-gradient(circle,#00bcd422,transparent 70%); top:40%;left:58%; animation-delay:1.5s; }
    .ambient span:nth-child(4) { width:400px;height:400px; background:radial-gradient(circle,#FFD54F18,transparent 70%); top:25%;left:30%; animation:endoGlow 5s ease-in-out infinite; animation-delay:3s; opacity:0; transition:opacity 1s; }
    .ambient.endo-active span:nth-child(4) { opacity:1; }

    .layout { position:relative; z-index:1; min-height:100vh; display:grid; grid-template-rows:auto 1fr auto; max-width:1000px; margin:0 auto; padding:20px 16px 24px; gap:0; }

    /* ADDED PADDING HERE TO CLEAR THE OVERLAPPING BACK BUTTON */
    header { 
      display:flex; 
      align-items:center; 
      justify-content:space-between; 
      padding-bottom:16px; 
      border-bottom:1px solid var(--border); 
      margin-bottom:16px; 
      padding-left: 140px; 
    }
    
    .logo { display:flex; align-items:center; gap:12px; }
    .logo-icon { width:42px;height:42px; background:linear-gradient(135deg,#1565C0,#0d47a1); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 0 24px rgba(21,101,192,.5); transition:background .6s,box-shadow .6s; }
    .logo-icon.endo-mode { background:linear-gradient(135deg,#FF8A65,#FFD54F); box-shadow:0 0 24px rgba(255,171,145,.5); }
    .logo-text h1 { font-family:'Syne',sans-serif; font-size:1.25rem; font-weight:800; color:var(--text-hi); }
    .logo-text p  { font-size:.65rem; font-weight:300; color:var(--text-dim); letter-spacing:3px; text-transform:uppercase; margin-top:1px; }
    .status-pill  { display:flex; align-items:center; gap:8px; background:#060e16; border:1px solid var(--border); border-radius:50px; padding:6px 12px; font-size:.7rem; color:var(--text-mid); }
    .status-dot   { width:7px;height:7px; border-radius:50%; background:#555; transition:background .4s,box-shadow .4s; }
    .status-dot.ready { background:#26a69a; box-shadow:0 0 8px #26a69a; }
    .status-dot.busy  { background:var(--teal); box-shadow:0 0 8px var(--teal); }
    .status-dot.endo  { background:var(--endo-gold); box-shadow:0 0 10px var(--endo-gold); animation:breathePulse 2s ease-in-out infinite; }

    .main { display:grid; grid-template-columns:1fr 280px; gap:14px; align-items:start; }

    .viewer-wrap { position:relative; border-radius:18px; overflow:hidden; border:1px solid var(--border); background:#030810;
      box-shadow:0 0 0 1px #040d18, 0 16px 60px rgba(0,0,0,.75), inset 0 0 50px rgba(21,101,192,.06); transition:box-shadow .6s; }
    .viewer-glow  { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 80%,rgba(21,101,192,.10),transparent 70%); pointer-events:none; z-index:2; transition:opacity .6s,background .6s; }
    .viewer-glow.hot  { background:radial-gradient(ellipse at 50% 70%,rgba(0,188,212,.22),transparent 70%); }
    .viewer-glow.water-mode { background:radial-gradient(ellipse at 50% 90%,rgba(2,136,209,.3),rgba(0,188,212,.15) 40%,transparent 70%); }
    .viewer-glow.endo-mode  { background:radial-gradient(ellipse at 50% 60%,rgba(255,213,79,.18),rgba(244,143,177,.10) 50%,transparent 75%); }
    iframe#elephant-frame { width:100%; height:440px; display:block; }
    #spark-canvas    { position:absolute; inset:0; pointer-events:none; z-index:10; }
    #water-canvas    { position:absolute; bottom:0; left:0; right:0; height:180px; pointer-events:none; z-index:11; opacity:0; transition:opacity .4s; }
    #water-canvas.active { opacity:1; }
    #breath-canvas   { position:absolute; inset:0; pointer-events:none; z-index:12; opacity:0; transition:opacity .6s; }
    #breath-canvas.active { opacity:1; }
    #lightning-overlay { position:absolute; inset:0; pointer-events:none; z-index:12; opacity:0; background:radial-gradient(ellipse at 50% 40%,rgba(100,181,246,.25),transparent 60%); }
    #lightning-overlay.flash { animation:lightningBolt .5s ease-out forwards; }
    #endo-overlay { position:absolute; inset:0; pointer-events:none; z-index:12; opacity:0; background:radial-gradient(ellipse at 50% 50%,rgba(255,213,79,.18),rgba(244,143,177,.10) 50%,transparent 70%); }
    #endo-overlay.flash { animation:endoFlash .8s ease-out forwards; }
    #crown-el { position:absolute; top:16px; left:50%; transform:translateX(-50%); font-size:2.2rem; pointer-events:none; z-index:13; opacity:0; }
    #crown-el.show { animation:crownDrop .5s cubic-bezier(.34,1.56,.64,1) forwards; }
    .viewer-wrap.water-active { animation:waterAura 1.2s ease-in-out infinite; }
    .viewer-wrap.endo-active  { animation:endoAura 1.5s ease-in-out infinite; }
    #ekaaur-text { position:absolute; top:30%; left:50%; transform:translate(-50%,-50%) scale(0); font-family:'Syne',sans-serif; font-size:2.4rem; font-weight:900; color:var(--teal); text-shadow:0 0 20px var(--blue),0 0 40px var(--teal); pointer-events:none; z-index:20; white-space:nowrap; transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .25s; opacity:0; }
    #ekaaur-text.pop { transform:translate(-50%,-50%) scale(1); opacity:1; }
    #endo-text { position:absolute; top:35%; left:50%; transform:translate(-50%,-50%) scale(0); font-family:'Syne',sans-serif; font-size:2rem; font-weight:900; color:var(--endo-gold); text-shadow:0 0 18px var(--endo-rose),0 0 36px var(--endo-peach); pointer-events:none; z-index:20; white-space:nowrap; opacity:0; }
    #endo-text.pop { animation:endoTextPop .5s cubic-bezier(.34,1.56,.64,1) forwards; opacity:1; }
    .now-playing { position:absolute; bottom:12px;left:12px; background:rgba(6,10,14,.88); backdrop-filter:blur(12px); border:1px solid var(--border); border-radius:8px; padding:6px 12px; font-family:'Syne',sans-serif; font-size:.72rem; color:var(--blue-lt); display:none; align-items:center; gap:6px; z-index:5; animation:none; }
    .now-playing.show { display:flex; }
    .now-playing .anim-dot { width:5px;height:5px; border-radius:50%; background:var(--teal); box-shadow:0 0 6px var(--teal); animation:breathe 1s ease-in-out infinite; }
    .now-playing.endo-badge { color:var(--endo-gold); border-color:rgba(255,213,79,.25); }
    .now-playing.endo-badge .anim-dot { background:var(--endo-gold); box-shadow:0 0 6px var(--endo-gold); }

    .sidebar { display:flex; flex-direction:column; gap:10px; }
    .dp-meter { background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:14px; position:relative; overflow:hidden; }
    .dp-meter::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 50% 100%,rgba(0,188,212,.06),transparent 60%); pointer-events:none; }
    .dp-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
    .dp-label  { font-family:'Syne',sans-serif; font-size:.58rem; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:var(--text-dim); }
    .dp-value  { font-family:'Syne',sans-serif; font-size:1.4rem; font-weight:900; color:var(--teal); line-height:1; transition:color .3s; }
    .dp-value.maxed { color:#fff; text-shadow:0 0 20px var(--teal); animation:bulge .4s ease; }
    .dp-bar-track { height:7px; background:#0a1520; border-radius:4px; overflow:hidden; }
    .dp-bar-fill  { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--blue),var(--teal)); transition:width .8s cubic-bezier(.34,1.56,.64,1); width:30%; position:relative; }
    .dp-bar-fill::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent); background-size:200% 100%; animation:shimmer 2s infinite; }
    .dp-sublabels { display:flex; gap:7px; margin-top:9px; }
    .dp-sub { flex:1; background:#060e16; border:1px solid var(--border); border-radius:7px; padding:7px 5px; text-align:center; }
    .dp-sub .sub-val { font-family:'Syne',sans-serif; font-size:.9rem; font-weight:800; color:var(--text-hi); transition:all .4s; }
    .dp-sub .sub-lbl { font-size:.55rem; color:var(--text-dim); letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
    .streak-val.water { color:var(--teal) !important; text-shadow:0 0 10px var(--blue); animation:bulge .3s ease; }

    .endo-meter { background:var(--panel); border:1px solid rgba(255,213,79,.12); border-radius:14px; padding:14px; position:relative; overflow:hidden; transition:border-color .4s; }
    .endo-meter::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 50% 100%,rgba(255,171,145,.07),transparent 60%); pointer-events:none; }
    .endo-meter.active { border-color:rgba(255,213,79,.3); }
    .endo-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
    .endo-label  { font-family:'Syne',sans-serif; font-size:.58rem; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:rgba(255,171,145,.5); }
    .endo-value  { font-family:'Syne',sans-serif; font-size:1.3rem; font-weight:900; color:var(--endo-gold); line-height:1; transition:color .3s; }
    .endo-value.maxed { color:#fff; text-shadow:0 0 20px var(--endo-gold),0 0 40px var(--endo-rose); animation:laughBounce .5s ease; }
    .endo-bar-track { height:5px; background:#0d0a08; border-radius:4px; overflow:hidden; margin-bottom:7px; }
    .endo-bar-fill  { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--endo-rose),var(--endo-gold),var(--endo-peach)); transition:width .8s cubic-bezier(.34,1.56,.64,1); width:0%; position:relative; }
    .endo-bar-fill::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent); background-size:200% 100%; animation:endoBarShimmer 1.8s infinite; }
    .endo-tagline { font-size:.62rem; color:rgba(255,171,145,.45); letter-spacing:1px; line-height:1.5; font-style:italic; }
    .endo-tagline strong { color:rgba(255,213,79,.7); font-style:normal; }
    .endo-sublabels { display:flex; gap:7px; margin-top:9px; }
    .endo-sub { flex:1; background:#0d0a08; border:1px solid rgba(255,213,79,.08); border-radius:7px; padding:6px 5px; text-align:center; }
    .endo-sub .sub-val { font-family:'Syne',sans-serif; font-size:.85rem; font-weight:800; color:rgba(255,213,79,.8); transition:all .4s; }
    .endo-sub .sub-lbl { font-size:.53rem; color:rgba(255,171,145,.4); letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
    .endo-sub .sub-val.pop { color:var(--endo-gold) !important; text-shadow:0 0 10px var(--endo-gold); animation:bulge .3s ease; }

    .reward-panel { background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:12px; }
    .section-label { font-family:'Syne',sans-serif; font-size:.58rem; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:var(--text-dim); padding:0 2px 8px; border-bottom:1px solid var(--border); margin-bottom:8px; }
    .reward-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
    .reward-btn {
      position:relative; overflow:hidden; border:1px solid transparent; border-radius:10px;
      font-family:'DM Sans',sans-serif; font-weight:700; cursor:pointer;
      transition:all .18s ease; display:flex; flex-direction:column; align-items:center;
      justify-content:center; gap:3px; padding:11px 6px;
      background:#060e16; color:var(--text-mid); text-align:center;
    }
    .reward-btn:hover { transform:translateY(-2px); }
    .reward-btn:active { transform:scale(.95); }
    .reward-btn.active { animation:subtleBounce .5s ease infinite; }
    .reward-btn .r-icon  { font-size:1.4rem; line-height:1; display:block; transition:transform .2s; }
    .reward-btn:hover .r-icon { transform:scale(1.15); }
    .reward-btn .r-label { font-size:.68rem; font-weight:700; letter-spacing:.5px; }
    .reward-btn .r-sub   { font-size:.55rem; color:var(--text-dim); letter-spacing:1.5px; text-transform:uppercase; }
    .reward-btn .r-dp    { position:absolute; top:5px; right:5px; font-size:.5rem; font-family:'Syne',sans-serif; font-weight:800; padding:2px 4px; border-radius:4px; background:rgba(0,188,212,.12); color:var(--teal); letter-spacing:.5px; }
    .r-ep { position:absolute; top:5px; left:5px; font-size:.5rem; font-family:'Syne',sans-serif; font-weight:800; padding:2px 4px; border-radius:4px; background:rgba(255,213,79,.12); color:var(--endo-gold); letter-spacing:.5px; }

    .btn-highfive:hover,.btn-highfive.active { border-color:#64B5F6; color:#64B5F6; box-shadow:0 0 14px rgba(100,181,246,.2); background:linear-gradient(145deg,#071622,#050f18); }
    .btn-streak:hover,.btn-streak.active { border-color:#0288d1; color:#0288d1; box-shadow:0 0 18px rgba(2,136,209,.3); background:linear-gradient(145deg,#041520,#030d16); }
    .btn-coin:hover,.btn-coin.active { border-color:var(--teal); color:var(--teal); box-shadow:0 0 14px rgba(0,188,212,.2); background:linear-gradient(145deg,#081a20,#050f15); }
    .btn-celebrate:hover,.btn-celebrate.active { border-color:#7986cb; color:#7986cb; box-shadow:0 0 18px rgba(121,134,203,.25); background:linear-gradient(145deg,#0a0e1e,#060a14); }
    .btn-challenge:hover,.btn-challenge.active { border-color:#00acc1; color:#00acc1; box-shadow:0 0 14px rgba(0,172,193,.2); background:linear-gradient(145deg,#051020,#030a16); }
    .btn-trick:hover,.btn-trick.active { border-color:#80deea; color:#80deea; box-shadow:0 0 12px rgba(128,222,234,.2); background:linear-gradient(145deg,#081525,#05101a); }
    .btn-levelup:hover,.btn-levelup.active { border-color:var(--teal); color:#fff; box-shadow:0 0 22px rgba(0,188,212,.4); background:linear-gradient(145deg,#061420,#040e18); }
    .btn-pounce:hover,.btn-pounce.active { border-color:#26a69a; color:#26a69a; box-shadow:0 0 12px rgba(38,166,154,.2); background:linear-gradient(145deg,#071a14,#050f0e); }
    .btn-breathe:hover,.btn-breathe.active { border-color:var(--endo-gold); color:var(--endo-gold); box-shadow:0 0 18px rgba(255,213,79,.25); background:linear-gradient(145deg,#1a1208,#120d06); }
    .btn-laugh:hover,.btn-laugh.active { border-color:var(--endo-rose); color:var(--endo-rose); box-shadow:0 0 16px rgba(244,143,177,.25); background:linear-gradient(145deg,#1a0e10,#12080a); animation:laughBounce .4s ease infinite; }
    .btn-play:hover,.btn-play.active { border-color:var(--endo-peach); color:var(--endo-peach); box-shadow:0 0 14px rgba(255,171,145,.25); background:linear-gradient(145deg,#1a1008,#120b06); }
    .btn-plotting { grid-column:1/-1; flex-direction:row; justify-content:flex-start; gap:10px; padding:8px 12px; }
    .btn-plotting:hover,.btn-plotting.active { border-color:var(--text-mid); color:var(--text-hi); background:linear-gradient(145deg,#060e18,#040a12); }
    .btn-plotting .r-icon { font-size:1.1rem; }
    .endo-section-label { font-family:'Syne',sans-serif; font-size:.54rem; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:rgba(255,171,145,.35); padding:7px 2px; border-top:1px solid rgba(255,213,79,.08); margin-top:3px; display:flex; align-items:center; gap:7px; }
    .endo-section-label::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,rgba(255,213,79,.12),transparent); }

    .statusbar { margin-top:14px; padding-top:12px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; font-size:.68rem; color:var(--text-dim); }
    .statusbar #msg { display:flex; align-items:center; gap:5px; }

    #rotation-lock {
      position: absolute;
      inset: 0;
      z-index: 9;
      cursor: default;
      background: transparent;
    }
  </style>
</head>
<body>
<div class="ambient" id="ambient-wrap"><span></span><span></span><span></span><span></span></div>
<div class="layout">
  <header>
    <div class="logo">
      <div class="logo-icon" id="logo-icon">🐘</div>
      <div class="logo-text">
        <h1>Tembo</h1>
        <p>Dopamine Engine · MANAS360</p>
      </div>
    </div>
    <div class="status-pill">
      <div class="status-dot" id="status-dot"></div>
      <span id="status-text">Loading model…</span>
    </div>
  </header>
  <div class="main">
    <div class="viewer-wrap" id="viewer-wrap">
      <div class="viewer-glow" id="viewer-glow"></div>
      <canvas id="spark-canvas"></canvas>
      <canvas id="water-canvas"></canvas>
      <canvas id="breath-canvas"></canvas>
      <div id="lightning-overlay"></div>
      <div id="endo-overlay"></div>
      <div id="crown-el">👑</div>
      <div id="ekaaur-text">Ek Aur! 💧</div>
      <div id="endo-text">Feel Good! 🌟</div>

      <div id="rotation-lock"></div>

      <div id="loader-screen">
        <div class="loader-elephant-wrap">
          <div class="loader-ring"></div>
          <div class="loader-ring-inner"></div>
          <svg class="loader-elephant-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="60" cy="72" rx="32" ry="26" fill="#1a3a4a" opacity="0.9"/>
            <ellipse cx="60" cy="48" rx="22" ry="20" fill="#1a3a4a" opacity="0.95"/>
            <ellipse cx="38" cy="46" rx="13" ry="16" fill="#0f2a38" opacity="0.85"
              style="transform-origin:46px 46px; animation:earFlap 2.4s ease-in-out infinite;"/>
            <ellipse cx="82" cy="46" rx="13" ry="16" fill="#0f2a38" opacity="0.85"
              style="transform-origin:74px 46px; animation:earFlap 2.4s ease-in-out infinite reverse;"/>
            <path d="M52 60 Q44 70 46 82 Q47 88 52 86" stroke="#00BCD4" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.9"
              style="transform-origin:52px 60px; animation:trunkWave 2s ease-in-out infinite;"/>
            <path d="M54 62 Q50 68 48 72" stroke="#64B5F6" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.7"/>
            <ellipse cx="52" cy="44" rx="3.5" ry="3.5" fill="#00BCD4" opacity="0.9"
              style="transform-origin:52px 44px; animation:eyeBlink 3.5s ease-in-out infinite;"/>
            <ellipse cx="52" cy="44" rx="1.5" ry="1.5" fill="#060a0e"/>
            <ellipse cx="68" cy="44" rx="3.5" ry="3.5" fill="#00BCD4" opacity="0.9"
              style="transform-origin:68px 44px; animation:eyeBlink 3.5s ease-in-out infinite .4s;"/>
            <ellipse cx="68" cy="44" rx="1.5" ry="1.5" fill="#060a0e"/>
            <rect x="34" y="90" width="10" height="16" rx="5" fill="#1a3a4a" opacity="0.85"/>
            <rect x="48" y="92" width="10" height="14" rx="5" fill="#1a3a4a" opacity="0.85"/>
            <rect x="62" y="92" width="10" height="14" rx="5" fill="#1a3a4a" opacity="0.85"/>
            <rect x="76" y="90" width="10" height="16" rx="5" fill="#1a3a4a" opacity="0.85"/>
            <path d="M91 70 Q98 68 96 76" stroke="#0f2a38" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7"/>
            <circle cx="60" cy="48" r="18" fill="none" stroke="#00BCD4" stroke-width="0.5" opacity="0.25"/>
          </svg>
        </div>
        <div class="loader-title">Tembo</div>
        <div class="loader-sub">Sacred Grove · Loading</div>
        <div class="loader-progress-wrap">
          <div class="loader-progress-track">
            <div class="loader-progress-fill" id="loader-bar"></div>
          </div>
          <div class="loader-progress-label" id="loader-pct">Initialising…</div>
        </div>
        <div class="loader-dots">
          <span></span><span></span><span></span>
        </div>
        <div id="loader-status">Connecting to Sketchfab…</div>
      </div>

      <iframe id="elephant-frame" title="Jungle Animal: Cartoon Elephant" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking"
        src="https://sketchfab.com/models/52401c7067f54ff3813da84df073b5f6/embed?api_version=1.0.0&autostart=1&camera=0&preload=1&transparent=1&ui_hint=0&dnt=1&ui_controls=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark=0&ui_ar=0&ui_vr=0&ui_help=0&ui_settings=0&ui_annotations=0">
      </iframe>
      <div class="now-playing" id="now-playing">
        <div class="anim-dot"></div>
        <span id="anim-name-badge">Idle</span>
      </div>
    </div>
    <div class="sidebar">
      <div class="dp-meter">
        <div class="dp-header">
          <div class="dp-label">🧪 Dopamine</div>
          <div class="dp-value" id="dp-value">30</div>
        </div>
        <div class="dp-bar-track"><div class="dp-bar-fill" id="dp-bar" style="width:30%"></div></div>
        <div class="dp-sublabels">
          <div class="dp-sub"><div class="sub-val" id="streak-val">0</div><div class="sub-lbl">💧 Streak</div></div>
          <div class="dp-sub"><div class="sub-val" id="coins-val">0</div><div class="sub-lbl">🪙 Coins</div></div>
          <div class="dp-sub"><div class="sub-val" id="level-val">1</div><div class="sub-lbl">⚡ Level</div></div>
        </div>
      </div>
      <div class="endo-meter" id="endo-meter">
        <div class="endo-header">
          <div class="endo-label">🌿 Endorphins</div>
          <div class="endo-value" id="endo-value">0</div>
        </div>
        <div class="endo-bar-track"><div class="endo-bar-fill" id="endo-bar" style="width:0%"></div></div>
        <div class="endo-tagline"><strong>Natural painkiller</strong> — breathwork, play &amp; laughter</div>
        <div class="endo-sublabels">
          <div class="endo-sub"><div class="sub-val" id="breaths-val">0</div><div class="sub-lbl">🫁 Breaths</div></div>
          <div class="endo-sub"><div class="sub-val" id="laughs-val">0</div><div class="sub-lbl">😂 Laughs</div></div>
          <div class="endo-sub"><div class="sub-val" id="play-val">0</div><div class="sub-lbl">🎈 Play</div></div>
        </div>
      </div>
      <div class="reward-panel">
        <div class="section-label">Reward Actions</div>
        <div class="reward-grid">
          <button class="reward-btn btn-highfive" onclick="triggerReward('high_five',this)"><span class="r-dp">+15</span><span class="r-icon">🙌</span><span class="r-label">High Five</span><span class="r-sub">spark burst</span></button>
          <button class="reward-btn btn-streak" onclick="triggerReward('streak_fire',this)"><span class="r-dp">+25</span><span class="r-icon">💧</span><span class="r-label">Streak</span><span class="r-sub">water aura</span></button>
          <button class="reward-btn btn-coin" onclick="triggerReward('coin_chase',this)"><span class="r-dp">+10</span><span class="r-icon">🪙</span><span class="r-label">Coin Chase</span><span class="r-sub">collect loop</span></button>
          <button class="reward-btn btn-celebrate" onclick="triggerReward('celebrate',this)"><span class="r-dp">+30</span><span class="r-icon">🎉</span><span class="r-label">Celebrate</span><span class="r-sub">victory dance</span></button>
          <button class="reward-btn btn-challenge" onclick="triggerReward('challenge_focus',this)"><span class="r-dp">+20</span><span class="r-icon">🎯</span><span class="r-label">Challenge</span><span class="r-sub">focus + burst</span></button>
          <button class="reward-btn btn-trick" onclick="triggerReward('trick_show',this)"><span class="r-dp">+18</span><span class="r-icon">🌀</span><span class="r-label">Trick Show</span><span class="r-sub">stomp splash</span></button>
          <button class="reward-btn btn-levelup" onclick="triggerReward('level_up',this)"><span class="r-dp">+50</span><span class="r-icon">⚡</span><span class="r-label">Level Up!</span><span class="r-sub">ek aur!</span></button>
          <button class="reward-btn btn-pounce" onclick="triggerReward('pounce',this)"><span class="r-dp">+8</span><span class="r-icon">🐾</span><span class="r-label">Pounce</span><span class="r-sub">leap & grab</span></button>
          <button class="reward-btn btn-plotting" onclick="triggerReward('plotting',this)"><span class="r-dp">+5</span><span class="r-icon">💡</span><div style="flex:1;text-align:left;"><div class="r-label">Plotting…</div><div class="r-sub">scheming loop</div></div></button>
          <div class="endo-section-label" style="grid-column:1/-1;">🌿 Endorphins</div>
          <button class="reward-btn btn-breathe" onclick="triggerReward('breathe',this)"><span class="r-ep">+20 EP</span><span class="r-icon">🫁</span><span class="r-label">Breathwork</span><span class="r-sub">calm glow</span></button>
          <button class="reward-btn btn-laugh" onclick="triggerReward('laugh',this)"><span class="r-ep">+25 EP</span><span class="r-icon">😂</span><span class="r-label">Laughter</span><span class="r-sub">joy burst</span></button>
          <button class="reward-btn btn-play" style="grid-column:1/-1;flex-direction:row;justify-content:flex-start;gap:10px;padding:8px 12px;" onclick="triggerReward('play_time',this)"><span class="r-ep">+15 EP</span><span class="r-icon" style="font-size:1.1rem;">🎈</span><div style="flex:1;text-align:left;"><div class="r-label">Play Time</div><div class="r-sub">bounce & float</div></div></button>
        </div>
      </div>
    </div>
  </div>
  <div class="statusbar">
    <div id="msg"><span>⏳</span><span id="msg-text">Initialising viewer…</span></div>
    <div style="color:var(--text-dim);font-size:.62rem;letter-spacing:1px;">MANAS360 · v3.1</div>
  </div>
</div>

<script src="https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js"></script>
<script>
let api=null,animations=[];
let dopamine=30,streak=0,coins=0,level=1;
let endorphins=0,breaths=0,laughs=0,playCount=0;
let streakTimer=null,waterActive=false,endoActive=false,endoTimer=null;
const iframe=document.getElementById('elephant-frame');
const msgText=document.getElementById('msg-text');
const dot=document.getElementById('status-dot');
const dotText=document.getElementById('status-text');
const badge=document.getElementById('now-playing');
const badgeName=document.getElementById('anim-name-badge');
const glow=document.getElementById('viewer-glow');
const viewerWrap=document.getElementById('viewer-wrap');
const ambientWrap=document.getElementById('ambient-wrap');
const logoIcon=document.getElementById('logo-icon');
const sparkCanvas=document.getElementById('spark-canvas');
const sCtx=sparkCanvas.getContext('2d');
const waterCanvas=document.getElementById('water-canvas');
const wCtx=waterCanvas.getContext('2d');
const breathCanvas=document.getElementById('breath-canvas');
const bCtx=breathCanvas.getContext('2d');
const loaderScreen=document.getElementById('loader-screen');
const loaderBar=document.getElementById('loader-bar');
const loaderPct=document.getElementById('loader-pct');
const loaderStatus=document.getElementById('loader-status');

let loaderProgress=0;
const LOADER_MESSAGES=['Connecting to Sketchfab…','Loading 3D geometry…','Applying textures…','Preparing animations…','Almost there…'];
let loaderMsgIdx=0;
const loaderMsgTimer=setInterval(()=>{
  loaderMsgIdx=(loaderMsgIdx+1)%LOADER_MESSAGES.length;
  loaderStatus.textContent=LOADER_MESSAGES[loaderMsgIdx];
},1800);
function advanceLoader(target){
  loaderProgress=Math.min(target,100);
  loaderBar.style.width=loaderProgress+'%';
  loaderPct.textContent=loaderProgress+'%';
}
let fakeProgressId=setInterval(()=>{
  if(loaderProgress<85){advanceLoader(loaderProgress+(3+Math.random()*4));}
},400);

function revealElephant(){
  clearInterval(fakeProgressId);
  clearInterval(loaderMsgTimer);
  advanceLoader(100);
  loaderStatus.textContent='Ready! Summoning Tembo… 🐘';
  loaderPct.textContent='100%';
  setTimeout(()=>{
    loaderScreen.classList.add('hidden');
    iframe.classList.add('visible');
  },2000);
}

function resizeCanvases(){sparkCanvas.width=viewerWrap.offsetWidth;sparkCanvas.height=viewerWrap.offsetHeight;waterCanvas.width=viewerWrap.offsetWidth;waterCanvas.height=180;breathCanvas.width=viewerWrap.offsetWidth;breathCanvas.height=viewerWrap.offsetHeight;}
resizeCanvases();window.addEventListener('resize',resizeCanvases);
function addDopamine(n){dopamine=Math.min(100,dopamine+n);document.getElementById('dp-bar').style.width=dopamine+'%';const v=document.getElementById('dp-value');v.textContent=dopamine;v.classList.toggle('maxed',dopamine>=100);}
function addCoins(n){coins+=n;document.getElementById('coins-val').textContent=coins;}
function bumpStreak(){streak++;const sv=document.getElementById('streak-val');sv.textContent=streak;sv.classList.add('water');setTimeout(()=>sv.classList.remove('water'),400);}
function addLevel(){level++;document.getElementById('level-val').textContent=level;}
function addEndorphins(n){endorphins=Math.min(100,endorphins+n);document.getElementById('endo-bar').style.width=endorphins+'%';const v=document.getElementById('endo-value');v.textContent=endorphins;v.classList.toggle('maxed',endorphins>=100);document.getElementById('endo-meter').classList.toggle('active',endorphins>0);}
function bumpSubStat(id,counter){counter++;const el=document.getElementById(id);el.textContent=counter;el.classList.add('pop');setTimeout(()=>el.classList.remove('pop'),500);return counter;}
function startEndoAura(){endoActive=true;viewerWrap.classList.add('endo-active');glow.classList.add('endo-mode');ambientWrap.classList.add('endo-active');logoIcon.classList.add('endo-mode');dot.classList.add('endo');dotText.textContent='🌿 Endorphins';if(endoTimer)clearTimeout(endoTimer);endoTimer=setTimeout(stopEndoAura,5000);}
function stopEndoAura(){endoActive=false;viewerWrap.classList.remove('endo-active');glow.classList.remove('endo-mode');ambientWrap.classList.remove('endo-active');logoIcon.classList.remove('endo-mode');dot.classList.remove('endo');dot.classList.add('ready');dotText.textContent='Ready';}
function flashEndo(){const el=document.getElementById('endo-overlay');el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),900);}
function showEndoText(msg){const el=document.getElementById('endo-text');el.textContent=msg;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');setTimeout(()=>{el.classList.remove('pop');el.style.opacity=0;},1400);}
let breathRings=[];
function spawnBreathRing(){const cx=breathCanvas.width/2,cy=breathCanvas.height*.52;breathRings.push({x:cx,y:cy,r:20,maxR:Math.min(cx,cy)*.85,alpha:.6,color:Math.random()>.5?'#FFD54F':'#F48FB1',speed:1.2+Math.random()*.8});}
function drawBreathRings(){bCtx.clearRect(0,0,breathCanvas.width,breathCanvas.height);breathRings=breathRings.filter(r=>r.alpha>.01);breathRings.forEach(r=>{r.r+=r.speed;r.alpha-=0.008;bCtx.save();bCtx.globalAlpha=r.alpha*.6;bCtx.strokeStyle=r.color;bCtx.lineWidth=2;bCtx.shadowBlur=18;bCtx.shadowColor=r.color;bCtx.beginPath();bCtx.arc(r.x,r.y,r.r,0,Math.PI*2);bCtx.stroke();bCtx.restore();});requestAnimationFrame(drawBreathRings);}
drawBreathRings();
let hearts=[];
function spawnHeart(cx,cy){hearts.push({x:cx,y:cy,vx:(Math.random()-.5)*3,vy:-2-Math.random()*2,alpha:1,size:14+Math.random()*10,life:0});}
function animateHearts(){hearts=hearts.filter(h=>h.alpha>.05);hearts.forEach(h=>{h.x+=h.vx;h.y+=h.vy;h.vy+=.04;h.alpha*=.97;h.life++;sCtx.save();sCtx.globalAlpha=h.alpha;sCtx.font=h.size+'px serif';sCtx.textAlign='center';sCtx.shadowBlur=12;sCtx.shadowColor='#F48FB1';sCtx.fillText('❤️',h.x,h.y);sCtx.restore();});}
let sparks=[];
function burst(count,cfg={}){const cx=sparkCanvas.width*(cfg.cx||0.42),cy=sparkCanvas.height*(cfg.cy||0.55),colors=cfg.colors||['#00BCD4','#64B5F6','#fff'],big=cfg.big||false;for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,speed=(big?6:2)+Math.random()*(big?8:4);sparks.push({x:cx+(Math.random()-.5)*(big?120:50),y:cy+(Math.random()-.5)*(big?80:30),vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-(big?4:2),color:colors[Math.floor(Math.random()*colors.length)],alpha:1,size:(big?6:3)+Math.random()*(big?5:3),glow:big?20:8});}}
function burstGold(count,cx,cy){for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,speed=1.5+Math.random()*4;sparks.push({x:cx+(Math.random()-.5)*60,y:cy+(Math.random()-.5)*40,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-1.5,color:['#FFD54F','#F48FB1','#FFAB91','#FFF9C4'][Math.floor(Math.random()*4)],alpha:1,size:3+Math.random()*5,glow:14});}}
let coins_p=[];
function spawnCoin(){coins_p.push({x:sparkCanvas.width*(.3+Math.random()*.4),y:sparkCanvas.height*.55,vy:-1-Math.random()*2,vx:(Math.random()-.5)*2,alpha:1,size:8+Math.random()*7,spin:Math.random()*Math.PI*2,spinV:.1+Math.random()*.15});}
function animateCoins(){coins_p=coins_p.filter(c=>c.alpha>.05);coins_p.forEach(c=>{c.x+=c.vx;c.y+=c.vy;c.vy+=.04;c.alpha*=.96;c.spin+=c.spinV;sCtx.save();sCtx.globalAlpha=c.alpha;sCtx.translate(c.x,c.y);sCtx.rotate(c.spin);sCtx.fillStyle='#00BCD4';sCtx.shadowBlur=12;sCtx.shadowColor='#00BCD4';sCtx.beginPath();sCtx.ellipse(0,0,c.size*Math.abs(Math.cos(c.spin)),c.size,0,0,Math.PI*2);sCtx.fill();sCtx.restore();});}
let confetti_p=[];
const CONFETTI_COLORS=['#00BCD4','#64B5F6','#7986cb','#26a69a','#80deea','#fff'];
const ENDO_CONFETTI=['#FFD54F','#F48FB1','#FFAB91','#FFF9C4','#FF8A65','#fff'];
function burstConfetti(n,warm=false){const palette=warm?ENDO_CONFETTI:CONFETTI_COLORS;for(let i=0;i<n;i++){confetti_p.push({x:sparkCanvas.width*(.2+Math.random()*.6),y:sparkCanvas.height*.15,vx:(Math.random()-.5)*5,vy:-3-Math.random()*4,color:palette[Math.floor(Math.random()*palette.length)],alpha:1,w:5+Math.random()*7,h:3+Math.random()*4,rot:Math.random()*Math.PI*2,rotV:(Math.random()-.5)*.2});}}
function animateConfetti(){confetti_p=confetti_p.filter(c=>c.alpha>.04);confetti_p.forEach(c=>{c.x+=c.vx;c.y+=c.vy;c.vy+=.08;c.vx*=.99;c.alpha*=.985;c.rot+=c.rotV;sCtx.save();sCtx.globalAlpha=c.alpha;sCtx.translate(c.x,c.y);sCtx.rotate(c.rot);sCtx.fillStyle=c.color;sCtx.fillRect(-c.w/2,-c.h/2,c.w,c.h);sCtx.restore();});}
let waterParticles=[];
let waterLoopId=null;
function startWater(){waterActive=true;waterCanvas.classList.add('active');viewerWrap.classList.add('water-active');glow.classList.add('water-mode');spawnWaterLoop();}
function stopWater(){waterActive=false;waterCanvas.classList.remove('active');viewerWrap.classList.remove('water-active');glow.classList.remove('water-mode');if(waterLoopId)clearTimeout(waterLoopId);}
function spawnWaterLoop(){if(!waterActive)return;for(let i=0;i<3;i++)spawnWaterDrop();waterLoopId=setTimeout(spawnWaterLoop,60);}
function spawnWaterDrop(){const cx=waterCanvas.width/2,spread=waterCanvas.width*.3;waterParticles.push({x:cx+(Math.random()-.5)*spread,y:waterCanvas.height*.7,vx:(Math.random()-.5)*1.5,vy:-(1.5+Math.random()*3),size:5+Math.random()*12,alpha:.7+Math.random()*.3,color:Math.random()>.5?(Math.random()>.5?'#0288d1':'#00acc1'):'#b2ebf2',isRipple:Math.random()>.6});}
function drawWater(){wCtx.clearRect(0,0,waterCanvas.width,waterCanvas.height);waterParticles=waterParticles.filter(p=>p.alpha>.03);waterParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx+=(Math.random()-.5)*.2;p.vy+=.03;p.alpha*=.96;p.size*=.98;wCtx.save();wCtx.globalAlpha=p.alpha*.8;if(p.isRipple){wCtx.strokeStyle=p.color;wCtx.lineWidth=1.5;wCtx.shadowBlur=10;wCtx.shadowColor=p.color;wCtx.beginPath();wCtx.ellipse(p.x,p.y,p.size*1.5,p.size*.6,0,0,Math.PI*2);wCtx.stroke();}else{const grad=wCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);grad.addColorStop(0,p.color);grad.addColorStop(.6,p.color+'88');grad.addColorStop(1,'transparent');wCtx.fillStyle=grad;wCtx.shadowBlur=15;wCtx.shadowColor=p.color;wCtx.beginPath();wCtx.arc(p.x,p.y,p.size,0,Math.PI*2);wCtx.fill();}wCtx.restore();});requestAnimationFrame(drawWater);}
drawWater();
function flashLightning(){const el=document.getElementById('lightning-overlay');el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),600);}
function showEkAur(){const el=document.getElementById('ekaaur-text');el.classList.add('pop');setTimeout(()=>el.classList.remove('pop'),1200);}
function showCrown(){const el=document.getElementById('crown-el');el.classList.remove('show');void el.offsetWidth;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2500);}
const ANIM_MAP={high_five:['Talk'],streak_fire:['Run'],coin_chase:['Walk'],celebrate:['Success'],challenge_focus:['Idle_2','Talk'],trick_show:['Roll','Jump_Up'],level_up:['Success','Jump_Up'],pounce:['Roll','Walk'],plotting:['Idle','Sleep'],breathe:['Idle','Sleep'],laugh:['Success','Jump_Up'],play_time:['Run','Walk','Roll']};
const DP_GRANT={high_five:15,streak_fire:25,coin_chase:10,celebrate:30,challenge_focus:20,trick_show:18,level_up:50,pounce:8,plotting:5,breathe:8,laugh:12,play_time:10};
const EP_GRANT={breathe:20,laugh:25,play_time:15};
const EFFECTS={
  high_five(){burst(60,{colors:['#64B5F6','#fff','#00BCD4'],big:true});setTimeout(()=>burst(40,{colors:['#64B5F6','#1565C0'],big:true}),200);},
  streak_fire(){bumpStreak();startWater();burst(50,{colors:['#0288d1','#00acc1','#b2ebf2'],big:true});if(streakTimer)clearTimeout(streakTimer);streakTimer=setTimeout(stopWater,4000);},
  coin_chase(){addCoins(3+Math.floor(Math.random()*4));const t0=Date.now();function spawnLoop(){if(Date.now()-t0>3000)return;spawnCoin();burst(5,{colors:['#00BCD4','#b2ebf2'],cx:.35+Math.random()*.3});setTimeout(spawnLoop,200);}spawnLoop();},
  celebrate(){burstConfetti(120);burst(80,{colors:['#7986cb','#00BCD4','#64B5F6','#80deea'],big:true});setTimeout(()=>burstConfetti(60),400);setTimeout(()=>burst(50,{colors:['#fff','#00BCD4','#7986cb'],big:true}),600);glow.classList.add('hot');setTimeout(()=>glow.classList.remove('hot'),3000);},
  challenge_focus(){burst(30,{colors:['#00acc1','#0288d1','#fff']});setTimeout(()=>{burst(80,{colors:['#00BCD4','#64B5F6','#fff'],big:true});flashLightning();},2000);},
  trick_show(){burst(40,{colors:['#80deea','#00BCD4']});setTimeout(()=>burst(60,{colors:['#64B5F6','#fff','#00acc1'],big:true}),400);for(let i=0;i<8;i++){waterParticles.push({x:waterCanvas.width*(.3+Math.random()*.4),y:waterCanvas.height*.8,vx:(Math.random()-.5)*3,vy:-(2+Math.random()*2),size:15+Math.random()*20,alpha:.9,color:'#00BCD4',isRipple:true});}waterCanvas.classList.add('active');setTimeout(()=>{if(!waterActive)waterCanvas.classList.remove('active');},2000);},
  level_up(){flashLightning();showEkAur();showCrown();addLevel();burst(100,{colors:['#00BCD4','#fff','#64B5F6'],big:true});setTimeout(()=>burstConfetti(80),200);setTimeout(()=>burst(60,{colors:['#00BCD4','#7986cb','#fff'],big:true}),500);setTimeout(()=>{flashLightning();burst(40,{colors:['#fff','#00BCD4']});},900);},
  pounce(){burst(35,{colors:['#26a69a','#00BCD4','#fff']});addCoins(1);spawnCoin();spawnCoin();},
  plotting(){burst(15,{colors:['#00BCD4','#4a8aaa']});},
  breathe(){breaths=bumpSubStat('breaths-val',breaths);addEndorphins(EP_GRANT.breathe);startEndoAura();breathCanvas.classList.add('active');for(let i=0;i<5;i++){setTimeout(()=>spawnBreathRing(),i*300);}setTimeout(()=>{for(let i=0;i<5;i)setTimeout(()=>spawnBreathRing(),i*400);},1800);const cx=sparkCanvas.width*.5,cy=sparkCanvas.height*.5;burstGold(25,cx,cy);setTimeout(()=>burstGold(20,cx,cy),800);showEndoText('Breathe… 🌿');setTimeout(()=>{if(!endoActive)breathCanvas.classList.remove('active');},5500);},
  laugh(){laughs=bumpSubStat('laughs-val',laughs);addEndorphins(EP_GRANT.laugh);startEndoAura();flashEndo();const cx=sparkCanvas.width*.45,cy=sparkCanvas.height*.5;for(let i=0;i<12;i++){setTimeout(()=>{spawnHeart(cx+(Math.random()-.5)*140,cy+(Math.random()-.5)*80);},i*80);}burstConfetti(80,true);setTimeout(()=>burstConfetti(50,true),350);burstGold(40,cx,cy);showEndoText('Ha ha ha! 😂');badge.classList.add('endo-badge');setTimeout(()=>badge.classList.remove('endo-badge'),4000);},
  play_time(){playCount=bumpSubStat('play-val',playCount);addEndorphins(EP_GRANT.play_time);startEndoAura();const cx=sparkCanvas.width*.45,cy=sparkCanvas.height*.48;for(let i=0;i<8;i++){setTimeout(()=>{const bx=cx+(Math.random()-.5)*200,by=cy+(Math.random()-.5)*100;burstGold(12,bx,by);spawnHeart(bx,by);},i*150);}burstConfetti(60,true);burstGold(30,cx,cy);showEndoText('Play Time! 🎈');for(let i=0;i<5;i++){waterParticles.push({x:waterCanvas.width*(.35+Math.random()*.3),y:waterCanvas.height*.85,vx:(Math.random()-.5)*2,vy:-(1+Math.random()*1.5),size:10+Math.random()*14,alpha:.7,color:'#FFD54F',isRipple:true});}waterCanvas.classList.add('active');setTimeout(()=>{if(!waterActive)waterCanvas.classList.remove('active');},2500);}
};
(function loop(){sCtx.clearRect(0,0,sparkCanvas.width,sparkCanvas.height);sparks=sparks.filter(s=>s.alpha>.05);sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=.12;s.vx*=.96;s.alpha*=.94;s.size*=.97;sCtx.save();sCtx.globalAlpha=s.alpha;sCtx.fillStyle=s.color;sCtx.shadowBlur=s.glow;sCtx.shadowColor=s.color;sCtx.beginPath();sCtx.arc(s.x,s.y,s.size,0,Math.PI*2);sCtx.fill();sCtx.restore();});animateCoins();animateConfetti();animateHearts();requestAnimationFrame(loop);})();
function triggerReward(key,btn){
  if(!api||animations.length===0){msgText.textContent='⚠️ Model not ready yet.';return;}
  document.querySelectorAll('.reward-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  addDopamine(DP_GRANT[key]||10);
  if(EFFECTS[key])EFFECTS[key]();
  const candidates=ANIM_MAP[key]||[];
  let match=null;
  for(const name of candidates){match=animations.find(a=>a[1].toLowerCase().replace(/[\\s_]/g,'')===name.toLowerCase().replace(/[\\s_]/g,''))||animations.find(a=>a[1].toLowerCase().includes(name.toLowerCase()));if(match)break;}
  if(!match)match=animations[0];
  if(match){
    const isEndo=['breathe','laugh','play_time'].includes(key);
    if(!isEndo){dot.classList.remove('ready','endo');dot.classList.add('busy');dotText.textContent='Playing…';}
    api.setCurrentAnimationByUID(match[0],function(err){if(!err){api.play();badgeName.textContent=match[1];badge.classList.remove('show');void badge.offsetWidth;badge.classList.add('show');msgText.textContent='▶ '+match[1];if(!isEndo){setTimeout(()=>{dot.classList.remove('busy');dot.classList.add('ready');dotText.textContent='Ready';},600);}}});
  }
}
const client=new Sketchfab(document.getElementById('elephant-frame'));
client.init('52401c7067f54ff3813da84df073b5f6',{
  success:function(sfApi){
    api=sfApi;
    api.start();
    api.addEventListener('viewerready',function(){
      api.getAnimations(function(err,anims){
        if(!err){
          animations=anims;
          dot.classList.add('ready');
          dotText.textContent='Model ready';
          msgText.textContent=anims.length+' animations loaded — trigger a reward';
          const idle=anims.find(a=>a[1].toLowerCase()==='idle')||anims[0];
          if(idle)api.setCurrentAnimationByUID(idle[0],()=>api.play());
        } else {
          msgText.textContent='⚠️ Could not load animations.';
        }
        revealElephant();
      });
    });
  },
  error:function(){
    dot.style.background='#e53935';
    dotText.textContent='Load failed';
    msgText.textContent='❌ Failed to connect to Sketchfab.';
    clearInterval(fakeProgressId);
    clearInterval(loaderMsgTimer);
    loaderStatus.textContent='Connection failed ❌';
    loaderBar.style.width='100%';
    loaderBar.style.background='#e53935';
    setTimeout(()=>{ loaderScreen.classList.add('hidden'); iframe.classList.add('visible'); },1500);
  },
  autostart:1,transparent:1,ui_controls:0,ui_infos:0,ui_stop:0,
});
</script>
</body>
</html>`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      {/* Modal container */}
      <div
        className="relative w-full h-full max-w-6xl max-h-[96vh] mx-4 rounded-3xl overflow-hidden shadow-2xl bg-[#060a0e]"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* --- BACK BUTTON (Top Left) --- */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold text-sm transition-all hover:scale-105 active:scale-95 group"
          style={{ 
            background: 'rgba(255,255,255,0.1)', 
            backdropFilter: 'blur(12px)', 
            border: '1px solid rgba(255,255,255,0.2)' 
          }}
          aria-label="Back to Hub"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          <span>Back to Hub</span>
        </button>

        {/* Close button (Top Right) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg transition-all hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
          aria-label="Close Tembo"
        >
          ✕
        </button>

        {/* Tembo iframe */}
        <iframe
          ref={iframeRef}
          srcDoc={temboHTML}
          className="w-full h-full border-0"
          title="Tembo — Healing Elephant Dopamine Engine"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DigitalPetHubPage() {
  const [showTembo, setShowTembo] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Tembo Modal */}
      {showTembo && <TemboModal onClose={() => setShowTembo(false)} />}

      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-teal-700">
              MANAS<span className="text-amber-500">360</span>
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <a href="/" className="text-teal-600 font-semibold hover:text-teal-700">PT01 Hub</a>
              <span>→</span>
              <a href="/" className="text-teal-600 font-semibold hover:text-teal-700">PT06</a>
              <span>→</span>
              <span className="font-semibold text-slate-600">Digital Pet Hub</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-violet-50 via-white to-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-12 items-center">
            <div className="flex-shrink-0">
              <div className="w-72 aspect-[9/16] rounded-3xl overflow-hidden bg-black shadow-2xl border-4 border-violet-100 flex items-center justify-center">
                <div className="text-center text-white text-sm p-4">
                  <span className="block text-2xl mb-2">🐾</span>
                  Avatar Pitch — "Your Digital Companion"
                </div>
              </div>
            </div>
            <div className="flex-1">
              <div className="inline-block px-3 py-1 rounded-full bg-violet-200 text-violet-700 text-xs font-bold mb-4 tracking-wider">
                🐾 PT06 — DIGITAL PET HUB
              </div>
              <h1 className="text-5xl font-bold leading-tight mb-3">
                Your <span className="text-violet-600">Oxytocin</span> Engine — A Companion Who's Always Happy to See You
              </h1>
              <p className="text-slate-700 leading-relaxed mb-6">
                Science says your brain releases serotonin and oxytocin from connection — and it doesn't care if that connection has fur or pixels. It only cares if it's <em>felt</em>.
              </p>
              <div className="flex gap-4">
                <button className="px-7 py-3 rounded-full text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all shadow-lg">
                  🐾 Meet Your Pet
                </button>
                <button className="px-7 py-3 rounded-full text-sm font-bold bg-white text-violet-600 border-2 border-violet-600 hover:bg-violet-50 transition-all">
                  ✨ See the Science
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Science Strip */}
      <div className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-center text-4xl font-bold mb-4">🧬 The Neurochemistry Behind Digital Companionship</h2>
          <p className="text-center text-slate-600 text-sm max-w-2xl mx-auto mb-12">
            Every interaction with your digital pet triggers real brain chemistry. This isn't gaming — it's <strong>evidence-based emotional wellness</strong>.
          </p>
          <div className="grid grid-cols-4 gap-4">
            {[
              { emoji: '💜', name: 'OXYTOCIN', color: 'text-violet-600', desc: '"Love hormone" — released when your pet greets you, nuzzles, or responds to your care.', tag: 'Trigger: Pet greetings, nurturing' },
              { emoji: '☀️', name: 'SEROTONIN', color: 'text-orange-600', desc: '"Happy chemical" — boosted by daily routines, care rituals, and watching your pet thrive.', tag: 'Trigger: Daily check-ins, growth' },
              { emoji: '⚡', name: 'DOPAMINE', color: 'text-orange-500', desc: '"Reward chemical" — released when you unlock milestones, win mini-games, level up your pet.', tag: 'Trigger: Achievements, games' },
              { emoji: '🔔', name: 'ENDORPHINS', color: 'text-yellow-500', desc: '"Natural painkiller" — released during breathwork, play, laughter and meditation with your pet.', tag: 'Trigger: Breathwork, play' },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 text-center hover:border-violet-300 hover:shadow-md transition-all">
                <span className="block text-2xl mb-3">{item.emoji}</span>
                <div className={`text-sm font-bold ${item.color} mb-1`}>{item.name}</div>
                <p className="text-xs text-slate-700 leading-relaxed mb-3">{item.desc}</p>
                <span className="inline-block text-xs font-semibold text-teal-700 bg-teal-100 px-3 py-1 rounded-full">{item.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Access Pathways */}
      <div className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-center text-4xl font-bold mb-12">🔀 Two Ways to Begin</h2>
          <div className="grid grid-cols-2 gap-8">
            {[
              { icon: '📋', title: 'Prescribed by Therapist / Psychiatrist', desc: 'After a coaching session, your therapist prescribes a specific pet type based on your needs — loneliness, anxiety, habit building, or engagement therapy.', steps: ['Therapy Session', 'Rx: Digital Pet', 'Therapist picks species', 'Unlocked in your Hub'] },
              { icon: '🛍️', title: 'Explore Independently', desc: 'Browse the full pet catalog. Start free with an ambient companion, then upgrade to interactive or AI-powered pets as your journey deepens.', steps: ['PT06 Hub Landing', 'Watch Avatar Pitch', 'Choose Free Pet', 'Upgrade when ready'] },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 border-2 border-slate-200 hover:border-violet-400 hover:shadow-lg transition-all cursor-pointer">
                <span className="text-4xl block mb-4">{item.icon}</span>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-700 leading-relaxed mb-4">{item.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {item.steps.map((step, j) => (
                    <React.Fragment key={j}>
                      <span className="text-xs font-semibold py-2 px-3 rounded-full bg-violet-100 text-violet-700">{step}</span>
                      {j < item.steps.length - 1 && <span className="text-xs text-slate-400 self-center">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pet Catalog */}
      <div className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-center text-4xl font-bold mb-3">🐾 Pet Companion Catalog</h2>
          <p className="text-center text-slate-600 text-sm max-w-2xl mx-auto mb-12">
            Each species is designed for a specific therapeutic purpose. Your pet isn't just cute — it's <strong>medicine</strong>.
          </p>

          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold">Tier 1 — Ambient Companions</h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold text-green-700 bg-green-100">FREE</span>
              <span className="text-sm text-slate-600">Watch, breathe, be present</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { emoji: '🐠', name: 'Koi Fish', env: '🌊 Zen Pond', tags: ['Anxiety', 'Stress Relief'] },
                { emoji: '🐱', name: 'Lotus Cat', env: '🏯 Garden Temple', tags: ['Grounding', 'Mindfulness'] },
                { emoji: '✨', name: 'Cloud Sprite', env: '☁️ Sky Realm', tags: ['Lightness', 'Letting Go'] },
              ].map((pet, i) => (
                <div key={i} className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="h-32 flex items-center justify-center text-6xl bg-gradient-to-b from-blue-50 to-slate-50">{pet.emoji}</div>
                  <div className="p-4">
                    <div className="font-bold text-slate-900 mb-0.5">{pet.name}</div>
                    <div className="text-xs text-slate-600 mb-3">{pet.env}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {pet.tags.map((tag, j) => (
                        <span key={j} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold">Tier 2 — Interactive Companions</h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold text-purple-700 bg-purple-100">₹99/MO OR ₹199 OWN</span>
              <span className="text-sm text-slate-600">Pet, play, breathe, grow</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { emoji: '🐕', name: 'Golden Puppy', env: '☀️ Sunny Meadow', tags: ['Joy', 'Routine Building'], bg: 'from-yellow-50', clickable: false },
                { emoji: '🦉', name: 'Wise Owl', env: '🌳 Forest Library', tags: ['Cognitive', 'Quiz Games'], bg: 'from-blue-50', clickable: false },
                { emoji: '🐘', name: 'Healing Elephant', env: '🌴 Sacred Grove', tags: ['Emotional Strength', 'Memory'], bg: 'from-green-50', clickable: true },
                { emoji: '🐢', name: 'Patience Turtle', env: '🏖️ Quiet Beach', tags: ['Patience', 'Slow Living'], bg: 'from-orange-50', clickable: false },
              ].map((pet, i) => (
                <div
                  key={i}
                  onClick={pet.clickable ? () => setShowTembo(true) : undefined}
                  className={`bg-gradient-to-br ${pet.bg} to-white border-2 rounded-2xl overflow-hidden transition-all
                    ${pet.clickable
                      ? 'border-violet-400 shadow-lg cursor-pointer hover:shadow-xl hover:-translate-y-2 hover:border-violet-500 ring-2 ring-violet-200'
                      : 'border-slate-200 hover:shadow-md hover:-translate-y-1 cursor-default'
                    }`}
                >
                  <div className="h-28 flex items-center justify-center text-5xl relative">
                    {pet.emoji}
                    {pet.clickable && (
                      <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-xs font-bold bg-violet-600 text-white px-3 py-1 rounded-full shadow-lg">
                          ▶ Meet Tembo
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="font-bold text-slate-900">{pet.name}</div>
                      {pet.clickable && <span className="text-xs">✨</span>}
                    </div>
                    <div className="text-xs text-slate-600 mb-3">{pet.env}</div>
                    <div className="flex flex-wrap gap-1">
                      {pet.tags.map((tag, j) => (
                        <span key={j} className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700">{tag}</span>
                      ))}
                    </div>
                    {pet.clickable && (
                      <div className="mt-3 text-xs text-violet-600 font-semibold flex items-center gap-1">
                        <span>🐘</span> Click to experience →
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold">Tier 3 — AI Companions</h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold text-amber-700 bg-amber-100">₹299/MO OR ₹499 OWN</span>
              <span className="text-sm text-slate-600">Talk, remember, evolve, heal</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { emoji: '🦋', name: 'Phoenix Friend', env: '🔥 Rebirth Temple', tags: ['Transformation', 'Crisis Support'] },
                { emoji: '🐉', name: 'Guardian Dragon', env: '💎 Crystal Cave', tags: ['Protection', 'Voice Chat'] },
                { emoji: '🦚', name: 'Wisdom Peacock', env: '🌸 Lotus Garden', tags: ['Vedic Wisdom', 'Self-Discovery'] },
              ].map((pet, i) => (
                <div key={i} className="bg-gradient-to-br from-pink-50 to-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="h-28 flex items-center justify-center text-5xl">{pet.emoji}</div>
                  <div className="p-4">
                    <div className="font-bold text-slate-900 mb-0.5">{pet.name}</div>
                    <div className="text-xs text-slate-600 mb-3">{pet.env}</div>
                    <div className="flex flex-wrap gap-1">
                      {pet.tags.map((tag, j) => (
                        <span key={j} className="text-xs font-semibold px-2 py-1 rounded-full bg-pink-100 text-pink-700">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-center text-4xl font-bold mb-3">💰 Pricing Architecture — Hybrid Model</h2>
          <p className="text-center text-slate-600 text-sm max-w-2xl mx-auto mb-12">
            Same proven model as Sound Therapy. Low barrier entry → à la carte exploration → subscription conversion.
          </p>
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[
              { icon: '🌱', title: 'Starter', price: '₹0', sub: '/forever', tagline: 'Try before you commit', featured: false, features: ['1 ambient pet (Koi, Cat, or Sprite)', '2 environments', 'View-only mode (watch, breathe)', 'Basic mood check-in', '3 breathing exercises', 'Therapist Rx pets always unlocked'], cta: 'Get Started — Free' },
              { icon: '🐾', title: 'Per Pet', price: '₹99-299', sub: '/mo per pet or ₹199-499 to own forever', featured: true, features: ['Choose any Tier 2 or 3 pet', 'Full interactions + mini-games', "Pet's dedicated environment", 'AR mode (place pet in your room)', 'Progress tracking per pet', 'Therapist dashboard integration', 'Offline mode for owned pets'], cta: 'Choose Your Pet →' },
              { icon: '👑', title: 'Pet Paradise', price: '₹299', sub: '/month', tagline: 'All 10 pets + all features', featured: false, features: ['All 10 pet species unlocked', 'All environments + seasonal themes', 'AI voice conversation (Tier 3 pets)', 'Unlimited mini-games', 'Pet evolution with wellness journey', 'Family sharing (up to 4 members)', 'Connects to MANAS360 Premium ₹299'], cta: 'Upgrade to Paradise' },
            ].map((plan, i) => (
              <div key={i} className={`bg-white rounded-3xl p-8 border transition-all hover:shadow-lg relative ${plan.featured ? 'border-violet-600 shadow-xl' : 'border-slate-200'}`}>
                {plan.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-4 py-1 rounded-full">BEST VALUE</div>}
                <span className="text-4xl block mb-4">{plan.icon}</span>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.title}</h3>
                <div className="text-4xl font-bold text-violet-600 mb-1">{plan.price}</div>
                <p className="text-xs text-slate-600 mb-6">{plan.sub}</p>
                {plan.tagline && <p className="text-xs text-slate-600 mb-6">{plan.tagline}</p>}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex gap-2 items-start text-xs text-slate-700">
                      <span className="text-purple-600 font-bold">✓</span><span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-full text-sm font-bold transition-all ${plan.featured ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-white border-2 border-violet-600 text-violet-600 hover:bg-violet-50'}`}>{plan.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-center text-4xl font-bold mb-3">⏰ A Day With Your Digital Pet — The Oxytocin Schedule</h2>
          <p className="text-center text-slate-600 text-sm max-w-2xl mx-auto mb-12">Each touchpoint is designed to trigger specific neurochemicals. This is prescribable wellness.</p>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { time: '7:00 AM', icon: '☀️', title: 'Morning Greeting', desc: 'Pet wakes up with you. Happy animation + "Good morning! How did you sleep?" Mood check-in (1-10 scale).', tags: ['💜 Oxytocin', '☀️ Serotonin'] },
              { time: '7:15 AM', icon: '🫁', title: 'Breathing Exercise Together', desc: "Pet breathes with you. 4-7-8 breathing animation. Pet's belly rises and falls in sync.", tags: ['🔔 Endorphins', '💜 Oxytocin'] },
              { time: '12:30 PM', icon: '🐾', title: 'Midday Check-in', desc: 'Push notification: "Your puppy misses you! 🐕" Open app → pet does happy dance → micro-game (2 min). Stress break.', tags: ['⚡ Dopamine', '☀️ Serotonin'] },
              { time: '5:00 PM', icon: '🎮', title: 'Mini-Game Session', desc: '5-minute therapeutic game with your pet. Progress unlocks new environments.', tags: ['⚡ Dopamine', '🔔 Endorphins'] },
              { time: '9:30 PM', icon: '🌙', title: 'Bedtime Wind-Down', desc: 'Pet yawns, curls up. Guided gratitude. Pet falls asleep with you. Ambient sounds fade in.', tags: ['💜 Oxytocin', '☀️ Serotonin', '🔔 Endorphins'] },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-6 bg-white border border-slate-200 rounded-2xl hover:border-violet-300 hover:shadow-md transition-all">
                <div className="text-sm font-bold text-violet-600 min-w-20">{item.time}</div>
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-700 leading-relaxed mb-2">{item.desc}</p>
                  <div className="flex gap-2 flex-wrap">
                    {item.tags.map((tag, j) => (
                      <span key={j} className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 py-12 text-center bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <p className="font-bold text-2xl text-teal-700 mb-2">MANAS<span className="text-amber-500">360</span></p>
          <p className="text-sm text-slate-600 mb-2">Digital Pet Hub — PT06 Strategy & Product Architecture</p>
          <p className="text-sm text-slate-600 italic">Oxytocin Engine: "Your brain doesn't care if connection has fur or pixels. It only cares if it's <strong>felt</strong>."</p>
        </div>
      </div>
    </div>
  );
}