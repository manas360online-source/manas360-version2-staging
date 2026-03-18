import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, Zap, CheckCircle } from 'lucide-react';
import { activateSystem } from '../api/system-status.api';

// SHA-256 helper (matching backend)
async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const ClinicalLaunchScreen: React.FC<{ onActivated: () => void }> = ({ onActivated }) => {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showPinPad, setShowPinPad] = useState(false);
  const [pin, setPin] = useState('');
  const [showLaunchButton, setShowLaunchButton] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Triple click detection
  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime < 1000) {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount === 3) {
        setShowPinPad(true);
        setClickCount(0);
      }
    } else {
      setClickCount(1);
    }
    setLastClickTime(now);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '360360') {
      setShowLaunchButton(true);
      setShowPinPad(false);
      setError(null);
    } else {
      setError('Invalid Access Key');
      setPin('');
    }
  };

  const startLaunchSequence = async () => {
    setLaunching(true);
    
    // Sequence timing
    const steps = [
      { t: 3, msg: "Synchronizing Patient Data Encryption... OK" },
      { t: 2, msg: "Calibrating Provider Availability Matrix... OK" },
      { t: 1, msg: "Enabling Emergency Response Protocols... OK" },
      { t: 0, msg: "PRACTICE IS LIVE" }
    ];

    for (const step of steps) {
      setCountdown(step.t);
      setStatusLog(prev => [...prev, step.msg]);
      await new Promise(r => setTimeout(r, 1200));
    }

    try {
      const signature = await sha256(`360360_MANAS360_LAUNCH`);
      await activateSystem('360360', signature);
      onActivated();
    } catch (err: any) {
      setError(err.message || 'Activation failed');
      setLaunching(false);
      setCountdown(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center overflow-hidden font-mono z-[9999]">
      {/* Pulsing heartbeat background */}
      <motion.div 
        animate={{ 
          opacity: [0.1, 0.3, 0.1],
          scale: [1, 1.05, 1]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
        className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-slate-950 to-emerald-600/20"
      />

      <div className="relative z-10 w-full max-w-xl px-4">
        <AnimatePresence mode="wait">
          {!launching ? (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center space-y-8"
            >
              {/* Terminal Logo Trigger */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogoClick}
                className="inline-block p-10 rounded-full bg-slate-900/50 border border-slate-800 backdrop-blur-2xl cursor-pointer hover:border-blue-500/50 transition-colors shadow-2xl"
              >
                <Shield className="w-16 h-16 text-blue-400" />
              </motion.div>

              <div className="space-y-4">
                <h1 className="text-xl text-blue-100 tracking-[0.3em] font-bold">MANAS360 CLINICAL TERMINAL</h1>
                <p className="text-slate-500 text-sm italic">Clinical Infrastructure Preparing. External Access Restricted.</p>
              </div>

              {/* Secret Trigger Result: PIN Pad */}
              {showPinPad && (
                <motion.form 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onSubmit={handlePinSubmit}
                  className="max-w-xs mx-auto space-y-4"
                >
                  <label className="text-[10px] uppercase text-slate-500 tracking-widest">Enter Clinical Activation Key</label>
                  <input 
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-center text-blue-400 text-2xl tracking-[0.5em] focus:outline-none focus:border-blue-500 transition-all"
                    autoFocus
                  />
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                </motion.form>
              )}

              {/* Big Launch Button */}
              {showLaunchButton && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startLaunchSequence}
                  className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold shadow-xl shadow-emerald-500/20 flex items-center gap-3 mx-auto uppercase tracking-widest"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  Activate Practice
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="launching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="text-center space-y-6">
                <div className="text-9xl font-bold text-blue-500 tabular-nums select-none">
                  {countdown}
                </div>
                <div className="flex justify-center items-center gap-2 text-blue-400 tracking-tighter">
                  <Activity className="w-5 h-5 animate-pulse" />
                  <span className="text-sm font-semibold uppercase">Real-time System Calibration</span>
                </div>
              </div>

              {/* Monitor Output */}
              <div className="bg-black/80 border border-slate-800 rounded-2xl p-8 h-56 overflow-hidden relative shadow-inner">
                <div className="space-y-3">
                  {statusLog.map((log, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs flex items-center gap-4"
                    >
                      <span className="text-emerald-500 font-bold tracking-tighter">SYS.OUT {">"}</span>
                      <span className={i === statusLog.length - 1 ? "text-emerald-300" : "text-slate-600"}>
                        {log}
                      </span>
                      {i < statusLog.length - 1 && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                    </motion.div>
                  ))}
                </div>
                {/* Scanline effect */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Background Pulse Rings during launch */}
      {launching && (
        <>
          {[1, 2, 3].map((i) => (
             <motion.div 
               key={i}
               initial={{ scale: 0.5, opacity: 0 }}
               animate={{ scale: 3, opacity: [0, 0.15, 0] }}
               transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
               className="absolute inset-0 rounded-full border border-blue-500/20 pointer-events-none"
             />
          ))}
        </>
      )}
    </div>
  );
};

export default ClinicalLaunchScreen;
