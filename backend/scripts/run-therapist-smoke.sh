#!/usr/bin/env bash
set -eu
BASE_URL="http://localhost:3000"
COOKIE_FILE="/tmp/manas_therapist_smoke.cookies"
OUT_DIR="/tmp/therapist-smoke"
mkdir -p "$OUT_DIR"

echo "Logging in as therapist1@manas360.local..."
curl -sS -c "$COOKIE_FILE" -H 'Content-Type: application/json' -d '{"identifier":"therapist1@manas360.local","password":"Manas@123"}' "$BASE_URL/api/auth/login" -o "$OUT_DIR/login.json" -w '\nHTTP:%{http_code}\n'

echo "Creating exercise..."
curl -sS -b "$COOKIE_FILE" -H 'Content-Type: application/json' -d '{"name":"Smoke Exercise Script","category":"CBT","assignedTo":"patient1@manas360.local"}' "$BASE_URL/api/v1/therapist/me/exercises" -o "$OUT_DIR/create_exercise.json" -w '\nHTTP:%{http_code}\n'

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
