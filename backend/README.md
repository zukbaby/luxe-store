# LUXE STORE backend foundation

## Current state
The deployed site is still a static HTML prototype. These files are a reviewed starting point for a real backend, not a live database or authentication system.

## Proposed stack
- **Vercel Functions** for server-side APIs.
- **Neon Postgres** for persistent marketplace data.
- **Clerk** for managed sign-in and verified sessions.
- **Vercel AI Gateway / AI SDK** for DAMA, added after authentication and usage limits are in place.

The repository remains a static HTML site without an application framework. A minimal package manifest and server-side Clerk/Neon runtime helpers have now been added for Vercel Functions. The existing HTML pages still need a sign-in UI integration before account, admin, verification, or AI endpoints can be enabled.

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
