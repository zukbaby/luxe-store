# LUXE STORE launch readiness checklist

## Implemented in the cooldown branch (code prepared, not live)
- Public catalogue and product detail APIs return only published, in-stock listings from public seller storefronts.
- Seller Studio uses Clerk sessions for seller applications, owned product drafts and submission for owner review.
- Owner-only product moderation can publish or return listings to drafts; decisions create audit records and seller notifications.
- Public seller storefront and product detail pages are available.
- Authenticated persistent cart APIs support viewing, adding/updating quantities and removing items.
- Product reviews require a delivered order and remain unpublished until a separate moderation workflow.
- Notifications centre, account management, seller application decisions, verification review metadata and seven-day moderation workflows are implemented in code.
- DAMA API uses Vercel AI Gateway, public catalogue context, per-user rate limiting and strict non-private-data rules when the required environment configuration is supplied.
- Clerk browser bootstrap is shared by account, seller, DAMA and marketplace pages.

## Still not live / required before public launch
- [ ] Select and configure managed PostgreSQL and apply base schema plus migrations 002–007 in order.
- [ ] Run all migration verification scripts and validate SQL on a staging database.
- [ ] Configure Clerk and verified owner identity in Vercel environment settings.
- [ ] Review and implement least-privilege RLS policies or maintain server-only access with audited privileged database credentials.
- [ ] Configure AI Gateway and an approved model identifier; review usage budgets and rate limits.
- [ ] Configure private evidence storage and retention before enabling identity verification submissions.
- [ ] Build a secure support-ticket workflow.
- [ ] Implement transaction-safe checkout, fulfilment address storage, verified payment webhooks, order tracking and seller order management.
- [ ] Implement payment provider only after authorized adult/business approval and compliance review.
- [ ] Complete product review moderation and seller/buyer end-to-end tests.
- [ ] Test privacy, abuse prevention, accessibility, mobile layouts, backups, incident response and restore procedures.
- [ ] Connect a custom domain owned by the project owner; enable HTTPS and verify canonical redirects.
- [ ] Complete staging end-to-end tests before enabling production actions.

Do not claim any unchecked item is live. Do not purchase services, domains, or paid plans without explicit approval from the authorized account owner. Never collect identity documents or payment details through preview forms.

## Migration order
1. `backend/schema.sql`
2. `backend/migrations/002_marketplace_core.sql`
3. `backend/migrations/003_seller_applications.sql`
4. `backend/migrations/004_moderation.sql`
5. `backend/migrations/005_notifications.sql`
6. `backend/migrations/006_product_review.sql`
7. `backend/migrations/007_assistant_rate_limits.sql`
8. `backend/migrations/008_review_moderation.sql`

Run each matching `.verify.sql` file after its migration. Migration 002 has its existing verification script. RLS remains enabled with no client policies; the current APIs use server-side database access and verified session ownership.
