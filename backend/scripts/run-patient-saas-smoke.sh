#!/usr/bin/env bash
set -eu

BASE_URL="${BASE_URL:-http://localhost:5001}"
PATIENT_PHONE="${PATIENT_PHONE:-+919900000301}"
COOKIE_FILE="/tmp/manas_patient_saas_smoke.cookies"
OUT_DIR="/tmp/patient-saas-smoke"
mkdir -p "$OUT_DIR"

echo "[1/6] Login as deterministic demo patient via phone OTP..."
curl -sS -c "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PATIENT_PHONE\"}" \
  "$BASE_URL/api/v1/auth/signup/phone" -o "$OUT_DIR/otp_request.json" -w '\nHTTP:%{http_code}\n'

OTP_CODE=$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('$OUT_DIR/otp_request.json','utf8'));process.stdout.write(String(p?.data?.devOtp||''));")
if [ -z "$OTP_CODE" ]; then
  echo "Missing devOtp from /api/v1/auth/signup/phone response" >&2
  exit 1
fi

curl -sS -c "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PATIENT_PHONE\",\"otp\":\"$OTP_CODE\",\"acceptedTerms\":true}" \
  "$BASE_URL/api/v1/auth/verify/phone-otp" -o "$OUT_DIR/login.json" -w '\nHTTP:%{http_code}\n'

echo "[2/6] Ensure legal documents are accepted..."
curl -sS -b "$COOKIE_FILE" "$BASE_URL/api/v1/auth/legal/required" \
  -o "$OUT_DIR/legal_required.json" -w '\nHTTP:%{http_code}\n'

LEGAL_DOC_IDS=$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('$OUT_DIR/legal_required.json','utf8'));const rows=Array.isArray(p?.data?.pendingDocuments)?p.data.pendingDocuments:[];process.stdout.write(rows.map((x)=>String(x?.id||'')).filter(Boolean).join(','));")
if [ -n "$LEGAL_DOC_IDS" ]; then
  DOC_IDS_JSON=$(node -e "const ids=(process.argv[1]||'').split(',').filter(Boolean);process.stdout.write(JSON.stringify(ids));" "$LEGAL_DOC_IDS")
  curl -sS -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d "{\"documentIds\":$DOC_IDS_JSON}" \
    "$BASE_URL/api/v1/auth/legal/accept" -o "$OUT_DIR/legal_accept.json" -w '\nHTTP:%{http_code}\n'
fi

echo "[3/6] Fetch journey recommendation..."
curl -sS -b "$COOKIE_FILE" "$BASE_URL/api/v1/patient-journey/recommendation" \
  -o "$OUT_DIR/journey.json" -w '\nHTTP:%{http_code}\n'

echo "[4/6] Fetch providers list..."
curl -sS -b "$COOKIE_FILE" "$BASE_URL/api/v1/providers" \
  -o "$OUT_DIR/providers.json" -w '\nHTTP:%{http_code}\n'

echo "[5/6] Resolve first provider id and create booking intent..."
PROVIDER_ID=$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('$OUT_DIR/providers.json','utf8'));const rows=Array.isArray(p?.data?.items)?p.data.items:(Array.isArray(p?.items)?p.items:[]);process.stdout.write(rows[0]?.id||'');")
if [ -z "$PROVIDER_ID" ]; then
  echo "No providers returned from /api/v1/providers" >&2
  exit 1
fi

SCHEDULED_AT=$(node -e "const next=new Date();next.setDate(next.getDate()+1);while(next.getDay()===0||next.getDay()===6){next.setDate(next.getDate()+1);}const y=String(next.getFullYear());const m=String(next.getMonth()+1).padStart(2,'0');const d=String(next.getDate()).padStart(2,'0');process.stdout.write(y+'-'+m+'-'+d+'T11:00:00');")

curl -sS -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"providerId\":\"$PROVIDER_ID\",\"scheduledAt\":\"$SCHEDULED_AT\",\"durationMinutes\":50,\"providerType\":\"therapist\",\"preferredTime\":false}" \
  "$BASE_URL/api/v1/sessions/book" -o "$OUT_DIR/book.json" -w '\nHTTP:%{http_code}\n'

echo "[6/6] Summary"
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('$OUT_DIR/journey.json','utf8'));const p=JSON.parse(fs.readFileSync('$OUT_DIR/providers.json','utf8'));const b=JSON.parse(fs.readFileSync('$OUT_DIR/book.json','utf8'));const providers=Array.isArray(p?.data?.items)?p.data.items:(Array.isArray(p?.items)?p.items:[]);console.log(JSON.stringify({journeySuccess:Boolean(j?.success),hasAssessment:Boolean(j?.data?.assessment?.id),pathway:j?.data?.pathway||null,providers:providers.length,bookingOrderId:b?.data?.order_id||b?.order_id||null,bookingAmount:b?.data?.amount||b?.amount||null},null,2));"

echo "Smoke outputs: $OUT_DIR"
rm -f "$COOKIE_FILE"
