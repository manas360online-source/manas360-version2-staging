import { useEffect } from 'react';

export default function TherapistNDA() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - Therapist Non-Disclosure Agreement</h1>
        <p className="text-sm text-gray-600 mb-8">Between: MANAS360 Private Limited and Provider</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. CONFIDENTIAL INFORMATION</h2>
          <p>
            1.1 &quot;Confidential Information&quot; includes: (a) all patient data, health records, assessment scores,
            session notes, and personal information; (b) MANAS360 business plans, commercial strategies, technology,
            algorithms, pricing, and strategies; (c) Provider network data, including other Providers&apos; identities
            and performance metrics; (d) any information marked as confidential or that a reasonable person would
            understand to be confidential.
          </p>

          <h2>2. OBLIGATIONS</h2>
          <p>
            2.1 The Provider shall: (a) keep all Confidential Information strictly confidential; (b) use Confidential
            Information solely for providing professional services through MANAS360 platform; (c) not disclose
            Confidential Information to any third party without prior written consent; (d) implement reasonable and
            industry standard security measures to protect Confidential Information.
          </p>
          <p>
            2.2 The Provider shall NOT: (a) download, export, copy, store, or transmit patient data to personal
            devices or external systems; (b) discuss patient cases with persons not involved in the patient&apos;s care;
            (c) use patient data for research, publication, or teaching without explicit written consent and
            institutional ethics approval; (d) retain patient data after termination of this Agreement.
          </p>

          <h2>3. EXCEPTIONS</h2>
          <p>
            3.1 Confidentiality obligations do not apply to information that: (a) is publicly available through no
            fault of the Provider; (b) was known to the Provider before disclosure; (c) is independently developed
            without reference to Confidential Information; (d) is required to be disclosed by law, court order, or
            regulatory authority, provided the Provider gives MANAS360 prompt written notice.
          </p>

          <h2>4. PATIENT DATA HANDLING</h2>
          <p>
            4.1 All patient data must be accessed exclusively through the MANAS360 Platform. Downloading, exporting,
            or screen-capturing patient data is prohibited unless explicitly authorized.
          </p>
          <p>4.2 Session notes must be entered directly into the MANAS360 Platform and not stored locally.</p>
          <p>4.3 All video/audio sessions are encrypted end-to-end. The Provider shall not use recording software.</p>

          <h2>5. SURVIVAL</h2>
          <p>
            5.1 Confidentiality obligations survive termination of the Provider relationship for a period of 5 years,
            except for patient health data which remains confidential indefinitely.
          </p>

          <h2>6. REMEDIES</h2>
          <p>
            6.1 The Provider acknowledges and agrees that any breach or threatened breach of this Agreement may result
            in irreparable harm to MANAS360 and/or affected patients, for which monetary damages may be an inadequate
            remedy. Accordingly, MANAS360 shall be entitled to seek immediate injunctive or equitable relief, in
            addition to any other rights or remedies available under law.
          </p>
          <p>
            6.2 The Provider further acknowledges that any unauthorized disclosure, misuse, or breach of patient data
            or sensitive personal information may attract statutory penalties and liabilities under applicable laws,
            including the Digital Personal Data Protection Act, 2023 (which may prescribe penalties up to INR 250
            crore for certain contraventions) and the Information Technology Act, 2000, in addition to civil,
            regulatory, or criminal consequences as may be applicable.
          </p>

          <h2>7. GOVERNING LAW</h2>
          <p>
            7.1 This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute,
            controversy, or claim arising out of or in connection with this Agreement shall be referred to and finally
            resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, as amended from
            time to time. The seat and venue of arbitration shall be Bengaluru, Karnataka, India, and the arbitral
            proceedings shall be conducted in the English language.
          </p>

          <h2>ACCEPTANCE</h2>
          <p>By clicking &quot;I Accept,&quot; the Provider agrees to this NDA.</p>
        </div>
      </div>
    </div>
  );
}
