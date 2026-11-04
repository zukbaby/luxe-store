# Provider connection checklist

This project needs managed authentication and PostgreSQL before private marketplace features can be enabled.

## Required account-owner steps
1. The authorized project/account owner reviews provider terms, pricing, data location, privacy terms, and billing responsibility.
2. The owner creates or authorizes provider resources through the official dashboard or Vercel Marketplace.
3. The owner connects resources to the LUXE STORE Vercel project.
4. Add environment variables only through Vercel's protected Environment Variables UI. Never paste secrets into chat, GitHub source files, browser code, or screenshots.
5. Use separate development/preview and production credentials where supported.
6. Confirm the provider resource is owned by the project owner and has a documented recovery/contact path.

## Database readiness
- Confirm PostgreSQL version, region, backups, connection pooling, and restore procedure.
- Review backend/schema.sql before applying it. Profile and role references use text IDs to match Clerk user IDs.
- Implement and test row-level security policies based on verified auth identity.
- Keep service credentials server-side and least-privileged.
- Test that anonymous users cannot read profiles, verification records, or audit records.

## Authentication readiness
- Configure production and preview callback URLs.
- Require verified sessions on private routes.
- Map roles from trusted server-side claims or database records, never browser input.
- Grant owner/admin privileges manually through a controlled process.
- Test session expiry, sign-out, account recovery, and denied access.

## Runtime implementation now in the repository\n- `package.json` includes the Clerk backend and Neon serverless drivers.\n- `api/_lib/auth.js` verifies Clerk session tokens server-side and requires an authorized-party allowlist.\n- `api/_lib/database.js` exposes a server-only parameterized Neon query helper.\n- `api/_lib/authorization.js` contains an owner-only check based on the verified Clerk user ID.\n- These helpers are not yet wired into public/private feature routes; routes remain fail-closed until provider setup and staging tests are complete.\n\n## Go-live gate
Do not enable account writes, admin actions, verification submissions, badge issuance, seller publishing, or AI endpoints until database connectivity, authentication, authorization, audit logging, and abuse controls pass staging tests.

DAMA may only use published catalogue/help data. Vicky may only prepare neutral review assistance for an authorized human reviewer; it cannot make decisions or issue badges.
