import React from 'react';

export const VIBE_ROOMS = [
  { id: 1, title: 'Student Stress', desc: 'Academic pressure & exam anxiety support.', icon: '📚' },
  { id: 2, title: 'Heartbreak', desc: 'Healing from relationship loss & grief.', icon: '💔' },
  { id: 3, title: 'Anxiety', desc: 'Managing panic attacks & social anxiety.', icon: '🧘' },
  { id: 4, title: 'LGBTQ+', desc: 'Safe space for identity & community support.', icon: '🏳️‍🌈' },
  { id: 5, title: 'Gamer Support', desc: 'Digital burnout & toxic community recovery.', icon: '🎮' },
  { id: 6, title: 'Gym Bros', desc: 'Body image & performance pressure support.', icon: '💪' },
];

interface PatientGroupVibesProps {
  onJoinRoom: (room: typeof VIBE_ROOMS[0]) => void;
  deployedVibes?: any[]; // Expecting an array now
}

export const PatientGroupVibes: React.FC<PatientGroupVibesProps> = ({ onJoinRoom, deployedVibes = [] }) => {
  return (
    <div className="flex flex-col items-center pt-8 pb-24 px-4 w-full max-w-5xl mx-auto animate-in fade-in duration-300 font-sans">
      <div className="text-center mb-12">
        <div className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-lg shadow-blue-200">M</div>
        <h1 className="text-3xl font-black text-blue-900 tracking-tight uppercase mb-2">MANAS360 GROUP VIBES</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ANONYMOUS. SECURE. PROFESSIONAL SUPPORT. DROP-IN DAILY 6-9 PM.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
        {VIBE_ROOMS.map((room) => {
          // Check if this room is currently active in the array
          const isLive = deployedVibes.some(v => v.title === room.title);

          return (
            <div 
              key={room.id} 
              className={`bg-white rounded-[2rem] p-6 text-center transition-all group flex flex-col items-center justify-between min-h-[300px] relative overflow-hidden ${
                isLive ? 'border-2 border-green-400 shadow-xl shadow-green-100' : 'border border-blue-50 shadow-sm opacity-60 pointer-events-none'
              }`}
            >
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-50/50 rounded-full"></div>
              <div className="flex flex-col items-center w-full z-10">
                <div className="relative mb-6 mt-4">
                  {isLive && (
                    <div className="absolute -top-3 -right-8 bg-green-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-sm tracking-widest uppercase z-10 animate-pulse">
                      LIVE NOW
                    </div>
                  )}
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4 border-white shadow-sm ${isLive ? 'bg-green-50' : 'bg-gray-50'}`}>
                    {room.icon}
                  </div>
                </div>
                <h2 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-3">{room.title}</h2>
                <p className="text-[11px] text-gray-500 px-4 leading-relaxed mb-6 font-medium">{room.desc}</p>
              </div>

              <button 
                onClick={() => onJoinRoom(room)}
                disabled={!isLive}
                className={`w-full text-[10px] font-black py-4 rounded-full uppercase tracking-widest transition-colors mt-auto z-10 ${
                  isLive ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isLive ? 'ENTER LIVE ROOM' : 'OFFLINE'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};