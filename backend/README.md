# LUXE STORE backend foundation

## Current state
The deployed site remains a preview until providers and migrations are configured. The cooldown branch now contains real server-side API implementations for several workflows, but none is production-live until staging setup and tests are complete.

## Proposed stack
- **Vercel Functions** for server-side APIs.
- **Neon Postgres** for persistent marketplace data.
- **Clerk** for managed sign-in and verified sessions.
- **Vercel AI Gateway / AI SDK** for DAMA, added after authentication and usage limits are in place.

The repository remains a static HTML site without an application framework. A minimal package manifest and server-side Clerk/Neon runtime helpers have now been added for Vercel Functions. The account, seller, marketplace and DAMA pages now share a Clerk browser bootstrap. API endpoints still fail closed without provider credentials and a configured database.

## Data model
`schema.sql` defines profiles, products, verification requests, and an append-only-style admin audit log. Row-level security is enabled and intentionally has no permissive policies yet. This is fail-closed: it will not work as a live app until policies and server-side identity checks are implemented and tested.

## Security rules
1. Never accept an admin role from a browser form, query parameter, or local storage.
2. Admin access must be granted through a server-controlled allowlist/claim and checked on every protected API request.
3. Customers may only read/update their own allowed profile fields.
4. Sellers may only manage their own products; public reads must be limited to published products.
5. Verification documents and private identity details must use private storage with strict access controls. Do not collect identity documents until the review process and retention policy are approved.
6. Every verification decision and privileged admin mutation must create an audit record.
7. Rate-limit sign-in, verification submission, DAMA requests, and all write endpoints.
8. Keep provider secrets and database credentials in Vercel environment variables; never commit them or expose them to browser code.

## Provisioning gate
A database/auth Marketplace connection can require provider authorization, account ownership, or billing approval. Do not provision or enable paid services without the account owner/authorized adult completing the provider's approval flow.

## Next implementation sequence
1. Authorize and connect Neon Postgres and Clerk in the Vercel project.
2. Configure development/preview/production environment variables, including Clerk's authorized frontend origins and the verified owner user ID.
3. Integrate the Clerk browser sign-in UI with the existing static pages and test server-side token verification.
4. Apply and test the schema and least-privilege RLS policies.
5. Implement profile APIs and server-enforced owner/admin access with audit logging.
6. Implement seller product APIs and the human-led verification review workflow.
7. Connect DAMA through the AI Gateway with server-side rate limits, safety boundaries, and no exposure of secrets.
8. Run end-to-end tests before exposing any real-user functionality.

## Owner-only feature
Animated GIF/video profile banners (up to five seconds) remain disabled for all users except the store owner until the owner explicitly enables broader access. Static profile images remain separate from this gated feature.


## Marketplace data model expansion
`backend/migrations/002_marketplace_core.sql` adds seller storefronts, persistent carts, orders and item price snapshots, product reviews, notifications, and catalogue category/SKU/stock fields. It enables RLS on every new table without adding permissive policies, so the migration is intentionally not a live feature switch.

Before applying it, review the SQL against the selected PostgreSQL provider and apply the base `backend/schema.sql` first. Checkout must be implemented as a server-side transaction with row locks and database-derived prices and stock. Payment status must only change through verified provider webhooks. Delivery-address and identity-document storage require separate secure workflows and are intentionally not included here.


## Authentication/profile API progress
`api/me.js` now implements a narrow self-service profile endpoint using the existing server-side Clerk token verifier and Neon query helper. GET reads only the verified caller's profile; PATCH creates/updates only `display_name` and cannot set roles or verification status. Missing provider configuration fails closed. The browser sign-in/sign-up UI, provider provisioning, database setup, and staging tests remain outstanding. See `backend/auth-profile-implementation.md` before enabling this route for real users.


## Seller application workflow progress
`api/seller/applications.js` implements caller-only application history and submission. `api/admin/seller-applications.js` provides an owner-only queue and human decision endpoint. An approval promotes the applicant's role, creates a private storefront, and writes an audit entry atomically; rejection does not change the applicant's role. The new migration keeps RLS enabled with no policies, and the endpoints remain non-live until provider setup and staging review are complete.


## Cooldown branch marketplace implementation
The cooldown branch now includes public catalogue and storefront reads, authenticated seller draft creation/editing/submission, owner product review, authenticated persistent carts, public product details, verified-purchase review submission, notification inboxes, and a catalogue-grounded DAMA API. The Seller Studio, marketplace, homepage, product detail, seller storefront and DAMA pages call these APIs instead of inventing sample listings.

Seller product status flow:
- `draft`: seller-only and editable by its owner.
- `pending_review`: hidden from the public catalogue and awaiting owner review.
- `published`: visible only when the seller storefront is public and the item is in stock.
- `archived`: not publicly listed.

Product approvals/returns are owner-only, audited, and notify the seller. The public catalogue never displays draft or pending products. Persistent carts do not reserve stock; checkout must recheck and lock inventory in a database transaction.

DAMA calls the Vercel AI Gateway OpenAI-compatible endpoint from a server function, with the model ID supplied through `DAMA_MODEL`. It uses `AI_GATEWAY_API_KEY` or Vercel OIDC authentication, applies a database-backed per-user rate limit, and supplies only published public catalogue data. It is unavailable until the required environment and migrations are configured. See the official [Vercel AI Gateway API guide](https://vercel.com/docs/ai-gateway/sdks-and-apis).

Checkout, payments, fulfilment addresses, private verification evidence, seller payouts, live order management and Vicky's evidence-summary workflow remain intentionally disabled pending secure design, provider setup and staging review.


## Product catalogue and moderation
Seller product drafts are owned by the authenticated seller. Draft edits are restricted to the owner, and submission changes status to `pending_review`. Only the configured owner can publish a product or return it to drafts. Public catalogue and seller storefront endpoints include only published, in-stock products from public storefronts.

Buyer carts are persistent and account-scoped. Adding an item checks current listing status and stock, but does not reserve stock. There is deliberately no checkout route yet. Reviews require a delivered order and remain unpublished until an owner approves them. Product and review decisions are audited and notify the affected account.

## DAMA
DAMA uses Vercel AI Gateway's OpenAI-compatible Chat Completions endpoint. Set `DAMA_MODEL` to an available model ID and configure `AI_GATEWAY_API_KEY` or use Vercel OIDC. The API supplies only public, published catalogue data and uses a database-backed per-user rate limit. No key or model was configured by this build.
