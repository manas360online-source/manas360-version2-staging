# Certificate Template Structure (Planned, Not Implemented)

This document defines the future-ready template contract for certificate generation.
Current implementation intentionally excludes template rendering and PDF/image generation.

## Scope (Current vs Future)
- Current:
  - Certification catalog storage in database
  - Public APIs to fetch certifications
  - Frontend routing and dynamic rendering
- Future:
  - Enrollment workflow
  - Eligibility tracking engine
  - Certificate issuance and revocation
  - Template rendering (PDF/image)

## Proposed Template Data Contract

```json
{
  "templateKey": "CERT-NLP-THERAPIST-V1",
  "version": 1,
  "layout": {
    "size": "A4-LANDSCAPE",
    "orientation": "landscape",
    "margins": { "top": 24, "right": 24, "bottom": 24, "left": 24 }
  },
  "branding": {
    "logoAsset": "brand/logo-primary.png",
    "sealAsset": "brand/seal-gold.png",
    "signatureAssets": ["signatures/faculty-1.png"]
  },
  "fields": [
    { "key": "candidate_name", "required": true },
    { "key": "certification_title", "required": true },
    { "key": "certificate_number", "required": true },
    { "key": "issued_on", "required": true },
    { "key": "valid_until", "required": false }
  ],
  "security": {
    "qrVerification": true,
    "checksum": "sha256",
    "watermark": "MANAS360 VERIFIED"
  }
}
```

## Future Service Boundaries
- `EnrollmentService`
  - Create and manage enrollment lifecycle
- `EligibilityService`
  - Validate module completion and prerequisites
- `CertificateGenerationService`
  - Generate signed certificate artifacts from template contract
- `CertificateVerificationService`
  - Public verification by certificate number / QR token

## Suggested Tables (Future)
- `certification_enrollments`
- `certification_progress`
- `certificate_issuances`
- `certificate_templates`
- `certificate_verification_events`

## Versioning Guidance
- Templates are immutable once used for issuance.
- New visual changes create a new `templateKey` or version.
- Issuance stores `templateKey` + `version` snapshot reference.
