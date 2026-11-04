# LUXE STORE API contracts (planned)

All routes below are contracts for future implementation. Until database and authentication providers are configured, endpoints must return an unavailable response and must not read or mutate private data.

## Public
- GET /api/health — configuration presence only; never expose secret values.
- GET /api/products — future published catalogue; only active, public fields.
- GET /api/products/:id — future public product detail.

## Authenticated customer
- GET /api/me — verified Clerk session, own profile only; includes public username and own account ban expiry.
- PATCH /api/me — verified Clerk session; updates own display name and/or unique username only. Role, ban and verification fields are rejected.
- POST /api/verification-requests — applicant-owned request; private evidence uploaded only through a secure provider workflow.

## Authenticated seller
- POST /api/seller/products — create a draft owned by current seller.
- PATCH /api/seller/products/:id — update own draft only.
- POST /api/seller/products/:id/submit — submit own draft for moderation.

## Authenticated admin
- GET /api/admin/verification-requests — authorized reviewer queue.
- GET /api/admin/verification-requests/:id — restricted case details.
- GET /api/admin/verification-requests — owner-only pending queue with limited applicant metadata; excludes private identity evidence.
- POST /api/admin/verification-decisions — owner-only human approve/reject action; updates verification status, audit log and applicant notification atomically.
- GET /api/admin/audit — owner-only recent administrative event history; returns limited event metadata only.
- GET /api/admin/users?q=<search> — owner-only search by public username or display name, limited to 50 results.
- GET /api/admin/users?id=<profile-id> — owner-only account summary and latest 25 moderation events; excludes credentials, contact details and private verification evidence.
- POST /api/admin/commands — configured owner only. Accepts the exact command `1weekban-username`; resolves a unique username, records a seven-day expiry, protects the owner and administrator accounts, and writes an audit event atomically. No arbitrary SQL or free-form commands are accepted.

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
- Shared authentication checks the server-side timed-ban state before protected API work.

## Marketplace additions (planned; migration 002)
- GET /api/sellers/:slug — public storefront profile and published listings only.
- GET /api/cart — authenticated buyer's own cart.
- PUT /api/cart/items/:productId — add/update an item; server checks listing status and stock.
- DELETE /api/cart/items/:productId — remove an item from the authenticated buyer's cart.
- POST /api/checkout — server recalculates prices, locks stock rows, validates stock, and creates order records in one transaction. Payment is not assumed complete.
- GET /api/orders — buyer's own order history; sellers receive only order items assigned to their seller ID.
- GET /api/orders/:id — owner-scoped order detail with sensitive delivery data handled by a separate secure workflow.
- GET /api/notifications — authenticated user's own inbox, unread count and up to 50 recent notices.
- PATCH /api/notifications — mark all of the authenticated user's notifications as read.
- PATCH /api/notifications/:id — mark one of the authenticated user's notifications as read.
- POST /api/products/:id/reviews — accept a review only after server verification of a completed purchase.
- GET /api/products/:id/reviews — published reviews only.

## Marketplace invariants
- Prices, totals, seller ownership, buyer identity, inventory, order state, and payment state are server-controlled.
- Checkout is a single transaction with row locks and stock rechecks to prevent overselling.
- Payment state changes only after a verified provider webhook; never from a browser request.
- Do not store raw delivery addresses or identity documents in the marketplace tables.
- Keep all new tables default-deny under RLS until provider identity mapping and policies are reviewed and tested.

## Seller applications (implemented in code; not live)
- GET /api/seller/applications — authenticated user's own application history.
- POST /api/seller/applications — submit an application with storeName, storeSlug, and description only. The user ID comes from the verified Clerk session.
- GET /api/admin/seller-applications — owner-only pending review queue.
- POST /api/admin/seller-applications — owner-only human decision with applicationId, decision (approved/rejected), and optional reviewerNote. Approval, seller-role promotion, private-by-default storefront creation, and audit insertion are one SQL statement.
- Migration 003 adds a seller application table, unique pending-per-user and active-slug indexes, RLS, and a verification script. It intentionally adds no RLS policies.
- These routes remain unavailable until Clerk and Neon are configured, migrations are applied, and staging tests pass.

## Notifications centre (implemented in code; not live)
- Migration 005 adds seller, moderation and account notification categories plus an unread inbox index; the existing order, product, verification and support categories remain.
- GET /api/notifications returns only the signed-in user's latest 1–50 notifications and unread count.
- PATCH /api/notifications marks only that user's unread notifications as read; PATCH /api/notifications/:id marks one owned notification as read.
- Seller application decisions, verification decisions and seven-day moderation actions create notifications in the same SQL statement as their decision/audit writes.
- The My Account page displays account, seller, verification and moderation notices, supports refresh, individual mark-read and mark-all-read.
- Notification content and safe payloads are generated server-side; no user can read or alter another account's inbox.

## Account management centre (implemented in code; not live)
- The Admin panel People section searches the owner-only account directory by username/display name and shows role, verification status and active restriction expiry.
- Selecting an account shows a limited profile summary and recent moderation history. No email addresses, credentials or private verification evidence are returned.
- The directory endpoint is GET-only and capped at 50 search results; profile history is capped at 25 events.

## Moderation command (implemented in code; not live)
- Migration 004 adds unique usernames and server-controlled ban expiry/reason columns to profiles; it preserves RLS default-deny.
- Users may set their own username through PATCH /api/me. Usernames are 3–24 lowercase letters, numbers or underscores and are unique case-insensitively.
- GET /api/admin/audit returns up to 100 recent event metadata rows and omits raw details/evidence.\n- The owner-only command accepts only `1weekban-username`, records a seven-day expiry, protects owner/admin accounts, and writes an audit event.
- Shared API authentication centrally enforces unexpired bans. Expired bans stop restricting access automatically.
- The feature remains unavailable until migration 004 is applied and Clerk/Neon are configured and tested in staging.


## Additional implemented marketplace APIs (code prepared; not live)
- GET /api/products?q=&category= — public published and in-stock listings from public storefronts only.
- GET /api/products/:id — public product details.
- GET /api/sellers/:slug — public seller storefront and published listings.
- GET /api/cart — authenticated caller's own cart.
- PUT /api/cart — set an item quantity; server validates published status and current stock.
- DELETE /api/cart — remove an item from the caller's own cart.
- GET /api/seller/products — seller's own product listings.
- POST /api/seller/products — create a draft using server-derived seller identity.
- PATCH /api/seller/products/:id — edit the caller's own draft only.
- POST /api/seller/products/:id/submit — submit a draft for owner moderation.
- GET /api/admin/products — owner-only pending product review queue.
- POST /api/admin/products — owner-only approve/publish or return-to-draft decision; updates audit log and seller notification.
- GET /api/products/:id/reviews — published reviews only.
- POST /api/products/:id/reviews — review only after a delivered order containing the product; new reviews remain unpublished.
- POST /api/ai/dama — authenticated, database-rate-limited AI Gateway assistant supplied only with public published catalogue data.

## Product workflow and safety
- Migration 006 adds the pending_review product status and review metadata while preserving products RLS default-deny.
- Migration 007 adds per-user DAMA rate-limit counters with RLS enabled and no client policies.
- Seller product ownership, role, price, stock, listing state and reviewer identity are derived or enforced server-side.
- Cart writes do not reserve inventory and are not checkout. Checkout remains disabled until transactional stock locking, fulfilment and verified payment processing are implemented.
- Product reviews require a delivered order and remain hidden until moderated.
- DAMA requires `DAMA_MODEL` plus `AI_GATEWAY_API_KEY` or Vercel OIDC. It must not invent catalogue facts, order status, shipping, refunds, payment status or seller metrics.
