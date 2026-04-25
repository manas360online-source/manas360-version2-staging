# Smart Match Appointment Booking - Frontend Implementation Guide

## Status: Backend ✅ | Frontend (In Progress - 60%)

This guide shows how to implement the Smart Match booking flow in your React frontend.

---

## 1. Component Architecture

### Current State vs Smart Match Flow

**OLD FLOW (SessionsPage):**
```
[Book Session] → SlideOverBookingDrawer (select provider + time + payment)
```

**NEW FLOW (Smart Match):**
```
[Book Session] 
  ↓
SmartMatchFlow (new full-screen component)
  ├─ TimePickerStep (select days/times)
  ├─ ProviderSelectionStep (pick 1-3 providers)
  ├─ PendingRequestStep (wait for acceptance)
  └─ PaymentLockInStep (pay when provider accepts)
```

---

## 2. New Components to Build

### A. TimePickerStep Component
**Purpose:** Patient selects preferred days and times
**Input:** None
**Output:** `availabilityPrefs: { daysOfWeek: number[], timeSlots: Array<{startMinute, endMinute}> }`

**Example UI:**
```
Days: [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]
Times: [Morning 09:00-12:00] [Afternoon 12:00-17:00] [Evening 18:00-21:00]
[Next] button
```

**Pseudocode:**
```typescript
const [selectedDays, setSelectedDays] = useState<number[]>([]);
const [selectedTimes, setSelectedTimes] = useState<string[]>([]); // 'morning' | 'afternoon' | 'evening'

const timeSlotMap = {
  morning: { startMinute: 9 * 60, endMinute: 12 * 60 },
  afternoon: { startMinute: 12 * 60, endMinute: 17 * 60 },
  evening: { startMinute: 18 * 60, endMinute: 21 * 60 },
};

const handleNext = () => {
  const availabilityPrefs = {
    daysOfWeek: selectedDays,
    timeSlots: selectedTimes.map(time => timeSlotMap[time]),
  };
  // Move to next step
};
```

### B. ProviderSelectionStep Component
**Purpose:** Display matching providers, allow selecting 1-3
**Input:** `availabilityPrefs`
**Output:** `selectedProviderIds: string[]`

**Fetches:** `patientApi.getAvailableProvidersForSmartMatch(availabilityPrefs)`

**Response:** 
```json
{
  "count": 8,
  "providers": [ 
    {
      "id": "provider-id",
      "name": "Dr. Priya Sharma",
      "displayName": "Priya",
      "providerType": "THERAPIST",
      "profileId": "profile-id",
      "consultationFee": 69900,
      "specializations": ["Depression", "Anxiety"],
      "averageRating": 4.9
    }
    // ... up to 10 providers
  ]
}
```

**Example UI:**
```
Matching Providers (8 available):
─────────────────────────────
☐ Dr. Priya Sharma (Therapist) 4.9 ⭐ ₹699
  Specialties: Depression, Anxiety
  
☐ Dr. Aksel Kumar (Psychologist) 4.8 ⭐ ₹999
  Specialties: Behavioral, OCD
  
...

Note: You can select up to 3 providers
[Send Request to 2 Providers] button
```

**Pseudocode:**
```typescript
const [providers, setProviders] = useState([]);
const [selectedIds, setSelectedIds] = useState<string[]>([]);

useEffect(() => {
  patientApi.getAvailableProvidersForSmartMatch(availabilityPrefs)
    .then(data => setProviders(data.providers));
}, [availabilityPrefs]);

const handleToggle = (providerId: string) => {
  if (selectedIds.includes(providerId)) {
    setSelectedIds(selectedIds.filter(id => id !== providerId));
  } else if (selectedIds.length < 3) {
    setSelectedIds([...selectedIds, providerId]);
  }
};

const handleSubmit = async () => {
  const result = await patientApi.createAppointmentRequest({
    availabilityPrefs,
    providerIds: selectedIds,
  });
  // Move to pending step
};
```

### C. PendingRequestStep Component
**Purpose:** Show "waiting for provider acceptance" message
**Input:** `appointmentRequestId`
**Output:** (Wait for provider acceptance via polling)

**Example UI:**
```
🟡 Request Pending

Your appointment request has been sent to 3 providers:
• Dr. Priya Sharma (Therapist)
• Dr. Kumar (Psychologist) 
• Dr. Verma (Psychiatrist)

We'll notify you as soon as one accepts your request.

Expires in: 23 hours 45 minutes

[Cancel Request] button
```

**Polling Logic:**
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const result = await patientApi.getPaymentPendingRequest();
    if (result.hasPaymentPending) {
      // Provider accepted! Move to payment step
      setStep('payment');
    }
  }, 5000); // Poll every 5 seconds

  return () => clearInterval(interval);
}, [appointmentRequestId]);
```

### D. PaymentLockInStep Component
**Purpose:** Show "Action Required: Confirm & Pay" with 6-hour timer
**Input:** `paymentPendingRequest`
**Output:** (Complete payment, create session)

**Fetches:** `patientApi.getPaymentPendingRequest()`

**Response:**
```json
{
  "hasPaymentPending": true,
  "request": {
    "id": "appointment-id",
    "providerId": "provider-id",
    "providerName": "Dr. Priya Sharma",
    "scheduledAt": "2025-03-15T10:00:00Z",
    "paymentDeadlineAt": "2025-03-15T04:00:00Z",
    "amountMinor": 69900,
    "timeRemaining": 3600000  // ms
  }
}
```

**Example UI:**
```
🟠 Action Required: Confirm & Pay

Great news! Dr. Priya Sharma accepted your request.

Session Details:
• Date & Time: Saturday, March 15, 2025 at 10:00 AM
• Duration: 50 minutes
• Therapist: Dr. Priya Sharma (Therapist) ⭐4.9
• Fee: ₹699

⏱️  Payment Due In: 5 hours 59 minutes

[Pay ₹699 Now to Confirm] button
```

**Pseudocode:**
```typescript
const [timeRemaining, setTimeRemaining] = useState(0);

useEffect(() => {
  const request = await patientApi.getPaymentPendingRequest();
  setTimeRemaining(request.request.timeRemaining);

  const interval = setInterval(() => {
    setTimeRemaining(t => t - 1000);
    if (t <= 0) {
      // Payment window expired
      showError('Payment deadline has passed');
      closeFlow();
    }
  }, 1000);

  return () => clearInterval(interval);
}, []);

const handlePayment = async () => {
  // Trigger Razorpay payment (existing flow)
  const razorpayWindow = new RazorpayWindow({
    order_id: paymentRequest.id,
    amount: paymentRequest.amountMinor,
    // ... other razorpay config
    handler: onPaymentSuccess,
  });
  razorpayWindow.open();
};
```

---

## 3. Main SmartMatchFlow Component

```typescript
// File: frontend/src/components/patient/SmartMatchFlow.tsx

import React, { useState } from 'react';
import { X } from 'lucide-react';
import TimePickerStep from './steps/TimePickerStep';
import ProviderSelectionStep from './steps/ProviderSelectionStep';
import PendingRequestStep from './steps/PendingRequestStep';
import PaymentLockInStep from './steps/PaymentLockInStep';

interface SmartMatchFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type FlowStep = 'time-picker' | 'provider-selection' | 'pending' | 'payment';

export const SmartMatchFlow: React.FC<SmartMatchFlowProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<FlowStep>('time-picker');
  const [availabilityPrefs, setAvailabilityPrefs] = useState<any>(null);
  const [appointmentRequestId, setAppointmentRequestId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Book a Session</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {step === 'time-picker' && (
            <TimePickerStep
              onNext={(prefs) => {
                setAvailabilityPrefs(prefs);
                setStep('provider-selection');
              }}
              onCancel={onClose}
            />
          )}

          {step === 'provider-selection' && (
            <ProviderSelectionStep
              availabilityPrefs={availabilityPrefs}
              onSuccess={(appointmentId) => {
                setAppointmentRequestId(appointmentId);
                setStep('pending');
              }}
              onBack={() => setStep('time-picker')}
              onCancel={onClose}
            />
          )}

          {step === 'pending' && (
            <PendingRequestStep
              appointmentRequestId={appointmentRequestId!}
              onAccepted={() => setStep('payment')}
              onCancel={onClose}
            />
          )}

          {step === 'payment' && (
            <PaymentLockInStep
              appointmentRequestId={appointmentRequestId!}
              onSuccess={() => {
                onSuccess();
                onClose();
              }}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartMatchFlow;
```

---

## 4. Dashboard Integration

### Update SessionsPage.tsx

**Before (current):**
```typescript
export const openBookingDrawer = async (provider?: ProviderCardData, context?: any) => {
  // Opens slider for single provider
};
```

**After (Smart Match):**
```typescript
const [isSmartMatchOpen, setIsSmartMatchOpen] = useState(false);

// Keep old "Book with Priya" button (Flow 1)
<button onClick={() => openBookingDrawer(primaryProvider)}>
  Book a Session with {primaryTherapist.name}
</button>

// Add new "Book a Session" button (Smart Match - Flow 2)
<button onClick={() => setIsSmartMatchOpen(true)}>
  Book a Session
</button>

// Add component
<SmartMatchFlow
  isOpen={isSmartMatchOpen}
  onClose={() => setIsSmartMatchOpen(false)}
  onSuccess={() => {
    // Refresh dashboard and show success message
    refetchDashboard();
    toast.success('Session scheduled! Payment confirmation pending.');
  }}
/>
```

### Dashboard Widget States

**1. No Upcoming Sessions (INITIAL)**
```
No Upcoming Sessions
[Book a Session] button
```

**2. Request Pending**
```
🟡 Booking in Progress
Request sent to 3 providers
Expires in 23 hours
[View Details] [Cancel]
```

**3. Payment Action Required**
```
🟠 Action Required
Dr. Priya Sharma accepted your request
Session: Sat, Mar 15 @ 10:00 AM
Fee: ₹699 | Due in: 5 hrs 59 min
[Pay Now] [Decline]
```

**4. Confirmed Upcoming**
```
✅ Upcoming Session
Dr. Priya Sharma (Therapist) ⭐4.9
Saturday, March 15 @ 10:00 AM
[Join Video] [Details] [Reschedule]
```

---

## 5. API Integration Checklist

- ✅ `patientApi.getAvailableProvidersForSmartMatch()` - ADDED
- ✅ `patientApi.createAppointmentRequest()` - ADDED
- ✅ `patientApi.getPendingAppointmentRequests()` - ADDED
- ✅ `patientApi.getPaymentPendingRequest()` - ADDED
- ⏳ Backend endpoints for Smart Match - READY
- ⏳ Provider acceptance/rejection webhooks - MOCK FOR NOW
- ⏳ Real-time notifications (WebSocket) - OPTIONAL

---

## 6. Implementation Priority

### Phase 1 (Essential) - CURRENT
- [ ] Build `TimePickerStep` component
- [ ] Build `ProviderSelectionStep` component
- [ ] Build `SmartMatchFlow` wrapper
- [ ] Integrate into `SessionsPage` main button

### Phase 2 (Complete Experience)
- [ ] Build `PendingRequestStep` with polling
- [ ] Build `PaymentLockInStep` with timer
- [ ] Add dashboard state management
- [ ] Integrate with Razorpay post-acceptance

### Phase 3 (Polish)
- [ ] Add success/error notifications
- [ ] Implement provider side (accept/reject UI)
- [ ] Add real-time WebSocket notifications
- [ ] Auto-cleanup of expired requests

---

## 7. State Management Pattern

**Option A: Local State (Current Implementation)**
```typescript
const [step, setStep] = useState('time-picker');
const [availabilityPrefs, setAvailabilityPrefs] = useState(null);
```

**Option B: Context (Recommended for Complex Flows)**
```typescript
type SmartMatchContextType = {
  step: FlowStep;
  setStep: (step: FlowStep) => void;
  availabilityPrefs: AvailabilityPrefs;
  appointmentRequestId: string | null;
};

const SmartMatchContext = ReactCreateContext<SmartMatchContextType | null>(null);
```

---

## 8. Testing Scenarios

**Scenario 1: Happy Path**
1. Select Mon/Wed evenings
2. System shows 8 matching providers
3. Select 2 providers
4. Request sent, shows pending
5. (Mock) One provider accepts
6. Payment action required appears
7. Pay ₹699
8. Session confirmed

**Scenario 2: All Providers Reject**
1. Request pending
2. All 3 providers reject
3. Show "No providers available" message
4. Option to modify availability and retry

**Scenario 3: Payment Deadline Expires**
1. Provider accepts, payment required
2. User doesn't pay for 6 hours
3. Auto-cancelled modal appears
4. Offer to start new booking

---

## 9. Known Limitations & Future Work

- [ ] Provider availability currently JSON field (consider dedicated availability table)
- [ ] No notification system yet (WIP)
- [ ] 6-hour auto-cancel is client-side only (should be server-side job)
- [ ] No conflict detection when multiple brokers book same slot
- [ ] Payment gateway retry logic needed

---

## Files to Create/Modify

```
frontend/src/
├── components/patient/
│   ├── SmartMatchFlow.tsx (NEW)
│   └── steps/ (NEW DIRECTORY)
│       ├── TimePickerStep.tsx
│       ├── ProviderSelectionStep.tsx
│       ├── PendingRequestStep.tsx
│       └── PaymentLockInStep.tsx
├── pages/patient/
│   └── SessionsPage.tsx (MODIFY - add SmartMatchFlow integration)
├── api/
│   └── patient.ts (MODIFY - already done ✅)
└── styles/
    └── (tailwind config - already sufficient)
```

---

## Questions to Clarify

1. **Design Preference**: Modal vs Full-page overlay?
2. **Availability Granularity**: 30-min slots or just day + time period?
3. **Auto-accept Logic**: Should system auto-assign if provider slots are available?
4. **Fallback Handling**: If all providers decline, auto-retry or manual+?
5. **Notifications**: Push/SMS/Email when provider accepts?

---

**Backend Status**: ✅ Complete (schema, services, controllers, routes)
**Frontend Status**: 🔄 In Progress (API methods done, components ready for build)

Ready to start building the components?
