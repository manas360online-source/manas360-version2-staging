import { useEffect } from 'react';

export default function CookieAndTrackingPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">MANAS360 - Cookie and Tracking Policy</h1>
        <div className="prose prose-lg max-w-none">
          <h2>1. WHAT ARE COOKIES</h2>
          <p>
            1.1 Cookies are small text files stored on your device when you access or use our Platform. Cookies help
            us enable secure functionality, understand usage patterns, improve performance, remember preferences, and
            enhance User experience.
          </p>

          <h2>2. TYPES OF COOKIES WE USE</h2>
          <p>
            2.1 <strong>Essential Cookies:</strong> Required for Platform operation (user authentication, session
            management, fraud prevention and security controls). These cookies are necessary to enable accessing or
            using core Platform features and cannot be disabled.
          </p>
          <p>
            2.2 <strong>Analytics Cookies:</strong> Help us understand usage patterns, popular features, and user
            flow. We use Google Analytics 4 with IP anonymization and privacy-enhancing configurations enabled.
          </p>
          <p>
            2.3 <strong>Preference Cookies:</strong> Store your settings such as language preference, dark mode, and
            notification preferences.
          </p>
          <p>
            2.4 We do NOT use advertising cookies or third-party behavioural tracking cookies for targeted
            advertising.
          </p>

          <h2>3. CONSENT</h2>
          <p>
            3.1 Upon your first visit to the Platform, a cookie consent banner shall be displayed, enabling you to
            accept or reject the use of non-essential cookies in accordance with your preferences.
          </p>
          <p>
            3.2 Essential cookies, being strictly necessary for the operation, security, and core functionality of the
            Platform, do not require prior consent.
          </p>
          <p>3.3 You may change cookie preferences at any time from Settings &gt; Privacy &gt; Cookie Preferences.</p>

          <h2>4. DATA COLLECTED VIA COOKIES</h2>
          <p>
            4.1 Analytics data collected: Pages visited, session duration, device type, browser type, approximate
            location (city-level), operation system, referral source.
          </p>
          <p>4.2 No health data, personal identity, or therapy content is collected via cookies.</p>

          <h2>5. THIRD-PARTY SERVICES</h2>
          <p>5.1 Google Analytics 4 (analytics); PhonePe (payment processing); Agora (video calls - session-level cookies only).</p>
          <p>
            5.2 Each third party has its own privacy policy. We ensure all third-party partners are DPDPA-compliant.
          </p>

          <h2>6. HOW TO MANAGE COOKIES</h2>
          <p>
            6.1 You may disable cookies through your browser settings. Note that disabling essential cookies may affect
            Platform functionality.
          </p>

          <h2>7. CHANGES TO THIS POLICY</h2>
          <p>
            7.1 We may update this Policy periodically to reflect legal, technical, or operational changes. Material
            changes will be notified via email and in-app notification. Continued accessing or using the Platform
            after notification constitutes acceptance of the revised Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
