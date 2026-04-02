import { useState, useEffect } from 'react';
import { getAdminLiveSessions, LiveSession } from '../../api/admin.api';
import { useSocket } from '../../context/SocketContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, User, Shield, Video } from 'lucide-react';

export default function LiveSessions() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    fetchLiveSessions();

    if (socket) {
      socket.on('session-started', (newSession: LiveSession) => {
        setSessions(prev => {
          if (prev.find(s => s.id === newSession.id)) return prev;
          return [newSession, ...prev];
        });
        toast.success(`Session started: ${newSession.therapistName} with ${newSession.patientName}`, {
          icon: <Activity className="w-4 h-4 text-green-500" />
        });
      });

      socket.on('session-ended', ({ sessionId }: { sessionId: string }) => {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        toast.info('A therapy session has concluded');
      });

      return () => {
        socket.off('session-started');
        socket.off('session-ended');
      };
    }
  }, [socket]);

  const fetchLiveSessions = async () => {
    try {
      const resp = await getAdminLiveSessions();
      setSessions(resp.data.sessions);
    } catch (error) {
      toast.error('Failed to fetch live sessions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Live Sessions Monitor
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time overview of active therapy sessions across the platform.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-primary">
            {sessions.length} Active {sessions.length === 1 ? 'Session' : 'Sessions'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-muted/50 border-dashed">
              <div className="w-full h-full" />
            </Card>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 bg-muted/20 border-dashed">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No live sessions</h3>
          <p className="text-muted-foreground text-sm text-center max-w-xs mt-1">
            There are currently no therapy sessions in progress. When a session starts, it will appear here in real-time.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              >
                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-primary/10 hover:border-primary/30">
                  <div className="absolute top-0 right-0 p-3">
                    <Badge variant={session.status === 'in-progress' ? 'default' : 'secondary'} className="capitalize shadow-sm">
                      {session.status}
                    </Badge>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Therapist</p>
                        <h3 className="font-bold text-lg leading-tight">{session.therapistName}</h3>
                      </div>
                    </div>

                    <div className="space-y-4 py-4 border-t border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Started</span>
                        </div>
                        <span className="text-sm font-medium">
                          {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Activity className="w-4 h-4" />
                          <span>Duration</span>
                        </div>
                        <LiveTimer startTime={session.startTime} />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-secondary-foreground">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Current Patient</p>
                        <p className="text-sm font-medium">{session.patientName}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function LiveTimer({ startTime }: { startTime: string }) {
  const [duration, setDuration] = useState('');

  useEffect(() => {
    const update = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);
      
      if (diff < 0) {
        setDuration('00:00');
        return;
      }

      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setDuration(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="text-sm font-bold font-mono text-primary tabular-nums">
      {duration}
    </span>
  );
}
