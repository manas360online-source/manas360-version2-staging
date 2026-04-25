import { useEffect } from 'react';

export default function TherapistPayoutTerms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">MANAS360 - Provider Payout Terms</h1>
        <div className="prose prose-lg max-w-none">
          <h2>1. REVENUE SPLIT</h2>
          <p>
            1.1 The Provider shall be entitled to sixty percent (60%) of the session fee earned from completed and
            payable sessions.
          </p>
          <p>
            1.2 MANAS360 shall retain forty percent (40%) (Platform Service Fee) unless otherwise agreed in writing.
          </p>

          <h2>2. PAYOUT SCHEDULE</h2>
          <p>2.1 Weekly payouts every Monday for the preceding week (Monday to Sunday).</p>
          <p>2.2 Minimum payout: INR 500. Balances below threshold carry forward.</p>
          <p>
            2.3 MANAS360 reserves the right to modify the payout schedule with prior notice in accordance with
            applicable law.
          </p>

          <h2>3. PAYMENT METHOD</h2>
          <p>
            3.1 All payouts via UPI/NEFT bank transfer to the Provider&apos;s registered and KYC verified bank account.
          </p>
          <p>3.2 Provider must maintain an active, KYC-verified bank account linked to their PAN.</p>
          <p>
            3.3 The Provider shall promptly update any changes to banking or KYC details through the authorized
            platform interface.
          </p>

          <h2>4. TAX DEDUCTIONS</h2>
          <p>
            4.1 TDS at applicable rates under the Income Tax Act, 1961, shall be deducted from payouts.
          </p>
          <p>4.2 Quarterly TDS certificates (Form 16A) shall be issued by MANAS360.</p>
          <p>
            4.3 The Provider shall be solely responsible for filing and discharging obligations relating to income
            tax, GST (if applicable), professional tax, or any other statutory liability arising from services
            rendered.
          </p>

          <h2>5. DISPUTES</h2>
          <p>
            5.1 Payout disputes must be raised within 15 days of the payout date via the Provider Dashboard or email to
            payouts@manas360.com.
          </p>
          <p>5.2 Disputes will be investigated and resolved within 10 business days.</p>

          <h2>6. ADJUSTMENTS</h2>
          <p>
            6.1 MANAS360 may adjust payouts for: (a) patient refunds for sessions cancelled by Provider; (b)
            chargebacks; (c) overpayments; (d) penalties for Code of Conduct violations (with 7 days&apos; prior written
            notice).
          </p>
        </div>
      </div>
    </div>
  );
}
