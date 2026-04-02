import React, { useState } from 'react';

interface SessionDetails {
  type: 'private' | 'group';
  name: string;
  vibe?: any;
  startTime?: string | null;
  durationMinutes?: number;
}

interface DeploySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: (details: SessionDetails) => void;
}

const VIBE_OPTIONS = [
  { id: 1, title: 'Student Stress', icon: '📚' },
  { id: 2, title: 'Heartbreak', icon: '💔' },
  { id: 3, title: 'Anxiety', icon: '🧘' },
  { id: 4, title: 'LGBTQ+', icon: '🏳️‍🌈' },
  { id: 5, title: 'Gamer Support', icon: '🎮' },
  { id: 6, title: 'Gym Bros', icon: '💪' },
];

export const DeploySessionModal: React.FC<DeploySessionModalProps> = ({ isOpen, onClose, onActivate }) => {
  const [sessionType, setSessionType] = useState<'private' | 'group'>('private');
  const [selectedVibeTitle, setSelectedVibeTitle] = useState(VIBE_OPTIONS[0].title);
  const [patientName, setPatientName] = useState('');
  
  // NEW: State for Time and Duration
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60');

  if (!isOpen) return null;

  const currentVibe = VIBE_OPTIONS.find(v => v.title === selectedVibeTitle) || VIBE_OPTIONS[0];

  const handleActivate = () => {
    onActivate({
      type: sessionType,
      name: sessionType === 'private' ? patientName : currentVibe.title,
      vibe: currentVibe,
      startTime: startTime ? startTime : null, // If empty, it means immediate
      durationMinutes: parseInt(duration, 10)
    });
    // Reset forms on close
    setStartTime('');
    setPatientName('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-950/90 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <h2 className="text-xl font-black text-blue-950 uppercase tracking-widest text-center mb-6 mt-2">Deploy Session</h2>

        <div className="flex bg-gray-50 rounded-full p-1 mb-8 border border-gray-100">
          <button
            onClick={() => setSessionType('private')}
            className={`flex-1 py-3 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${
              sessionType === 'private' ? 'bg-white text-blue-950 border border-blue-950 shadow-sm' : 'text-gray-400 hover:text-gray-600 border border-transparent'
            }`}
          >Private</button>
          <button
            onClick={() => setSessionType('group')}
            className={`flex-1 py-3 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${
              sessionType === 'group' ? 'bg-white text-blue-950 border border-blue-950 shadow-sm' : 'text-gray-400 hover:text-gray-600 border border-transparent'
            }`}
          >Group Vibes</button>
        </div>

        <div className="space-y-5 mb-8">
          {sessionType === 'private' ? (
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-2">Patient Name</label>
              <input 
                type="text" 
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Mah"
                className="w-full bg-[#F8FAFC] border border-blue-50 rounded-[1.25rem] px-4 py-3.5 text-xs font-bold text-blue-950 outline-none placeholder:text-gray-300"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-2">Room Vibe</label>
              <div className="bg-[#F8FAFC] border border-blue-50 rounded-[1.25rem] px-4 py-3.5 flex items-center gap-2">
                <span className="text-lg">{currentVibe.icon}</span>
                <select 
                  value={selectedVibeTitle}
                  onChange={(e) => setSelectedVibeTitle(e.target.value)}
                  className="bg-transparent w-full text-xs font-bold text-blue-950 outline-none appearance-none cursor-pointer"
                >
                  {VIBE_OPTIONS.map((vibe) => (
                    <option key={vibe.id} value={vibe.title}>{vibe.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Bound Inputs to State */}
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-2">Start Time</label>
            <input 
              type="datetime-local" 
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-blue-50 rounded-[1.25rem] px-4 py-3.5 text-xs font-bold text-blue-950 outline-none cursor-pointer" 
            />
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-2 pl-2">Leave blank to activate immediately</p>
          </div>

          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-2">Session Duration</label>
            <select 
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-blue-50 rounded-[1.25rem] px-4 py-3.5 text-xs font-bold text-blue-950 outline-none appearance-none cursor-pointer"
            >
              <option value="60">60 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="45">45 Minutes</option>
              <option value="90">90 Minutes</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleActivate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] py-4 rounded-full uppercase tracking-widest transition-colors shadow-lg shadow-blue-200"
        >
          Deploy Session
        </button>

      </div>
    </div>
  );
};