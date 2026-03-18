import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, CheckCircle, ArrowLeft, User, Mail, Phone, MapPin, GraduationCap, MessageSquare } from 'lucide-react';

interface FormData {
  fullName: string;
  email: string;
  mobile: string;
  city: string;
  education: string;
  motivation: string;
}

const EnrollmentRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const certName = (location.state as any)?.certName || 'Certification Program';
  const price = (location.state as any)?.price || 'Free';

  const [step] = useState<'form' | 'success'>('form');
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState<FormData>({
    fullName: '', email: '', mobile: '',
    city: '', education: '', motivation: '',
  });

  const enrollmentId = `ENR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
        setProcessing(false);
        const slug = (location.state as any)?.slug;
        console.log('DEBUG slug:', slug);
        console.log('DEBUG state:', location.state);
        if (slug) {
            navigate(`/checkout/${slug}`);
        } else {
            navigate('/enrollment-confirmed', {
                state: {
                    certName: (location.state as any)?.certName || 'Certification Program',
                    enrollmentId: `ENR-${Date.now()}`,
                }
            });
        }
    }, 1500);
};

  if (step === 'success') {
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
              { icon: '📱', text: `SMS confirmation sent to +91 ${form.mobile || 'your number'}` },
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
            onClick={() => navigate('/')}
            className="w-full border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition text-sm"
          >
            View Program Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition mb-6 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back to Details
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-purple-600 p-6 text-white">
            <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-1">Program Registration</p>
            <h1 className="text-xl font-bold">{certName}</h1>
            <p className="text-teal-100 text-sm mt-1">Complete your enrollment below</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" name="fullName" required
                    placeholder="Enter your full name"
                    value={form.fullName} onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email" name="email" required
                    placeholder="your@email.com"
                    value={form.email} onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition"
                  />
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Mobile</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel" name="mobile" required
                    placeholder="+91 XXXXX XXXXX"
                    value={form.mobile} onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition"
                  />
                </div>
              </div>

              {/* City + Education */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">City</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text" name="city" required
                      placeholder="Your city"
                      value={form.city} onChange={handleChange}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Education</label>
                  <div className="relative">
                    <GraduationCap size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      name="education" required
                      value={form.education} onChange={handleChange}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition appearance-none bg-white"
                    >
                      <option value="" disabled>Select</option>
                      <option value="undergraduate">Undergraduate</option>
                      <option value="graduate">Graduate</option>
                      <option value="postgraduate">Postgraduate</option>
                      <option value="doctorate">Doctorate</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Motivation */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Why do you want to become a coach? <span className="text-slate-400 normal-case font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <MessageSquare size={15} className="absolute left-3 top-3 text-slate-400" />
                  <textarea
                    name="motivation"
                    placeholder="Share your motivation..."
                    value={form.motivation} onChange={handleChange}
                    rows={3}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition resize-none"
                  />
                </div>
              </div>

              {/* Fee Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-slate-800 text-sm">Program Fee</span>
                  <span className="font-bold text-purple-600 text-base">{price}</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    'Lifetime access to modules',
                    'Certificate with blockchain verification',
                    'Listed on MANAS360 Coach Directory',
                    'Patient matching after certification',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle size={12} className="text-teal-500 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Money Back */}
              <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                <ShieldCheck size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 font-medium">30-Day Money Back Guarantee — No questions asked.</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-gradient-to-r from-teal-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
              >
                {processing ? 'Processing...' : `Pay ${price} & Enroll →`}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentRegistrationPage;
