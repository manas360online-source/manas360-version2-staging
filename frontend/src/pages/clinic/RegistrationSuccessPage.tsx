import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function RegistrationSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const clinic = location.state?.clinic || {};

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Helmet>
        <title>Registration Successful - MyDigitalClinic</title>
      </Helmet>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 border border-slate-100 text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to the Future!</h1>
        <p className="text-slate-500 mb-8">
          Your clinic <span className="font-bold text-slate-700">{clinic.name}</span> has been successfully registered.
        </p>

        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-left mb-8">
          <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-3">Your Login Credentials</h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-blue-600 font-medium">Clinic ID</span>
              <div className="text-lg font-mono font-bold text-slate-800 tracking-tight">{clinic.clinicCode}</div>
            </div>
            <div>
              <span className="text-xs text-blue-600 font-medium">Admin Suffix</span>
              <div className="text-lg font-mono font-bold text-slate-800">ADMIN</div>
            </div>
          </div>
          <p className="text-[10px] text-blue-500 mt-4 leading-relaxed">
            * Use these along with your registered phone number to log in. We've also sent these details to your WhatsApp.
          </p>
        </div>

        <button
          onClick={() => navigate('/mdc/login')}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          Proceed to Login
        </button>

        <p className="mt-6 text-sm text-slate-400">
          Need help? <a href="#" className="text-blue-600 hover:underline">Contact Setup Support</a>
        </p>
      </div>
    </div>
  );
}
