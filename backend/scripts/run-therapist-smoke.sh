#!/usr/bin/env bash
set -eu
BASE_URL="${BASE_URL:-http://localhost:5001}"
THERAPIST_PHONE="${THERAPIST_PHONE:-+917000299999}"
COOKIE_FILE="/tmp/manas_therapist_smoke.cookies"
OUT_DIR="/tmp/therapist-smoke"
mkdir -p "$OUT_DIR"

echo "Logging in as therapist via phone OTP..."
curl -sS -c "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$THERAPIST_PHONE\",\"role\":\"therapist\",\"name\":\"Therapist Smoke\"}" \
  "$BASE_URL/api/v1/auth/signup/phone" -o "$OUT_DIR/otp_request.json" -w '\nHTTP:%{http_code}\n'

OTP_CODE=$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('$OUT_DIR/otp_request.json','utf8'));process.stdout.write(String(p?.data?.devOtp||''));")
if [ -z "$OTP_CODE" ]; then
  echo "Missing devOtp from /api/v1/auth/signup/phone response" >&2
  exit 1
fi

curl -sS -c "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$THERAPIST_PHONE\",\"otp\":\"$OTP_CODE\",\"acceptedTerms\":true}" \
  "$BASE_URL/api/v1/auth/verify/phone-otp" -o "$OUT_DIR/login.json" -w '\nHTTP:%{http_code}\n'

echo "Creating exercise..."
curl -sS -b "$COOKIE_FILE" -H 'Content-Type: application/json' -d '{"name":"Smoke Exercise Script","category":"CBT","assignedTo":"+917000100001"}' "$BASE_URL/api/v1/therapist/me/exercises" -o "$OUT_DIR/create_exercise.json" -w '\nHTTP:%{http_code}\n'

declare -a endpoints=(
  "/api/v1/therapist/me/profile"
  "/api/v1/therapist/me/exercises"
  "/api/v1/therapist/me/dashboard"
  "/api/v1/therapist/me/patients"
  "/api/v1/therapist/me/notes"
)

echo "Fetching endpoints..."
for ep in "${endpoints[@]}"; do
  name=$(echo "$ep" | sed 's|/|_|g' | sed 's|^_||')
  out="$OUT_DIR/${name}.json"
  echo " - $ep -> $out"
  curl -sS -b "$COOKIE_FILE" "$BASE_URL$ep" -o "$out" -w '\nHTTP:%{http_code}\n'
done

echo "Summary files written to $OUT_DIR"
echo "Check $OUT_DIR/login.json and other JSON files for details."

echo "Quick results:"
for f in "$OUT_DIR"/*.json; do
  printf "%s: " "$(basename "$f")"
  jq -r 'if .success==true then "OK" elif .message then .message else "OK?" end' "$f" 2>/dev/null || echo "(raw)";
done

exit 0
