import { useEffect } from 'react';

export default function EmployeeAndContractorNDA() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - Internal Non-Disclosure Agreement</h1>
        <p className="text-sm text-gray-600 mb-8">Between: MANAS360 Private Limited and [Employee/Contractor Name]</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. PURPOSE</h2>
          <p>
            1.1 This Agreement is intended to protect and maintain the confidentiality, integrity, and security of all
            proprietary, clinical, technical, and business information accessed or handled by the Employee,
            Contractor, or Consultant in the course of performing duties for MANAS360.
          </p>

          <h2>2. CONFIDENTIAL INFORMATION</h2>
          <p>
            2.1 Includes but is not limited to: (a) patient data, Provider data, and all health records; (b) source
            code, algorithms, AI models, machine learning models, and technical architecture; (c) business plans,
            financial records, pricing strategies, and investor materials; (d) marketing strategies, user acquisition
            data, operational performance metrics and competitive intelligence; (e) employee/contractor compensation,
            performance data, and internal communications; (f) any information not publicly available.
          </p>

          <h2>3. OBLIGATIONS</h2>
          <p>
            3.1 The Recipient shall: (a) use Confidential Information solely for performing authorized duties for
            MANAS360; (b) not disclose Confidential Information to any third party without prior written
            authorization; (c) implement security measures (password-protected devices, 2FA, encrypted
            communications); (d) not retain, copy or store Confidential Information upon termination; (e) return or
            destroy all materials containing Confidential Information within 7 days of termination; (f) comply with
            data protection obligations prescribed under the Digital Personal Data Protection Act, 2023.
          </p>

          <h2>4. SPECIAL PROVISIONS FOR HEALTHCARE DATA</h2>
          <p>
            4.1 Patient health data is classified as "Highly Confidential" and subject to additional safeguards under
            DPDPA 2023.
          </p>
          <p>
            4.2 Access to patient data shall be strictly restricted to a need-to-know basis and shall be logged through
            audit trail monitoring systems.
          </p>
          <p>
            4.3 Any unauthorized access, use, or disclosure of patient data shall constitute a material breach and may
            result in immediate disciplinary action, termination, and potential legal proceedings under applicable law.
          </p>

          <h2>5. NON-COMPETE AND NON-SOLICITATION</h2>
          <p>
            5.1 During the term and for 12 months after termination, the Recipient shall not: (a) directly or
            indirectly engage with a competing mental health platform in India; (b) solicit MANAS360 employees,
            contractors, Providers, or patients.
          </p>

          <h2>6. TERM</h2>
          <p>
            6.1 This NDA is effective from the date of signing and survives for 3 years after termination of the
            employment/contractor relationship, except for trade secrets and patient data which remain confidential
            indefinitely.
          </p>

          <h2>7. REMEDIES</h2>
          <p>
            7.1 MANAS360 may seek injunctive relief and damages for breach. Penalties under DPDPA 2023 and IT Act,
            2000, may also apply.
          </p>
        </div>
      </div>
    </div>
  );
}
