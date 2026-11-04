# LUXE STORE cooldown build — 4 November 2026

This branch contains the next frontend build batch prepared while Vercel deployment is rate-limited.

Branch: `cooldown-build-2026-11-04`

## Work completed in requested order

### 3. Verification and Vicky
- `verification.html` is now a verification-centre preview with consistent original LUXE emblem shape, blue/green/gold concepts, name-first badge placement, application-flow preview and clear non-live status.
- `vicky.html` now explains completeness checks, criterion review, neutral summaries and mandatory human decisions. It includes a fictional-data-only summary-format preview.
- No badge is issued and no identity evidence is collected by these previews.

### 1. DAMA
- `dama.html` has a refreshed responsive chat interface, quick prompts, clear-chat action and prepared sample guidance for shopping, sellers, verification and privacy.
- Replies are scripted examples. Chat is not connected to an AI model, customer data, catalogue or order records.

### 2. Owner control centre
- `admin.html` now has navigation for overview, verification, assistants, people, catalogue, customization and security.
- It documents the owner-only animated banner plan and badge placement rule.
- It is explicitly a visual preview, not authenticated or connected to live records. No admin actions are enabled.

### 4. Marketplace
- Added `marketplace.html` with responsive product discovery, search, category filters, sorting, sample seller storefronts and a browser-only preview cart.
- Added a Marketplace link to the main storefront navigation.
- All product names, sellers and prices on the new page are fictional examples. No checkout, inventory, payments or seller payouts are connected.

## Deployment and safety status
- Changes are on this separate branch and are not yet live on the production website.
- Vercel deployment cooldown remains in effect; do not treat a GitHub commit as a deployment.
- Live AI, authentication, database, secure evidence storage, protected admin operations and real badge issuance remain disabled pending provider setup, security implementation and testing.


## Additional backend foundation added during cooldown
- Added `backend/migrations/002_marketplace_core.sql` for seller storefronts, persistent carts, orders, order-item snapshots, reviews, notifications, and product category/SKU/stock fields.
- Enabled row-level security on every new table and intentionally added no permissive policies.
- Added `backend/migrations/002_marketplace_core.verify.sql` to check that the new tables remain RLS-enabled and policy-free after migration.
- Expanded `backend/api-contracts.md` with seller storefront, cart, checkout, order, notification, and review routes plus server-trust boundaries.
- Added `backend/checkout-design.md` covering transaction-safe stock reservation, idempotency, verified payment webhooks, order access, personal-data handling, and launch tests.
- Updated `backend/README.md` and `backend/launch-readiness.md` with migration and launch requirements.

## Current branch comparison
The branch was verified as 14 commits ahead of `main`, with no commits behind, after this cooldown work batch. These are saved GitHub changes only; no deployment was created by this work batch. The SQL has not been applied to a database and must be reviewed and tested in staging before use.


## Account/authentication work started
- Implemented `GET /api/me` with verified Clerk session checks and caller-only profile reads.
- Implemented `PATCH /api/me` to create/update only the authenticated user's display name; unknown fields such as role, user ID, and verification status are rejected.
- Added request-size checks, no-store responses, safe error IDs, and fail-closed behavior when auth/database configuration is missing.
- Added `CLERK_AUTHORIZED_PARTIES` to the environment template and documented exact-origin allowlisting.
- Added `backend/auth-profile-implementation.md` with setup steps, API contract, staging tests, and remaining UI/provider work.
- Updated API contracts, README, and syntax-check script.
- This does not yet provide browser sign-in/sign-up or a connected database. No user can create a live LUXE account until Clerk and Neon are provisioned and the frontend flow is integrated and tested.


## Seller onboarding work completed during cooldown
- Added migration `003_seller_applications.sql` for seller applications, pending-per-user and active-slug uniqueness, reviewer metadata, and default-deny RLS.
- Added `003_seller_applications.verify.sql` to verify RLS and the one-pending-application index.
- Added `api/seller/applications.js`: authenticated users can read their own application history and submit an application using only store name, slug, and description. Identity comes from the verified Clerk session.
- Added `api/admin/seller-applications.js`: owner-only queue and human approve/reject action. Approval, seller-role promotion, private storefront creation, and audit logging are grouped in one SQL statement; failures roll back together.
- Extended the API syntax-check script and documented staging gates.
- No database migration has been applied, no provider has been connected, and no seller can yet use this as a live feature. No UI has been wired to these routes.

- Updated `seller.html` with a seller application form and application-history view connected to the new API routes. The page explains that seller access requires human review and shows clear sign-in / not-yet-configured states. Product drafts remain browser-local and are still not published.

- Updated `admin.html` with a Seller applications review tab. It calls the owner-protected queue endpoint, handles sign-in/forbidden/not-configured states, and provides explicit human approve/reject actions with optional reviewer notes and confirmation. Decisions are sent to the audited server endpoint; the page does not bypass owner authorization.

## Account page profile integration
- Replaced the browser-local profile mock in `accounts.html` with a same-origin session check against `GET /api/me` and display-name updates through `PATCH /api/me`.
- The page renders distinct signed-out, missing-profile, unconfigured-service and authenticated-profile states; server-owned role and verification status are read-only.
- Removed localStorage persistence so the prototype no longer suggests that a local browser form creates a real LUXE account.
- Official Clerk browser sign-in/sign-up remains pending provider configuration and integration testing. This page is not a live sign-in system yet.
