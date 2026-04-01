import React, { useState } from 'react';
import { X, AlertCircle, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { groupTherapyApi } from '../../api/groupTherapy';

interface GroupTherapyJoinModalProps {
  isOpen: boolean;
  session: any;
  isAuthenticated: boolean;
  userProfile?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  onClose: () => void;
}

export const GroupTherapyJoinModal: React.FC<GroupTherapyJoinModalProps> = ({
  isOpen,
  session,
  isAuthenticated,
  userProfile,
  onClose,
}) => {
  const [joinMode, setJoinMode] = useState<'registered' | 'guest' | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegisteredJoin = async () => {
    if (!isAuthenticated || !userProfile) {
      window.location.href = '/#/auth/login';
      return;
    }

    setIsLoading(true);
    try {
      const payment = await groupTherapyApi.createPublicJoinPaymentIntent(session.sessionId || session.id, {
        guestName: `${userProfile.firstName} ${userProfile.lastName}`,
        guestEmail: userProfile.phone || '',
      });

      if (payment.redirectUrl) {
        window.location.href = payment.redirectUrl;
      } else {
        toast.error('Unable to initiate payment. Please try again.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to join session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestJoin = async () => {
    if (!guestName.trim() || !guestPhone.trim()) {
      toast.error('Please provide your name and phone number.');
      return;
    }

    // Basic phone validation (India +91, 10 digits)
    const phoneRegex = /^[+]?[0-9\s\-()]{10,14}$/;
    if (!phoneRegex.test(guestPhone)) {
      toast.error('Please enter a valid phone number.');
      return;
    }

    setIsLoading(true);
    try {
      const payment = await groupTherapyApi.createPublicJoinPaymentIntent(session.sessionId || session.id, {
        guestName: guestName.trim(),
        guestEmail: guestPhone.trim(),
      });

      if (payment.redirectUrl) {
        window.location.href = payment.redirectUrl;
      } else {
        toast.error('Unable to initiate payment. Please try again.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to join session');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Join Therapeutic Session</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Session Info */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-xl">{session.icon || '🧠'}</span>
              {session.title}
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>👨‍⚕️ Facilitated by: <span className="font-medium">{session.host}</span></p>
              <p>⏱️ Duration: <span className="font-medium">{session.durationMinutes || 60} minutes</span></p>
              <p>👥 Current participants: <span className="font-medium">{session.currentCount || 0}/{session.maxMembers || 12}</span></p>
              {Number(session.price || 0) === 0 && (
                <p className="text-green-600 font-semibold">✓ Completely Free</p>
              )}
            </div>
          </div>

          {/* Medical Disclaimer */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Clinical Note</p>
              <p>Group therapy sessions are facilitated by licensed mental health professionals. These sessions complement, not replace, individual therapy or medical treatment.</p>
            </div>
          </div>

          {/* Mode Selection */}
          {!joinMode ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 mb-4">How would you like to join?</p>

              {isAuthenticated && userProfile ? (
                <>
                  {/* Registered User Option */}
                  <button
                    onClick={() => setJoinMode('registered')}
                    className="w-full p-4 border-2 border-green-200 bg-green-50 hover:bg-green-100 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <User className="text-green-600 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <p className="font-semibold text-gray-900">Join as Registered Member</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {userProfile.firstName} {userProfile.lastName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Your records will be kept secure and private</p>
                      </div>
                    </div>
                  </button>

                  {/* Guest Option */}
                  <button
                    onClick={() => setJoinMode('guest')}
                    className="w-full p-4 border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-gray-600 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <p className="font-semibold text-gray-900">Continue as Guest</p>
                        <p className="text-sm text-gray-600 mt-1">Join anonymously with just your name</p>
                        <p className="text-xs text-gray-500 mt-1">Limited features, no medical record-keeping</p>
                      </div>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  {/* Not Authenticated */}
                  <button
                    onClick={() => setJoinMode('registered')}
                    className="w-full p-4 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <User className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <p className="font-semibold text-gray-900">Login / Register to Join</p>
                        <p className="text-sm text-gray-600 mt-1">Create an account for secure medical records</p>
                        <p className="text-xs text-gray-500 mt-1">Recommended for comprehensive care</p>
                      </div>
                    </div>
                  </button>

                  {/* Guest Option */}
                  <button
                    onClick={() => setJoinMode('guest')}
                    className="w-full p-4 border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-gray-600 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <p className="font-semibold text-gray-900">Continue as Guest</p>
                        <p className="text-sm text-gray-600 mt-1">Join anonymously with your name only</p>
                        <p className="text-xs text-gray-500 mt-1">No account required</p>
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>
          ) : joinMode === 'registered' && !isAuthenticated ? (
            /* Redirect to login */
            <div className="text-center py-6">
              <User className="mx-auto text-blue-600 mb-4" size={40} />
              <p className="font-semibold text-gray-900 mb-2">Create Your Account</p>
              <p className="text-sm text-gray-600 mb-4">Secure login takes less than 2 minutes</p>
              <button
                onClick={() => {
                  window.location.href = '/#/auth/login';
                  onClose();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Continue to Login
              </button>
              <button
                onClick={() => setJoinMode(null)}
                className="w-full mt-2 text-blue-600 hover:text-blue-700 font-medium py-2"
              >
                ← Back
              </button>
            </div>
          ) : joinMode === 'registered' && isAuthenticated ? (
            /* Registered user confirmation */
            <div className="space-y-4">
              <p className="text-sm text-gray-600">You're joining as a registered member. Your session will be securely recorded in your medical profile.</p>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                <p className="text-xs font-semibold text-green-700 uppercase mb-2">Account Details</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-green-600" />
                    <span className="text-sm text-gray-700">{userProfile?.firstName} {userProfile?.lastName}</span>
                  </div>
                  {userProfile?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-green-600" />
                      <span className="text-sm text-gray-700">{userProfile.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRegisteredJoin}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Confirm & Join'}
                </button>
                <button
                  onClick={() => setJoinMode(null)}
                  disabled={isLoading}
                  className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          ) : joinMode === 'guest' ? (
            /* Guest form */
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Join as a guest. Your privacy is our priority.</p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="e.g., Rajesh Kumar"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Your full name for session records</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400">📱</span>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">We'll use this to send session reminders and receipts</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900">
                  <strong>Privacy & Consent:</strong> Your phone number is used only for session reminders and receipts. All information is encrypted and confidential.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleGuestJoin}
                  disabled={isLoading || !guestName.trim() || !guestPhone.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Join Session'}
                </button>
                <button
                  onClick={() => setJoinMode(null)}
                  disabled={isLoading}
                  className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
