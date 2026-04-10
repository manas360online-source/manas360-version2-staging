#!/usr/bin/env bash
set -euo pipefail

WEBHOOK="${1:-${ZOHO_WEBHOOK_URL:-}}"
if [ -z "$WEBHOOK" ]; then
  cat <<USAGE
Usage: $0 <ZOHO_WEBHOOK_URL>
Or set ZOHO_WEBHOOK_URL environment variable.
USAGE
  exit 1
fi

TS="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

send() {
  local name="$1"
  local payload="$2"
  echo "=== Sending: $name ==="
  printf '%s\n' "$payload" | curl -sS -X POST "$WEBHOOK" -H "Content-Type: application/json" -d @-
  echo -e "\n---\n"
}

# USER_REGISTERED (patient)
payload='{
  "event":"USER_REGISTERED",
  "timestamp":"'"$TS"'",
  "source":"MANAS360",
  "role":"PATIENT",
  "clinicalType":"",
  "template":"user_welcome_patient",
  "data":{"userId":"u_1001","name":"Chandu","whatsapp_number":"+91636269114","email":"me@example.com","role":"PATIENT"}
}'
send "USER_REGISTERED_PATIENT" "$payload"

# USER_REGISTERED (therapist)
payload='{
  "event":"USER_REGISTERED",
  "timestamp":"'"$TS"'",
  "source":"MANAS360",
  "role":"THERAPIST",
  "clinicalType":"clinical",
  "template":"user_welcome_therapist",
  "data":{"userId":"u_1002","name":"Dr. Chandu","whatsapp_number":"+917026549413","email":"me@example.com","role":"THERAPIST","specialization":"Clinical Psychologist"}
}'
send "USER_REGISTERED_THERAPIST" "$payload"

# SESSION_BOOKED
payload='{
  "event":"SESSION_BOOKED",
  "timestamp":"'"$TS"'",
  "source":"MANAS360",
  "role":"PATIENT",
  "clinicalType":"therapy",
  "data":{"sessionId":"s_2001","patientId":"u_1001","therapistId":"u_1002","start":"'"$TS"'","joinUrl":"https://jitsi.example/s_2001"}
}'
send "SESSION_BOOKED" "$payload"

# SESSION_FOLLOWUP
payload='{
  "event":"SESSION_FOLLOWUP",
  "timestamp":"'"$TS"'",
  "source":"MANAS360",
  "role":"PATIENT",
  "clinicalType":"therapy",
  "data":{"sessionId":"s_2001","followupFor":"s_2001","notes":"Follow-up reminder"}
}'
send "SESSION_FOLLOWUP" "$payload"

# PAYMENT_SUCCESS
payload='{
  "event":"PAYMENT_SUCCESS",
  "timestamp":"'"$TS"'",
  "source":"MANAS360",
  "role":"PATIENT",
  "data":{"paymentId":"p_3001","amount":499,"currency":"INR","userId":"u_1001","status":"SUCCESS"}
}'
send "PAYMENT_SUCCESS" "$payload"

# PAYMENT_FAILED
payload='{
  "event":"PAYMENT_FAILED",
  "timestamp":"'"$TS"'",
  "source":"MANAS360",
  "role":"PATIENT",
  "data":{"paymentId":"p_3002","amount":499,"currency":"INR","userId":"u_1001","status":"FAILED","reason":"Insufficient funds"}
}'
send "PAYMENT_FAILED" "$payload"

# CLINICAL_EVENT
payload='{
  "event":"CLINICAL_EVENT",
  "timestamp":"'"$TS"'",
  "source":"MANAS360",
  "role":"PATIENT",
  "clinicalType":"assessment",
  "data":{"eventType":"REPORT_READY","userId":"u_1001","reportUrl":"https://app.example/reports/r_4001"}
}'
send "CLINICAL_EVENT" "$payload"

echo "All events sent."
