# LUXE STORE checkout and order workflow

## Status
Design contract only. Checkout is not implemented, and no payment provider is connected. Do not expose a checkout button as a working payment flow until the implementation and end-to-end tests pass.

## Trusted inputs
The server derives the buyer ID from the verified session. The request may contain product IDs, quantities, and a short optional buyer note only. Ignore or reject client-supplied prices, totals, seller IDs, stock counts, order status, payment status, and buyer IDs.

## Transaction sequence
1. Verify the authenticated buyer and validate request shape, item count, quantity bounds, and idempotency key.
2. Start a database transaction.
3. Lock requested product rows in a deterministic product-ID order using SELECT ... FOR UPDATE.
4. Recheck every product is published, belongs to an active seller, and has sufficient stock.
5. Read current prices and seller IDs from the locked database rows.
6. Calculate subtotal and delivery fee on the server using an explicit, reviewed delivery-fee policy. If no policy exists, do not invent a fee.
7. Create the order and immutable order-item snapshots in the same transaction.
8. Decrement stock with guarded updates and verify every expected row changed.
9. Commit the transaction. If any check fails, roll back everything.
10. Return a pending order summary; do not claim payment succeeded.

## Idempotency and retries
- Store a unique idempotency key scoped to the authenticated buyer before enabling checkout.
- Repeating the same key and same request returns the original order result.
- Reusing a key with a different request is rejected.
- Never create duplicate orders because a browser retries after a timeout.

## Payment boundary
- Payment initiation is a separate server-side operation after an order exists.
- Only a verified, signature-checked provider webhook may change payment status.
- Verify webhook timestamp/signature, event identity, amount, currency, and order association.
- Make webhook processing idempotent and persist provider event IDs under a unique constraint.
- Never accept a browser redirect or success query parameter as proof of payment.
- Do not store card numbers, security codes, or payment credentials.

## Order access
- Buyers may read only their own orders.
- Sellers may read only order items assigned to their seller ID, with buyer contact/delivery details withheld unless a separately reviewed fulfilment workflow requires them.
- Admin access requires server-side role checks and audit logging.
- Order status changes must follow an explicit transition map and create an audit event.

## Delivery and personal data
The initial marketplace schema intentionally excludes raw delivery addresses. Before collecting them, choose a secure storage and access design, define retention/deletion rules, and restrict access to staff who need the data for fulfilment. Never put addresses or identity evidence into logs, AI prompts, analytics, or notification payloads.

## Required tests before launch
- Unauthenticated checkout is denied.
- A buyer cannot create an order for another buyer.
- Draft/archived products cannot be purchased.
- Insufficient stock causes a full rollback.
- Two simultaneous purchases cannot oversell the same stock.
- Client price/total/seller/status tampering has no effect.
- Duplicate idempotency keys do not create duplicate orders.
- Invalid or replayed payment webhooks are rejected.
- Buyer and seller order access boundaries are enforced.
- Every privileged order mutation is auditable.
