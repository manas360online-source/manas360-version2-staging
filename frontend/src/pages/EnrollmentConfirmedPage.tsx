import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const EnrollmentConfirmedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const certName = (location.state as any)?.certName || 'Certification Program';
  const enrollmentId = (location.state as any)?.enrollmentId || `ENR-${Date.now()}`;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center">

        {/* Success Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg">
          🎉
        </div>

        <div className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wide mb-3">
          Enrollment Confirmed
        </div>

        <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">
          Welcome, Coach-in-Training!
        </h2>
        <p className="text-slate-500 text-sm mb-6">{certName}</p>

        {/* Enrollment Card */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-left">
          <div className="mb-3">
            <p className="text-xs text-slate-500 mb-1">Enrollment ID</p>
            <p className="font-bold text-amber-700 text-base">{enrollmentId}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-slate-500">Start Date</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">Immediate Access</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Est. Completion</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">8–12 weeks</p>
            </div>
          </div>
        </div>

        {/* Confirmations */}
        <div className="space-y-2 mb-6 text-left">
          {[
            { icon: '📱', text: 'SMS confirmation sent to your number' },
            { icon: '📧', text: 'Welcome email with program guide sent' },
            { icon: '💬', text: 'Added to WhatsApp cohort group' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-slate-600 py-2 border-b border-slate-100 last:border-0">
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <button
          onClick={() => navigate('/journey-wireframe')}
          className="w-full bg-gradient-to-r from-teal-500 to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all text-sm mb-3"
        >
          Start Module 1 →
        </button>
        <button
          onClick={() => window.location.hash = '#/my-certifications'}
          className="w-full border-2 border-slate-800 text-slate-800 bg-white font-bold py-3.5 rounded-xl shadow-md hover:bg-slate-800 hover:text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 text-sm"
        >
          View My Certifications
        </button>

      </div>
    </div>
  );
};

export default EnrollmentConfirmedPage;
