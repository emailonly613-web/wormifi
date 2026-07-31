# Captain Passport optional email-link amendment

**Decision date:** 2026-07-31
**Status:** local implementation contract; not deployed; no email provider connected
**Amends:** `CAPTAIN-PASSPORT-GENERATION-AHEAD-AUDIT.md`

## Owner decision

Wormifi may offer **optional passwordless email-link sign-in** so a returning
player can recover the same Captain Passport and its server-owned progress.
This does not replace the original guest-first and passkey-first contract:

- play starts without an account;
- the save invitation appears only after earned progress or an explicit player
  action;
- passkeys remain the lowest-data default;
- email is optional and is never required to play;
- there is no password database;
- a sign-in email is not marketing consent;
- no real email may be sent until the delivery provider, public privacy copy,
  retention/deletion behavior, age treatment, abuse limits, and owner/legal
  review pass;
- no account or email feature authorizes payments.

## Storage and privacy contract

The raw email address exists only in the one request needed to deliver a
one-time link. Durable storage contains a keyed HMAC lookup digest, not the raw
address. Link secrets and session secrets are 256-bit random values stored only
as keyed hashes. Links are short-lived, single-use, rate-limited by address
digest and network key, and produce the same public response whether an address
already belongs to an account.

The email delivery adapter receives the raw address because delivery is
impossible without it. It may not log the address or link secret. Provider
selection must document retention, subprocessors, bounce handling, suppression,
deletion, breach response, regional transfer, and child/parent contact behavior
before public use.

## Progress contract

Signing in does not convert editable browser XP into trusted XP. Existing
device-local XP remains visibly labeled `PREVIEW XP`.

After authentication:

1. the HttpOnly Passport session cookie binds to a new live WebSocket;
2. the authoritative arena, not the browser, produces a unique life result;
3. one immutable Captain Log event is written per life idempotency key;
4. the server derives XP from the existing versioned formula;
5. the returning session reads the derived server-owned progression.

Solo, practice, and historic browser runs remain local preview until they have
their own server-authoritative execution contract. This avoids turning account
creation into an XP forgery endpoint.

## Shipping boundary

The local increment may include routes, UI, SQLite persistence, migrations,
provider-neutral delivery interfaces, security tests, and browser proof.

It may not:

- send real email;
- provision a hosted database;
- deploy account collection;
- silently import client-authored XP;
- weaken guest play;
- enable checkout or request Stripe details;
- claim public cross-device restore, child-safety compliance, production
  reliability, or independent audit.

## Acceptance required before public email-link beta

- owner/legal decision on intended audience and age treatment;
- exact public privacy/data-retention/export/deletion copy;
- approved transactional-email provider and data-processing review;
- verified sender domain, DMARC/SPF/DKIM, bounce and abuse controls;
- generic enumeration-resistant responses and timing review;
- origin/CSRF/body-size/rate-limit/expiry/replay/concurrency tests;
- real inbox tests across the supported desktop/mobile matrix;
- account deletion and provider deletion drill;
- fresh-device restore, session revoke, backup, restore, migration rollback,
  and incident-disable proof;
- accessibility and external-player comprehension evidence.

Until those pass, email-link support is a **provider-neutral local beta
foundation**, not a public account feature.
