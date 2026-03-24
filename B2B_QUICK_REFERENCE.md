# B2B Lead Distribution System - Quick Reference

## Files at a Glance

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `src/services/lead-distribution-b2b.service.ts` | 400 | Core distribution engine | ✅ Ready |
| `src/services/provider-analytics.service.ts` | 350 | Metrics & ROI calculations | ✅ Ready |
| `src/utils/lead-quality-score.ts` | 120 | Quality scoring (LOCKED) | ✅ Ready |
| `src/utils/matching-score.ts` | 80 | Therapist ranking | ✅ Ready |
| `src/routes/lead-response.routes.ts` | 250 | Lead response API | ✅ Ready |
| `src/routes/provider-dashboard.routes.ts` | 380 | Dashboard API | ✅ Ready |
| `src/cron/lead-distribution.cron.ts` | 120 | Scheduled jobs | ✅ Ready |
| `prisma/schema.prisma` | Extended | Database models | ✅ Applied |
| `src/config/plans.ts` | Extended | Configuration (LOCKED) | ✅ Ready |
| `src/server.ts` | 1 line | Cron initialization | ✅ Added |
| `src/routes/index.ts` | 2 lines | Route registration | ✅ Added |

**Total**: 1,635+ lines of production code

---

## Quick Start - Integration Steps

### Step 1: Trigger Distribution on Lead Creation
```typescript
// backend/src/services/some-service.ts
import { distributeLead } from '../services/lead-distribution-b2b.service';

export const createLead = async (leadData) => {
  const lead = await prisma.lead.create({
    data: {
      ...leadData,
      channel: 'B2B_MARKETPLACE', // Important flag
    }
  });
  
  // Trigger distribution
  await distributeLead(lead.id);
  return lead;
};
```

### Step 2: Track Conversion on Session Booking
```typescript
// backend/src/services/session-service.ts
export const bookTherapySession = async (leadId, therapistId, paymentId) => {
  const session = await prisma.therapySession.create({
    data: {
      leadId,
      therapistId,
      paymentId,
      status: 'SCHEDULED'
    }
  });
  
  // Mark conversion
  await fetch(`http://localhost:3000/api/v1/leads/${leadId}/convert`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      sessionId: session.id,
      paymentAmount: payment.amountPaid
    })
  });
  
  return session;
};
```

### Step 3: Verify Server Startup
```bash
cd backend
npm start
# Look for logs:
# [CRON] Initializing lead distribution cron jobs...
# [CRON] Weekly reset scheduled: 0 0 * * 0 (Sunday 00:00 UTC)
# [CRON] Dead lead check scheduled: every hour
# [CRON] Lead expiry check scheduled: every 4 hours
```

### Step 4: Test Endpoints
```bash
# Create a test subscription
curl -X POST http://localhost:3000/api/v1/provider/subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier": "SCALE"}'

# Check therapist dashboard
curl http://localhost:3000/api/v1/provider/dashboard/metrics \
  -H "Authorization: Bearer $THERAPIST_TOKEN"

# Create a test lead
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-123",
    "issue": ["anxiety", "stress"],
    "verificationLevel": "complete",
    "channel": "B2B_MARKETPLACE",
    "amountMinor": 50000
  }'

# Mark therapist response
curl -X PUT http://localhost:3000/api/v1/leads/$LEAD_ID/respond \
  -H "Authorization: Bearer $THERAPIST_TOKEN"

# Mark conversion
curl -X PUT http://localhost:3000/api/v1/leads/$LEAD_ID/convert \
  -H "Authorization: Bearer $THERAPIST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-456", "paymentAmount": 50000}'
```

---

## Key APIs

### Lead Distribution
| Method | URL | Purpose |
|--------|-----|---------|
| PUT | `/v1/leads/:id/respond` | Mark therapist response |
| PUT | `/v1/leads/:id/convert` | Mark conversion (paid session) |
| GET | `/v1/leads/:id/assignments` | List all assignments |
| GET | `/v1/leads/:id/status` | Distribution metrics |

### Provider Dashboard
| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/v1/provider/dashboard/metrics` | Full dashboard data |
| GET | `/v1/provider/dashboard/leads` | Paginated assigned leads |
| GET | `/v1/provider/dashboard/weekly-stats` | Trending data |
| GET | `/v1/provider/dashboard/summary` | Card summaries |
| GET | `/v1/provider/dashboard/subscription-plans` | Available plans |
| GET | `/v1/provider/dashboard/performance-breakdown` | Quality tier analysis |

---

## Configuration Reference

### Subscription Plans (LOCKED)
```
STARTER:    3 leads/week,    ₹999/month,   shared (5-10 therapists)
GROWTH:     5 leads/week,    ₹2,499/month, semi-exclusive (max 3 therapists) + 1 bonus
SCALE:      7 leads/week,    ₹4,999/month, exclusive (1 therapist only) + 12h early access
```

### Lead Distribution Timeline
```
Hours 0-12:   SCALE ONLY (exclusive)
Hours 12-36:  SCALE + GROWTH
Hours 12-48:  All tiers (STARTER joins)
Hour  48+:    EXPIRED (no new assignments)
```

### Fair Rotation Algorithm
```
Sort by:
1. leadsUsedThisWeek (ascending) - distribute fairly
2. lastAssignedAt (ascending)    - oldest assignment first

HARD STOP: Never assign if leadsUsedThisWeek >= leadsPerWeek
```

### Cron Schedule
```
Weekly Reset:    Sunday 00:00 UTC  → Reset leadsUsedThisWeek
Dead Lead Check: Every hour        → Find 24h+ no-response
Lead Expiry:     Every 4 hours     → Mark 48h+ as EXPIRED
```

---

## Troubleshooting

### "Lead not distributing"
1. Check lead.channel === 'B2B_MARKETPLACE'
2. Verify `distributeLead(leadId)` is called
3. Check server logs for `[B2B-LED]` messages
4. Verify therapist subscription exists and is active

### "Therapist not receiving lead"
1. Check subscription tier and status='active'
2. Check leadsUsedThisWeek < leadsPerWeek
3. Check verification level meets requirement
4. Look for `[B2B-LED] QUOTA FULL` log messages

### "Conversion not tracking"
1. Verify endpoint called: PUT /v1/leads/:id/convert
2. Check Authorization header has valid therapist token
3. Verify request body has sessionId and paymentAmount
4. Check LeadAssignment.convertedAt is updated in DB

### "ROI calculations wrong"
1. Verify conversion tracking is working (see above)
2. Check PLAN_CONFIG prices: STARTER=99900, GROWTH=249900, SCALE=499900
3. Verify ROI assumptions: 80% completion, 60% commission
4. Customize in `provider-analytics.service.ts` if needed

### "Quota not resetting"
1. Check cron job logs Sunday morning: `[CRON] Weekly reset...`
2. Verify timezone: cron uses UTC
3. Check server was running at reset time
4. Verify weeklyResetDay=0 (Sunday) in config

---

## Performance Notes

- Fair rotation: O(n log n) sort per tier assignment
- Quota check: O(1) lookup
- Cascade schedule: Uses setTimeout (TODO: upgrade to job queue for >1000 leads/day)
- Analytics queries: No indexes yet, add if slow

---

## Error Handling

All errors logged with prefix:
```
[B2B-LED]  - Lead distribution system
[CRON]     - Scheduled jobs
[Analytics] - Dashboard metrics
```

Critical errors (not caught):
- Lead not found
- Therapist not found
- Invalid tier

Logged but continued:
- Quota full (therapist skipped)
- Expertise mismatch (therapist skipped)
- Assignment creation failure (try next therapist)

---

## Testing Checklist

- [ ] Create lead, verify SCALE assignment within 1 second
- [ ] Wait 12 hours (or mock time), verify GROWTH assignment
- [ ] Verify fair rotation assigns different therapists
- [ ] Test quota hard stop (full therapist skipped)
- [ ] Call respond endpoint, verify responseTime calculated
- [ ] Call convert endpoint, verify convertedAt set
- [ ] Check dashboard metrics update
- [ ] Wait for Sunday, verify quota reset
- [ ] Check cron logs all 3 jobs running
- [ ] Load test with 100+ leads (check performance)

---

## Next Tasks (Phase 4-5)

1. **Frontend Dashboard** (~8 hours)
   - React component: `/provider/dashboard`
   - Charts for weekly stats
   - Lead management table
   - Subscription plan selector
   - Razorpay payment integration

2. **Admin Panel** (~4 hours)
   - Publish leads endpoint
   - Manual assignment (admin override)
   - Lead queue management
   - Notifications UI

3. **Production Hardening** (~4 hours)
   - Replace setTimeout with job queue (Bull/RabbitMQ)
   - Add database indexes on key fields
   - Implement caching for analytics
   - Add rate limiting to APIs
   - Set up monitoring/alerting

---

## Questions?

See full documentation:
- `B2B_LEAD_DISTRIBUTION_INTEGRATION_GUIDE.md` - Complete API & setup
- `B2B_LEAD_DISTRIBUTION_COMPLETE_SUMMARY.md` - Architecture & design

Server logs show `[B2B-LED]` and `[CRON]` messages for debugging.
