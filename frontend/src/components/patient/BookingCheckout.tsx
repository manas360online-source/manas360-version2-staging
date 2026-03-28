import React from 'react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

interface BookingCheckoutProps {
  sessionPrice: number;     // e.g. 999
  bookingId: number;         // ID of the booking being created
  onSuccess: () => void;
}

const BookingCheckout: React.FC<BookingCheckoutProps> = ({
  sessionPrice,
  bookingId,
  onSuccess,
}) => {
  const { balance, applyWalletToPayment } = useWallet();

  const handlePay = async () => {
    let finalAmount = sessionPrice;

    // Auto-apply wallet credits (works for game credits + any other credits)
    if (balance > 0) {
      const used = Math.min(balance, sessionPrice);
      await applyWalletToPayment({ bookingId, amount: used });
      finalAmount = sessionPrice - used;
    }

    if (finalAmount > 0) {
      // → Your existing Razorpay / Stripe / Payment Gateway flow here
      toast.info(`Proceeding to pay remaining ₹${finalAmount}`);
      // Example:
      // await initiateRazorpayPayment(finalAmount, bookingId);
    } else {
      toast.success('Session booked successfully using wallet credits!');
    }

    onSuccess();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow">
        <div className="flex justify-between items-center text-lg">
          <span className="font-medium">Session Fee</span>
          <span className="font-semibold">₹{sessionPrice}</span>
        </div>

        {balance > 0 && (
          <div className="flex justify-between items-center text-emerald-600 mt-4">
            <span className="font-medium">Wallet Credits Applied</span>
            <span className="font-bold">-₹{Math.min(balance, sessionPrice)}</span>
          </div>
        )}

        <div className="h-px bg-gray-200 my-6" />

        <div className="flex justify-between items-center text-2xl font-bold">
          <span>To Pay</span>
          <span className="text-emerald-600">₹{Math.max(0, sessionPrice - balance)}</span>
        </div>
      </div>

      <button
        onClick={handlePay}
        className="w-full py-7 text-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl shadow-xl transition"
      >
        {Math.max(0, sessionPrice - balance) === 0
          ? '✅ Book with Wallet Credits'
          : `Pay ₹${Math.max(0, sessionPrice - balance)}`}
      </button>

      <p className="text-center text-xs text-gray-500">
        Credits auto-applied • Expire in 30 days • Game credits are FIFO
      </p>
    </div>
  );
};

export default BookingCheckout;
