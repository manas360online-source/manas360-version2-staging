import { useState, useRef } from 'react';

const API_BASE = '/api/mdc';

export default function JitsiSessionLauncher({ sessionId, clinicId, patientName: initialPatient }) {
  const [mode, setMode] = useState('audio');
  const [patientName, setPatientName] = useState(initialPatient || '');
  const [duration, setDuration] = useState('50');
  const [sessionType, setSessionType] = useState('Follow-up');
  const [noteTemplate, setNoteTemplate] = useState('SOAP Notes');
  const [roomData, setRoomData] = useState(null);
  const [status, setStatus] = useState('ready'); // ready | creating | active | ended
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const iframeRef = useRef(null);
  const timerRef = useRef(null);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  };

  const launchSession = async () => {
    if (!patientName.trim()) { setError('Please enter the patient name'); return; }
    setError(null);
    setStatus('creating');

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/room`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode,
          therapistName: `Dr. Therapist (${sessionType})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRoomData(data);
      setStatus('active');

      // Mark room as started
      await fetch(`${API_BASE}/sessions/${sessionId}/room/start`, { method: 'POST', headers });

      // Start elapsed timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

    } catch (err) {
      setError(err.message);
      setStatus('ready');
    }
  };

  const endSession = async () => {
    if (!confirm('End this session?')) return;

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Clear iframe
    if (iframeRef.current) iframeRef.current.src = '';

    // End room on backend
    try {
      await fetch(`${API_BASE}/sessions/${sessionId}/room/end`, { method: 'POST', headers });
    } catch (err) {
      console.error('Failed to end room:', err);
    }

    setStatus('ended');
  };

  const resetSession = () => {
    setStatus('ready');
    setRoomData(null);
    setElapsed(0);
    setError(null);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const durationWarning = elapsed > parseInt(duration) * 60;

  return (
    <div className="rounded-xl border-2 border-[#4A6741] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4A6741] to-[#3a5631] text-white px-5 py-3 flex items-center gap-2">
        <span className="text-xl">🎧</span>
        <h4 className="font-bold text-sm font-['Outfit']">Session — Audio via Jitsi</h4>
        <span className="ml-auto bg-white/20 px-3 py-0.5 rounded-full text-[10px] font-semibold">
          Secure · E2E Encrypted
        </span>
      </div>

      <div className="p-5">
        {/* Config — shown when ready */}
        {status === 'ready' && (
          <div className="bg-[#f4f8f2] rounded-xl p-4">
            {/* Mode toggle */}
            <div className="text-xs font-semibold text-gray-500 mb-2">Session Mode</div>
            <div className="flex rounded-lg overflow-hidden border-2 border-[#4A6741] mb-4">
              <button
                onClick={() => setMode('audio')}
                className={`flex-1 py-2.5 text-xs font-semibold transition ${
                  mode === 'audio' ? 'bg-[#4A6741] text-white' : 'bg-white text-gray-700 hover:bg-[#e8f0e5]'
                }`}
              >🎧 Audio Only</button>
              <button
                onClick={() => setMode('video')}
                className={`flex-1 py-2.5 text-xs font-semibold transition ${
                  mode === 'video' ? 'bg-[#4A6741] text-white' : 'bg-white text-gray-700 hover:bg-[#e8f0e5]'
                }`}
              >📹 Video + Audio</button>
            </div>

            {/* Session fields */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Patient Name</label>
                <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g., Rahul S."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-md focus:border-[#4A6741] outline-none bg-white" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Duration</label>
                <select value={duration} onChange={(e) => setDuration(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-md focus:border-[#4A6741] outline-none bg-white">
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="50">50 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Session Type</label>
                <select value={sessionType} onChange={(e) => setSessionType(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-md focus:border-[#4A6741] outline-none bg-white">
                  <option>Initial Assessment</option>
                  <option>Follow-up</option>
                  <option>CBT Session</option>
                  <option>Psychodynamic</option>
                  <option>Crisis Intervention</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Note Template</label>
                <select value={noteTemplate} onChange={(e) => setNoteTemplate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-md focus:border-[#4A6741] outline-none bg-white">
                  <option>SOAP Notes</option>
                  <option>CBT Structured</option>
                  <option>Psychodynamic</option>
                  <option>Trauma-Informed</option>
                  <option>Free Form</option>
                </select>
              </div>
            </div>

            {/* Launch button */}
            <button onClick={launchSession}
              className="w-full bg-gradient-to-r from-[#4A6741] to-[#3a5631] text-white py-3.5 rounded-xl text-sm font-bold font-['Outfit'] tracking-wide flex items-center justify-center gap-2 hover:shadow-lg transition">
              <span>{mode === 'audio' ? '🎧' : '📹'}</span>
              Launch {mode === 'audio' ? 'Audio' : 'Video'} Session on Jitsi
            </button>

            <div className="flex gap-4 mt-3 text-[11px] text-gray-400">
              <span>🔒 End-to-end encrypted</span>
              <span>🇮🇳 Jitsi (no Zoom dependency)</span>
              <span>📝 Notes auto-linked post-session</span>
            </div>
          </div>
        )}

        {/* Creating */}
        {status === 'creating' && (
          <div className="text-center py-10">
            <div className="text-3xl animate-spin mb-2">⏳</div>
            <div className="text-sm font-semibold text-gray-500">Creating secure {mode} room...</div>
          </div>
        )}

        {/* Active session */}
        {status === 'active' && roomData && (
          <div>
            {/* Session bar */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-3 ${
              durationWarning ? 'bg-red-50 border border-red-200' : 'bg-[#d1fae5] border border-green-200'
            }`}>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <div className="text-xs font-bold text-gray-800">
                {mode === 'audio' ? '🎧' : '📹'} Session Active — {patientName}
              </div>
              <div className={`font-mono text-sm font-bold ml-auto ${durationWarning ? 'text-red-600' : 'text-[#065f46]'}`}>
                {formatTime(elapsed)} / {duration}:00
              </div>
              <button onClick={endSession}
                className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition">
                End Session
              </button>
            </div>

            {durationWarning && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-semibold mb-3">
                ⚠ Session has exceeded the scheduled {duration} minutes
              </div>
            )}

            {/* Jitsi iframe */}
            <iframe
              ref={iframeRef}
              src={roomData.jitsiUrl}
              className="w-full h-[420px] border-2 border-[#4A6741] rounded-xl"
              allow="camera;microphone;display-capture"
            />

            {/* Patient link */}
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-[11px] font-bold text-blue-700 mb-1">Patient Join Link (share via WhatsApp):</div>
              <div className="flex items-center gap-2">
                <code className="text-[10px] bg-white px-2 py-1 rounded border border-blue-200 flex-1 overflow-x-auto">
                  {roomData.patientUrl}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(roomData.patientUrl)}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-[10px] font-bold hover:bg-blue-200 shrink-0">
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ended */}
        {status === 'ended' && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-lg font-bold text-[#065f46]">Session Completed</div>
            <div className="text-xs text-gray-500 mt-1">
              Duration: {formatTime(elapsed)} · Patient: {patientName} · Mode: {mode}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Session notes template ({noteTemplate}) is now linked to this session record.
            </div>
            <button onClick={resetSession}
              className="mt-4 bg-gray-100 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
              Start New Session
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700 font-semibold">
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  );
}
