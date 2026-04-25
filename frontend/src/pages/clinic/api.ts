import axios, { AxiosError } from 'axios';
import { API_BASE } from '../../lib/runtimeEnv';
import { getAuthHeaders } from '../../utils/authToken';

const API_BASE_URL = `${API_BASE}/v1/mdc`;

export interface CalculatePricePayload {
  clinicTier: 'solo' | 'small' | 'large';
  billingCycle: 'monthly' | 'quarterly';
  selectedFeatures: string[]; // ✅ feature slugs
}

export interface PricingResponse {
  monthlyTotal: number;
  billingAmount: number;
  discountApplied: number;
  breakdown: Record<string, number>;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface PricingResult {
  pricing: PricingResponse;
  source: 'api' | 'fallback';
}

/**
 * API CALL
 */
export const calculateSubscriptionPrice = async (
  payload: CalculatePricePayload
): Promise<PricingResponse> => {
  try {
    const authHeaders = getAuthHeaders();
    const response = await axios.post<PricingResponse>(
      `${API_BASE_URL}/calculate-pricing`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;

    const errorMessage =
      axiosError.response?.data?.message ||
      axiosError.message ||
      'Failed to calculate pricing';

    throw {
      message: errorMessage,
      code: axiosError.code,
      status: axiosError.response?.status,
    } as ApiError;
  }
};

export interface RegisterClinicInput {
  name: string;
  phone: string;
  email: string;
  address?: string;
  ownerName: string;
  license?: string;
  tier: 'solo' | 'small' | 'large';
  billingCycle: 'monthly' | 'quarterly';
  selectedFeatures: string[];
}

export const registerClinic = async (
  payload: RegisterClinicInput
): Promise<any> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/register`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw {
      message: axiosError.response?.data?.message || 'Registration failed',
      status: axiosError.response?.status,
    } as ApiError;
  }
};

/**
 * SAFE WRAPPER (API + FALLBACK)
 */
export const calculateSubscriptionPriceSafe = async (
  payload: CalculatePricePayload
): Promise<PricingResult> => {
  try {
    const pricing = await calculateSubscriptionPrice(payload);
    return { pricing, source: 'api' };
  } catch (error) {
    const apiError = error as ApiError;

    const isMissingRoute =
      apiError.status === 404 ||
      /route not found/i.test(apiError.message || '');

    if (isMissingRoute) {
      return {
        pricing: calculateSubscriptionPriceMock(payload),
        source: 'fallback',
      };
    }

    throw apiError;
  }
};

/**
 * FEATURE SLUG → INDEX MAP (for mock only)
 */
const FEATURE_INDEX_MAP: Record<string, number> = {
  'patient-database': 0,
  'session-notes': 1,
  'scheduling': 2,
  'auto-purge': 3,
  'bulk-import': 4,
  'progress-tracking': 5,
  'prescriptions': 6,
  'adherence': 7,
  'multi-therapist': 8,
  'api-access': 9,
  'compliance-pack': 10,
  'analytics': 11,
};

/**
 * MOCK (DEV ONLY)
 */
export const calculateSubscriptionPriceMock = (
  payload: CalculatePricePayload
): PricingResponse => {
  const FEATURE_PRICES = {
    solo: [499, 249, 199, 99, 299, 199, 249, 149, 199, 499, 149, 299],
    small: [699, 349, 249, 99, 399, 299, 349, 199, 199, 599, 199, 399],
    large: [999, 449, 299, 99, 599, 399, 449, 299, 199, 799, 249, 599],
  };

  const tierPrices = FEATURE_PRICES[payload.clinicTier];

  let monthlyTotal = 0;

  const breakdown = payload.selectedFeatures.map((slug) => {
    const idx = FEATURE_INDEX_MAP[slug];
    const price = tierPrices[idx] || 0;

    monthlyTotal += price;

    return {
      feature_slug: slug,
      unit_price: price,
    };
  });

  let billingAmount = monthlyTotal;
  let discountApplied = 0;

  if (payload.billingCycle === 'quarterly') {
    discountApplied = 10;
    billingAmount = Math.round(monthlyTotal * 3 * 0.9);
  }

  return {
    monthlyTotal,
    billingAmount,
    discountApplied,
    breakdown: breakdown.reduce((acc, curr) => ({ ...acc, [curr.feature_slug]: curr.unit_price }), {}),
  } as any;
};