import { useEffect } from 'react';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-1">Compliant with Digital Personal Data Protection Act, 2023 (DPDPA)</p>
        <p className="text-sm text-gray-600 mb-8">Effective Date: April 4, 2026</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. INTRODUCTION</h2>
          <p>
            1.1 MANAS360 Private Limited (&quot;MANAS360,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting the privacy
            and security of your personal data. This Privacy Policy explains how we collect, use, process, store,
            share, and protect your information when you use our Platform.
          </p>
          <p>
            1.2 This Policy is compliant with the Digital Personal Data Protection Act, 2023 (&quot;DPDPA&quot;), the
            Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and
            Procedures and Sensitive Personal Data or Information) Rules, 2011, and all applicable Indian data
            protection laws.
          </p>
          <p>1.3 MANAS360 is the &quot;Data Fiduciary&quot; as defined under DPDPA.</p>

          <h2>2. DATA WE COLLECT</h2>
          <p>
            2.1 <strong>Registration Data:</strong> Full Name, email, phone number, age, date of birth, gender, city,
            preferred language.
          </p>
          <p>
            2.2 <strong>Health Data (Sensitive Personal Data):</strong> PHQ-9 and GAD-7 assessment scores, mood
            tracking entries, therapy session summaries or notes (created by Providers), AI chat transcripts,
            clinical records, and prescription data.
          </p>
          <p>
            2.3 <strong>Payment Data:</strong> Transaction IDs, payment method type, subscription status. We do NOT
            store card numbers, CVV, or UPI PINs - these are handled entirely by PhonePe.
          </p>
          <p>
            2.4 <strong>Usage Data:</strong> Device information, IP address, browser type, pages visited, session
            duration, features used, crash reports.
          </p>
          <p>
            2.5 <strong>Communication Data:</strong> Support tickets, feedback submissions, email communication,
            chatbot interactions.
          </p>
          <p>2.6 <strong>Cookies and Tracking:</strong> See Document A4 (Cookie and Tracking Policy).</p>

          <h2>3. PURPOSE OF DATA PROCESSING</h2>
          <p>3.1 We process your data for the following purposes with your consent:</p>
          <p>(a) Enabling you to access or use the Platform;</p>
          <p>(b) Providing Platform services, including matching you with Providers;</p>
          <p>(c) Processing payments and subscriptions;</p>
          <p>(d) Delivering AI-powered mental health support;</p>
          <p>
            (e) Tracking clinical outcomes (PHQ-9/GAD-7 trends) for your benefit and your Provider&apos;s reference;
          </p>
          <p>(f) Sending notifications (session reminders, booking confirmations, wellness tips);</p>
          <p>(g) Improving Platform quality, features, and user experience;</p>
          <p>(h) Complying with legal obligations under Indian law;</p>
          <p>(i) Crisis detection and referral to emergency services when imminent risk is identified.</p>

          <h2>4. LEGAL BASIS FOR PROCESSING</h2>
          <p>
            4.1 <strong>Consent (DPDPA Section 6):</strong> We process most data based on your free, specific,
            informed, unconditional and unambiguous consent obtained during registration and at relevant points of
            data collection.
          </p>
          <p>
            4.2 <strong>Legitimate Uses (DPDPA Section 7):</strong> Certain processing is undertaken for legitimate
            uses including compliance with legal obligations, responding to medical emergencies involving threat to
            life or health; preventing fraud or misuse of the Platform; and employment-related processing for
            Providers.
          </p>
          <p>
            4.3 You may withdraw consent at any time. Withdrawal does not affect the lawfulness of processing
            conducted prior to withdrawal.
          </p>

          <h2>5. DATA STORAGE AND SECURITY</h2>
          <p>
            5.1 <strong>Location:</strong> All personal data is stored on AWS Mumbai (ap-south-1) servers located in
            India, ensuring compliance with DPDPA data localization requirements.
          </p>
          <p>5.2 <strong>Encryption:</strong> All data is encrypted at rest (AES-256) and in transit (TLS 1.3).</p>
          <p>
            5.3 <strong>Access Controls:</strong> Role-based access controls (RBAC) restrict data access to authorized
            personnel only. Providers can only access data of patients assigned to them.
          </p>
          <p>
            5.4 <strong>Audit Trails:</strong> All material access to personal data is logged, including timestamp,
            user identity, and action performed.
          </p>
          <p>5.5 <strong>Retention:</strong></p>
          <p>(a) Active user data: Retained while account is active plus 30 days after deletion request;</p>
          <p>
            (b) Health records: Up to 7 years from last interaction (as required under Indian medical records
            retention guidelines);
          </p>
          <p>(c) Financial records: 8 years (as required under the Income Tax Act);</p>
          <p>(d) Anonymized/aggregated data: May be retained indefinitely for research and analytics.</p>

          <h2>6. DATA SHARING</h2>
          <p>6.1 We share data ONLY in the following circumstances:</p>
          <p>
            (a) <strong>With your Provider:</strong> Relevant session history, assessment scores, and clinical data are
            shared with the Provider you are matched with, solely for the purpose of providing therapy;
          </p>
          <p>
            (b) <strong>Payment Processors:</strong> Transaction data is shared with PhonePe for payment processing;
          </p>
          <p>(c) <strong>Legal Obligations:</strong> When required by law, court order, or government authority;</p>
          <p>
            (d) <strong>Emergency:</strong> If we reasonably believe that there is imminent risk of serious harm to you
            or others, we may disclose relevant information with emergency services or crisis helplines;
          </p>
          <p>
            (e) <strong>Anonymized Research:</strong> De-identified, aggregated data may be used for mental health
            research subject to ethical safeguards and approvals.
          </p>
          <p>6.2 We do NOT sell, rent, or trade your personal data to third parties for marketing purposes.</p>
          <p>6.3 We do NOT share your personal data with advertisers.</p>

          <h2>7. YOUR RIGHTS UNDER DPDPA</h2>
          <p>
            7.1 <strong>Right to Access:</strong> You may request a summary of personal data being processed and related
            processing activities.
          </p>
          <p>
            7.2 <strong>Right to Correction:</strong> You may request correction of inaccurate or incomplete data.
          </p>
          <p>
            7.3 <strong>Right to Erasure:</strong> You may request deletion of your data, subject to legal retention
            requirements.
          </p>
          <p>
            7.4 <strong>Right to Nominate:</strong> You may nominate another person to exercise your rights in case of
            death or incapacity.
          </p>
          <p>
            7.5 <strong>Right to Grievance Redressal:</strong> You may file a complaint with our Grievance Officer or
            the Data Protection Board of India.
          </p>
          <p>7.6 To exercise any right, contact: dpo@manas360.com</p>

          <h2>8. CHILDREN&apos;S DATA</h2>
          <p>8.1 We do not knowingly collect data from children under 13 years of age.</p>
          <p>8.2 For users aged 13-18, we collect data only with verifiable parental consent (see Document D2).</p>
          <p>
            8.3 Parents/lawful guardians may request access to, correction of, or deletion of their child&apos;s data.
          </p>

          <h2>9. DATA BREACH NOTIFICATION</h2>
          <p>
            9.1 In the event of a personal data breach likely to cause harm, MANAS360 shall notify the Data Protection
            Board of India and affected users within 72 hours.
          </p>
          <p>
            9.2 Notification shall include: nature of breach, data affected, likely consequences, and remedial
            measures taken.
          </p>

          <h2>10. GRIEVANCE OFFICER</h2>
          <p>Name: [____________]</p>
          <p>Email: grievance@manas360.com</p>
          <p>Phone: [____________]</p>
          <p>Address: MANAS360 Private Limited, Dharwad, Karnataka, India</p>
          <p>Response time: Within 48 hours of receiving a complaint.</p>

          <h2>11. CHANGES TO THIS POLICY</h2>
          <p>
            11.1 We may update this Policy periodically to reflect legal, technical, or operational changes. Material
            changes will be notified via email and in-app notification. Continued accessing or using the Platform
            after notification constitutes acceptance of the revised Policy.
          </p>

          <h2>12. GOVERNING LAW</h2>
          <p>
            12.1 This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute,
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
