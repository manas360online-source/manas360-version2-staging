import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from './Header';
import ConfigSection from './ConfigSection';
import PricingSummary from './PricingSummary';
import PricingTable from './PricingTable';
import { FEATURES } from './data';
import {
  calculateSubscriptionPriceMock,
  calculateSubscriptionPriceSafe,
  type PricingResponse,
  type ApiError,
} from './api';

const STORAGE_KEY = 'selectedFeatures';

type DashboardFeatureKey =
  | 'patient-database'
  | 'session-notes'
  | 'scheduling'
  | 'progress-tracking'
  | 'prescriptions'
  | 'homework'
  | 'audit-export'
  | 'bulk-import'
  | 'multi-therapist'
  | 'jitsi-session';

const toDashboardFeatureKeys = (slugs: string[]): DashboardFeatureKey[] => {
  const mapped = slugs
    .map((slug) => {
      if (slug === 'patient-database') return 'patient-database';
      if (slug === 'session-notes') return 'session-notes';
      if (slug === 'scheduling') return 'scheduling';
      if (slug === 'progress-tracking') return 'progress-tracking';
      if (slug === 'prescriptions') return 'prescriptions';
      if (slug === 'adherence') return 'homework';
      if (slug === 'homework') return 'homework';
      if (slug === 'compliance-pack') return 'audit-export';
      if (slug === 'audit-export') return 'audit-export';
      if (slug === 'bulk-import') return 'bulk-import';
      if (slug === 'multi-therapist') return 'multi-therapist';
      if (slug === 'jitsi-session') return 'jitsi-session';
      return null;
    })
    .filter((item): item is DashboardFeatureKey => item !== null);

  return Array.from(new Set(mapped));
};

export default function PricingPage() {
  const navigate = useNavigate();

  const [currentTier, setCurrentTier] = useState<'solo' | 'small' | 'large'>('solo');
  const [currentBilling, setCurrentBilling] = useState<'monthly' | 'quarterly'>('monthly');
  const [selectedFeatures, setSelectedFeatures] = useState<boolean[]>(new Array(FEATURES.length).fill(false));

  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [pricingSource, setPricingSource] = useState<'api' | 'fallback' | null>(null);

  const getSelectedFeatureSlugs = (): string[] => {
    return selectedFeatures
      .map((isSelected, idx) => (isSelected ? FEATURES[idx].slug : null))
      .filter((slug): slug is string => slug !== null);
  };

  useEffect(() => {
    const fetchPricing = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const selectedFeatureSlugs = getSelectedFeatureSlugs();

        if (selectedFeatureSlugs.length === 0) {
          setPricing({
            monthly_total: 0,
            billing_amount: 0,
            discount_applied: 0,
            breakdown: [],
          });
          setPricingSource(null);
          return;
        }

        const isDevelopment = import.meta.env.DEV;
        let response: PricingResponse;

        if (isDevelopment && import.meta.env.VITE_USE_MOCK_API === 'true') {
          response = calculateSubscriptionPriceMock({
            clinic_tier: currentTier,
            billing_cycle: currentBilling,
            selected_features: selectedFeatureSlugs,
          });
          setPricingSource('fallback');
        } else {
          const result = await calculateSubscriptionPriceSafe({
            clinic_tier: currentTier,
            billing_cycle: currentBilling,
            selected_features: selectedFeatureSlugs,
          });

          response = result.pricing;
          setPricingSource(result.source);
        }

        setPricing(response);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError);
        setPricingSource(null);
        console.error('Failed to calculate pricing:', apiError);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPricing();
  }, [currentTier, currentBilling, selectedFeatures]);

  const handleFeatureChange = (index: number) => {
    const newSelected = [...selectedFeatures];
    newSelected[index] = !newSelected[index];
    setSelectedFeatures(newSelected);
  };

  const handleStartTrial = () => {
    alert('Starting 21-day free trial with your selected features!');
  };

  const handleContinue = () => {
    const selectedFeatureSlugs = getSelectedFeatureSlugs();
    const dashboardFeatureKeys = toDashboardFeatureKeys(selectedFeatureSlugs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardFeatureKeys));
    navigate('/my-digital-clinic/dashboard');
  };

  return (
    <>
      <Helmet>
        <title>MyDigitalClinic - Build Your Custom Plan - MANAS360</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100 p-5">
        <Header />

        {error && (
          <div className="max-w-7xl mx-auto mb-5 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <p className="text-red-800 text-xs">{error.message}</p>
          </div>
        )}

        {!error && pricingSource === 'fallback' && (
          <div className="max-w-7xl mx-auto mb-5 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
            <p className="text-amber-800 text-xs">
              Using fallback pricing (backend not available)
            </p>
          </div>
        )}

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ConfigSection
            currentTier={currentTier}
            onTierChange={setCurrentTier}
            currentBilling={currentBilling}
            onBillingChange={setCurrentBilling}
            selectedFeatures={selectedFeatures}
            onFeatureChange={handleFeatureChange}
            onStartTrial={handleStartTrial}
            isLoading={isLoading}
          />

          <div className="bg-white rounded-xl p-6 shadow-md">
            {isLoading && (
              <div className="text-center py-8 text-gray-500">
                Loading pricing...
              </div>
            )}

            {!isLoading && pricing && (
              <PricingSummary
                currentTier={currentTier}
                currentBilling={currentBilling}
                selectedFeatures={selectedFeatures}
                pricing={pricing}
              />
            )}

            {!isLoading && (
              <PricingTable
                selectedFeatures={selectedFeatures}
                currentTier={currentTier}
                currentBilling={currentBilling}
                pricing={pricing}
              />
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleStartTrial}
                className="flex-1 min-w-[180px] bg-green-700 text-white py-2 rounded"
              >
                Start Free Trial
              </button>
              <button
                onClick={handleContinue}
                className="flex-1 min-w-[180px] bg-blue-600 text-white py-2 rounded"
              >
                Take me to MyDigitalClinic
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
