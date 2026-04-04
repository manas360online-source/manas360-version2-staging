import { useEffect } from 'react';

export default function SchoolInstitutionAgr() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - School Mental Health Programme Agreement</h1>
        <p className="text-sm text-gray-600 mb-8">Between: MANAS360 Private Limited and [School/Institution Name] (Institution)</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. PROGRAMME OVERVIEW</h2>
          <p>
            1.1 MANAS360 shall implement a student mental wellness and emotional support programme aimed at promoting
            mental health awareness, emotional well-being, and stress management among students of the Institution
            through digital wellness resources, counselling support mechanisms, and related services agreed under this
            Agreement.
          </p>
          <p>1.2 The programme may include, subject to age-appropriate design principles:</p>
          <p>(a) Age-appropriate mental health assessments;</p>
          <p>(b) Access to verified child and adolescent therapists;</p>
          <p>(c) Group wellness sessions for students;</p>
          <p>(d) Teacher/counselor training workshops;</p>
          <p>(e) Parent awareness programmes;</p>
          <p>(f) Early crisis detection and referral pathways;</p>
          <p>(g) Anonymized and aggregated institutional wellness reports.</p>

          <h2>2. PARENTAL OR GUARDIAN CONSENT</h2>
          <p>
            2.1 All student participation requires prior verified parental/lawful guardian consent (Document D2).
            MANAS360 shall facilitate consent collection via SMS and email.
          </p>
          <p>
            2.2 No services shall be provided to any student without valid parental or lawful guardian consent on
            file.
          </p>
          <p>
            2.3 Parents or guardians retain the right to withdraw consent and remove their child from the programme at
            any time.
          </p>

          <h2>3. STUDENT DATA PROTECTION</h2>
          <p>
            3.1 All student-related personal data shall be processed in strict compliance with the Digital Personal
            Data Protection Act, 2023 and other applicable child protection regulations in India.
          </p>
          <p>
            3.2 Individual student clinical or behavioural data shall be accessible ONLY to: (a) the assigned
            therapist/counselor; (b) the student&apos;s parent/guardian (upon request); (c) MANAS360&apos;s clinical governance
            team (for quality assurance).
          </p>
          <p>
            3.3 The Institution receives ONLY anonymized, aggregate reports (e.g., &quot;12 students flagged for
            follow-up&quot; - without individual identification).
          </p>
          <p>
            3.4 The Institution shall not have access to personally identifiable student mental health records,
            counselling transcripts, or individual assessment responses.
          </p>

          <h2>4. PRICING</h2>
          <p>4.1 Programme fee: [INR ___ per student per annum], subject to student count and services selected.</p>
          <p>4.2 Payment via NEFT to MANAS360&apos;s designated account.</p>
          <p>4.3 All prices exclusive of GST (18%).</p>

          <h2>5. SAFEGUARDING</h2>
          <p>
            5.1 All therapists assigned to the programme shall have verified child and adolescent psychiatry training
            or experience.
          </p>
          <p>5.2 All therapists shall hold valid POCSO Act awareness certification.</p>
          <p>
            5.3 MANAS360 shall comply with the Protection of Children from Sexual Offences Act (POCSO), 2012, and
            mandatory reporting obligations.
          </p>

          <h2>6. TERM AND RENEWAL</h2>
          <p>
            6.1 The programme term shall generally align with the academic year (June to May) unless otherwise agreed.
          </p>
          <p>6.2 The Agreement may be renewed annually upon mutual written consent of the Parties.</p>

          <h2>7. LIMITATION OF LIABILITY</h2>
          <p>
            7.1 MANAS360&apos;s aggregate liability under this Agreement shall not exceed the total fees paid by the
            Institution in the 12 months preceding the claim.
          </p>
          <p>
            7.2 MANAS360 is not liable for clinical outcomes resulting from independent professional advice provided
            through the platform; misuse of services; and force majeure events.
          </p>

          <h2>8. GOVERNING LAW</h2>
          <p>
            8.1 This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute,
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
