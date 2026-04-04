import { useEffect } from 'react';

export default function BackgroundCheckConsent() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">MANAS360 - Background Verification Consent Form</h1>
        <div className="prose prose-lg max-w-none">
          <p>
            I, [Provider Name], hereby authorize MANAS360 Private Limited to conduct background verification checks as
            part of the onboarding and service engagement process, in accordance with applicable laws including the
            Digital Personal Data Protection Act, 2023 and other relevant regulations.
          </p>

          <p>
            I expressly authorize MANAS360, directly or through duly appointed and contractually bound third-party
            verification agencies, to collect, process, and verify my personal information for legitimate business
            purposes limited to onboarding, service quality assurance, and regulatory compliance.
          </p>

          <p>The verification may include, but shall be limited to, the following:</p>

          <p>(a) Verification of educational qualifications, academic degrees and professional degrees;</p>
          <p>(b) Verification of professional registration and licensing (RCI/NMC/State Medical Council);</p>
          <p>
            (c) Criminal background verification through legally accessible national or state-level records;
          </p>
          <p>(d) Previous employment verification (if applicable);</p>
          <p>
            (e) Reference verification with professional references voluntarily submitted by the Provider;
          </p>
          <p>(f) Identity verification via Aadhaar, PAN, or other government-issued ID.</p>

          <p>
            I understand that: (a) this verification is a mandatory requirement for onboarding to the MANAS360
            Platform; (b) MANAS360 shall implement reasonable technical and organizational safeguards to protect the
            confidentiality and security of my personal information; (c) any discrepancy or misrepresentation may
            result in rejection or termination; (d) verification results will be kept confidential and used solely for
            onboarding purposes; (e) I have the right to dispute any findings and provide clarification within 7 days
            of notification.
          </p>
        </div>
      </div>
    </div>
  );
}
