# 🔥 Payment Auth Fix – Complete Diagnostic Guide

**Status**: 502 / Missing redirectUrl issue = **AUTH PROBLEM**, not PhonePe

---

## ⸻ THE CORE ISSUE

Your backend uses **DUAL AUTH** (Bearer token OR cookie):

```ts
// backend/src/middleware/auth.middleware.ts
const bearerToken = getBearerToken(req.headers.authorization);
const cookieToken = req.cookies?.access_token;
const accessToken = bearerToken ?? cookieToken;  // ← USES EITHER ONE
```

**Your fetch sends NEITHER:**

```js
// ❌ BROKEN VERSION
fetch("https://www.manas360.com/api/v1/patient/subscription/upgrade", {
  headers: { "content-type": "application/json" },
  body: "{\"planKey\":\"monthly\"}",
  method: "PATCH",
  credentials: "omit"  // ← 🔴 BLOCKS COOKIES
});
```

---

## ✅ SOLUTION 1: Using Cookies (Recommended for Browser)

```js
fetch("https://www.manas360.com/api/v1/patient/subscription/upgrade", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  body: JSON.stringify({ planKey: "monthly" }),
  credentials: "include"  // ✅ SENDS COOKIES
});
```

**Why this works:**
- `credentials: "include"` sends all cookies automatically
- Backend finds `access_token` cookie via `req.cookies?.access_token`
- Then calls `verifyAccessToken()` → extracts userId

---

## ✅ SOLUTION 2: Using Bearer Token (If Cookies Unavailable)

```js
// 1. Get your access token (if stored in localStorage)
const accessToken = localStorage.getItem('access_token');

// 2. Send it via Authorization header
fetch("https://www.manas360.com/api/v1/patient/subscription/upgrade", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Bearer ${accessToken}`  // ✅ BEARER TOKEN
  },
  body: JSON.stringify({ planKey: "monthly" }),
  credentials: "omit"  // OK for Bearer since not using cookies
});
```

**Why this works:**
- `Authorization: Bearer <token>` extracts token via `getBearerToken()`
- `verifyAccessToken()` validates the token
- Sets `req.auth.userId` from JWT payload

---

## 🔍 DEBUG: Check What's Failing

### Step 1: Open DevTools → Network Tab

1. **Click "Start Subscription" button** in your browser
2. Look for request to `https://www.manas360.com/api/v1/patient/subscription/upgrade`
3. **Check response status:**

| Status | Meaning | Fix |
|--------|---------|-----|
| **200** | ✅ Success | Check response body for `redirectUrl` |
| **401** | ❌ Auth missing | Use `credentials: "include"` or Bearer token |
| **403** | ❌ Role missing | Ensure user has 'patient' role |
| **422** | ❌ Validation failed | Check `planKey` spelling |
| **502** | ❌ Upstream error | Check backend logs + PhonePe config |

---

### Step 2: Check Response Body

Click the response → **Preview** tab:

#### ✅ SUCCESS (200)
```json
{
  "data": {
    "id": "sub_...",
    "transactionId": "SUB_USER_ID_monthly_...",
    "redirectUrl": "https://api-preprod.phonepe.com/...",
    "planName": "Monthly Plan",
    "price": 299
  },
  "message": "Payment initiated"
}
```

#### ❌ AUTH FAILURE (401)
```json
{
  "message": "Authentication required - invalid or missing credentials"
}
```

#### ❌ ROLE FAILURE (403)
```json
{
  "message": "Access denied"
}
```

---

### Step 3: Check Cookies in DevTools

**DevTools → Application → Cookies → www.manas360.com**

Look for: `access_token`

If **missing** → Session expired, need to login first

If **present** → But still getting 401 → Token validation failed

---

## 📋 Backend Fix Applied

✅ **Added explicit auth check** in `upgradePatientSubscriptionController`:

```ts
if (!req.auth?.userId) {
  throw new AppError(
    'Authentication required - invalid or missing credentials',
    401
  );
}
```

Now returns **clean 401 JSON** instead of cryptic errors.

---

## 🧪 Test Flow

### Option A: Browser Console (Recommended)

```js
// Run this in DevTools console after logging in
fetch("https://www.manas360.com/api/v1/patient/subscription/upgrade", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  body: JSON.stringify({ planKey: "monthly" }),
  credentials: "include"
})
.then(r => r.json())
.then(data => {
  console.log('Response:', data);
  if (data.data?.redirectUrl) {
    console.log('✅ Got redirectUrl:', data.data.redirectUrl);
    // Uncomment to actually redirect:
    // window.location.href = data.data.redirectUrl;
  } else {
    console.log('❌ Missing redirectUrl - auth likely failed');
  }
})
.catch(err => console.error('Error:', err));
```

### Option B: cURL from Terminal

```bash
# 1. Get your access token (if testing from backend)
ACCESS_TOKEN="your-token-here"

# 2. Make request with Bearer
curl -X PATCH "https://www.manas360.com/api/v1/patient/subscription/upgrade" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"planKey":"monthly"}'
```

---

## 🔐 Auth Priority (In Order)

1. **Bearer Token** from `Authorization: Bearer <token>` header
2. **Cookie Token** from `access_token` cookie
3. **None found** → 401 Unauthorized

Your app uses **cookies** by default (set after login), so:

- ✅ App UI works: uses Axios with `withCredentials: true`
- ❌ Manual fetch fails: uses `credentials: "omit"`

---

## 📝 Environment Check

Your `.env` shows:

```
NODE_ENV=development
PHONEPE_MERCHANT_ID=M23WKYVK658N2_2603161454
PHONEPE_SALT_KEY=ZjRhMDIyYTctY2ZlMy00MDc4LWIyNWYtYTg0MGIyZjYxYWUz
```

**For deployed (production):**
- Change `NODE_ENV=production`
- Change `PHONEPE_BASE_URL` to LIVE endpoint (not preprod)
- Verify `PHONEPE_MERCHANT_ID` is production ID

---

## 🚨 If Still Getting 502

### Check Backend Logs

Look for:

```
TypeError: Cannot read property 'id' of undefined
```

This means `req.user` or `req.auth` is still undefined despite auth middleware.

**Root causes:**
1. Error middleware not catching errors → won't happen with asyncHandler
2. PhonePe API returning 502 → check PHONEPE_MERCHANT_ID
3. Database connection issue → check DATABASE_URL

### Check PhonePe Config

```bash
# SSH into backend server
grep PHONEPE_ .env

# Should show:
# PHONEPE_MERCHANT_ID=...
# PHONEPE_SALT_KEY=...
# PHONEPE_BASE_URL=https://api.phonepe.com (PRODUCTION) or
#                  https://api-preprod.phonepe.com (SANDBOX)
```

---

## ✅ Checklist (Execute Now)

- [ ] **1. Change fetch:** Use `credentials: "include"`
- [ ] **2. Open DevTools:** Network tab
- [ ] **3. Click "Start Subscription"** button in app
- [ ] **4. Check response status** in Network tab
- [ ] **5. Check response body** for `redirectUrl`
- [ ] **6. Check cookies** in DevTools → Application
- [ ] **7. If 401:** Your session expired, login again
- [ ] **8. If 200 but no redirectUrl:** PhonePe config issue
- [ ] **9. If 502:** Check backend logs for errors

---

## 🔄 Payment Flow (Corrected)

```
User (Browser)
  ↓
Click "Start Subscription"
  ↓
PricingPage.tsx → patientApi.upgradeSubscription({ planKey })
  ↓
Axios with credentials: true (includes cookies) ✅
  ↓
PATCH /api/v1/patient/subscription/upgrade
  + Cookie: access_token=...
  ↓
auth.middleware.ts → requireAuth
  → Extract token from cookie ✅
  → Verify JWT ✅
  → Set req.auth.userId ✅
  ↓
patient-v1.controller.ts → upgradePatientSubscriptionController
  → Check if !req.auth?.userId → throw 401 ✅
  → Get userId ✅
  → Validate plan ✅
  ↓
For PAID PLAN:
  ↓
patient-subscription-payment.service.ts → initiatePatientSubscriptionPayment
  → Call PhonePe API
  → Get redirectUrl ✅
  → Create financialPayment record ✅
  → Return { transactionId, redirectUrl, planName, price }
  ↓
Backend response (200):
  {
    "data": {
      "redirectUrl": "https://api.phonepe.com/...",
      ...
    }
  }
  ↓
Frontend sets: window.location.href = redirectUrl
  ↓
User redirected to PhonePe payment gateway ✅
```

---

## 📞 Next Steps

**If 401 → Session expired**
1. Login again
2. Retry

**If 200 but no redirectUrl → Check PhonePe**
1. Verify `PHONEPE_MERCHANT_ID` is correct
2. Check `PHONEPE_SALT_KEY` matches
3. Verify `PHONEPE_BASE_URL` is set correctly

**If 502 → Check backend logs**
```bash
# On server:
tail -f /var/log/app.log
# or
pm2 logs
```

---

## 🎯 Key Insights

| Issue | Cause | Fix |
|-------|-------|-----|
| 502 / Missing redirectUrl | `credentials: "omit"` blocks cookies | Use `credentials: "include"` |
| 401 response | No Bearer token, no cookie | Login first OR send token |
| 403 response | User doesn't have 'patient' role | Login with correct role |
| Payment gateway doesn't open | `redirectUrl` missing from response | Fix auth first |

---

**Remember**: Your app UI uses Axios with `withCredentials: true`. Manual fetch must do the same!
