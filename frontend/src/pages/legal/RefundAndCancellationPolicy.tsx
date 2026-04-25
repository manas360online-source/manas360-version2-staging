import { useEffect } from 'react';

export default function RefundAndCancellationPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">MANAS360 - Refund and Cancellation Policy</h1>
        <div className="prose prose-lg max-w-none">
          <h2>1. PURPOSE AND SCOPE</h2>
          <p>
            1.1 This Refund and Cancellation Policy governs all payments made by Users while accessing or using the
            MANAS360 Platform, including therapy sessions, subscriptions, assessments, digital programs, and other
            paid services.
          </p>
          <p>
            1.2 By booking a session, purchasing a subscription, or making any payment on the Platform, the User
            agrees to this Policy.
          </p>

          <h2>2. SESSION CANCELLATIONS</h2>
          <p>2.1 <strong>By Patient - More than 24 hours before session:</strong> Full refund to original payment method within 5-7 business days.</p>
          <p>2.2 <strong>By Patient - 12 to 24 hours before session:</strong> 50% refund. Remaining 50% credited as MANAS360 wallet balance.</p>
          <p>2.3 <strong>By Patient - Less than 12 hours before session:</strong> No refund. Full amount credited as MANAS360 wallet balance valid for 90 days.</p>
          <p>2.4 <strong>By Patient - No-show (no cancellation):</strong> No refund. Provider receives full session fee.</p>
          <p>2.5 <strong>By Provider:</strong> Full refund to patient&apos;s original payment method. Provider&apos;s reliability score may be affected.</p>
          <p>2.6 <strong>Technical failure (MANAS360 side):</strong> Full refund or complimentary rescheduled session at patient&apos;s choice.</p>

          <h2>3. SUBSCRIPTION CANCELLATIONS</h2>
          <p>3.1 Subscriptions may be cancelled at any time from Settings &gt; Subscription &gt; Cancel.</p>
          <p>
            3.2 Upon cancellation, the subscription remains active until the end of the current billing period. No
            prorated refund for unused days.
          </p>
          <p>
            3.3 Annual subscribers who cancel within the first 14 days receive a full refund minus the cost of any
            sessions attended.
          </p>

          <h2>4. REFUND PROCESSING</h2>
          <p>4.1 Refunds are processed via the original payment method (UPI, card, net banking).</p>
          <p>4.2 Standard processing time: 5-7 business days for bank refunds, instant for wallet credits.</p>
          <p>4.3 PhonePe transaction fees are non-refundable.</p>

          <h2>5. WALLET CREDITS</h2>
          <p>5.1 Wallet credits may be used for any MANAS360 service (sessions, subscriptions, premium content).</p>
          <p>5.2 Wallet credits are non-transferable and expire 90 days from issuance.</p>
          <p>5.3 Wallet credits cannot be redeemed for cash.</p>

          <h2>6. FRAUD PREVENTION</h2>
          <p>6.1 MANAS360 reserves the right to withhold refunds where:</p>
          <p>(a) Fraudulent activity is suspected;</p>
          <p>(b) Repeated refund abuse is detected.</p>

          <h2>7. DISPUTES</h2>
          <p>
            7.1 Refund disputes may be raised within 30 days of the transaction by contacting support@manas360.com.
          </p>
          <p>
            7.2 MANAS360&apos;s decision on refund disputes shall be final, subject to the dispute resolution mechanisms in
            the Terms of Service.
          </p>

          <h2>8. CHANGES TO THIS POLICY</h2>
          <p>
            8.1 We may update this Policy periodically to reflect legal, technical, or operational changes. Material
            changes will be notified via email and in-app notification. Continued accessing or using the Platform
            after notification constitutes acceptance of the revised Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
