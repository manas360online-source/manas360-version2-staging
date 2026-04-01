import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { YieldEngine } from '../../components/providers/YieldEngine';
import { SessionRoom } from '../../components/providers/SessionRoom';
import { PatientGroupVibes } from '../../components/providers/PatientGroupVibes';
import { JitsiRoomView } from '../../components/providers/JitsiRoomView';
import { AdmitPatientScreen } from '../../components/providers/AdmitPatientScreen';
import { DeploySessionModal } from '../../components/providers/DeploySessionModal';
import { groupTherapyApi } from '../../api/groupTherapy';

export const ProviderPortalPage: React.FC = () => {
  const [activeView, setActiveView] = useState<'therapist' | 'patient'>('therapist');
  const [activeRoom, setActiveRoom] = useState<any | null>(null);
  const [admittingPatient, setAdmittingPatient] = useState<string | null>(null);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  
  const [deployedGroupVibes, setDeployedGroupVibes] = useState<any[]>([]);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const [privateSessions, setPrivateSessions] = useState<any[]>([]);

  useEffect(() => {
    const loadMySessions = async () => {
      try {
        const result = await groupTherapyApi.listMyRequests();
        const rows = Array.isArray(result.items) ? result.items : [];

        const pending = rows.filter((row: any) => row.status === 'PENDING_APPROVAL').length;
        setPendingApprovalCount(pending);

        const approved = rows
          .filter((row: any) => ['APPROVED', 'PUBLISHED', 'LIVE'].includes(String(row.status || '').toUpperCase()))
          .map((row: any) => ({
            id: row.id,
            title: row.title,
            icon: '🧠',
            host: 'Assigned Therapist',
            startTime: row.scheduledAt,
            durationMinutes: row.durationMinutes,
            maxMembers: row.maxMembers,
            joinedCount: Number(row.joinedCount || 0),
            status: row.status,
            desc: row.topic,
          }));

        setDeployedGroupVibes(approved);
        localStorage.setItem('manas360_live_sessions', JSON.stringify(approved));
        window.dispatchEvent(new Event('sessionsUpdated'));
      } catch {
        const saved = localStorage.getItem('manas360_live_sessions');
        setDeployedGroupVibes(saved ? JSON.parse(saved) : []);
      }
    };

    void loadMySessions();
  }, []);

  const handleLeaveRoom = () => {
    if (activeRoom) {
      if (activeRoom.isPrivate) {
        setPrivateSessions(prev => prev.filter(p => p.name !== activeRoom.patientName));
        toast.success(`Ended Private Session with ${activeRoom.patientName}`);
      } else {
        setDeployedGroupVibes(prev => prev.filter(v => v.title !== activeRoom.title));
        toast.success(`Ended ${activeRoom.title} Session`);
      }
    }
    setActiveRoom(null);
  };

  if (activeRoom) {
    return (
      <>
        <Helmet><title>{activeRoom.title} | MANAS360</title></Helmet>
        <JitsiRoomView 
          roomDetails={activeRoom} 
          onLeave={handleLeaveRoom} 
          activeView={activeView}
          setActiveView={setActiveView}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-charcoal font-sans relative flex flex-col">
      <Helmet><title>Provider Portal | MANAS360</title></Helmet>

      <DeploySessionModal 
        isOpen={isDeployModalOpen} 
        onClose={() => setIsDeployModalOpen(false)} 
        onActivate={(details) => {
          setIsDeployModalOpen(false);
          
          if (details.type === 'group') {
            groupTherapyApi.createRequest({
              title: details.name,
              topic: details.vibe?.description || details.name,
              description: details.vibe?.description || details.name,
              sessionMode: 'PUBLIC',
              scheduledAt: details.startTime || new Date().toISOString(),
              durationMinutes: details.durationMinutes || 60,
              maxMembers: 10,
            }).then(() => {
              setPendingApprovalCount(prev => prev + 1);
              toast.success(`Submitted '${details.name}' for admin approval`);
            }).catch((error: any) => {
              toast.error(error?.response?.data?.message || 'Unable to submit request');
            });
          } else {
            const newPatientName = details.name || 'Private Client';
            // Format time for private list
            let displayTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (details.startTime) {
              displayTime = new Date(details.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            
            setPrivateSessions(prev => [
              { id: `p-${Date.now()}`, name: newPatientName, time: displayTime, startTime: details.startTime, durationMinutes: details.durationMinutes },
              ...prev
            ]);
            toast.success(`Private Room configured for ${newPatientName}`);
          }
        }}
      />

      {activeView === 'therapist' ? (
        admittingPatient ? (
          <div className="flex-1 flex items-center justify-center">
            <AdmitPatientScreen 
              patientName={admittingPatient} 
              onAdmit={() => {
                setActiveRoom({ id: 999, title: `PRIVATE_${admittingPatient.replace(/\s+/g, '_').toUpperCase()}`, desc: 'Private Consultation', icon: '🔒', isPrivate: true, patientName: admittingPatient });
                setAdmittingPatient(null);
              }} 
            />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <nav className="flex items-center justify-between px-8 py-4 bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-2 rounded-lg text-white font-bold text-xl w-10 h-10 flex items-center justify-center">M</div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-blue-900 leading-none">MANAS360 PORTAL</h1>
                  <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase">Pending approvals: {pendingApprovalCount}</p>
                </div>
              </div>
              <button onClick={() => setIsDeployModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2 transition-all shadow-md shadow-blue-200">
                <Plus size={16} /> NEW SESSION
              </button>
            </nav>

            <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <SessionRoom type="group" deployedVibes={deployedGroupVibes} onEnterRoom={(vibe) => setActiveRoom(vibe)} />
                <h2 className="font-black text-blue-900 uppercase tracking-wider mb-6 italic mt-4">Private Consultations</h2>
                {privateSessions.length > 0 ? (
                  privateSessions.map(session => (
                    <div key={session.id} className="animate-in slide-in-from-top-4 fade-in duration-300">
                      <SessionRoom type="private" name={session.name} time={session.time} onEnterRoom={() => setAdmittingPatient(session.name)} />
                    </div>
                  ))
                ) : (
                  <div className="border-2 border-dashed border-blue-100 rounded-3xl p-8 text-center bg-white/50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No active private consultations.</p>
                  </div>
                )}
              </div>
              <aside><YieldEngine isGroupActive={deployedGroupVibes.length > 0} /></aside>
            </main>
          </div>
        )
      ) : (
        <PatientGroupVibes onJoinRoom={(room) => setActiveRoom(room)} deployedVibes={deployedGroupVibes} />
      )}

      <div className="fixed bottom-8 left-8 bg-white rounded-full p-1.5 shadow-xl shadow-blue-100/50 flex border border-gray-100 z-50">
        <button onClick={() => { setActiveView('therapist'); setAdmittingPatient(null); }} className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all duration-200 ${activeView === 'therapist' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>Therapist</button>
        <button onClick={() => { setActiveView('patient'); setAdmittingPatient(null); }} className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all duration-200 ${activeView === 'patient' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>Patient</button>
      </div>
    </div>
  );
};

export default ProviderPortalPage;