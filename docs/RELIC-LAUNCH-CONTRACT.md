# Wormifi Relic Launch Contract

Status: **SUPERSEDED INITIAL-SET CONTRACT — 2026-07-30 OWNER EXPANSION NOW GOVERNS**
Deployment: **NOT DEPLOYED**
External fairness acceptance: **NOT YET TESTED**

## 2026-07-30 owner amendment

`PIRATE-POWER-PARITY-CONTRACT.md` is now authoritative for the launch power
set and pre-run pace choice. This document remains the evidence record for the
original three-Relic candidate, but it no longer limits launch to three Relics.
In particular, its former rule that Emerald Spyglass performs **no camera
zoom** is explicitly withdrawn: the amended Spyglass must pull the camera back
to show 25% farther while preserving coarse danger bearings. Gale Pennant,
Maelstrom Wheel and tiered Gilded Ledger are also required before the power set
can be called complete.

Wormifi keeps the proven category value of readable temporary powers, but makes
each effect pirate-specific, server-authoritative and counterable. One active
Relic slot prevents hidden stacks and unreadable outcomes.

## Initial Relic set

| Relic | Duration | Effect | What it deliberately does not do |
| --- | ---: | --- | --- |
| **Loot Compass** | 12 s | +35% pickup reach for neutral treasure and the carrier's own wake loot | Never pulls rival hoards, objectives, other-player wake loot or Relics; no score/mass multiplier |
| **Emerald Spyglass** | 10 s | Original candidate added coarse off-screen danger bearings; amended launch behavior also pulls the camera back | No exact remote positions, hidden-room data, speed or collision change |
| **Pepper Cutlass** | 8 s | Reduces boost mass cost by 25% while preserving normal maximum speed and lethal collision | Never makes boost free, blinds rivals, raises top speed or grants invulnerability |

The supplied original sprite atlas provides distinct silhouettes for these
Relics. Labels and icons remain visible before collection and while active, so
color is not the only teaching channel.

Current implementation: all three Relics have an integrated local gameplay and
presentation path. The shared deterministic `PirateRelicDirector` preserves the
server's separately owned legacy Collector/Loot Compass beacon while scheduling
the named Relics. Solo/practice opts into all three named Relics, retains its
fixed legacy Compass beacon with absent `relicKind`, reconciles the director on
every local step, respawns eligible named Relics after exactly 5 seconds and
binds the sequence to deterministic GameState/replay state. Both radar surfaces
consume the Spyglass bearing helper. These are local candidate facts, not launch,
fairness or deployment proof.

## Shared rules

- The server chooses spawns, collection, replacement, activation and expiry.
- Collecting a new Relic replaces the current one; durations never stack.
- Effects are equally available in the arena and cannot be bought, pre-equipped
  for competitive advantage or awarded for sharing.
- Spawn grace remains the only temporary head protection and is not a Relic.
- No Relic freezes, reverses or degrades another player's input; hides hazards;
  changes the head-to-body law; or makes paid/random power stronger.
- Every active Relic is visible on the carrier and in its own HUD slot. Rivals
  receive enough visual information to understand the advantage.
- An eligible named Relic returns after exactly 5 seconds. The shared director,
  not a client clock or replay renderer, owns that deterministic schedule.

## Protocol-v5 compatibility

- The existing `collector` active-slot envelope remains the wire identity for
  protocol v5. An absent `relicKind` means Loot Compass exactly, preserving
  old Collector replays, tests and clients.
- Emerald Spyglass and Pepper Cutlass add `relicKind` and duration metadata.
  Current v5 clients safely ignore those additive fields; Relic-aware clients
  use them for the distinct ground silhouette, carrier treatment and HUD copy.
- The server still owns the real Relic identity and applies only that Relic's
  effect. The compatibility envelope never grants Compass reach to Spyglass or
  Cutlass and never creates a second active slot.

## Integrated local presentation

- Named ground Relics use `relicKind` and `relicDurationTicks`; they are excluded
  from ordinary treasure rendering and never fall through as Loot Compass.
- Legacy ground Collector state and an active slot with absent `relicKind` map
  to Loot Compass exactly.
- Local and live carriers use the matching atlas badge, disclosed visual effect
  and authoritative timer ring. Only Loot Compass retains the pickup vortex.
- Local and live HUDs use the accessible `RelicStatus` identity, effect copy,
  non-spamming timer/progress and explicit reduced-motion static mode.
- The live client validates named ground envelopes and optional event/active
  identity. Compass pull accounting is restricted to Loot Compass, so Spyglass
  and Cutlass cannot fake Compass presentation or pull feedback.
- Arena and LiveArena keep ordinary rival radar visibility camera-scale. While
  Spyglass is active they add only coarse fixed-sector, near/far and count edge
  chevrons for off-screen danger, with no player IDs or coordinates. Accessible
  summaries/data hooks disclose the same coarse information; stations, self,
  Collector, public hazards and reduced-motion behavior remain intact.

## Proof gates

- **Passed locally:** exact deterministic effect-helper, expiry and replacement
  tests, plus distinct presentation/timer/reduced-motion unit coverage. The
  final root unit snapshot is 32 files / 152 tests, with root typecheck green.
- **Passed locally:** the focused local-Relic, replay and core set is 17/17,
  including deterministic all-three solo scheduling, exact eligible respawn,
  Black Pearl v2 replay/checksum parity and legacy v1 Compass behavior.
- **Passed locally:** the four-file Spyglass/radar integration focus is 17/17.
  Both Arena and LiveArena expose only the coarse bearing contract described
  above.
- **Passed in the fresh standalone server 29/29 run:** named spawning, active
  state, replacement, expiry, reconnect restoration and two-client authority
  coverage exist in `server/tests/integration/relics.test.ts`. After the shared
  director closure, the focused server Relic set is 3/3 with server typecheck
  green.
- **Passed locally:** collision checksums stay unchanged for Compass and
  Spyglass; Pepper Cutlass changes only the disclosed boost cost.
- **Passed as local integration, not full launch acceptance:** desktop/mobile
  moat coverage exercises the named Relic presentation/HUD seams, and the
  Chromium/Firefox/WebKit accessibility matrix is 12/12. The exhaustive ground,
  carrier, expiry, replacement and reduced-motion state matrix on real devices
  is still pending.
- **Pending:** reconnect/public-room browser proof plus named-Relic load and
  performance validation. The generic localhost impairment matrix passes at
  100/200/350 ms with injected loss/reordering at 200/350 ms, and the generic
  bounded load gate passes 24 clients / 4 rooms / 30 seconds. Neither is a
  complete named-Relic state matrix or deployed Internet proof. The final
  paired smoothness report passes every Authoritative Live gate but still
  misses crowded Practice, so no release-ready performance claim is permitted.
- **Pending:** balance evidence reports pick rate, usage and
  size/survival/win delta by cohort. No Relic is called fair or better before
  external testing supports it.
- **Passed locally:** final post-Relic production build (67 modules; game bundle
  approximately 392.91 kB / 125.93 kB gzip). **Pending:** deployment and post-deploy public
  verification.
