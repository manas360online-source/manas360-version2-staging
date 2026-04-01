import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { groupTherapyApi } from '../../api/groupTherapy';

const DEFAULT_SESSIONS = [
  { id: 'def1', title: 'Anxiety Circle', icon: '😨', host: 'Dr. Priya', lang: 'English', status: 'LIVE', joined: '11/12', btnText: 'Join Now — Free', bg: 'bg-[#FFF5F2]', border: 'border-[#FDE0D8]', btnColor: 'bg-[#E88A70]', hover: 'hover:bg-[#d67b63]' },
  { id: 'def2', title: 'Grief & Loss', icon: '🕊️', host: 'Dr. Rajan', lang: 'Hindi', status: 'Starts in 12m', joined: '8/10', btnText: 'Join — Starting Soon', bg: 'bg-[#F8F9FA]', border: 'border-[#E9ECEF]', btnColor: 'bg-[#A0B3C1]', hover: 'hover:bg-[#8e9eab]' },
  { id: 'def3', title: 'Mindful Parenting', icon: '🧘', host: 'Ms. Kavitha', lang: 'Tamil', status: 'In 1h 35m', joined: '6/15', btnText: 'Remind Me', bg: 'bg-[#F4F5F2]', border: 'border-[#E6E8E3]', btnColor: 'bg-[#2A3439]', hover: 'hover:bg-[#1f262a]' },
];

export const GroupSessionsStrip: React.FC = () => {
  const [liveSessions, setLiveSessions] = useState<any[]>([]);

  // Function to pull real-time sessions created by the therapist
  const loadSessions = async () => {
    try {
      const res = await groupTherapyApi.listPublicSessions();
      setLiveSessions(Array.isArray(res.items) ? res.items : []);
    } catch {
      const saved = localStorage.getItem('manas360_live_sessions');
      if (saved) setLiveSessions(JSON.parse(saved));
      else setLiveSessions([]);
    }
  };

  useEffect(() => {
    void loadSessions();
    const refresh = () => { void loadSessions(); };
    window.addEventListener('sessionsUpdated', refresh);
    window.addEventListener('storage', refresh); // Works across multiple open tabs
    return () => {
      window.removeEventListener('sessionsUpdated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Map the live deployed sessions to match the UI of the landing page
  const dynamicSessions = liveSessions.map((ls) => ({
    id: ls.id,
    title: ls.title,
    icon: '🧠',
    host: `Dr. ${String(ls?.hostTherapist?.firstName || '').trim() || 'MANAS360 Therapist'}`,
    lang: 'English',
    status: String(ls.status || 'LIVE NOW').replace(/_/g, ' '),
    joined: `${Number(ls.joinedCount || 0)}/${Number(ls.maxMembers || 0)}`,
    btnText: Number(ls.priceMinor || 0) > 0 ? `Join for ₹${Math.round(Number(ls.priceMinor || 0) / 100)}` : 'Join Session',
    sessionId: ls.id,
    bg: 'bg-[#F0FDF4]', // Highlights dynamically created sessions in soft green
    border: 'border-[#BBF7D0]',
    btnColor: 'bg-[#22C55E]',
    hover: 'hover:bg-[#16A34A]'
  }));

  const handleJoin = async (session: any) => {
    if (!session.sessionId) {
      window.location.href = '/#/auth/login';
      return;
    }

    try {
      const guestName = window.prompt('Enter your name to join this session:', 'Guest User') || '';
      const guestEmail = window.prompt('Enter your email:', '') || '';
      if (!guestName.trim() || !guestEmail.trim()) {
        toast.error('Name and email are required to continue.');
        return;
      }

      const payment = await groupTherapyApi.createPublicJoinPaymentIntent(session.sessionId, {
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
      });

      if (!payment.redirectUrl) throw new Error('Payment link not available');
      window.location.href = payment.redirectUrl;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to start join checkout.');
    }
  };

  // Combine dynamic with defaults to always show exactly 3 cards
  const displaySessions = [...dynamicSessions, ...DEFAULT_SESSIONS].slice(0, 3);

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-16 bg-[#f5f3ef] font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <h2 className="text-sm font-bold tracking-widest text-gray-700 uppercase">Live & Next 2 Hours</h2>
            <span className="text-[10px] font-bold bg-gray-200/50 text-gray-600 px-3 py-1 rounded-full">FREE</span>
          </div>
          <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            View full schedule →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displaySessions.map((session) => (
            <div key={session.id} className={`${session.bg} border ${session.border} rounded-3xl p-6 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500`}>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <span className="text-xl">{session.icon}</span> {session.title}
                  </h3>
                  <span className={`${session.btnColor} text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest`}>
                    {session.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-6 font-medium">
                  <span className="flex items-center gap-1.5">👨‍⚕️ {session.host}</span>
                  <span className="flex items-center gap-1.5">🌐 {session.lang}</span>
                </div>
                <p className="text-xs font-bold text-gray-500 mb-6">👥 {session.joined} joined</p>
              </div>
              
              <button 
                onClick={() => void handleJoin(session)}
                className={`w-full ${session.btnColor} ${session.hover} text-white font-black tracking-wide py-3.5 rounded-xl transition-colors flex justify-center items-center gap-2 text-xs`}
              >
                {session.status.includes('LIVE') ? '⚡' : (session.status.includes('Starts') ? '🔥' : '🔔')} {session.btnText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};