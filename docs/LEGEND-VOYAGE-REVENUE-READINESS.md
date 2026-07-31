# Captain commerce and Legend Voyage revenue-readiness contract

**Status:** dual-offer public research preview allowed; payment collection and
Stripe account input prohibited.

The canonical account, progression, entitlement, security, recovery,
operations, and generation-ahead gates are defined in
`docs/CAPTAIN-PASSPORT-GENERATION-AHEAD-AUDIT.md`. The current scored evidence is
machine-readable in `docs/WORMIFI-REVENUE-READINESS-SCORECARD.json`. If these
documents conflict, the stricter fail-closed requirement applies.

## Product promise

The entire Wormifi game remains free. Neither offer grants a gameplay advantage.
The no-sale research preview compares two cosmetic relationships:

| Choice | Research price | Customer relationship | Exact boundary |
|---|---:|---|---|
| **Captain Club** | **$1.99/month** | Access while active | Unlimited use of the defined Captain Club cosmetic catalog while active. Cancel online any time; access continues through the paid period and then ends. Free themes and permanent purchases remain. |
| **Own Forever: Legend Voyage** | **$9.99 once** | Permanent ownership | Permanent ownership of the fixed Legend Voyage collection: three complete Legend identities and wakes, two flourishes, and one nameplate. It does not silently promise all future Club releases. |

The one-time price is approximately five times the monthly price and falls
inside the owner's requested 5–10x comparison. These are hypotheses, not
validated prices. “Unlimited” may describe use of the named Club cosmetic
catalog only; it may never imply that paid access is required for the game.

Captain progression in this increment is a device-local preview. It is not an
account, durable entitlement, or proof of ownership.

## Why $1.99 is the minimum sensible monthly hypothesis

Stripe currently lists standard U.S. online-card processing from 2.9% + 30¢
and Stripe Billing pay-as-you-go at 0.7% of recurring volume. At those published
rates, illustrative proceeds before tax, refunds, disputes, support, and other
fees are about:

| Price | Illustrative proceeds |
|---:|---:|
| $1.00 monthly | $0.66 |
| $1.99 monthly | $1.62 |
| $9.99 one-time | $9.40 |

The 30¢ fixed fee consumes too much of a $1 subscription. This arithmetic does
not prove willingness to pay, profitability, tax treatment, or the rates a
future Wormifi Stripe account will receive. Recheck live account pricing before
private sandbox work.

Sources checked 2026-07-30:

- [Stripe Payments pricing](https://stripe.com/pricing)
- [Stripe Billing pricing](https://stripe.com/billing/pricing)

## Offer clarity and fairness contract

- The monthly card must say **access while active** and explain the end of
  access before any billing-information entry.
- The one-time card must say **permanent ownership** and name the fixed
  collection. It cannot imply ownership of every future cosmetic.
- Every existing free theme and the whole game remain free.
- Payment never grants XP, score, size, speed, boost, collision tolerance,
  multipliers, zoom, radar, Relic power, lives, rank, skips, odds, or priority
  matchmaking.
- No loot boxes, paid consumable currency, pre-checked recurring consent,
  fake scarcity, countdown pressure, or confusing virtual-currency conversion.
- A player may preview the full cosmetic treatment before purchase exists.
- The $1.99 option cannot launch until a named Club catalog is complete and at
  least four future cosmetic releases are already production-ready. The public
  promise remains “when published,” not a fabricated monthly delivery promise.

## Subscription and entitlement contract

Stripe is a settlement rail, never Wormifi's ownership database. Server-owned,
provider-neutral product IDs are:

- `captain-club-monthly-v1`
- `legend-voyage-lifetime-v1`

The durable entitlement ledger must behave as follows:

1. A browser redirect, query string, client payload, or Checkout success page
   never grants access.
2. Monthly access activates only from a verified paid provider event associated
   with an active subscription and the correct Captain Passport.
3. Renewal extends the paid-through time idempotently. Duplicate and reordered
   webhook delivery cannot duplicate or shorten access.
4. Cancel-at-period-end keeps access through the paid-through time. Expired,
   canceled, or unpaid state removes Club-only access according to the reviewed
   policy without touching free themes or permanent purchases.
5. A lifetime purchase writes a permanent grant. Refunds, disputes, reversals,
   and reviewed corrections append new events; history is never overwritten.
6. Cross-device restore derives both active membership and permanent ownership
   from the Captain Log, not browser storage.
7. The player can see plan, renewal date or paid-through date, cancellation
   state, permanent items, and reversal history in plain language.

Stripe documents asynchronous subscription events, including `invoice.paid`,
payment failures, subscription changes/deletion, and entitlement updates. The
private sandbox must prove all relevant states and retries before checkout can
reach a public player:
[Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks).

## Child safety, privacy, and cancellation boundary

Wormifi's bright creature game may attract children. Before collecting account
or billing-adjacent data, the owner and qualified counsel must classify the
audience and review COPPA, state privacy and auto-renewal rules, tax, refund,
platform, and regional requirements. The FTC's current COPPA material says
covered child-directed services and services with actual knowledge of an
under-13 user must provide notice and obtain verifiable parental consent before
collecting personal information. The amended COPPA rule also adds data
minimization and retention obligations:
[FTC COPPA update](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data).

Regardless of changing rulemaking, the Wormifi product requirement is fixed:
recurring terms must be prominent, consent must be affirmative and separate,
and online cancellation must be at least as direct as online signup. No account
or payment activation occurs before owner/legal review records the applicable
rules for the launch regions.

## Dedicated Stripe account boundary

Stripe allows separate accounts for independently operated projects or
businesses and allows multiple accounts under one email. If the same legal
entity operates multiple lines, Stripe also documents Organizations for
centralized management. The owner—not Codex—must decide the correct legal entity
and type the legal name, tax ID, representative details, bank details, and other
sensitive information directly into Stripe. None of that information should be
pasted into chat.

Official account guidance:
[Create and manage multiple Stripe accounts](https://support.stripe.com/questions/create-and-manage-multiple-stripe-accounts).

Codex may open the official Stripe account setup only after every non-payment
gate scores at least 8/10. Until then:

- do not request business or banking information;
- do not create or activate a Stripe account;
- do not obtain or store API keys;
- do not create live or test products on the owner's behalf; and
- keep public checkout, payment links, and provider calls absent.

## Public preview boundary

- Players may compare both offers and try all three animated Legend identities.
- The interface says not for sale, no checkout, no card, and no email collected.
- The interest action is optional consent-gated analytics. It records the chosen
  price hypothesis only; it cannot reserve, unlock, order, or purchase anything.
- First-time play remains free of a purchase prompt. Returning captains get a
  compact direct research doorway and Settings keeps the full route entry.
- Legacy query-string store previews expose no checkout action.

## Gate to request Stripe information

`pnpm verify:revenue-readiness` is fail-closed. It requires every named
non-payment gate to score **8 or higher**. The scorecard must keep
`stripeDetailsAllowed: false` while even one gate is below 8. A polished offer
does not compensate for missing identity, recovery, durable progression,
entitlements, privacy, reliability, operations, external value evidence, or an
independent audit.

When every non-payment gate passes, the next increment is still a **private
Stripe sandbox**, not live money. The owner can then enter sensitive details in
Stripe directly, and Wormifi must prove verified webhooks, retries, renewal,
cancellation, refund, dispute, restoration, customer self-service, tax/legal
configuration, reconciliation, and a kill switch before a limited live cohort.

This contract deliberately separates a compelling offer from permission to
take money. Both are required for honest, durable revenue.
