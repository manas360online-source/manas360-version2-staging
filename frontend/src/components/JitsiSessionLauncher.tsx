import { useState } from 'react';
import VideoRoom from './jitsi/VideoRoom';

interface JitsiSessionLauncherProps {
  sessionId: string;
  clinicId: string;
  patientName: string;
}

export default function JitsiSessionLauncher({
  sessionId,
  clinicId,
  patientName,
}: JitsiSessionLauncherProps) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const handleStartSession = () => {
    if (!displayName.trim()) {
      alert('Please enter your name to start the session');
      return;
    }
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
  };

  if (isSessionActive) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <VideoRoom
          sessionId={sessionId}
          roomName={`clinic-${clinicId}-${sessionId}`}
          displayName={displayName}
          onEndCall={handleEndSession}
          isTherapist={false}
          className="h-96 w-full"
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Live Session</h2>

      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            <strong>Session ID:</strong> {sessionId}
          </p>
          <p className="mt-1 text-sm text-blue-900">
            <strong>Patient:</strong> {patientName}
          </p>
          <p className="mt-1 text-sm text-blue-900">
            <strong>Clinic:</strong> {clinicId}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Your Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={handleStartSession}
          className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Start Live Session
        </button>

        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          <p className="font-medium">Note:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Ensure your camera and microphone are working</li>
            <li>A secure encrypted connection will be established</li>
            <li>The session can be ended at any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
