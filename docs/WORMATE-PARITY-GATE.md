# Wormifi experiential parity gate

Wormifi may learn from the proven readability and repeat-play loop of established
growth-arena games, but it must not copy Wormate artwork, maps, interface, sounds,
characters, names, copy, progression data, or other protected expression.

This gate defines evidence required before anyone says Wormifi is at the same
experiential level as Wormate. It is a quality threshold, not a revenue, retention,
or virality guarantee.

## Non-negotiable status rule

**A bot-only build is not parity.**

A polished local arena with labeled bots is the Arena Core vertical slice. It can
prove movement, growth, collisions, performance, visual identity, and restart
pleasure. It cannot prove multiplayer latency, room reliability, human tactics,
reconnect behavior, matchmaking, social rivalry, or live-service durability.

The words `parity`, `multiplayer-ready`, and `10/10` remain FAIL until every gate
below has current evidence. Synthetic clients support stress proof but do not replace
independent human playtests.

## Gate 1 — Immediate comprehension

- First useful control is available within five seconds of load.
- A first-time adult and a child can start, steer, collect, understand growth, and
  identify the main danger without spoken coaching.
- Rush, Endless, and Practice are named honestly; bots are visibly labeled.
- Desktop and mobile Playwright first-session tests pass using accessible controls,
  not fragile pixel coordinates.
- No account, advertisement, purchase prompt, or tutorial wall appears before play.

## Gate 2 — Core feel

- Pointer, touch, and keyboard steering are responsive and produce the same legal
  simulation inputs.
- Collection, growth, boost cost, near miss, collision, elimination, and restart each
  have clear visual and audio feedback.
- Every death has an understandable cause; unexplained collision deaths are release
  blockers.
- Instant restart works without a navigation or asset reload.
- Seeded simulation and replay checksums are deterministic.

## Gate 3 — A living, original game

- The player chain has expressive followers and readable reactions at gameplay size.
- The world, characters, food, effects, HUD, sound, and language are recognizably
  Wormifi and not a reskin of another arena game.
- A run creates at least one replayable story beat: ambush, escape, reversal,
  elimination, or personal record.
- Cosmetics remain identity-only; no purchased competitive advantage is permitted.

## Gate 4 — Real authoritative multiplayer

- The public game connects to a server-authoritative room; the server owns movement,
  food, growth, boost eligibility, collision, elimination, and score.
- At least 24 independently controlled clients can complete repeated room sessions.
- At least 10 external human players complete a supervised multi-device playtest;
  automated clients do not satisfy this item.
- Two-client collision outcomes match the authoritative replay.
- Stale, malformed, excessive, and impossible inputs are rejected server-side.
- Practice remains available and labeled when a player intentionally chooses bots.

Until every item in this gate passes, the build must be described as **bot-first
preview**, never multiplayer parity.

## Gate 5 — Network and room reliability

- Join, leave, death, restart, room-full, timeout, and reconnect states have clear UX.
- Controlled tests pass at 100 ms, 200 ms, and 350 ms latency, including packet delay
  and reordering.
- A brief connection interruption does not create an invisible, immortal, or
  duplicated player.
- Disconnect rate stays below 2% during the external test window.
- A room survives repeated full-session soak tests without progressive memory growth.
- Load proof reaches twice the forecast launch concurrency without violating the
  published frame, tick, or response budgets.

## Gate 6 — Return reasons and fair progression

- Results explain score, length, rank, eliminations, personal best, and the next
  attainable goal.
- Daily or rotating goals provide a reason to return without manipulating players or
  misrepresenting scarcity.
- Cosmetic previews, earned currency, unlock rules, and ownership persistence survive
  refresh and reconnect tests.
- Progression is achievable without payment and contains no pay-to-win boost.
- Monetization code remains out of the critical path until this gameplay gate passes.

## Gate 7 — Social and replay proof

- A completed run can generate a deterministic six-second highlight or death replay.
- A shared challenge opens the intended mode and challenge context without exposing
  personal information.
- Replay links work on a fresh device and fail safely when malformed or outdated.
- Share copy and imagery identify Wormifi clearly and do not imply fake live players,
  fake scores, or guaranteed outcomes.

## Gate 8 — Device, accessibility, and PWA quality

- Current Chrome, Safari, Firefox, and Edge receive a playable experience.
- Proof covers 360×800, 390×844, tablet, 1440×900, and a wide automotive-style
  viewport in portrait and landscape where applicable.
- No horizontal overflow, clipped primary controls, or inaccessible text occurs.
- Menus and essential actions have accessible names; canvas play has an equivalent
  status description and keyboard-operable controls.
- Install, update, offline Practice, and stale-cache recovery tests pass.
- Representative devices sustain 60 FPS; the defined low-end profile sustains at
  least 30 FPS without simulation slowdown.

## Required evidence package

- Versioned build and source commit identifiers.
- Passing unit, deterministic replay, browser, network, reconnect, soak, and load
  reports.
- Desktop and mobile screenshots plus a complete first-session recording.
- Frame-time, simulation-time, entity-count, memory, latency, disconnect, and crash
  measurements.
- External playtest roster with device class and anonymized outcomes.
- Separate PASS/FAIL results for comprehension, core feel, originality, multiplayer,
  reliability, progression, social/replay, and device quality.
- An explicit list of remaining P0, P1, and P2 issues.

## Release verdict

The parity verdict is PASS only when all eight gates pass on the same release candidate,
there are no open P0 or P1 issues, and the evidence package is reviewable. A strong bot
preview, attractive screenshots, one successful multiplayer match, synthetic load alone,
or a founder approval alone cannot override a failed gate.
