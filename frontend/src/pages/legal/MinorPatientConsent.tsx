import { useEffect } from 'react';

export default function MinorPatientConsent() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">MANAS360 - Parental/Guardian Consent for Minor Patient</h1>
        <div className="prose prose-lg max-w-none">
          <p>
            I, __________ [Parent/Guardian Name], being the lawful parent/legal guardian of [Minor&apos;s Name], aged
            [___] years, hereby provide informed and voluntary consent for my child to receive mental health services
            through the MANAS360 platform.
          </p>

          <h2>1. CONSENT</h2>
          <p>
            1. I consent to my child receiving age-appropriate mental health assessment, therapy, and counseling
            through the Platform, under the supervision of a verified mental health professional.
          </p>

          <h2>2. PARENTAL INVOLVEMENT</h2>
          <p>
            2. I understand and agree that: (a) I may be involved in therapy sessions at the Provider&apos;s
            recommendation for clinical or safety reasons; (b) I will receive general therapeutic progress updates
            from the Provider; (c) Detailed session discussions and therapeutic communications between my child and the
            Provider shall remain confidential, except in situations involving safety or legal obligations; (d) I may
            request access to review my child&apos;s clinical records subject to verification procedures and applicable
            legal restrictions.
          </p>

          <h2>3. CONFIDENTIALITY FOR MINORS</h2>
          <p>
            3. I understand that adolescents (13+) may discuss sensitive topics (e.g., relationships, identity,
            substance experimentation) with their therapist in confidence. The Provider will breach this
            confidentiality ONLY if there is reasonable risk of harm to my child or others.
          </p>

          <h2>4. EMERGENCY</h2>
          <p>
            4. I authorize MANAS360 and the Provider to contact emergency services if my child presents with imminent
            risk of harm. I provide the following emergency contact:
          </p>
          <p>Emergency Contact Name: _______________________</p>
          <p>Relationship: ______________________</p>
          <p>Phone Number: ______________________</p>

          <h2>5. DATA</h2>
          <p>
            5. I understand that my child&apos;s personal and health-related data will be processed in accordance with the
            provisions of the DPDPA 2023 and the Platform&apos;s privacy and security policies, with enhanced safeguards
            applicable to minor data.
          </p>

          <h2>6. SCHOOL PROGRAMME</h2>
          <p>
            6. I further consent to my child&apos;s participation in the MANAS360 school mental health programme at
            ___________________________ (School Name), if such service is applicable and enrolled.
          </p>

          <h2>7. WITHDRAWAL</h2>
          <p>
            7. I may withdraw this consent and remove my child from the programme at any time by notifying MANAS360 in
            writing subject to the completion of safety and clinical transition procedures.
          </p>

          <p>Parent/Guardian Name: _______________________</p>
          <p>Relationship to Minor: _______________________</p>
          <p>Parent Phone: _______________________ (for OTP verification)</p>
          <p>Date: ______________</p>
          <p>Signature / Parent OTP Verification: ______________</p>
        </div>
      </div>
    </div>
  );
}
