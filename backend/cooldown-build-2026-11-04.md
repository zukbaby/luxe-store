# LUXE STORE cooldown build — 4 November 2026

This branch contains the next frontend and backend build batch prepared while Vercel deployment is rate-limited.

Branch: `cooldown-build-2026-11-04`

## Moderation command added
- Added migration 004 for unique public usernames and timed ban metadata, with default-deny RLS retained.
- Added self-service username updates through `PATCH /api/me`; usernames are 3–24 characters using letters, numbers or underscores.
- Added owner-only `POST /api/admin/commands` accepting only `1weekban-username`.
- The command records a seven-day ban expiry, refuses to ban the owner or administrator accounts, and writes an audit event atomically.
- Updated shared authentication to check the ban expiry centrally for every API route that uses the authentication helper. A currently banned account receives a restricted response; expired bans no longer block access.
- Added syntax validation for the new endpoint and documented the API contract.
- This is backend code only: migration 004 is not applied, no database/auth provider is configured, and the command is not live.

- Added an owner-only audit log API and Admin panel tab showing the latest 50 administrative events. It displays event metadata only, not raw details or private evidence.\n\n## Account management centre added
- Added owner-only account search by username or display name, capped at 50 results.
- Added limited account profile details with role, verification status, restriction expiry and up to 25 moderation history events.
- Added the Admin panel People section with search, account result table and profile detail view.
- Account directory responses exclude email addresses, credentials and private verification evidence.

## Notifications centre added
- Added migration 005 for seller, moderation and account notification categories, preserving the existing order/product/verification/support/system categories and default-deny RLS.
- Added authenticated notification inbox API, unread count, individual mark-read and mark-all-read endpoints.
- Added a signed-in My Account notification centre with refresh, unread count and safe text-only rendering.
- Seller application decisions, verification decisions and seven-day bans now create user notifications atomically with the related database writes and audit records.
- Added owner-only verification queue metadata and a separate owner-only human decision endpoint. The queue does not expose private identity evidence; decisions update the profile, audit record and user notification atomically.
- Fixed shared Bearer token header parsing and expanded syntax checks.

## Deployment and safety status
- Changes are on the separate cooldown branch and are not production-live.
- Do not merge, promote, or deploy until the deployment cooldown clears and the owner explicitly requests it.
- Apply migrations in order in a staging database, run verification scripts, configure Clerk and Neon through their secure dashboards, then test owner, admin, banned-user and non-owner access before launch.


## Consolidated marketplace and assistant build
- Added migration 006 and verification script for the owner-reviewed product publishing lifecycle.
- Added seller product draft APIs, seller-owned editing, and submit-for-review flow.
- Added public catalogue, product detail and public seller storefront APIs.
- Added owner-only product moderation queue with publish/return decisions, audit entries and seller notifications.
- Rebuilt Seller Studio to use Clerk sessions and server APIs instead of browser-only localStorage drafts.
- Rebuilt the marketplace and homepage to show only public, approved catalogue records and use persistent authenticated carts.
- Added public seller storefront and product detail pages; product reviews are public only after moderation.
- Added persistent cart API; it checks published listing and available stock but does not reserve stock or enable checkout.
- Added verified-purchase review submission API; reviews require a delivered order and are not published automatically.
- Added migration 007 and a database-backed per-user DAMA rate limiter.
- Connected DAMA backend to Vercel AI Gateway's OpenAI-compatible Chat Completions API, with catalogue-only grounding and server-side credentials; added shared Clerk browser bootstrap and connected DAMA chat UI.
- Added migration verification scripts and expanded API syntax checks.
- Added `DAMA_MODEL` to the environment example. No AI Gateway key, model choice, database or Clerk provider was provisioned.

## Current hard gates
- Database/auth providers are not configured and migrations are not applied.
- AI Gateway is not configured; DAMA returns a safe unavailable response until the owner configures it.
- Vicky does not receive private evidence and cannot make decisions. Its evidence-summary integration remains disabled until secure evidence storage and a reviewer workflow exist.
- Checkout, payment processing, fulfilment address collection, seller payouts, order management and support tickets remain disabled.
- No production deploy or merge is authorized during the Vercel cooldown.
