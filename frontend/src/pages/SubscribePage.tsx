import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type CatalogItem = {
  name: string;
  price: string;
  format?: string;
  availability?: string;
  provider?: string;
  duration?: string;
  description?: string;
  billing?: string;
  includes?: string;
  bestFor?: string;
};

const specialtyServices: CatalogItem[] = [
  { name: 'Couple Therapy', price: '1499', format: 'Video (60 min)', availability: 'By appointment', provider: 'Licensed therapist' },
  { name: 'Sleep Therapy', price: '1499', format: 'Video (45 min)', availability: 'Evening slots', provider: 'Sleep specialist' },
  { name: 'NRI - Psychologist', price: '2999', format: 'Video (50 min)', availability: 'IST eve / NRI AM', provider: 'Licensed psychologist' },
  { name: 'NRI - Psychiatrist', price: '3499', format: 'Video (30 min)', availability: 'IST eve / NRI AM', provider: 'MD Psychiatrist' },
  { name: 'NRI - Therapist', price: '3599', format: 'Video (50 min)', availability: 'IST eve / NRI AM', provider: 'Senior therapist' },
  { name: 'Executive (Weekend)', price: '1999', format: 'Video (60 min)', availability: 'Sat & Sun', provider: 'Executive coach' },
];

const addOns: CatalogItem[] = [
  { name: 'Anytime Buddy', price: '99', duration: '15 min', description: 'On-demand emotional support chat' },
  { name: 'Digital Pet Hub', price: '99', duration: '15 min', description: 'Hormone companion interaction' },
  { name: 'IVR Therapy', price: '499', duration: 'Per call', description: 'Voice-based therapy + PHQ screening' },
  { name: 'Vent Buddy', price: '99', duration: '15 min', description: 'Anonymous venting with trained listener' },
  { name: 'Sound Therapy Track', price: '30', duration: 'Per track', description: 'Own forever, unlimited play + download' },
  { name: 'Sound Bundle (10)', price: '250', duration: '10 tracks', description: '17% discount (25/track)' },
];

const platformSubscriptions: CatalogItem[] = [
  { name: 'Free Tier', price: '0', billing: '-', includes: "3 tracks/day, Dr. Meera 'Ai, basic self-help", bestFor: 'First-time users' },
  { name: 'Monthly', price: '99', billing: 'Monthly', includes: 'Full platform access, assessments, matching', bestFor: 'Trial users' },
  { name: 'Quarterly (MVP)', price: '299', billing: 'Quarterly', includes: 'Full access + priority matching + assessments', bestFor: 'Primary B2C plan' },
  { name: 'Premium Monthly', price: '299', billing: 'Monthly', includes: 'Unlimited streaming, downloads, AI insights', bestFor: 'Power users' },
  { name: 'Premium Annual', price: '2999', billing: 'Annual', includes: 'All premium (250/month effective, 16% off)', bestFor: 'Committed users' },
];

const providerOptions = [
  'Auto-assign best available provider',
  'Licensed therapist',
  'Sleep specialist',
  'Licensed psychologist',
  'MD Psychiatrist',
  'Senior therapist',
  'Executive coach',
];

const formatInr = (value: string) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function SubscribePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const selectedProvider = providerOptions[0];
  const beneficiaryCount = 1;

  const checkoutBasePath = useMemo(() => '/patient/settings?section=billing', []);

  const goToPayment = (category: string, itemName: string) => {
    const nextPath = `${checkoutBasePath}&source=subscribe&category=${encodeURIComponent(category)}&item=${encodeURIComponent(itemName)}&beneficiaries=${beneficiaryCount}&provider=${encodeURIComponent(selectedProvider)}`;

    if (isAuthenticated) {
      navigate(nextPath);
      return;
    }

    navigate(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  };

  const renderSectionHeader = (title: string, subtitle: string) => (
    <div className="mb-4">
      <h2 className="font-serif text-2xl font-semibold text-charcoal">{title}</h2>
      <p className="mt-1 text-sm text-charcoal/65">{subtitle}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-charcoal">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal/80 hover:text-charcoal">
            <img src="/Untitled.png" alt="MANAS360 logo" className="h-7 w-7 rounded-md object-cover" />
            MANAS360
          </Link>
          <Link to="/" className="rounded-lg border border-calm-sage/25 bg-white px-3 py-2 text-xs font-semibold text-charcoal/80">
            Back to Home
          </Link>
        </div>

        <section className="rounded-2xl border border-calm-sage/20 bg-white p-4 shadow-soft-sm sm:p-6">
          <h1 className="font-serif text-3xl font-semibold text-charcoal sm:text-4xl">Subscribe</h1>
        </section>

        <section className="mt-6 rounded-2xl border border-calm-sage/20 bg-white p-4 shadow-soft-sm sm:p-6">
          {renderSectionHeader('Specialty Services', 'Session-based services with provider guidance')}
          <div className="space-y-3">
            {specialtyServices.map((item) => (
              <div key={item.name} className="rounded-xl border border-calm-sage/15 bg-[#FAFAF8] p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{item.name}</p>
                    <p className="mt-1 text-xs text-charcoal/70">
                      {item.format} | {item.availability} | {item.provider}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-charcoal">{formatInr(item.price)}/S</p>
                </div>
                <button
                  type="button"
                  onClick={() => goToPayment('specialty-service', item.name)}
                  className="mt-3 rounded-lg bg-calm-sage px-3 py-2 text-xs font-semibold text-white"
                >
                  Select and Proceed to Payment
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-calm-sage/20 bg-white p-4 shadow-soft-sm sm:p-6">
          {renderSectionHeader('Add-on Features (a la carte)', 'Small extras you can purchase anytime')}
          <div className="space-y-3">
            {addOns.map((item) => (
              <div key={item.name} className="rounded-xl border border-calm-sage/15 bg-[#FAFAF8] p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{item.name}</p>
                    <p className="mt-1 text-xs text-charcoal/70">{item.duration} | {item.description}</p>
                  </div>
                  <p className="text-sm font-semibold text-charcoal">{formatInr(item.price)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goToPayment('add-on', item.name)}
                  className="mt-3 rounded-lg bg-calm-sage px-3 py-2 text-xs font-semibold text-white"
                >
                  Select and Proceed to Payment
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-calm-sage/20 bg-white p-4 shadow-soft-sm sm:p-6">
          {renderSectionHeader('Platform Subscription (Access Fee)', 'Choose an access plan for ongoing care experience')}
          <div className="space-y-3">
            {platformSubscriptions.map((item) => (
              <div key={item.name} className="rounded-xl border border-calm-sage/15 bg-[#FAFAF8] p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{item.name}</p>
                    <p className="mt-1 text-xs text-charcoal/70">{item.billing} | {item.includes}</p>
                    <p className="mt-1 text-xs text-charcoal/55">Best for: {item.bestFor}</p>
                  </div>
                  <p className="text-sm font-semibold text-charcoal">
                    {formatInr(item.price)}{item.billing && item.billing !== '-' ? `/${item.billing.charAt(0).toUpperCase()}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => goToPayment('platform-subscription', item.name)}
                  className="mt-3 rounded-lg bg-calm-sage px-3 py-2 text-xs font-semibold text-white"
                >
                  Select and Proceed to Payment
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
