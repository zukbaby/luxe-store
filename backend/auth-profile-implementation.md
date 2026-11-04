# LUXE STORE authentication and profile API

## Current implementation state
- Server-side Clerk token verification is implemented in `api/_lib/auth.js`.
- Tokens are accepted from the Clerk `__session` cookie or an Authorization Bearer header.
- Verification requires both `CLERK_SECRET_KEY` and a comma-separated exact-origin `CLERK_AUTHORIZED_PARTIES` allowlist.
- `GET /api/me` returns only the signed-in user's own profile.
- `PATCH /api/me` creates or updates only that user's display name. The user ID comes from the verified Clerk token.
- Role, verification status, and user ID are not accepted from the browser. New profiles receive the database default role of customer.
- Both routes return `Cache-Control: no-store`.
- If auth or database configuration is missing, the route fails closed. This is not a live sign-in system yet.

## Provider setup required
1. An authorized project owner provisions and configures a Clerk application.
2. Add `CLERK_SECRET_KEY` to Vercel server-side environment variables.
3. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for the future browser sign-in UI.
4. Set `CLERK_AUTHORIZED_PARTIES` to the exact production origin and any explicitly approved preview origin(s), comma-separated. Do not use a broad wildcard.
5. Confirm the account owner identity through Clerk before setting `LUXE_OWNER_USER_ID`.
6. Configure the Clerk frontend UI on the static pages (or migrate the site to a supported bundled frontend) before inviting users.

Do not paste credentials into chat or commit them. Do not enable live account creation until the provider setup and frontend sign-in integration are complete.

## Profile API contract

### GET /api/me
- Requires a verified Clerk session.
- Returns the caller's own profile fields: ID, display name, role, verification status, and timestamps.
- Returns 404 `PROFILE_NOT_FOUND` when a signed-in user has not created a LUXE profile yet.
- Never returns another user's profile.

### PATCH /api/me
- Requires a verified Clerk session.
- Accepts exactly one field: `displayName` (1–60 trimmed characters).
- Creates the profile if it does not exist; otherwise updates only its display name.
- Rejects unknown fields, including `id`, `userId`, `role`, `verificationStatus`, and `email`.
- Database role and verification status are never changed by this endpoint.

## Required staging tests
- Missing auth configuration returns 503 without database access.
- Missing or invalid session returns 401.
- A token from an origin not in the allowlist is rejected.
- GET for a new user returns 404 and does not create a profile.
- PATCH creates a profile with the database's customer default role.
- PATCH updates only the display name.
- Attempts to set admin/seller/creator role or verification status are rejected.
- User A cannot read or modify User B's profile.
- Missing database configuration returns 503.
- No private profile response is cached.

## Not implemented yet
- Browser sign-in/sign-up UI and session lifecycle controls.
- Email verification UX and account recovery configuration.
- Seller/creator application and role-grant workflow.
- Owner/admin role provisioning UI.
- Database connectivity and end-to-end integration tests.
