# Wrap Charging Station Contract

Status: **LOCAL CANDIDATE INTEGRATED — CORE + WIRE + CLIENT + BOARD SELECTION; RELEASE PROOF PENDING**
Deployment: **NOT DEPLOYED**
External acceptance: **NOT YET TESTED**
Owner goal: a selected-board pirate objective that rewards wrapping while
creating real encirclement and interception risk.

## Player promise

A charging station is a world landmark, not a pickup. The head must reach its
small dock while a contiguous body prefix physically coils around the marked
lane. Head proximity by itself earns nothing. Once the valid coil latches, the
worm grows over fixed server ticks while the exposed, stationary body remains
fully vulnerable to ordinary rival collisions. Boost casts off.

## Authoritative rules

- The default `open-seas` board now declares two small physical orbit rings and
  one large harbor pad. `Coin Cay` requires a 1.5-second physical wrap for +9
  match size; `Coral Key` requires 2.25 seconds for +20; `Kraken Atoll`
  requires 7 seconds for +42. The opt-in `black-pearl-relay` profile retains
  its two original capstans.
- Station identity, name, center, core, wrap lane, dock, reward and timing come
  from the room's immutable server board config.
- The head must be inside the station's dock radius and the configured minimum
  contiguous body segments must remain in the wrap lane: 6, 10 and 14 on the
  three Open Seas objectives.
- Completion geometry is roughly one orbit (5.3, 5.45 and 5.55 radians) with at
  least 82% same-direction consistency. Reversing back and forth cannot fake a
  coil; a body link jumping more than 90 degrees also terminates the contiguous
  proof.
- Only one player owns a station attempt. Simultaneous candidates resolve by
  stable player ID order in the same deterministic simulation step.
- A valid coil latches for its configured duration. Growth is awarded against
  the progress high-water mark, so interruption/decay/resume cannot mint the
  same partial reward twice.
- Leaving the dock or lane, changing winding direction, dying, losing the body,
  or pressing boost interrupts. Open Seas uses a 0.25-second grace, four
  progress ticks of decay per simulation tick and a 1-second reset cooldown.
- Completion reward is the station's fixed disclosed match-size value. It is
  not permanent currency, a purchased advantage or a random multiplier.
- Open Seas completion cooldowns are 4, 6 and 8 seconds respectively.
- Charging grants no shield, collision exception, speed change, hidden immunity
  or control over another player.

All values above are visible launch-tuning hypotheses. They may be tuned from
balance evidence, but clients may never decide progress or award size.

## Integrated client feedback and remaining gaps

- Local and live arenas render the configured core, wrap annulus, dock, winding
  direction, progress, interruption and cooldown directly from board config and
  authoritative station state.
- Small stations use orbit beads, direction arrows, a head-shaped dock and a
  faceted prize core so their risk/reward reads without instructional words.
  Kraken Atoll uses three growth crests tied to its real multiplier stages.
- The player's HUD exposes station name, phase, readable instruction and native
  progress semantics without changing steering or simulation truth.
- The pirate-chart radar shows configured station landmarks and distinguishes an
  active attempt. Ready/cooldown distinction and active percentage do not yet
  appear on the radar itself; those remain HUD-only.
- `chargingStarted`, `chargingInterrupted`, `chargingResumed`, `chargingReset`
  and `chargingCompleted` remain authoritative events. Dedicated event-driven
  audiovisual handling and a completion replay marker are still pending.
- Color is supplemental: the integrated HUD uses stable icons, phase text and
  progress geometry, and reduced-motion rendering freezes ambient motion.
- The final focused browser candidate captures a real active physical coil and
  HUD on desktop/mobile, along with board lock and the local two-station board.
  The full interruption, resume, completion and cooldown state-transition
  matrix is still pending.

## Board-selection contract

- The lobby now identifies Open Seas and Black Pearl Relay before play. Query
  and invite URLs can request Black Pearl, and an existing room's authoritative
  board locks the picker with a visible fallback instead of being overwritten.
- The room owns the board choice. Every client joining that room receives the
  same board ID and station layout; a query parameter or local preference may
  request a board only when the room is created, never override an existing
  room.
- Practice/solo uses the same deterministic board profile while remaining
  clearly labeled as no live room.
- Local recording v2 binds the selected board into replay construction and its
  checksum; legacy v1 recordings remain deterministic Open Seas recordings and
  board tampering is rejected.

## Protocol contract

- `world.board` exposes the board ID/name and static station geometry for arena
  rendering and radar landmarks.
- `snapshot.chargingStations` exposes phase, owning player, winding direction,
  progress/required ticks, grace, cooldown and awarded mass.
- Browsers send no station progress. The existing input message remains steer +
  boost only, so clients cannot award growth or manufacture completion.

## Completion proof

1. **Passed locally:** `tests/charging-stations.test.ts` proves no-op normal
   boards, physical coil validation, deterministic contention/growth, mooring,
   boost interruption, resume high-water behavior, grace, decay and reset.
2. **Passed in the fresh standalone server 29/29 run:**
   `server/tests/integration/charging-station.test.ts` covers two clients
   receiving the same static board, dynamic state, events, exact +10 test reward
   and 600-tick test cooldown.
3. **Passed locally:** `tests/charging-station-render.test.ts`,
   `tests/charging-station-ui.test.ts`, board preference/replay tests and the
   focused moat browser checks cover renderer/HUD/radar seams, board locking and
   deterministic Black Pearl replay.
4. **Passed as local browser integration, not external acceptance:** the final
   desktop/mobile candidate captures a real active physical coil + HUD, board
   lock and the local two-station board. The real local multiplayer suite is
   7/7 and includes two browser contexts in one Black Pearl room, reconnect
   retaining board/player identity and an invite carrying the board. The
   remaining interruption/resume/completion/cooldown state matrix is still
   pending.
5. **Pending:** station-enabled bot/network-impairment/load/performance proof.
   The generic localhost impairment matrix passes at 100/200/350 ms with
   injected loss/reordering at 200/350 ms, and the generic bounded load gate
   passes 24 clients / 4 rooms / 30 seconds. Neither proof opts into and drives
   a Black Pearl coil, and neither is deployed Internet proof. The final paired
   smoothness report passes every Authoritative Live threshold but misses in
   crowded Practice, so it is not a release-ready station-performance proof.
6. **Pending:** external players explain the risk and reward without coaching,
   and balance evidence supports the disclosed tuning.
7. **Passed locally:** final post-Relic production build (67 modules; game
   bundle approximately 392.91 kB / 125.93 kB gzip). **Pending:** deployment and post-deploy
   public verification.
