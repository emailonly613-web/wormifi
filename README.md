# Wormifi

Wormifi is an original living-chain arena web game. It keeps the category's
instantly legible collect-grow-outmaneuver loop while making every follower a
character, every arena reward readable before collection, and every local run
reconstructible as an exact replay.

## What exists now

- A deterministic 30 Hz TypeScript game core shared by local practice and the
  server-authoritative multiplayer room.
- A dense local arena with labeled AI rivals, exact head/body collision geometry,
  desktop steering, and persistent drag-anywhere, left-helm, or right-helm
  mobile control surfaces.
- Faceted Cut Gems, Treasure Chests, producer-colored wake loot, identity-bearing
  Rival Hoards, and a visible Loot Compass. The compass expands pickup range only
  for neutral gems and the carrier's own wake loot; it never vacuums rival
  remains, objectives, or another player's drops.
- An authoritative newcomer Heat Ring whose two labeled AI corsairs use normal
  inputs, collide under the one shared lethal law, and release only their real,
  conserved Rival Hoard jewels. It aborts rather than faking an unsafe scene.
- Rush and Endless practice, results with exact death cause, challenge links,
  and a deterministic replay of the final six seconds.
- An installable PWA baseline with an offline Practice shell and honest offline
  handling for the network-only Live Lab.
- A small authoritative WebSocket service with connection admission, message
  rate limits, join deadlines, heartbeat cleanup, deterministic bots, and a
  single-room reconnect identity.
- Reproducible social-card generation from actual gameplay, with verification
  of its dimensions and page metadata.

This is a public-preview candidate, not a claim of mature-game scale, proven
retention, virality, or revenue. Multi-instance room routing, sustained public
WAN load, external-human comprehension, accessibility passes, and retention
measurement remain launch gates.

## Run locally

```powershell
corepack pnpm install
corepack pnpm dev
```

In a second terminal, start the authoritative arena:

```powershell
corepack pnpm --dir server install
corepack pnpm --dir server start
```

Local multiplayer defaults to `ws://127.0.0.1:8080`. A production build derives
the same-origin `wss://<host>/arena` endpoint unless `VITE_ARENA_WS_URL` is set.
The client displays `LIVE` only after a valid authority welcome and fresh server
snapshot. Reconnect identity remains in the current tab's `sessionStorage`.

## Verification

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:soak
corepack pnpm build
corepack pnpm test:e2e
corepack pnpm test:e2e:performance
corepack pnpm test:e2e:pwa
corepack pnpm test:e2e:multiplayer
corepack pnpm --dir server typecheck
corepack pnpm --dir server test
corepack pnpm --dir server test:load
corepack pnpm icons:generate
corepack pnpm og:generate
corepack pnpm og:verify
corepack pnpm seo:verify
```

The DigitalOcean deployment record and isolation checks live under `deploy/`.
The application was first proven on its starter domain; the Wormifi apex and www
alias were declared only after the public HTTPS/WSS/mobile/replay gate passed.

## Design and operating documents

- `docs/CURRENT-COMPETITOR-BENCHMARK.md` — current category evidence, player
  complaint patterns, the 100-point scorecard, and launch-versus-later choices.
- `docs/GROUND-FOOD-AND-POWER-SYSTEM.md` — the fair pirate-treasure architecture,
  including the ideas accepted, transformed, postponed, and rejected.
- `docs/MULTIPLAYER-RELIABILITY-AND-SCALING-GATE.md` — authority, load, abuse,
  reconnect, and multi-instance boundaries.
- `docs/SMOOTHNESS-RELEASE-GATE.md` — the production-bundle canvas, input,
  long-task, heap, ground-stability, and snapshot-cadence release gate.
- `docs/SEO-AND-ANALYTICS-HANDOFF.md` — crawl assets, consent-gated GA4 event
  contract, Search Console launch steps, and the remaining owner-only setup.
- `docs/WORMATE-PARITY-GATE.md` — proof required before any parity or superiority
  statement is allowed.
- `deploy/DIGITALOCEAN-PREVIEW.md` — isolated deployment and public proof order.

## Product boundaries

- No copied Wormate artwork, copy, sounds, maps, skins, UI, branding, or code.
- No Stripe, ads, store, paid randomness, hostile input effects, screen blinding,
  invincibility, or pay-to-win systems before gameplay acceptance.
- Practice bots are labeled. Live rooms separately label humans and AI.
- Fire Your Coworkers is a separate production application and is not modified,
  updated, or reused by this project or its deployment spec.
