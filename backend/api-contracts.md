# LUXE STORE API contracts (planned)

All routes below are contracts for future implementation. Until database and authentication providers are configured, endpoints must return an unavailable response and must not read or mutate private data.

## Public
- GET /api/health — configuration presence only; never expose secret values.
- GET /api/products — future published catalogue; only active, public fields.
- GET /api/products/:id — future public product detail.

## Authenticated customer
- GET /api/me — own profile only.
- PATCH /api/me — allowlisted profile fields only.
- POST /api/verification-requests — applicant-owned request; private evidence uploaded only through a secure provider workflow.

## Authenticated seller
- POST /api/seller/products — create a draft owned by current seller.
- PATCH /api/seller/products/:id — update own draft only.
- POST /api/seller/products/:id/submit — submit own draft for moderation.

## Authenticated admin
- GET /api/admin/verification-requests — authorized reviewer queue.
- GET /api/admin/verification-requests/:id — restricted case details.
- POST /api/admin/verification-requests/:id/decision — human decision only; require admin role, reason, and audit record.
- GET /api/admin/audit — narrowly scoped audit access.

## Assistant endpoints (future)
- POST /api/ai/dama — authenticated, rate-limited, public-catalogue-grounded assistant.
- POST /api/ai/vicky/review-summary — authorized reviewer workflow only; assistance only, never a decision or badge mutation.

## Shared response rules
- JSON responses; explicit method handling.
- Cache-Control: no-store for private/authenticated routes.
- Consistent errors with request IDs; no stack traces or provider details.
- Validate content type, body size, schemas, IDs, and allowed fields.
- Never trust client-provided roles, user IDs, prices, ownership, or verification status.
- Never expose database or model-provider credentials.
- Audit admin mutations and test denied access paths.
