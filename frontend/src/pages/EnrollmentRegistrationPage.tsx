import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, CheckCircle, ArrowLeft,
  User, Mail, Phone, MapPin, GraduationCap, MessageSquare,
  AlertCircle, Loader2,
} from 'lucide-react';

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
  const slug = (location.state as any)?.slug;

  const [processing, setProcessing] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [form, setForm] = useState<FormData>({
    fullName: '', email: '', mobile: '',
    city: '', education: '', motivation: '',
  });

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!form.fullName.trim())
      errors.fullName = 'Full name is required.';

    if (!form.email.trim())
      errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = 'Please enter a valid email address.';

    if (!form.mobile.trim())
      errors.mobile = 'Mobile number is required.';
    else if (form.mobile.replace(/\D/g, '').length < 10)
      errors.mobile = 'Please enter a valid 10-digit mobile number.';

    if (!form.city.trim())
      errors.city = 'City is required.';

    if (!form.education)
      errors.education = 'Please select your education level.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FormData]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
    setGeneralError(null);
  };

  /**
   * Navigate to the checkout page with form data in state.
   * Enrollment is NOT saved here — CheckoutPage handles that
   * after payment is confirmed, preventing the "already enrolled"
   * redirect that was firing before.
   */
  const navigateToCheckout = () => {
    navigate(`/checkout/${slug}`, {
      state: {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        city: form.city.trim(),
        education: form.education,
        motivation: form.motivation.trim(),
        certName,
        slug,
        price,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setProcessing(true);
    setGeneralError(null);

    try {
      const response = await fetch('/api/enrollment/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          mobile: form.mobile.trim(),
          city: form.city.trim(),
          education: form.education,
          motivation: form.motivation.trim(),
          certName,
          certSlug: slug ?? null,
          price: price ?? null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        navigateToCheckout();
        return;
      }

      if (response.status === 409) {
        const isPhone = data.message?.toLowerCase().includes('phone');
        setFieldErrors(prev => ({
          ...prev,
          [isPhone ? 'mobile' : 'email']: data.message,
        }));
        setProcessing(false);
        return;
      }

      if (response.status === 400) {
        setGeneralError(data.message || 'Please check your details and try again.');
        setProcessing(false);
        return;
      }

      throw new Error(data.message || 'Server error');

    } catch (err: any) {
      const isRouteNotFound =
        err?.message?.toLowerCase().includes('route not found') ||
        err?.message?.toLowerCase().includes('404') ||
        err instanceof TypeError;

      if (isRouteNotFound) {
        // Backend not wired up yet — go straight to checkout
        navigateToCheckout();
        return;
      }

      setGeneralError('Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const inputClass = (field: keyof FormData) =>
    `w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm text-slate-800 placeholder-slate-400
     focus:outline-none focus:ring-1 transition
     ${fieldErrors[field]
      ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
      : 'border-slate-200 focus:border-purple-400 focus:ring-purple-200'}`;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition mb-6 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back to Details
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-purple-600 p-6 text-white">
            <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-1">
              Program Registration
            </p>
            <h1 className="text-xl font-bold">{certName}</h1>
            <p className="text-teal-100 text-sm mt-1">Complete your enrollment below</p>
          </div>

          <div className="p-6">

            {generalError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{generalError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" name="fullName" required
                    placeholder="Enter your full name"
                    value={form.fullName} onChange={handleChange}
                    className={inputClass('fullName')}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email" name="email" required
                    placeholder="your@email.com"
                    value={form.email} onChange={handleChange}
                    className={inputClass('email')}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Mobile
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel" name="mobile" required
                    placeholder="+91 XXXXX XXXXX"
                    value={form.mobile} onChange={handleChange}
                    className={inputClass('mobile')}
                  />
                </div>
                {fieldErrors.mobile && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.mobile}</p>
                )}
              </div>

              {/* City + Education */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    City
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text" name="city" required
                      placeholder="Your city"
                      value={form.city} onChange={handleChange}
                      className={inputClass('city')}
                    />
                  </div>
                  {fieldErrors.city && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Education
                  </label>
                  <div className="relative">
                    <GraduationCap size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      name="education" required
                      value={form.education} onChange={handleChange}
                      className={`${inputClass('education')} appearance-none bg-white`}
                    >
                      <option value="" disabled>Select</option>
                      <option value="undergraduate">Undergraduate</option>
                      <option value="graduate">Graduate</option>
                      <option value="postgraduate">Postgraduate</option>
                      <option value="doctorate">Doctorate</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {fieldErrors.education && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.education}</p>
                  )}
                </div>
              </div>

              {/* Motivation */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Why do you want to become a coach?{' '}
                  <span className="text-slate-400 normal-case font-normal">(optional)</span>
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
                <p className="text-xs text-blue-700 font-medium">
                  30-Day Money Back Guarantee — No questions asked.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-gradient-to-r from-teal-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving your details...
                  </>
                ) : (
                  `Pay ${price} & Enroll →`
                )}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentRegistrationPage;