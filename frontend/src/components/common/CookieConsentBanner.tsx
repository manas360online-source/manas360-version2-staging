import { useEffect, useState } from 'react';

const COOKIE_CONSENT_KEY = 'manas360_cookie_consent_v1';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const setConsent = (value: 'accepted' | 'rejected') => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[70] md:left-auto md:right-6 md:max-w-md">
      <div className="rounded-2xl border border-calm-sage/20 bg-white p-4 shadow-soft-lg">
        <p className="text-sm font-medium text-wellness-text">
          We use cookies to improve your experience.
        </p>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setConsent('rejected')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => setConsent('accepted')}
            className="rounded-lg bg-calm-sage px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
