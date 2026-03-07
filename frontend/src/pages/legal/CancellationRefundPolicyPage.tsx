import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const sectionTitleClass = 'mt-10 text-xl font-semibold text-charcoal';
const cardClass = 'mt-4 overflow-x-auto rounded-xl border border-calm-sage/20 bg-white';

export default function CancellationRefundPolicyPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <main className="min-h-screen bg-cream px-4 py-10 md:px-6 md:py-14">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-calm-sage/15 bg-white/95 p-6 shadow-soft-sm md:p-10">
        <p className="text-xs uppercase tracking-widest text-charcoal/50">Legal</p>
        <h1 className="mt-2 text-3xl font-semibold text-charcoal md:text-4xl">MANAS360 Cancellation & Refund Policy</h1>
        <p className="mt-3 text-sm text-charcoal/65">Version 1.0 | Effective Date: January 2026 | Last Updated: January 22, 2026</p>
        <p className="mt-1 text-sm text-charcoal/65">Jurisdiction: India</p>

        <section>
          <h2 className={sectionTitleClass}>Governing Law</h2>
          <p className="mt-3 text-sm leading-6 text-charcoal/75">
            This policy is governed by the laws of India, including the Consumer Protection Act, 2019, IT Act, 2000,
            E-Commerce Rules, 2020, and DPDPA, 2023. Disputes are subject to the exclusive jurisdiction of courts in
            Bengaluru, Karnataka, India.
          </p>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Session Cancellation by User</h2>
          <div className={cardClass}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-calm-sage/10 text-charcoal/80">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cancellation Window</th>
                  <th className="px-4 py-3 font-semibold">Refund Amount</th>
                  <th className="px-4 py-3 font-semibold">Credit Option</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-calm-sage/10 text-charcoal/75">
                <tr><td className="px-4 py-3">24+ hours before session</td><td className="px-4 py-3">100%</td><td className="px-4 py-3">Full session credit</td></tr>
                <tr><td className="px-4 py-3">12-24 hours before session</td><td className="px-4 py-3">75%</td><td className="px-4 py-3">Full session credit</td></tr>
                <tr><td className="px-4 py-3">4-12 hours before session</td><td className="px-4 py-3">50%</td><td className="px-4 py-3">75% session credit</td></tr>
                <tr><td className="px-4 py-3">Less than 4 hours</td><td className="px-4 py-3">No refund</td><td className="px-4 py-3">50% one-time courtesy credit</td></tr>
              </tbody>
            </table>
          </div>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-charcoal/75">
            <li>Session credits are valid for 90 days, non-transferable, and non-cashable.</li>
            <li>Free rescheduling is available up to 12 hours before session time.</li>
            <li>Within 12 hours, rescheduling is treated as cancel + new booking.</li>
          </ul>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Service Provider Cancellation & No-Show</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-charcoal/75">
            <li>If provider cancels: user may choose full refund, reschedule, or 110% session credit.</li>
            <li>If provider cancels within 4 hours: full refund or 110% credit with priority rebooking assistance.</li>
            <li>User no-show (not joined within 15 minutes): no refund, session billed as completed.</li>
            <li>Provider no-show (not joined within 10 minutes): automatic full refund and INR 200 credit.</li>
          </ul>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Subscription Cancellation</h2>
          <div className={cardClass}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-calm-sage/10 text-charcoal/80">
                <tr>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Timing</th>
                  <th className="px-4 py-3 font-semibold">Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-calm-sage/10 text-charcoal/75">
                <tr><td className="px-4 py-3">Monthly</td><td className="px-4 py-3">Within 48 hours</td><td className="px-4 py-3">100%</td></tr>
                <tr><td className="px-4 py-3">Monthly</td><td className="px-4 py-3">Within 7 days</td><td className="px-4 py-3">Pro-rata</td></tr>
                <tr><td className="px-4 py-3">Monthly</td><td className="px-4 py-3">After 7 days</td><td className="px-4 py-3">No refund, no future charges</td></tr>
                <tr><td className="px-4 py-3">Annual</td><td className="px-4 py-3">Within 7 days</td><td className="px-4 py-3">100%</td></tr>
                <tr><td className="px-4 py-3">Annual</td><td className="px-4 py-3">Within 30 days</td><td className="px-4 py-3">75%</td></tr>
                <tr><td className="px-4 py-3">Annual</td><td className="px-4 py-3">31-90 days</td><td className="px-4 py-3">50%</td></tr>
                <tr><td className="px-4 py-3">Annual</td><td className="px-4 py-3">After 90 days</td><td className="px-4 py-3">No refund, no renewal</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Package & Bundle Refunds</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-charcoal/75">
            <li>0 sessions used: 100% refund within 30 days.</li>
            <li>1+ used: refund = package price - (sessions used x standard single-session price).</li>
            <li>Package validity is 180 days. Unused sessions after expiry are non-refundable.</li>
          </ul>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Refund Timeline</h2>
          <div className={cardClass}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-calm-sage/10 text-charcoal/80">
                <tr>
                  <th className="px-4 py-3 font-semibold">Payment Method</th>
                  <th className="px-4 py-3 font-semibold">Typical Refund Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-calm-sage/10 text-charcoal/75">
                <tr><td className="px-4 py-3">UPI</td><td className="px-4 py-3">3-5 working days</td></tr>
                <tr><td className="px-4 py-3">Debit Card</td><td className="px-4 py-3">5-7 working days</td></tr>
                <tr><td className="px-4 py-3">Credit Card</td><td className="px-4 py-3">7-10 working days</td></tr>
                <tr><td className="px-4 py-3">Net Banking</td><td className="px-4 py-3">5-7 working days</td></tr>
                <tr><td className="px-4 py-3">Wallets</td><td className="px-4 py-3">1-3 working days</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-charcoal/75">MANAS360 initiates approved refunds within 48 hours. Actual credit depends on bank timelines.</p>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Non-Refundable Items</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-charcoal/75">
            <li>Completed sessions and user no-show sessions.</li>
            <li>Expired credits (90 days) and expired packages (180 days).</li>
            <li>Processing fees and third-party services.</li>
            <li>Promotional/free services and fraudulent requests.</li>
          </ul>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Grievance Redressal</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-charcoal/75">
            <li>Customer support: support@manas360.com (response within 24 hours, resolution within 72 hours).</li>
            <li>Grievance officer: grievance@manas360.com (response within 48 hours, resolution within 30 days).</li>
            <li>External support: National Consumer Helpline 1800-11-4000 and consumerhelpline.gov.in.</li>
          </ul>
        </section>

        <section>
          <h2 className={sectionTitleClass}>Amendments</h2>
          <p className="mt-3 text-sm leading-6 text-charcoal/75">
            MANAS360 may update this policy from time to time. Changes are communicated through email, in-app notices,
            or website banners. Continued use of services after changes implies acceptance of the updated policy.
          </p>
        </section>

        <div className="mt-10 border-t border-calm-sage/15 pt-6 text-sm text-charcoal/65">
          <p>This policy forms an integral part of MANAS360 Terms of Service.</p>
          <p className="mt-2">Document Control: MANAS360-LEGAL-CRP-001</p>
          <p className="mt-1">Registered Address: [Company Address], Bengaluru, Karnataka, India | CIN: [Company Identification Number]</p>
          <Link to="/" className="mt-4 inline-block text-charcoal underline underline-offset-4">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
