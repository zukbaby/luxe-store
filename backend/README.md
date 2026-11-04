# LUXE STORE backend foundation

## Current state
The deployed site is a static HTML prototype. Serverless API scaffolding is being added on the development branch; it is not a live account or marketplace service until providers are connected, migrations are applied, and security tests pass.

## Proposed stack
- Vercel Functions for server-side APIs.
- Neon Postgres for persistent marketplace data.
- Clerk for managed sign-in and verified sessions.
- Vercel AI Gateway / AI SDK for DAMA only after authentication, rate limits and data boundaries are in place.

## Implemented server-side foundation
- `api/health.js`: reports configuration presence only.
- `api/me.js`: authenticated read of the caller's own profile.
- `api/products.js`: public read of published products only, bounded to 60 rows, with currency-neutral prices.
- `api/seller/applications.js`: authenticated application submission and own application history.
- `api/seller/products.js`: approved sellers can create drafts and list their own products.
- `api/seller/products/[id].js`: seller can edit only their own draft.
- `api/admin/seller-applications.js`: owner-only pending seller review queue.
- `api/admin/seller-applications/[id]/decision.js`: owner-only human approval/rejection, seller-role assignment on approval, and audit event in one SQL statement.
- `api/_lib/auth.js`: verifies Clerk tokens server-side.
- `api/_lib/authorization.js`: owner check based on the verified session and server-side owner ID.

## Data model
- `schema.sql`: profiles, products, verification requests and admin audit log.
- `migrations/002_marketplace_expansion.sql`: renames the legacy GMD-only price field to currency-neutral `price_amount`, adds ISO currency/category fields, and creates seller applications. Review and apply only after Neon is provisioned and backed up.
- Row-level security is enabled without permissive browser policies. Server APIs use verified identity and least privilege.

## Important prerequisites and gaps
- Seller application submission requires a profile row created by a trusted sign-in provisioning flow; that flow is not yet implemented.
- Product publishing/moderation is not implemented. Seller-created records remain drafts and are not public.
- Shared rate limiting, body-size enforcement at the edge, CSRF/origin policy for cookie-authenticated writes, and full integration tests are still required before public launch.
- The database migration has not been applied and no live provider credentials are configured.
- No identity documents or payment proofs are collected by these endpoints.

## Security rules
1. Never accept an admin or seller role from a browser form, query parameter or local storage.
2. Admin access must be granted through a server-controlled allowlist/claim and checked on every protected API request.
3. Customers may only read/update their own allowed profile fields.
4. Sellers may only manage their own products; public reads are limited to published products.
5. Seller applications remain pending until human owner review. Submission never grants seller access.
6. Verification documents, if ever required, must use private storage with strict access controls and an approved retention policy.
7. Every verification decision and privileged admin mutation must create an audit record.
8. Add shared rate limiting to sign-in, seller applications, DAMA requests and all write endpoints before public traffic.
9. Keep provider secrets and database credentials in Vercel environment variables; never commit them or expose them to browser code.

## Provisioning gate
A database/auth Marketplace connection can require provider authorization, account ownership, or billing approval. Do not provision or enable paid services without the account owner/authorized adult completing the provider's approval flow.

## Next implementation sequence
1. Authorize and connect Neon Postgres and Clerk in the Vercel project.
2. Configure development/preview/production environment variables and verified owner user ID.
3. Integrate the Clerk browser sign-in UI with the existing static pages and implement trusted profile provisioning.
4. Apply and test the schema and least-privilege policies.
5. Add shared rate limiting and CSRF/origin protections for authenticated writes.
6. Build seller product submission-for-review and owner moderation endpoints.
7. Connect DAMA through the AI Gateway with server-side rate limits and safety boundaries.
8. Run end-to-end security tests before exposing any real-user functionality.

## Owner-only feature
Animated GIF/video profile banners (up to five seconds) remain disabled for all users except the store owner until the owner explicitly enables wider access.


## Latest frontend/API integration batch
- `index.html` now requests the public published-product API and falls back to clearly labelled sample listings when the live catalogue is unavailable.
- `accounts.html` now reads and updates only the signed-in user's display name through `/api/me`. The server creates a customer profile from the verified session; clients cannot set roles or verification state.
- `seller.html` now submits seller applications and product drafts through authenticated APIs and displays server responses. It no longer pretends browser-local drafts are persistent marketplace records.
- `admin.html` now reads the owner-protected seller review queue and sends explicit approve/reject decisions to the audited server endpoint.
- Mutating profile, seller and review endpoints now require same-origin requests and enforce a 16 KB JSON body limit.
- JavaScript syntax checks passed for the updated API handlers and inline scripts in the storefront, account, seller and admin pages.

## Still blocked before real users can transact
- Clerk is installed at the Vercel team/account level, but its installation currently has no LUXE STORE project selected. The project's Clerk environment-variable entries exist but have empty values; no usable Clerk application credentials are present yet. Neon is not connected.
- `backend/schema.sql` and `backend/migrations/002_marketplace_expansion.sql` have not been applied or tested against a staging database.
- A Clerk browser sign-in page has been added on the development branch, but it cannot initialise until Vercel provisions the Clerk keys and Google sign-in is enabled in the Clerk application.
- Shared rate limiting, product submission-for-review/publishing, checkout, payment processing, payouts and order management are not enabled.
- Seller approval APIs are implemented but cannot run until authentication, owner ID and database setup are complete.
- These changes are on the development branch only. A new Vercel preview deployment is currently blocked by Vercel's 24-hour deployment creation limit; the existing READY preview still points to an older commit.
