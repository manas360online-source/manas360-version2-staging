# Watti / WhatsApp Flow Failures — Diagnostic Summary

Purpose
-------
Document the failures observed when sending webhook events to Zoho Flow that invoke Watti (WhatsApp). Includes what we tested, observed responses, likely root causes, and recommended fixes and next steps.

Summary of the problem
----------------------
- Webhook posts reach Zoho Flow but downstream actions (Watti/WhatsApp) sometimes fail.
- Observed HTTP responses from Zoho while testing: 404 (bad path), 410 (expired/invalid webhook), 200 with empty body, and 200 with JSON error payloads such as:
  - `{ "type":"security","status":"error","info":{"category":"auth","message":"Invalid Oauth Token"}}`
  - `{ "message":"Unable to fetch the details. Contact support for more details.","status":"error" }`

Timeline / What we changed
--------------------------
- Added non-blocking WhatsApp emit calls in `backend/src/services/subscription.service.ts` for subscription payment events.
- Updated Zoho webhook helper (`zohoDesk.service.ts`) to flatten outgoing payloads so Decision blocks can access `event`, `role`, `clinicalType` at top-level while preserving `data`.
- Created test tooling: `run-zoho-all-events.sh` (repo root) and multiple single-line `curl` samples.
- Performed live testing. Initial tests returned 404/410 until correct webhook URL / published flow were used. Later tests returned 200 but flow runs failed inside Zoho due to OAuth/connection issues.

Tests performed (representative)
--------------------------------
- One-off curl (verbose) to validate connectivity and status code:
```
curl -i -v -X POST "FULL_WEBHOOK_URL&isdebug=true" \
  -H "Content-Type: application/json" \
  -d '{"event":"USER_REGISTERED","timestamp":"2026-04-05T12:30:00.000Z","source":"MANAS360","role":"PATIENT","data":{"userId":"u_1001","name":"Chandu","whatsapp_number":"+919999999999","email":"me@example.com"},"template":"user_welcome_patient"}' -w "\nHTTP_CODE:%{http_code}\n"
```
- Bulk test script: [run-zoho-all-events.sh](run-zoho-all-events.sh) — posts six canonical events (USER_REGISTERED patient/therapist, SESSION_BOOKED, SESSION_FOLLOWUP, PAYMENT_SUCCESS, PAYMENT_FAILED, CLINICAL_EVENT).

Observed responses and their meanings
------------------------------------
- 404: The webhook path was incorrect or truncated (you used `...` placeholder). Fix by copying the full webhook URL from the Incoming Webhook trigger.
- 410 / {"message":"Unable to fetch the details"}: The webhook URL belonged to a flow that was deleted/unpublished or the zapikey expired/invalid. Confirm the flow is published and copy a fresh webhook URL.
- 200 with empty body: Zoho accepted the POST — next check Flow History to inspect the run.
- 200 with body containing `Invalid Oauth Token` or similar: Zoho accepted the trigger, but a downstream action (Watti/WhatsApp connector or other OAuth-based connection) failed authorization. This is the most common end-user failure we saw.

Root causes identified
----------------------
1. Incorrect/expired webhook URL (404/410). Cause: copying/truncating the URL or regenerating/rotating zapikeys without updating tests.
2. Flow not published or trigger filters blocking runs (POST returns 200 but no History entry).
3. OAuth token expiry / connection misconfiguration for the Watti (WhatsApp) action inside the flow (returns `Invalid Oauth Token` or similar). Cause: connection needs reauthorization.
4. Template variable mismatch: payloads using numeric keys (e.g., `"1": "me@example.com"`) or wrong field names cause template send failures. Watti expects either ordered template variables or named variables mapped via Flow.

Fixes implemented so far
------------------------
- Flattened webhook payload in backend helper so `event`, `role`, `clinicalType` are top-level.
- Added explicit `template` and `whatsapp_number` fields in `run-zoho-all-events.sh` test payloads.
- Created the `run-zoho-all-events.sh` script to quickly re-run canonical events for verification (see [run-zoho-all-events.sh](run-zoho-all-events.sh)).

Recommended actions (priority order)
-----------------------------------
1. Verify the Flow and webhook URL
   - In Zoho Flow open the exact flow referenced by the webhook URL (confirm FLOW_ID in the URL matches the editor URL).
   - Ensure the Flow is Published (not Draft).
   - Open the Incoming Webhook trigger and copy the full URL (do not truncate). Use this for tests.

2. Re-run the test POST (verbose) and check Flow History
   - If curl returns 200 and the run appears in History, open the run and inspect the failing block.

3. Re-authorize the failing connection(s)
   - Click the failing block in History → note Connection name → open Connections → Reconnect / Re-authorize the connection used by the Watti/WhatsApp action.
   - Common connection types: Watti/WhatsApp provider, Zoho Mail/CRM, third-party OAuth apps.

4. Ensure template variables are mapped correctly
   - Best: send named fields from backend (preferred). Example: `data.name`, `data.whatsapp_number`.
   - Or in Flow add a `Set Variable` action before the WhatsApp action and map: `var_1 -> ${webhookTrigger.payload.data.name}`, `var_2 -> ${webhookTrigger.payload.data.whatsapp_number}` and `template_name -> user_welcome_patient`.

5. Rotate/Regenerate zapikeys if leakage suspected
   - If you shared the URL publicly while testing, regenerate the zapikey in the trigger and update your scripts/config.

How to reproduce (minimal)
-------------------------
1. Publish a simple flow with an Incoming Webhook trigger and a single action (e.g., Send Email or Log).
2. Copy the webhook URL shown by the trigger.
3. Run the verbose curl above with that exact URL and check Flow → History.

Verification checklist
----------------------
- curl returns HTTP 200
- Flow History shows a recent run with the POST timestamp
- The failing block (if any) shows a concrete error; if it is OAuth-related, reauthorize and re-run
- WhatsApp message (if action is Watti) is delivered; if not, inspect template variable mapping and connection logs

Files & scripts we added/changed
--------------------------------
- `run-zoho-all-events.sh` — test harness that posts canonical events to Zoho Flow. (Repo root)
- `backend/src/services/zohoDesk.service.ts` — updated to flatten payload (in repo; earlier patch applied)
- `backend/src/services/subscription.service.ts` — added non-blocking WhatsApp emit calls for payment events (in repo)

Next steps you can ask me to perform
-----------------------------------
- Draft exact `Set Variable` mappings for your `user_welcome_patient` template (I need the template variable order).
- Patch the backend emitter to always include `template` and `whatsapp_number` fields (I can apply the patch).
- Walk through re-authorizing a connection in Zoho Flow if you paste the failing block error and connection name.

If you want, I will now:
- mark this README creation as done in the todo list and commit it (done), and
- either patch the backend emitter or draft Set Variable mappings — tell me which.

---
Generated on: 2026-04-06
