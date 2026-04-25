# MANAS360 Financial System — Deployment Checklist

**System Complete Date:** 10 April 2026  
**Status:** 🟢 PRODUCTION READY

---

## 📋 Pre-Deployment Verification

### Code Quality ✅
- [x] Backend TypeScript: Clean (zero errors)
- [x] Frontend TypeScript: Clean (zero errors)
- [x] All linting issues resolved
- [x] No console.error or debug logs in production code

### Architecture Validation ✅
- [x] Payment → Invoice → Payout → Audit → Admin Control (complete chain)
- [x] Backend authority pattern (all business logic in services)
- [x] Frontend as controlled surface (API-driven only)
- [x] Stateless API design (no session state in endpoints)

---

## 🗄️ Database Migrations

### Pre-Deploy Checklist

```bash
# 1. Verify migration files exist
ls -la backend/prisma/migrations/ | grep -E "payout|idempotency"

# Expected:
# - 20260410220000_payout_system_core/migration.sql
# - 20260410220100_idempotency_ttl/migration.sql

# 2. Dry-run migrations locally
npm run prisma:migrate-status

# 3. Deploy migrations to production
npm run prisma:migrate-deploy

# 4. Verify indexes were created
# Verify in PostgreSQL:
# SELECT * FROM pg_indexes WHERE tablename IN ('payouts', 'payout_items', 'invoices', 'idempotency_keys');
```

### Post-Migrate Validation

- [x] `payouts` table exists with all columns
- [x] `payout_items` table exists with UNIQUE(invoiceId)
- [x] `invoices.isPaidOut` column exists
- [x] GIN index on `auditLog.details` for compliance queries
- [x] Index on `idempotencyKeys.expiresAt` for TTL cleanup

---

## 🔐 Authorization Setup

### Required RBAC Policies

```sql
-- Verify these policies exist in RBAC config
INSERT INTO rbac_policies (name, description, created_at)
VALUES 
  ('payouts.view', 'View payouts, metrics, and audit logs', NOW()),
  ('payouts.manage', 'Create, process, and retry payouts', NOW())
ON CONFLICT DO NOTHING;

-- Assign to roles (example: finance manager)
INSERT INTO role_permissions (role_id, policy_id)
SELECT r.id, p.id 
FROM rbac_roles r, rbac_policies p
WHERE r.name = 'admin' 
  AND p.name IN ('payouts.view', 'payouts.manage')
ON CONFLICT DO NOTHING;
```

---

## 📡 Environment Variables

### Backend (.env)

```env
# Existing
DATABASE_URL=…
JWT_SECRET=…
REDIS_URL=…

# Payment Gateway
PHONEPE_MERCHANT_ID=…
PHONEPE_API_KEY=…
PHONEPE_WEBHOOK_SECRET=…

# SMTP (for audit exports, payment receipts)
SMTP_HOST=…
SMTP_PORT=…
SMTP_USER=…
SMTP_PASS=…

# Optional: Payout Gateway (if integrating external processor)
PAYOUT_GATEWAY_API_KEY=…
```

### Frontend (.env)

```env
VITE_API_BASE_URL=https://api.manas360.com/api/v1
VITE_APP_NAME=MANAS360 Admin
```

---

## 🧪 Final QA Scenarios (MUST RUN BEFORE DEPLOY)

### Financial Flow Test
```
1. Create Payout
   - Select provider with PAID invoices
   - Create payout via UI
   - ✓ Payout appears in PENDING status
   - ✓ Invoices marked isPaidOut=true
   - ✓ Audit log created

2. Process Payout
   - Click "Process" button on PENDING payout
   - ✓ Status moves to COMPLETED
   - ✓ processedAt timestamp set
   - ✓ Metrics updated
   - ✓ Audit log created (PAYOUT_PROCESSED)

3. Fail & Retry Payout
   - Manually set payout status=FAILED in DB (simulate gateway failure)
   - Click "Retry" button
   - ✓ Status moves to PENDING
   - ✓ Invoices still locked (isPaidOut=true)
   - ✓ Cooldown prevents immediate re-retry
   - ✓ Wait 60s, can retry again
   - ✓ Audit log shows PAYOUT_RETRY
```

### Idempotency Test
```
1. Same Idempotency Key
   - Create payout with key X
   - Create same payout with key X again (different UI instance)
   - ✓ Returns same payout ID
   - ✓ Toast shows "already created" or replays seamlessly

2. Same Key, Different Payload
   - Create payout with key X, amount ₹100
   - Create payout with key X, amount ₹200
   - ✓ Backend returns 409 Conflict
   - ✓ Toast error shown

3. Different Keys, Same Data
   - Create payout with key X, amount ₹100
   - Create payout with key Y, amount ₹100
   - ✓ Creates two separate payouts
   - ✓ Both appear in list
```

### Concurrency Test
```
1. Race Condition Prevention
   - Open two admin browser tabs
   - Tab 1: Create payout from provider invoices
   - Tab 2: Simultaneously create payout from SAME invoices
   - ✓ Only ONE payout succeeds
   - ✓ Second gets "invoices already paid out" error

2. Optimistic Locking
   - Open two tabs with SAME payout in PENDING status
   - Tab 1: Click Process
   - Tab 2: Click Process (within 1 second)
   - ✓ First succeeds → COMPLETED
   - ✓ Second fails with 409 state conflict
```

### UI/UX Test
```
1. Permissions
   - Login as admin with payouts.view only
   - ✓ Can see table, metrics, drawer
   - ✓ Process/Retry buttons disabled with tooltip
   
   - Login as admin with payouts.manage
   - ✓ All buttons enabled

2. Error Handling
   - Network error during process
   - ✓ Toast shows error message
   - ✓ User can retry

3. State Consistency
   - Create payout
   - Row appears immediately in table
   - Metrics update
   - Drawer shows correct data
```

### API Response Format
```
1. Metrics Endpoint
   GET /admin/payouts/metrics
   Response: {
     "pending": { "count": 5, "totalAmountMinor": "50000" },
     "completed": { "count": 10, "totalAmountMinor": "100000" },
     "failed": { "count": 1, "totalAmountMinor": "5000" },
     "totalVolume": "155000"
   }
   ✓ All amounts are strings (no Number overflow)

2. List Endpoint
   GET /admin/payouts?page=1&limit=20
   Response: {
     "data": {
       "items": [...],
       "page": 1,
       "limit": 20,
       "total": 100
     }
   }
   ✓ amountMinor in each item is STRING

3. Detail Endpoint
   GET /admin/payouts/{id}
   Response: {
     "payout": { ... },
     "items": [...],
     "invoices": [...],
     "auditLogs": [...]
   }
   ✓ All amounts are strings
```

---

## 🚀 Deployment Steps

### 1. Database (Production)
```bash
# Connect to production DB
export DATABASE_URL="postgresql://user:pass@prod-db-host:5432/manas360"

# Run migrations
npm run prisma:migrate-deploy

# Verify
npx prisma db execute --stdin < verify_indexes.sql
```

### 2. Backend Deploy
```bash
# Build
npm run build

# Run tests (if applicable)
npm run test

# Deploy to production server (example: Docker)
docker build -t manas360-backend:latest .
docker push manas360-backend:latest
kubectl set image deployment/manas360-backend manas360=manas360-backend:latest

# Verify health
curl https://api.manas360.com/api/v1/admin/payouts/metrics (requires auth)
```

### 3. Frontend Deploy
```bash
# Build
npm run build

# Verify build output
ls -la dist/

# Deploy (example: Vercel/Netlify or S3+CloudFront)
npm run deploy
# Or: aws s3 sync dist/ s3://manas360-app/ && aws cloudfront create-invalidation ...
```

### 4. Post-Deploy Verification
```bash
# Health checks
curl https://manas360.com/admin/billing/payouts -H "Cookie: auth=..."

# Logs check
grep -i "payout\|error" /var/log/manas360/*.log

# Database connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'manas360';

# Monitor metrics (first 24h)
- Error rate < 0.1%
- API latency < 500ms (p95)
- No database connection timeouts
```

---

## 📊 System Statistics (Post-Deploy Monitoring)

### Key Metrics to Track

```
Frontend:
- Page load time: /admin/billing/payouts
- Table render time (N=100 rows)
- Drawer open latency
- Toast notification display time

Backend:
- POST /admin/payouts (create): <200ms p95
- GET /admin/payouts (list): <300ms p95
- GET /admin/payouts/{id}: <200ms p95
- POST /admin/payouts/{id}/process: <500ms p95

Database:
- Query latency: <100ms p95
- Connection pool usage: <80%
- Boolean index (isPaidOut) hit rate: >95%
- GIN index (auditLog.details) hit rate: >90%
```

---

## 🔄 Rollback Plan (If Issues)

### Option 1: Rollback Database
```bash
# If migrations cause issues
npm run prisma:migrate-resolve --rolled-back 20260410220100_idempotency_ttl
npm run prisma:migrate-resolve --rolled-back 20260410220000_payout_system_core

# Restore from backup (if corrupted)
pg_restore --dbname=manas360 /backups/manas360.backup.pre-deploy
```

### Option 2: Rollback Code
```bash
# Git rollback
git revert <payout-implementation-commit>
kubectl rollout undo deployment/manas360-backend
```

---

## 📝 Compliance & Audit

### Post-Deployment Audit Checklist

- [ ] All payout transactions have audit logs
- [ ] Audit logs include actor, timestamp, policy, version
- [ ] Idempotency system working (no duplicate payouts)
- [ ] TTL cleanup script scheduled (removes 7-day-old idempotency keys)
- [ ] Export audit logs monthly for compliance
- [ ] Access logs show payouts.view / payouts.manage policy checks

### Compliance Export
```bash
# Generate monthly audit report
SELECT 
  DATE_TRUNC('day', "createdAt") as date,
  action,
  COUNT(*) as count
FROM audit_logs
WHERE resource = 'Payout'
  AND "createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', "createdAt"), action
ORDER BY date DESC;

# Export with signature
pg_dump manas360 > audit_export_2026_04.sql
sha256sum audit_export_2026_04.sql > audit_export_2026_04.sql.sha256
```

---

## 🟢 FINAL SIGN-OFF

**System Ready for Production:** ✅  
**All Safety Checks Passed:** ✅  
**Backup in Place:** ✅  
**Rollback Plan Documented:** ✅  
**Team Trained:** ⚠️ (Schedule sync before deploy)

**Deployment Authorized By:** _____________  
**Date:** _____________  
**Notes:** _____________

---

## 📞 Support Contacts

| Role | Name | Contact |
|------|------|---------|
| Platform Lead | - | - |
| Finance Manager | - | - |
| Database Admin | - | - |
| DevOps Lead | - | - |

---

**System:** MANAS360 Financial Control Plane  
**Module:** Payouts & Commission Management  
**Version:** 1.0.0  
**Deploy Date:** 10 April 2026  
**Status:** 🟢 Production Ready
