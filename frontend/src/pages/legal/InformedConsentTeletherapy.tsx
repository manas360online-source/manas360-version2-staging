import { useEffect } from 'react';

export default function InformedConsentTeletherapy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">MANAS360 - Informed Consent for Teletherapy Services</h1>
        <div className="prose prose-lg max-w-none">
          <p>
            I, [Patient Name], hereby provide my informed and voluntary consent to receive mental health services
            through the MANAS360 platform. I understand and acknowledge the following:
          </p>

          <h2>1. NATURE OF SERVICES</h2>
          <p>
            1. I will receive mental health services (therapy, counseling, or psychiatric consultation) via video,
            audio, or chat-based telecommunication through the MANAS360 platform.
          </p>

          <h2>2. PROVIDER QUALIFICATIONS</h2>
          <p>
            2. My Provider is an independent, credential-verified mental health professional registered with
            RCI/NMC/State Medical Council. MANAS360 verifies credentials to the extent reasonably possible but does not
            control or interfere with clinical judgment, diagnosis, or treatment decisions.
          </p>

          <h2>3. LIMITATIONS OF TELETHERAPY</h2>
          <p>
            3. (a) Teletherapy may not be suitable for all clinical conditions; (b) Technology or connectivity
            disruptions may occur; (c) In-person physical examination is not possible; (d) Non-verbal cues may be
            limited; (e) Confidentiality depends on secure internet connection and privacy at both ends.
          </p>

          <h2>4. RISKS</h2>
          <p>
            4. I understand that, as with any therapeutic intervention, there may be potential risks, including
            emotional discomfort, recall of distressing experiences, or the possibility that treatment outcomes may
            vary. I acknowledge that active participation is essential for effective therapy.
          </p>

          <h2>5. EMERGENCY PROTOCOL</h2>
          <p>
            5. I understand that the Platform is not an emergency response service. In the event of a psychiatric or
            medical emergency, I shall contact emergency services such as India emergency number 112 or an appropriate
            crisis helpline. I further consent to MANAS360 initiating emergency contact escalation procedures in
            accordance with Document D3 if imminent risk is detected.
          </p>

          <h2>6. CONFIDENTIALITY</h2>
          <p>
            6. My sessions are encrypted end-to-end. My Provider is bound by professional ethics and MANAS360&apos;s NDA.
            Exceptions to confidentiality include: (a) imminent risk of harm to self or others; (b) suspected child
            abuse; (c) court orders; (d) mandatory reporting obligations under applicable law.
          </p>

          <h2>7. RECORDS</h2>
          <p>
            7. Session notes will be maintained by my Provider on the MANAS360 platform. I may request access to my
            personal medical or therapy records subject to verification and applicable legal and regulatory
            restrictions.
          </p>

          <h2>8. FEES</h2>
          <p>
            8. I understand the session fee is displayed before booking and I authorize payment through the Platform.
          </p>

          <h2>9. FREEDOM TO WITHDRAW</h2>
          <p>9. I may discontinue therapy at any time without penalty. I may request a different Provider at any time.</p>

          <h2>10. DATA PROCESSING</h2>
          <p>
            10. My personal and health data will be processed in accordance with MANAS360&apos;s Privacy Policy and DPDPA
            2023.
          </p>

          <p>[] I have read and understood this Informed Consent.</p>
          <p>[] I have had the opportunity to ask questions and my questions have been answered.</p>
          <p>[] I voluntarily consent to receive teletherapy services through MANAS360.</p>
        </div>
      </div>
    </div>
  );
}
