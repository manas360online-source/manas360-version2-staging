// frontend/src/components/patient/HitASixerGame.tsx
// ✅ FINAL MOBILE-OPTIMIZED VERSION (Fixed empty box + perfect button size)

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patientApi } from '@/api/patient';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

const HitASixerGame: React.FC = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const normalizedRole = String(user?.role || '').toLowerCase().replace(/_/g, '');
  const canClaimWallet = isAuthenticated && normalizedRole === 'patient';
  const { balance, refreshWallet } = useWallet({ enabled: canClaimWallet });
  const total = Number((balance as any)?.total_balance || 0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const [stage, setStage] = useState<'ready' | 'start' | 'bowling' | 'result'>('ready');
  const [outcome, setOutcome] = useState<'sixer' | 'four' | 'out' | null>(null);
  const [credit, setCredit] = useState(0);
  const [hitQuality, setHitQuality] = useState<'perfect' | 'good' | 'miss'>('miss');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [guestGamesPlayed, setGuestGamesPlayed] = useState(0);
  const [guestBest, setGuestBest] = useState<'sixer' | 'four' | 'out' | null>(null);

  // Eligibility
  const eligibilityQuery = useQuery({
    queryKey: ['cricket-eligibility'],
    queryFn: () => patientApi.getGameEligibility(),
    refetchInterval: 15000,
    retry: false,
    enabled: canClaimWallet,
  });
  const eligibility = eligibilityQuery.data;
  const eligibilityError = (eligibilityQuery.error as any)?.response?.data?.message || '';

  // Play → Backend decides outcome
  const playMutation = useMutation({
    mutationFn: () => patientApi.playGame(),
    onSuccess: (data) => {
      const earned = data.credit ?? (data.outcome === 'sixer' ? 108 : data.outcome === 'four' ? 50 : 10);
      setOutcome(data.outcome);
      setCredit(earned);
      setStage('start');
      setIsFullScreen(true);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Cannot play now'),
  });

  // ==================== FULL SCREEN CANVAS WITH PREVIEW ====================
  const drawPreview = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const W = canvas.width;
    const H = canvas.height;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#052e22');
    grad.addColorStop(1, '#0f5c44');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Pitch
    ctx.fillStyle = '#d4b37c';
    ctx.fillRect(40, H * 0.41, W - 80, H * 0.45);

    // Crease lines
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(40, H * 0.49); ctx.lineTo(W - 40, H * 0.49); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40, H * 0.63); ctx.lineTo(W - 40, H * 0.63); ctx.stroke();

    // Stumps
    ctx.fillStyle = '#f8f8f8';
    const stumpBase = H * 0.44;
    const stumpH = H * 0.27;
    [W - 175, W - 160, W - 145].forEach(sx => ctx.fillRect(sx, stumpBase, 13, stumpH));
    ctx.fillRect(W - 178, stumpBase, 46, 5); // Bails

    // Static Ball
    ctx.fillStyle = '#e63939';
    ctx.beginPath();
    ctx.arc(180, H * 0.58, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(180, H * 0.58, 20, 0.4, Math.PI - 0.4);
    ctx.stroke();

    // Bat (slightly angled)
    const BAT_X = W / 2 - 40;
    const BAT_Y = H * 0.60;
    ctx.save();
    ctx.translate(BAT_X, BAT_Y);
    ctx.rotate(38 * Math.PI / 180);
    ctx.fillStyle = '#6b3d11'; ctx.fillRect(-25, -22, 32, 44);
    ctx.fillStyle = '#c8922a'; ctx.fillRect(7, -24, 165, 48);
    ctx.fillStyle = '#e6b84a'; ctx.fillRect(7, -24, 7, 48);
    ctx.restore();

    // Pulsing golden circle (preview)
    const pulse = Math.sin(Date.now() / 300) * 6 + 95;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 12;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.ellipse(BAT_X + 90, BAT_Y, pulse, 105, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const startFullScreenGame = (finalOutcome: 'sixer' | 'four' | 'out') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const W = canvas.width;
    const H = canvas.height;

    let frame = 0;
    let ballX = 80;
    let ballY = H * 0.72;
    const batAngle = 38; // idle raised position
    let hasSwung = false;
    let swingFrame = -1;
    let batSwingProg = 0;

    let ballHit = false;
    let ballVx = 0, ballVy = 0;

    const HIT_WIN_START = 52;
    const HIT_WIN_END = 100;
    const BALL_AT_BAT = 88;

    const BAT_X = W / 2 - 40;
    const BAT_Y = H * 0.60;

    const drawArena = () => {
      ctx.clearRect(0, 0, W, H);

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#052e22');
      grad.addColorStop(1, '#0f5c44');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#d4b37c';
      ctx.fillRect(40, H * 0.41, W - 80, H * 0.45);

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(40, H * 0.49); ctx.lineTo(W - 40, H * 0.49); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40, H * 0.63); ctx.lineTo(W - 40, H * 0.63); ctx.stroke();

      ctx.fillStyle = '#f8f8f8';
      const stumpBase = H * 0.44;
      const stumpH = H * 0.27;
      [W - 175, W - 160, W - 145].forEach(sx => ctx.fillRect(sx, stumpBase, 13, stumpH));
      ctx.fillRect(W - 178, stumpBase, 46, 5);
    };

    const drawBall = (x: number, y: number) => {
      ctx.fillStyle = '#e63939';
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0.4, Math.PI - 0.4);
      ctx.stroke();
    };

    const drawBat = (angle: number) => {
      ctx.save();
      ctx.translate(BAT_X, BAT_Y);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.fillStyle = '#6b3d11'; ctx.fillRect(-25, -22, 32, 44);
      ctx.fillStyle = '#c8922a'; ctx.fillRect(7, -24, 165, 48);
      ctx.fillStyle = '#e6b84a'; ctx.fillRect(7, -24, 7, 48);
      ctx.restore();
    };

    const runFrame = () => {
      drawArena();

      if (!ballHit) {
        const progress = Math.min(frame / BALL_AT_BAT, 1);
        ballX = 80 + progress * (BAT_X + 100 - 80);
        ballY = H * 0.72 - Math.sin(progress * Math.PI) * 130;
        drawBall(ballX, ballY);
      }

      if (ballHit) {
        ballX += ballVx;
        ballY += ballVy;
        ballVy += 0.4;
        if (ballY < H + 50) drawBall(ballX, ballY);
      }

      if (!hasSwung) {
        drawBat(batAngle);
      } else {
        batSwingProg = Math.min((frame - swingFrame) / 22, 1);
        drawBat(38 - batSwingProg * 113);
      }

      if (frame >= HIT_WIN_START && frame <= HIT_WIN_END && !hasSwung) {
        const pulse = Math.sin(frame * 0.4) * 6 + 95;
        const alpha = 0.45 + 0.4 * Math.abs(Math.sin(frame * 0.32));
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.lineWidth = 12;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.ellipse(BAT_X + 90, BAT_Y, pulse, 105, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.font = `bold 22px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🏏 TAP NOW!', BAT_X + 90, BAT_Y - 120);
      }
      
      if (hasSwung && frame > swingFrame + 15 && frame < swingFrame + 60) {
        const flashAlpha = Math.min((frame - swingFrame - 15) / 8, 1);
        ctx.save();
        ctx.globalAlpha = flashAlpha;
        ctx.font = `bold 72px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14;
        if (finalOutcome === 'sixer') { ctx.fillStyle = '#ffd700'; ctx.fillText('💥 SIXER!', W / 2, H * 0.30); }
        else if (finalOutcome === 'four') { ctx.fillStyle = '#68d391'; ctx.fillText('✨ FOUR!', W / 2, H * 0.30); }
        else { ctx.fillStyle = '#fc8181'; ctx.fillText('😢 OUT!', W / 2, H * 0.30); }
        ctx.restore();
      }

      frame++;

      const done = hasSwung && frame > swingFrame + 75;
      const missed = !hasSwung && frame > 130;

      if (!done && !missed) {
        animFrameRef.current = requestAnimationFrame(runFrame);
      } else {
        let quality: 'perfect' | 'good' | 'miss' = 'miss';
        if (hasSwung) {
          const diff = Math.abs(swingFrame - BALL_AT_BAT);
          quality = diff <= 8 ? 'perfect' : 'good';
        }
        setHitQuality(quality);
        setStage('result');
        if (!canClaimWallet) {
          setGuestGamesPlayed(prev => prev + 1);
          setGuestBest(prev => {
            const rank = { out: 1, four: 2, sixer: 3 } as const;
            if (!prev) return finalOutcome;
            return rank[finalOutcome] > rank[prev] ? finalOutcome : prev;
          });
        }
        if (canClaimWallet) {
          refreshWallet();
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          toast.success(
            finalOutcome === 'sixer' ? '🏏 SIXER! +₹108'
            : finalOutcome === 'four' ? '🏏 FOUR! +₹50'
            : '🏏 OUT! +₹10',
            { description: quality === 'perfect' ? 'Perfect Timing 🔥' : quality === 'good' ? 'Good Swing!' : 'Better luck next time' }
          );
        } else {
          toast.success('Nice shot!', {
            description: 'Guest game complete. Register as patient to claim wallet rewards.',
          });
        }
      }
    };

    const handleTap = (e: MouseEvent | TouchEvent) => {
      if (hasSwung || frame < 40 || frame > 110) return; // Prevent too early/late taps
      e.preventDefault();
      hasSwung = true;
      swingFrame = frame;

      ballHit = true;
      ballX = BAT_X + 100;
      ballY = BAT_Y;
      if (finalOutcome === 'sixer') { ballVx = -4; ballVy = -18; }
      else if (finalOutcome === 'four') { ballVx = -6; ballVy = -10; }
      else { ballVx = 5; ballVy = -3; }
    };

    canvas.addEventListener('click', handleTap);
    canvas.addEventListener('touchstart', handleTap, { passive: false });
    runFrame();

    return () => {
      canvas.removeEventListener('click', handleTap);
      canvas.removeEventListener('touchstart', handleTap);
    };
  };

  const handlePlayNow = () => {
    if (canClaimWallet) {
      if (!eligibility?.eligible) return;
      playMutation.mutate();
      return;
    }

    const random = Math.random();
    const guestOutcome: 'sixer' | 'four' | 'out' = random < 0.04 ? 'sixer' : random < 0.12 ? 'four' : 'out';
    const guestCredit = guestOutcome === 'sixer' ? 108 : guestOutcome === 'four' ? 50 : 10;
    setOutcome(guestOutcome);
    setCredit(guestCredit);
    setStage('start');
    setIsFullScreen(true);
  };

  const handleStartBowling = () => {
    setStage('bowling');
    if (outcome) startFullScreenGame(outcome);
  };

  const exitGame = () => {
    cancelAnimationFrame(animFrameRef.current);
    setIsFullScreen(false);
    setStage('ready');
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (stage === 'start' && isFullScreen) {
      const renderPreview = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d')!;
          drawPreview(ctx, canvas);
        }
      };
      // Keep pulsing the preview circle
      intervalId = setInterval(renderPreview, 1000 / 60);
      renderPreview();
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [stage, isFullScreen]);

  const displayCredit = credit || (outcome === 'sixer' ? 108 : outcome === 'four' ? 50 : 10);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8 md:px-8">
        {!canClaimWallet && (
          <motion.div className="mb-6 rounded-2xl border-2 border-blue-200 bg-blue-50 px-6 py-5 text-center text-base font-semibold text-blue-900">
            <div>🏏 Hit big. Win rewards.</div>
            <div>👉 Sign up to unlock your earnings</div>
            <div className="mt-4">
              <Link to="/auth/signup" className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
                🏏 Hit big. Win rewards. Sign up to unlock your earnings
              </Link>
            </div>
          </motion.div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">🔥 Today's Attempts: {canClaimWallet ? '0/1' : `${Math.min(guestGamesPlayed, 1)}/1`}</div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">🏆 Best: {guestBest ? guestBest.toUpperCase() : 'No score yet'}</div>
          <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-900">📈 Daily Streak: {canClaimWallet ? 'Available in account' : 'Register to unlock streak tracking'}</div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🏏</span>
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-900">Hit a Sixer Daily</h1>
          </div>

          <div className="flex items-center gap-6">
            <div
              className="bg-white px-7 py-4 rounded-3xl shadow flex items-center gap-3 text-xl"
              title="Rewards are only credited to registered users"
            >
              <span className="font-semibold text-emerald-700">Wallet</span>
              <span className="font-bold text-3xl">₹{total}</span>
              {!canClaimWallet && <span className="text-sm font-medium text-slate-500">(Start earning now)</span>}
            </div>

            <button
              onClick={handlePlayNow}
              disabled={(canClaimWallet && !eligibility?.eligible) || stage !== 'ready' || playMutation.isPending}
              className="px-10 py-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-2xl font-bold rounded-3xl shadow-xl transition flex items-center gap-3 animate-pulse"
            >
              {playMutation.isPending ? '⏳ Starting...' : '🎯 Take Your Shot'}
            </button>
          </div>
        </div>

        {canClaimWallet && eligibility?.eligible && (
          <motion.div className="mb-8 px-8 py-5 rounded-3xl text-2xl font-medium text-center bg-emerald-100 text-emerald-800 flex justify-center items-center gap-2">
            ✅ Eligible! {eligibility.timeLeft} left today
          </motion.div>
        )}

        {canClaimWallet && !eligibility?.eligible && (eligibility?.reason || eligibilityError) && (
          <motion.div className="mb-8 px-8 py-5 rounded-3xl text-lg font-medium text-center bg-amber-100 text-amber-900">
            {eligibility?.reason || eligibilityError}
          </motion.div>
        )}

        {stage === 'ready' && (
          <div className="bg-emerald-950 rounded-3xl p-8 text-center text-white max-w-md mx-auto">
            <div className="flex justify-center gap-8 text-7xl mb-6">
              <span>🏏</span>
              <span>🔴</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">🏏 Ready to hit a SIX?</h2>
            <p className="text-xl">🎯 One shot. One chance.<br />Hit it right and win rewards!</p>
          </div>
        )}

            <p className="text-center text-sm text-gray-500 mt-8">
            {canClaimWallet
              ? '4% SIXER (₹108) • 8% FOUR (₹50) • 88% OUT (₹10) • 1 play/day • Credits expire in 30 days'
              : '4% SIXER • 8% FOUR • 88% OUT • Guest mode (no wallet credit)'}
          </p>
      </div>

      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            <div className="h-16 bg-emerald-900 flex items-center justify-between px-6 text-white text-lg font-medium shrink-0">
              <button onClick={exitGame} className="flex items-center gap-2">✕ Exit</button>
              <div className="font-bold text-2xl">Hit a Sixer</div>
              <div className="font-bold text-xl">₹{total}</div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 bg-emerald-950 relative min-h-0">
              <canvas
                ref={canvasRef}
                width={820}
                height={580}
                className="w-full max-w-[820px] aspect-video rounded-3xl border-8 border-emerald-800 shadow-2xl cursor-crosshair touch-none"
                style={{ maxHeight: '100%', objectFit: 'contain' }}
              />

              <AnimatePresence>
                {stage === 'start' && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 w-11/12 max-w-md"
                  >
                    <button
                      onClick={handleStartBowling}
                      className="w-full flex items-center justify-center gap-4 bg-white text-emerald-700 px-6 py-6 rounded-3xl text-3xl font-bold shadow-[0_10px_40px_rgba(0,0,0,0.6)] active:scale-95 transition"
                    >
                      🏏 Start bowling
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {stage === 'bowling' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-8 left-1/2 -translate-x-1/2 w-11/12 max-w-md bg-yellow-400 text-yellow-900 px-6 py-3 rounded-xl text-center font-bold text-lg shadow-xl"
                  >
                    👁️ Watch golden circle, then TAP!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {stage === 'result' && outcome && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/80 z-20"
                >
                  <div className="bg-white rounded-3xl px-12 py-12 text-center max-w-sm w-full mx-6 shadow-2xl">
                    <div className="text-8xl mb-6">
                      {outcome === 'sixer' ? '🏏💥' : outcome === 'four' ? '🏏✨' : '🏏😢'}
                    </div>
                    <h2 className="text-6xl font-black text-emerald-600">
                      {outcome.toUpperCase()}!
                    </h2>
                    <p className="text-5xl font-bold mt-4">+₹{displayCredit}</p>

                    <div className="mt-6 flex flex-col items-center gap-2">
                       <p className="text-xl text-gray-600 font-medium">
                        {hitQuality === 'perfect' ? '🔥 Perfect Timing!' : hitQuality === 'good' ? '👍 Good Swing!' : '😅 Missed the ball'}
                       </p>
                       <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                         <div className={`h-full rounded-full transition-all duration-500 ${hitQuality === 'perfect' ? 'bg-yellow-400 w-full' : hitQuality === 'good' ? 'bg-emerald-400 w-2/3' : 'bg-red-400 w-1/6'}`} />
                       </div>
                    </div>

                    {!canClaimWallet && (
                      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
                        🎉 You scored! Register now to claim your rewards in wallet.
                        <div className="mt-3">
                          <Link to="/auth/signup" className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">
                            Sign up and unlock earnings
                          </Link>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={exitGame}
                      className="mt-10 w-full py-6 text-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl shadow-lg transition"
                    >
                      Done – See you tomorrow!
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HitASixerGame;
