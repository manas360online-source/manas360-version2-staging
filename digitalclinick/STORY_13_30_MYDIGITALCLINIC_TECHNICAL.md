# MANAS360 — STORY 13.30: MyDigitalClinic TECHNICAL IMPLEMENTATION
## Flexible Checkbox Pricing Model + Complete Tech Stack

**Story ID**: 13.30  
**Epic**: B2B Clinic Management (MyDigitalClinic)  
**Type**: Technical Architecture + Implementation  
**Scope**: Complete clinic management platform with dynamic feature pricing

---

## PART 1: BUSINESS MODEL (NEW)

### 1.1 Pricing Architecture

**FIXED SELECTIONS** (User must choose):
- **Clinic Tier**: Solo (1-50 patients) | Small (51-200) | Large (200+)
- **Billing Cycle**: Monthly | Quarterly (10% discount auto-applied)

**FLEXIBLE FEATURES** (User selects any combination):
- Patient Database: ₹499-999/month (tier-dependent)
- Session Notes & Templates: ₹249-449/month
- Scheduling & SMS Reminders: ₹199-299/month
- 24-Hour Data Auto Purge: ₹99/month (all tiers)
- Bulk Patient Import (CSV): ₹299-599/month
- Progress Tracking (PHQ-9, GAD-7): ₹199-399/month
- Prescriptions & Homework: ₹249-449/month
- Adherence Tracking: ₹149-299/month
- Multi-Therapist Accounts: ₹199/month (all tiers)
- API Access (Q3 2026): ₹499-799/month
- DPDPA Compliance Pack: ₹149-249/month
- Advanced Analytics (Q2 2026): ₹299-599/month

**QUARTERLY PRICING**:
```
Monthly Total × 3 × 0.9 = Quarterly Price
Example: ₹1,500/month = ₹4,050/quarter
```

**21-DAY FREE TRIAL**:
- All selected features unlocked
- No payment required
- Auto-transition to paid at day 21
- Clear warning email at day 14

---

### 1.2 Database Schema - Pricing

```sql
-- FEATURE CATALOG (Static, Configuration)
CREATE TABLE feature_catalog (
  id UUID PRIMARY KEY,
  feature_name VARCHAR(255) NOT NULL UNIQUE, -- e.g., "Patient Database"
  feature_slug VARCHAR(100) NOT NULL UNIQUE, -- e.g., "patient-database"
  description TEXT,
  category VARCHAR(50), -- "core", "addon", "analytics", "integration"
  availability_date DATE, -- NULL = available now, Date = coming soon
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_slug (feature_slug)
);

-- TIER PRICING (Tier-specific pricing for each feature)
CREATE TABLE tier_pricing (
  id UUID PRIMARY KEY,
  feature_id UUID NOT NULL REFERENCES feature_catalog(id),
  clinic_tier VARCHAR(50) NOT NULL, -- "solo", "small", "large"
  monthly_price DECIMAL(10, 2) NOT NULL,
  quarterly_price DECIMAL(10, 2) NOT NULL, -- Auto-calculated: monthly * 3 * 0.9
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(feature_id, clinic_tier),
  INDEX idx_tier (clinic_tier)
);

-- CLINIC SUBSCRIPTIONS (What features does this clinic have?)
CREATE TABLE clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  selected_features JSONB NOT NULL, -- Array of feature_slugs: ["patient-database", "session-notes", "scheduling"]
  clinic_tier VARCHAR(50) NOT NULL, -- "solo", "small", "large"
  billing_cycle VARCHAR(20) NOT NULL, -- "monthly", "quarterly"
  monthly_total DECIMAL(10, 2) NOT NULL, -- Sum of all monthly prices
  billing_amount DECIMAL(10, 2) NOT NULL, -- Actual charge (monthly or quarterly)
  subscription_status ENUM('trial', 'active', 'paused', 'cancelled') DEFAULT 'trial',
  trial_starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trial_ends_at TIMESTAMP NOT NULL,
  next_billing_date TIMESTAMP,
  next_renewal_amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_clinic_id (clinic_id),
  INDEX idx_status (subscription_status)
);

-- SUBSCRIPTION CHANGES LOG (Track all feature adds/removals)
CREATE TABLE subscription_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  subscription_id UUID NOT NULL REFERENCES clinic_subscriptions(id),
  changed_by VARCHAR(50), -- "system", "user", "admin"
  change_type VARCHAR(50), -- "feature_added", "feature_removed", "tier_upgraded", "billing_changed"
  old_features JSONB,
  new_features JSONB,
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_clinic_id (clinic_id)
);

-- BILLING HISTORY
CREATE TABLE billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  subscription_id UUID NOT NULL REFERENCES clinic_subscriptions(id),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  amount_due DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2),
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  payment_gateway VARCHAR(50), -- "phonpe", "razorpay", "stripe"
  payment_id VARCHAR(255),
  attempted_at TIMESTAMP,
  paid_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_clinic_id (clinic_id),
  INDEX idx_status (payment_status)
);
```

---

## PART 2: SYSTEM ARCHITECTURE

### 2.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────┐
│          MyDigitalClinic (Frontend)                      │
│  - Checkbox feature selector                            │
│  - Real-time pricing calculator                         │
│  - Tier & billing selector                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Plan Customization API                          │
│  POST /api/subscriptions/calculate-price               │
│  POST /api/subscriptions/create-trial                  │
│  PUT /api/subscriptions/update-features                │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼────┐             ┌─────▼─────┐
   │Feature   │             │Pricing    │
   │Service   │             │Service    │
   │(Feature  │             │(Calculate │
   │catalog)  │             │totals)    │
   └────┬────┘             └─────┬─────┘
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │  Data Layer (PostgreSQL)       │
        │  - feature_catalog             │
        │  - tier_pricing                │
        │  - clinic_subscriptions        │
        │  - billing_transactions        │
        └────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼────┐             ┌─────▼─────┐
   │PhonePe   │             │Email/SMS  │
   │Payment   │             │Gateway    │
   │Gateway   │             │(SendGrid, │
   │          │             │MSG91)     │
   └──────────┘             └───────────┘
```

---

### 2.2 Technology Stack

**Backend**:
- Runtime: Node.js 18+ (LTS)
- Framework: Express.js v4.18+
- Database: PostgreSQL 14+ (AWS RDS ap-south-1)
- Cache: Redis 7.0+ (ElastiCache)
- ORM: Prisma v4+
- API: REST (GraphQL optional for future)
- Job Queue: Bull (Redis-backed, for async tasks)

**Pricing Engine**:
- Real-time calculation service
- Feature availability checker
- Discount calculator (quarterly 10% auto-apply)
- Trial expiry service (scheduled job)
- Billing reminder service (day 14, day 0)

**Frontend**:
- Framework: React 18+ / Next.js 14+
- State: Zustand (lightweight, perfect for pricing state)
- Charts: Recharts for analytics
- UI: Tailwind CSS + shadcn/ui
- Validation: Zod (strict pricing validation)

**Payments**:
- Primary: PhonePe API (UPI)
- Fallback: Razorpay (for diversity)
- Retry logic: Failed payments auto-retry 3x

**Compliance**:
- Auth: JWT + refresh tokens
- Encryption: AES-256 (at rest), TLS 1.3 (in transit)
- DPDPA: Data anonymization + 24h purge job
- Audit: All subscription changes logged

---

## PART 3: API ENDPOINTS

### 3.1 Pricing Endpoints

```
# GET FEATURE CATALOG
GET /api/features
Response:
{
  "features": [
    {
      "id": "uuid",
      "name": "Patient Database",
      "slug": "patient-database",
      "category": "core",
      "availableNow": true,
      "pricing": {
        "solo": { "monthly": 499, "quarterly": 1347 },
        "small": { "monthly": 699, "quarterly": 1890 },
        "large": { "monthly": 999, "quarterly": 2703 }
      }
    },
    ...
  ]
}

# CALCULATE CUSTOM PLAN PRICE
POST /api/subscriptions/calculate-price
Body:
{
  "clinic_tier": "small",
  "billing_cycle": "quarterly",
  "selected_features": [
    "patient-database",
    "session-notes",
    "scheduling",
    "progress-tracking"
  ]
}
Response:
{
  "monthly_total": 1597,
  "billing_cycle": "quarterly",
  "billing_amount": 4312, // 1597 * 3 * 0.9
  "discount_applied": 10,
  "breakdown": {
    "patient-database": 699,
    "session-notes": 349,
    "scheduling": 249,
    "progress-tracking": 299
  }
}

# CREATE TRIAL SUBSCRIPTION
POST /api/subscriptions/create-trial
Body:
{
  "clinic_id": "uuid",
  "clinic_tier": "small",
  "billing_cycle": "quarterly",
  "selected_features": [...]
}
Response:
{
  "subscription_id": "uuid",
  "clinic_id": "uuid",
  "trial_starts_at": "2026-03-22T10:30:00Z",
  "trial_ends_at": "2026-04-12T10:30:00Z",
  "trial_days_remaining": 21,
  "status": "trial"
}

# UPDATE SUBSCRIPTION FEATURES (Mid-trial or anytime)
PUT /api/subscriptions/:subscription_id/features
Body:
{
  "selected_features": [
    "patient-database",
    "session-notes",
    "scheduling",
    "progress-tracking",
    "api-access" // NEW
  ]
}
Response:
{
  "updated_subscription": {...},
  "price_change": {
    "old_total": 4312,
    "new_total": 5132,
    "difference": +820,
    "effective_date": "next billing date"
  }
}

# GET CLINIC SUBSCRIPTION
GET /api/subscriptions/clinic/:clinic_id
Response:
{
  "subscription": {
    "id": "uuid",
    "clinic_tier": "small",
    "billing_cycle": "quarterly",
    "selected_features": [...],
    "monthly_total": 1597,
    "billing_amount": 4312,
    "trial_status": {
      "is_trial": true,
      "days_remaining": 8,
      "trial_ends_at": "2026-04-12T10:30:00Z"
    },
    "subscription_status": "trial",
    "next_billing_date": "2026-04-12"
  }
}

# BILLING ENDPOINTS
GET /api/billing/transactions/:clinic_id
GET /api/billing/invoices/:transaction_id
POST /api/billing/retry-payment/:transaction_id
```

---

## PART 4: BACKEND SERVICES

### 4.1 Pricing Service (Core Logic)

```javascript
// services/PricingService.ts

class PricingService {
  
  async getFeatureCatalog() {
    // Return all features with tier-based pricing
  }

  async calculatePrice(params: {
    clinic_tier: string,
    billing_cycle: string,
    selected_features: string[]
  }) {
    // 1. Validate clinic tier (solo/small/large)
    // 2. Validate billing cycle (monthly/quarterly)
    // 3. Get pricing for each selected feature
    // 4. Sum monthly total
    // 5. Apply quarterly discount if applicable
    // 6. Return breakdown
    
    const monthlyTotal = await this.sumFeaturePrices(
      params.clinic_tier,
      params.selected_features
    );
    
    const billingAmount = params.billing_cycle === 'quarterly'
      ? Math.round(monthlyTotal * 3 * 0.9)
      : monthlyTotal;
    
    return {
      monthly_total: monthlyTotal,
      billing_cycle: params.billing_cycle,
      billing_amount: billingAmount,
      discount_applied: params.billing_cycle === 'quarterly' ? 10 : 0,
      breakdown: {...} // Per-feature costs
    };
  }

  async validateFeatureAccess(
    clinic_id: string,
    feature_slug: string
  ): Promise<boolean> {
    // Check if clinic's subscription includes this feature
    // Return true/false
  }

  async applyQuarterlyDiscount(monthlyTotal: number): number {
    return Math.round(monthlyTotal * 3 * 0.9);
  }
}
```

### 4.2 Subscription Service

```javascript
// services/SubscriptionService.ts

class SubscriptionService {
  
  async createTrialSubscription(params: {
    clinic_id: string,
    clinic_tier: string,
    billing_cycle: string,
    selected_features: string[]
  }) {
    // 1. Calculate price via PricingService
    // 2. Create clinic_subscriptions record
    // 3. Set trial_ends_at = now + 21 days
    // 4. Queue trial reminder emails (day 14, day 0)
    // 5. Return subscription details
  }

  async updateFeatures(
    subscription_id: string,
    new_features: string[]
  ) {
    // 1. Validate new features
    // 2. Calculate new price
    // 3. Detect changes (added/removed)
    // 4. Update clinic_subscriptions.selected_features
    // 5. Log change in subscription_change_logs
    // 6. Notify clinic of new price (effective next billing)
    // 7. If mid-trial, no proration (feature immediately available)
  }

  async transitionFromTrialToPaid(subscription_id: string) {
    // 1. Verify trial has ended
    // 2. Change status from "trial" to "active"
    // 3. Create first billing transaction
    // 4. Attempt payment via PhonePe
    // 5. If payment fails, set status to "payment_failed"
    // 6. Queue retry logic (3 attempts, 24h apart)
  }

  async handlePaymentWebhook(
    transaction_id: string,
    payment_status: string
  ) {
    // 1. Validate webhook signature (PhonePe)
    // 2. Update billing_transactions.payment_status
    // 3. If paid: unlock all features, set subscription_status = "active"
    // 4. If failed: queue retry, notify clinic
  }
}
```

### 4.3 Scheduled Jobs (Bull Queue)

```javascript
// jobs/TrialReminderJob.ts
// Runs daily, checks for clinics with trial ending in 14 days, 1 day, 0 days

export const trialReminderJob = async (job: Job) => {
  const clinics = await getTrialsEndingIn([14, 1, 0]); // days
  
  for (const clinic of clinics) {
    if (clinic.trial_ends_at_days === 14) {
      // Email: "14 days left in free trial. Your plan will switch to paid in 2 weeks."
    } else if (clinic.trial_ends_at_days === 1) {
      // Email: "Trial ends tomorrow. Card will be charged ₹X on [date]."
    } else if (clinic.trial_ends_at_days === 0) {
      // Email: "Trial ended today. Attempting payment..."
      await SubscriptionService.transitionFromTrialToPaid(clinic.subscription_id);
    }
  }
};

// jobs/BillingRetryJob.ts
// Runs daily, retries failed payments

export const billingRetryJob = async (job: Job) => {
  const failedTransactions = await getBillingTransactions({
    payment_status: 'failed',
    retry_count: { $lt: 3 } // Less than 3 retries
  });
  
  for (const tx of failedTransactions) {
    await PaymentService.retryPayment(tx.id);
  }
};

// jobs/DataPurgeJob.ts
// Runs every 6 hours, deletes session notes 24h old

export const dataPurgeJob = async (job: Job) => {
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago
  
  await db.clinic_sessions.update(
    { completed_at: { $lt: threshold } },
    { session_notes: null, session_summary: null }
  );
};
```

---

## PART 5: FRONTEND - PRICING COMPONENT

```jsx
// components/PricingCustomizer.tsx

export const PricingCustomizer = () => {
  const [tier, setTier] = useState('solo');
  const [billing, setBilling] = useState('monthly');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [pricing, setPricing] = useState(null);
  
  // Fetch all features
  const { data: features } = useQuery('/api/features');
  
  // Real-time pricing calculation
  useEffect(() => {
    const calculatePrice = async () => {
      const result = await fetch('/api/subscriptions/calculate-price', {
        method: 'POST',
        body: JSON.stringify({
          clinic_tier: tier,
          billing_cycle: billing,
          selected_features: selectedFeatures
        })
      }).then(r => r.json());
      
      setPricing(result);
    };
    
    calculatePrice();
  }, [tier, billing, selectedFeatures]);
  
  const toggleFeature = (slug: string) => {
    setSelectedFeatures(prev => 
      prev.includes(slug)
        ? prev.filter(f => f !== slug)
        : [...prev, slug]
    );
  };
  
  return (
    <div className="grid grid-cols-2 gap-8">
      {/* LEFT: SELECTORS */}
      <div>
        <h3>Select Your Plan</h3>
        
        {/* TIER */}
        <div>
          <h4>Patient Volume (Fixed)</h4>
          {['solo', 'small', 'large'].map(t => (
            <button
              key={t}
              className={tier === t ? 'active' : ''}
              onClick={() => setTier(t)}
            >
              {t}
            </button>
          ))}
        </div>
        
        {/* BILLING */}
        <div>
          <h4>Billing Cycle (Fixed)</h4>
          {['monthly', 'quarterly'].map(b => (
            <button
              key={b}
              className={billing === b ? 'active' : ''}
              onClick={() => setBilling(b)}
            >
              {b}
              {b === 'quarterly' && ' (Save 10%)'}
            </button>
          ))}
        </div>
        
        {/* FEATURES */}
        <div>
          <h4>Features (Select Any)</h4>
          {features?.map(feature => (
            <label key={feature.slug}>
              <input
                type="checkbox"
                checked={selectedFeatures.includes(feature.slug)}
                onChange={() => toggleFeature(feature.slug)}
              />
              {feature.name}
              <span>
                ₹{feature.pricing[tier].monthly}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      {/* RIGHT: PRICING TABLE */}
      <div>
        <h3>Your Plan Pricing</h3>
        
        {/* SUMMARY */}
        <div className="summary">
          <p>Monthly Total: ₹{pricing?.monthly_total}</p>
          <p>Billing: {pricing?.billing_cycle}</p>
          <p>You'll pay: ₹{pricing?.billing_amount}</p>
        </div>
        
        {/* TABLE */}
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>{tier}</th>
            </tr>
          </thead>
          <tbody>
            {selectedFeatures.map(slug => {
              const f = features?.find(x => x.slug === slug);
              return (
                <tr key={slug}>
                  <td>{f.name}</td>
                  <td>₹{f.pricing[tier].monthly}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <h2>₹{pricing?.billing_amount}/{pricing?.billing_cycle === 'monthly' ? 'mo' : 'qtr'}</h2>
        
        <button onClick={startTrial}>Start 21-Day Free Trial</button>
      </div>
    </div>
  );
};
```

---

## PART 6: IMPLEMENTATION PHASES

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up feature_catalog + tier_pricing tables
- [ ] Build PricingService (calculation logic)
- [ ] Build SubscriptionService (CRUD)
- [ ] Frontend pricing customizer (HTML static first)

### Phase 2: Trial & Billing (Weeks 3-4)
- [ ] Trial creation flow
- [ ] PhonePe integration
- [ ] Billing transactions table
- [ ] Trial reminder jobs

### Phase 3: Feature Gating (Weeks 5-6)
- [ ] validateFeatureAccess() middleware
- [ ] Apply feature flags per subscription
- [ ] Block unauthorized feature access
- [ ] Show "Upgrade to unlock" messages

### Phase 4: Polish (Weeks 7+)
- [ ] Advanced analytics (if selected)
- [ ] API documentation
- [ ] Audit logging
- [ ] Data purge job
- [ ] Payment retry logic

---

## PART 7: DPDPA COMPLIANCE

### 7.1 Data Handling

```sql
-- SESSION NOTES PURGE (24h auto-delete)
-- Trigger runs daily for sessions completed > 24h ago

CREATE OR REPLACE FUNCTION purge_old_session_notes()
RETURNS void AS $$
BEGIN
  UPDATE clinic_sessions
  SET session_notes = NULL,
      session_summary = NULL,
      notes_draft_status = 'purged'
  WHERE completed_at < NOW() - INTERVAL '24 hours'
    AND session_notes IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- AUDIT LOGGING
-- Every subscription change logged with timestamp + user

INSERT INTO subscription_change_logs (
  clinic_id, subscription_id, change_type,
  old_features, new_features, created_at
) VALUES (...)
ON EVERY UPDATE TO clinic_subscriptions;

-- ENCRYPTION AT REST
-- All tables with PII use pgcrypto extension

SELECT pgp_sym_encrypt(
  patient_phone,
  'encryption_key'
) FROM clinic_patients;
```

### 7.2 Legal Language

Every subscription page includes:
- ✓ Data owned by therapist/clinic, not MANAS360
- ✓ 24-hour auto-purge of session notes
- ✓ DPDPA 2023 compliant
- ✓ AES-256 encryption
- ✓ No AI training on patient data
- ✓ Therapist responsible for data security

---

## PART 8: SUCCESS METRICS

### 8.1 KPIs

| Metric | Target | Method |
|--------|--------|--------|
| Trial → Paid Conversion | 40% | Track transitions to "active" |
| Feature Adoption | 5+ features/clinic avg | Track selected_features count |
| Churn Rate | <5%/month | Monitor subscription cancellations |
| ARPU (Avg Revenue/User) | ₹2,500-3,500/month | Sum billing_amount across active subs |
| Trial Completion | 80% | Track trial_ends_at vs cancellations |

### 8.2 Monitoring

- Real-time pricing calculation errors (DataDog)
- Failed payment rates (Sentry)
- Trial reminder email delivery (SendGrid)
- Feature access denials (CloudWatch)
- Data purge job success (Bull Admin UI)

---

## PART 9: SECURITY CHECKLIST

- [ ] Rate limit pricing endpoints (100/min per IP)
- [ ] Validate feature slugs against whitelist
- [ ] Encrypt clinic_tier + billing_cycle in transit
- [ ] PhonePe webhook signature validation
- [ ] Audit all subscription changes
- [ ] Encrypt PII at rest (email, phone)
- [ ] JWT + refresh token rotation
- [ ] No session notes in logs
- [ ] Data purge job verification
- [ ] Quarterly security audit

---

## PART 10: DEPLOYMENT

### 10.1 Environment Setup

```bash
# .env
DATABASE_URL=postgres://user:pass@rds.amazonaws.com/mydigitalclinic
REDIS_URL=redis://elasticache.amazonaws.com:6379
PHONPE_API_KEY=xxx
PHONPE_MERCHANT_ID=xxx
JWT_SECRET=xxx
ENCRYPTION_KEY=xxx

# .env.production
NODE_ENV=production
API_RATE_LIMIT=1000/hour
LOG_LEVEL=error
```

### 10.2 Database Migrations

```bash
# npx prisma migrate dev --name "add_pricing_tables"
# npx prisma migrate deploy --production
```

### 10.3 AWS Infrastructure

- RDS PostgreSQL (Multi-AZ, daily backups)
- ElastiCache Redis (Cluster mode enabled)
- CloudWatch for monitoring
- ALB for load balancing
- WAF for DDoS protection

---

## REFERENCE LINKS

- **Frontend Component**: `/mnt/user-data/outputs/MYDIGITALCLINIC_CHECKBOX_MODEL.html`
- **Pricing Model Docs**: `/mnt/user-data/outputs/MYDIGITALCLINIC_COMPLETE_SPEC.md` (create next)
- **Original Clinic Tier**: `/mnt/user-data/outputs/CLINIC_TIER_LIGHTWEIGHT_POC.md`

---

**End of Story 13.30**
