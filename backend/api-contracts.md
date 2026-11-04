# LUXE STORE API contracts

All routes execute server-side. They must return unavailable responses until required providers, migrations, authorization and tests are ready.

## Public
- GET /api/health — configuration presence only; never expose secret values.
- GET /api/products — published catalogue only; explicit public fields and bounded result set. Uses currency-neutral `price_amount` and `currency_code`.
- GET /api/products/:id — planned public product detail.

## Authenticated customer
- GET /api/me — own profile only, derived from verified Clerk session.
- PATCH /api/me — planned allowlisted profile fields only.
- POST /api/verification-requests — planned applicant-owned request; no identity-document uploads until private storage, retention and review controls are approved.

## Seller applications and listings
- GET /api/seller/applications — authenticated applicant's own application history.
- POST /api/seller/applications — create a pending application; user ID comes only from verified session. Requires an existing profile row and seller-application migration.
- GET /api/seller/products — approved seller's own listings.
- POST /api/seller/products — create a draft owned by the authenticated seller; browser cannot set seller ID or publication status.
- PATCH /api/seller/products/:id — edit only the authenticated seller's own draft.
- Product publishing and moderation are not implemented yet; drafts are not public.

## Owner-only administration
- GET /api/admin/seller-applications — owner-only pending seller review queue.
- POST /api/admin/seller-applications/:id/decision — owner-only human decision; approval assigns seller role and writes an audit event in one database statement.
- GET /api/admin/verification-requests — planned authorized reviewer queue.
- POST /api/admin/verification-requests/:id/decision — planned human decision and audit.
- GET /api/admin/audit — planned narrowly scoped audit access.

## Assistant endpoints (future)
- POST /api/ai/dama — authenticated, rate-limited, public-catalogue-grounded assistant.
- POST /api/ai/vicky/review-summary — authorized reviewer workflow only; assistance only, never a decision or badge mutation.

## Shared response rules
- JSON responses; explicit method handling.
- Cache-Control: no-store for private/authenticated routes.
- Consistent errors; no stack traces or provider details.
- Validate content type, body size, schemas, IDs, and allowed fields.
- Never trust client-provided roles, user IDs, prices, ownership, or verification status.
- Never expose database or model-provider credentials.
- Audit privileged admin mutations and test denied access paths.
- Add shared rate limiting before opening these endpoints to public traffic.
- Seller approval is a human decision; submitting an application never grants seller privileges.
