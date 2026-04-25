import { useState } from 'react';
import SessionNotes from './SessionNotes';

export default function SessionNotesModuleExample() {
  const [sessionId, setSessionId] = useState('session-001');

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Session ID
          <input
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            placeholder="Enter session ID"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <SessionNotes sessionId={sessionId.trim()} />
    </section>
  );
}
