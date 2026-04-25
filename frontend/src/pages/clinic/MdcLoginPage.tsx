import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { API_BASE } from '../../lib/runtimeEnv';
import { setAuthToken } from '../../utils/authToken';

export default function MdcLoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clinicCode: '',
    loginSuffix: '',
    phone: '',
    otp: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value.toUpperCase() });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: e.target.value });
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE}/v1/mdc/auth/request-otp`, {
        clinicCode: formData.clinicCode,
        loginSuffix: formData.loginSuffix,
        phone: formData.phone,
      });
      
      if (response.data.devOtp) {
        setDevOtp(response.data.devOtp);
      }
      
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE}/v1/mdc/auth/verify-otp`, {
        clinicCode: formData.clinicCode,
        loginSuffix: formData.loginSuffix,
        phone: formData.phone,
        otp: formData.otp,
      });

      const { accessToken, user } = response.data;
      setAuthToken(accessToken);
      
      // Store MDC specific user info
      localStorage.setItem('mdc_user', JSON.stringify(user));

      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/my-digital-clinic/dashboard');
      } else if (user.role === 'therapist') {
        navigate('/provider/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
      <Helmet>
        <title>MDC Login - MyDigitalClinic</title>
      </Helmet>

      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/10">
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            B2B Enterprise Portal
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Digital Clinic</h1>
          <p className="text-slate-400 mt-2 font-medium">Manage your workspace & patients</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {step === 'details' ? (
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Clinic ID</label>
                <input
                  type="text"
                  name="clinicCode"
                  required
                  placeholder="MDC-2026-001"
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                  value={formData.clinicCode}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Suffix</label>
                <input
                  type="text"
                  name="loginSuffix"
                  required
                  placeholder="ADMIN"
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                  value={formData.loginSuffix}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="+91..."
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.phone}
                onChange={handlePhoneChange}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Request Access OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Security Code</label>
              <input
                type="text"
                name="otp"
                required
                placeholder="6-digit OTP"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-center text-2xl tracking-[1em] placeholder:tracking-normal placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                value={formData.otp}
                onChange={handleChange}
              />
              <p className="text-[10px] text-slate-500 mt-4 text-center">
                OTP sent to {formData.phone}. <button type="button" onClick={() => { setStep('details'); setDevOtp(null); }} className="text-blue-500 font-bold hover:underline">Change Details</button>
              </p>

              {devOtp && (
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center">
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Development OTP</p>
                  <p className="text-2xl font-mono font-black text-white tracking-[0.5em]">{devOtp}</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-green-900/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Enter Dashboard'}
            </button>
          </form>
        )}

        <p className="mt-10 text-center text-slate-500 text-xs font-medium">
          Powered by <span className="text-white font-bold tracking-tighter">MANAS360</span> Enterprise Engine
        </p>
      </div>
    </div>
  );
}
