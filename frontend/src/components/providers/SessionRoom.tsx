import React from 'react';
import { Video, Lock } from 'lucide-react';

// Time Engine for Colors
const getSessionStatus = (startTimeStr: string | null, durationMins: number) => {
  if (!startTimeStr) return { label: 'LIVE NOW', badge: 'bg-red-500 text-white animate-pulse', border: 'border-red-400', isLive: true };
  
  const start = new Date(startTimeStr);
  const end = new Date(start.getTime() + (durationMins || 60) * 60000);
  const now = new Date();
  
  if (now >= start && now <= end) {
    return { label: 'LIVE NOW', badge: 'bg-red-500 text-white animate-pulse', border: 'border-red-400', isLive: true };
  } else if (start > now) {
    const isToday = start.toDateString() === now.toDateString();
    if (isToday) return { label: 'UPCOMING', badge: 'bg-yellow-500 text-white', border: 'border-yellow-400', isLive: false };
    else return { label: 'REMIND ME', badge: 'bg-gray-900 text-white', border: 'border-gray-800', isLive: false };
  }
  return { label: 'ENDED', badge: 'bg-gray-400 text-white', border: 'border-gray-200', isLive: false };
};

interface SessionProps {
  type: 'group' | 'private';
  name?: string;
  time?: string;
  onEnterRoom?: (vibe?: any) => void;
  deployedVibes?: any[];
}

export const SessionRoom: React.FC<SessionProps> = ({ type, name, time, onEnterRoom, deployedVibes }) => {
  if (type === 'group') {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-orange-500">🔥</span>
          <h2 className="font-black text-blue-900 uppercase tracking-wider">Group Vibes - Drop-in</h2>
        </div>
        
        {deployedVibes && deployedVibes.length > 0 ? (
          <div className="flex flex-wrap gap-6">
            {deployedVibes.map((vibe) => {
              const status = getSessionStatus(vibe.startTime, vibe.durationMinutes);

              return (
                <div key={vibe.id} className={`bg-white rounded-3xl p-5 shadow-sm border ${status.border} w-72 relative animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                  
                  {/* Dynamic Color Badge */}
                  <div className={`absolute top-4 right-4 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${status.badge}`}>
                    {status.label}
                  </div>
                  
                  <div className="text-4xl mb-3 bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner">
                    {vibe.icon}
                  </div>
                  
                  <h3 className="font-black text-blue-600 uppercase tracking-wider mb-4 text-sm">{vibe.title}</h3>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="text-[10px] font-black text-gray-400 tracking-widest flex items-center gap-1.5">
                      <span className="text-blue-600">👥</span> 0/15 PARTICIPANTS
                    </span>
                    <button 
                      onClick={() => onEnterRoom && onEnterRoom(vibe)}
                      className="bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                    >
                      <span className="text-xs font-bold leading-none pr-0.5">❯</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="aspect-video bg-white rounded-3xl border-2 border-dashed border-blue-100 flex flex-col items-center justify-center text-blue-300 relative overflow-hidden">
            <Video size={48} className="mb-2 opacity-20" />
            <p className="font-bold tracking-widest text-sm opacity-40 uppercase">Awaiting Group Activation</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="bg-white rounded-full p-2 pl-6 flex items-center justify-between shadow-sm border border-blue-50 mb-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold">{name?.charAt(0)}</div>
        <div>
          <h3 className="font-bold text-sm uppercase text-blue-950">{name}</h3>
          <p className="text-[10px] text-gray-400 font-bold tracking-wide mt-0.5">{time} • <Lock size={10} className="inline mr-1" /> E2EE LOCKED</p>
        </div>
      </div>
      <button onClick={() => onEnterRoom && onEnterRoom()} className="bg-blue-600 text-white px-8 py-3 rounded-full text-[10px] font-black tracking-widest uppercase hover:bg-blue-700 transition-colors shadow-sm">
        ENTER ROOM
      </button>
    </div>
  );
};