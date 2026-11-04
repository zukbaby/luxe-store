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

## Deployment and safety status
- Changes are on the separate cooldown branch and are not production-live.
- Do not merge, promote, or deploy until the deployment cooldown clears and the owner explicitly requests it.
- Apply migrations in order in a staging database, run verification scripts, configure Clerk and Neon through their secure dashboards, then test owner, admin, banned-user and non-owner access before launch.
