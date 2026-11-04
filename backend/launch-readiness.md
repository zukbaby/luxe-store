# LUXE STORE launch readiness checklist

## Current known state
- Static storefront and preview pages exist.
- The cart is browser-local only.
- No production database is connected.
- No production sign-in provider is connected.
- The admin page is a preview and is not protected by real admin authentication.
- DAMA and Vicky pages are previews; no model provider is connected.
- Verification badge designs are previews; badge issuance is disabled.
- Checkout, payments, seller payouts, order management, and refunds are not live.

## Required before public marketplace launch
- [ ] Select and configure a managed PostgreSQL provider.
- [ ] Apply reviewed schema and tested row-level security policies.
- [ ] Configure managed authentication and server-side role mapping.
- [ ] Establish owner/admin access using verified identity and least privilege.
- [ ] Add secure private file storage and retention controls for verification evidence.
- [ ] Implement server-side product, seller, order, and support APIs.
- [ ] Connect DAMA to approved public catalogue and help content with rate limits.
- [ ] Connect Vicky to private reviewer workflow with human-only final decisions.
- [ ] Implement admin audit log and tested access restrictions.
- [ ] Consider payment provider only after authorized adult/business approval and compliance review.
- [ ] Test privacy, abuse prevention, accessibility, mobile layouts, backups, incident response, and restore procedures.
- [ ] Connect a custom domain owned by the project owner; enable HTTPS and verify canonical redirects.
- [ ] Complete staging end-to-end tests before enabling production actions.

Do not claim any unchecked item is live. Do not purchase services, domains, or paid plans without explicit approval from the authorized account owner.
