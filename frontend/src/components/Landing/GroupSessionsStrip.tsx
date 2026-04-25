import React, { useState, useEffect } from 'react';
import { groupTherapyApi } from '../../api/groupTherapy';
import { GroupTherapyJoinModal } from './GroupTherapyJoinModal';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_SESSIONS = [
  { id: 'def1', title: 'Anxiety Circle', icon: '😨', host: 'Dr. Priya', lang: 'English', status: 'LIVE', joined: '11/12', btnText: 'Join Now — Free', bg: 'bg-[#FFF5F2]', border: 'border-[#FDE0D8]', btnColor: 'bg-[#E88A70]', hover: 'hover:bg-[#d67b63]', topic: 'Anxiety Management', durationMinutes: 60, price: 0, maxMembers: 12, currentCount: 11 },
  { id: 'def2', title: 'Grief & Loss', icon: '🕊️', host: 'Dr. Rajan', lang: 'Hindi', status: 'Starts in 12m', joined: '8/10', btnText: 'Join — Starting Soon', bg: 'bg-[#F8F9FA]', border: 'border-[#E9ECEF]', btnColor: 'bg-[#A0B3C1]', hover: 'hover:bg-[#8e9eab]', topic: 'Grief & Loss Support', durationMinutes: 90, price: 0, maxMembers: 10, currentCount: 8 },
  { id: 'def3', title: 'Mindful Parenting', icon: '🧘', host: 'Ms. Kavitha', lang: 'Tamil', status: 'In 1h 35m', joined: '6/15', btnText: 'Remind Me', bg: 'bg-[#F4F5F2]', border: 'border-[#E6E8E3]', btnColor: 'bg-[#2A3439]', hover: 'hover:bg-[#1f262a]', topic: 'Parenting & Family Wellness', durationMinutes: 75, price: 0, maxMembers: 15, currentCount: 6 },
];

export const GroupSessionsStrip: React.FC = () => {
  const { user } = useAuth();
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    price: Number(ls.priceMinor || 0) / 100,
    durationMinutes: ls.durationMinutes || 60,
    topic: ls.topic,
    maxMembers: ls.maxMembers || 10,
    currentCount: ls.joinedCount || 0,
    bg: 'bg-[#F0FDF4]', // Highlights dynamically created sessions in soft green
    border: 'border-[#BBF7D0]',
    btnColor: 'bg-[#22C55E]',
    hover: 'hover:bg-[#16A34A]'
  }));

  const handleJoinClick = (session: any) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  // Combine dynamic with defaults to always show exactly 3 cards
  const displaySessions = [...dynamicSessions, ...DEFAULT_SESSIONS].slice(0, 3);

  return (
    <>
      <section className="group-sessions-strip py-8 px-4 sm:px-6 lg:px-16 bg-gradient-to-br from-[#f5f3ef] to-[#f9f7f3] font-sans dark:from-[#0f1b20] dark:to-[#132730]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <div>
                <h2 className="text-sm font-black tracking-widest text-gray-900 uppercase">Live & Next 2 Hours</h2>
                <p className="text-xs text-gray-600 mt-1">Licensed therapist-led group sessions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full"></span> FREE - All Sessions
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displaySessions.map((session) => (
              <div 
                key={session.id} 
                className={`group-session-card ${session.bg} border-2 ${session.border} rounded-3xl p-6 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500 hover:shadow-lg transition-shadow cursor-pointer group dark:bg-[#10212a] dark:border-[#31535a]`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{session.icon}</span> 
                      <span className="group-hover:text-emerald-600 transition-colors">{session.title}</span>
                    </h3>
                    <span className={`${session.btnColor} text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap ml-2`}>
                      {session.status.includes('LIVE') ? '⚡ ' : (session.status.includes('Starts') ? '🔥 ' : '🔔 ')}{session.status}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    {/* Topic/Specialization */}
                    <p className="text-xs font-semibold text-gray-700 bg-white/50 px-3 py-1.5 rounded-full inline-block">
                      {session.topic || 'Mental Health Support'}
                    </p>

                    {/* Facilitator */}
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                      <span>👨‍⚕️</span>
                      <span>Facilitated by: <span className="text-gray-900 font-bold">{session.host}</span></span>
                    </div>

                    {/* Duration & Capacity */}
                    <div className="flex items-center gap-4 text-xs text-gray-600 font-medium">
                      <span className="flex items-center gap-1.5">⏱️ {session.durationMinutes || 60} mins</span>
                      <span className="flex items-center gap-1.5">👥 {session.joined} enrolled</span>
                    </div>

                    {/* Session Language */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                      <span>🌐</span>
                      <span>{session.lang}</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleJoinClick(session)}
                  className={`w-full ${session.btnColor} ${session.hover} text-white font-black tracking-wide py-4 rounded-2xl transition-all flex justify-center items-center gap-2 text-sm shadow-md hover:shadow-lg transform hover:-translate-y-1`}
                >
                  {session.status.includes('LIVE') ? '⚡ Join Now' : (session.status.includes('Starts') ? '🔥 Join Waiting List' : '🔔 Remind Me')}
                </button>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-10 text-center">
            <button className="text-sm font-bold text-gray-700 hover:text-gray-900 transition-colors inline-flex items-center gap-2">
              View full therapeutic programs
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Join Modal */}
      <GroupTherapyJoinModal
        isOpen={isModalOpen}
        session={selectedSession}
        isAuthenticated={!!user}
        userProfile={user ? {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || undefined,
          phone: user.phone || undefined,
        } : undefined}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSession(null);
        }}
      />
    </>
  );
};