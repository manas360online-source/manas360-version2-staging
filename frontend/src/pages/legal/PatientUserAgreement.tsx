import { useEffect } from 'react';

export default function PatientUserAgreement() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - Patient User Agreement</h1>
        <p className="text-sm text-gray-600 mb-8">Between: MANAS360 Private Limited and Patient/User</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. SCOPE AND APPLICABILITY</h2>
          <p>
            This Patient User Agreement (&quot;Agreement&quot;) supplements the Terms of Service and Privacy Policy and
            governs your accessing or using the MANAS360 Platform as a patient seeking mental health support or
            professional services.
          </p>
          <p>
            By accessing or using the Platform for therapy, teleconsultation, AI support, or related services, you
            acknowledge and agree to be bound by this Agreement.
          </p>

          <h2>2. PATIENT RESPONSIBILITIES</h2>
          <p>
            2.1 You agree to provide truthful, complete, and accurate information regarding your medical history,
            mental health condition, symptoms, medications, allergies, prior diagnoses, and any other relevant health
            information while accessing or using the Platform.
          </p>
          <p>
            2.2 You acknowledge that you are voluntarily seeking mental health support and that your decision to
            engage with a Provider through the Platform is made of your own free will.
          </p>
          <p>
            2.3 You agree to attend scheduled therapy sessions on time. Failure to attend without prior cancellation
            within the permitted time window may result in forfeiture of session fees in accordance with the Refund
            and Cancellation Policy (Document A7).
          </p>
          <p>
            2.4 You shall not record, screen-capture, or otherwise reproduce therapy sessions (audio, video, or chat)
            without the explicit prior written consent of the Provider.
          </p>
          <p>
            2.5 You understand that therapy may involve discussing sensitive, emotional, or distressing topics. You
            agree to communicate openly with your Provider regarding your comfort levels, concerns, or boundaries
            during sessions.
          </p>
          <p>
            2.6 You are responsible for ensuring stable internet connectivity, appropriate device access, and a
            private environment during teletherapy sessions.
          </p>

          <h2>3. LIMITATIONS OF DIGITAL THERAPY</h2>
          <p>
            3.1 Teletherapy has inherent limitations compared to in-person therapy, including potential technology
            disruptions, inability to conduct physical examination, and limitations in non-verbal communication.
          </p>
          <p>
            3.2 You acknowledge that AI-based tools (chatbot, mood tracking, assessments) are supplementary
            information tools and NOT substitutes for licensed professional therapy or psychiatric care.
          </p>
          <p>
            3.3 Prescription medication, if required, may only be prescribed by a duly licensed psychiatrist in
            accordance with applicable Indian laws. You agree to follow all prescribing instructions and acknowledge
            that MANAS360 does not independently prescribe medication.
          </p>

          <h2>4. EMERGENCY PROTOCOL</h2>
          <p>
            4.1 If you experience suicidal thoughts, self-harm urges, or any psychiatric or medical emergency, you
            agree to contact emergency services (112) or a recognized crisis helpline immediately. The Platform is not
            an emergency service.
          </p>
          <p>
            4.2 You hereby acknowledge, understand, and expressly consent that MANAS360 may, at its sole and
            reasonable discretion, escalate your case to your designated emergency contacts and/or appropriate crisis
            intervention or emergency services if the Platform&apos;s AI systems or affiliated Providers determine that
            there is an imminent risk of serious harm to you or to others, in accordance with the provisions set forth
            in Document D3.
          </p>

          <h2>5. CONSENT TO TREATMENT</h2>
          <p>
            5.1 By booking, scheduling, or participating in any session through the MANAS360 platform, you hereby
            provide your informed and voluntary consent to receive mental health services delivered via the Platform.
            Detailed consent terms are in Document D1.
          </p>

          <h2>6. ACKNOWLEDGEMENT</h2>
          <p>
            By accessing or using the Platform as a patient, you hereby acknowledge and confirm that you have carefully
            read and fully understood the terms of this Patient User Agreement, and that you agree to be legally bound
            by and comply with its provisions. You further acknowledge that you understand the nature, scope, and
            inherent limitations of digital mental health services delivered through the Platform, and that you
            voluntarily and knowingly consent to participate in therapy and related services provided therein.
          </p>

          <h2>7. CHANGES TO THIS POLICY</h2>
          <p>
            11.1 We may update this Policy periodically to reflect legal, technical, or operational changes. Material
            changes will be notified via email and in-app notification. Continued accessing or using the Platform
            after notification constitutes acceptance of the revised Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
