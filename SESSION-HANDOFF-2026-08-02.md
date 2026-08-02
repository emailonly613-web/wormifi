# Wormifi — session handoff, 2026-08-02

Read this before touching anything. It is written by the session that did the work, and
it includes the mistakes, because those cost more time than the fixes did.

Companion docs: [`CLAUDE.md`](./CLAUDE.md) for standing rules,
[`SEO-GAMEPLAN.md`](./SEO-GAMEPLAN.md) for the owner's daily SEO order.

---

## 1. The one number that matters

**5 users, lifetime. 5 clicks from Google, lifetime.** The only non-brand search the
site has ever appeared for is `snake.io`, at position 124.

The game got materially better today. Nobody knows it exists. **This is a distribution
problem wearing a product costume.** Do not let a polish task convince you otherwise.

**The single highest-value unshipped asset:** `D:\wormifi-store\Wormifi_CrazyGames_Ready.zip`
— built, multiplayer-verified against the live server from a foreign origin, 10.5 MB
(under the 20 MB mobile-homepage threshold), `index.html` at root. **It has never been
uploaded.** That needs the owner's hands at developer.crazygames.com.

Form answers, all verified: name `Wormifi`, engine HTML5, save progress
**"Yes, using LocalStorage"**, mobile ✅, **online multiplayer ✅** (the portal build is
genuinely multiplayer now), audio-mute-through-SDK ✅.

---

## 2. Working rules the owner set

1. **Parent quality for every worm.** wormate.io is the standard, for the player's worm
   and every AI alike. No worm renders worse than another.
2. **Write for a nine-year-old.** No "labeled AI backfill", no "AUDIT REQUIRED", no
   "living chain". Three copy passes are done — front screen, results screen, store.
3. **Food and treasure are Wormifi's own.** The parent art was reference, not product.
   Bodies/skins stay parent-derived; pickups do not, and the parent's name appears on no
   player-facing surface. A test asserts this so it cannot regress.
4. **Charging pads double you**, capped at 4 doublings. No flat "+42".
5. **Verify by driving the real browser.** Not by reading code.
6. **No money.** No database, no bigger server. Quality only.

---

## 3. Hard-won facts about the renderer

These took all night and four bad deploys to find. They are the moat.

- **Their smoothness is packing density, not artwork.** Their body sprite, croppable from
  `public/assets/parent-wormate/100700_skins.png` (skin 32 base region `LB` at
  x=274 y=1362, 64×64), is a plain circle — same as ours. One stamp per chain point
  leaves circles at ~27% overlap and every one reads as a bead.
  `SMOOTH_BODY_STEP = 0.18` walking the spine merges them into a tube.
- **Do not reintroduce the stroked path.** A stroke plus clipped stamps disagree along
  the silhouette and produce a serrated comb edge *in motion*. It looks fine in a still.
- **Stroking alone flattens all 190 skins** to one sampled colour and erases every
  pattern. The head kept its pattern because it is stamped — that is what exposed it.
- **Their wear sprites use a front-of-head origin.** Stock eye region pivot `px=75` in a
  128-unit box, sprite only 42 wide, so drawn about our head centre the eyes land ~1.4
  to 0.6 radii *behind* the head, on the neck. `FACE_FORWARD_OFFSET = 0.70` seats them.
  **1.15 overshoots** and hangs them off the front — that shipped and was wrong.
- **Head stays at `1.04` radius.** Enlarging it desynchronises everything else drawn off
  the head radius (the local-player ring, shields) because those are not rescaled with it.
- Tail tapers over 22% of segments (clamped 3–14), square-root eased. Render-only —
  collision is untouched, so where a worm can be cut is where it looks like it can be cut.

---

## 4. Mistakes I made — do not repeat these

**Shipping visuals validated by a still frame.** I pushed four renderer rewrites to the
live site, each checked with one static screenshot of the Skin Studio preview. The owner
found the result glitchy. The moment I captured eight headings in motion, the serration
and the misplaced eyes were obvious in seconds. **Rule: build locally, drive the real
arena, capture a full circle of headings, check anything drawn off a radius you changed,
deploy one change at a time.** See `wormifi-never-ship-visuals-on-a-still` in memory.

**Concluding from thin evidence, four times.**
- Said 8 users; it was 5. I summed a de-duplicated metric.
- Said powerups never fire ("zero of 32 players"). Wrong — I read `player.specialist` out
  of *packed tuple* snapshots where it is always undefined. Real: ~5 activations per 90 s.
- Said the AI don't hunt. Wrong — 120 s live showed 52 deaths, 8 human, 49 by bots.
- Said the arena was empty using presence coordinates that are **packed** (values exceeded
  the 1450 radius). Threw the number out; a screenshot showed three worms on screen.

**Read gameplay truth from the JSON `events` array or the DOM. Never from packed snapshot
fields.**

**Auditing a tree another agent was actively rewriting.** `D:\wormifi-art` had 119
uncommitted files from a live Codex session. I read them and reported them as fact for
hours. `git status --short` in the first five minutes would have prevented nearly every
wrong statement I made. **Always check.**

**Claiming assets were stolen.** I inferred it from a CDN URL in a README and reverted
6.3 MB of parent art. They are licensed from the owner's parent company. The revert never
deployed and was undone. **Do not re-raise this.**

---

## 5. Environment traps

- **Pushing to `main` does not deploy.** The DigitalOcean spec uses a `git:` source, which
  has no `deploy_on_push`. Trigger manually and poll to ACTIVE:
  ```bash
  doctl apps create-deployment 209351f3-4440-4e23-9dd1-93dd9274ec26
  doctl apps get-deployment 209351f3-4440-4e23-9dd1-93dd9274ec26 <id> --format Phase
  ```
  ~3 minutes: PENDING_BUILD → BUILDING → DEPLOYING → ACTIVE. **A change is not shipped
  until the URL returns 200.**
- **Work in `D:\wormifi-store`.** Never `D:\wormifi-art` (Codex's tree). `D:\wormifi` is
  stale. `D:\wormifi-ops` holds the SEO cron and the clip cutter, and is not a clone.
- `corepack pnpm --dir server install --frozen-lockfile` is required or `tsc` fails.
- Any build a portal hosts needs `VITE_ARENA_WS_URL=wss://wormifi.com/arena`. Without it
  the client dials `wss://<window.location.host>/arena` — the portal's own domain.
- Live truth without a clone: `curl https://wormifi.com/healthz`.
- The GSC Sitemaps API reports `indexed: 0` for everyone — deprecated. Use URL Inspection.
- Two 404s on the live site are benign: `/passport/v1/session` (passport disabled) and
  `__wormifi_network_probe__` (an intentional connectivity probe).

---

## 6. State as of this handoff

Live at `de663e0`, verified in-browser: **60 fps**, zero page errors, desktop and mobile,
12/12 on a full health sweep (menu, customizer open/close, arena join, snapshots, mobile
rotate gate, mobile join).

Shipped today: smooth body · tail taper · face seated at every heading · 190-skin grid
customizer (no arrow carousel) · Wormifi-only pickups · parent branding removed · charging
pads double · dev strings off the arena · real install card (native Android prompt, iOS
Add-to-Home steps) · three plain-language copy passes · 5 new SEO articles live · 177 KB
dead atlas removed.

**Known and deliberately unchanged:** boost trail, death drops, AI aggression, arena
density — all measured and working. Do not "fix" them.

**Genuinely open:** no server-side persistence (nothing survives a restart, so no
surviving leaderboard); 256-connection ceiling on one `basic-xs` instance; the CrazyGames
upload. The first two cost money and the owner has said no.

---

## 7. If you do one thing

Get the ZIP uploaded. Everything else is polish on a game nobody has been given the chance
to play.
