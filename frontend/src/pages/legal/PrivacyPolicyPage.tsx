import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const sectionTitleClass = 'mt-10 text-xl font-semibold text-charcoal';

export default function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <main className="min-h-screen bg-cream px-4 py-10 md:px-6 md:py-14">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-calm-sage/15 bg-white/95 p-6 shadow-soft-sm md:p-10">
        <p className="text-xs uppercase tracking-widest text-charcoal/50">Legal</p>
        <h1 className="mt-2 text-3xl font-semibold text-charcoal md:text-4xl">Privacy Policy</h1>

        <p className="mt-4 text-sm leading-6 text-charcoal/75">
          This Privacy Policy describes how Manas360 Mental Wellness Pvt Ltd and its affiliates (we, our, us) collect,
          use, share and protect personal data through www.Manas360.com and related Platform experiences.
        </p>

        <p className="mt-3 text-sm leading-6 text-charcoal/75">
          By visiting the Platform, providing information, or availing products/services, you agree to this Privacy
          Policy, Terms of Use, and applicable service terms, and to governance under laws of India including data
          protection and privacy laws. If you do not agree, please do not use the Platform.
        </p>

        <section>
          <h2 className={sectionTitleClass}>Information We Collect</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-charcoal/75">
            <li>Registration/account details: name, date of birth, address, phone number, email ID.</li>
            <li>Identity/address proof information provided by you.</li>
            <li>Transaction and usage details on the Platform.</li>
            <li>Sensitive information (with consent and as permitted by law): payment instrument details, biometric/physiological information for optional features.</li>
            <li>Behavioral and preference data for analytics and product improvement.</li>
          </ul>
        </section>

        <section>
          <h2 className={sectionTitleClass}>How We Use Data</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-charcoal/75">
            <li>To provide requested services and fulfill transactions.</li>
            <li>To resolve disputes, troubleshoot issues and prevent fraud.</li>
            <li>To personalize experience and communicate offers/updates (with opt-out where applicable).</li>
            <li>To enforce our terms, run analytics, surveys and improve service quality.</li>
          </ul>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Data Sharing</h2>
          <p className="mt-3 text-sm leading-6 text-charcoal/75">
            We may share personal data with group entities, affiliates, sellers, logistics, payment partners and service
            providers as necessary to provide services, comply with legal obligations, enforce terms, and detect fraud.
            Third-party partners collecting data directly are governed by their own privacy policies.
          </p>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Security Precautions</h2>
          <p className="mt-3 text-sm leading-6 text-charcoal/75">
            We use reasonable security safeguards against unauthorized access, misuse and disclosure. However, internet
            transmission is not fully secure and users acknowledge inherent risks. You are responsible for maintaining
            account credential confidentiality.
          </p>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Data Retention and Deletion</h2>
          <p className="mt-3 text-sm leading-6 text-charcoal/75">
            You may request account deletion from profile/settings or by contacting us. Deletion may be delayed for
            pending disputes, claims, shipments or legal reasons. We retain data no longer than needed for purpose or as
            required by law; anonymized data may be retained for analytics/research.
          </p>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Your Rights and Consent</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-charcoal/75">
            <li>You may access, rectify and update personal data using Platform features.</li>
            <li>You may withdraw consent by writing to the Grievance Officer.</li>
            <li>Withdrawal is prospective and may limit certain services where data is necessary.</li>
          </ul>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Updates to Policy</h2>
          <p className="mt-3 text-sm leading-6 text-charcoal/75">
            We may update this policy periodically to reflect changes in information practices or legal requirements.
            Significant changes may be communicated as required under applicable law.
          </p>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Grievance Officer</h2>
          <p className="mt-3 text-sm leading-6 text-charcoal/75">
            For privacy concerns or consent withdrawal requests, contact the Grievance Officer via details provided on
            the Platform.
          </p>
        </section>

        <div className="mt-10 border-t border-calm-sage/15 pt-6 text-sm text-charcoal/65">
          <div className="mt-1 flex flex-wrap gap-4">
            <Link to="/terms" className="underline underline-offset-4">Read Terms of Use</Link>
            <Link to="/refunds" className="underline underline-offset-4">Read Cancellation & Refund Policy</Link>
            <Link to="/" className="underline underline-offset-4">Back to Home</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
