#!/usr/bin/env bash
set -euo pipefail

OWNER="${OWNER:-manas360online-source}"
REPO="${REPO:-manas360-version2-staging}"
BRANCHES="${BRANCHES:-main staging}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required. Install from https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login"
  exit 1
fi

# Required checks from CI workflow job names.
CONTEXTS='["Validate Lockfile Sync","backend","frontend"]'

for branch in ${BRANCHES}; do
  echo "Applying protection to ${OWNER}/${REPO}:${branch}"

  payload_file="$(mktemp)"
  cat >"${payload_file}" <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ${CONTEXTS}
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON

  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "/repos/${OWNER}/${REPO}/branches/${branch}/protection" \
    --input "${payload_file}" >/dev/null

  rm -f "${payload_file}"
  echo "Branch protection applied for ${branch}"
done

echo "Done. Required checks are now enforced: ${CONTEXTS}"
