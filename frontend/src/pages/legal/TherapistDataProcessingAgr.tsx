import { useEffect } from 'react';

export default function TherapistDataProcessingAgr() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - Data Processing Agreement (DPA)</h1>
        <p className="text-sm text-gray-600 mb-1">Compliant with DPDPA 2023</p>
        <p className="text-sm text-gray-600 mb-8">Between: MANAS360 Private Limited (Data Fiduciary) and Provider (Data Processor)</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. DEFINITIONS</h2>
          <p>
            1.1 &quot;Data Fiduciary&quot; shall have the meaning assigned under the Digital Personal Data Protection Act, 2023
            (&quot;DPDP Act&quot;) and refers to MANAS360, which determines the purpose and means of processing personal data.
          </p>
          <p>
            1.2 &quot;Data Processor&quot; means the Provider, who processes personal data on behalf of the Data Fiduciary in
            the course of providing therapeutic services.
          </p>
          <p>
            1.3 &quot;Personal Data&quot; means any data about an individual who is identifiable, including health data, as
            defined under DPDPA 2023.
          </p>
          <p>
            1.4 &quot;Processing&quot; includes collection, recording, storage, organization, structuring, use, sharing,
            disclosure, restriction, erasure, or destruction of Personal Data.
          </p>

          <h2>2. SCOPE</h2>
          <p>
            2.1 This DPA governs the Provider&apos;s processing of patient personal data accessed through the MANAS360
            Platform.
          </p>

          <h2>3. PROCESSING OBLIGATIONS</h2>
          <p>
            3.1 The Provider shall process patient data ONLY for the purpose of providing mental health services
            through the Platform.
          </p>
          <p>
            3.2 The Provider shall not process patient data for any other purpose, including personal research,
            marketing, or sharing with third parties.
          </p>
          <p>
            3.3 The Provider shall implement reasonable security safeguards as specified in MANAS360&apos;s Security
            Policy, including: (a) using a secure, password-protected device; (b) enabling 2-factor authentication;
            (c) not accessing patient data on shared or public computers; (d) conducting sessions from a private,
            sound-proof location.
          </p>
          <p>
            3.4 The Provider shall adhere to the principle of data minimization by accessing only such Personal Data as
            is strictly necessary for providing services to patients formally assigned to them through the Platform.
            The Provider shall not attempt to access, view, retrieve, or manipulate personal or clinical data relating
            to patients who are not under their authorized care or clinical responsibility. The Provider is strictly
            prohibited from downloading, exporting, copying, transferring, or storing any Personal Data outside the
            Platform&apos;s secure environment unless such action is expressly permitted in writing by MANAS360 or is
            otherwise required under applicable law.
          </p>

          <h2>4. SUB-PROCESSING</h2>
          <p>
            4.1 The Provider shall not appoint or engage any sub-processor to process patient data without prior
            written consent from MANAS360.
          </p>

          <h2>5. DATA BREACH</h2>
          <p>
            5.1 The Provider shall notify MANAS360 of any suspected or actual personal data breach within 12 hours of
            becoming aware.
          </p>
          <p>
            5.2 Notification shall include: nature of breach, categories of data affected, number of individuals
            affected, and remedial measures taken.
          </p>
          <p>
            5.3 The Provider shall be solely liable for any losses, damages, penalties, regulatory fines, or other
            adverse consequences arising out of or in connection with unauthorized or unlawful processing of personal
            data, negligent or improper handling of Personal Data, failure to implement required technical or
            organizational security safeguards, or delay or failure in providing mandatory breach notification as
            required under applicable law.
          </p>

          <h2>6. DATA SUBJECT REQUESTS</h2>
          <p>
            6.1 If a patient contacts the Provider directly to exercise their DPDPA rights (access, correction,
            erasure), the Provider shall forward the request to MANAS360 within 24 hours. The Provider shall assist
            MANAS360 in fulfilling statutory obligations relating to data subject rights.
          </p>

          <h2>7. RETURN AND DELETION</h2>
          <p>
            7.1 Upon termination, the Provider shall cease all processing and confirm in writing that no patient data
            is retained on personal devices or systems.
          </p>

          <h2>8. AUDIT</h2>
          <p>
            8.1 MANAS360 reserves the right to conduct data protection audits (no more than once per quarter with 7
            days&apos; notice) to verify compliance. The Provider shall cooperate fully and provide reasonable access to
            relevant documentation demonstrating compliance.
          </p>

          <h2>9. GOVERNING LAW</h2>
          <p>
            9.1 This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute,
            controversy, or claim arising out of or in connection with this Agreement shall be referred to and finally
            resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, as amended from
            time to time. The seat and venue of arbitration shall be Bengaluru, Karnataka, India, and the arbitral
            proceedings shall be conducted in the English language.
          </p>
        </div>
      </div>
    </div>
  );
}
