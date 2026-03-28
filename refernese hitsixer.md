<!-- MANAS360 - Enhanced "Hit a Sixer" Complete Implementation -->
<!-- File 1: src/pages/patient/HitASixerGame.tsx -->
<!-- This is the FULL, production-ready React component that replaces your current placeholder -->
<!-- It uses the EXISTING backend APIs you already implemented (/games/cricket/eligibility + /games/cricket/play) -->
<!-- Wallet is already linked – after play, wallet updates instantly via your WalletService -->

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner'; // or your toast library
import { CricketBall, Bat, Stumps } from './CricketAssets'; // SVG components below

// Existing wallet context / hook (you already have this)
import { useWallet } from '@/hooks/useWallet';

const HitASixerGame: React.FC = () => {
  const queryClient = useQueryClient();
  const { balance, refreshWallet } = useWallet(); // your existing wallet hook
  const [gameOutcome, setGameOutcome] = useState<'sixer' | 'four' | 'out' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Eligibility check (uses your existing /games/cricket/eligibility endpoint)
  const { data: eligibility, isLoading } = useQuery({
    queryKey: ['cricket-eligibility'],
    queryFn: async () => {
      const res = await axios.get('/api/games/cricket/eligibility');
      return res.data; // { eligible: true, reason?: string, timeLeft?: string }
    },
    refetchInterval: 30000, // live countdown
  });

  // 2. Play mutation (uses your existing /games/cricket/play endpoint)
  const playMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post('/api/games/cricket/play');
      return res.data; // { outcome: 'sixer'|'four'|'out', credit: 100|50|10, newBalance: number }
    },
    onSuccess: (data) => {
      setGameOutcome(data.outcome);
      setIsPlaying(false);
      setShowResult(true);
      refreshWallet(); // instantly updates wallet widget everywhere
      queryClient.invalidateQueries({ queryKey: ['wallet'] });

      // Show toast with credit earned
      toast.success(`🎉 ${data.outcome.toUpperCase()}! ₹${data.credit} added to wallet`, {
        description: `New balance: ₹${data.newBalance}`,
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Something went wrong');
    },
  });

  // Canvas animation – full cricket stadium (ball bowl + bat swing + stumps)
  const animateGame = (outcome: 'sixer' | 'four' | 'out') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let frame = 0;
    const ball = { x: 100, y: 300, radius: 12 };
    const batAngle = useRef(0);

    const drawStadium = () => {
      // Background stadium (gradient + lines)
      const grad = ctx.createLinearGradient(0, 0, 0, 500);
      grad.addColorStop(0, '#0a3d2f');
      grad.addColorStop(1, '#1a5f4a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 500);

      // Pitch
      ctx.fillStyle = '#e5d5a0';
      ctx.fillRect(200, 180, 400, 220);

      // Wickets / stumps
      ctx.fillStyle = '#fff';
      ctx.fillRect(580, 200, 8, 120); // middle stump
      ctx.fillRect(565, 200, 8, 120);
      ctx.fillRect(595, 200, 8, 120);
    };

    const draw = () => {
      ctx.clearRect(0, 0, 800, 500);
      drawStadium();

      // Ball animation
      if (frame < 80) {
        ball.x = 100 + frame * 7;
        ball.y = 300 - Math.sin(frame / 10) * 30;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bat swing (triggered at impact)
      if (frame >= 70 && frame <= 110) {
        batAngle.current = Math.sin((frame - 70) / 8) * 60 - 30; // realistic swing
      }

      // Draw bat
      ctx.save();
      ctx.translate(520, 280);
      ctx.rotate((batAngle.current * Math.PI) / 180);
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(-20, -8, 120, 16); // bat
      ctx.restore();

      // Result effect
      if (frame > 110) {
        if (outcome === 'sixer') {
          ctx.fillStyle = '#ffd700';
          ctx.font = 'bold 60px Arial';
          ctx.fillText('SIXER!', 280, 120);
        } else if (outcome === 'four') {
          ctx.fillStyle = '#00ff00';
          ctx.font = 'bold 60px Arial';
          ctx.fillText('FOUR!', 320, 120);
        } else {
          ctx.fillStyle = '#ff0000';
          ctx.font = 'bold 50px Arial';
          ctx.fillText('OUT!', 340, 120);
        }
      }

      frame++;
      if (frame < 180) requestAnimationFrame(draw);
    };

    draw();
  };

  // Trigger animation when result is known
  useEffect(() => {
    if (showResult && gameOutcome && canvasRef.current) {
      animateGame(gameOutcome);
    }
  }, [showResult, gameOutcome]);

  const handlePlay = () => {
    if (!eligibility?.eligible) return;
    setIsPlaying(true);
    setShowResult(false);
    playMutation.mutate();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-emerald-900">Hit a Sixer Daily</h1>
        <div className="flex items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-2xl shadow flex items-center gap-2">
            <span className="text-emerald-600 font-semibold">Wallet</span>
            <span className="text-2xl font-bold">₹{balance}</span>
          </div>
          <button
            onClick={handlePlay}
            disabled={!eligibility?.eligible || isPlaying}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-bold rounded-3xl shadow-xl transition disabled:opacity-50 flex items-center gap-3"
          >
            {isPlaying ? 'Bowling...' : '🎾 Play Now'}
          </button>
        </div>
      </div>

      {/* Eligibility banner */}
      {!isLoading && eligibility && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`p-4 rounded-3xl text-center font-medium mb-6 ${
            eligibility.eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
          }`}
        >
          {eligibility.eligible
            ? `✅ Eligible! ${eligibility.timeLeft} left today`
            : eligibility.reason}
        </motion.div>
      )}

      {/* COMPLETE STADIUM ARENA */}
      <div className="relative bg-gradient-to-b from-emerald-950 to-emerald-900 rounded-3xl overflow-hidden shadow-2xl border-8 border-[#1a3f2e]">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="w-full max-w-[800px] mx-auto block"
        />

        {/* Overlay result modal */}
        <AnimatePresence>
          {showResult && gameOutcome && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <div className="bg-white rounded-3xl p-10 text-center max-w-md">
                <div className="text-7xl mb-4">
                  {gameOutcome === 'sixer' ? '🏏💥' : gameOutcome === 'four' ? '🏏✨' : '🏏😢'}
                </div>
                <h2 className="text-5xl font-black uppercase tracking-widest mb-2">
                  {gameOutcome === 'sixer'
                    ? 'SIXER!'
                    : gameOutcome === 'four'
                    ? 'FOUR!'
                    : 'OUT!'}
                </h2>
                <p className="text-3xl font-bold text-emerald-600">
                  +₹{gameOutcome === 'sixer' ? 100 : gameOutcome === 'four' ? 50 : 10}
                </p>
                <button
                  onClick={() => setShowResult(false)}
                  className="mt-8 px-10 py-4 bg-emerald-600 text-white font-bold rounded-2xl text-lg"
                >
                  Play Again Tomorrow
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rules footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        4% SIXER (₹100) • 8% FOUR (₹50) • 88% OUT (₹10) • 1 play/day • Expires in 30 days
      </div>
    </div>
  );
};

export default HitASixerGame;
File 2: Wallet Auto-Apply in ANY Payment (Booking / Checkout)
tsx// src/hooks/useWallet.ts  (extend your existing hook)
export const useWallet = () => {
  // ... your existing wallet logic ...

  // Auto-apply credits for ANY payment on the platform
  const applyWalletToPayment = async (amount: number, bookingId: number) => {
    const res = await axios.post('/api/wallet/apply', {
      bookingId,
      amount,
    });
    return res.data; // { used: 100, finalAmount: amount - used }
  };

  return { ..., applyWalletToPayment };
};
File 3: Booking Checkout Example (works for therapy sessions & any other payment)
tsx// src/components/BookingCheckout.tsx
const BookingCheckout = ({ sessionPrice, bookingId }: { sessionPrice: number; bookingId: number }) => {
  const { balance, applyWalletToPayment } = useWallet();

  const handleCheckout = async () => {
    const walletUsed = Math.min(balance, sessionPrice);
    const finalAmount = sessionPrice - walletUsed;

    if (walletUsed > 0) {
      await applyWalletToPayment(walletUsed, bookingId);
    }

    // Proceed to payment gateway for remaining amount
    if (finalAmount > 0) {
      // Razorpay / Stripe flow
    } else {
      toast.success('Session booked using wallet credits!');
    }
  };

  return (
    <div>
      <div className="flex justify-between text-lg">
        <span>Session fee</span>
        <span>₹{sessionPrice}</span>
      </div>
      {balance > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>Wallet credits applied</span>
          <span>-₹{Math.min(balance, sessionPrice)}</span>
        </div>
      )}
      <button onClick={handleCheckout} className="w-full mt-6 py-6 text-2xl font-bold bg-emerald-600 text-white rounded-3xl">
        Pay ₹{Math.max(0, sessionPrice - balance)}
      </button>
    </div>
  );
};
✅ HitASixerGame.tsx is now LIVE (you applied the 540-line patch successfully).
That was the main gameplay arena — fully animated cricket stadium, ball-bowling physics, bat swing, dramatic SIXER/FOUR/OUT reveal, eligibility check, and instant wallet refresh.

What is still pending (exactly 3 things)

useWallet.ts → Does not exist yet in your project (search returned 0 matches).
BookingCheckout.tsx (or wherever your therapy-session / any-payment checkout lives) → Needs wallet auto-apply logic.
Integration → Make sure every payment flow on the entire platform calls the wallet auto-apply.

Below is the complete, production-ready code for the two missing pieces.

1. Create frontend/src/hooks/useWallet.ts
TypeScript// frontend/src/hooks/useWallet.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

export interface WalletBalance {
  total_balance: number;
  game_credits: number;
  referral_credits: number;
  promo_credits: number;
  lifetime_earned: number;
  lifetime_spent: number;
  lifetime_expired: number;
}

export const useWallet = () => {
  const queryClient = useQueryClient();

  // Fetch current wallet (used in HitASixerGame, header, etc.)
  const { data: balance = 0, refetch: refreshWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await axios.get<{ total_balance: number }>('/api/wallet/balance');
      return res.data.total_balance;
    },
    staleTime: 0, // always fresh after game play
  });

  // 🔥 AUTO-APPLY wallet credits to ANY payment (bookings, sessions, etc.)
  const applyWalletToPayment = useMutation({
    mutationFn: async ({ bookingId, amount }: { bookingId: number; amount: number }) => {
      const res = await axios.post('/api/wallet/apply', {
        bookingId,
        amount, // maximum you want to use
      });
      return res.data; // { used: number, finalAmount: number, remainingBalance: number }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      if (data.used > 0) {
        toast.success(`₹${data.used} wallet credits applied!`, {
          description: `Final amount: ₹${data.finalAmount}`,
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to apply wallet credits');
    },
  });

  return {
    balance,
    refreshWallet,
    applyWalletToPayment: applyWalletToPayment.mutateAsync,
    isApplying: applyWalletToPayment.isPending,
  };
};

2. Create / Update your Booking Checkout Component
Create new file: frontend/src/components/patient/BookingCheckout.tsx
tsx// frontend/src/components/patient/BookingCheckout.tsx
import React from 'react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

interface BookingCheckoutProps {
  sessionPrice: number;     // e.g. 999
  bookingId: number;         // ID of the booking being created
  onSuccess: () => void;
}

const BookingCheckout: React.FC<BookingCheckoutProps> = ({
  sessionPrice,
  bookingId,
  onSuccess,
}) => {
  const { balance, applyWalletToPayment } = useWallet();

  const handlePay = async () => {
    let finalAmount = sessionPrice;

    // Auto-apply wallet credits (works for game credits + any other credits)
    if (balance > 0) {
      const used = Math.min(balance, sessionPrice);
      await applyWalletToPayment({ bookingId, amount: used });
      finalAmount = sessionPrice - used;
    }

    if (finalAmount > 0) {
      // → Your existing Razorpay / Stripe / Payment Gateway flow here
      toast.info(`Proceeding to pay remaining ₹${finalAmount}`);
      // Example:
      // await initiateRazorpayPayment(finalAmount, bookingId);
    } else {
      toast.success('Session booked successfully using wallet credits!');
    }

    onSuccess();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow">
        <div className="flex justify-between items-center text-lg">
          <span className="font-medium">Session Fee</span>
          <span className="font-semibold">₹{sessionPrice}</span>
        </div>

        {balance > 0 && (
          <div className="flex justify-between items-center text-emerald-600 mt-4">
            <span className="font-medium">Wallet Credits Applied</span>
            <span className="font-bold">-₹{Math.min(balance, sessionPrice)}</span>
          </div>
        )}

        <div className="h-px bg-gray-200 my-6" />

        <div className="flex justify-between items-center text-2xl font-bold">
          <span>To Pay</span>
          <span className="text-emerald-600">₹{Math.max(0, sessionPrice - balance)}</span>
        </div>
      </div>

      <button
        onClick={handlePay}
        className="w-full py-7 text-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl shadow-xl transition"
      >
        {Math.max(0, sessionPrice - balance) === 0
          ? '✅ Book with Wallet Credits'
          : `Pay ₹${Math.max(0, sessionPrice - balance)}`}
      </button>

      <p className="text-center text-xs text-gray-500">
        Credits auto-applied • Expire in 30 days • Game credits are FIFO
      </p>
    </div>
  );
};

export default BookingCheckout;

Final Steps (What you need to do now)

Create the two files above.
Import useWallet wherever you show wallet balance (header, dashboard, My Progress, etc.).
Replace your existing checkout flow with <BookingCheckout sessionPrice={999} bookingId={bookingId} onSuccess={...} />.
Test the full flow:
Play → get credit → go to booking → see auto-applied amount → book.


Everything else (backend APIs, DB, cron jobs, probability logic, time-window enforcement) is already implemented per your earlier search.