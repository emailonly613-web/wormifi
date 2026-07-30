# Wormifi multiplayer reliability and scaling gate

Wormifi's first market promise is simple: a good run must not disappear because
the service silently dropped the player. This document turns that promise into a
release gate. A local GPU does not satisfy it; public arena quality is primarily a
server CPU, event-loop, network, routing, and state-recovery problem.

## Player-visible service levels

| Signal | Preview gate | Public-launch gate | Failure behavior |
|---|---:|---:|---|
| WebSocket connection success | >= 99% in controlled test | >= 99.5% rolling 24 h | Show a truthful retry state; never substitute hidden bots under a human label |
| Room join time | p95 <= 2 s | p95 <= 1.5 s | Keep Practice available; preserve name and intended room |
| Unexpected disconnects | < 2% of sessions | < 1% of sessions | Freeze boost, show reconnect status, retain identity for 15 s |
| Reconnect success within grace window | >= 98% | >= 99% | Restore the same player exactly once or end the run with an explicit reason |
| Server tick interval | p99 <= 40 ms at 30 Hz | p99 <= 36 ms at 30 Hz | Reduce cosmetic snapshot detail before simulation accuracy |
| Snapshot inter-arrival | p95 <= 100 ms at 15 Hz | p95 <= 90 ms at 15 Hz | Interpolate visually; never let the client decide collisions |
| Same-region input-to-observed-state | p95 <= 150 ms | p95 <= 120 ms | Show degraded connection health; do not hide it |
| Room soak | 60 min without progressive growth | 6 h without progressive growth | Drain and replace the unhealthy instance; reconnect players safely |
| Join-capacity behavior | 100% explicit room-full errors | 100% explicit room-full errors | Queue briefly or offer another room; never accept then discard a run |

## Mandatory network conditions

The same candidate must be exercised under:

- 0, 100, 200, and 350 ms added round-trip latency;
- 0%, 1%, and 3% delayed or dropped client input packets;
- input reordering and duplicate input sequences;
- a 3- to 10-second connection interruption followed by reconnect;
- server instance drain and replacement;
- malformed, oversized, stale, and forged state messages;
- a room at its configured capacity plus one additional join attempt.

No client message may set position, mass, score, collision, death, drops, or
another player's state. The server is authoritative and fails closed.

## Scaling ladder

1. **Single-process proof:** two real clients, bot backfill, reconnect, and forged
   state rejection. This proves semantics only.
2. **Local load proof:** multiple rooms and sustained synthetic clients with tick,
   heap, event-loop, snapshot, and reconnect measurements.
3. **One public preview instance:** instrument real join, disconnect, tick, and
   memory signals. Invite a small controlled group only.
4. **Horizontally replicated rooms:** route each room to one authoritative owner;
   use sticky room assignment and an external presence/matchmaking layer. Do not
   split one room's authority between instances.
5. **Regional pools:** place room owners near demonstrated demand and route new
   sessions by measured latency. Cross-region replication is for presence and
   recovery, not dual collision authority.
6. **Capacity rehearsal:** prove at least 2x forecast launch concurrency and safe
   overload behavior before increasing traffic.

## Autoscaling inputs

Scale on the most constrained of:

- active rooms and connected sockets;
- simulation time as a percentage of the 33.3 ms tick budget;
- event-loop delay p95/p99;
- process RSS and heap slope, not merely current heap;
- outbound snapshot bandwidth;
- reconnect and join failure rates.

CPU utilization alone is insufficient: an instance can miss ticks because of
event-loop stalls or network pressure while average CPU still appears acceptable.

## Role of the RTX 5090

The local RTX 5090 is valuable for parallel browser/device simulation, video and
creative rendering, visual-model experiments, and offline AI-assisted asset work.
The current authoritative simulation does not need GPU inference. Public play
quality depends on server-grade CPU time, memory discipline, network proximity,
WebSocket capacity, observability, and failover. GPU hosting should be added only
for a measured GPU workload, not as a substitute for multiplayer architecture.

## Evidence needed before “reliable” or “at scale”

- versioned source commit and deployment ID;
- exact client, room, duration, and network-shaping parameters;
- p50/p95/p99 join, input, snapshot, tick, and event-loop measurements;
- heap/RSS start, peak, end, and slope;
- reconnect, duplicate-player, and ghost-player results;
- error and overload responses captured from a real public endpoint;
- anonymized external-player session results;
- all open reliability P0/P1 issues.

Passing a two-client test is not public scale. Passing synthetic load is not human
fun. Both are required and neither permits a 10/10 claim by itself.
