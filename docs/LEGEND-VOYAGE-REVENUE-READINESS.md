# Legend Voyage revenue-readiness contract

Status: public value preview allowed; payment collection prohibited.

The canonical account, progression, entitlement, security, recovery, operations,
and generation-ahead gates are defined in
`docs/CAPTAIN-PASSPORT-GENERATION-AHEAD-AUDIT.md`. If the two documents appear to
conflict, the stricter fail-closed requirement applies.

## Product promise

Legend Voyage is a proposed one-time permanent cosmetic route. The current
price-research hypothesis is **$4.99 USD**. The route previews three complete
pirate identities (Kraken, Phoenix, and Leviathan), twenty Captain Levels, and
seven visible reward milestones. It must never sell score, size, speed,
multiplier odds, radar intelligence, Relic power, or any other competitive
advantage.

Captain progression in this increment is a device-local preview. It is useful
for product testing, but it is not an account, durable entitlement, or proof of
ownership.

## Public preview boundary

- Players may try all three animated identities before purchase exists.
- The interface must say that the route is not for sale and that no checkout,
  card, or email is collected.
- The interest action is optional, consent-gated analytics only. It cannot
  unlock an item or imply a reservation, order, or purchase.
- Legacy query-string store previews must not expose a checkout action.
- Historic local test grants may remain recognizable for development, but they
  are not evidence of a customer purchase.

## Gates before any live checkout

All gates below are mandatory:

1. Account identity works across supported browsers and devices.
2. Captain XP and equipped cosmetics are server-owned and cannot be granted by
   changing browser storage or client requests.
3. A durable entitlement ledger records purchaser, product/version, payment
   provider object IDs, grant state, refund/reversal state, and timestamps.
4. Checkout, webhook verification, duplicate-event handling, retry recovery,
   fulfillment, refunds, disputes, and customer self-service are proven in a
   private sandbox with no client-side entitlement grants.
5. Published terms, privacy disclosure, support contact, refund policy, age
   handling, tax treatment, and regional availability have owner/legal review.
6. Analytics can measure preview opens, theme try-ons, progression, qualified
   interest, checkout start, paid conversion, refund, and retention without
   collecting unnecessary personal data.
7. Real-player evidence shows that the route is understood, desired, and worth
   the proposed price. An internal visual opinion alone is not sufficient.
8. Direct-site, portal, and future mobile builds use the payment rail permitted
   by their platform; one provider must not be silently reused everywhere.
9. A limited live cohort has an explicit rollback/disable switch and reconciles
   every payment to exactly one durable entitlement before broader release.

## Evidence needed to become convinced

The team should define cohort thresholds before looking at results. At minimum,
capture unique eligible players, voyage opens, distinct theme previews,
qualified-interest rate, repeat-session rate, payer conversion, fulfillment
success, support/refund rate, and performance/accessibility regressions. A tiny
or self-selected sample must be labeled inconclusive rather than successful.

## Recommended implementation order

1. Ship this no-sale preview and collect only consented product-interest data.
2. Add and audit account identity without payment or client-authored value.
3. Add and audit server-owned progression after identity passes.
4. Add and audit the durable entitlement ledger after progression passes.
5. Run observed external-player value/comprehension sessions and tune the route.
6. Build the payment sandbox and operational/legal controls behind a private
   feature flag.
7. Review the evidence against predeclared thresholds.
8. Only then authorize a limited live payment cohort and bank settlement.

This contract deliberately separates a polished offer from the ability to take
money. Both are required for honest, durable revenue.
