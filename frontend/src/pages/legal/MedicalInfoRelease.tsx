import { useEffect } from 'react';

export default function MedicalInfoRelease() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">MANAS360 - Authorization for Release of Medical Information</h1>
        <div className="prose prose-lg max-w-none">
          <p>I, [Patient Name], authorize the release of my medical/mental health information as follows:</p>

          <p><strong>FROM:</strong> [Provider Name / MANAS360 Platform]</p>
          <p><strong>TO:</strong> [Recipient Name / Organization]</p>

          <h2>INFORMATION TO BE RELEASED</h2>
          <p>[] Assessment scores (PHQ-9, GAD-7)</p>
          <p>[] Session summaries</p>
          <p>[] Treatment plans</p>
          <p>[] Diagnosis information</p>
          <p>[] Prescription records</p>
          <p>[] Progress reports</p>
          <p>[] Other: _______________________</p>

          <h2>PURPOSE</h2>
          <p>
            [] Continuity of care with another provider; [] Insurance claim processing; [] Legal proceedings; []
            Personal records; [] Other: _______________________
          </p>

          <h2>VALIDITY</h2>
          <p>This authorization is valid for 90 days from the date below, unless I revoke it earlier in writing.</p>

          <h2>REVOCATION</h2>
          <p>
            I may revoke this authorization at any time by written notice to MANAS360. I acknowledge that such
            revocation shall not apply to information that has already been lawfully disclosed prior to receipt of the
            revocation.
          </p>

          <h2>UNDERSTANDING</h2>
          <p>
            I understand that: (a) I am not required to sign this form; (b) My treatment will not be affected by
            refusal; (c) Released information may not be protected by DPDPA once received by a third party; (d)
            MANAS360 will release the minimum information necessary.
          </p>
        </div>
      </div>
    </div>
  );
}
