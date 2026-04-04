#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"

check() {
  local path="$1"
  local name="$2"
  local url="${BASE_URL}${path}"

  local code
  code="$(curl -sS -o /tmp/manas360_health_resp.txt -w "%{http_code}" "$url")"

  if [[ "$code" -lt 200 || "$code" -ge 400 ]]; then
    echo "[FAIL] ${name} (${url}) -> HTTP ${code}"
    cat /tmp/manas360_health_resp.txt || true
    exit 1
  fi

  echo "[OK] ${name} (${url}) -> HTTP ${code}"
}

check "/health" "Health endpoint"
check "/api/v1/group-therapy/public/sessions" "Public group therapy sessions"

echo "Predeploy health checks passed."
