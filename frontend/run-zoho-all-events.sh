#!/usr/bin/env bash
set -euo pipefail

ZOHO_URL='https://flow.zoho.in/60067414515/flow/webhook/incoming?zapikey=REPLACE_WITH_NEW_ZAPIKEY&isdebug=false'
TS="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

curl -sS -X POST "$ZOHO_URL" -H 'Content-Type: application/json' -d "{
  \"event\":\"CLINICAL_EVENT\",
  \"timestamp\":\"$TS\",
  \"source\":\"MANAS360\",
  \"role\":\"PATIENT\",
  \"clinicalType\":\"PRESCRIPTION_ISSUED\",
  \"prescriptionUrl\":\"https://app.manas360.com/prescriptions/rx_811/download\",
  \"data\":{\"clinicalType\":\"PRESCRIPTION_ISSUED\",\"userId\":\"u_1001\",\"name\":\"Chandu\",\"phone\":\"919999999999\",\"prescriptionId\":\"rx_811\",\"prescriptionUrl\":\"https://app.manas360.com/prescriptions/rx_811/download\",\"role\":\"PATIENT\"}
}"

echo "All Zoho test events sent."
