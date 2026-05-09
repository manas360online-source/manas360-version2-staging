type DeclineInfo = {
  title: string;
  message: string;
  action: string;
  isRetryable: boolean;
  retryAfterMinutes: number | null;
};

const FALLBACK_REASON = 'payment_declined';

const reasonMap: Record<string, DeclineInfo> = {
  insufficient_funds: {
    title: 'Insufficient funds',
    message: 'Your bank account does not have enough balance for this payment.',
    action: 'Use another account or add funds, then retry.',
    isRetryable: true,
    retryAfterMinutes: 5,
  },
  user_cancelled: {
    title: 'Payment cancelled',
    message: 'The payment was cancelled before completion.',
    action: 'Retry when you are ready to complete payment.',
    isRetryable: true,
    retryAfterMinutes: 1,
  },
  bank_declined: {
    title: 'Bank declined the payment',
    message: 'Your bank declined this transaction.',
    action: 'Contact your bank or try another payment method.',
    isRetryable: true,
    retryAfterMinutes: 10,
  },
  risk_blocked: {
    title: 'Payment blocked for security',
    message: 'The transaction was blocked by payment security checks.',
    action: 'Try again later or contact support.',
    isRetryable: true,
    retryAfterMinutes: 30,
  },
  payment_declined: {
    title: 'Payment failed',
    message: 'The payment did not complete successfully.',
    action: 'Please retry the payment.',
    isRetryable: true,
    retryAfterMinutes: 5,
  },
};

const sanitize = (value: unknown): string => String(value || '').trim().toLowerCase();

export const extractDeclineReasonFromPhonePe = (payload: Record<string, any>): string => {
  if (!payload || typeof payload !== 'object') return FALLBACK_REASON;

  const candidates = [
    payload?.declineReason,
    payload?.errorReason,
    payload?.paymentError,
    payload?.detailedErrorCode,
    payload?.code,
    payload?.state,
    payload?.responseCode,
    payload?.data?.declineReason,
    payload?.data?.errorReason,
    payload?.data?.code,
    payload?.data?.state,
  ];

  for (const candidate of candidates) {
    const normalized = sanitize(candidate);
    if (!normalized) continue;

    if (normalized.includes('insufficient')) return 'insufficient_funds';
    if (normalized.includes('cancel')) return 'user_cancelled';
    if (normalized.includes('risk') || normalized.includes('fraud')) return 'risk_blocked';
    if (normalized.includes('declin') || normalized.includes('bank')) return 'bank_declined';
    if (normalized.includes('fail') || normalized.includes('error')) return 'payment_declined';
  }

  return FALLBACK_REASON;
};

export const formatDeclineMessage = (reason: string): DeclineInfo => {
  const normalized = sanitize(reason);
  return reasonMap[normalized] || reasonMap[FALLBACK_REASON];
};
