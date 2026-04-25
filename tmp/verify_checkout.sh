#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:3010/api/v1"
PPHONE="+917000100111"
VPHONE="+917000200212"
PCOOKIE="/tmp/manas360_patient.cookies"
VCOOKIE="/tmp/manas360_provider.cookies"
RUN_ID=$(date +%s)

extract_token() {
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);process.stdout.write(j.data?.accessToken||j.data?.token||j.token||'');}catch{process.stdout.write('');}})"
}

PSEND=$(curl -s -X POST "$BASE/auth/signup/phone" -H 'Content-Type: application/json' -d "{\"phone\":\"$PPHONE\"}")
POTP=$(echo "$PSEND" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);process.stdout.write(String(j.data?.devOtp||''));}catch{process.stdout.write('');}})")
PVERIFY=$(curl -s -c "$PCOOKIE" -X POST "$BASE/auth/verify/phone-otp" -H 'Content-Type: application/json' -d "{\"phone\":\"$PPHONE\",\"otp\":\"$POTP\"}")
PTOKEN=$(echo "$PVERIFY" | extract_token)
PCHECK=""
if [[ -f "$PCOOKIE" ]]; then
  PCHECK=$(curl -s -X POST "$BASE/subscription/checkout" \
    -b "$PCOOKIE" \
    -H 'Content-Type: application/json' \
    -d "{\"planKey\":\"monthly\",\"acceptedTerms\":true,\"subtotalMinor\":9900,\"gstMinor\":1782,\"totalMinor\":11682,\"addons\":{},\"idempotencyKey\":\"pat-gst-extra-$RUN_ID\"}")
fi

VSEND=$(curl -s -X POST "$BASE/auth/signup/phone" -H 'Content-Type: application/json' -d "{\"phone\":\"$VPHONE\"}")
VOTP=$(echo "$VSEND" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);process.stdout.write(String(j.data?.devOtp||''));}catch{process.stdout.write('');}})")
VVERIFY=$(curl -s -c "$VCOOKIE" -X POST "$BASE/auth/verify/phone-otp" -H 'Content-Type: application/json' -d "{\"phone\":\"$VPHONE\",\"otp\":\"$VOTP\"}")
VTOKEN=$(echo "$VVERIFY" | extract_token)
VCHECK=""
if [[ -f "$VCOOKIE" ]]; then
  VCHECK=$(curl -s -X POST "$BASE/provider/subscription/checkout" \
    -b "$VCOOKIE" \
    -H 'Content-Type: application/json' \
    -d "{\"leadPlanKey\":\"basic\",\"platformCycle\":\"monthly\",\"acceptedTerms\":true,\"addons\":{\"hot\":1,\"warm\":0,\"cold\":0},\"subtotalMinor\":59700,\"gstMinor\":10746,\"totalMinor\":70446,\"idempotencyKey\":\"prov-gst-extra-$RUN_ID\"}")
fi

echo "PATIENT_SEND=$PSEND"
echo "PATIENT_OTP=$POTP"
echo "PATIENT_VERIFY=$PVERIFY"
echo "PATIENT_TOKEN_LEN=${#PTOKEN}"
echo "PATIENT_CHECKOUT=$PCHECK"

echo "PROVIDER_SEND=$VSEND"
echo "PROVIDER_OTP=$VOTP"
echo "PROVIDER_VERIFY=$VVERIFY"
echo "PROVIDER_TOKEN_LEN=${#VTOKEN}"
echo "PROVIDER_CHECKOUT=$VCHECK"
