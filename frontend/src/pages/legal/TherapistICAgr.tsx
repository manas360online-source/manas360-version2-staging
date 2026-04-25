import { useEffect } from 'react';

export default function TherapistICAgr() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - Independent Contractor Agreement</h1>
        <p className="text-sm text-gray-600 mb-8">Between: MANAS360 Private Limited (Platform) and the Therapist/Provider (Provider)</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. NATURE OF RELATIONSHIP</h2>
          <p>
            1.1 The Provider is engaged as an independent contractor. Nothing in this Agreement shall be construed to
            create an employer-employee relationship, partnership, joint venture, agency, franchise, or fiduciary
            relationship between the parties.
          </p>
          <p>
            1.2 The Provider retains full and exclusive clinical autonomy and professional judgment in all therapeutic
            interactions. MANAS360 does not direct, control, supervise, or interfere with clinical decision-making,
            diagnosis, treatment planning, prescriptions, or patient management.
          </p>
          <p>
            1.3 The Provider is solely responsible for all tax liabilities, including income tax, GST (if applicable),
            professional tax, and any statutory contributions required under Indian law.
          </p>

          <h2>2. PROVIDER REPRESENTATIONS AND ELIGIBILITY</h2>
          <p>2.1 The Provider represents and warrants that they hold:</p>
          <p>
            (a) A valid degree in psychology, psychiatry, counseling, psychotherapy or related field from a recognized
            institution;
          </p>
          <p>
            (b) Valid and current registration with the Rehabilitation Council of India (RCI), National Medical
            Commission (NMC), relevant State Medical Council, or other applicable regulatory authority;
          </p>
          <p>
            (c) Professional indemnity insurance (recommended) or willingness to participate in MANAS360&apos;s group
            insurance programme;
          </p>
          <p>
            (d) No pending disciplinary actions, license suspensions, or criminal charges related to professional
            conduct.
          </p>

          <h2>3. SERVICES</h2>
          <p>
            3.1 The Provider agrees to offer professional mental health services via the MANAS360 Platform, including
            video therapy, audio therapy, chat-based therapy, group sessions, and clinical assessments.
          </p>
          <p>
            3.2 The Provider shall maintain an up-to-date availability calendar on the Platform and honour all
            confirmed bookings.
          </p>
          <p>
            3.3 The Provider shall maintain complete and accurate session notes using MANAS360&apos;s SOAP/Progress Note
            templates within 24 hours of each session.
          </p>

          <h2>4. REVENUE SHARE</h2>
          <p>4.1 The revenue share between MANAS360 and the Provider shall be as follows:</p>
          <p>(a) <strong>Provider receives 60% of the session fee</strong> charged to the patient;</p>
          <p>
            (b) <strong>MANAS360 retains 40% as the platform fee</strong>, which covers technology infrastructure,
            payment processing, marketing, administrative support and patient acquisition.
          </p>
          <p>
            4.2 Example: For a session priced at INR 1,000 by the Provider, the Provider receives INR 600 and MANAS360
            retains INR 400.
          </p>
          <p>
            4.3 The Provider sets their own session fees within the range of INR 300 to INR 5,000 per session.
            MANAS360 may suggest pricing based on market benchmarks but does not mandate specific fees.
          </p>
          <p>4.4 Revenue share percentages may be revised with 60 days&apos; written notice to the Provider.</p>

          <h2>5. PAYMENT TERMS</h2>
          <p>
            5.1 Payouts are processed weekly (every Monday) for sessions completed in the prior week via UPI bank
            transfer to the Provider&apos;s registered bank account.
          </p>
          <p>5.2 Minimum payout threshold: INR 500. Amounts below the threshold will be carried forward.</p>
          <p>
            5.3 Detailed payout statements including session count, gross earnings, platform fee, TDS (if applicable),
            and net payout are available on the Provider Dashboard.
          </p>
          <p>
            5.4 Tax Deducted at Source (TDS) shall be deducted at applicable rates under the Income Tax Act, 1961. TDS
            certificates will be issued quarterly.
          </p>

          <h2>6. PROVIDER OBLIGATIONS</h2>
          <p>
            6.1 Maintain valid and subsisting professional qualifications, licenses, and registrations at all times,
            and immediately notify MANAS360 of any suspension, restriction, lapse, investigation, or change in
            registration status.
          </p>
          <p>
            6.2 Comply with all applicable laws, including the Mental Healthcare Act, 2017, Telemedicine Practice
            Guidelines, 2020, NMC Code of Ethics, and DPDPA 2023.
          </p>
          <p>6.3 Attend mandatory platform training and quarterly compliance updates.</p>
          <p>
            6.4 Respond to patient booking requests within four (4) hours during declared availability and maintain
            professional responsiveness and continuity of care.
          </p>
          <p>
            6.5 Not solicit, divert or attempt to move MANAS360 patients for off-platform services or share personal
            contact information with patients.
          </p>
          <p>
            6.6 Report all incidents, including clinical emergencies, patient complaints, data breaches, and ethical
            concerns, to MANAS360 within 24 hours.
          </p>
          <p>
            6.7 Maintain strict confidentiality of all patient information and access, use, store, or disclose such
            information solely for lawful clinical purposes.
          </p>
          <p>
            6.8 Implement appropriate technical and organizational safeguards to protect personal data against
            unauthorized access, disclosure, alteration, loss, or misuse, in accordance with applicable data
            protection laws and the Platform&apos;s privacy and security policies.
          </p>

          <h2>7. PLATFORM OBLIGATIONS</h2>
          <p>
            7.1 Provide a reliable and secure technology infrastructure to support teleconsultation services, with a
            targeted service availability of 99.5% uptime, subject to scheduled maintenance, force majeure events, and
            factors beyond its reasonable control.
          </p>
          <p>
            7.2 Responsible for managing patient acquisition initiatives, marketing activities, payment processing
            mechanisms, and billing administration in connection with services delivered through the Platform, subject
            to applicable laws and agreed commercial terms.
          </p>
          <p>
            7.3 Provide integrated session management tools, standardized SOAP note templates, prescription management
            functionality (where applicable and limited to licensed psychiatrists), and access to clinical dashboards
            to support documentation, care coordination, and service delivery.
          </p>
          <p>7.4 Process payouts as per Section 5.</p>
          <p>
            7.5 Provide professional indemnity insurance coverage under a group policy arrangement, on an optional
            basis, with the applicable premium or associated costs to be shared as mutually agreed.
          </p>

          <h2>8. LIABILITY AND INDEMNIFICATION</h2>
          <p>
            8.1 The Provider shall be solely liable for clinical negligence, malpractice, or breach of professional
            standards.
          </p>
          <p>
            8.2 The Provider agrees to indemnify and hold harmless MANAS360 from claims arising out of clinical
            misconduct; regulatory violations; misrepresentation of credentials; and breach of confidentiality.
          </p>

          <h2>9. TERM AND TERMINATION</h2>
          <p>
            9.1 This Agreement shall commence upon the Provider&apos;s acceptance of its terms and activation of the
            Provider&apos;s profile on the Platform, and shall continue in full force and effect unless and until
            terminated.
          </p>
          <p>9.2 Either party may terminate with 30 days&apos; written notice.</p>
          <p>
            9.3 Notwithstanding the foregoing, MANAS360 may suspend or terminate this Agreement with immediate effect,
            without prior notice, if the Provider: (a) has any professional credential, license, or registration
            revoked, suspended, restricted, or allowed to lapse; (b) engages in professional misconduct or unethical
            practice; (c) breaches patient confidentiality or data protection obligations; (d) receives three or more
            verified patient complaints within a 90 day period; or (e) fails to comply with or fails a compliance,
            quality, or regulatory audit.
          </p>
          <p>
            9.4 Upon termination, the Provider shall complete all scheduled sessions and receive pending payouts within
            15 business days.
          </p>

          <h2>10. INTELLECTUAL PROPERTY</h2>
          <p>
            10.1 MANAS360 retains all right, title, and interest, including all intellectual property rights, in and
            to the Platform&apos;s technology, software, systems, branding, trademarks, trade names, logos, content,
            templates, workflows, and other proprietary materials, and nothing in this Agreement shall be construed as
            granting the Provider any ownership rights therein.
          </p>
          <p>
            10.2 Session notes created by the Provider using MANAS360 templates are the joint property of the Provider
            and the patient, hosted on MANAS360&apos;s infrastructure.
          </p>

          <h2>11. GOVERNING LAW</h2>
          <p>
            11.1 This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute,
            controversy, or claim arising out of or in connection with this Agreement shall be referred to and finally
            resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, as amended from
            time to time. The seat and venue of arbitration shall be Bengaluru, Karnataka, India, and the arbitral
            proceedings shall be conducted in the English language.
          </p>

          <h2>ACCEPTANCE</h2>
          <p>
            By clicking &quot;I Accept&quot; and activating your Provider profile, you agree to the terms of this Agreement.
          </p>
        </div>
      </div>
    </div>
  );
}
