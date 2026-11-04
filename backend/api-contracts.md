# LUXE STORE API contracts

All routes execute server-side. They must return unavailable responses until required providers, migrations, authorization and tests are ready.

## Public
- GET /api/health — configuration presence only; never expose secret values.
- GET /api/products — published catalogue only; returns explicit public fields and a bounded result set.
- GET /api/products/:id — planned public product detail.

## Authenticated customer
- GET /api/me — own profile only, derived from verified Clerk session.
- PATCH /api/me — planned allowlisted profile fields only.
- POST /api/verification-requests — planned applicant-owned request; do not accept identity-document uploads until private storage, retention and review controls are approved.

## Seller applications and listings
- POST /api/seller/applications — planned seller application; user ID comes only from verified session; application remains pending until human owner review.
- GET /api/seller/products — planned own listings only.
- POST /api/seller/products — planned draft creation; role and ownership come from server-side profile.
- PATCH /api/seller/products/:id — planned update of own draft only.
- POST /api/seller/products/:id/submit — planned submit for moderation.

## Authenticated admin
- GET /api/admin/verification-requests — authorized reviewer queue.
- GET /api/admin/seller-applications — owner-only seller review queue.
- POST /api/admin/seller-applications/:id/decision — human decision only; require owner authorization and audit record.
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
- Audit privileged admin mutations and test denied access paths.
- Rate-limit sign-in, applications, catalogue writes, DAMA requests and all write endpoints.
- Seller approval is a human decision; submitting an application never grants seller privileges.
