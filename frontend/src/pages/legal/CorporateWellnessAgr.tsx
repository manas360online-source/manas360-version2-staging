import { useEffect } from 'react';

export default function CorporateWellnessAgr() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - Corporate Wellness Programme Agreement</h1>
        <p className="text-sm text-gray-600 mb-8">Between: MANAS360 Private Limited (MANAS360) and [Company Name] (Client)</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. SCOPE OF SERVICES</h2>
          <p>
            1.1 The scope of this Agreement is to facilitate the promotion of mental health awareness, emotional
            well-being, and stress management support services for the employees of the Company, through digital
            wellness tools, resources, and professional support features as provided under this Agreement.
          </p>
          <p>1.2 MANAS360 shall provide the following mental wellness services to the Client&apos;s employees:</p>
          <p>(a) AI-powered 24/7 mental health chatbot in multiple languages;</p>
          <p>(b) Access to verified therapists and psychiatrists for teleconsultation;</p>
          <p>(c) PHQ-9 and GAD-7 assessments for employee wellness screening;</p>
          <p>(d) Anonymized aggregate wellness dashboards for HR leadership;</p>
          <p>(e) Group wellness workshops and webinars (frequency as per plan);</p>
          <p>(f) Crisis detection and escalation protocols;</p>
          <p>(g) Monthly/quarterly wellness reports with anonymized insights.</p>

          <h2>2. PLANS AND PRICING</h2>
          <p>2.1 Plans:</p>
          <p>(a) <strong>Basic (INR 199/employee/month):</strong> AI chat (5 sessions/month), assessments, wellness content;</p>
          <p>(b) <strong>Standard (INR 499/employee/month):</strong> Unlimited AI chat, 2 therapy sessions/month, group workshops;</p>
          <p>
            (c) <strong>Premium (INR 999/employee/month):</strong> Unlimited access to all features including therapy,
            psychiatry, sound therapy, and AR wellness.
          </p>
          <p>2.2 Pricing is based on annual commitment with monthly billing. Volume discounts apply for 500+ employees.</p>
          <p>2.3 All prices exclusive of GST (18%).</p>

          <h2>3. EMPLOYEE DATA AND PRIVACY</h2>
          <p>3.1 MANAS360 shall comply with DPDPA 2023 for all employee data processing.</p>
          <p>
            3.2 <strong>Strict anonymity guarantee:</strong> Individual employee-level usage data, therapy session
            content, assessment responses, and clinical evaluation results shall not be disclosed to the Client or its
            Human Resources department under any circumstances. The Client shall receive only anonymized and
            aggregated reports, such as department-level or organization-level summaries (for example,
            &quot;Engineering Department - Average Stress Level: Moderate&quot;), which cannot be used to identify any
            individual employee.
          </p>
          <p>
            3.3 Employee participation in services offered by MANAS360 shall be strictly voluntary and based on
            informed consent. MANAS360 shall not disclose to the Client, its management, or its Human Resources
            department any information identifying whether a particular employee is using or has used the Platform&apos;s
            services, and all participation data shall remain confidential and protected in accordance with the
            Platform&apos;s privacy and data protection obligations.
          </p>
          <p>3.4 Employee consent is obtained individually at the time of registration.</p>

          <h2>4. IMPLEMENTATION</h2>
          <p>
            4.1 MANAS360 shall complete onboarding within 15 business days of contract execution, including: (a) bulk
            employee registration via CSV upload; (b) customized landing page with Client branding; (c) employee
            communication materials (email templates, poster designs); (d) orientation webinar for employees.
          </p>

          <h2>5. PAYMENT TERMS</h2>
          <p>5.1 Invoices issued monthly in arrears based on active employee count.</p>
          <p>
            5.2 Payment due within 30 days of invoice date via NEFT/RTGS to MANAS360&apos;s designated bank account.
          </p>
          <p>5.3 Late payments attract interest at 1.5% per month.</p>

          <h2>6. TERM AND TERMINATION</h2>
          <p>
            6.1 Initial term: The initial term of this Agreement shall be twelve (12) months from the effective date
            of execution.
          </p>
          <p>
            6.2 The Agreement shall automatically renew for successive twelve (12) month periods unless either Party
            provides written notice of non-renewal at least sixty (60) days prior to expiry.
          </p>
          <p>
            6.3 Either Party may terminate this Agreement for material breach by providing thirty (30) days&apos; written
            notice and opportunity to cure such breach, where legally and practically possible.
          </p>
          <p>
            6.4 Upon termination, employee data shall be handled per DPDPA requirements (retained for medical records
            compliance, then deleted).
          </p>

          <h2>7. REPRESENTATIONS AND WARRANTIES</h2>
          <p>
            7.1 MANAS360 represents that all Providers are credential-verified, background-checked, and bound by
            professional codes of conduct.
          </p>
          <p>
            7.2 The Client represents that employee participation in the programme shall remain voluntary and that no
            adverse employment action shall be taken solely on the basis of non-participation.
          </p>

          <h2>8. LIMITATION OF LIABILITY</h2>
          <p>
            8.1 MANAS360&apos;s aggregate liability under this Agreement shall not exceed the total fees paid by the Client
            in the 12 months preceding the claim.
          </p>
          <p>
            8.2 MANAS360 is not liable for clinical outcomes resulting from independent professional advice provided
            through the platform; employee misuse of services; and force majeure events.
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
