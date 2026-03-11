#!/usr/bin/env bash
set -eu

BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_FILE="/tmp/manas_patient_saas_smoke.cookies"
OUT_DIR="/tmp/patient-saas-smoke"
mkdir -p "$OUT_DIR"

echo "[1/5] Login as deterministic demo patient..."
curl -sS -c "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d '{"identifier":"patient@manas360.local","password":"Manas@123"}' \
  "$BASE_URL/api/auth/login" -o "$OUT_DIR/login.json" -w '\nHTTP:%{http_code}\n'

echo "[2/5] Fetch journey recommendation..."
curl -sS -b "$COOKIE_FILE" "$BASE_URL/api/v1/patient-journey/recommendation" \
  -o "$OUT_DIR/journey.json" -w '\nHTTP:%{http_code}\n'

echo "[3/5] Fetch providers list..."
curl -sS -b "$COOKIE_FILE" "$BASE_URL/api/v1/providers" \
  -o "$OUT_DIR/providers.json" -w '\nHTTP:%{http_code}\n'

echo "[4/5] Resolve first provider id and create booking intent..."
PROVIDER_ID=$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('$OUT_DIR/providers.json','utf8'));const rows=Array.isArray(p?.data?.items)?p.data.items:(Array.isArray(p?.items)?p.items:[]);process.stdout.write(rows[0]?.id||'');")
if [ -z "$PROVIDER_ID" ]; then
  echo "No providers returned from /api/v1/providers" >&2
  exit 1
fi

SCHEDULED_AT=$(node -e "const d=new Date(Date.now()+48*60*60*1000);process.stdout.write(d.toISOString());")

curl -sS -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"providerId\":\"$PROVIDER_ID\",\"scheduledAt\":\"$SCHEDULED_AT\",\"durationMinutes\":50,\"providerType\":\"therapist\",\"preferredTime\":false}" \
  "$BASE_URL/api/v1/sessions/book" -o "$OUT_DIR/book.json" -w '\nHTTP:%{http_code}\n'

echo "[5/5] Summary"
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('$OUT_DIR/journey.json','utf8'));const p=JSON.parse(fs.readFileSync('$OUT_DIR/providers.json','utf8'));const b=JSON.parse(fs.readFileSync('$OUT_DIR/book.json','utf8'));const providers=Array.isArray(p?.data?.items)?p.data.items:(Array.isArray(p?.items)?p.items:[]);console.log(JSON.stringify({journeySuccess:Boolean(j?.success),hasAssessment:Boolean(j?.data?.assessment?.id),pathway:j?.data?.pathway||null,providers:providers.length,bookingOrderId:b?.data?.order_id||b?.order_id||null,bookingAmount:b?.data?.amount||b?.amount||null},null,2));"

echo "Smoke outputs: $OUT_DIR"
rm -f "$COOKIE_FILE"
