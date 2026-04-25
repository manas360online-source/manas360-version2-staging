import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

type DocumentAcceptanceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
  initialStepIndex?: number;
  showComplianceSequence?: boolean;
  showHeader?: boolean;
};

export default function DocumentAcceptanceModal({
  isOpen,
  onClose,
  onCompleted,
  initialStepIndex,
  showComplianceSequence,
  showHeader = true,
}: DocumentAcceptanceModalProps) {
  const [accepted, setAccepted] = useState(false);

  // Kept for compatibility with existing callers.
  void initialStepIndex;
  void showComplianceSequence;

  if (!isOpen) return null;

  const handleContinue = () => {
    if (!accepted) return;
    onCompleted?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 p-4">
      <div className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        {showHeader && (
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Legal Acceptance</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="space-y-4 px-6 py-6">
          <p className="text-sm text-slate-700">
            Please review the legal documents below. Only these three documents are used for legal acceptance.
          </p>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Link to="/terms" className="block font-medium text-slate-900 underline underline-offset-2">
              Terms of Service
            </Link>
            <Link to="/privacy" className="block font-medium text-slate-900 underline underline-offset-2">
              Privacy Policy
            </Link>
            <Link to="/refunds" className="block font-medium text-slate-900 underline underline-offset-2">
              Cancellation & Refund Policy
            </Link>
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span>I have reviewed these 3 legal documents and accept them.</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!accepted}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Accept & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
