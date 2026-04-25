import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { registerClinic, type ApiError } from './api';

export default function RegisterClinicPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const planData = location.state || {};

  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    license: '',
    address: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!planData.tier) {
        throw new Error('Please select a plan from the pricing page first.');
      }

      const result = await registerClinic({
        ...formData,
        tier: planData.tier,
        billingCycle: planData.billingCycle,
        selectedFeatures: planData.selectedFeatures,
      });

      // Redirect to success/checkout or dashboard
      // If it's a trial, maybe go straight to dashboard login instructions
      // If it's a paid plan, go to checkout
      if (planData.isTrial) {
        navigate('/my-digital-clinic/registration-success', { state: { clinic: result } });
      } else {
        navigate('/checkout', { 
          state: { 
            type: 'MDC_SUBSCRIPTION',
            clinicId: result.id,
            amount: planData.billingAmount 
          } 
        });
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Helmet>
        <title>Register Your Clinic - MyDigitalClinic</title>
      </Helmet>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Clinic Registration</h1>
          <p className="text-slate-500 mt-2">Set up your digital workspace in minutes</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Clinic Name</label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. Wellness Mind Center"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Owner Name</label>
              <input
                type="text"
                name="ownerName"
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Full Name"
                value={formData.ownerName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                name="phone"
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="+91..."
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Clinic Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="clinic@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">License Number (Optional)</label>
            <input
              type="text"
              name="license"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Medical License ID"
              value={formData.license}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
              isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95'
            }`}
          >
            {isLoading ? 'Creating Account...' : planData.isTrial ? 'Start Free Trial' : 'Continue to Payment'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Plan Selected</span>
            <span className="text-sm font-bold text-slate-700 capitalize">{planData.tier} Tier</span>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/my-digital-clinic')}
            className="text-xs text-blue-600 font-bold hover:underline"
          >
            Change Plan
          </button>
        </div>
      </div>
    </div>
  );
}
