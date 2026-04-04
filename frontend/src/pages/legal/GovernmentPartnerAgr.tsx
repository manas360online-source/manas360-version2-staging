import { useEffect } from 'react';

export default function GovernmentPartnerAgr() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - Government Partnership Agreement</h1>
        <p className="text-sm text-gray-600 mb-8">Between: MANAS360 Private Limited and [Government Agency/Department] (Agency)</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. PURPOSE</h2>
          <p>
            1.1 This Agreement establishes the framework for integration between MANAS360 and the Agency for the
            purpose of extending mental health services through government health programmes, including but not limited
            to Tele-MANAS, ASHA worker networks, and District Mental Health Programme (DMHP).
          </p>
          <p>
            1.2 The collaboration may support government-led mental health service delivery mechanisms, including
            tele-counselling, community outreach, awareness programmes, and referral support systems, subject to
            programme approval.
          </p>

          <h2>2. SCOPE OF COLLABORATION</h2>
          <p>
            2.1 MANAS360 shall provide: (a) Technology platform infrastructure for teleconsultation and digital
            counselling services; (b) Access to verified and credentialed mental health professionals; (c) multilingual
            IVR and WhatsApp-based outreach; (d) Data analytics, programme monitoring dashboards, and reporting
            support; (e) training support and capacity-building assistance for ASHA workers and community health
            workers.
          </p>
          <p>
            2.2 The Agency shall provide: (a) facilitate referral pathways from government facilities; (b) access to
            community health networks; (c) co-branding and awareness support; (d) data on underserved populations for
            targeted outreach.
          </p>

          <h2>3. DATA SOVEREIGNTY</h2>
          <p>
            3.1 All patient data generated through government programmes shall be stored on Indian servers (AWS
            Mumbai) and remain the property of the government and the patient.
          </p>
          <p>
            3.2 Such data shall be treated as jointly attributable to the Government programme, the patient, and the
            authorized data custodians as permitted under applicable law, including the National Digital Health Mission
            (NDHM) standards.
          </p>
          <p>
            3.3 Data sharing with any external agency or governmental authority shall be governed by a separately
            executed Data Sharing Agreement specifying the scope, purpose, security controls, and legal basis for such
            sharing.
          </p>

          <h2>4. PRICING</h2>
          <p>
            4.1 Pricing for government programmes shall be at concessional rates: [INR ___ per consultation / per
            patient per annum] as mutually agreed.
          </p>
          <p>
            4.2 Payment via Government Treasury / PFMS as applicable or any other payment channel prescribed by the
            Agency.
          </p>

          <h2>5. REPORTING</h2>
          <p>
            5.1 MANAS360 shall submit monthly service utilization reports, clinical outcome metrics, and anonymized
            patient demographics to the Agency ensuring strict compliance with data privacy and confidentiality
            requirements.
          </p>

          <h2>6. TERM</h2>
          <p>
            6.1 The term of this Agreement shall be governed by the applicable government procurement or Memorandum of
            Understanding terms, which are typically expected to be for a period of two (2) to three (3) years, with
            extension or renewal provisions subject to mutual written agreement and satisfactory performance review.
          </p>
        </div>
      </div>
    </div>
  );
}
