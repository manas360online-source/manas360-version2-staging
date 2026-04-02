# PhonePe Testing Environment - Quick Setup Checklist

## ✅ REQUIRED VARIABLES (Must have to test)

| Variable | Purpose | Example | Where to Get |
|----------|---------|---------|---------------|
| `PHONEPE_ENV` | Environment mode | `preprod` | Hardcoded (use for sandbox testing) |
| `PHONEPE_MERCHANT_ID` | Your merchant ID | `PGCHECKOUT` | PhonePe Dashboard (Test Mode ON) |
| `PHONEPE_CLIENT_ID` | OAuth client ID | `1234567890ABC` | PhonePe Business Dashboard → Test Mode |
| `PHONEPE_CLIENT_SECRET` | OAuth client secret | `abc123xyz789` | PhonePe Business Dashboard → Test Mode |
| `PHONEPE_CLIENT_VERSION` | Client version | `1` | Provided by PhonePe (usually "1") |
| `NODE_ENV` | Application mode | `development` | Your choice (dev/test/staging) |
| `API_URL` | Your API base URL | `http://localhost:3000` | Your backend URL |
| `FRONTEND_URL` | Your frontend URL | `http://localhost:5173` | Your frontend URL |

## ⚠️ WEBHOOK TESTING (Required for full testing)

| Variable | Purpose | Example |
|----------|---------|---------|
| `PHONEPE_WEBHOOK_USERNAME` | Webhook auth username | `webhook_user_123` |
| `PHONEPE_WEBHOOK_PASSWORD` | Webhook auth password | `webhook_pass_xyz` |
| `ALLOW_PHONEPE_WEBHOOK_IP_BYPASS` | Block webhook IP check locally | `true` |

*Set these in PhonePe Dashboard under "Webhook Settings"*

## 🔧 OPTIONAL VARIABLES (For advanced testing)

| Variable | Default | Use When |
|----------|---------|----------|
| `PHONEPE_SALT_KEY` | *(empty - use OAuth)* | Using checksum mode (legacy) |
| `PHONEPE_WEBHOOK_ALLOWED_IPS` | *(no custom IPs)* | Testing from non-PhonePe IPs |
| `ALLOW_DEV_PAYMENT_BYPASS` | `false` | Bypass payments in dev mode |
| `PAYMENT_PLATFORM_SHARE_PERCENT` | `40` | Custom platform share % |
| `PAYMENT_PROVIDER_SHARE_PERCENT` | `60` | Custom provider share % |

---

## 🚀 Step-by-Step Testing Setup

### Step 1: Get PhonePe Test Credentials
```
1. Visit: https://dashboard.phonepe.com
2. Login with your credentials
3. Top-right: Toggle "Test Mode" ON
4. Copy your Client ID & Client Secret
5. Create webhook credentials under Settings → Webhooks
```

### Step 2: Set Environment Variables
```bash
# Copy the template
cp .env.phonepe.test .env

# Edit with your test credentials
nano .env
# Update:
# - PHONEPE_CLIENT_ID=<your-test-client-id>
# - PHONEPE_CLIENT_SECRET=<your-test-client-secret>
# - PHONEPE_WEBHOOK_USERNAME=<from-dashboard>
# - PHONEPE_WEBHOOK_PASSWORD=<from-dashboard>
```

### Step 3: Start Backend Server
```bash
cd backend
npm install   # Install PhonePe SDK: @phonepe-pg/pg-sdk-node
npm run dev
```

Expected log output:
```
[PhonePe] Initializing OAuth token on startup
[PhonePe] Token refresh scheduled (expiresIn: 3599 seconds)
Server listening on port 3000
```

### Step 4: Test Payment Flow

#### 4A. Initiate Payment (POST /api/v1/payments/session)
```bash
curl -X POST http://localhost:3000/api/v1/payments/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-auth-token>" \
  -d '{
    "providerId": "provider-123",
    "amountMinor": 10000  # ₹100.00
  }'

# Response should include:
# - redirectUrl: https://checkout.phonepe.com/... (PhonePe checkout)
# - status: Payment initiated
```

#### 4B. Complete Payment in PhonePe Checkout
```
1. Click the redirectUrl from response
2. You're redirected to PhonePe Sandbox checkout
3. Use test payment details (provided by PhonePe)
4. Click "Pay Now"
5. Payment will complete (or fail for testing)
6. Webhook will be sent to your backend
```

#### 4C: Check Payment Status (GET /api/v1/payments/status/{transactionId})
```bash
curl -X GET http://localhost:3000/api/v1/payments/status/txn-123abc \
  -H "Authorization: Bearer <your-auth-token>"

# Response:
# - state: COMPLETED (or FAILED)
# - isSuccess: true/false
# - metadata: {...}
```

### Step 5: Monitor Backend Logs

Watch for these success messages:
```
✓ [PhonePe] Payment initiated successfully
✓ [Payment.Reconcile] Starting status reconciliation
✓ [PhonePeWebhook] Order completed
✓ [PaymentService] Session payment processed and capture recorded
```

Watch for these error messages (and fix):
```
✗ [PhonePe] OAuth token fetch failed → Check CLIENT_ID/CLIENT_SECRET
✗ [PhonePe] Webhook signature verification FAILED → Check WEBHOOK_USERNAME/PASSWORD
✗ [PhonePe] Unauthorized source IP → Enable ALLOW_PHONEPE_WEBHOOK_IP_BYPASS=true
✗ Amount must be at least 100 paise → Use amountMinor >= 100
```

---

## 🧪 Testing Scenarios

### Scenario 1: Successful Payment
- Amount: ₹1-5000
- Method: Any (UPI, Card, etc.)
- Expected: `state: COMPLETED`

### Scenario 2: Declined Payment
- Use PhonePe's test declined card (provided in sandbox docs)
- Expected: `state: FAILED` or `state: DECLINED`

### Scenario 3: PENDING State (Extended Processing)
- PhonePe may return PENDING if payment is processing
- Backend will automatically reconcile using guideline schedule:
  - 1st check: 20-25s
  - Then: 3s, 6s, 10s, 30s, 60s intervals
- Expected: Eventually reaches COMPLETED or FAILED

### Scenario 4: Minimum Amount
- Amount: 100 paise (₹1.00)
- Expected: ✓ Payment initiated
- Amount: 99 paise
- Expected: ✗ Error: "Amount must be at least 100 paise"

### Scenario 5: Order Expiry
- Pay after expireAfter seconds have passed
- Expected: Payment rejected by PhonePe (order expired)

---

## 🔌 Webhook Testing (With ngrok)

For local webhook testing without deploying:

```bash
# Terminal 1: Start ngrok
ngrok http 3000

# Terminal 2: Update PhonePe Dashboard
# Settings → Webhooks → Webhook URL:
# https://your-ngrok-generated-url.ngrok.io/api/v1/payments/phonepe/webhook

# Terminal 3: Start your backend
cd backend && npm run dev

# Then make a test payment and watch logs:
# [PhonePeWebhook] Webhook received from IP: 1.2.3.4
# [PhonePe] Webhook signature VERIFICATION successful
# [PhonePeWebhook] Order completed
```

---

## 🪲 Debugging Checklist

- [ ] PHONEPE_CLIENT_ID is not placeholder (doesn't start with "change-" or "your-")
- [ ] PHONEPE_CLIENT_SECRET is not placeholder
- [ ] PHONEPE_ENV is set to "preprod" for sandbox testing
- [ ] NODE_ENV is "development" or "test"
- [ ] API_URL matches your backend (http://localhost:3000)
- [ ] FRONTEND_URL matches your frontend (http://localhost:5173)
- [ ] PHONEPE_WEBHOOK_USERNAME/PASSWORD match dashboard settings
- [ ] ALLOW_PHONEPE_WEBHOOK_IP_BYPASS=true for local testing
- [ ] Test amounts are >= 100 paise
- [ ] Backend logs show "[PhonePe] Token refresh scheduled" on startup
- [ ] Payment redirect URL is from PhonePe (not 404/error)

---

## 📝 Environment Variables File Template

See: [.env.phonepe.test](.env.phonepe.test)

Copy and customize for your testing setup.

---

## ✅ When Ready for Production

Switch to **PRODUCTION CREDENTIALS**:

1. Toggle "Test Mode" OFF in PhonePe Dashboard
2. Get your Production Client ID & Client Secret
3. Update `.env`:
   ```
   PHONEPE_ENV=production
   PHONEPE_CLIENT_ID=<production-client-id>
   PHONEPE_CLIENT_SECRET=<production-client-secret>
   NODE_ENV=production
   ```
4. Re-register production webhook URL
5. Deploy to production server
6. Monitor logs (production should show less verbose logging)

---

## 📚 References

- **PhonePe Docs**: See `/phonepay.md` in repository
- **Backend Service**: `backend/src/services/phonepe.service.ts`
- **Full Audit**: `PHONEPE_INTEGRATION_AUDIT.md`
- **Fixes Summary**: `PHONEPE_FIXES_SUMMARY.md`

---

**Status**: Ready for Testing ✅
