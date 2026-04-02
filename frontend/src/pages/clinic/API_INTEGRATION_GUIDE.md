# MyDigitalClinic Pricing Component - API Integration Guide

## Overview

The MyDigitalClinic component is now fully integrated with a backend API to calculate real-time subscription pricing based on:
- Clinic tier (Solo, Small, Large)
- Billing cycle (Monthly, Quarterly)
- Selected features

## Architecture

```
MyDigitalClinicPage (Main Component)
├── Header
├── ConfigSection
│   └── Feature Selection
├── PricingSummary (API Data)
└── PricingTable (API Data)

API Flow:
UI Changes → useEffect triggers → API Call → State Update → Re-render
```

## API Endpoint

**POST** `/api/subscriptions/calculate-price`

### Request Payload

```json
{
  "clinic_tier": "solo" | "small" | "large",
  "billing_cycle": "monthly" | "quarterly",
  "selected_features": [0, 2, 5] // Array of feature indices
}
```

### Response Payload

```json
{
  "monthly_total": 1500,
  "billing_amount": 1500,
  "discount_percentage": 0,
  "tier_pricing": {
    "solo": 199,
    "small": 249,
    "large": 299
  },
  "breakdown": [
    {
      "feature_id": 0,
      "feature_name": "Patient Database",
      "unit_price": 499
    }
  ]
}
```

## Component State Management

### Main Component (`MyDigitalClinicPage.tsx`)

```typescript
// Selection state
const [currentTier, setCurrentTier] = useState('solo');
const [currentBilling, setCurrentBilling] = useState('monthly');
const [selectedFeatures, setSelectedFeatures] = useState([...]);

// API state
const [pricing, setPricing] = useState<PricingResponse | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
```

### useEffect Hook

The component uses a `useEffect` hook that automatically calls the API whenever any of these dependencies change:

```typescript
useEffect(() => {
  fetchPricing();
}, [currentTier, currentBilling, selectedFeatures]); // Dependencies
```

## API Service (`api.ts`)

### Main Function: `calculateSubscriptionPrice()`

```typescript
const response = await calculateSubscriptionPrice({
  clinic_tier: 'solo',
  billing_cycle: 'monthly',
  selected_features: [0, 2, 5]
});
```

### Mock Function for Development

For local development without a backend server, use `calculateSubscriptionPriceMock()`:

```typescript
// Automatically used when REACT_APP_USE_MOCK_API=true
const response = calculateSubscriptionPriceMock({
  clinic_tier: 'solo',
  billing_cycle: 'monthly',
  selected_features: [0, 2, 5]
});
```

## Environment Configuration

### Development Mode

```
.env.local
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_USE_MOCK_API=true
```

- Uses mock API (no backend required)
- Instant calculations
- Good for UI development

### Development with Real Backend

```
.env.local
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_USE_MOCK_API=false
```

### Production Mode

```
.env.production
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_USE_MOCK_API=false
```

## Error Handling

The component implements comprehensive error handling:

### Error State

```typescript
interface ApiError {
  message: string;      // Human-readable error message
  code?: string;        // Axios error code
  status?: number;      // HTTP status code
}
```

### Error Display

- Red banner at the top of the page
- User-friendly error message
- "Dismiss" button to clear error

### Error Scenarios

1. **Network Error** → "Failed to fetch pricing data"
2. **Server Error (5xx)** → "Server error, please try again"
3. **Client Error (4xx)** → "Invalid request parameters"
4. **Timeout** → "Request timed out after 10 seconds"

## Loading States

- **Loading Indicator**: Animated spinner during API call
- **Button Disabled**: "Start Trial" button disabled while loading
- **Pricing Section**: Shows spinner instead of pricing table

## Features Display

### Real-time Updates

When a user:
1. Selects a tier → API called → pricing updated
2. Changes billing cycle → API called → pricing updated
3. Toggles a feature → API called → pricing updated

### Pricing Table

Dynamically displays:
- Feature names and descriptions
- Prices per tier
- Monthly totals
- Quarterly totals (with discount applied)
- Visual indicators for enabled/disabled features

## Component Props & Data Flow

### ConfigSection

```typescript
interface ConfigSectionProps {
  currentTier: 'solo' | 'small' | 'large';
  onTierChange: (tier) => void;
  currentBilling: 'monthly' | 'quarterly';
  onBillingChange: (billing) => void;
  selectedFeatures: boolean[];
  onFeatureChange: (index) => void;
  onStartTrial: () => void;
  isLoading?: boolean; // From API
}
```

### PricingSummary

```typescript
interface PricingSummaryProps {
  currentTier: 'solo' | 'small' | 'large';
  currentBilling: 'monthly' | 'quarterly';
  selectedFeatures: boolean[];
  pricing?: PricingResponse | null; // From API response
}
```

### PricingTable

```typescript
interface PricingTableProps {
  selectedFeatures: boolean[];
  currentTier: 'solo' | 'small' | 'large';
  currentBilling: 'monthly' | 'quarterly';
  pricing?: PricingResponse | null; // From API response
}
```

## Performance Optimization

### Debouncing

The current implementation debounces API calls implicitly:
- Dependency array in `useEffect` prevents duplicate calls
- Each state change triggers one API call
- Multiple rapid changes still result in single API call if within same render cycle

### To Add Explicit Debouncing

```typescript
// Install: npm install lodash.debounce
import debounce from 'lodash.debounce';

const debouncedFetch = useMemo(
  () => debounce(fetchPricing, 500),
  []
);

useEffect(() => {
  debouncedFetch();
}, [currentTier, currentBilling, selectedFeatures]);
```

## Testing

### Unit Tests

```typescript
// api.ts
test('calculateSubscriptionPrice sends correct payload', async () => {
  const response = await calculateSubscriptionPrice({
    clinic_tier: 'solo',
    billing_cycle: 'monthly',
    selected_features: [0, 2]
  });
  expect(response.monthly_total).toBe(748);
});
```

### Integration Tests

```typescript
// MyDigitalClinicPage.tsx
test('pricing updates when tier changes', async () => {
  const { getByText } = render(<MyDigitalClinicPage />);
  const smallButton = getByText('Small');
  fireEvent.click(smallButton);
  
  await waitFor(() => {
    expect(getByText(/₹.*\//)).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Problem: API returns 500 error

**Solution**:
1. Check backend logs
2. Verify payload structure matches API spec
3. Check database connection on backend

### Problem: Pricing doesn't update

**Solution**:
1. Check browser console for errors
2. Verify `REACT_APP_API_URL` is correct
3. Check network tab in DevTools
4. Ensure feature indices are valid (0-11)

### Problem: Mock API not working

**Solution**:
1. Set `REACT_APP_USE_MOCK_API=true` in `.env.local`
2. Restart dev server after env change
3. Check browser console logs

## Backend Implementation Requirements

Your backend API must:

1. **Accept POST request** with clinic_tier, billing_cycle, selected_features
2. **Validate inputs**:
   - clinic_tier must be in ['solo', 'small', 'large']
   - billing_cycle must be in ['monthly', 'quarterly']
   - selected_features must be array of valid indices
3. **Calculate pricing**:
   - Get feature prices by tier
   - Sum selected feature prices
   - Apply discounts (10% for quarterly)
   - Include breakdown in response
4. **Return proper HTTP status**:
   - 200 for success
   - 400 for invalid input
   - 500 for server errors
5. **CORS headers** must allow requests from frontend origin

### Example Backend (Node.js/Express)

```typescript
app.post('/api/subscriptions/calculate-price', (req, res) => {
  const { clinic_tier, billing_cycle, selected_features } = req.body;
  
  // Validation
  if (!['solo', 'small', 'large'].includes(clinic_tier)) {
    return res.status(400).json({ message: 'Invalid tier' });
  }
  
  // Calculate pricing
  const featurePrices = FEATURE_DATABASE[clinic_tier];
  let total = 0;
  selected_features.forEach(idx => {
    total += featurePrices[idx];
  });
  
  // Apply discount
  const discount = billing_cycle === 'quarterly' ? 0.9 : 1;
  const billingAmount = Math.round(total * (billing_cycle === 'quarterly' ? 3 : 1) * discount);
  
  res.json({
    monthly_total: total,
    billing_amount: billingAmount,
    discount_percentage: billing_cycle === 'quarterly' ? 10 : 0,
    tier_pricing: { solo: X, small: Y, large: Z },
    breakdown: [...]
  });
});
```

## Best Practices

1. **Always use TypeScript** for API responses
2. **Validate API responses** before using
3. **Handle errors gracefully** with user-friendly messages
4. **Show loading states** for better UX
5. **Cache results** if refetching same data
6. **Log API calls** in development for debugging
7. **Set appropriate timeouts** for API calls
8. **Use environment variables** for API URLs

## Future Enhancements

- [ ] Request debouncing to reduce API calls
- [ ] Response caching to avoid duplicate calls
- [ ] Optimistic updates for instant feedback
- [ ] Analytics tracking for feature selection
- [ ] A/B testing different pricing models
- [ ] Advanced filtering by healthcare provider type
- [ ] Team/enterprise plan options
- [ ] Discount codes and promotional pricing
