# B2B Lead Distribution System - Integration Guide

## Overview

The B2B Lead Distribution System allows MANAS360 to distribute quality-filtered patient leads across a pool of therapists based on their subscription tier. This document covers implementation, integration points, and usage.

## System Architecture

### Core Components

1. **Lead Distribution Engine** (`lead-distribution-b2b.service.ts`)
   - Orchestrates 3-tier cascade distribution
   - Manages fair rotation and quota enforcement
   - Schedules lead cascade between tiers

2. **Lead Quality Scoring** (`lead-quality-score.ts`)
   - Formula: Verification (40%) + Profile Completeness (30%) + Urgency (30%)
   - Categorizes leads into HIGH/MEDIUM/LOW tiers

3. **Therapist Matching** (`matching-score.ts`)
   - Expertise matching (30%)
   - Conversion rate (20%)
   - Rating (15%)
   - Response speed (15%)
   - Language proficiency (20%)

4. **Cron Jobs** (`lead-distribution.cron.ts`)
   - Weekly quota reset (Sunday 00:00 UTC)
   - Dead lead detection (hourly)
   - Lead expiry (every 4 hours)

5. **Provider Analytics** (`provider-analytics.service.ts`)
   - Conversion metrics
   - ROI calculations
   - Performance trending

### Database Models

**ProviderSubscription** (Extended)
- `tier`: STARTER | GROWTH | SCALE
- `leadsUsedThisWeek`: Current week quota usage
- `totalLeadsReceived`: Lifetime lead count
- `weekStartsAt`: Week start date
- `lastAssignedAt`: Last assignment timestamp
- `bonusLeads`: GROWTH plan auto bonus

**LeadAssignment** (New)
- Tracks therapist-lead assignment lifecycle
- Conversion tracking: `respondedAt`, `convertedAt`
- Response time analytics
- Status lifecycle: assigned → responded → converted

**Lead** (Extended)
- `issue[]`: Array of mental health issues
- `verificationLevel`: email | phone | complete
- `quality`: HIGH | MEDIUM | LOW (calculated)
- `exclusivity`: none | semi-exclusive | exclusive
- `expiresAt`: 48-hour hard limit

## Subscription Plans (LOCKED)

```typescript
STARTER (₹999/month)
├─ 3 leads/week
├─ Email verification only
├─ 48h response window
└─ 5-10 therapists per lead (shared pool)

GROWTH (₹2,499/month)
├─ 5 leads/week
├─ +1 automatic bonus lead
├─ Phone verification required
├─ Max 3 therapists per lead
└─ 36h response window

SCALE (₹4,999/month)
├─ 7 leads/week
├─ Complete verification (phone + profile)
├─ 12-hour EXCLUSIVE window (only SCALE therapists)
├─ Then 0-36h GROWTH access
├─ Then 0-48h STARTER access
├─ Maximum 1 therapist per lead
└─ Dedicated support
```

## Distribution Algorithm

### 3-Tier Cascade (LOCKED)

1. **Hours 0-12**: SCALE ONLY
   - 1 therapist, highest quality match
   - 12-hour exclusive window
   - No other tiers can see lead

2. **Hours 12-36**: SCALE + GROWTH
   - GROWTH tiers get access
   - Max 3 GROWTH therapists
   - SCALE therapist still has exclusive access

3. **Hours 12-48**: ALL TIERS
   - STARTER tiers get access
   - 5-10 STARTER therapists
   - All tiers can respond until 48h expiry

### Fair Rotation Algorithm

Within each tier, therapists are sorted by:
1. **Primary**: `leadsUsedThisWeek` (ascending) - fairness
2. **Secondary**: `lastAssignedAt` (ascending) - recency

HARD STOP: Quota never exceeded

```typescript
// Example: STARTER tier with 10 therapists
therapists.sort((a, b) => {
  // Sort by leads used this week (ascending)
  const leadsCompare = a.leadsUsedThisWeek - b.leadsUsedThisWeek;
  if (leadsCompare !== 0) return leadsCompare;
  
  // Then by last assigned time (ascending)
  return a.lastAssignedAt - b.lastAssignedAt;
});
```

## API Endpoints

### Lead Response Endpoints

```bash
# Mark therapist response (when they click "view lead")
PUT /api/v1/leads/:leadId/respond
Authorization: Bearer <token>
Response: { message, assignment, responseTimeMinutes }

# Mark lead conversion (when patient books paid session)
PUT /api/v1/leads/:leadId/convert
Authorization: Bearer <token>
Body: { sessionId, paymentAmount }
Response: { message, assignment, sessionId }

# Get all assignments for a lead (admin)
GET /api/v1/leads/:leadId/assignments
Response: { leadId, totalAssignments, assignments[] }

# Get lead distribution status
GET /api/v1/leads/:leadId/status
Response: { leadId, status, quality, distribution { totalAssignments, respondedCount, responseRate, convertedCount, conversionRate, avgResponseTime } }
```

### Provider Dashboard Endpoints

```bash
# Get comprehensive metrics
GET /api/v1/provider/dashboard/metrics
Response: { providerId, subscriptionTier, active, weeklyQuota, leadsUsedThisWeek, leadsRemaining, totalLeadsReceived, conversion, roi }

# Get assigned leads (paginated)
GET /api/v1/provider/dashboard/leads?page=1&limit=20&status=assigned
Response: { pagination, leads[] }

# Get weekly performance chart data
GET /api/v1/provider/dashboard/weekly-stats?weeks=4
Response: { weeks, data[] { week, date, leadsAssigned, leadsResponded, leadsConverted, responseRate, conversionRate } }

# Get dashboard summary cards
GET /api/v1/provider/dashboard/summary
Response: { subscription, thisWeek, allTime, earnings }

# Get available subscription plans
GET /api/v1/provider/dashboard/subscription-plans
Response: { currentTier, plans[] }

# Get performance breakdown by lead quality
GET /api/v1/provider/dashboard/performance-breakdown
Response: { data[] { tier, assigned, responded, converted, responseRate, conversionRate } }
```

## Integration Points

### 1. Lead Creation Hook

When a new lead is created, trigger distribution:

```typescript
// In your lead creation service:
import { distributeLead } from '../services/lead-distribution-b2b.service';

const lead = await prisma.lead.create({ /* ... */ });

// Trigger B2B distribution if applicable
if (lead.channel === 'B2B_MARKETPLACE') {
  await distributeLead(lead.id);
}
```

### 2. Conversion Tracking Hook

When a patient books a paid session, mark conversion:

```typescript
// In therapy session booking service:
import { prisma } from '../config/db';

const session = await prisma.therapySession.create({
  data: {
    // ... session data
    patientId,
    therapistId,
  },
});

// Mark conversion for associated lead
if (session.leadId) {
  await fetch(`/api/v1/leads/${session.leadId}/convert`, {
    method: 'PUT',
    body: JSON.stringify({
      sessionId: session.id,
      paymentAmount: session.amountPaid,
    }),
  });
}
```

### 3. Cron Job Initialization

Automatically initialized in `server.ts`:

```typescript
import { initLeadDistributionCrons } from './cron/lead-distribution.cron';

// In startServer():
initLeadDistributionCrons(); // Initializes all 3 cron jobs
```

### 4. Analytics Integration

For provider dashboards:

```typescript
import { getProviderMetrics } from '../services/provider-analytics.service';

const metrics = await getProviderMetrics(therapistId);
// Returns: subscription tier, quotas, conversion rate, ROI, earnings
```

## Configuration

### Plan Configuration (`backend/src/config/plans.ts`)

LOCKED values per user specification:

```typescript
PLAN_CONFIG: {
  STARTER: {
    leadsPerWeek: 3,
    monthlyPrice: 99900, // ₹999
    exclusivity: 'shared'
  },
  GROWTH: {
    leadsPerWeek: 5,
    bonusLeads: 1, // Automatic
    monthlyPrice: 249900, // ₹2,499
    exclusivity: 'semi-exclusive'
  },
  SCALE: {
    leadsPerWeek: 7,
    monthlyPrice: 499900, // ₹4,999
    exclusivity: 'exclusive',
    earlyAccessHours: 12
  }
}

LEAD_DISTRIBUTION_CONFIG: {
  leadLifespanHours: 48,
  deadLeadThresholdHours: 24,
  weeklyResetDay: 0, // Sunday
  weeklyResetHour: 0, // 00:00 UTC
}
```

## Conversion Definition

✅ **Conversion occurs when:**
1. Therapist receives lead assignment
2. Patient books their FIRST session
3. Payment is captured (NOT just inquiry)

❌ **NOT conversions (per spec):**
- Lead response/inquiry
- Appointment booking without payment
- Multiple sessions (only first counts)

## Dead Lead Handling

**Dead Lead**: No response after 24 hours

```typescript
// Current behavior: Logged for analytics
// Future enhancements:
// - Automatic TIER escalation (reassign to lower tier)
// - Lead quality adjustment (decrease score)
// - Therapist reliability scoring
```

## ROI Calculations

**Assumptions (customize per business):**
- Average consultation fee: ₹500
- Consultation completion rate: 80%
- Therapist commission: 60%

**Metrics:**
- Monthly revenue = Avg leads × Conversion% × Completion% × Fee × Commission
- Break-even leads = Plan cost / (Fee × Commission)
- ROI = (Monthly revenue - Plan cost) / Plan cost × 100%

## Testing

### Manual Test Flow

1. **Create test subscription:**
   ```bash
   curl -X POST /api/v1/subscriptions \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d { "tier": "SCALE", "planId": "scale-monthly" }
   ```

2. **Create test lead:**
   ```bash
   curl -X POST /api/v1/leads \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d {
       "title": "Anxiety support",
       "issue": ["anxiety", "stress"],
       "verificationLevel": "complete",
       "channel": "B2B_MARKETPLACE"
     }
   ```

3. **Monitor distribution:**
   ```bash
   GET /api/v1/leads/{leadId}/status
   # Should show assignments across tiers
   ```

4. **Test response & conversion:**
   ```bash
   # Therapist responds
   PUT /api/v1/leads/{leadId}/respond
   
   # Mark conversion
   PUT /api/v1/leads/{leadId}/convert
   
   # Check metrics
   GET /api/v1/provider/dashboard/metrics
   ```

## Monitoring & Metrics

### Key Metrics to Track

- **Response Rate**: % of assigned leads therapists respond to
- **Conversion Rate**: % of assignments that convert to paid sessions
- **ROI**: Monthly revenue vs. subscription cost
- **Dead Lead Rate**: % of leads with no response after 24h
- **Tier Penetration**: Leads that reach GROWTH/STARTER tiers
- **Fair Rotation**: Leads per therapist distribution (should be even)

### Alerts to Set Up

1. **Therapist quota exceeded** (hard stop check)
2. **High dead lead rate** (>50%)
3. **Conversion rate trending down**
4. **Cron job failures** (check logs hourly)

## Known Limitations & Future Work

### Current Version (v1)

- ✅ 3-tier cascade with hard quota stops
- ✅ Fair rotation algorithm
- ✅ 48-hour lead lifetime
- ✅ Weekly quota reset
- ✅ Dead lead detection (logging only)
- ✅ Conversion tracking
- ✅ ROI calculations

### Planned Enhancements

- [ ] Job queue for cascade (replace setTimeout)
- [ ] Dead lead automatic reassignment
- [ ] Therapist reliability scoring
- [ ] Lead quality feedback loop
- [ ] A/B testing framework for tiers
- [ ] SMS notifications for hot leads
- [ ] WebSocket real-time assignments
- [ ] Multi-region lead balancing

## Troubleshooting

### Leads not distributing

1. Check cron job in server logs: `[CRON] Lead distribution...`
2. Verify lead channel is `B2B_MARKETPLACE`
3. Check therapist subscription status and tier
4. Verify `distributeLead()` is called after creation

### Quota issues

1. Check weekly reset cron: `[CRON] Weekly reset...`
2. Verify `weekStartsAt` is set correctly
3. Check `leadsUsedThisWeek` counter (should reset Sundays)

### Conversion tracking not working

1. Verify `PUT /api/v1/leads/:leadId/convert` endpoint is called
2. Check `sessionId` param is valid
3. Verify therapist token in Authorization header
4. Check LeadAssignment record exists for therapist+lead

### ROI calculations off

1. Verify plan configuration in `plans.ts`
2. Check commission percentage (default 60%)
3. Verify conversion tracking is accurate (only paid sessions count)

## Support

For issues or questions:
1. Check server logs for `[B2B-LED]` prefix
2. Review `backend/src/config/plans.ts` for spec verification
3. Run analytics queries to debug assignment flow
