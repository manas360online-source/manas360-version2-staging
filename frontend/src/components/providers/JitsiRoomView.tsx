import React, { useState, useEffect } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { Mic, Video as VideoIcon, MessageSquare, Lock, Users } from 'lucide-react';

interface JitsiRoomViewProps {
  roomDetails: { id: number; title: string; desc: string; icon: string };
  onLeave: () => void;
  activeView: 'therapist' | 'patient';
  setActiveView: (view: 'therapist' | 'patient') => void;
}

export const JitsiRoomView: React.FC<JitsiRoomViewProps> = ({ 
  roomDetails, 
  onLeave,
  activeView,
  setActiveView
}) => {
  const [timer, setTimer] = useState(0);

  // Simple timer for the header
  useEffect(() => {
    const interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const roomName = `MANAS360_Group_${roomDetails.title.replace(/\s+/g, '_')}`;

  return (
    <div className="flex flex-col h-screen bg-black font-sans relative">
      
      {/* Custom Header */}
      <header className="bg-white h-14 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-blue-900 font-black text-sm tracking-widest uppercase leading-tight">
              {roomDetails.title}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                Active Session
              </span>
            </div>
          </div>
          <span className="text-blue-900 font-black text-sm">{formatTime(timer)}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-blue-600">
            <Lock size={14} />
            <span className="text-[10px] font-bold tracking-widest uppercase">Secure Link</span>
          </div>
          <Users size={18} className="text-gray-400" />
        </div>
      </header>

      {/* Jitsi Wrapper */}
      <div className="flex-1 w-full bg-[#111111]">
        <JitsiMeeting
          roomName={roomName}
          configOverwrite={{
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            disableModeratorIndicator: true,
            prejoinPageEnabled: true,
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          }}
          userInfo={{
            displayName: `Anonymous_${Math.floor(Math.random() * 1000)}`,
            email: 'anonymous@manas360.com' // <-- Add this to satisfy TypeScript
            }}
          onApiReady={(externalApi) => {
            // Handle native Jitsi hangup to trigger your custom leave
            externalApi.addListener('videoConferenceLeft', () => {
              onLeave();
            });
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
          }}
        />
      </div>

      {/* Custom Footer */}
      <footer className="bg-white h-16 px-6 flex items-center justify-between z-10">
        {/* Left: Role Toggle */}
        <div className="bg-white rounded-full p-1 shadow-sm flex border border-gray-100">
          <button 
            onClick={() => setActiveView('therapist')}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase transition-all ${
              activeView === 'therapist' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            Therapist
          </button>
          <button 
            onClick={() => setActiveView('patient')}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase transition-all ${
              activeView === 'patient' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            Patient
          </button>
        </div>

        {/* Center: Controls (Cosmetic matching UI, Jitsi handles actual hardware) */}
        <div className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
          <button className="w-10 h-10 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center hover:bg-blue-100 transition-colors">
            <Mic size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center hover:bg-blue-100 transition-colors">
            <VideoIcon size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center hover:bg-blue-100 transition-colors">
            <MessageSquare size={18} />
          </button>
        </div>

        {/* Right: Actions */}
        <button 
          onClick={onLeave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors"
        >
          GET STARTED
        </button>
      </footer>

    </div>
  );
};