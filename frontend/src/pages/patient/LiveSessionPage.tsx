import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import AgoraRTC, { IAgoraRTCClient } from 'agora-rtc-sdk-ng';
import { patientApi } from '../../api/patient';

const LOCAL_MEDIA_ACCESS_PAUSED = true;

export default function LiveSessionPage() {
  const { id = '' } = useParams();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);

  const localRef = useRef<HTMLDivElement | null>(null);
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);

  useEffect(() => {
    let mounted = true;

    const join = async () => {
      try {
        const appId = import.meta.env.VITE_AGORA_APP_ID;
        if (!appId) throw new Error('VITE_AGORA_APP_ID is not configured');

        const upcomingRes = await patientApi.getUpcomingSessions();
        const sessions = (upcomingRes.data ?? upcomingRes) as any[];
        const session = sessions.find((s) => String(s.id) === String(id));

        if (!session) throw new Error('Session not found or not upcoming');
        if (!session.agora_channel || !session.agora_token) throw new Error('Agora channel/token unavailable for this session');

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        client.on('user-published', async (user: any, mediaType: 'video' | 'audio') => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video' && user.videoTrack && remoteRef.current) {
            user.videoTrack.play(remoteRef.current);
          }
          if (mediaType === 'audio' && user.audioTrack) {
            user.audioTrack.play();
          }
        });

        client.on('user-unpublished', () => {
          if (remoteRef.current) remoteRef.current.innerHTML = '';
        });

        await client.join(appId, session.agora_channel, session.agora_token, null);

        // Temporarily pause local media capture to avoid camera/mic permission prompts.
        if (!LOCAL_MEDIA_ACCESS_PAUSED) {
          const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
          if (localRef.current) {
            cameraTrack.play(localRef.current);
          }
          await client.publish([microphoneTrack, cameraTrack]);
        }

        if (mounted) setJoining(false);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || 'Unable to join live session');
          setJoining(false);
        }
      }
    };

    void join();

    return () => {
      mounted = false;
      const client = clientRef.current;
      if (client) {
        void client.leave();
      }
    };
  }, [id]);

  if (joining) return <div className="responsive-page"><div className="responsive-container">Joining session...</div></div>;
  if (error) return <div className="responsive-page"><div className="responsive-container text-rose-600">{error}</div></div>;

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">Live Session</h1>
      <div className="responsive-grid-2">
        <div className="responsive-card">
          <h2 className="mb-2 text-sm font-medium">Your Video</h2>
          <div ref={localRef} className="flex h-72 items-center justify-center rounded-xl border bg-black/90 px-4 text-center text-xs text-white/80">
            Camera and microphone are temporarily paused.
          </div>
        </div>
        <div className="responsive-card">
          <h2 className="mb-2 text-sm font-medium">Therapist Video</h2>
          <div ref={remoteRef} className="h-72 rounded-xl border bg-black" />
        </div>
      </div>
      </div>
    </div>
  );
}
