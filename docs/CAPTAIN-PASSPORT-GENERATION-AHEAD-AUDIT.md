# Captain Passport generation-ahead audit contract

**Audit date:** 2026-07-30

**Status:** P0 contract accepted for implementation; accounts and payments are not live.

**Fixed order:** account identity -> server-owned progression -> durable entitlements -> private payment proof -> limited live money.

## Objective

Build a trustworthy Captain Passport that is materially ahead of the current
worm-arena category, not merely a larger catalog. The lead must be demonstrated
by independent player comprehension, adversarial tests, recovery drills, and
production evidence. AI may accelerate research, threat modeling, test
generation, accessibility review, and anomaly analysis; it may not invent
evidence, approve its own work, grant progression, or make payment decisions.

The proposed product advantage is a guest-first, passwordless account with
server-verified progression and a customer-readable history of every earned
reward and permanent cosmetic. It collects no email or password by default,
sells no competitive power, uses no loot boxes, and lets a player inspect and
revoke active sessions. That combination is the candidate generation-ahead
system. It is not a public claim until all gates in this document pass.

## Evidence standard

- A feature existing is not proof that players understand or value it.
- A local test is not proof of persistence across deployment or device loss.
- A successful payment is not proof of correct fulfillment, refund, dispute,
  tax, support, or recovery behavior.
- AI-generated analysis is a hypothesis until a deterministic test, human
  review, primary source, or operating measurement confirms it.
- Failed evidence stays visible. Thresholds are declared before results are
  inspected, and samples too small to decide are labeled inconclusive.
- Every release increment gets a source revision, automated result, public
  identity check when deployed, and an explicit list of what remains unproven.

## Current category opportunity

The detailed evidence and primary-source register live in
`docs/CURRENT-COMPETITOR-BENCHMARK.md`. This audit uses that research without
turning store claims, rating counts, or download counts into revenue claims.

| Observed category pattern | Wormifi response | Measurable advantage required |
|---|---|---|
| Ads interrupt death and retry | Never place an interstitial between death and Retry | Automated navigation audit plus observed sessions find zero retry interruption |
| Coin packs, subscriptions, loot boxes, and paid boosters obscure value | One plainly priced permanent cosmetic route; no consumable currency or randomized reward | Catalog audit finds zero paid stats, odds, lives, skips, multipliers, zoom, radar, or starting power |
| Accounts commonly add email/password and tracking | Guest-first play; optional discoverable passkey; no password or email required | New-device restore succeeds without stored browser data or personal-data lookup |
| Progression and purchases are hard to explain | Customer-visible append-only Captain Log | Every displayed XP and entitlement state traces to one immutable event |
| Long runs can disappear on disconnect | Server-validated run completion, bounded reconnect, and explicit failure result | Duplicate/reconnect/failure tests never double-award or invent a verified run |
| Refund and device-loss restoration are often opaque | Provider-neutral entitlement state with reversal history and cross-device restore | Sandbox refund/dispute and fresh-device restoration reconcile automatically |

These are design opportunities, not claims that every competitor lacks every
control. No “generation ahead” marketing language ships until an independent
review reproduces the required evidence.

## Wormifi baseline audit

| Area | Current evidence | Risk | Required disposition |
|---|---|---|---|
| Captain progression | `src/game/captainProgression.ts` calculates awards and writes `localStorage` | A player can edit or lose XP; it is not account truth | Keep clearly labeled preview only until live-run XP is awarded server-side and stored durably |
| Premium ownership | `src/game/premiumSkins.ts` stores a Stripe-session HMAC on one device | No account binding, cross-device restore, refund state, or durable ownership record | Historic test grants remain development-only; all future support uses the entitlement ledger |
| Store fulfillment | `store/src/server.mjs` re-reads a Checkout Session but stores nothing | No webhook idempotency, refund/dispute reconciliation, purchaser binding, or audit trail | Public checkout fails closed now; rebuild only after identity and entitlements pass |
| Live persistence | The arena service owns rooms, sessions, and reconnect tokens in memory | A replacement loses active state; local filesystem is ephemeral | Add PostgreSQL for account records only after the explicit infrastructure-cost approval |
| Game authority | The live server accepts steering/boost input and owns simulation truth | Good authority base, but no account binding or idempotent life record | Bind an authenticated session to a player and award from authoritative life events only |
| Analytics | `src/analytics.ts` is consent-gated and intentionally minimal | Useful for aggregate interest, not an account or financial ledger | Keep optional analytics separate from essential account/security records |
| Privacy copy | `privacy.html` truthfully says the preview collects no account or purchase history | It becomes false the moment accounts launch | Update, review, and deploy disclosure before the first account is created |
| Operations | Existing load/network/performance suites cover the arena | No database backup/restore, session-revocation, or entitlement reconciliation drill | Add failure injection and operator runbooks before money |

## Non-negotiable product rules

1. Guest play remains immediate and never requires an account, store visit, ad,
   or consent to optional analytics.
2. A Captain Passport is optional and passkey-first. Wormifi does not create a
   password database or require email merely to preserve cosmetics.
3. Payment never grants XP, score, size, speed, boost, collision tolerance,
   multiplier odds, radar/zoom intelligence, Relic power, lives, rank, or skips.
4. Every existing free theme remains free. The player can try the complete paid
   visual treatment before purchase.
5. No loot boxes, consumable premium currency, deceptive scarcity, forced
   sharing, paid streak protection, or subscription lock is introduced.
6. The client may request and display state; it may never author XP,
   entitlements, payment status, refund state, or reconciliation outcomes.
7. Essential account/security records and optional analytics remain separate.
   Declining analytics never blocks identity, progression, restoration, or
   support.
8. Stripe remains one possible settlement rail, not the ownership database.
   Platform-specific builds use only the payment rail their platform permits.

## Target architecture and records

### Captain account

- Opaque random `account_id`; no email, password, legal name, or birth date in
  the minimum account record.
- One or more WebAuthn credentials, each with credential ID, public key,
  signature counter/device metadata, creation time, last-use time, and revocation
  state. Private keys never reach Wormifi.
- Server-generated, short-lived, single-use registration/authentication
  challenges bound to expected origin and relying-party ID.
- Opaque random session token stored only as a server-side hash, with creation,
  last-use, expiry, device label, and revocation time.
- One saved recovery code with at least 64 random bits, shown once, hashed
  server-side, throttled, invalidated after use, and replaced immediately.

### Authoritative progression ledger

Each completed eligible life produces one immutable event containing account,
room, life ID, authoritative final score/kills/rank/peak mass, ruleset version,
award formula version, XP delta, server time, and a unique idempotency key. A
derived balance is a cache; the ledger is truth. Practice/local runs never enter
the durable competitive ledger.

The first implementation may award only a strict subset of outcomes. It must
never accept arbitrary client-reported run summaries to gain feature coverage.

### Entitlement ledger

Entitlements use platform-neutral product/version IDs. Immutable events record
`grant`, `refund`, `reversal`, `chargeback`, `restore`, and reviewed correction,
with provider, provider object IDs, account, currency/amount snapshot, reason,
source event, idempotency key, and timestamps. Current access is a projection of
the event history, never a browser token or mutable paid boolean.

### Captain Log

The player sees plain-language entries for XP awards, account recovery, passkey
changes, session revocation, cosmetic grants, and reversals. Sensitive provider
or security values are not exposed. This log is the trust surface and a support
tool, not marketing decoration.

## Security and abuse audit

| Threat | Required control | Required proof |
|---|---|---|
| Client submits a fake score or XP delta | No public award endpoint; server life event is the only source | Malformed and forged requests cannot change the ledger |
| Reconnect or retry duplicates a run | Database unique idempotency key and transaction | 100 concurrent duplicates create exactly one award |
| Stolen browser storage reuses a session | High-entropy token, server hash, expiry, device list, immediate revoke | Revoked token fails on the next protected request and socket bind |
| WebAuthn replay or origin confusion | Random stored challenge, one use, short TTL, exact RP/origin verification | Reused, expired, wrong-origin, and wrong-RP ceremonies fail |
| Recovery-code guessing or reuse | 64+ random bits, slow approved hash, throttling, generic response, rotate on use | Old code always fails; parallel redemption yields one winner |
| Account enumeration | No public username lookup; equivalent generic failures and timing review | Unknown and known-account failures are indistinguishable at the contract level |
| Entitlement granted from client redirect | Signed provider webhook plus server retrieval and idempotent transaction | Success URL, query string, and client payload alone grant nothing |
| Refund/dispute leaves access active | Reconciled provider event writes a reversal projection | Sandbox reversal removes supported access and remains in the log |
| Operator or AI silently edits value | Append-only events, reasoned correction event, restricted role, audit log | Direct balance mutation is denied and corrections remain attributable |
| Database loss or bad migration | Automated backups, restore drill, backward-compatible migration/rollback | Timed restore into a clean environment reproduces ledger totals |

The account design follows the current WebAuthn specification for trusted,
server-generated challenges and the NIST recovery-code requirements for random,
hashed, throttled, single-use codes. OWASP authentication, session, REST, and
forgot-password guidance define the negative-path and enumeration review.

## Generation-ahead release gates

All are fail-closed:

1. **Identity:** passkey create/sign-in/sign-out works on the supported desktop
   and mobile matrix; cross-device sign-in p95 is under five seconds after the
   platform prompt; unsupported browsers get an honest guest path.
2. **Recovery:** a saved recovery code is displayed once, never logged, stored
   only as a hash, rate-limited, single-use under concurrency, and rotated after
   redemption. Lost-passkey recovery has observed human comprehension evidence.
3. **Sessions:** active sessions are visible with understandable device/time
   labels; single-session and revoke-all take effect on the next protected
   request and invalidate authenticated WebSocket binding.
4. **Progression:** zero client-originated awards are accepted; every eligible
   authoritative life awards once; duplicate, reconnect, process-retry, and
   delayed-transaction tests preserve exact totals.
5. **Entitlements:** every access state is explainable from immutable events;
   grants, duplicate webhooks, refunds, partial failure, dispute, and replayed
   events reconcile deterministically.
6. **Fairness:** automated catalog and protocol audits find zero paid gameplay
   modifier. Paid rendering is cosmetic and cannot change the collision or
   authoritative simulation state.
7. **Privacy:** data inventory, retention, export, deletion, analytics separation,
   age handling, and public disclosure receive owner/legal review before account
   launch. Deletion does not corrupt legally required financial records.
8. **Accessibility:** Passport, Captain Log, recovery, session management, and
   purchase preview pass keyboard, screen-reader naming, zoom/reflow, contrast,
   reduced-motion, and error-recovery tests.
9. **Reliability:** account APIs meet predeclared latency/error targets under
   burst and failure injection; active-play frame pacing does not regress; arena
   reconnect behavior remains within its existing gate.
10. **Operations:** database backup/restore, key rotation, migration rollback,
    entitlement reconciliation, support lookup, incident disable, and refund
    runbooks are executed by a human other than the implementer.
11. **Value:** observed external players can explain permanence, cosmetic-only
    fairness, exact contents, recovery, and price without coaching. Price/value
    thresholds are declared before results and inconclusive samples do not pass.
12. **Independent audit:** a separate reviewer reproduces the security, fairness,
    accessibility, recovery, and financial-ledger evidence on the exact release
    revision. Only then may the candidate be described as generation-ahead.

## Fixed implementation and shipping order

Each phase is an independently reviewable increment. A later phase cannot be
used to paper over a failure in an earlier one.

1. **Money lock and contract:** public checkout has no runtime enable switch or
   Stripe call path; legacy payment secrets are removed from the service; this
   audit and its tests are committed, pushed, deployed, and publicly verifiable.
2. **Local account core:** database schema, passkey ceremonies, recovery codes,
   hashed sessions, rate limits, and adversarial tests. No paid infrastructure
   and no player-facing account claim yet.
3. **Durable account beta:** after explicit database-cost approval, provision the
   smallest isolated PostgreSQL beta database, deploy, and prove fresh-device
   restore, revocation, migration, backup, and restore. No payment.
4. **Server-owned progression:** bind accounts to live sessions, write
   authoritative idempotent life events, migrate the UI from local preview, and
   prove no performance/fairness regression.
5. **Durable entitlements:** add the provider-neutral ledger, Captain Log,
   account export/deletion behavior, and correction/reversal model. Still no
   checkout.
6. **Private payment sandbox:** behind an operator-only flag, prove checkout,
   signed webhooks, retrieval, retries, duplicate delivery, fulfillment,
   refund, dispute, reconciliation, support, tax/legal/platform, and disable.
7. **Evidence review:** compare external comprehension/value results and all
   technical gates with predeclared thresholds. “Promising” is not “passed.”
8. **Limited live money:** only after a separate explicit authorization, enable
   a small cohort with a kill switch and daily reconciliation; expand only after
   every payment maps to exactly one explainable entitlement.

## Cost and authorization boundary

Local implementation and testing require no paid service. DigitalOcean App
Platform local container storage is ephemeral, so a durable live account beta
requires a database. At the audit date, DigitalOcean documents its smallest App
Platform development PostgreSQL database at **$7/month**, billed hourly. This is
suitable only for a low-risk no-payment beta, not production financial
availability. It must not be provisioned until the owner explicitly approves
that recurring cost.

Stripe activation, live keys, live charges, and bank settlement require a later,
separate explicit authorization. Database approval does not imply payment
approval.

## Primary standards and operating references

- [NIST SP 800-63B authentication and recovery](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [W3C Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [DigitalOcean App Platform pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/)
- [DigitalOcean App spec reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/)

## Audit cadence

- Review requirements and threats before each phase starts.
- Review implementation and negative tests before merge.
- Review deployment identity and public behavior after each deploy.
- Review security, privacy, accessibility, recovery, and operations again before
  any phase changes the authorization boundary.
- Re-run the competitor and standards audit before the private payment sandbox
  and before limited live money; time-sensitive facts may not be copied forward
  without verification.
