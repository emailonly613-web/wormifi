# Transient Echo Lifecycle Contract

Status: **LOCAL CORRECTNESS CANDIDATE — LONG REAL-TIME SOAK AND DEPLOYMENT PENDING**

This contract bounds Sprint Echo and crash-loot history without destroying
treasure mass, creating a mega-pickup, or changing neutral treasure and Relics.
It uses simulation ticks and stable state order only. Wall-clock timing,
client order and network arrival order never decide the result.

## Age and count limits

- `state.drops` insertion order is the authoritative Echo age order.
- A room retains at most 96 visible Sprint Echoes and 192 visible crash-loot
  Echoes.
- Neutral arena treasure, charging objectives and zero-mass Relics are outside
  these two limits and are never removed by Echo compaction.
- Collection removes the collected visible chunk normally. There is no
  wall-clock deletion of conserved positive mass.

## Deterministic compaction

1. The oldest over-limit Echo is the merge seed.
2. Merge candidates from the same producer are preferred.
3. Candidates are then ordered by squared distance from the seed.
4. Original insertion order is the final tie-break.
5. Exactly enough candidates merge with the seed to restore the class limit.
6. Their mass-weighted position and largest pickup radius become the replacement
   cache position and radius.
7. The replacement receives a fresh deterministic entity ID so snapshot-delta
   clients observe explicit removals and an upsert.
8. A same-producer cache keeps that producer ID. A mixed-producer cache has no
   false owner in authoritative simulation state.

## Public mixed-cache identity

- A mixed cache is published with the reserved non-player identity
  `echo-cache:mixed` and `mixedOrigin: true`.
- The reserved identity keeps older protocol-v5 clients from rejecting the
  conserved pickup while never matching a real `human-*` or `bot-*` owner.
- Current clients render a mixed cache neutrally and never count it as an
  owner-only Treasure Magnet pull or as one bot's Heat Ring loot.
- The private bank and its contributor history remain absent from the wire.

## Treasure-mass accounting

- Exact stored mass is `visible mass + banked mass`.
- A Sprint cache exposes at most one ordinary `shedDropMass` chunk.
- A crash-loot cache exposes at most one ordinary
  `deathDropTargetMass` chunk.
- All remaining positive mass stays in the server-authoritative bank.
- Collecting a cache awards only its visible ordinary chunk and deterministically
  rematerializes the next ordinary chunk at the same position.
- The bank is included in deterministic state and conservation checks, but is
  intentionally absent from public world and snapshot messages. It therefore
  cannot inflate render work, snapshot payloads or a single pickup reward.

## Boost lock rule

- A same-owner Sprint cache retains that owner's latest pickup lock.
- If multiple owners merge, every player is blocked from that cache until the
  latest original owner lock expires.
- This prevents a booster from regaining freshly shed mass merely because its
  Echo was compacted with another player's Echo.

## Required evidence

Before deployment:

1. deterministic cap and exact stored-mass tests;
2. bounded cache-payout and mixed-owner lock tests;
3. reconnect equality after compaction;
4. public snapshot and full-world payload ceilings with no bank leakage;
5. accelerated six-hour lifecycle simulation;
6. full root/server typecheck and unit suites;
7. fresh multiplayer, impairment, bounded load and strict paired smoothness;
8. a real-time 60-minute preview, six-hour launch soak and later 24-hour room
   soak on the exact immutable candidate.

Passing the local correctness layers does not prove public smoothness or permit
`lag-free`, production-scale or launch-ready language.
