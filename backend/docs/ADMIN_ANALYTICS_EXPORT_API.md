# Admin Analytics Export API

## Endpoint

- `POST /api/v1/admin/analytics/export`
- Access: admin-only (`requireAuth` + `requireRole('admin')`)
- Rate limit: `10 requests / 10 minutes` per admin user

## Async Export Mode

For large exports, use queue mode:

- `POST /api/v1/admin/analytics/export/async`
- `GET /api/v1/admin/analytics/export/:exportJobKey/status`
- `GET /api/v1/admin/analytics/export/:exportJobKey/download`

### Async Flow

1. Call async export endpoint with same body as sync endpoint.
2. Receive `202` with `exportJobKey`.
3. Poll status endpoint until `status = completed`.
4. Download from `.../download` endpoint.

Status values: `queued`, `running`, `completed`, `failed`.

## Request Body

```json
{
  "format": "csv",
  "from": "2026-01-01T00:00:00.000Z",
  "to": "2026-02-01T00:00:00.000Z",
  "organizationKey": 1,
  "includeChartsSnapshot": true,
  "chartSnapshots": ["data:image/png;base64,..."]
}
```

- `format`: `csv` or `pdf`
- `from`/`to`: ISO timestamps
- `organizationKey`: tenant/org key
- `chartSnapshots`: optional image data URLs, used only for PDF summary

## Response

- `200 OK`
- `Content-Type`: `text/csv` or `application/pdf`
- `Content-Disposition`: attachment filename
- Body: file bytes

## CSV Generation Logic

- Source: aggregated admin analytics service queries (`summary`, `template usage`, `utilization`).
- CSV sections:
  - report metadata (generated time, date range, organization)
  - metrics summary
  - template usage rows
  - sessions-over-time rows (weekly aggregate)
- Escaping strategy:
  - quote all cells
  - escape internal quotes (`"` -> `""`)
  - normalize newlines in values

## PDF Summary Strategy

- Engine: `pdfkit`
- Sections:
  - report header + date range
  - metrics summary
  - top templates
  - sessions-over-time summary lines
- Optional chart snapshot embedding:
  - accepts base64 data URLs
  - decodes and embeds images
  - max snapshots enforced to avoid oversized output

## Audit Logging Approach

- On every successful export:
  - write `SessionAuditLog` record with:
    - `action = EXPORTED`
    - `entityType = ANALYTICS_REPORT`
    - `entityId = admin-analytics:<organizationKey>`
    - metadata in `changes` (format, date range, row counts)
    - request IP address
- This provides immutable audit trail for admin exports without exposing sensitive session-level payloads.

## Security Notes

- Endpoint is admin-only.
- Rate limited to reduce abuse and heavy export pressure.
- Export generation uses server-side aggregated metrics; no raw response payloads included.
