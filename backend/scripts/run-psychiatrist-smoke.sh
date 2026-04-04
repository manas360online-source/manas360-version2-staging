#!/usr/bin/env bash
set -eu
BASE_URL="${BASE_URL:-http://localhost:3001}"
PSYCHIATRIST_PHONE="${PSYCHIATRIST_PHONE:-+917000400001}"
COOKIE_FILE="/tmp/manas_psychiatrist_smoke.cookies"
OUT_DIR="/tmp/psychiatrist-smoke"
mkdir -p "$OUT_DIR"

echo "Logging in as psychiatrist via phone OTP..."
curl -sS -c "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PSYCHIATRIST_PHONE\"}" \
  "$BASE_URL/api/v1/auth/signup/phone" \
  -o "$OUT_DIR/otp_request.json" -w '\nHTTP:%{http_code}\n'

OTP_CODE=$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('$OUT_DIR/otp_request.json','utf8'));process.stdout.write(String(p?.data?.devOtp||''));")
if [ -z "$OTP_CODE" ]; then
  echo "Missing devOtp from /api/v1/auth/signup/phone response" >&2
  exit 1
fi

curl -sS -c "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PSYCHIATRIST_PHONE\",\"otp\":\"$OTP_CODE\",\"acceptedTerms\":true}" \
  "$BASE_URL/api/v1/auth/verify/phone-otp" \
  -o "$OUT_DIR/login.json" -w '\nHTTP:%{http_code}\n'

echo "Fetching patients..."
curl -sS -b "$COOKIE_FILE" \
  "$BASE_URL/api/v1/psychiatrist/me/patients" \
  -o "$OUT_DIR/patients.json" -w '\nHTTP:%{http_code}\n'

PATIENT_ID=$(jq -r '.data.items[0].patientId // empty' "$OUT_DIR/patients.json" 2>/dev/null || true)
if [ -z "$PATIENT_ID" ]; then
  echo "No patient found for psychiatrist; skipping patient-specific calls."
  exit 0
fi

echo "Creating psychiatric assessment..."
curl -sS -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"patientId\":\"$PATIENT_ID\",\"chiefComplaint\":\"Persistent low mood\",\"symptoms\":[{\"name\":\"Low Mood\",\"severity\":7}],\"durationWeeks\":6,\"clinicalImpression\":\"Major Depressive Disorder\",\"severity\":\"Moderate\"}" \
  "$BASE_URL/api/v1/psychiatrist/me/assessments" \
  -o "$OUT_DIR/create_assessment.json" -w '\nHTTP:%{http_code}\n'

echo "Creating prescription..."
curl -sS -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"patientId\":\"$PATIENT_ID\",\"drugName\":\"Sertraline\",\"startingDose\":\"50mg\",\"frequency\":\"once daily in the morning\",\"duration\":\"8 weeks\"}" \
  "$BASE_URL/api/v1/psychiatrist/me/prescriptions" \
  -o "$OUT_DIR/create_prescription.json" -w '\nHTTP:%{http_code}\n'

echo "Checking interactions..."
curl -sS -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"patientId\":\"$PATIENT_ID\",\"medications\":[\"Sertraline\"],\"herbals\":[\"Ashwagandha\"]}" \
  "$BASE_URL/api/v1/psychiatrist/me/drug-interactions/check" \
  -o "$OUT_DIR/check_interactions.json" -w '\nHTTP:%{http_code}\n'

echo "Fetching dashboard and parameter tracking..."
curl -sS -b "$COOKIE_FILE" \
  "$BASE_URL/api/v1/psychiatrist/me/dashboard?patientId=$PATIENT_ID" \
  -o "$OUT_DIR/dashboard_patient.json" -w '\nHTTP:%{http_code}\n'

curl -sS -b "$COOKIE_FILE" \
  "$BASE_URL/api/v1/psychiatrist/me/parameter-tracking/$PATIENT_ID" \
  -o "$OUT_DIR/parameter_tracking.json" -w '\nHTTP:%{http_code}\n'

echo "Done. Outputs in $OUT_DIR"
