import { useEffect, useMemo, useState } from 'react';
import { patientApi } from '../../api/patient';
import Modal from '../../components/ui/Modal';

type PlanId = 'basic' | 'premium' | 'pro';
type SubscriptionStatus = 'active' | 'cancelled';

type PlanOption = {
  id: PlanId;
  name: string;
  price: string;
  cycle: 'Monthly' | 'Yearly';
  bestFor: string;
  features: string[];
};

const planOptions: PlanOption[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: '₹999',
    cycle: 'Monthly',
    bestFor: 'Gentle start and self-guided support',
    features: ['Mood check-ins', 'Session booking access', 'Basic support resources'],
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: '₹2,499',
    cycle: 'Monthly',
    bestFor: 'Regular therapy and structured progress',
    features: ['Everything in Basic', 'Priority scheduling', 'Full progress insights', 'AnytimeBuddy priority'],
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    price: '₹24,999',
    cycle: 'Yearly',
    bestFor: 'Long-term, continuity-focused wellness journey',
    features: ['Everything in Premium', 'Annual savings', 'Dedicated care guidance', 'Extended wellness programs'],
  },
];

const todayPlusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const planRank: Record<PlanId, number> = {
  basic: 1,
  premium: 2,
  pro: 3,
};

const formatDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatAmount = (amountMinor?: number | null) => {
  if (typeof amountMinor !== 'number' || Number.isNaN(amountMinor)) return '—';
  return `₹${(amountMinor / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const statusBadgeClass = (status: string) => {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-700';
  if (status === 'refunded') return 'bg-amber-100 text-amber-700';
  if (status === 'failed') return 'bg-rose-100 text-rose-700';
  return 'bg-calm-sage/15 text-charcoal/70';
};

const getPlan = (id: PlanId) => planOptions.find((item) => item.id === id) || planOptions[1];

const planIdFromName = (value: string | undefined): PlanId => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('basic')) return 'basic';
  if (normalized.includes('pro')) return 'pro';
  return 'premium';
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [currentPlanId, setCurrentPlanId] = useState<PlanId>('premium');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('active');
  const [autoRenew, setAutoRenew] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [renewalDate, setRenewalDate] = useState<Date>(todayPlusDays(21));
  const [paymentMethod, setPaymentMethod] = useState<{ brand: string; last4: string; expiry: string } | null>(null);
  const [showAutoRenewModal, setShowAutoRenewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [subscriptionRaw, setSubscriptionRaw] = useState<any>(null);
  const [paymentDraft, setPaymentDraft] = useState({
    brand: paymentMethod?.brand || '',
    last4: paymentMethod?.last4 || '',
    expiry: paymentMethod?.expiry || '',
  });

  const loadBillingData = async () => {
    const [subscriptionRes, paymentRes, invoicesRes] = await Promise.all([
      patientApi.getSubscription(),
      patientApi.getPaymentMethod(),
      patientApi.getInvoices(),
    ]);

    const subscriptionData = subscriptionRes?.data ?? subscriptionRes;
    const paymentData = paymentRes?.data ?? paymentRes;
    const invoicesData = invoicesRes?.data ?? invoicesRes;

    setSubscriptionRaw(subscriptionData || null);
    setCurrentPlanId(planIdFromName(subscriptionData?.planName));
    setSubscriptionStatus(String(subscriptionData?.status || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'active');
    setAutoRenew(Boolean(subscriptionData?.autoRenew));
    setBillingCycle(String(subscriptionData?.billingCycle || '').toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly');
    setRenewalDate(subscriptionData?.renewalDate ? new Date(subscriptionData.renewalDate) : todayPlusDays(21));

    if (paymentData) {
      setPaymentMethod({
        brand: paymentData.cardBrand,
        last4: paymentData.cardLast4,
        expiry: `${String(paymentData.expiryMonth).padStart(2, '0')}/${String(paymentData.expiryYear).slice(-2)}`,
      });
    } else {
      setPaymentMethod(null);
    }

    setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadBillingData();
      } catch {
        setInvoices([]);
      } finally {
        setLoadingSessions(false);
      }
    })();
  }, []);

  const currentPlan = useMemo(() => getPlan(currentPlanId), [currentPlanId]);

  const paidCount = useMemo(
    () => invoices.filter((item) => String(item.status || '').toLowerCase() === 'paid').length,
    [invoices],
  );

  const normalizedInvoices = useMemo(() => {
    return invoices.slice(0, 20).map((invoice: any) => {
      return {
        id: invoice.id,
        date: invoice.createdAt,
        plan: currentPlan.name,
        amountMinor: Number(invoice.amount || 0) * 100,
        status: String(invoice.status || 'paid').toLowerCase(),
        providerName: invoice.invoiceUrl || 'Therapy Session',
      };
    });
  }, [invoices, currentPlan.name]);

  const planBenefits = useMemo(() => currentPlan.features, [currentPlan.features]);

  const isCancelled = subscriptionStatus === 'cancelled';

  const handleChangePlan = (planId: PlanId) => {
    if (planId === currentPlanId) return;
    const direction = planRank[planId] > planRank[currentPlanId] ? 'upgraded' : 'adjusted';
    const next = getPlan(planId);
    setCurrentPlanId(planId);
    setBillingCycle(next.cycle);
    setActionMessage(`Your plan has been ${direction} to ${next.name}. You’re in control.`);
  };

  const onUpgrade = async () => {
    try {
      await patientApi.upgradeSubscription();
      await loadBillingData();
      if (currentPlanId === 'basic') handleChangePlan('premium');
      else if (currentPlanId === 'premium') handleChangePlan('pro');
      else setActionMessage('You’re already on our highest plan with full support features.');
    } catch (error: any) {
      setActionMessage(error?.response?.data?.message || 'Unable to upgrade plan right now.');
    }
  };

  const onDowngrade = async () => {
    try {
      await patientApi.downgradeSubscription();
      await loadBillingData();
      if (currentPlanId === 'pro') handleChangePlan('premium');
      else if (currentPlanId === 'premium') handleChangePlan('basic');
      else setActionMessage('You’re already on the most lightweight plan.');
    } catch (error: any) {
      setActionMessage(error?.response?.data?.message || 'Unable to downgrade plan right now.');
    }
  };

  const onCancelSubscription = async () => {
    try {
      await patientApi.cancelSubscription();
      await loadBillingData();
      setShowCancelModal(false);
      setActionMessage('We understand. Your plan will remain active until the end of your billing cycle, and you can return anytime.');
    } catch (error: any) {
      setActionMessage(error?.response?.data?.message || 'Unable to cancel subscription right now.');
    }
  };

  const onReactivate = async () => {
    try {
      await patientApi.reactivateSubscription();
      await loadBillingData();
      setActionMessage('Your subscription is active again. Small steps matter.');
    } catch (error: any) {
      setActionMessage(error?.response?.data?.message || 'Unable to reactivate subscription right now.');
    }
  };

  const onAutoRenewToggle = () => {
    if (isCancelled) return;
    if (autoRenew) {
      setShowAutoRenewModal(true);
      return;
    }
    void (async () => {
      await patientApi.setSubscriptionAutoRenew(true);
      await loadBillingData();
      setActionMessage('Auto-renew is enabled. Your care continuity is protected.');
    })();
  };

  const confirmDisableAutoRenew = async () => {
    await patientApi.setSubscriptionAutoRenew(false);
    await loadBillingData();
    setShowAutoRenewModal(false);
    setActionMessage(`Auto-renew disabled. Your plan will expire on ${formatDate(renewalDate)}.`);
  };

  const savePaymentMethod = async () => {
    const last4 = paymentDraft.last4.trim();
    const expiry = paymentDraft.expiry.trim();
    if (last4.length !== 4 || expiry.length < 4) {
      setActionMessage('Please enter a valid card summary before saving.');
      return;
    }

    const [month, year] = expiry.split('/');
    await patientApi.updatePaymentMethod({
      cardBrand: paymentDraft.brand.trim() || 'Card',
      cardLast4: last4,
      expiryMonth: Number(month),
      expiryYear: Number(`20${String(year || '').slice(-2)}`),
    });
    await loadBillingData();
    setShowPaymentModal(false);
    setActionMessage('Payment method updated securely. Your payments are encrypted.');
  };

  const openPaymentModal = () => {
    setPaymentDraft({
      brand: paymentMethod?.brand || 'Visa',
      last4: paymentMethod?.last4 || '',
      expiry: paymentMethod?.expiry || '',
    });
    setShowPaymentModal(true);
  };

  const onDownloadInvoice = async (invoice: any) => {
    try {
      if (invoice?.id) {
        const blob = await patientApi.downloadInvoice(invoice.id);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoice.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fallback below for unavailable invoice endpoint.
    }

    const fallbackBlob = new Blob([
      `Invoice\nDate: ${formatDate(invoice.date)}\nPlan: ${invoice.plan}\nAmount: ${formatAmount(invoice.amountMinor)}\nStatus: ${invoice.status}`,
    ], { type: 'text/plain;charset=utf-8' });
    const fallbackUrl = URL.createObjectURL(fallbackBlob);
    const fallbackLink = document.createElement('a');
    fallbackLink.href = fallbackUrl;
    fallbackLink.download = `invoice-${invoice?.id || 'summary'}.txt`;
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    fallbackLink.remove();
    URL.revokeObjectURL(fallbackUrl);
  };

  const openDetails = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowDetailsModal(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-20 lg:pb-6">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-charcoal sm:text-3xl">Subscription</h1>
        <p className="mt-1 text-sm text-charcoal/65">Manage your plan anytime. You’re in control.</p>
      </header>

      {actionMessage && (
        <div className="rounded-xl border border-calm-sage/25 bg-calm-sage/10 px-4 py-3 text-sm text-charcoal/80">
          {actionMessage}
        </div>
      )}

      <section className="rounded-2xl border border-calm-sage/20 bg-white/95 p-4 shadow-soft-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/50">Current Subscription</p>
            <h2 className="font-serif text-2xl font-semibold text-charcoal">{currentPlan.name}</h2>
            <p className="text-sm text-charcoal/65">You’re currently on {currentPlan.name}.</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-calm-sage/15 px-3 py-1 text-xs font-semibold text-calm-sage">₹{subscriptionRaw?.price ?? currentPlan.price.replace('₹', '')} / {billingCycle === 'Yearly' ? 'year' : 'month'}</span>
              <span className="rounded-full bg-cream/80 px-3 py-1 text-xs font-medium text-charcoal/70">Renews: {formatDate(renewalDate)}</span>
              <span className="rounded-full bg-cream/80 px-3 py-1 text-xs font-medium text-charcoal/70">Auto-renew: {autoRenew ? 'On' : 'Off'}</span>
              <span className="rounded-full bg-cream/80 px-3 py-1 text-xs font-medium text-charcoal/70">Cycle: {billingCycle}</span>
            </div>
          </div>
          <p className="max-w-sm text-sm text-charcoal/60">Billing should feel simple and transparent. We’ll always keep your options clear.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {planBenefits.map((benefit) => (
            <span key={benefit} className="rounded-full border border-calm-sage/20 bg-calm-sage/5 px-3 py-1 text-xs text-charcoal/75">
              {benefit}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={onUpgrade}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-calm-sage px-4 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Upgrade Plan
          </button>
          <button
            type="button"
            onClick={onDowngrade}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-calm-sage/30 bg-white px-4 text-sm font-semibold text-charcoal/80 transition hover:bg-calm-sage/10"
          >
            Downgrade Plan
          </button>
          {!isCancelled ? (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-warm-terracotta/30 bg-warm-terracotta/10 px-4 text-sm font-semibold text-warm-terracotta transition hover:bg-warm-terracotta/15"
            >
              Cancel Subscription
            </button>
          ) : (
            <button
              type="button"
              onClick={onReactivate}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-calm-sage px-4 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Reactivate
            </button>
          )}
          <button
            type="button"
            onClick={onAutoRenewToggle}
            disabled={isCancelled}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-calm-sage/30 bg-white px-4 text-sm font-semibold text-charcoal/80 transition hover:bg-calm-sage/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Auto-Renew: {autoRenew ? 'On' : 'Off'}
          </button>
        </div>
      </section>

      {isCancelled && (
        <section className="rounded-2xl border border-calm-sage/20 bg-white/95 p-4 shadow-soft-sm sm:p-5">
          <h3 className="font-serif text-xl font-semibold text-charcoal">Your plan is inactive</h3>
          <p className="mt-1 text-sm text-charcoal/65">Reactivate anytime to continue your wellness journey.</p>
          <button
            type="button"
            onClick={onReactivate}
            className="mt-4 inline-flex min-h-[42px] items-center justify-center rounded-xl bg-calm-sage px-5 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Reactivate Now
          </button>
        </section>
      )}

      <section className="rounded-2xl border border-calm-sage/15 bg-white/95 p-4 shadow-soft-sm sm:p-5">
        <div className="mb-4">
          <h3 className="font-serif text-xl font-semibold text-charcoal">Compare Plans</h3>
          <p className="mt-1 text-sm text-charcoal/65">Choose what fits your pace. You can switch anytime.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {planOptions.map((plan) => {
            const current = plan.id === currentPlanId;
            return (
              <article
                key={plan.id}
                className={`flex h-full flex-col rounded-2xl border p-4 ${current ? 'border-calm-sage bg-calm-sage/10' : 'border-calm-sage/15 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{plan.name}</p>
                    <p className="mt-1 text-xl font-semibold text-charcoal">{plan.price}<span className="text-xs font-normal text-charcoal/60"> / {plan.cycle === 'Yearly' ? 'year' : 'month'}</span></p>
                  </div>
                  {current && <span className="rounded-full bg-calm-sage/20 px-2.5 py-1 text-[11px] font-semibold text-calm-sage">Current</span>}
                </div>
                <p className="mt-2 text-xs text-charcoal/60">Best for: {plan.bestFor}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-charcoal/75">
                  {plan.features.map((feature) => (
                    <li key={feature}>✓ {feature}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={async () => {
                    if (current) return;
                    if (planRank[plan.id] > planRank[currentPlanId]) {
                      await onUpgrade();
                      return;
                    }
                    await onDowngrade();
                  }}
                  className={`mt-4 inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
                    current ? 'border border-calm-sage/30 bg-white text-charcoal/70' : 'bg-calm-sage text-white hover:opacity-95'
                  }`}
                >
                  {current ? 'Active Plan' : planRank[plan.id] > planRank[currentPlanId] ? 'Upgrade' : 'Switch Plan'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/95 p-4 shadow-soft-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl font-semibold text-charcoal">Payment Method</h3>
            <p className="mt-1 text-sm text-charcoal/65">Your payments are encrypted and handled securely.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={openPaymentModal}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-calm-sage/30 bg-white px-4 text-sm font-semibold text-charcoal/80 transition hover:bg-calm-sage/10"
            >
              Update Payment Method
            </button>
            <button
              type="button"
              onClick={openPaymentModal}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-calm-sage px-4 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Add New Card
            </button>
          </div>
        </div>

        {paymentMethod ? (
          <div className="mt-4 rounded-xl border border-calm-sage/20 bg-calm-sage/5 p-4">
            <p className="text-sm font-semibold text-charcoal">{paymentMethod.brand} •••• {paymentMethod.last4}</p>
            <p className="mt-1 text-xs text-charcoal/60">Expires {paymentMethod.expiry}</p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-calm-sage/20 bg-cream/60 p-4 text-sm text-charcoal/65">
            No card added yet. Add a payment method whenever you’re ready.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/95 p-4 shadow-soft-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-xl font-semibold text-charcoal">Billing History</h3>
            <p className="mt-1 text-sm text-charcoal/65">Paid sessions: {paidCount}</p>
          </div>
        </div>

        {loadingSessions ? (
          <p className="text-sm text-charcoal/60">Loading history...</p>
        ) : normalizedInvoices.length === 0 ? (
          <p className="rounded-xl border border-calm-sage/15 bg-cream/60 px-4 py-3 text-sm text-charcoal/60">No invoices yet. We’ll list your billing entries here.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-calm-sage/15 text-xs uppercase tracking-[0.08em] text-charcoal/50">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Invoice</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-calm-sage/10 text-charcoal/80">
                      <td className="px-3 py-3">{formatDate(invoice.date)}</td>
                      <td className="px-3 py-3">{invoice.plan}</td>
                      <td className="px-3 py-3">{formatAmount(invoice.amountMinor)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => void onDownloadInvoice(invoice)} className="rounded-lg border border-calm-sage/25 px-2.5 py-1 text-xs font-medium text-charcoal/75 hover:bg-calm-sage/10">
                            Download Invoice
                          </button>
                          <button type="button" onClick={() => openDetails(invoice)} className="rounded-lg border border-calm-sage/25 px-2.5 py-1 text-xs font-medium text-charcoal/75 hover:bg-calm-sage/10">
                            View details
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 lg:hidden">
              {normalizedInvoices.map((invoice) => (
                <article key={invoice.id} className="rounded-xl border border-calm-sage/15 bg-white p-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-charcoal/55">Date</p>
                    <p className="text-right font-medium text-charcoal">{formatDate(invoice.date)}</p>
                    <p className="text-charcoal/55">Plan</p>
                    <p className="text-right font-medium text-charcoal">{invoice.plan}</p>
                    <p className="text-charcoal/55">Amount</p>
                    <p className="text-right font-medium text-charcoal">{formatAmount(invoice.amountMinor)}</p>
                    <p className="text-charcoal/55">Status</p>
                    <p className="text-right">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => void onDownloadInvoice(invoice)} className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/75 hover:bg-calm-sage/10">
                      Download Invoice
                    </button>
                    <button type="button" onClick={() => openDetails(invoice)} className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/75 hover:bg-calm-sage/10">
                      View details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/95 p-4 shadow-soft-sm sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl font-semibold text-charcoal">Auto-Renew Subscription</h3>
            <p className="mt-1 text-sm text-charcoal/65">
              {autoRenew
                ? 'Your plan renews automatically.'
                : `Your plan will expire on ${formatDate(renewalDate)}.`}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoRenew}
            onClick={onAutoRenewToggle}
            disabled={isCancelled}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${autoRenew ? 'bg-calm-sage' : 'bg-calm-sage/30'} disabled:opacity-50`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${autoRenew ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </section>

      <Modal isOpen={showAutoRenewModal} onClose={() => setShowAutoRenewModal(false)} title="Disable auto-renewal?" size="sm">
        <p className="text-sm text-charcoal/70">If disabled, your plan will expire on {formatDate(renewalDate)}. You can turn it back on anytime.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setShowAutoRenewModal(false)}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-calm-sage/30 px-4 text-sm font-semibold text-charcoal/80 hover:bg-calm-sage/10"
          >
            Keep Auto-Renew On
          </button>
          <button
            type="button"
            onClick={confirmDisableAutoRenew}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-warm-terracotta/80 px-4 text-sm font-semibold text-white hover:opacity-95"
          >
            Disable Auto-Renew
          </button>
        </div>
      </Modal>

      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Are you sure you want to cancel?" size="md">
        <div className="space-y-3 text-sm text-charcoal/70">
          <p>Your plan remains active until {formatDate(renewalDate)}.</p>
          <p>After that date, premium support features, guided programs, and priority access may no longer be available.</p>
          <p>We understand. You can come back anytime.</p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              setShowCancelModal(false);
              onDowngrade();
            }}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-calm-sage/30 px-4 text-sm font-semibold text-charcoal/80 hover:bg-calm-sage/10"
          >
            Switch Plan Instead
          </button>
          <button
            type="button"
            onClick={() => setShowCancelModal(false)}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-calm-sage/30 px-4 text-sm font-semibold text-charcoal/80 hover:bg-calm-sage/10"
          >
            Keep Plan
          </button>
          <button
            type="button"
            onClick={onCancelSubscription}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-warm-terracotta/80 px-4 text-sm font-semibold text-white hover:opacity-95"
          >
            Confirm Cancel
          </button>
        </div>
      </Modal>

      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Update payment method" size="sm">
        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55">
            Card Brand
            <input
              type="text"
              value={paymentDraft.brand}
              onChange={(event) => setPaymentDraft((prev) => ({ ...prev, brand: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-calm-sage"
              placeholder="Visa / Mastercard"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55">
              Last 4 digits
              <input
                type="text"
                maxLength={4}
                value={paymentDraft.last4}
                onChange={(event) => setPaymentDraft((prev) => ({ ...prev, last4: event.target.value.replace(/\D/g, '') }))}
                className="mt-1 w-full rounded-xl border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-calm-sage"
                placeholder="4832"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55">
              Expiry
              <input
                type="text"
                value={paymentDraft.expiry}
                onChange={(event) => setPaymentDraft((prev) => ({ ...prev, expiry: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-calm-sage"
                placeholder="MM/YY"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setShowPaymentModal(false)}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-calm-sage/30 px-4 text-sm font-semibold text-charcoal/80 hover:bg-calm-sage/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={savePaymentMethod}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-calm-sage px-4 text-sm font-semibold text-white hover:opacity-95"
          >
            Save Card
          </button>
        </div>
      </Modal>

      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Invoice details" size="sm">
        {selectedInvoice ? (
          <div className="space-y-2 text-sm text-charcoal/75">
            <p><span className="font-semibold text-charcoal">Date:</span> {formatDate(selectedInvoice.date)}</p>
            <p><span className="font-semibold text-charcoal">Plan:</span> {selectedInvoice.plan}</p>
            <p><span className="font-semibold text-charcoal">Amount:</span> {formatAmount(selectedInvoice.amountMinor)}</p>
            <p><span className="font-semibold text-charcoal">Status:</span> <span className="capitalize">{selectedInvoice.status}</span></p>
            <p><span className="font-semibold text-charcoal">Details:</span> {selectedInvoice.providerName}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
