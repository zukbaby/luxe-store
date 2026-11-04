# LUXE STORE backend foundation

## Current state
The deployed site is a static HTML prototype. Serverless API scaffolding is being added on the development branch; it is not a live account or marketplace service until providers are connected, migrations are applied, and security tests pass.

## Proposed stack
- Vercel Functions for server-side APIs.
- Neon Postgres for persistent marketplace data.
- Clerk for managed sign-in and verified sessions.
- Vercel AI Gateway / AI SDK for DAMA only after authentication, rate limits and data boundaries are in place.

## Current server code
- `api/health.js`: reports configuration presence only.
- `api/me.js`: authenticated read of the caller's own profile; returns unavailable until Clerk and database are configured.
- `api/products.js`: public read of published products only; bounded to 60 rows; returns unavailable until the database is configured.
- `api/_lib/auth.js`: verifies Clerk tokens server-side.
- `api/_lib/authorization.js`: owner check based on the verified session and server-side owner ID.

## Data model
- `schema.sql`: profiles, products, verification requests and admin audit log.
- `migrations/002_marketplace_expansion.sql`: adds currency/category fields and seller applications. Review and apply only after Neon is provisioned and backed up.
- Row-level security is enabled without permissive browser policies. Server APIs use verified identity and least privilege.

## Security rules
1. Never accept an admin or seller role from a browser form, query parameter or local storage.
2. Admin access must be granted through a server-controlled allowlist/claim and checked on every protected API request.
3. Customers may only read/update their own allowed profile fields.
4. Sellers may only manage their own products; public reads are limited to published products.
5. Seller applications remain pending until human owner review. No identity documents or payment proofs are collected in this preview.
6. Verification documents, if ever required, must use private storage with strict access controls and an approved retention policy.
7. Every verification decision and privileged admin mutation must create an audit record.
8. Rate-limit sign-in, seller applications, DAMA requests and all write endpoints.
9. Keep provider secrets and database credentials in Vercel environment variables; never commit them or expose them to browser code.

## Provisioning gate
A database/auth Marketplace connection can require provider authorization, account ownership, or billing approval. Do not provision or enable paid services without the account owner/authorized adult completing the provider's approval flow.

## Next implementation sequence
1. Authorize and connect Neon Postgres and Clerk in the Vercel project.
2. Configure development/preview/production environment variables and verified owner user ID.
3. Integrate the Clerk browser sign-in UI with the existing static pages.
4. Apply and test the schema and least-privilege policies.
5. Add customer profile creation and secure seller application submission with shared rate limiting.
6. Implement owner-only seller approval, product management and audit logging.
7. Connect DAMA through the AI Gateway with server-side rate limits and safety boundaries.
8. Run end-to-end tests before exposing any real-user functionality.

## Owner-only feature
Animated GIF/video profile banners (up to five seconds) remain disabled for all users except the store owner until the owner explicitly enables wider access.
