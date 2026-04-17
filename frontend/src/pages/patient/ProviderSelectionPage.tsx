import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import ProviderMatchingV3 from '../../components/patient/ProviderMatchingV3';
import { patientApi } from '../../api/patient';

interface ProviderMatch {
  id: string;
  name: string;
  displayName?: string;
  providerType: string;
  profileId?: string;
  consultationFee?: number;
  specializations?: string[];
  averageRating?: number;
  score?: number;
  tier?: 'HOT' | 'WARM' | 'COLD';
  matchBand?: 'PLATINUM' | 'HOT' | 'WARM' | 'COLD';
  matchChancePct?: number;
  breakdown?: {
    expertise: number;
    communication: number;
    quality: number;
  };
  providerSubscriptionStatus?: string;
  providerSubscriptionGraceEndDate?: string;
}

interface LocationState {
  fromAssessment?: boolean;
  assessmentResults?: Array<{ type: string; score: number; severity: string }>;
}

const ProviderSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<ProviderMatch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse URL params for availability
  const defaultDay = searchParams.get('day') ? parseInt(searchParams.get('day')!) : 3; // Wednesday
  const defaultStartHour = searchParams.get('hour') ? parseInt(searchParams.get('hour')!) : 14; // 2 PM
  const providerType = searchParams.get('providerType');
  const sourceFunnel = searchParams.get('sourceFunnel');

  const locationState = location.state as LocationState | null;

  const availabilityPrefs = {
    daysOfWeek: [defaultDay],
    timeSlots: [
      {
        startMinute: defaultStartHour * 60,
        endMinute: defaultStartHour * 60 + 30,
      },
    ],
  };

  // Check PHQ/GAD7 completion on mount
  useEffect(() => {
    const checkAssessmentCompletion = async () => {
      try {
        setLoading(true);
        setError(null);

        // If coming from SessionsPage assessment flow, we already know it's complete
        if (locationState?.fromAssessment) {
          setAssessmentComplete(true);
          return;
        }

        // Otherwise, call API to verify both PHQ-9 and GAD-7 are completed
        const response = await patientApi.getPatientAssessmentStatus?.();
        
        if (response?.phq9Complete && response?.gad7Complete) {
          setAssessmentComplete(true);
        } else {
          setError('Please complete both PHQ-9 and GAD-7 assessments first.');
          setTimeout(() => navigate('/patient/sessions'), 2000);
        }
      } catch (err: any) {
        // If API doesn't exist or fails, assume assessment is complete if coming from assessment flow
        if (locationState?.fromAssessment) {
          setAssessmentComplete(true);
        } else {
          setError(err?.message || 'Failed to verify assessment completion');
          setTimeout(() => navigate('/patient/sessions'), 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAssessmentCompletion();
  }, [navigate, locationState?.fromAssessment]);

  const handleMultipleProvidersSelected = async (providers: ProviderMatch[]) => {
    setSelectedProviders(providers);
    setIsSubmitting(true);

    try {
      // Proceed to booking/payment with selected providers
      const providerIds = providers.map((p) => p.id);
      
      navigate('/patient/checkout', {
        state: {
          selectedProviders: providers,
          providerIds,
          availabilityPrefs,
          sourceFunnel: sourceFunnel || 'web_patient_care',
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to proceed with booking');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="h-8 w-8 text-ocean animate-spin" />
        <p className="text-charcoal/60">Verifying your assessment status...</p>
      </div>
    );
  }

  if (error && !assessmentComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-charcoal">{error}</p>
        <p className="text-sm text-charcoal/60">Redirecting...</p>
      </div>
    );
  }

  if (!assessmentComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-charcoal">Assessment not complete</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-calm-sage/5 via-white to-ocean-light/5 py-8">
      <div className="w-full max-w-6xl mx-auto px-4">
        {/* Breadcrumb / Status */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-charcoal">Assessment Complete</h2>
            <p className="text-xs text-charcoal/60">Ready to find your therapist</p>
          </div>
        </div>

        {/* Assessment Results Display */}
        {locationState?.assessmentResults && locationState.assessmentResults.length > 0 && (
          <div className="mb-6 rounded-lg border border-teal-200 bg-teal-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-700">Your Assessment Results</p>
            <div className="flex flex-wrap gap-2">
              {locationState.assessmentResults.map((result) => {
                const severityLevel = result.severity.toLowerCase();
                const severityColors: Record<string, string> = {
                  severe: 'bg-red-100 text-red-700',
                  moderate: 'bg-amber-100 text-amber-700',
                  mild: 'bg-green-100 text-green-700',
                };
                const colorClass = severityColors[severityLevel] || severityColors.mild;

                return (
                  <div
                    key={result.type}
                    className="inline-flex items-center gap-2 rounded-lg border border-white bg-white px-3 py-1.5 shadow-sm"
                  >
                    <span className="text-xs font-bold text-charcoal">{result.type}</span>
                    <span className="text-xs text-charcoal/60">Score {result.score}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${colorClass}`}>
                      {result.severity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Provider Matching Component */}
        <ProviderMatchingV3
          availabilityPrefs={availabilityPrefs}
          providerType={providerType || undefined}
          sourceFunnel={sourceFunnel || 'web_patient_care'}
          onMultipleProvidersSelected={handleMultipleProvidersSelected}
          title="Find Your Perfect Match"
          description="Based on your assessment results, here are providers who align best with your needs and preferences."
          showFilters={true}
          allowMultiSelect={true}
          maxSelections={3}
        />

        {/* Loading state for submission */}
        {isSubmitting && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-ocean animate-spin" />
              <p className="text-charcoal font-medium">Processing your selection...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderSelectionPage;
