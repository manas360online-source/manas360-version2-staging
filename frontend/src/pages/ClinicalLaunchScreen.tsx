import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Users, Lock, Brain, Wind, Heart, Zap, Sparkles } from 'lucide-react';
import { activateSystem } from '../api/system-status.api';

// SHA-256 helper (matching backend)
async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ───── Continuous EKG heartbeat path (seamless loop) ───── */
const EKG_PATH = "M0 100 L150 100 L170 50 L190 180 L210 100 L500 100 L520 50 L540 180 L560 100 L800 100 L820 60 L840 170 L860 100 L1000 100";

const ClinicalLaunchScreen: React.FC<{ onActivated: () => void }> = ({ onActivated }) => {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isAuth, setIsAuth] = useState(false);
  const [pin, setPin] = useState("");
  const [showLaunchBtn, setShowLaunchBtn] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [phase, setPhase] = useState<number | 'LIVE' | null>(null);
  const launchedRef = useRef(false); // Prevent double-launch

  /* ── Triple-Click Detection ── */
  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime < 1200) {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 3) {
        setIsAuth(true);
        setClickCount(0);
      }
    } else {
      setClickCount(1);
    }
    setLastClickTime(now);
  };

  /* ── PIN handler ── */
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setPin(v);
    if (v === "360360") setShowLaunchBtn(true);
    else setShowLaunchBtn(false);
  };

  /* ── Backend activation ── */
  const executeFinalLaunch = useCallback(async () => {
    if (launchedRef.current) return;
    launchedRef.current = true;
    try {
      const signature = await sha256('360360_MANAS360_LAUNCH');
      await activateSystem('360360', signature);
    } catch {
      // Even if it fails (e.g. already live), go through
    }
    onActivated();
  }, [onActivated]);

  /* ── Launch button handler ── */
  const triggerLaunch = () => {
    if (isLaunching) return; // Guard against double tap
    setIsLaunching(true);
    setPhase(3);
  };

  /* ── Countdown timer ── */
  useEffect(() => {
    if (phase === null) return;
    let timer: ReturnType<typeof setTimeout>;
    if (phase === 3)     timer = setTimeout(() => setPhase(2), 1500);
    else if (phase === 2) timer = setTimeout(() => setPhase(1), 1500);
    else if (phase === 1) timer = setTimeout(() => setPhase('LIVE'), 1500);
    else if (phase === 'LIVE') timer = setTimeout(executeFinalLaunch, 1200);
    return () => clearTimeout(timer);
  }, [phase, executeFinalLaunch]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden z-[9999] bg-gradient-to-br from-blue-50 via-white to-cyan-50 text-slate-800">

      {/* ── BOUNDARY ORB ── */}
      <motion.div
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute w-4 h-4 bg-blue-500 rounded-full blur-sm shadow-[0_0_15px_#3b82f6] z-50"
        style={{ offsetPath: "inset(15px round 30px)" }}
      />

      {/* ── CONTINUOUS EKG HEARTBEAT ── */}
      <div className="absolute inset-0 z-0 opacity-30 flex items-center pointer-events-none overflow-hidden">
        <div className="flex w-[200%] animate-ekg items-center" style={{ willChange: 'transform' }}>
          <svg width="50%" height="200" viewBox="0 0 1000 200" preserveAspectRatio="none" className="flex-shrink-0">
            <path d={EKG_PATH} fill="none" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg width="50%" height="200" viewBox="0 0 1000 200" preserveAspectRatio="none" className="flex-shrink-0">
            <path d={EKG_PATH} fill="none" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* ── ZEN DRIFT PARTICLES ── */}
      <div className="absolute inset-0 pointer-events-none">
        {[Brain, Wind, Heart, Sparkles, ShieldCheck].map((Icon, i) => (
          <motion.div
            key={i}
            initial={{ y: "110vh", x: `${i * 20 + 5}vw`, opacity: 0 }}
            animate={{ y: "-10vh", opacity: [0, 0.5, 0] }}
            transition={{ duration: 18 + i * 4, repeat: Infinity, ease: "linear", delay: i * 3 }}
            className="absolute text-blue-200/60"
          >
            <Icon size={40} />
          </motion.div>
        ))}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6 text-center">

        {/* MANAS360 Title — always visible during countdown */}
        {isLaunching && (
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-serif font-bold text-blue-700 tracking-[0.4em] mb-6"
          >
            MANAS<span className="font-extrabold">360</span>
          </motion.h1>
        )}

        {/* LOGO with heartbeat */}
        <motion.div
          onClick={!isLaunching ? handleLogoClick : undefined}
          animate={isLaunching ? { scale: 1.05 } : {}}
          className={`relative ${!isLaunching ? 'cursor-pointer' : ''}`}
        >
          {/* Heartbeat Ping Ring — continuous, never breaks */}
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-6 border-2 border-blue-400/40 rounded-full"
          />
          <div className="relative z-10 w-36 h-36 bg-white shadow-lg rounded-full flex items-center justify-center border border-slate-100">
            <img src="/Untitled.png" alt="MANAS360" className="w-20 h-20 object-contain" />
          </div>
        </motion.div>

        {/* ── PRE-LAUNCH STATE ── */}
        {!isLaunching && (
          <>
            <div className="mt-6 space-y-1">
              <h1 className="text-lg font-serif font-bold text-slate-700 tracking-[0.4em]">MANAS<span className="font-extrabold">360</span></h1>
              <p className="text-slate-400 text-xs tracking-[0.2em] flex items-center justify-center gap-2">
                <Lock className="w-3 h-3" /> CLINICAL INFRASTRUCTURE · PREPARING
              </p>
            </div>

            {/* PIN PAD */}
            <AnimatePresence>
              {isAuth && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-slate-100 shadow-xl w-full max-w-xs"
                >
                  <p className="text-slate-400 uppercase tracking-[0.2em] font-semibold text-[10px] mb-3">Clinical Auth Key</p>
                  <input
                    type="password"
                    value={pin}
                    onChange={handlePinChange}
                    className="bg-transparent border-b-2 border-slate-200 focus:border-blue-500 text-slate-700 text-2xl text-center tracking-[0.4em] outline-none w-full mb-4 py-1 transition-colors"
                    autoFocus
                    placeholder="••••"
                  />
                  {showLaunchBtn && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={triggerLaunch}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold tracking-widest hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all uppercase flex items-center justify-center gap-2"
                    >
                      <Zap className="w-3.5 h-3.5" /> Launch Practice
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── COUNTDOWN ── */}
        <AnimatePresence mode="wait">
          {phase !== null && (
            <motion.div
              key={String(phase)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mt-8"
            >
              <div className="text-[7rem] sm:text-[9rem] font-bold text-blue-600 leading-none tracking-tighter mb-2">
                {phase === 'LIVE' ? (
                  <span className="text-green-600">GO</span>
                ) : phase}
              </div>

              <div className="min-h-[2.5rem]">
                {phase === 3 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm sm:text-base text-slate-500 font-medium tracking-wide flex items-center justify-center gap-2">
                    <ShieldCheck className="text-blue-500 w-4 h-4" /> Securing Patient Data Channels…
                  </motion.p>
                )}
                {phase === 2 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm sm:text-base text-slate-500 font-medium tracking-wide flex items-center justify-center gap-2">
                    <Users className="text-blue-500 w-4 h-4" /> Calibrating Therapist Matching…
                  </motion.p>
                )}
                {phase === 1 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm sm:text-base text-green-600 font-semibold tracking-wide flex items-center justify-center gap-2">
                    <Sparkles className="text-green-500 w-4 h-4" /> Establishing Wellness Pathways…
                  </motion.p>
                )}
                {phase === 'LIVE' && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg text-green-600 font-bold tracking-widest uppercase">
                    MANAS360 is Live ✓
                  </motion.p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-6 w-48 mx-auto">
                <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-200">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: `${(1 - (phase === 'LIVE' ? 0 : (phase as number)) / 3) * 100}%` }}
                    transition={{ duration: 0.4 }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClinicalLaunchScreen;
