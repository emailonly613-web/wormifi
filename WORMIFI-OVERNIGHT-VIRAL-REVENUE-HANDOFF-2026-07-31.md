# Wormifi overnight viral/revenue handoff

Date: 2026-07-31
Authoritative implementation workspace: `D:\wormifi-art`
Branch: `codex/p0-treasure-powerups`
Base and current committed revision: `3439d49067febb723a6fc7ccc8d1effc8e5306fb`
Status: large local implementation increment, verified but uncommitted and undeployed

## Executive verdict

This session materially advanced Wormifi as a game and as a future business, but it did not make Wormifi payment-ready, publicly scalable, independently audited, or proven viral.

The largest gains are:

1. Worms now read correctly while turning, have smoother bodies, and support modular face/eye choices.
2. Both Practice and Live now create competitive pressure through named rankings, scores, and an honest player position.
3. Charging objectives, timed multipliers, Treasure Magnet, and Twin Turbo Lightning are clearer and more exciting.
4. Captain Passport now has a guest-first account foundation, local durable progression, passkeys, one-time email links, recovery, sessions, reconnect binding, and a provider-neutral entitlement ledger.
5. The viral loop now has consent-only analytics and a predeclared external-player test contract.
6. Captain Rooms now has a free viral-launch path: one tap creates and copies a unique 10/20/30-player link, and invited guests enter that exact arena without a login or payment wall.

The earlier `$4.99`/10-credit candidate was removed from the launch product after the owner locked rooms as 100% free during viral growth. No checkout exists. No credit balance is sold. No real email is sent. No provider or paid service was provisioned. No deployment, commit, push, or publicity action occurred.

## What was implemented

### 1. Worm body, head, and identity quality

- The head stays visually upright instead of rotating upside down during travel.
- Leftward travel mirrors the head while keeping facial features readable.
- Broad body volume bands and restrained seams replace thin road-like lines.
- Common treasure glints are now visually sparse and deterministic; all items retain authored sprites, shadows, and motion.
- Customization supports:
  - full captain face;
  - feature-only face;
  - eyes-only face;
  - eye styles;
  - expressions.
- Existing saved looks remain compatible.

Primary implementation:

- `src/game/treasureRender.ts`
- `src/game/captainFeatures.ts`
- `src/game/photoSkin.ts`
- `src/game/photoSkinCanvas.ts`
- `src/game/pirateSpriteAtlas.ts`
- `src/components/SkinStudio.tsx`

### 2. Competitive leaderboard pressure

- Practice now shows named top-ten bots with scores.
- Live now shows named top-ten players with scores.
- The player always receives an honest `YOU #rank / alive total` placement, including when outside the top ten.
- The leaderboard sits next to the radar and remains usable on compact landscape layouts.
- Named rank recalculation is deliberately limited to about 2.5 updates per second while score/size/timer HUD values remain responsive. This reduces needless React work without making standings feel stale.

Primary implementation:

- `src/components/ArenaCanvas.tsx`
- `src/components/LiveArenaCanvas.tsx`
- `src/styles.css`

### 3. Charging objectives

Small charging objectives are now physical ring challenges:

| Objective | Type | Hold time | Reward |
|---|---|---:|---:|
| Coin Cay | Capstan ring | 1.5 seconds | +9 |
| Coral Key | Capstan ring | 2.25 seconds | +20 |
| Kraken Atoll | Large harbor pad | 7 seconds | +42 |

Small rings use orbit beads, directional flow, docking feedback, visible prize growth, progress, and a completion burst. The large pad remains the major staged objective and now communicates escalating value visually without relying on arena text.

Primary implementation:

- `src/game/chargingStations.ts`
- `src/game/chargingStationRender.ts`
- `docs/WRAP-CHARGING-STATION-CONTRACT.md`

### 4. Treasure Magnet and timed powers

- Public name: `Treasure Magnet`.
- The existing internal `loot-compass` identifier remains unchanged for protocol and replay compatibility.
- Face beams only appear while Treasure Magnet is active.
- Magnet extends ordinary pickup reach authoritatively.
- Rival Remains remain outside magnetic pull for fairness.
- The top HUD is an open treasure chest showing the active power, strength/tier, remaining time, and visual countdown.
- Timed multipliers now include 2x, 3x, 4x, 5x, and 10x.
- Deterministic multiplier cadence: `2, 3, 4, 5, 10, 2, 3, 2, 4, 2`.
- Twin Turbo Lightning was added as `storm-battery`.
  - It grants seven seconds of zero-cost normal Turbo.
  - This equals two full 3.5-second starting Turbo tanks.
  - It does not add immunity, collision advantage, or speed beyond normal Turbo.
- Full invisibility was not implemented. A future Ghost Veil must retain an opponent-visible wake or outline and pass a fairness test before release.

Primary implementation:

- `public/assets/relics/treasure-magnet.svg`
- `public/assets/relics/storm-battery.svg`
- `src/components/RelicStatus.tsx`
- `src/game/relics.ts`
- `src/game/relicDirector.ts`
- `src/game/relicPresentation.ts`
- `src/game/relicCanvasRender.ts`
- `docs/PIRATE-POWER-PARITY-CONTRACT.md`

### 5. Captain Passport

Captain Passport remains optional. A player can launch and play as a guest without creating an account.

Implemented server foundations:

- passkey signup and authentication;
- one-time email-link signup and authentication;
- recovery flow;
- sessions;
- keyed email lookup;
- one-time token handling;
- local in-memory and SQLite stores;
- account-bound reconnect;
- server-owned life identifiers;
- idempotent progress writes;
- HTTP routes and cookie-bound WebSocket identity;
- explicit local-only email adapter.

Privacy boundaries:

- raw email addresses are not durably stored;
- raw email-link tokens are not durably stored;
- marketing consent is not bundled into signup;
- local email delivery is explicit and cannot silently become production mail;
- browser-editable preview progress is separate from verified live progress.

Implemented product UI:

- guest-first launcher;
- lazy-loaded Passport panel;
- passkey and one-time email-link choices;
- post-run save-progress nudge;
- restored account profile and entitlements;
- no signup wall before play.

Primary implementation:

- `server/src/passport/`
- `server/src/room.ts`
- `server/src/server.ts`
- `server/src/cli.ts`
- `src/passport/`
- `src/components/CaptainPassport.tsx`
- `src/App.tsx`
- `docs/CAPTAIN-PASSPORT-OPTIONAL-EMAIL-AMENDMENT.md`

This is not a hosted production identity system. Production database hosting, real email delivery, passkey domain configuration, backup/restore drills, abuse controls, and legal/age review remain required.

### 6. Provider-neutral entitlement ledger

An append-only entitlement ledger now derives ownership and paid-through access independently from any payment provider.

Implemented properties:

- event and external-reference deduplication;
- named reversals;
- reversal-target validation;
- monotonic paid-through time, so reordered events cannot shorten access;
- cancellation-at-period-end semantics;
- permanent ownership restore after SQLite restart;
- atomic entitlement and Captain Log writes;
- one-way hashed external provider references;
- no public route that can grant an entitlement from a browser.

Current product identifiers:

- `captain-club-monthly-v1`
- `legend-voyage-lifetime-v1`

This ledger is a safe foundation, not payment fulfillment. There is no Stripe webhook, receipt validation, tax handling, refund workflow, dispute workflow, or independent audit.

### 7. Consent-only viral and retention measurement

The analytics vocabulary now covers:

- landing and play;
- first positive treasure pickup;
- life end and retry;
- customization;
- offer view;
- invite creation, open, and join;
- both friends playing;
- Passport prompt, method, completion, disconnect, and reconnect;
- hosted-room offer view and interest;
- client errors.

D1 and D7 return windows are defined honestly, and storage occurs only after analytics consent.

The predeclared external test requires:

- 20 first-time players;
- five friend pairs;
- 11 comprehension, retention, fairness, and hosted-room gates.

Its machine-readable status is intentionally `predeclared_not_run`. No retention or viral claim can be made until real independent players complete it.

Primary artifacts:

- `src/analytics.ts`
- `docs/WORMIFI-RETENTION-VIRAL-EXPERIMENT-V1.json`
- `docs/EXTERNAL-PLAYER-PASSPORT-VIRAL-TEST-PACK.md`
- `docs/EXTERNAL-PLAYER-OBSERVATION-SHEET.csv`
- `scripts/verify-retention-viral-experiment.mjs`

### 8. Captain Rooms free viral launch

Locked launch choices:

| Private room | Host | Invitees |
|---|---:|---:|
| Up to 10 human players | Free | Free |
| Up to 20 human players | Free | Free |
| Up to 30 human players | Free | Free |

There is no room credit, purchase window, subscription, invite fee, per-life fee, or visible launch price.

Frictionless link path:

- the host chooses 10, 20, or 30 seats;
- one tap cryptographically creates an opaque `captain-{seats}-{20 hex}` room id;
- the product attempts to copy the clean link immediately;
- the visible Copy Link/Share dialog is always available as fallback;
- on the production origin the link is `https://wormifi.com/?room={opaque-room-id}`;
- friends who open the link receive a guest name and enter Live play immediately;
- no Play button, Captain Passport, email, or payment pop-up interrupts invited guests.

Server-trusted room foundations:

- exact capacity enforcement for 10/20/30 human players;
- capacity and board are derived from the validated room id;
- no bots presented as invited people;
- private boards absent from the public room catalog;
- separate board IDs and sizes;
- deterministic overflow rejection with `ROOM_FULL`;
- public query parameters and join messages cannot override private boards or pace.

Monetization was deliberately moved outside the invite path. Possible later lanes are between-run ads after meaningful play, optional rewarded ads for cosmetics, premium cosmetics, and organizer presentation tools. None was added to the owned launch merely because free rooms exist.

Still required before broad public scale:

- room ownership, invite reset, authorization, moderation, and abuse controls;
- reconnect and host-disconnect policy;
- resource-exhaustion and room-creation rate proof;
- support tools;
- real two-context and multi-client public-WAN proof;
- real retention proof before independent ad/shop monetization;
- legal/age review;
- independent audit.

The parked `$4.99`/10-credit idea is future research only and cannot return to the launch surface without a new explicit owner decision after the free viral baseline is measured.

Primary implementation:

- `src/game/captainRooms.ts`
- `server/src/captain-rooms.ts`
- `src/components/CaptainRooms.tsx`
- `docs/CAPTAIN-ROOMS-DIRECT-REVENUE-CONTRACT.md`

## Verification evidence

### Code and rules

- Root unit/integration tests: **55 files, 307 tests passed**
- Server tests: **50 passed**
- Root TypeScript check: **passed**
- Server TypeScript check: **passed**
- Normal production build: **passed**
- Revenue verifier:
  - `REVENUE_READINESS=BLOCKED`
  - `STRIPE_DETAILS_ALLOWED=NO`
  - `LOWEST_GATE=independent_audit:0`
- Retention verifier:
  - `RETENTION_VIRAL_EXPERIMENT=PREDECLARED_NOT_RUN`
  - `FIRST_TIME_PLAYERS=20`
  - `FRIEND_PAIRS=5`
  - `GATES=11`

### Browser

- Full main browser suite after the broad UI work: **68 passed, 6 intentional project skips, 0 failed**
- Final focused normal-build regression after the free-room pivot: **32 passed, 2 intentional mobile skips, 0 failed**
- Multiplayer laboratory: **7 passed**
- Accessibility across Chromium, Firefox, and WebKit: **12 passed**
- Offline PWA check: **1 passed**
- Passport browser tests: **2 passed**
- Captain Rooms browser tests: **2 passed**

The final focused pass covered one-tap free-room creation/copy, a second guest browser auto-entering the same room with no Passport/Play/payment wall, Captain Rooms mobile one-screen fit, ordinary guest launch, fullscreen fallbacks, Practice labels, friend links, rivalry challenge, touch steering, customization persistence, keyboard focus, result retry, and reduced motion.

### Visual proof

- `proof/browser/mobile-hud/03-landscape-390-treasure-magnet.png`
- `proof/browser/multiplayer/04-collector-active.png`
- `proof/browser/captain-rooms/desktop-chromium-free-options.png`
- `proof/browser/captain-rooms/mobile-chromium-free-options.png`
- `proof/browser/captain-rooms/desktop-chromium-free-link.png`
- `proof/browser/captain-rooms/mobile-chromium-free-link.png`
- `proof/browser/multiplayer/08-live-chain-cut-celebration.png`
- `proof/browser/multiplayer/05-live-mobile-touch.png`
- `proof/browser/multiplayer/06-live-mobile-death.png`

## Performance: honest status

The work reduced measurable rendering and React overhead:

- named leaderboard reconciliation is bounded;
- ordinary treasure glints are sparser;
- centerline celebration particles are bounded and tested;
- live particle emissions have cumulative diagnostics;
- the 15-second unchanged-threshold diagnostic passed both scenes in one run.

The strict 60-second local smoothness gate is **not repeatably green**.

Latest full result:

- overall: `LOCAL_SMOOTHNESS_GATE_MISS`
- crowded Practice:
  - 54.902 average canvas FPS against a 55 minimum;
  - 25.3 ms p95 canvas-frame gap against a 22 ms maximum;
  - 0 long tasks;
  - 3 slow frames out of 3,301;
  - 3.6 ms p95 animation callback;
  - 10.6 ms p95 input-to-next-paint;
  - 1.225 MiB post-GC retained growth.
- authoritative Live:
  - 59.622 average canvas FPS;
  - 18.1 ms p95 canvas-frame gap;
  - 0 long tasks;
  - 2.0 ms p95 animation callback;
  - 6.8 ms p95 input-to-next-paint;
  - 15.014 authoritative snapshots per second;
  - passed every gate.

An immediately prior full run reversed the marginal scene result: Practice passed and Live missed its p95 by 0.1 ms. The environment therefore shows timing variance near the strict threshold. This is not permission to average away a miss.

Evidence:

- `proof/performance/smoothness-gate-latest.json`
- `proof/performance/leaderboard-memo-diagnostic-15s.json`
- `proof/performance/sparse-glint-diagnostic-15s.json`
- `proof/performance/live-longtask-profile-latest.json`

Required next performance proof:

1. make the full 60-second gate repeatably green across consecutive runs;
2. test crowded Practice and authoritative Live on real low-end mobile hardware;
3. perform the required longer preview and public-candidate soaks;
4. retain the existing input, memory, snapshot, and browser-error gates.

## Readiness score

These are engineering judgments, not externally audited scores:

| Area | Current estimate | Why |
|---|---:|---|
| Moment-to-moment game feel | 7/10 | major visual, objective, power, HUD, and competition gains |
| Visual identity foundation | 6/10 | modular authored direction exists; deeper premium catalog still needed |
| Guest-first identity | 6/10 | strong local Passport foundation; hosted operations absent |
| Durable progression | 6/10 | verified server binding and persistence foundation; live hosted durability absent |
| Entitlements | 5/10 | good provider-neutral ledger; no provider fulfillment or audit |
| Viral measurement | 5/10 | instrumentation and predeclared test exist; real cohort has not run |
| Captain Rooms viral distribution | 6/10 | free link, instant guest entry, trusted tier capacity, and copy fallback exist; public capacity/moderation proof absent |
| Payments | 0/10 | intentionally blocked |
| Independent audit | 0/10 | not started |
| Complete business | roughly 6/10 | stronger technical beta, not yet a proven viral revenue business |

## Best next order

1. Run the 20-player/five-friend-pair external observation pilot.
2. Fix any comprehension, first-minute fun, leaderboard, charging, Magnet, and Captain Rooms issues discovered by real players.
3. Make the strict 60-second performance gate repeatably green and add low-end mobile proof.
4. Put Passport and progression on an approved hosted database with backup/restore and abuse controls.
5. Add free-room ownership, invite reset, host/invite authorization, moderation, rate limits, and reconnect rules.
6. Expand the premium cosmetic catalog only after the strongest customization preferences are observed.
7. Test between-run and rewarded-cosmetic ad concepts only after the free room loop proves it adds retention; keep ads out of first play and the invite path.
8. Complete legal/age/COPPA review and an independent security/economy audit.
9. Only then connect a private payment sandbox for non-room monetization and test receipts, reversals, refunds, disputes, tax, and support.
10. Keep the major publicity moment parked until first-play conversion, playtime, friend completion, D1, D7, and operational gates are measured.

## Scope and preservation record

- Authoritative code work occurred only in `D:\wormifi-art`.
- `D:\wormifi` was not used for implementation and was not cleaned or rewritten.
- No additional public revision was created.
- Current committed revision remains `3439d49067febb723a6fc7ccc8d1effc8e5306fb`.
- No commit was created.
- No branch was pushed.
- No deployment was performed.
- No payment provider was connected.
- No real email was sent.
- No paid infrastructure was provisioned.
- No production credentials were requested or exposed.

The local worktree is intentionally dirty and contains the implementation plus regenerated browser proof. Preserve it until a deliberate review/commit decision is made.

## Next session mandate: judge the release, then choose the top ten

The next session owns its judgment. It must not treat this handoff, its scores,
or the implementing session's confidence as acceptance evidence.

Its responsibility is deliberately twofold.

### Responsibility 1: independently judge what this session delivered

1. Start from the exact public revision and confirm static-client and
   authoritative-server revision identity.
2. Inspect the live product directly on desktop and mobile. Do not judge from
   filenames, screenshots, test names, or this summary alone.
3. Re-test the highest-risk claims: free Captain Room creation/copy, instant
   guest entry into the same room, exact 10/20/30 authority, no login/payment
   wall, named ranking, upright heads, Treasure Magnet timing, multipliers,
   Twin Turbo Lightning, charging objectives, customization, reconnect, and
   guest-first play.
4. Separate automated proof, two-browser proof, public-WAN proof, real-player
   observation, and inference. One category cannot substitute for another.
5. Record regressions and misleading or confusing moments even when all tests
   pass.
6. Preserve the existing hard boundaries: payments blocked, no unsupported
   scale/retention/viral claim, and no production Passport durability claim
   without its provider/legal/operations gates.

The output of this responsibility is an evidence-backed verdict for every
material lane: accepted, accepted with limitation, rejected, or not yet proven.

### Responsibility 2: judge Wormifi as one whole product and rank the top ten enhancements

After the independent audit, stop looking at features in isolation. Play and
inspect the entire loop from landing through first control, first treasure,
competition, death, retry, friend invite, customization, return, and possible
future monetization. Then produce exactly ten enhancement opportunities ranked
by expected effect on:

1. first-minute comprehension and delight;
2. control feel and visual smoothness;
3. competitive tension and social proof;
4. invite creation-to-both-friends-playing completion;
5. replay and return motivation;
6. distinctive visual identity and cosmetic desire;
7. fairness and trust;
8. mobile reach and low-end performance;
9. operational safety and public capacity;
10. revenue potential that does not damage the viral loop.

Each ranked enhancement must include:

- the observed player/product problem;
- direct evidence and the exact surface where it occurs;
- why it outranks the other candidates;
- expected viral, retention, or revenue mechanism;
- smallest credible implementation slice;
- objective acceptance test;
- risk, cost, dependency, and rollback path;
- whether it belongs now, after the external pilot, or after legal/audit gates.

Do not manufacture ten items by splitting one idea into variants. Do not assume
that the latest feature is the most important. The ranking must cover Wormifi
as a complete game and business, and it may reject or reverse work from this
session when the live evidence justifies that judgment.
