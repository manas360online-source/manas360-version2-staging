import { useState } from 'react';

export const AddStaffModal = ({ onClose, onSave }: { onClose: () => void, onSave: (data: any) => void }) => {
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', role: 'therapist', loginSuffix: '' });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Add New Staff Member</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
            <input 
              className="w-full px-3 py-2 border rounded-lg" 
              value={form.fullName} 
              onChange={e => setForm({...form, fullName: e.target.value})}
              placeholder="Dr. Smith"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Phone</label>
              <input 
                className="w-full px-3 py-2 border rounded-lg" 
                value={form.phone} 
                onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="+91..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg"
                value={form.role}
                onChange={e => setForm({...form, role: e.target.value as any})}
              >
                <option value="therapist">Provider / Therapist</option>
                <option value="admin">Admin Staff</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold">Save Staff</button>
        </div>
      </div>
    </div>
  );
};

export const ScheduleSessionModal = ({ patients, staff, onClose, onSave }: { patients: any[], staff: any[], onClose: () => void, onSave: (data: any) => void }) => {
  const [form, setForm] = useState({ patientId: '', therapistId: '', scheduledAt: '', durationMinutes: 50 });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Schedule Live Session</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Select Patient</label>
            <select 
              className="w-full px-3 py-2 border rounded-lg"
              value={form.patientId}
              onChange={e => setForm({...form, patientId: e.target.value})}
            >
              <option value="">Choose Patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Select Provider</label>
            <select 
              className="w-full px-3 py-2 border rounded-lg"
              value={form.therapistId}
              onChange={e => setForm({...form, therapistId: e.target.value})}
            >
              <option value="">Choose Provider...</option>
              {staff.filter(s => s.role === 'therapist').map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Date & Time</label>
            <input 
              type="datetime-local"
              className="w-full px-3 py-2 border rounded-lg"
              value={form.scheduledAt}
              onChange={e => setForm({...form, scheduledAt: e.target.value})}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold">Cancel</button>
          <button 
            disabled={!form.patientId || !form.therapistId || !form.scheduledAt}
            onClick={() => onSave(form)} 
            className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold disabled:bg-slate-200"
          >
            Confirm Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export const AddPatientModal = ({ staff, onClose, onSave }: { staff: any[], onClose: () => void, onSave: (data: any) => void }) => {
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', assignedTherapistId: '' });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Add New Patient</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
            <input 
              className="w-full px-3 py-2 border rounded-lg" 
              value={form.fullName} 
              onChange={e => setForm({...form, fullName: e.target.value})}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
            <input 
              className="w-full px-3 py-2 border rounded-lg" 
              value={form.phone} 
              onChange={e => setForm({...form, phone: e.target.value})}
              placeholder="+91..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email (Optional)</label>
            <input 
              className="w-full px-3 py-2 border rounded-lg" 
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})}
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Assign Provider</label>
            <select 
              className="w-full px-3 py-2 border rounded-lg"
              value={form.assignedTherapistId}
              onChange={e => setForm({...form, assignedTherapistId: e.target.value})}
            >
              <option value="">Unassigned</option>
              {staff.filter(s => s.role === 'therapist').map(s => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold">Cancel</button>
          <button 
            disabled={!form.fullName || !form.phone}
            onClick={() => onSave(form)} 
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:bg-slate-200"
          >
            Save Patient
          </button>
        </div>
      </div>
    </div>
  );
};
