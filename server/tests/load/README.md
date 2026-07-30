# Authoritative network load harness

This is a bounded localhost regression harness for the first authoritative
WebSocket slice. It deliberately does not award production readiness or
Wormate-level parity.

Default run:

```text
corepack pnpm test:load
```

The default scenario uses 24 real WebSocket connections across four isolated
rooms for ten seconds. Each client sends steering/boost input at 20 Hz and ping
probes at 2 Hz. Thirty-two total actors are simulated per room through AI
backfill, matching the current open-arena spatial profile. Four connections are
closed and reconnected with their original token.

The safety probe covers bad JSON, pre-join input, malformed input, forbidden
state fields, stale input, an excessive sequence jump, binary input, and a
bounded burst of stale messages. It then checks both WebSocket responsiveness
and `/healthz`.

The same gate validates protocol v5 ground-loop visibility under load:

- Collector beacon metadata is coherent in world syncs;
- active Collector intervals are valid against each snapshot tick;
- Boost Echo and Rival Echo upserts retain producer identity;
- no world contains multiple Collector beacons;
- packed body paths stay decodable and bounded;
- Heat Ring metadata, when present, remains server-owned and room-isolated;
- metadata violations remain exactly zero;
- p99 world payload stays at or below 160 KiB, p99 snapshot payload stays at or
  below 24 KiB, and estimated snapshot traffic stays at or below 4 MiB/s.

Those byte ceilings are regression budgets for this bounded 24-client fixture,
not production bandwidth promises. Snapshot cadence and tick-rate gates still
must independently reach at least 98% of their configured local targets.

The JSON report is written to:

```text
server/proof/load/authoritative-load-latest.json
```

The command enforces a local cadence gate: both observed simulation ticks and
snapshots per client-second must reach at least 98% of their configured target.
It writes the report and exits non-zero when that gate misses. For diagnostic
profiling only, `WORMIFI_LOAD_ALLOW_CAPACITY_MISS=1` preserves the failed
verdict in the JSON while allowing the command to return successfully.

Run the isolated timer/payload/serialization profile with:

```text
corepack pnpm profile:load
```

That component profile writes
`server/proof/load/authority-profile-latest.json`. It compares a bare timer,
zero-drop room, and populated/drop-filled rooms, and attributes snapshot bytes
to drops versus players. It does not replace the end-to-end harness.

Useful overrides:

```text
WORMIFI_LOAD_CLIENTS=48
WORMIFI_LOAD_ROOMS=8
WORMIFI_LOAD_SECONDS=30
WORMIFI_LOAD_INPUT_HZ=20
WORMIFI_LOAD_PING_HZ=2
WORMIFI_LOAD_TARGET_POPULATION=32
WORMIFI_LOAD_RECONNECT_CLIENTS=8
WORMIFI_LOAD_INVALID_BURST=500
WORMIFI_LOAD_BOOTSTRAP_TIMEOUT_MS=10000
WORMIFI_LOAD_JOIN_BATCH_SIZE=8
WORMIFI_LOAD_JOIN_BATCH_DELAY_MS=25
WORMIFI_LOAD_REPORT=C:\absolute\path\report.json
WORMIFI_LOAD_ALLOW_CAPACITY_MISS=1
```

`WORMIFI_LOAD_BOOTSTRAP_TIMEOUT_MS` changes only the explicit cold-start and
room-convergence deadline. Initial join latency remains measured in the report;
the tick, snapshot-cadence, isolation, payload, reconnect, and safety gates are
not relaxed.

`WORMIFI_LOAD_JOIN_BATCH_SIZE` and `WORMIFI_LOAD_JOIN_BATCH_DELAY_MS` make a
steady-state ramp explicit. The default remains an all-at-once cold burst. A
ramped capacity pass must be labeled as ramped/steady-state proof and does not
erase a separate cold-burst bootstrap miss.

The report includes p50/p95/p99 local ping RTT and snapshot inter-arrival,
snapshot payload and delivery-lag distributions, observed room tick rate,
event-loop delay, process CPU, heap/RSS, reconnect recovery, room isolation,
and invalid-message results.

Important limitations are repeated inside every generated report. Local
loopback results do not cover real WAN conditions, TLS/proxy behavior,
geographic distribution, multi-node routing, persistence, DDoS defense, or
external-human play. The current protocol has no per-input acknowledgement, so
the harness does not pretend its ping RTT is input-to-authoritative latency.
