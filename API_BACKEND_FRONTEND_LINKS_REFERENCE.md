# API and Link Reference

This file differentiates backend APIs, frontend UI routes, and frontend-called API paths.

## Base URLs
- Backend local base (default): `http://localhost:3000`
- Backend API prefix: `/api` (from `API_PREFIX`, default `/api`)
- Frontend local base (Vite): `http://localhost:5173`
- Frontend router mode: Hash router, so URLs are `http://localhost:5173/#/<route>`

## 1) Backend APIs (Server Endpoints)
| Method | Endpoint | Local Link | Purpose | Source File |
|---|---|---|---|---|
| POST | /api/auth/login | http://localhost:3000/api/auth/login | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/auth/login/google | http://localhost:3000/api/auth/login/google | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/auth/logout | http://localhost:3000/api/auth/logout | Authentication and session actions | backend/src/routes/auth.routes.ts |
| GET | /api/auth/me | http://localhost:3000/api/auth/me | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/auth/mfa/setup | http://localhost:3000/api/auth/mfa/setup | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/auth/mfa/verify | http://localhost:3000/api/auth/mfa/verify | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/auth/password/forgot | http://localhost:3000/api/auth/password/forgot | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/auth/password/reset | http://localhost:3000/api/auth/password/reset | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/auth/provider-register | http://localhost:3000/api/auth/provider-register | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/auth/refresh | http://localhost:3000/api/auth/refresh | Authentication and session actions | backend/src/routes/auth.routes.ts |
| GET | /api/auth/sessions | http://localhost:3000/api/auth/sessions | Authentication and session actions | backend/src/routes/auth.routes.ts |
| DELETE | /api/auth/sessions/:sessionId | http://localhost:3000/api/auth/sessions/:sessionId | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/auth/signup/phone | http://localhost:3000/api/auth/signup/phone | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/auth/verify/phone-otp | http://localhost:3000/api/auth/verify/phone-otp | Authentication and session actions | backend/src/routes/auth.routes.ts |
| GET | /api/certifications | http://localhost:3000/api/certifications | Certification catalog/enrollment operations | backend/src/routes/certification.routes.ts |
| GET | /api/certifications/:id | http://localhost:3000/api/certifications/:id | Certification catalog/enrollment operations | backend/src/routes/certification.routes.ts |
| POST | /api/chat/message | http://localhost:3000/api/chat/message | Chat and messaging operations | backend/src/routes/chat.routes.ts |
| GET | /api/health | http://localhost:3000/api/health | Service health/status endpoint | backend/src/routes/index.ts |
| GET | /api/landing/metrics | http://localhost:3000/api/landing/metrics | Platform metrics endpoint | backend/src/routes/landing.routes.ts |
| GET | /api/patient/care-team | http://localhost:3000/api/patient/care-team | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/cbt-assignments/:assignmentId | http://localhost:3000/api/patient/cbt-assignments/:assignmentId | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/patient/cbt-assignments/:assignmentId | http://localhost:3000/api/patient/cbt-assignments/:assignmentId | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/cbt-assignments/active | http://localhost:3000/api/patient/cbt-assignments/active | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/patient/daily-checkin | http://localhost:3000/api/patient/daily-checkin | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/dashboard | http://localhost:3000/api/patient/dashboard | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/exercises | http://localhost:3000/api/patient/exercises | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/patient/exercises/:id/complete | http://localhost:3000/api/patient/exercises/:id/complete | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/patient/exercises/library | http://localhost:3000/api/patient/exercises/library | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/health | http://localhost:3000/api/patient/health | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/insights | http://localhost:3000/api/patient/insights | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/invoices | http://localhost:3000/api/patient/invoices | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/invoices/:id/download | http://localhost:3000/api/patient/invoices/:id/download | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/patient/messages | http://localhost:3000/api/patient/messages | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/messages/:conversationId | http://localhost:3000/api/patient/messages/:conversationId | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/patient/messages/:conversationId/read | http://localhost:3000/api/patient/messages/:conversationId/read | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/messages/conversations | http://localhost:3000/api/patient/messages/conversations | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/patient/messages/start | http://localhost:3000/api/patient/messages/start | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/mood | http://localhost:3000/api/patient/mood | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/patient/mood | http://localhost:3000/api/patient/mood | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/mood/history | http://localhost:3000/api/patient/mood/history | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/mood/stats | http://localhost:3000/api/patient/mood/stats | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/mood/today | http://localhost:3000/api/patient/mood/today | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/payment-method | http://localhost:3000/api/patient/payment-method | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PUT | /api/patient/payment-method | http://localhost:3000/api/patient/payment-method | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/pets/state | http://localhost:3000/api/patient/pets/state | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PUT | /api/patient/pets/state | http://localhost:3000/api/patient/pets/state | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/progress | http://localhost:3000/api/patient/progress | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/providers/available | http://localhost:3000/api/patient/providers/available | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/patient/records/:id/share | http://localhost:3000/api/patient/records/:id/share | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/records/:id/url | http://localhost:3000/api/patient/records/:id/url | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/records/shared/:token | http://localhost:3000/api/patient/records/shared/:token | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/reports | http://localhost:3000/api/patient/reports | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/patient/reports/health-summary | http://localhost:3000/api/patient/reports/health-summary | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/settings | http://localhost:3000/api/patient/settings | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PUT | /api/patient/settings | http://localhost:3000/api/patient/settings | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/subscription | http://localhost:3000/api/patient/subscription | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/patient/subscription/auto-renew | http://localhost:3000/api/patient/subscription/auto-renew | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/patient/subscription/cancel | http://localhost:3000/api/patient/subscription/cancel | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/patient/subscription/checkout | http://localhost:3000/api/patient/subscription/checkout | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/patient/subscription/downgrade | http://localhost:3000/api/patient/subscription/downgrade | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/patient/subscription/reactivate | http://localhost:3000/api/patient/subscription/reactivate | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/patient/subscription/upgrade | http://localhost:3000/api/patient/subscription/upgrade | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/patient/support | http://localhost:3000/api/patient/support | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/patient/support/tickets | http://localhost:3000/api/patient/support/tickets | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/pricing | http://localhost:3000/api/pricing | Plans/pricing retrieval and management | backend/src/routes/pricing.routes.ts |
| GET | /api/sounds/search | http://localhost:3000/api/sounds/search | Application API endpoint | backend/src/routes/sound.routes.ts |
| GET | /api/v1/admin/acceptances | http://localhost:3000/api/v1/admin/acceptances | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/bi-summary | http://localhost:3000/api/v1/admin/analytics/bi-summary | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/analytics/export | http://localhost:3000/api/v1/admin/analytics/export | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/export/:exportJobKey/download | http://localhost:3000/api/v1/admin/analytics/export/:exportJobKey/download | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/export/:exportJobKey/status | http://localhost:3000/api/v1/admin/analytics/export/:exportJobKey/status | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/analytics/export/async | http://localhost:3000/api/v1/admin/analytics/export/async | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/health | http://localhost:3000/api/v1/admin/analytics/health | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/marketplace | http://localhost:3000/api/v1/admin/analytics/marketplace | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/payments | http://localhost:3000/api/v1/admin/analytics/payments | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/platform | http://localhost:3000/api/v1/admin/analytics/platform | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/providers | http://localhost:3000/api/v1/admin/analytics/providers | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/reliability | http://localhost:3000/api/v1/admin/analytics/reliability | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/revenue | http://localhost:3000/api/v1/admin/analytics/revenue | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/sessions | http://localhost:3000/api/v1/admin/analytics/sessions | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/summary | http://localhost:3000/api/v1/admin/analytics/summary | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/templates | http://localhost:3000/api/v1/admin/analytics/templates | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/therapist-performance | http://localhost:3000/api/v1/admin/analytics/therapist-performance | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/user-growth | http://localhost:3000/api/v1/admin/analytics/user-growth | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/users | http://localhost:3000/api/v1/admin/analytics/users | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/analytics/utilization | http://localhost:3000/api/v1/admin/analytics/utilization | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/approve-provider/:id | http://localhost:3000/api/v1/admin/approve-provider/:id | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/audit | http://localhost:3000/api/v1/admin/audit | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/blueprints/status | http://localhost:3000/api/v1/admin/blueprints/status | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/company-reports | http://localhost:3000/api/v1/admin/company-reports | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/compliance/status | http://localhost:3000/api/v1/admin/compliance/status | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/crisis/:id/respond | http://localhost:3000/api/v1/admin/crisis/:id/respond | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/crisis/alerts | http://localhost:3000/api/v1/admin/crisis/alerts | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/feedback | http://localhost:3000/api/v1/admin/feedback | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/feedback/:id/resolve | http://localhost:3000/api/v1/admin/feedback/:id/resolve | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/groups | http://localhost:3000/api/v1/admin/groups | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/groups | http://localhost:3000/api/v1/admin/groups | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| DELETE | /api/v1/admin/groups/:id | http://localhost:3000/api/v1/admin/groups/:id | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PUT | /api/v1/admin/groups/:id | http://localhost:3000/api/v1/admin/groups/:id | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/legal/documents | http://localhost:3000/api/v1/admin/legal/documents | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/legal/documents/:id/download | http://localhost:3000/api/v1/admin/legal/documents/:id/download | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/live-sessions | http://localhost:3000/api/v1/admin/live-sessions | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/metrics | http://localhost:3000/api/v1/admin/metrics | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/metrics/live | http://localhost:3000/api/v1/admin/metrics/live | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/modules/:module/summary | http://localhost:3000/api/v1/admin/modules/:module/summary | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/offers | http://localhost:3000/api/v1/admin/offers | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/offers | http://localhost:3000/api/v1/admin/offers | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| DELETE | /api/v1/admin/offers/:id | http://localhost:3000/api/v1/admin/offers/:id | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PUT | /api/v1/admin/offers/:id | http://localhost:3000/api/v1/admin/offers/:id | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/offers/publish | http://localhost:3000/api/v1/admin/offers/publish | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/offers/reorder | http://localhost:3000/api/v1/admin/offers/reorder | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/payments/:paymentId/retry | http://localhost:3000/api/v1/admin/payments/:paymentId/retry | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/payouts | http://localhost:3000/api/v1/admin/payouts | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/payouts/:id/approve | http://localhost:3000/api/v1/admin/payouts/:id/approve | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/pricing | http://localhost:3000/api/v1/admin/pricing | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PATCH | /api/v1/admin/pricing | http://localhost:3000/api/v1/admin/pricing | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PUT | /api/v1/admin/pricing | http://localhost:3000/api/v1/admin/pricing | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/pricing/contracts | http://localhost:3000/api/v1/admin/pricing/contracts | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/pricing/contracts/:id/approve | http://localhost:3000/api/v1/admin/pricing/contracts/:id/approve | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/pricing/contracts/draft | http://localhost:3000/api/v1/admin/pricing/contracts/draft | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/pricing/free-toggle | http://localhost:3000/api/v1/admin/pricing/free-toggle | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/qr-codes | http://localhost:3000/api/v1/admin/qr-codes | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/qr-codes | http://localhost:3000/api/v1/admin/qr-codes | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PATCH | /api/v1/admin/qr-codes/:code | http://localhost:3000/api/v1/admin/qr-codes/:code | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/rbac/platform-admins | http://localhost:3000/api/v1/admin/rbac/platform-admins | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/rbac/platform-admins | http://localhost:3000/api/v1/admin/rbac/platform-admins | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/reports/export | http://localhost:3000/api/v1/admin/reports/export | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/reports/export/:jobId | http://localhost:3000/api/v1/admin/reports/export/:jobId | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/reports/export/:jobId/download | http://localhost:3000/api/v1/admin/reports/export/:jobId/download | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/roles | http://localhost:3000/api/v1/admin/roles | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PATCH | /api/v1/admin/roles/:role | http://localhost:3000/api/v1/admin/roles/:role | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PUT | /api/v1/admin/screening/options/:optionId | http://localhost:3000/api/v1/admin/screening/options/:optionId | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/screening/provider-questions | http://localhost:3000/api/v1/admin/screening/provider-questions | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PUT | /api/v1/admin/screening/questions/:questionId | http://localhost:3000/api/v1/admin/screening/questions/:questionId | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/screening/questions/:questionId/options | http://localhost:3000/api/v1/admin/screening/questions/:questionId/options | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/screening/templates | http://localhost:3000/api/v1/admin/screening/templates | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/screening/templates | http://localhost:3000/api/v1/admin/screening/templates | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PUT | /api/v1/admin/screening/templates/:templateId | http://localhost:3000/api/v1/admin/screening/templates/:templateId | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/screening/templates/:templateId/questions | http://localhost:3000/api/v1/admin/screening/templates/:templateId/questions | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/screening/templates/:templateId/questions | http://localhost:3000/api/v1/admin/screening/templates/:templateId/questions | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/screening/templates/:templateId/scoring-bands | http://localhost:3000/api/v1/admin/screening/templates/:templateId/scoring-bands | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PUT | /api/v1/admin/screening/templates/:templateId/scoring-bands | http://localhost:3000/api/v1/admin/screening/templates/:templateId/scoring-bands | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/screening/templates/:templateId/simulate | http://localhost:3000/api/v1/admin/screening/templates/:templateId/simulate | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/screening/templates/defaults/:templateKey/ensure | http://localhost:3000/api/v1/admin/screening/templates/defaults/:templateKey/ensure | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/subscriptions | http://localhost:3000/api/v1/admin/subscriptions | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PATCH | /api/v1/admin/therapists/:id/verify | http://localhost:3000/api/v1/admin/therapists/:id/verify | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/tickets | http://localhost:3000/api/v1/admin/tickets | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/tickets/:id/comment | http://localhost:3000/api/v1/admin/tickets/:id/comment | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/user-approvals | http://localhost:3000/api/v1/admin/user-approvals | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PATCH | /api/v1/admin/user-approvals/:id | http://localhost:3000/api/v1/admin/user-approvals/:id | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/users | http://localhost:3000/api/v1/admin/users | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/users/:id | http://localhost:3000/api/v1/admin/users/:id | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PATCH | /api/v1/admin/users/:id/status | http://localhost:3000/api/v1/admin/users/:id/status | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/verifications | http://localhost:3000/api/v1/admin/verifications | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| PATCH | /api/v1/admin/verifications/:id | http://localhost:3000/api/v1/admin/verifications/:id | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| GET | /api/v1/admin/verifications/:id/documents | http://localhost:3000/api/v1/admin/verifications/:id/documents | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/verify-provider/:id | http://localhost:3000/api/v1/admin/verify-provider/:id | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/admin/waive-subscription | http://localhost:3000/api/v1/admin/waive-subscription | Admin management/analytics operations | backend/src/routes/admin.routes.ts |
| POST | /api/v1/ai/chat | http://localhost:3000/api/v1/ai/chat | Chat and messaging operations | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/assessments/journey-recommendation | http://localhost:3000/api/v1/assessments/journey-recommendation | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/assessments/phq9 | http://localhost:3000/api/v1/assessments/phq9 | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/assessments/submit | http://localhost:3000/api/v1/assessments/submit | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/auth/login | http://localhost:3000/api/v1/auth/login | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/v1/auth/login/google | http://localhost:3000/api/v1/auth/login/google | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/v1/auth/logout | http://localhost:3000/api/v1/auth/logout | Authentication and session actions | backend/src/routes/auth.routes.ts |
| GET | /api/v1/auth/me | http://localhost:3000/api/v1/auth/me | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/v1/auth/mfa/setup | http://localhost:3000/api/v1/auth/mfa/setup | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/v1/auth/mfa/verify | http://localhost:3000/api/v1/auth/mfa/verify | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/v1/auth/password/forgot | http://localhost:3000/api/v1/auth/password/forgot | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/v1/auth/password/reset | http://localhost:3000/api/v1/auth/password/reset | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/v1/auth/provider-register | http://localhost:3000/api/v1/auth/provider-register | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/v1/auth/refresh | http://localhost:3000/api/v1/auth/refresh | Authentication and session actions | backend/src/routes/auth.routes.ts |
| GET | /api/v1/auth/sessions | http://localhost:3000/api/v1/auth/sessions | Authentication and session actions | backend/src/routes/auth.routes.ts |
| DELETE | /api/v1/auth/sessions/:sessionId | http://localhost:3000/api/v1/auth/sessions/:sessionId | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/v1/auth/signup/phone | http://localhost:3000/api/v1/auth/signup/phone | Authentication and session actions | backend/src/routes/auth.routes.ts |
| POST | /api/v1/auth/verify/phone-otp | http://localhost:3000/api/v1/auth/verify/phone-otp | Authentication and session actions | backend/src/routes/auth.routes.ts |
| GET | /api/v1/cbt-assignments/active | http://localhost:3000/api/v1/cbt-assignments/active | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/certifications | http://localhost:3000/api/v1/certifications | Certification catalog/enrollment operations | backend/src/routes/certification.routes.ts |
| GET | /api/v1/certifications/:id | http://localhost:3000/api/v1/certifications/:id | Certification catalog/enrollment operations | backend/src/routes/certification.routes.ts |
| GET | /api/v1/corporate/campaigns | http://localhost:3000/api/v1/corporate/campaigns | Corporate portal management | backend/src/routes/corporate.routes.ts |
| POST | /api/v1/corporate/campaigns | http://localhost:3000/api/v1/corporate/campaigns | Corporate portal management | backend/src/routes/corporate.routes.ts |
| GET | /api/v1/corporate/companies | http://localhost:3000/api/v1/corporate/companies | Corporate portal management | backend/src/routes/corporate.routes.ts |
| GET | /api/v1/corporate/dashboard | http://localhost:3000/api/v1/corporate/dashboard | Corporate portal management | backend/src/routes/corporate.routes.ts |
| GET | /api/v1/corporate/employees | http://localhost:3000/api/v1/corporate/employees | Corporate portal management | backend/src/routes/corporate.routes.ts |
| POST | /api/v1/corporate/employees/bulk-upload | http://localhost:3000/api/v1/corporate/employees/bulk-upload | Corporate portal management | backend/src/routes/corporate.routes.ts |
| GET | /api/v1/corporate/invoices | http://localhost:3000/api/v1/corporate/invoices | Corporate portal management | backend/src/routes/corporate.routes.ts |
| GET | /api/v1/corporate/payment-methods | http://localhost:3000/api/v1/corporate/payment-methods | Payment and billing processing | backend/src/routes/corporate.routes.ts |
| POST | /api/v1/corporate/payment-methods | http://localhost:3000/api/v1/corporate/payment-methods | Payment and billing processing | backend/src/routes/corporate.routes.ts |
| PATCH | /api/v1/corporate/payment-methods/:id | http://localhost:3000/api/v1/corporate/payment-methods/:id | Payment and billing processing | backend/src/routes/corporate.routes.ts |
| GET | /api/v1/corporate/programs | http://localhost:3000/api/v1/corporate/programs | Corporate portal management | backend/src/routes/corporate.routes.ts |
| POST | /api/v1/corporate/programs | http://localhost:3000/api/v1/corporate/programs | Corporate portal management | backend/src/routes/corporate.routes.ts |
| POST | /api/v1/corporate/public/create-account | http://localhost:3000/api/v1/corporate/public/create-account | Corporate portal management | backend/src/routes/corporate.routes.ts |
| POST | /api/v1/corporate/public/request-demo | http://localhost:3000/api/v1/corporate/public/request-demo | Corporate portal management | backend/src/routes/corporate.routes.ts |
| POST | /api/v1/corporate/public/request-otp | http://localhost:3000/api/v1/corporate/public/request-otp | Corporate portal management | backend/src/routes/corporate.routes.ts |
| GET | /api/v1/corporate/reports | http://localhost:3000/api/v1/corporate/reports | Corporate portal management | backend/src/routes/corporate.routes.ts |
| GET | /api/v1/corporate/roi | http://localhost:3000/api/v1/corporate/roi | Corporate portal management | backend/src/routes/corporate.routes.ts |
| GET | /api/v1/corporate/session-allocation | http://localhost:3000/api/v1/corporate/session-allocation | Corporate portal management | backend/src/routes/corporate.routes.ts |
| PATCH | /api/v1/corporate/session-allocation | http://localhost:3000/api/v1/corporate/session-allocation | Corporate portal management | backend/src/routes/corporate.routes.ts |
| GET | /api/v1/corporate/settings | http://localhost:3000/api/v1/corporate/settings | Corporate portal management | backend/src/routes/corporate.routes.ts |
| PATCH | /api/v1/corporate/settings | http://localhost:3000/api/v1/corporate/settings | Corporate portal management | backend/src/routes/corporate.routes.ts |
| GET | /api/v1/corporate/workshops | http://localhost:3000/api/v1/corporate/workshops | Corporate portal management | backend/src/routes/corporate.routes.ts |
| POST | /api/v1/corporate/workshops | http://localhost:3000/api/v1/corporate/workshops | Corporate portal management | backend/src/routes/corporate.routes.ts |
| POST | /api/v1/escalations/:id/acknowledge | http://localhost:3000/api/v1/escalations/:id/acknowledge | Application API endpoint | backend/src/routes/riskAnalytics.routes.ts |
| POST | /api/v1/escalations/:id/resolve | http://localhost:3000/api/v1/escalations/:id/resolve | Application API endpoint | backend/src/routes/riskAnalytics.routes.ts |
| GET | /api/v1/escalations/open | http://localhost:3000/api/v1/escalations/open | Application API endpoint | backend/src/routes/riskAnalytics.routes.ts |
| GET | /api/v1/exercises | http://localhost:3000/api/v1/exercises | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| PATCH | /api/v1/exercises/:id/complete | http://localhost:3000/api/v1/exercises/:id/complete | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/exercises/library | http://localhost:3000/api/v1/exercises/library | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/free-screening/:attemptId/submit | http://localhost:3000/api/v1/free-screening/:attemptId/submit | Screening and intake assessments | backend/src/routes/free-screening.routes.ts |
| POST | /api/v1/free-screening/:attemptId/submit/me | http://localhost:3000/api/v1/free-screening/:attemptId/submit/me | Screening and intake assessments | backend/src/routes/free-screening.routes.ts |
| POST | /api/v1/free-screening/assigned/:assignmentId/submit | http://localhost:3000/api/v1/free-screening/assigned/:assignmentId/submit | Screening and intake assessments | backend/src/routes/free-screening.routes.ts |
| GET | /api/v1/free-screening/assigned/me | http://localhost:3000/api/v1/free-screening/assigned/me | Screening and intake assessments | backend/src/routes/free-screening.routes.ts |
| GET | /api/v1/free-screening/history | http://localhost:3000/api/v1/free-screening/history | Screening and intake assessments | backend/src/routes/free-screening.routes.ts |
| POST | /api/v1/free-screening/start | http://localhost:3000/api/v1/free-screening/start | Screening and intake assessments | backend/src/routes/free-screening.routes.ts |
| POST | /api/v1/free-screening/start/me | http://localhost:3000/api/v1/free-screening/start/me | Screening and intake assessments | backend/src/routes/free-screening.routes.ts |
| GET | /api/v1/game/eligibility | http://localhost:3000/api/v1/game/eligibility | Application API endpoint | backend/src/routes/game.routes.ts |
| POST | /api/v1/game/play | http://localhost:3000/api/v1/game/play | Application API endpoint | backend/src/routes/game.routes.ts |
| GET | /api/v1/game/winners | http://localhost:3000/api/v1/game/winners | Application API endpoint | backend/src/routes/game.routes.ts |
| POST | /api/v1/gps/crisis/:alertId/resolve | http://localhost:3000/api/v1/gps/crisis/:alertId/resolve | Application API endpoint | backend/src/routes/gps.routes.ts |
| POST | /api/v1/gps/internal/push | http://localhost:3000/api/v1/gps/internal/push | Application API endpoint | backend/src/routes/gps.routes.ts |
| GET | /api/v1/gps/monitoring/:monitoringId/analytics | http://localhost:3000/api/v1/gps/monitoring/:monitoringId/analytics | Application API endpoint | backend/src/routes/gps.routes.ts |
| POST | /api/v1/gps/monitoring/:monitoringId/suggest/:suggestionId/ack | http://localhost:3000/api/v1/gps/monitoring/:monitoringId/suggest/:suggestionId/ack | Application API endpoint | backend/src/routes/gps.routes.ts |
| GET | /api/v1/gps/monitoring/:monitoringId/timeline | http://localhost:3000/api/v1/gps/monitoring/:monitoringId/timeline | Application API endpoint | backend/src/routes/gps.routes.ts |
| GET | /api/v1/gps/monitoring/:monitoringId/transcript | http://localhost:3000/api/v1/gps/monitoring/:monitoringId/transcript | Application API endpoint | backend/src/routes/gps.routes.ts |
| POST | /api/v1/gps/sessions/:sessionId/end | http://localhost:3000/api/v1/gps/sessions/:sessionId/end | Application API endpoint | backend/src/routes/gps.routes.ts |
| POST | /api/v1/gps/sessions/:sessionId/start | http://localhost:3000/api/v1/gps/sessions/:sessionId/start | Application API endpoint | backend/src/routes/gps.routes.ts |
| GET | /api/v1/gps/sessions/:sessionId/status | http://localhost:3000/api/v1/gps/sessions/:sessionId/status | Application API endpoint | backend/src/routes/gps.routes.ts |
| GET | /api/v1/group-therapy/admin/requests | http://localhost:3000/api/v1/group-therapy/admin/requests | Admin management/analytics operations | backend/src/routes/group-therapy.routes.ts |
| PATCH | /api/v1/group-therapy/admin/requests/:id/publish | http://localhost:3000/api/v1/group-therapy/admin/requests/:id/publish | Admin management/analytics operations | backend/src/routes/group-therapy.routes.ts |
| PATCH | /api/v1/group-therapy/admin/requests/:id/review | http://localhost:3000/api/v1/group-therapy/admin/requests/:id/review | Admin management/analytics operations | backend/src/routes/group-therapy.routes.ts |
| POST | /api/v1/group-therapy/private/invites | http://localhost:3000/api/v1/group-therapy/private/invites | Group therapy and invite operations | backend/src/routes/group-therapy.routes.ts |
| POST | /api/v1/group-therapy/private/invites/:inviteId/payment-confirm | http://localhost:3000/api/v1/group-therapy/private/invites/:inviteId/payment-confirm | Payment and billing processing | backend/src/routes/group-therapy.routes.ts |
| POST | /api/v1/group-therapy/private/invites/:inviteId/payment-intent | http://localhost:3000/api/v1/group-therapy/private/invites/:inviteId/payment-intent | Payment and billing processing | backend/src/routes/group-therapy.routes.ts |
| PATCH | /api/v1/group-therapy/private/invites/:inviteId/respond | http://localhost:3000/api/v1/group-therapy/private/invites/:inviteId/respond | Group therapy and invite operations | backend/src/routes/group-therapy.routes.ts |
| GET | /api/v1/group-therapy/private/invites/mine | http://localhost:3000/api/v1/group-therapy/private/invites/mine | Group therapy and invite operations | backend/src/routes/group-therapy.routes.ts |
| GET | /api/v1/group-therapy/private/patients | http://localhost:3000/api/v1/group-therapy/private/patients | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/group-therapy.routes.ts |
| GET | /api/v1/group-therapy/public/health | http://localhost:3000/api/v1/group-therapy/public/health | Service health/status endpoint | backend/src/routes/group-therapy.routes.ts |
| GET | /api/v1/group-therapy/public/sessions | http://localhost:3000/api/v1/group-therapy/public/sessions | Group therapy and invite operations | backend/src/routes/group-therapy.routes.ts |
| POST | /api/v1/group-therapy/public/sessions/:sessionId/join/confirm | http://localhost:3000/api/v1/group-therapy/public/sessions/:sessionId/join/confirm | Group therapy and invite operations | backend/src/routes/group-therapy.routes.ts |
| POST | /api/v1/group-therapy/public/sessions/:sessionId/join/payment-intent | http://localhost:3000/api/v1/group-therapy/public/sessions/:sessionId/join/payment-intent | Payment and billing processing | backend/src/routes/group-therapy.routes.ts |
| POST | /api/v1/group-therapy/requests | http://localhost:3000/api/v1/group-therapy/requests | Group therapy and invite operations | backend/src/routes/group-therapy.routes.ts |
| GET | /api/v1/group-therapy/requests/mine | http://localhost:3000/api/v1/group-therapy/requests/mine | Group therapy and invite operations | backend/src/routes/group-therapy.routes.ts |
| GET | /api/v1/invoices | http://localhost:3000/api/v1/invoices | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/invoices/:id/download | http://localhost:3000/api/v1/invoices/:id/download | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/landing/metrics | http://localhost:3000/api/v1/landing/metrics | Platform metrics endpoint | backend/src/routes/landing.routes.ts |
| POST | /api/v1/leads/:id/purchase | http://localhost:3000/api/v1/leads/:id/purchase | Lead marketplace and lead-response operations | backend/src/routes/lead.routes.ts |
| POST | /api/v1/leads/:id/purchase/confirm | http://localhost:3000/api/v1/leads/:id/purchase/confirm | Lead marketplace and lead-response operations | backend/src/routes/lead.routes.ts |
| POST | /api/v1/leads/:id/purchase/initiate | http://localhost:3000/api/v1/leads/:id/purchase/initiate | Lead marketplace and lead-response operations | backend/src/routes/lead.routes.ts |
| GET | /api/v1/leads/:leadId/assignments | http://localhost:3000/api/v1/leads/:leadId/assignments | Lead marketplace and lead-response operations | backend/src/routes/lead-response.routes.ts |
| PUT | /api/v1/leads/:leadId/convert | http://localhost:3000/api/v1/leads/:leadId/convert | Lead marketplace and lead-response operations | backend/src/routes/lead-response.routes.ts |
| PUT | /api/v1/leads/:leadId/respond | http://localhost:3000/api/v1/leads/:leadId/respond | Lead marketplace and lead-response operations | backend/src/routes/lead-response.routes.ts |
| GET | /api/v1/leads/:leadId/status | http://localhost:3000/api/v1/leads/:leadId/status | Lead marketplace and lead-response operations | backend/src/routes/lead-response.routes.ts |
| POST | /api/v1/leads/b2b/dispatch-priority-notifications | http://localhost:3000/api/v1/leads/b2b/dispatch-priority-notifications | Lead marketplace and lead-response operations | backend/src/routes/lead.routes.ts |
| POST | /api/v1/leads/b2b/publish | http://localhost:3000/api/v1/leads/b2b/publish | Lead marketplace and lead-response operations | backend/src/routes/lead.routes.ts |
| GET | /api/v1/leads/me | http://localhost:3000/api/v1/leads/me | Lead marketplace and lead-response operations | backend/src/routes/lead.routes.ts |
| GET | /api/v1/legal/documents/:id | http://localhost:3000/api/v1/legal/documents/:id | Legal/compliance document endpoints | backend/src/routes/legal.routes.ts |
| GET | /api/v1/mood | http://localhost:3000/api/v1/mood | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/mood | http://localhost:3000/api/v1/mood | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/mood/:userId/accuracy | http://localhost:3000/api/v1/mood/:userId/accuracy | Application API endpoint | backend/src/routes/riskAnalytics.routes.ts |
| GET | /api/v1/mood/:userId/history | http://localhost:3000/api/v1/mood/:userId/history | Application API endpoint | backend/src/routes/riskAnalytics.routes.ts |
| GET | /api/v1/mood/:userId/prediction | http://localhost:3000/api/v1/mood/:userId/prediction | Application API endpoint | backend/src/routes/riskAnalytics.routes.ts |
| GET | /api/v1/mood/history | http://localhost:3000/api/v1/mood/history | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/mood/stats | http://localhost:3000/api/v1/mood/stats | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/mood/today | http://localhost:3000/api/v1/mood/today | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/notifications | http://localhost:3000/api/v1/notifications | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| PATCH | /api/v1/notifications/:id/read | http://localhost:3000/api/v1/notifications/:id/read | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/patient-journey/clinical-assessment | http://localhost:3000/api/v1/patient-journey/clinical-assessment | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-journey.routes.ts |
| POST | /api/v1/patient-journey/quick-screening | http://localhost:3000/api/v1/patient-journey/quick-screening | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-journey.routes.ts |
| GET | /api/v1/patient-journey/recommendation | http://localhost:3000/api/v1/patient-journey/recommendation | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-journey.routes.ts |
| POST | /api/v1/patient-journey/select-pathway | http://localhost:3000/api/v1/patient-journey/select-pathway | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-journey.routes.ts |
| POST | /api/v1/patient/appointments/confirm-slot | http://localhost:3000/api/v1/patient/appointments/confirm-slot | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/appointments/payment-pending | http://localhost:3000/api/v1/patient/appointments/payment-pending | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/patient/appointments/request | http://localhost:3000/api/v1/patient/appointments/request | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/appointments/requests/pending | http://localhost:3000/api/v1/patient/appointments/requests/pending | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/patient/appointments/smart-match | http://localhost:3000/api/v1/patient/appointments/smart-match | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/care-team | http://localhost:3000/api/v1/patient/care-team | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/cbt-assignments/:assignmentId | http://localhost:3000/api/v1/patient/cbt-assignments/:assignmentId | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/patient/cbt-assignments/:assignmentId | http://localhost:3000/api/v1/patient/cbt-assignments/:assignmentId | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/cbt-assignments/active | http://localhost:3000/api/v1/patient/cbt-assignments/active | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/patient/daily-checkin | http://localhost:3000/api/v1/patient/daily-checkin | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/dashboard | http://localhost:3000/api/v1/patient/dashboard | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/documents | http://localhost:3000/api/v1/patient/documents | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/documents/:id/download | http://localhost:3000/api/v1/patient/documents/:id/download | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/patient/documents/upload | http://localhost:3000/api/v1/patient/documents/upload | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/exercises | http://localhost:3000/api/v1/patient/exercises | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/patient/exercises/:id/complete | http://localhost:3000/api/v1/patient/exercises/:id/complete | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/patient/exercises/library | http://localhost:3000/api/v1/patient/exercises/library | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/health | http://localhost:3000/api/v1/patient/health | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/insights | http://localhost:3000/api/v1/patient/insights | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/invoices | http://localhost:3000/api/v1/patient/invoices | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/invoices/:id/download | http://localhost:3000/api/v1/patient/invoices/:id/download | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/patient/messages | http://localhost:3000/api/v1/patient/messages | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/messages/:conversationId | http://localhost:3000/api/v1/patient/messages/:conversationId | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/patient/messages/:conversationId/read | http://localhost:3000/api/v1/patient/messages/:conversationId/read | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/messages/conversations | http://localhost:3000/api/v1/patient/messages/conversations | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/patient/messages/start | http://localhost:3000/api/v1/patient/messages/start | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/mood | http://localhost:3000/api/v1/patient/mood | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/patient/mood | http://localhost:3000/api/v1/patient/mood | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/mood/history | http://localhost:3000/api/v1/patient/mood/history | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/mood/stats | http://localhost:3000/api/v1/patient/mood/stats | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/mood/today | http://localhost:3000/api/v1/patient/mood/today | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/payment-method | http://localhost:3000/api/v1/patient/payment-method | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PUT | /api/v1/patient/payment-method | http://localhost:3000/api/v1/patient/payment-method | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/pets/state | http://localhost:3000/api/v1/patient/pets/state | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PUT | /api/v1/patient/pets/state | http://localhost:3000/api/v1/patient/pets/state | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/progress | http://localhost:3000/api/v1/patient/progress | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/providers/available | http://localhost:3000/api/v1/patient/providers/available | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/providers/smart-match | http://localhost:3000/api/v1/patient/providers/smart-match | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/patient/records/:id/share | http://localhost:3000/api/v1/patient/records/:id/share | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/records/:id/url | http://localhost:3000/api/v1/patient/records/:id/url | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/records/shared/:token | http://localhost:3000/api/v1/patient/records/shared/:token | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/reports | http://localhost:3000/api/v1/patient/reports | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/patient/reports/health-summary | http://localhost:3000/api/v1/patient/reports/health-summary | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/reports/shared/:id | http://localhost:3000/api/v1/patient/reports/shared/:id | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/reports/shared/:id/download | http://localhost:3000/api/v1/patient/reports/shared/:id/download | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/patient/settings | http://localhost:3000/api/v1/patient/settings | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PUT | /api/v1/patient/settings | http://localhost:3000/api/v1/patient/settings | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/subscription | http://localhost:3000/api/v1/patient/subscription | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/patient/subscription/auto-renew | http://localhost:3000/api/v1/patient/subscription/auto-renew | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/patient/subscription/cancel | http://localhost:3000/api/v1/patient/subscription/cancel | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/patient/subscription/checkout | http://localhost:3000/api/v1/patient/subscription/checkout | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/patient/subscription/downgrade | http://localhost:3000/api/v1/patient/subscription/downgrade | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/patient/subscription/reactivate | http://localhost:3000/api/v1/patient/subscription/reactivate | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/patient/subscription/upgrade | http://localhost:3000/api/v1/patient/subscription/upgrade | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patient/support | http://localhost:3000/api/v1/patient/support | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/patient/support/tickets | http://localhost:3000/api/v1/patient/support/tickets | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/patients/documents | http://localhost:3000/api/v1/patients/documents | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| GET | /api/v1/patients/me/assessments | http://localhost:3000/api/v1/patients/me/assessments | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| POST | /api/v1/patients/me/assessments | http://localhost:3000/api/v1/patients/me/assessments | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| POST | /api/v1/patients/me/daily-checkin | http://localhost:3000/api/v1/patients/me/daily-checkin | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| GET | /api/v1/patients/me/mood-history | http://localhost:3000/api/v1/patients/me/mood-history | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| GET | /api/v1/patients/me/pets/state | http://localhost:3000/api/v1/patients/me/pets/state | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| PUT | /api/v1/patients/me/pets/state | http://localhost:3000/api/v1/patients/me/pets/state | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| GET | /api/v1/patients/me/profile | http://localhost:3000/api/v1/patients/me/profile | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| GET | /api/v1/patients/me/sessions | http://localhost:3000/api/v1/patients/me/sessions | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| POST | /api/v1/patients/me/sessions/book | http://localhost:3000/api/v1/patients/me/sessions/book | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| GET | /api/v1/patients/me/therapist-matches | http://localhost:3000/api/v1/patients/me/therapist-matches | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| GET | /api/v1/patients/me/therapy-plan | http://localhost:3000/api/v1/patients/me/therapy-plan | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| GET | /api/v1/patients/prescriptions | http://localhost:3000/api/v1/patients/prescriptions | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| POST | /api/v1/patients/profile | http://localhost:3000/api/v1/patients/profile | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/patient.routes.ts |
| GET | /api/v1/payment-method | http://localhost:3000/api/v1/payment-method | Payment and billing processing | backend/src/routes/patient-v1.routes.ts |
| PUT | /api/v1/payment-method | http://localhost:3000/api/v1/payment-method | Payment and billing processing | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/payments/phonepe/status/:transactionId | http://localhost:3000/api/v1/payments/phonepe/status/:transactionId | Payment and billing processing | backend/src/routes/payment.routes.ts |
| GET | /api/v1/payments/phonepe/webhook | http://localhost:3000/api/v1/payments/phonepe/webhook | Payment and billing processing | backend/src/routes/payment.routes.ts |
| POST | /api/v1/payments/phonepe/webhook | http://localhost:3000/api/v1/payments/phonepe/webhook | Payment and billing processing | backend/src/routes/payment.routes.ts |
| POST | /api/v1/payments/refund | http://localhost:3000/api/v1/payments/refund | Payment and billing processing | backend/src/routes/payment.routes.ts |
| GET | /api/v1/payments/refund/:refundId/status | http://localhost:3000/api/v1/payments/refund/:refundId/status | Payment and billing processing | backend/src/routes/payment.routes.ts |
| POST | /api/v1/payments/sessions | http://localhost:3000/api/v1/payments/sessions | Payment and billing processing | backend/src/routes/payment.routes.ts |
| POST | /api/v1/payments/sessions/:id/complete | http://localhost:3000/api/v1/payments/sessions/:id/complete | Payment and billing processing | backend/src/routes/payment.routes.ts |
| GET | /api/v1/payments/status/:transactionId | http://localhost:3000/api/v1/payments/status/:transactionId | Payment and billing processing | backend/src/routes/payment.routes.ts |
| POST | /api/v1/payments/universal/confirm | http://localhost:3000/api/v1/payments/universal/confirm | Payment and billing processing | backend/src/routes/payment.routes.ts |
| POST | /api/v1/payments/universal/initiate | http://localhost:3000/api/v1/payments/universal/initiate | Payment and billing processing | backend/src/routes/payment.routes.ts |
| GET | /api/v1/payments/universal/invoice/:orderId | http://localhost:3000/api/v1/payments/universal/invoice/:orderId | Payment and billing processing | backend/src/routes/payment.routes.ts |
| GET | /api/v1/payments/universal/verify | http://localhost:3000/api/v1/payments/universal/verify | Payment and billing processing | backend/src/routes/payment.routes.ts |
| POST | /api/v1/payments/verify | http://localhost:3000/api/v1/payments/verify | Payment and billing processing | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/presence/heartbeat | http://localhost:3000/api/v1/presence/heartbeat | Application API endpoint | backend/src/routes/presence.routes.ts |
| GET | /api/v1/presence/session/:id | http://localhost:3000/api/v1/presence/session/:id | Application API endpoint | backend/src/routes/presence.routes.ts |
| POST | /api/v1/presence/unload | http://localhost:3000/api/v1/presence/unload | Application API endpoint | backend/src/routes/presence.routes.ts |
| GET | /api/v1/pricing | http://localhost:3000/api/v1/pricing | Plans/pricing retrieval and management | backend/src/routes/pricing.routes.ts |
| POST | /api/v1/provider/appointments/:requestId/accept | http://localhost:3000/api/v1/provider/appointments/:requestId/accept | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/appointments/:requestId/reject | http://localhost:3000/api/v1/provider/appointments/:requestId/reject | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/appointments/pending | http://localhost:3000/api/v1/provider/appointments/pending | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/calendar | http://localhost:3000/api/v1/provider/calendar | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/care-team | http://localhost:3000/api/v1/provider/care-team | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| DELETE | /api/v1/provider/care-team/:patientId | http://localhost:3000/api/v1/provider/care-team/:patientId | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/care-team/:patientId | http://localhost:3000/api/v1/provider/care-team/:patientId | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/dashboard | http://localhost:3000/api/v1/provider/dashboard | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/dashboard/leads | http://localhost:3000/api/v1/provider/dashboard/leads | Provider/Therapist workflows and dashboards | backend/src/routes/provider-dashboard.routes.ts |
| GET | /api/v1/provider/dashboard/metrics | http://localhost:3000/api/v1/provider/dashboard/metrics | Provider/Therapist workflows and dashboards | backend/src/routes/provider-dashboard.routes.ts |
| GET | /api/v1/provider/dashboard/performance-breakdown | http://localhost:3000/api/v1/provider/dashboard/performance-breakdown | Provider/Therapist workflows and dashboards | backend/src/routes/provider-dashboard.routes.ts |
| GET | /api/v1/provider/dashboard/subscription-plans | http://localhost:3000/api/v1/provider/dashboard/subscription-plans | Provider/Therapist workflows and dashboards | backend/src/routes/provider-dashboard.routes.ts |
| GET | /api/v1/provider/dashboard/summary | http://localhost:3000/api/v1/provider/dashboard/summary | Provider/Therapist workflows and dashboards | backend/src/routes/provider-dashboard.routes.ts |
| GET | /api/v1/provider/dashboard/weekly-stats | http://localhost:3000/api/v1/provider/dashboard/weekly-stats | Provider/Therapist workflows and dashboards | backend/src/routes/provider-dashboard.routes.ts |
| GET | /api/v1/provider/earnings | http://localhost:3000/api/v1/provider/earnings | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/lead-stats | http://localhost:3000/api/v1/provider/lead-stats | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/leads | http://localhost:3000/api/v1/provider/leads | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/marketplace | http://localhost:3000/api/v1/provider/marketplace | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/marketplace/purchase | http://localhost:3000/api/v1/provider/marketplace/purchase | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/meeting-link/:sessionId | http://localhost:3000/api/v1/provider/meeting-link/:sessionId | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/messages | http://localhost:3000/api/v1/provider/messages | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/messages/:conversationId | http://localhost:3000/api/v1/provider/messages/:conversationId | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/messages/conversations | http://localhost:3000/api/v1/provider/messages/conversations | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/onboarding | http://localhost:3000/api/v1/provider/onboarding | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/patient/:patientId/assessments | http://localhost:3000/api/v1/provider/patient/:patientId/assessments | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/patient/:patientId/assign | http://localhost:3000/api/v1/provider/patient/:patientId/assign | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/patient/:patientId/documents | http://localhost:3000/api/v1/provider/patient/:patientId/documents | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/patient/:patientId/goals | http://localhost:3000/api/v1/provider/patient/:patientId/goals | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/patient/:patientId/goals | http://localhost:3000/api/v1/provider/patient/:patientId/goals | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| PATCH | /api/v1/provider/patient/:patientId/goals/:goalId | http://localhost:3000/api/v1/provider/patient/:patientId/goals/:goalId | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/patient/:patientId/goals/:goalId/message | http://localhost:3000/api/v1/provider/patient/:patientId/goals/:goalId/message | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/patient/:patientId/labs | http://localhost:3000/api/v1/provider/patient/:patientId/labs | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/patient/:patientId/labs | http://localhost:3000/api/v1/provider/patient/:patientId/labs | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| PATCH | /api/v1/provider/patient/:patientId/labs/:labId | http://localhost:3000/api/v1/provider/patient/:patientId/labs/:labId | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/patient/:patientId/notes | http://localhost:3000/api/v1/provider/patient/:patientId/notes | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/patient/:patientId/notes | http://localhost:3000/api/v1/provider/patient/:patientId/notes | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| PUT | /api/v1/provider/patient/:patientId/notes/:noteId | http://localhost:3000/api/v1/provider/patient/:patientId/notes/:noteId | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/patient/:patientId/notes/:noteId/addendum | http://localhost:3000/api/v1/provider/patient/:patientId/notes/:noteId/addendum | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/patient/:patientId/overview | http://localhost:3000/api/v1/provider/patient/:patientId/overview | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/patient/:patientId/prescriptions | http://localhost:3000/api/v1/provider/patient/:patientId/prescriptions | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/patient/:patientId/prescriptions | http://localhost:3000/api/v1/provider/patient/:patientId/prescriptions | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| DELETE | /api/v1/provider/patient/:patientId/prescriptions/:prescriptionId | http://localhost:3000/api/v1/provider/patient/:patientId/prescriptions/:prescriptionId | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| PATCH | /api/v1/provider/patient/:patientId/prescriptions/:prescriptionId | http://localhost:3000/api/v1/provider/patient/:patientId/prescriptions/:prescriptionId | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/patient/:patientId/sessions/schedule | http://localhost:3000/api/v1/provider/patient/:patientId/sessions/schedule | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/patient/:patientId/weekly-plan | http://localhost:3000/api/v1/provider/patient/:patientId/weekly-plan | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/patient/:patientId/weekly-plan/publish | http://localhost:3000/api/v1/provider/patient/:patientId/weekly-plan/publish | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/patients | http://localhost:3000/api/v1/provider/patients | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/plans | http://localhost:3000/api/v1/provider/plans | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/platform-access | http://localhost:3000/api/v1/provider/platform-access | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/platform-access/initiate | http://localhost:3000/api/v1/provider/platform-access/initiate | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/settings | http://localhost:3000/api/v1/provider/settings | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| PUT | /api/v1/provider/settings | http://localhost:3000/api/v1/provider/settings | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/provider/subscription | http://localhost:3000/api/v1/provider/subscription | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| PATCH | /api/v1/provider/subscription/cancel | http://localhost:3000/api/v1/provider/subscription/cancel | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| POST | /api/v1/provider/subscription/checkout | http://localhost:3000/api/v1/provider/subscription/checkout | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| PATCH | /api/v1/provider/subscription/upgrade | http://localhost:3000/api/v1/provider/subscription/upgrade | Provider/Therapist workflows and dashboards | backend/src/routes/provider.routes.ts |
| GET | /api/v1/providers | http://localhost:3000/api/v1/providers | Provider/Therapist workflows and dashboards | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/providers/:id | http://localhost:3000/api/v1/providers/:id | Provider/Therapist workflows and dashboards | backend/src/routes/patient-v1.routes.ts |
| DELETE | /api/v1/psychiatrist/me/assessment-drafts/:patientId | http://localhost:3000/api/v1/psychiatrist/me/assessment-drafts/:patientId | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychiatrist/me/assessment-drafts/:patientId | http://localhost:3000/api/v1/psychiatrist/me/assessment-drafts/:patientId | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| PUT | /api/v1/psychiatrist/me/assessment-drafts/:patientId | http://localhost:3000/api/v1/psychiatrist/me/assessment-drafts/:patientId | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychiatrist/me/assessment-templates | http://localhost:3000/api/v1/psychiatrist/me/assessment-templates | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| POST | /api/v1/psychiatrist/me/assessment-templates | http://localhost:3000/api/v1/psychiatrist/me/assessment-templates | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychiatrist/me/assessments | http://localhost:3000/api/v1/psychiatrist/me/assessments | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| POST | /api/v1/psychiatrist/me/assessments | http://localhost:3000/api/v1/psychiatrist/me/assessments | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychiatrist/me/dashboard | http://localhost:3000/api/v1/psychiatrist/me/dashboard | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| POST | /api/v1/psychiatrist/me/drug-interactions/check | http://localhost:3000/api/v1/psychiatrist/me/drug-interactions/check | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| POST | /api/v1/psychiatrist/me/follow-ups | http://localhost:3000/api/v1/psychiatrist/me/follow-ups | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychiatrist/me/medication-history | http://localhost:3000/api/v1/psychiatrist/me/medication-history | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| POST | /api/v1/psychiatrist/me/medication-history | http://localhost:3000/api/v1/psychiatrist/me/medication-history | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychiatrist/me/medication-library | http://localhost:3000/api/v1/psychiatrist/me/medication-library | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| POST | /api/v1/psychiatrist/me/medication-library | http://localhost:3000/api/v1/psychiatrist/me/medication-library | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychiatrist/me/parameter-tracking/:patientId | http://localhost:3000/api/v1/psychiatrist/me/parameter-tracking/:patientId | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychiatrist/me/patients | http://localhost:3000/api/v1/psychiatrist/me/patients | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychiatrist/me/prescriptions | http://localhost:3000/api/v1/psychiatrist/me/prescriptions | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| POST | /api/v1/psychiatrist/me/prescriptions | http://localhost:3000/api/v1/psychiatrist/me/prescriptions | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychiatrist/me/self-mode | http://localhost:3000/api/v1/psychiatrist/me/self-mode | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychiatrist/me/settings | http://localhost:3000/api/v1/psychiatrist/me/settings | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| PUT | /api/v1/psychiatrist/me/settings | http://localhost:3000/api/v1/psychiatrist/me/settings | Application API endpoint | backend/src/routes/psychiatrist.routes.ts |
| GET | /api/v1/psychologist/me/assessments | http://localhost:3000/api/v1/psychologist/me/assessments | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| POST | /api/v1/psychologist/me/assessments | http://localhost:3000/api/v1/psychologist/me/assessments | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| GET | /api/v1/psychologist/me/dashboard | http://localhost:3000/api/v1/psychologist/me/dashboard | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| GET | /api/v1/psychologist/me/messages | http://localhost:3000/api/v1/psychologist/me/messages | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| GET | /api/v1/psychologist/me/patient-reports | http://localhost:3000/api/v1/psychologist/me/patient-reports | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/psychologist.routes.ts |
| POST | /api/v1/psychologist/me/patient-reports/:id/share | http://localhost:3000/api/v1/psychologist/me/patient-reports/:id/share | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/psychologist.routes.ts |
| GET | /api/v1/psychologist/me/patients | http://localhost:3000/api/v1/psychologist/me/patients | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/psychologist.routes.ts |
| GET | /api/v1/psychologist/me/patients/:patientId/overview | http://localhost:3000/api/v1/psychologist/me/patients/:patientId/overview | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/psychologist.routes.ts |
| GET | /api/v1/psychologist/me/profile | http://localhost:3000/api/v1/psychologist/me/profile | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| GET | /api/v1/psychologist/me/reports | http://localhost:3000/api/v1/psychologist/me/reports | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| POST | /api/v1/psychologist/me/reports | http://localhost:3000/api/v1/psychologist/me/reports | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| PUT | /api/v1/psychologist/me/reports/:id | http://localhost:3000/api/v1/psychologist/me/reports/:id | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| POST | /api/v1/psychologist/me/reports/:id/clone-for-patient | http://localhost:3000/api/v1/psychologist/me/reports/:id/clone-for-patient | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| GET | /api/v1/psychologist/me/schedule | http://localhost:3000/api/v1/psychologist/me/schedule | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| GET | /api/v1/psychologist/me/settings | http://localhost:3000/api/v1/psychologist/me/settings | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| PUT | /api/v1/psychologist/me/settings | http://localhost:3000/api/v1/psychologist/me/settings | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| GET | /api/v1/psychologist/me/tests | http://localhost:3000/api/v1/psychologist/me/tests | Application API endpoint | backend/src/routes/psychologist.routes.ts |
| GET | /api/v1/qr/:code | http://localhost:3000/api/v1/qr/:code | Application API endpoint | backend/src/routes/qr.routes.ts |
| POST | /api/v1/qr/:code/connected | http://localhost:3000/api/v1/qr/:code/connected | Application API endpoint | backend/src/routes/qr.routes.ts |
| GET | /api/v1/risk/:userId/current | http://localhost:3000/api/v1/risk/:userId/current | Application API endpoint | backend/src/routes/riskAnalytics.routes.ts |
| GET | /api/v1/risk/:userId/history | http://localhost:3000/api/v1/risk/:userId/history | Application API endpoint | backend/src/routes/riskAnalytics.routes.ts |
| GET | /api/v1/sessions/:id | http://localhost:3000/api/v1/sessions/:id | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/sessions/:id/documents/invoice | http://localhost:3000/api/v1/sessions/:id/documents/invoice | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/sessions/:id/documents/session-pdf | http://localhost:3000/api/v1/sessions/:id/documents/session-pdf | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/sessions/book | http://localhost:3000/api/v1/sessions/book | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/sessions/history | http://localhost:3000/api/v1/sessions/history | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/sessions/upcoming | http://localhost:3000/api/v1/sessions/upcoming | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/shared/plans/:type | http://localhost:3000/api/v1/shared/plans/:type | Application API endpoint | backend/src/routes/shared.routes.ts |
| GET | /api/v1/shared/plans/:type/:planId | http://localhost:3000/api/v1/shared/plans/:type/:planId | Application API endpoint | backend/src/routes/shared.routes.ts |
| GET | /api/v1/sounds/search | http://localhost:3000/api/v1/sounds/search | Application API endpoint | backend/src/routes/sound.routes.ts |
| PATCH | /api/v1/sso/:tenantKey | http://localhost:3000/api/v1/sso/:tenantKey | Application API endpoint | backend/src/routes/sso.routes.ts |
| GET | /api/v1/sso/:tenantKey/authorize | http://localhost:3000/api/v1/sso/:tenantKey/authorize | Authentication and session actions | backend/src/routes/sso.routes.ts |
| GET | /api/v1/sso/:tenantKey/callback | http://localhost:3000/api/v1/sso/:tenantKey/callback | Application API endpoint | backend/src/routes/sso.routes.ts |
| POST | /api/v1/sso/:tenantKey/invite | http://localhost:3000/api/v1/sso/:tenantKey/invite | Application API endpoint | backend/src/routes/sso.routes.ts |
| POST | /api/v1/sso/:tenantKey/test | http://localhost:3000/api/v1/sso/:tenantKey/test | Application API endpoint | backend/src/routes/sso.routes.ts |
| GET | /api/v1/sso/tenant/me | http://localhost:3000/api/v1/sso/tenant/me | Application API endpoint | backend/src/routes/sso.routes.ts |
| GET | /api/v1/sso/tenants | http://localhost:3000/api/v1/sso/tenants | Application API endpoint | backend/src/routes/sso.routes.ts |
| POST | /api/v1/sso/tenants | http://localhost:3000/api/v1/sso/tenants | Application API endpoint | backend/src/routes/sso.routes.ts |
| POST | /api/v1/sso/tenants/template/azure | http://localhost:3000/api/v1/sso/tenants/template/azure | Application API endpoint | backend/src/routes/sso.routes.ts |
| POST | /api/v1/sso/tenants/template/google | http://localhost:3000/api/v1/sso/tenants/template/google | Application API endpoint | backend/src/routes/sso.routes.ts |
| POST | /api/v1/sso/tenants/template/okta | http://localhost:3000/api/v1/sso/tenants/template/okta | Application API endpoint | backend/src/routes/sso.routes.ts |
| GET | /api/v1/subscription | http://localhost:3000/api/v1/subscription | Subscription lifecycle operations | backend/src/routes/patient-v1.routes.ts |
| PATCH | /api/v1/subscription/auto-renew | http://localhost:3000/api/v1/subscription/auto-renew | Subscription lifecycle operations | backend/src/routes/patient-v1.routes.ts |
| PATCH | /api/v1/subscription/cancel | http://localhost:3000/api/v1/subscription/cancel | Subscription lifecycle operations | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/subscription/care-team | http://localhost:3000/api/v1/subscription/care-team | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/cbt-assignments/:assignmentId | http://localhost:3000/api/v1/subscription/cbt-assignments/:assignmentId | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/subscription/cbt-assignments/:assignmentId | http://localhost:3000/api/v1/subscription/cbt-assignments/:assignmentId | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/cbt-assignments/active | http://localhost:3000/api/v1/subscription/cbt-assignments/active | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/subscription/checkout | http://localhost:3000/api/v1/subscription/checkout | Subscription lifecycle operations | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/subscription/daily-checkin | http://localhost:3000/api/v1/subscription/daily-checkin | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/dashboard | http://localhost:3000/api/v1/subscription/dashboard | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/subscription/downgrade | http://localhost:3000/api/v1/subscription/downgrade | Subscription lifecycle operations | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/subscription/exercises | http://localhost:3000/api/v1/subscription/exercises | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/subscription/exercises/:id/complete | http://localhost:3000/api/v1/subscription/exercises/:id/complete | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/subscription/exercises/library | http://localhost:3000/api/v1/subscription/exercises/library | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/health | http://localhost:3000/api/v1/subscription/health | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/insights | http://localhost:3000/api/v1/subscription/insights | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/invoices | http://localhost:3000/api/v1/subscription/invoices | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/invoices/:id/download | http://localhost:3000/api/v1/subscription/invoices/:id/download | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/subscription/messages | http://localhost:3000/api/v1/subscription/messages | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/messages/:conversationId | http://localhost:3000/api/v1/subscription/messages/:conversationId | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/subscription/messages/:conversationId/read | http://localhost:3000/api/v1/subscription/messages/:conversationId/read | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/messages/conversations | http://localhost:3000/api/v1/subscription/messages/conversations | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/subscription/messages/start | http://localhost:3000/api/v1/subscription/messages/start | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/mood | http://localhost:3000/api/v1/subscription/mood | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/subscription/mood | http://localhost:3000/api/v1/subscription/mood | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/mood/history | http://localhost:3000/api/v1/subscription/mood/history | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/mood/stats | http://localhost:3000/api/v1/subscription/mood/stats | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/mood/today | http://localhost:3000/api/v1/subscription/mood/today | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/payment-method | http://localhost:3000/api/v1/subscription/payment-method | Payment and billing processing | backend/src/routes/patient-self.routes.ts |
| PUT | /api/v1/subscription/payment-method | http://localhost:3000/api/v1/subscription/payment-method | Payment and billing processing | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/pets/state | http://localhost:3000/api/v1/subscription/pets/state | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| PUT | /api/v1/subscription/pets/state | http://localhost:3000/api/v1/subscription/pets/state | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/progress | http://localhost:3000/api/v1/subscription/progress | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/providers/available | http://localhost:3000/api/v1/subscription/providers/available | Provider/Therapist workflows and dashboards | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/subscription/reactivate | http://localhost:3000/api/v1/subscription/reactivate | Subscription lifecycle operations | backend/src/routes/patient-v1.routes.ts |
| POST | /api/v1/subscription/records/:id/share | http://localhost:3000/api/v1/subscription/records/:id/share | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/records/:id/url | http://localhost:3000/api/v1/subscription/records/:id/url | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/records/shared/:token | http://localhost:3000/api/v1/subscription/records/shared/:token | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/reports | http://localhost:3000/api/v1/subscription/reports | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/subscription/reports/health-summary | http://localhost:3000/api/v1/subscription/reports/health-summary | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/settings | http://localhost:3000/api/v1/subscription/settings | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| PUT | /api/v1/subscription/settings | http://localhost:3000/api/v1/subscription/settings | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/subscription | http://localhost:3000/api/v1/subscription/subscription | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/subscription/subscription/auto-renew | http://localhost:3000/api/v1/subscription/subscription/auto-renew | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/subscription/subscription/cancel | http://localhost:3000/api/v1/subscription/subscription/cancel | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/subscription/subscription/checkout | http://localhost:3000/api/v1/subscription/subscription/checkout | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/subscription/subscription/downgrade | http://localhost:3000/api/v1/subscription/subscription/downgrade | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/subscription/subscription/reactivate | http://localhost:3000/api/v1/subscription/subscription/reactivate | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/subscription/subscription/upgrade | http://localhost:3000/api/v1/subscription/subscription/upgrade | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| GET | /api/v1/subscription/support | http://localhost:3000/api/v1/subscription/support | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| POST | /api/v1/subscription/support/tickets | http://localhost:3000/api/v1/subscription/support/tickets | Subscription lifecycle operations | backend/src/routes/patient-self.routes.ts |
| PATCH | /api/v1/subscription/upgrade | http://localhost:3000/api/v1/subscription/upgrade | Subscription lifecycle operations | backend/src/routes/patient-v1.routes.ts |
| GET | /api/v1/subscriptions/me | http://localhost:3000/api/v1/subscriptions/me | Subscription lifecycle operations | backend/src/routes/subscription.routes.ts |
| GET | /api/v1/therapist/dashboard/exports/:jobId | http://localhost:3000/api/v1/therapist/dashboard/exports/:jobId | Provider/Therapist workflows and dashboards | backend/src/routes/dashboard.routes.ts |
| GET | /api/v1/therapist/dashboard/sessions | http://localhost:3000/api/v1/therapist/dashboard/sessions | Provider/Therapist workflows and dashboards | backend/src/routes/dashboard.routes.ts |
| GET | /api/v1/therapist/dashboard/sessions/:id | http://localhost:3000/api/v1/therapist/dashboard/sessions/:id | Provider/Therapist workflows and dashboards | backend/src/routes/dashboard.routes.ts |
| GET | /api/v1/therapist/me/analytics/dropoff | http://localhost:3000/api/v1/therapist/me/analytics/dropoff | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/analytics/sessions | http://localhost:3000/api/v1/therapist/me/analytics/sessions | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/analytics/summary | http://localhost:3000/api/v1/therapist/me/analytics/summary | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/appointments/accept | http://localhost:3000/api/v1/therapist/me/appointments/accept | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/appointments/pending | http://localhost:3000/api/v1/therapist/me/appointments/pending | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/appointments/propose-slot | http://localhost:3000/api/v1/therapist/me/appointments/propose-slot | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/appointments/reject | http://localhost:3000/api/v1/therapist/me/appointments/reject | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/assessments | http://localhost:3000/api/v1/therapist/me/assessments | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/assessments | http://localhost:3000/api/v1/therapist/me/assessments | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/care-team | http://localhost:3000/api/v1/therapist/me/care-team | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/care-team | http://localhost:3000/api/v1/therapist/me/care-team | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| DELETE | /api/v1/therapist/me/care-team/:id | http://localhost:3000/api/v1/therapist/me/care-team/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| PATCH | /api/v1/therapist/me/care-team/:id | http://localhost:3000/api/v1/therapist/me/care-team/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/dashboard | http://localhost:3000/api/v1/therapist/me/dashboard | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/documents | http://localhost:3000/api/v1/therapist/me/documents | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/earnings | http://localhost:3000/api/v1/therapist/me/earnings | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/exercises | http://localhost:3000/api/v1/therapist/me/exercises | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/exercises | http://localhost:3000/api/v1/therapist/me/exercises | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| DELETE | /api/v1/therapist/me/exercises/:id | http://localhost:3000/api/v1/therapist/me/exercises/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| PATCH | /api/v1/therapist/me/exercises/:id | http://localhost:3000/api/v1/therapist/me/exercises/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/exercises/:id/track | http://localhost:3000/api/v1/therapist/me/exercises/:id/track | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/free-screening/assignments | http://localhost:3000/api/v1/therapist/me/free-screening/assignments | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/free-screening/questions | http://localhost:3000/api/v1/therapist/me/free-screening/questions | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/free-screening/questions | http://localhost:3000/api/v1/therapist/me/free-screening/questions | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/free-screening/questions/:questionId/assign | http://localhost:3000/api/v1/therapist/me/free-screening/questions/:questionId/assign | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/leads | http://localhost:3000/api/v1/therapist/me/leads | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/leads/:id/purchase | http://localhost:3000/api/v1/therapist/me/leads/:id/purchase | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/messages | http://localhost:3000/api/v1/therapist/me/messages | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/notes | http://localhost:3000/api/v1/therapist/me/notes | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/patients | http://localhost:3000/api/v1/therapist/me/patients | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/payout-history | http://localhost:3000/api/v1/therapist/me/payout-history | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/profile | http://localhost:3000/api/v1/therapist/me/profile | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/resources | http://localhost:3000/api/v1/therapist/me/resources | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/resources | http://localhost:3000/api/v1/therapist/me/resources | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| DELETE | /api/v1/therapist/me/resources/:id | http://localhost:3000/api/v1/therapist/me/resources/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/resources/:id/track | http://localhost:3000/api/v1/therapist/me/resources/:id/track | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/session-notes | http://localhost:3000/api/v1/therapist/me/session-notes | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| PUT | /api/v1/therapist/me/session-notes/:sessionId | http://localhost:3000/api/v1/therapist/me/session-notes/:sessionId | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/sessions | http://localhost:3000/api/v1/therapist/me/sessions | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/sessions/:id | http://localhost:3000/api/v1/therapist/me/sessions/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| PATCH | /api/v1/therapist/me/sessions/:id | http://localhost:3000/api/v1/therapist/me/sessions/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/sessions/:id/actions/cancel | http://localhost:3000/api/v1/therapist/me/sessions/:id/actions/cancel | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/sessions/:id/actions/remind | http://localhost:3000/api/v1/therapist/me/sessions/:id/actions/remind | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/sessions/:id/actions/reschedule | http://localhost:3000/api/v1/therapist/me/sessions/:id/actions/reschedule | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/sessions/:id/actions/start-live | http://localhost:3000/api/v1/therapist/me/sessions/:id/actions/start-live | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/sessions/:id/export | http://localhost:3000/api/v1/therapist/me/sessions/:id/export | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/sessions/:id/notes | http://localhost:3000/api/v1/therapist/me/sessions/:id/notes | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/sessions/:id/responses/:responseId/notes | http://localhost:3000/api/v1/therapist/me/sessions/:id/responses/:responseId/notes | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/me/sessions/:id/responses/:responseId/notes | http://localhost:3000/api/v1/therapist/me/sessions/:id/responses/:responseId/notes | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| DELETE | /api/v1/therapist/me/sessions/:id/responses/:responseId/notes/:noteId | http://localhost:3000/api/v1/therapist/me/sessions/:id/responses/:responseId/notes/:noteId | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapist/me/sessions/:id/responses/:responseId/notes/:noteId | http://localhost:3000/api/v1/therapist/me/sessions/:id/responses/:responseId/notes/:noteId | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| PUT | /api/v1/therapist/me/sessions/:id/responses/:responseId/notes/:noteId | http://localhost:3000/api/v1/therapist/me/sessions/:id/responses/:responseId/notes/:noteId | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/profile | http://localhost:3000/api/v1/therapist/profile | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapist/session/:id/generate-ai-note | http://localhost:3000/api/v1/therapist/session/:id/generate-ai-note | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/dashboard/exports/:jobId | http://localhost:3000/api/v1/therapists/dashboard/exports/:jobId | Provider/Therapist workflows and dashboards | backend/src/routes/dashboard.routes.ts |
| GET | /api/v1/therapists/dashboard/sessions | http://localhost:3000/api/v1/therapists/dashboard/sessions | Provider/Therapist workflows and dashboards | backend/src/routes/dashboard.routes.ts |
| GET | /api/v1/therapists/dashboard/sessions/:id | http://localhost:3000/api/v1/therapists/dashboard/sessions/:id | Provider/Therapist workflows and dashboards | backend/src/routes/dashboard.routes.ts |
| GET | /api/v1/therapists/me/analytics/dropoff | http://localhost:3000/api/v1/therapists/me/analytics/dropoff | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/analytics/sessions | http://localhost:3000/api/v1/therapists/me/analytics/sessions | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/analytics/summary | http://localhost:3000/api/v1/therapists/me/analytics/summary | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/appointments/accept | http://localhost:3000/api/v1/therapists/me/appointments/accept | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/appointments/pending | http://localhost:3000/api/v1/therapists/me/appointments/pending | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/appointments/propose-slot | http://localhost:3000/api/v1/therapists/me/appointments/propose-slot | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/appointments/reject | http://localhost:3000/api/v1/therapists/me/appointments/reject | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/assessments | http://localhost:3000/api/v1/therapists/me/assessments | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/assessments | http://localhost:3000/api/v1/therapists/me/assessments | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/care-team | http://localhost:3000/api/v1/therapists/me/care-team | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/care-team | http://localhost:3000/api/v1/therapists/me/care-team | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| DELETE | /api/v1/therapists/me/care-team/:id | http://localhost:3000/api/v1/therapists/me/care-team/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| PATCH | /api/v1/therapists/me/care-team/:id | http://localhost:3000/api/v1/therapists/me/care-team/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/dashboard | http://localhost:3000/api/v1/therapists/me/dashboard | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/documents | http://localhost:3000/api/v1/therapists/me/documents | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/earnings | http://localhost:3000/api/v1/therapists/me/earnings | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/exercises | http://localhost:3000/api/v1/therapists/me/exercises | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/exercises | http://localhost:3000/api/v1/therapists/me/exercises | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| DELETE | /api/v1/therapists/me/exercises/:id | http://localhost:3000/api/v1/therapists/me/exercises/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| PATCH | /api/v1/therapists/me/exercises/:id | http://localhost:3000/api/v1/therapists/me/exercises/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/exercises/:id/track | http://localhost:3000/api/v1/therapists/me/exercises/:id/track | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/free-screening/assignments | http://localhost:3000/api/v1/therapists/me/free-screening/assignments | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/free-screening/questions | http://localhost:3000/api/v1/therapists/me/free-screening/questions | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/free-screening/questions | http://localhost:3000/api/v1/therapists/me/free-screening/questions | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/free-screening/questions/:questionId/assign | http://localhost:3000/api/v1/therapists/me/free-screening/questions/:questionId/assign | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/leads | http://localhost:3000/api/v1/therapists/me/leads | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/leads/:id/purchase | http://localhost:3000/api/v1/therapists/me/leads/:id/purchase | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/messages | http://localhost:3000/api/v1/therapists/me/messages | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/notes | http://localhost:3000/api/v1/therapists/me/notes | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/patients | http://localhost:3000/api/v1/therapists/me/patients | Patient dashboard, sessions, reports, or profile flows | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/payout-history | http://localhost:3000/api/v1/therapists/me/payout-history | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/profile | http://localhost:3000/api/v1/therapists/me/profile | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/resources | http://localhost:3000/api/v1/therapists/me/resources | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/resources | http://localhost:3000/api/v1/therapists/me/resources | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| DELETE | /api/v1/therapists/me/resources/:id | http://localhost:3000/api/v1/therapists/me/resources/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/resources/:id/track | http://localhost:3000/api/v1/therapists/me/resources/:id/track | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/session-notes | http://localhost:3000/api/v1/therapists/me/session-notes | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| PUT | /api/v1/therapists/me/session-notes/:sessionId | http://localhost:3000/api/v1/therapists/me/session-notes/:sessionId | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/sessions | http://localhost:3000/api/v1/therapists/me/sessions | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/sessions/:id | http://localhost:3000/api/v1/therapists/me/sessions/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| PATCH | /api/v1/therapists/me/sessions/:id | http://localhost:3000/api/v1/therapists/me/sessions/:id | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/sessions/:id/actions/cancel | http://localhost:3000/api/v1/therapists/me/sessions/:id/actions/cancel | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/sessions/:id/actions/remind | http://localhost:3000/api/v1/therapists/me/sessions/:id/actions/remind | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/sessions/:id/actions/reschedule | http://localhost:3000/api/v1/therapists/me/sessions/:id/actions/reschedule | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/sessions/:id/actions/start-live | http://localhost:3000/api/v1/therapists/me/sessions/:id/actions/start-live | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/sessions/:id/export | http://localhost:3000/api/v1/therapists/me/sessions/:id/export | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/sessions/:id/notes | http://localhost:3000/api/v1/therapists/me/sessions/:id/notes | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/sessions/:id/responses/:responseId/notes | http://localhost:3000/api/v1/therapists/me/sessions/:id/responses/:responseId/notes | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/me/sessions/:id/responses/:responseId/notes | http://localhost:3000/api/v1/therapists/me/sessions/:id/responses/:responseId/notes | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| DELETE | /api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId | http://localhost:3000/api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId | http://localhost:3000/api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| PUT | /api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId | http://localhost:3000/api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/profile | http://localhost:3000/api/v1/therapists/profile | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| POST | /api/v1/therapists/session/:id/generate-ai-note | http://localhost:3000/api/v1/therapists/session/:id/generate-ai-note | Provider/Therapist workflows and dashboards | backend/src/routes/therapist.routes.ts |
| GET | /api/v1/therapy-plan | http://localhost:3000/api/v1/therapy-plan | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| PATCH | /api/v1/therapy-plan/tasks/:id/complete | http://localhost:3000/api/v1/therapy-plan/tasks/:id/complete | Application API endpoint | backend/src/routes/patient-v1.routes.ts |
| DELETE | /api/v1/users/me | http://localhost:3000/api/v1/users/me | Application API endpoint | backend/src/routes/user.routes.ts |
| GET | /api/v1/users/me | http://localhost:3000/api/v1/users/me | Application API endpoint | backend/src/routes/user.routes.ts |
| PATCH | /api/v1/users/me | http://localhost:3000/api/v1/users/me | Application API endpoint | backend/src/routes/user.routes.ts |
| PATCH | /api/v1/users/me/password | http://localhost:3000/api/v1/users/me/password | Application API endpoint | backend/src/routes/user.routes.ts |
| POST | /api/v1/users/me/photo | http://localhost:3000/api/v1/users/me/photo | Application API endpoint | backend/src/routes/user.routes.ts |
| DELETE | /api/v1/users/me/sessions | http://localhost:3000/api/v1/users/me/sessions | Application API endpoint | backend/src/routes/user.routes.ts |
| GET | /api/v1/users/me/sessions | http://localhost:3000/api/v1/users/me/sessions | Application API endpoint | backend/src/routes/user.routes.ts |
| DELETE | /api/v1/users/me/sessions/:id | http://localhost:3000/api/v1/users/me/sessions/:id | Application API endpoint | backend/src/routes/user.routes.ts |
| POST | /api/v1/wallet/apply | http://localhost:3000/api/v1/wallet/apply | Wallet/balance operations | backend/src/routes/wallet.routes.ts |
| GET | /api/v1/wallet/balance | http://localhost:3000/api/v1/wallet/balance | Wallet/balance operations | backend/src/routes/wallet.routes.ts |
| GET | /api/v1/wallet/transactions | http://localhost:3000/api/v1/wallet/transactions | Wallet/balance operations | backend/src/routes/wallet.routes.ts |
| POST | /api/webhooks/agora | http://localhost:3000/api/webhooks/agora | Inbound webhook integration endpoint | backend/src/routes/webhook.routes.ts |
| POST | /api/webhooks/crisis | http://localhost:3000/api/webhooks/crisis | Inbound webhook integration endpoint | backend/src/routes/webhook.routes.ts |
| POST | /api/webhooks/jitsi/events | http://localhost:3000/api/webhooks/jitsi/events | Inbound webhook integration endpoint | backend/src/routes/webhook.routes.ts |
| POST | /api/webhooks/phonepe | http://localhost:3000/api/webhooks/phonepe | Inbound webhook integration endpoint | backend/src/routes/webhook.routes.ts |
| POST | /api/webhooks/zoho-flow | http://localhost:3000/api/webhooks/zoho-flow | Inbound webhook integration endpoint | backend/src/routes/webhook.routes.ts |
| POST | /api/webhooks/zoho-sign | http://localhost:3000/api/webhooks/zoho-sign | Inbound webhook integration endpoint | backend/src/routes/webhook.routes.ts |
| GET | /health | http://localhost:3000/health | Service health/status endpoint | backend/src/app.ts |
| GET | /metrics | http://localhost:3000/metrics | Platform metrics endpoint | backend/src/app.ts |

## 2) Frontend Routes (UI Links)
| Route | Local Link | What It Does |
|---|---|---|
| / | http://localhost:5173/#/ | Landing page |
| /* | http://localhost:5173/#/* | Application UI route |
| /admin | http://localhost:5173/#/admin | Admin portal pages |
| /admin-portal/login | http://localhost:5173/#/admin-portal/login | Admin portal pages |
| /admin/compliance | http://localhost:5173/#/admin/compliance | Admin portal pages |
| /admin/compliance-documents | http://localhost:5173/#/admin/compliance-documents | Admin portal pages |
| /admin/compliance-status | http://localhost:5173/#/admin/compliance-status | Admin portal pages |
| /ai-chat | http://localhost:5173/#/ai-chat | Application UI route |
| /assessment | http://localhost:5173/#/assessment | Application UI route |
| /auth/login | http://localhost:5173/#/auth/login | Login/signup authentication UI |
| /auth/signup | http://localhost:5173/#/auth/signup | Login/signup authentication UI |
| /book/:providerId | http://localhost:5173/#/book/:providerId | Application UI route |
| /cert/:slug | http://localhost:5173/#/cert/:slug | Certification learning flow |
| /certification/assignment/:lessonId | http://localhost:5173/#/certification/assignment/:lessonId | Certification learning flow |
| /certification/lessons/:moduleId | http://localhost:5173/#/certification/lessons/:moduleId | Certification learning flow |
| /certification/modules/:enrollmentId | http://localhost:5173/#/certification/modules/:enrollmentId | Certification learning flow |
| /certification/quiz/:enrollmentId | http://localhost:5173/#/certification/quiz/:enrollmentId | Certification learning flow |
| /certifications | http://localhost:5173/#/certifications | Certification learning flow |
| /certifications/:slug | http://localhost:5173/#/certifications/:slug | Certification learning flow |
| /certifications/assignments/:assignmentId | http://localhost:5173/#/certifications/assignments/:assignmentId | Certification learning flow |
| /certifications/certificate/:enrollmentId | http://localhost:5173/#/certifications/certificate/:enrollmentId | Certification learning flow |
| /certifications/details | http://localhost:5173/#/certifications/details | Certification learning flow |
| /certifications/lessons/:lessonId | http://localhost:5173/#/certifications/lessons/:lessonId | Certification learning flow |
| /certifications/modules/:enrollmentId | http://localhost:5173/#/certifications/modules/:enrollmentId | Certification learning flow |
| /certifications/quiz/:enrollmentId | http://localhost:5173/#/certifications/quiz/:enrollmentId | Certification learning flow |
| /checkout | http://localhost:5173/#/checkout | Payment/checkout/subscription UI |
| /checkout/:slug | http://localhost:5173/#/checkout/:slug | Payment/checkout/subscription UI |
| /clinic | http://localhost:5173/#/clinic | Application UI route |
| /confirmation | http://localhost:5173/#/confirmation | Application UI route |
| /confirmed | http://localhost:5173/#/confirmed | Application UI route |
| /corporate | http://localhost:5173/#/corporate | Corporate portal pages |
| /corporate/account/help | http://localhost:5173/#/corporate/account/help | Corporate portal pages |
| /corporate/analytics | http://localhost:5173/#/corporate/analytics | Corporate portal pages |
| /corporate/billing/invoices | http://localhost:5173/#/corporate/billing/invoices | Corporate portal pages |
| /corporate/billing/payment-methods | http://localhost:5173/#/corporate/billing/payment-methods | Corporate portal pages |
| /corporate/billing/plan | http://localhost:5173/#/corporate/billing/plan | Corporate portal pages |
| /corporate/dashboard | http://localhost:5173/#/corporate/dashboard | Corporate portal pages |
| /corporate/employees/allocation | http://localhost:5173/#/corporate/employees/allocation | Corporate portal pages |
| /corporate/employees/directory | http://localhost:5173/#/corporate/employees/directory | Corporate portal pages |
| /corporate/employees/enrollment | http://localhost:5173/#/corporate/employees/enrollment | Corporate portal pages |
| /corporate/login | http://localhost:5173/#/corporate/login | Corporate portal pages |
| /corporate/reports/engagement | http://localhost:5173/#/corporate/reports/engagement | Corporate portal pages |
| /corporate/reports/utilization | http://localhost:5173/#/corporate/reports/utilization | Corporate portal pages |
| /corporate/reports/wellbeing | http://localhost:5173/#/corporate/reports/wellbeing | Corporate portal pages |
| /corporate/sso | http://localhost:5173/#/corporate/sso | Corporate portal pages |
| /crisis | http://localhost:5173/#/crisis | Application UI route |
| /dashboard | http://localhost:5173/#/dashboard | Application UI route |
| /enrollment-confirmed | http://localhost:5173/#/enrollment-confirmed | Application UI route |
| /enrollment-registration | http://localhost:5173/#/enrollment-registration | Application UI route |
| /how-it-works | http://localhost:5173/#/how-it-works | Application UI route |
| /journey | http://localhost:5173/#/journey | Application UI route |
| /journey-wireframe | http://localhost:5173/#/journey-wireframe | Application UI route |
| /legal/therapist-data-processing | http://localhost:5173/#/legal/therapist-data-processing | Legal/policy pages |
| /legal/therapist-ic-agreement | http://localhost:5173/#/legal/therapist-ic-agreement | Legal/policy pages |
| /legal/therapist-nda | http://localhost:5173/#/legal/therapist-nda | Legal/policy pages |
| /login | http://localhost:5173/#/login | Application UI route |
| /my-certifications | http://localhost:5173/#/my-certifications | Certification learning flow |
| /my-digital-clinic | http://localhost:5173/#/my-digital-clinic | Application UI route |
| /onboarding/email | http://localhost:5173/#/onboarding/email | Application UI route |
| /onboarding/name | http://localhost:5173/#/onboarding/name | Application UI route |
| /onboarding/provider-setup | http://localhost:5173/#/onboarding/provider-setup | Application UI route |
| /patient | http://localhost:5173/#/patient | Patient app pages |
| /payment-failed | http://localhost:5173/#/payment-failed | Payment/checkout/subscription UI |
| /payment-landing | http://localhost:5173/#/payment-landing | Payment/checkout/subscription UI |
| /payment-success | http://localhost:5173/#/payment-success | Payment/checkout/subscription UI |
| /payment/status | http://localhost:5173/#/payment/status | Payment/checkout/subscription UI |
| /plans | http://localhost:5173/#/plans | Payment/checkout/subscription UI |
| /plans/addons | http://localhost:5173/#/plans/addons | Payment/checkout/subscription UI |
| /privacy | http://localhost:5173/#/privacy | Legal/policy pages |
| /profile | http://localhost:5173/#/profile | Application UI route |
| /provider | http://localhost:5173/#/provider | Provider-side pages |
| /provider/checkout | http://localhost:5173/#/provider/checkout | Provider-side pages |
| /provider/confirmation | http://localhost:5173/#/provider/confirmation | Provider-side pages |
| /provider/onboarding | http://localhost:5173/#/provider/onboarding | Provider-side pages |
| /provider/plans | http://localhost:5173/#/provider/plans | Provider-side pages |
| /provider/plans/addons | http://localhost:5173/#/provider/plans/addons | Provider-side pages |
| /provider/platform-payment | http://localhost:5173/#/provider/platform-payment | Provider-side pages |
| /provider/verification-pending | http://localhost:5173/#/provider/verification-pending | Provider-side pages |
| /providers/:id | http://localhost:5173/#/providers/:id | Provider-side pages |
| /psychiatrist/* | http://localhost:5173/#/psychiatrist/* | Provider-side pages |
| /psychiatrist/live-session/:sessionId | http://localhost:5173/#/psychiatrist/live-session/:sessionId | Provider-side pages |
| /psychologist/* | http://localhost:5173/#/psychologist/* | Provider-side pages |
| /psychologist/live-session/:sessionId | http://localhost:5173/#/psychologist/live-session/:sessionId | Provider-side pages |
| /refunds | http://localhost:5173/#/refunds | Application UI route |
| /register | http://localhost:5173/#/register | Application UI route |
| /registration | http://localhost:5173/#/registration | Application UI route |
| /results | http://localhost:5173/#/results | Application UI route |
| /sessions | http://localhost:5173/#/sessions | Application UI route |
| /sessions/:id/live | http://localhost:5173/#/sessions/:id/live | Live session page |
| /settings | http://localhost:5173/#/settings | Application UI route |
| /terms | http://localhost:5173/#/terms | Legal/policy pages |
| /therapist-dashboard | http://localhost:5173/#/therapist-dashboard | Provider-side pages |
| /therapist/* | http://localhost:5173/#/therapist/* | Provider-side pages |
| /therapist/live-session/:sessionId | http://localhost:5173/#/therapist/live-session/:sessionId | Provider-side pages |
| /universal/checkout | http://localhost:5173/#/universal/checkout | Payment/checkout/subscription UI |
| /universal/payment-success | http://localhost:5173/#/universal/payment-success | Payment/checkout/subscription UI |
| /verify/:certId | http://localhost:5173/#/verify/:certId | Application UI route |
| /video-session/:sessionId | http://localhost:5173/#/video-session/:sessionId | Live session page |

## 3) Frontend-Called API Paths (from `frontend/src/api/*`)
| API Path / URL | Typical Layer | Purpose Hint |
|---|---|---|
| /api/ | Backend API called by frontend | Application API endpoint |
| /api/v1/admin/reports/export/${encodeURIComponent(jobId)}/download | Backend API called by frontend | Admin management/analytics operations |
| /api/v1/system/activate | Backend API called by frontend | Application API endpoint |
| /api/v1/therapists/me/sessions/${encodeURIComponent(sessionId)}/actions/cancel | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /api/v1/therapists/me/sessions/${encodeURIComponent(sessionId)}/actions/remind | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /api/v1/therapists/me/sessions/${encodeURIComponent(sessionId)}/actions/reschedule | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /api/v1/therapists/me/sessions/${encodeURIComponent(sessionId)}/actions/start-live | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /api/v1/therapists/me/sessions/${encodeURIComponent(sessionId)}/export?format=${format} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /api/v1/therapists/me/sessions/${encodeURIComponent(sessionId)}/responses/${encodeURIComponent(responseId)}/notes/${encodeURIComponent(noteId)} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /api/v1/therapists/me/templates/${encodeURIComponent(templateId)}/actions/duplicate | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/ | Backend API called by frontend | Application API endpoint |
| /v1/${url} | Backend API called by frontend | Application API endpoint |
| /v1/admin/analytics/bi-summary | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/analytics/health | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/analytics/marketplace | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/analytics/payments?days=${encodeURIComponent(String(days))} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/analytics/providers | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/analytics/revenue | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/analytics/summary${query} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/analytics/templates${query} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/analytics/therapist-performance | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/analytics/users | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/analytics/utilization${query} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/approve-provider/${encodeURIComponent(providerUserId)} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/audit | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/blueprints/status | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/company-reports | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/crisis/${id}/respond | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/crisis/alerts | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/feedback | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/feedback/${id}/resolve | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/groups | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/groups/${id} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/live-sessions | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/metrics | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/metrics/live | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/modules/${encodeURIComponent(module)}/summary | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/offers | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/offers/${id} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/offers/publish | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/offers/reorder | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/payouts | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/payouts/${encodeURIComponent(payoutId)}/approve | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/pricing | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/pricing/contracts | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/pricing/contracts/${id}/approve | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/pricing/contracts/draft | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/pricing/free-toggle | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/qr-codes | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/qr-codes/${encodeURIComponent(code)} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/rbac/platform-admins | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/reports/export | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/reports/export/${jobId} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/roles | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/roles/${role} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/screening/options/${encodeURIComponent(optionId)} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/screening/questions/${encodeURIComponent(questionId)} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/screening/questions/${encodeURIComponent(questionId)}/options | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/screening/templates | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/screening/templates/${encodeURIComponent(templateId)} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/screening/templates/${encodeURIComponent(templateId)}/questions | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/screening/templates/${encodeURIComponent(templateId)}/scoring-bands | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/screening/templates/defaults/${encodeURIComponent(templateKey)}/ensure | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/subscriptions${query} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/tickets | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/tickets/${ticketId}/comment | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/users/${encodeURIComponent(userId)} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/users${query} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/verifications | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/verifications/${encodeURIComponent(userId)} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/verifications/${encodeURIComponent(userId)}/documents | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/verify-provider/${encodeURIComponent(therapistId)} | Backend API called by frontend | Admin management/analytics operations |
| /v1/admin/waive-subscription | Backend API called by frontend | Admin management/analytics operations |
| /v1/assessments/phq9 | Backend API called by frontend | Application API endpoint |
| /v1/assessments/submit | Backend API called by frontend | Application API endpoint |
| /v1/auth/login | Backend API called by frontend | Authentication and session actions |
| /v1/auth/login/google | Backend API called by frontend | Authentication and session actions |
| /v1/auth/logout | Backend API called by frontend | Authentication and session actions |
| /v1/auth/me | Backend API called by frontend | Authentication and session actions |
| /v1/auth/signup/phone | Backend API called by frontend | Authentication and session actions |
| /v1/auth/verify/phone-otp | Backend API called by frontend | Authentication and session actions |
| /v1/cbt-sessions/library/clone | Backend API called by frontend | Application API endpoint |
| /v1/cbt-sessions/templates/${templateId}/history | Backend API called by frontend | Application API endpoint |
| /v1/cbt-sessions/templates/${templateId}/versions/${versionId}/duplicate | Backend API called by frontend | Application API endpoint |
| /v1/cbt-sessions/templates/${templateId}/versions/compare?v1=${v1}&v2=${v2} | Backend API called by frontend | Application API endpoint |
| /v1/certifications | Backend API called by frontend | Certification catalog/enrollment operations |
| /v1/certifications/${encodeURIComponent(id)} | Backend API called by frontend | Certification catalog/enrollment operations |
| /v1/corporate/campaigns | Backend API called by frontend | Corporate portal management |
| /v1/corporate/companies | Backend API called by frontend | Corporate portal management |
| /v1/corporate/dashboard | Backend API called by frontend | Corporate portal management |
| /v1/corporate/employees | Backend API called by frontend | Corporate portal management |
| /v1/corporate/employees/bulk-upload | Backend API called by frontend | Corporate portal management |
| /v1/corporate/invoices | Backend API called by frontend | Corporate portal management |
| /v1/corporate/payment-methods | Backend API called by frontend | Payment and billing processing |
| /v1/corporate/payment-methods/${id} | Backend API called by frontend | Payment and billing processing |
| /v1/corporate/programs | Backend API called by frontend | Corporate portal management |
| /v1/corporate/public/create-account | Backend API called by frontend | Corporate portal management |
| /v1/corporate/public/request-demo | Backend API called by frontend | Corporate portal management |
| /v1/corporate/public/request-otp | Backend API called by frontend | Corporate portal management |
| /v1/corporate/reports | Backend API called by frontend | Corporate portal management |
| /v1/corporate/roi | Backend API called by frontend | Corporate portal management |
| /v1/corporate/session-allocation | Backend API called by frontend | Corporate portal management |
| /v1/corporate/settings | Backend API called by frontend | Corporate portal management |
| /v1/corporate/workshops | Backend API called by frontend | Corporate portal management |
| /v1/free-screening/${encodeURIComponent(attemptId)}/submit/me | Backend API called by frontend | Screening and intake assessments |
| /v1/free-screening/history | Backend API called by frontend | Screening and intake assessments |
| /v1/free-screening/start/me | Backend API called by frontend | Screening and intake assessments |
| /v1/game/eligibility | Backend API called by frontend | Application API endpoint |
| /v1/game/play | Backend API called by frontend | Application API endpoint |
| /v1/game/winners | Backend API called by frontend | Application API endpoint |
| /v1/group-therapy/admin/requests | Backend API called by frontend | Admin management/analytics operations |
| /v1/group-therapy/admin/requests/${encodeURIComponent(id)}/publish | Backend API called by frontend | Admin management/analytics operations |
| /v1/group-therapy/admin/requests/${encodeURIComponent(id)}/review | Backend API called by frontend | Admin management/analytics operations |
| /v1/group-therapy/private/invites | Backend API called by frontend | Group therapy and invite operations |
| /v1/group-therapy/private/invites/${encodeURIComponent(inviteId)}/payment-intent | Backend API called by frontend | Payment and billing processing |
| /v1/group-therapy/private/invites/${encodeURIComponent(inviteId)}/respond | Backend API called by frontend | Group therapy and invite operations |
| /v1/group-therapy/private/invites/mine | Backend API called by frontend | Group therapy and invite operations |
| /v1/group-therapy/private/patients | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/group-therapy/public/sessions | Backend API called by frontend | Group therapy and invite operations |
| /v1/group-therapy/public/sessions/${encodeURIComponent(sessionId)}/join/payment-intent | Backend API called by frontend | Payment and billing processing |
| /v1/group-therapy/requests | Backend API called by frontend | Group therapy and invite operations |
| /v1/group-therapy/requests/mine | Backend API called by frontend | Group therapy and invite operations |
| /v1/landing/metrics | Backend API called by frontend | Platform metrics endpoint |
| /v1/mood/${encodeURIComponent(userId)}/accuracy | Backend API called by frontend | Application API endpoint |
| /v1/mood/${encodeURIComponent(userId)}/history | Backend API called by frontend | Application API endpoint |
| /v1/mood/${encodeURIComponent(userId)}/prediction | Backend API called by frontend | Application API endpoint |
| /v1/notifications | Backend API called by frontend | Application API endpoint |
| /v1/notifications/${encodeURIComponent(id)}/read | Backend API called by frontend | Application API endpoint |
| /v1/patient-journey/clinical-assessment | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient-journey/quick-screening | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient-journey/recommendation | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient-journey/select-pathway | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/appointments/confirm-slot | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/appointments/payment-pending | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/appointments/request | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/appointments/requests/pending | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/appointments/smart-match | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/care-team | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/cbt-assignments/${encodeURIComponent(assignmentId)} | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/cbt-assignments/active | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/daily-checkin | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/dashboard | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/documents | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/documents/${encodeURIComponent(id)}/download | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/documents/upload | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/exercises | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/exercises/${encodeURIComponent(id)}/complete | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/exercises/library | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/insights | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/invoices | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/invoices/${encodeURIComponent(id)}/download | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/messages | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/messages/${encodeURIComponent(conversationId)} | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/messages/${encodeURIComponent(conversationId)}/read | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/messages/conversations | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/messages/start | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/mood | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/mood/history | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/mood/stats | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/mood/today | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/payment-method | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/pets/state | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/progress | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/providers/available | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/providers/smart-match?${query} | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/records/${encodeURIComponent(id)}/share | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/records/${encodeURIComponent(id)}/url | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/reports | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/reports/health-summary | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/reports/shared/${encodeURIComponent(id)} | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/reports/shared/${encodeURIComponent(id)}/download | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/settings | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/subscription | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/subscription/auto-renew | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/subscription/cancel | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/subscription/checkout | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/subscription/downgrade | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/subscription/reactivate | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/subscription/upgrade | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/support | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patient/support/tickets | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patients/me/profile | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/patients/profile | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/payments/sessions | Backend API called by frontend | Payment and billing processing |
| /v1/payments/verify | Backend API called by frontend | Payment and billing processing |
| /v1/pricing | Backend API called by frontend | Plans/pricing retrieval and management |
| /v1/provider/appointments/${appointmentRequestId}/accept | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/appointments/${appointmentRequestId}/reject | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/appointments/pending | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/calendar | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/care-team | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/care-team/${patientId} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/dashboard | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/earnings | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/lead-stats | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/leads | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/marketplace | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/marketplace/purchase | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/meeting-link/${encodeURIComponent(sessionId)} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/messages | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/messages/${conversationId} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/messages/conversations | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/onboarding | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/patient/${patientId}/assessments | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/assign | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/cbt | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/cbt/${moduleId}/review | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/documents | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/goals | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/goals/${goalId} | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/goals/${goalId}/message | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/labs | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/labs/${labId} | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/notes | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/notes/${noteId} | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/overview | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/prescriptions | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/prescriptions/${prescriptionId} | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/sessions/schedule | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/weekly-plan | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patient/${patientId}/weekly-plan/publish | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/patients | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/provider/plans | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/platform-access | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/platform-access/initiate | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/settings | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/subscription | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/subscription/cancel | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/subscription/checkout | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/provider/subscription/upgrade | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/providers | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/providers/${encodeURIComponent(id)} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/psychiatrist/me/assessment-drafts/${encodeURIComponent(patientId)} | Backend API called by frontend | Application API endpoint |
| /v1/psychiatrist/me/assessment-templates | Backend API called by frontend | Application API endpoint |
| /v1/psychiatrist/me/assessments | Backend API called by frontend | Application API endpoint |
| /v1/psychiatrist/me/dashboard | Backend API called by frontend | Application API endpoint |
| /v1/psychiatrist/me/drug-interactions/check | Backend API called by frontend | Application API endpoint |
| /v1/psychiatrist/me/follow-ups | Backend API called by frontend | Application API endpoint |
| /v1/psychiatrist/me/medication-history | Backend API called by frontend | Application API endpoint |
| /v1/psychiatrist/me/medication-library | Backend API called by frontend | Application API endpoint |
| /v1/psychiatrist/me/parameter-tracking/${encodeURIComponent(patientId)} | Backend API called by frontend | Application API endpoint |
| /v1/psychiatrist/me/patients | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/psychiatrist/me/prescriptions | Backend API called by frontend | Application API endpoint |
| /v1/psychiatrist/me/self-mode | Backend API called by frontend | Application API endpoint |
| /v1/psychiatrist/me/settings | Backend API called by frontend | Application API endpoint |
| /v1/psychologist/me/assessments | Backend API called by frontend | Application API endpoint |
| /v1/psychologist/me/dashboard | Backend API called by frontend | Application API endpoint |
| /v1/psychologist/me/messages | Backend API called by frontend | Application API endpoint |
| /v1/psychologist/me/patient-reports | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/psychologist/me/patient-reports/${encodeURIComponent(cloneId)}/share | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/psychologist/me/patients | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/psychologist/me/patients/${encodeURIComponent(patientId)}/overview | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/psychologist/me/reports | Backend API called by frontend | Application API endpoint |
| /v1/psychologist/me/reports/${encodeURIComponent(reportId)}/clone-for-patient | Backend API called by frontend | Application API endpoint |
| /v1/psychologist/me/schedule | Backend API called by frontend | Application API endpoint |
| /v1/psychologist/me/tests | Backend API called by frontend | Application API endpoint |
| /v1/risk/${encodeURIComponent(userId)}/current | Backend API called by frontend | Application API endpoint |
| /v1/sessions/${encodeURIComponent(id)} | Backend API called by frontend | Application API endpoint |
| /v1/sessions/${encodeURIComponent(id)}/documents/invoice | Backend API called by frontend | Application API endpoint |
| /v1/sessions/${encodeURIComponent(id)}/documents/session-pdf | Backend API called by frontend | Application API endpoint |
| /v1/sessions/book | Backend API called by frontend | Application API endpoint |
| /v1/sessions/history | Backend API called by frontend | Application API endpoint |
| /v1/sessions/upcoming | Backend API called by frontend | Application API endpoint |
| /v1/sso/${tenantKey} | Backend API called by frontend | Application API endpoint |
| /v1/sso/${tenantKey}/invite | Backend API called by frontend | Application API endpoint |
| /v1/sso/${tenantKey}/test | Backend API called by frontend | Application API endpoint |
| /v1/sso/tenant/me | Backend API called by frontend | Application API endpoint |
| /v1/therapists/me/analytics/sessions?${qp.join( | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/analytics/summary | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/assessments | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/care-team | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/care-team/${encodeURIComponent(id)} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/cbt-modules | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/cbt-modules/${encodeURIComponent(id)} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/dashboard | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/earnings | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/exercises | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/exercises/${encodeURIComponent(id)} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/exercises/${encodeURIComponent(id)}/track | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/messages | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/notes | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/patients | Backend API called by frontend | Patient dashboard, sessions, reports, or profile flows |
| /v1/therapists/me/payout-history | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/resources | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/resources/${encodeURIComponent(id)} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/resources/${encodeURIComponent(id)}/track | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/session-notes | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/session-notes/${encodeURIComponent(sessionId)} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/sessions | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/sessions/${encodeURIComponent(sessionId)} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/sessions/${encodeURIComponent(sessionId)}/responses/${encodeURIComponent(responseId)}/notes | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/me/sessions/${encodeURIComponent(sessionId)}/responses/${encodeURIComponent(responseId)}/notes/${encodeURIComponent(noteId)} | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapists/session/${encodeURIComponent(sessionId)}/generate-ai-note | Backend API called by frontend | Provider/Therapist workflows and dashboards |
| /v1/therapy-plan | Backend API called by frontend | Application API endpoint |
| /v1/therapy-plan/tasks/${encodeURIComponent(id)}/complete | Backend API called by frontend | Application API endpoint |
| /v1/users/me/password | Backend API called by frontend | Application API endpoint |
| /v1/users/me/sessions | Backend API called by frontend | Application API endpoint |
| /v1/users/me/sessions/${encodeURIComponent(id)} | Backend API called by frontend | Application API endpoint |
| /v1/users/me/sessions/session-uuid | Backend API called by frontend | Application API endpoint |
| /v1/wallet/apply | Backend API called by frontend | Wallet/balance operations |
| /v1/wallet/balance | Backend API called by frontend | Wallet/balance operations |
| /v1${url} | Backend API called by frontend | Application API endpoint |

## 4) Differentiation Summary
- Backend APIs: anything under `/api` or `/api/v1` served by backend Express routes.
- Frontend routes: hash URLs under `http://localhost:5173/#/...` rendered by React Router.
- External URLs: absolute `http(s)://...` entries (e.g., Watti endpoints) used by integrations.
