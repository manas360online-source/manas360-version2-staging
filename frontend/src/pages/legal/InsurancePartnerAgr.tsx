import { useEffect } from 'react';

export default function InsurancePartnerAgr() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - Insurance Integration Agreement</h1>
        <p className="text-sm text-gray-600 mb-8">Between: MANAS360 Private Limited and [Insurance Company] (Insurer)</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. PURPOSE</h2>
          <p>
            1.1 This Agreement establishes the framework for integrating mental health services coverage between
            MANAS360 and the Insurer, enabling policyholders to access mental health therapy through the MANAS360
            Platform with insurance coverage.
          </p>

          <h2>2. SCOPE</h2>
          <p>
            2.1 Covered services: Individual therapy, psychiatric consultations, group therapy, and prescribed wellness
            programmes available on MANAS360.
          </p>
          <p>
            2.2 Coverage limits, co-pay structures, and eligible conditions as defined in the applicable insurance
            policy and mutually agreed Schedule A.
          </p>

          <h2>3. CLAIMS PROCESS</h2>
          <p>3.1 MANAS360 shall submit claims electronically in the format specified by the Insurer.</p>
          <p>
            3.2 Claims shall include: session date and time, Provider details, diagnosis codes (ICD-10), session
            duration, and fees.
          </p>
          <p>
            3.3 The Insurer shall endeavour to process valid claims within thirty (30) days from the date of receipt
            of complete claim documentation.
          </p>
          <p>
            3.4 Cashless facility (where applicable): MANAS360 shall verify insurance coverage at the time of booking
            and deduct only the co-pay amount from the patient.
          </p>

          <h2>4. PROVIDER CREDENTIALING</h2>
          <p>
            4.1 MANAS360 warrants that all Providers are credential-verified, RCI/NMC registered, and bound by
            professional codes of conduct.
          </p>
          <p>4.2 MANAS360 shall maintain and share Provider credentials with the Insurer upon request.</p>

          <h2>5. PAYMENT</h2>
          <p>5.1 Insurer shall pay MANAS360 the agreed claim amount via NEFT within 30 days of claim approval.</p>
          <p>
            5.2 Monthly reconciliation statements shall be exchanged between the Parties to ensure accounting
            accuracy.
          </p>

          <h2>6. DATA SHARING</h2>
          <p>
            6.1 Patient data shared with the Insurer shall be limited to the minimum necessary for claims processing.
          </p>
          <p>6.2 Both parties shall comply with DPDPA 2023.</p>
          <p>6.3 Patient consent for insurance data sharing is obtained at the time of insurance verification.</p>
          <p>
            6.4 Personal health data shall not be used for secondary commercial purposes without explicit lawful
            consent.
          </p>

          <h2>7. TERM AND RENEWAL</h2>
          <p>
            7.1 The initial term of this Agreement shall be twenty-four (24) months from the effective date of
            execution.
          </p>
          <p>7.2 The Agreement may be renewed annually thereafter upon mutual written agreement of the Parties.</p>
        </div>
      </div>
    </div>
  );
}
