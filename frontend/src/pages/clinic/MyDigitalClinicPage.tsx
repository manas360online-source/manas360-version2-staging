import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from './Header';
import ConfigSection from './ConfigSection';
import PricingSummary from './PricingSummary';
import PricingTable from './PricingTable';
import { FEATURES } from './data';
import {
  calculateSubscriptionPriceMock,
  calculateSubscriptionPriceSafe,
  PricingResponse,
  ApiError,
} from './api';

export const MyDigitalClinicPage: React.FC = () => {
  const [currentTier, setCurrentTier] = useState<'solo' | 'small' | 'large'>('solo');
  const [currentBilling, setCurrentBilling] = useState<'monthly' | 'quarterly'>('monthly');

  // Boolean array for checkbox UI
  const [selectedFeatures, setSelectedFeatures] = useState<boolean[]>(
    new Array(FEATURES.length).fill(false)
  );

  // API states
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [pricingSource, setPricingSource] = useState<'api' | 'fallback' | null>(null);

  /**
   * Convert boolean[] → feature_slug[]
   */
  const getSelectedFeatureSlugs = (): string[] => {
    return selectedFeatures
      .map((isSelected, idx) => (isSelected ? FEATURES[idx].slug : null))
      .filter((slug): slug is string => slug !== null);
  };

  /**
   * Fetch pricing
   */
  useEffect(() => {
    const fetchPricing = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const selectedFeatureSlugs = getSelectedFeatureSlugs();

        // If no features selected → reset pricing
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
          // ✅ MOCK
          response = calculateSubscriptionPriceMock({
            clinic_tier: currentTier,
            billing_cycle: currentBilling,
            selected_features: selectedFeatureSlugs,
          });
          setPricingSource('fallback');
        } else {
          // ✅ REAL API
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

    fetchPricing();
  }, [currentTier, currentBilling, selectedFeatures]);

  /**
   * Toggle feature checkbox
   */
  const handleFeatureChange = (index: number) => {
    const newSelected = [...selectedFeatures];
    newSelected[index] = !newSelected[index];
    setSelectedFeatures(newSelected);
  };

  /**
   * Start Trial
   */
  const handleStartTrial = () => {
    alert('Starting 21-day free trial with your selected features!');
  };

  return (
    <>
      <Helmet>
        <title>MyDigitalClinic - Build Your Custom Plan - MANAS360</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100 p-5">
        <Header />

        {/* ERROR */}
        {error && (
          <div className="max-w-7xl mx-auto mb-5 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <p className="text-red-800 text-xs">{error.message}</p>
          </div>
        )}

        {/* FALLBACK INFO */}
        {!error && pricingSource === 'fallback' && (
          <div className="max-w-7xl mx-auto mb-5 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
            <p className="text-amber-800 text-xs">
              Using fallback pricing (backend not available)
            </p>
          </div>
        )}

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT */}
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

          {/* RIGHT */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            {/* LOADING */}
            {isLoading && (
              <div className="text-center py-8 text-gray-500">
                Loading pricing...
              </div>
            )}

            {/* SUMMARY */}
            {!isLoading && pricing && (
              <PricingSummary
                currentTier={currentTier}
                currentBilling={currentBilling}
                selectedFeatures={selectedFeatures}
                pricing={pricing}
              />
            )}

            {/* TABLE */}
            {!isLoading && (
              <PricingTable
                selectedFeatures={selectedFeatures}
                currentTier={currentTier}
                currentBilling={currentBilling}
                pricing={pricing}
              />
            )}

            {/* CTA */}
            <button
              onClick={handleStartTrial}
              className="w-full mt-5 bg-green-700 text-white py-2 rounded"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MyDigitalClinicPage;