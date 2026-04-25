#!/usr/bin/env bash
set -euo pipefail

# Payment gateway smoke checks
# Usage:
#   ./scripts/payment-gateway-smoke.sh
#
# Optional overrides:
#   BASE_URL=http://localhost:3000
#   ADMIN_TOKEN=... NON_ADMIN_TOKEN=...
#   ADMIN_IDENTIFIER=admin@manas360.local ADMIN_PASSWORD=Manas@123
#   NON_ADMIN_PHONE=+917000100111
#   FAILED_PAYMENT_ID=... CAPTURED_PAYMENT_ID=...

BASE_URL="${BASE_URL:-http://localhost:3000}"
DAYS="${DAYS:-30}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
NON_ADMIN_TOKEN="${NON_ADMIN_TOKEN:-}"
FAILED_PAYMENT_ID="${FAILED_PAYMENT_ID:-}"
CAPTURED_PAYMENT_ID="${CAPTURED_PAYMENT_ID:-}"

ADMIN_IDENTIFIER="${ADMIN_IDENTIFIER:-admin@manas360.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Manas@123}"
NON_ADMIN_PHONE="${NON_ADMIN_PHONE:-+917000100111}"
BACKEND_DIR="${BACKEND_DIR:-./backend}"
AUTO_CREATE_FAILED_PAYMENT="${AUTO_CREATE_FAILED_PAYMENT:-1}"

ADMIN_COOKIE_JAR="/tmp/pgw_admin.cookies"
NON_ADMIN_COOKIE_JAR="/tmp/pgw_non_admin.cookies"

cleanup() {
  rm -f "$ADMIN_COOKIE_JAR" "$NON_ADMIN_COOKIE_JAR"
}
trap cleanup EXIT

json_get() {
  node -e "const fs=require('fs'); const p=process.argv[1].split('.'); let v=JSON.parse(fs.readFileSync(0,'utf8')); for (const k of p) { v=(v||{})[k]; } process.stdout.write(v===undefined||v===null?'':String(v));" "$1"
}

login_and_store_cookie() {
  local identifier="$1"
  local password="$2"
  local cookie_jar="$3"

  local code
  code=$(curl -s -o /tmp/pgw_login_resp.json -w "%{http_code}" -c "$cookie_jar" \
    -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"identifier\":\"$identifier\",\"password\":\"$password\"}")

  if [[ "$code" != "200" ]]; then
    echo "ERROR: Login failed for $identifier (HTTP $code)"
    cat /tmp/pgw_login_resp.json || true
    exit 1
  fi
}

otp_login_and_store_cookie() {
  local phone="$1"
  local cookie_jar="$2"

  local code
  code=$(curl -s -o /tmp/pgw_otp_req.json -w "%{http_code}" -c "$cookie_jar" \
    -X POST "$BASE_URL/api/v1/auth/signup/phone" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\"}")

  if [[ "$code" != "201" && "$code" != "200" ]]; then
    echo "ERROR: OTP request failed for $phone (HTTP $code)"
    cat /tmp/pgw_otp_req.json || true
    exit 1
  fi

  local otp
  otp=$(cat /tmp/pgw_otp_req.json | json_get data.devOtp)
  if [[ -z "$otp" ]]; then
    echo "ERROR: OTP response did not include data.devOtp for $phone"
    cat /tmp/pgw_otp_req.json || true
    exit 1
  fi

  code=$(curl -s -o /tmp/pgw_otp_verify.json -w "%{http_code}" -c "$cookie_jar" \
    -X POST "$BASE_URL/api/v1/auth/verify/phone-otp" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\",\"otp\":\"$otp\"}")

  if [[ "$code" != "200" ]]; then
    echo "ERROR: OTP verify failed for $phone (HTTP $code)"
    cat /tmp/pgw_otp_verify.json || true
    exit 1
  fi
}

discover_payment_ids() {
  if [[ ! -d "$BACKEND_DIR" ]]; then
    return
  fi

  local result
  result=$(cd "$BACKEND_DIR" && node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const retryCandidate = await p.financialPayment.findFirst({
    where: { status: { not: 'CAPTURED' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  });
  const captured = await p.financialPayment.findFirst({
    where: { status: 'CAPTURED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  });
  console.log(JSON.stringify({ retryCandidate, captured }));
  await p.$disconnect();
})();
NODE
)

  if [[ -z "$FAILED_PAYMENT_ID" ]]; then
    FAILED_PAYMENT_ID=$(printf '%s' "$result" | json_get retryCandidate.id)
  fi
  if [[ -z "$CAPTURED_PAYMENT_ID" ]]; then
    CAPTURED_PAYMENT_ID=$(printf '%s' "$result" | json_get captured.id)
  fi
}

create_failed_payment_if_missing() {
  if [[ "$AUTO_CREATE_FAILED_PAYMENT" != "1" ]]; then
    return
  fi

  if [[ -n "$FAILED_PAYMENT_ID" ]]; then
    return
  fi

  if [[ ! -d "$BACKEND_DIR" ]]; then
    return
  fi

  local created_id
  created_id=$(cd "$BACKEND_DIR" && node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const p = new PrismaClient();
(async () => {
  const user = await p.user.findFirst({ where: { isDeleted: false }, select: { id: true } });
  if (!user) {
    console.log('');
    await p.$disconnect();
    return;
  }

  const id = `pay_smoke_failed_${Date.now()}`;
  const orderId = `SMOKE_ORDER_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  await p.financialPayment.create({
    data: {
      id,
      patientId: user.id,
      providerGateway: 'PHONEPE',
      razorpayOrderId: orderId,
      status: 'FAILED',
      amountMinor: BigInt(50000),
      currency: 'INR',
      retryCount: 1,
      failedAt: new Date(),
      failureReason: 'SMOKE_TEST_FAILED_PAYMENT',
      metadata: { smokeTest: true, createdAt: new Date().toISOString() },
      paymentType: 'PROVIDER_FEE',
    },
  });

  console.log(id);
  await p.$disconnect();
})();
NODE
)

  FAILED_PAYMENT_ID="${created_id//$'\n'/}"
}

request_code() {
  local method="$1"
  local url="$2"
  local actor="$3"
  local body="${4:-}"

  local auth_mode="cookie"
  local auth_header=""
  local cookie_jar=""

  if [[ "$actor" == "admin" ]]; then
    if [[ -n "$ADMIN_TOKEN" ]]; then
      auth_mode="bearer"
      auth_header="$ADMIN_TOKEN"
    else
      cookie_jar="$ADMIN_COOKIE_JAR"
    fi
  else
    if [[ -n "$NON_ADMIN_TOKEN" ]]; then
      auth_mode="bearer"
      auth_header="$NON_ADMIN_TOKEN"
    else
      cookie_jar="$NON_ADMIN_COOKIE_JAR"
    fi
  fi

  if [[ "$auth_mode" == "bearer" ]]; then
    if [[ -n "$body" ]]; then
      curl -s -o /tmp/pgw_resp.json -w "%{http_code}" -X "$method" "$url" \
        -H "Authorization: Bearer $auth_header" \
        -H "Content-Type: application/json" \
        -d "$body"
    else
      curl -s -o /tmp/pgw_resp.json -w "%{http_code}" -X "$method" "$url" \
        -H "Authorization: Bearer $auth_header"
    fi
  else
    if [[ -n "$body" ]]; then
      curl -s -o /tmp/pgw_resp.json -w "%{http_code}" -X "$method" "$url" \
        -b "$cookie_jar" \
        -H "Content-Type: application/json" \
        -d "$body"
    else
      curl -s -o /tmp/pgw_resp.json -w "%{http_code}" -X "$method" "$url" \
        -b "$cookie_jar"
    fi
  fi
}

assert_code() {
  local actual="$1"
  local expected="$2"
  local label="$3"

  if [[ "$actual" == "$expected" ]]; then
    echo "PASS: $label (HTTP $actual)"
  else
    echo "FAIL: $label (expected $expected, got $actual)"
    echo "Response:"
    cat /tmp/pgw_resp.json || true
    exit 1
  fi
}

echo "[0/5] Environment pre-check"
health_code=$(curl -s -o /tmp/pgw_health.json -w "%{http_code}" "$BASE_URL/api/health" || true)
if [[ "$health_code" != "200" ]]; then
  echo "ERROR: API not reachable at $BASE_URL/api/health (HTTP $health_code)"
  exit 1
fi

if [[ -z "$ADMIN_TOKEN" || -z "$NON_ADMIN_TOKEN" ]]; then
  echo "Using cookie auth (admin: email/password, non-admin: phone/otp)"
  login_and_store_cookie "$ADMIN_IDENTIFIER" "$ADMIN_PASSWORD" "$ADMIN_COOKIE_JAR"
  otp_login_and_store_cookie "$NON_ADMIN_PHONE" "$NON_ADMIN_COOKIE_JAR"
fi

discover_payment_ids
create_failed_payment_if_missing

if [[ -z "$CAPTURED_PAYMENT_ID" ]]; then
  echo "ERROR: Could not find any CAPTURED payment in DB. Create at least one successful payment first."
  exit 1
fi

if [[ -z "$FAILED_PAYMENT_ID" ]]; then
  echo "ERROR: Could not find or create a non-captured payment for manual retry validation."
  exit 1
fi

echo "[1/4] Analytics endpoint"
code=$(request_code "GET" "$BASE_URL/api/v1/admin/analytics/payments?days=$DAYS" "admin")
assert_code "$code" "200" "Admin analytics payments"

echo "[2/4] Manual retry on non-captured payment (admin)"
code=$(request_code "POST" "$BASE_URL/api/v1/admin/payments/$FAILED_PAYMENT_ID/retry" "admin")
assert_code "$code" "200" "Manual retry succeeds"

echo "[3/4] Manual retry on captured payment (expect 400)"
code=$(request_code "POST" "$BASE_URL/api/v1/admin/payments/$CAPTURED_PAYMENT_ID/retry" "admin")
assert_code "$code" "400" "Captured payment cannot be retried"

echo "[4/4] Manual retry RBAC (non-admin expect 403)"
target_id="$CAPTURED_PAYMENT_ID"
if [[ -n "$FAILED_PAYMENT_ID" ]]; then
  target_id="$FAILED_PAYMENT_ID"
fi
code=$(request_code "POST" "$BASE_URL/api/v1/admin/payments/$target_id/retry" "non-admin")
assert_code "$code" "403" "RBAC enforcement"

echo "All smoke tests passed."
