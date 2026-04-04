import { useEffect } from 'react';

export default function EmergencyContactAuth() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">MANAS360 - Emergency Contact and Crisis Authorization</h1>
        <div className="prose prose-lg max-w-none">
          <p>
            I, [Patient Name], authorize MANAS360 and my assigned Provider to contact the following person(s) in case
            of a mental health emergency or if imminent risk of harm to myself or others is detected:
          </p>

          <h2>PRIMARY EMERGENCY CONTACT</h2>
          <p>Name: _______________________</p>
          <p>Relationship: _______________________</p>
          <p>Phone: _______________________</p>
          <p>Email: _______________________</p>

          <h2>SECONDARY EMERGENCY CONTACT (optional)</h2>
          <p>Name: _______________________</p>
          <p>Relationship: _______________________</p>
          <p>Phone: _______________________</p>

          <h2>AUTHORIZATION</h2>
          <p>
            [] Contact my emergency contact(s) if I express suicidal ideation, self-harm intent, severe
            psychological distress, or pose a risk to others during a session or AI interaction.
          </p>
          <p>
            [] Share limited clinical information with my emergency contact(s) necessary for my safety (e.g., &quot;Your
            [relationship] has expressed distress and we recommend immediate support&quot;).
          </p>
          <p>[] Contact local emergency services (112) if I am unreachable and imminent risk is identified.</p>
          <p>[] Refer me to the nearest hospital or crisis centre.</p>

          <h2>LIMITATIONS</h2>
          <p>
            I understand that: (a) MANAS360 will use this authorization only in genuine emergency situations where
            there is a reasonable clinical belief of imminent risk of serious harm; (b) My general therapy content
            will NOT be shared with emergency contacts; (c) I may update, modify or revoke this authorization at any
            time through the Platform.
          </p>

          <p>Patient Name: _______________________</p>
          <p>Date: ______________</p>
          <p>Signature / Digital Consent: ______________</p>
        </div>
      </div>
    </div>
  );
}
