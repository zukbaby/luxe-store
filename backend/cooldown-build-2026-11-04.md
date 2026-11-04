# LUXE STORE cooldown build — 4 November 2026

This branch contains the next frontend and backend build batch prepared while Vercel deployment is rate-limited.

Branch: `cooldown-build-2026-11-04`

## Moderation command added
- Added migration 004 for unique public usernames and timed ban metadata, with default-deny RLS retained.
- Added `PATCH /api/me` support for a user's own username; usernames are 3–24 characters and use letters, numbers or underscores.
- Added owner-only `POST /api/admin/commands` accepting only `1weekban-username`.
- The command applies a seven-day ban expiry, refuses to ban the owner or administrator accounts, and writes the audit event in the same SQL statement.
- Added syntax validation for the new endpoint and documented the API contract.
- This is backend code only: the migration is not applied, no database/auth provider is configured, and the command is not live. The admin page remains a visual preview.

## Deployment and safety status
- Changes are on the separate cooldown branch and are not production-live.
- Do not merge, promote, or deploy until the deployment cooldown clears and the owner explicitly requests it.
- Apply migrations in order in a staging database, run verification scripts, configure Clerk and Neon through their secure dashboards, then test owner and non-owner access before launch.
