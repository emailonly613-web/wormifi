# Wormifi authoritative multiplayer proof

This package powers the browser's explicitly labeled multiplayer lab. It proves
the first networking contract only; it does **not** claim production scale or
feature parity with a mature multiplayer game.

The Node server owns the fixed 30 Hz simulation. Clients may send only a
direction and boost intent with a monotonic sequence. Position, mass,
collisions, growth, deaths, and snapshots are created by the server through the
shared deterministic game core in `../src/game`.

Current proof:

- independent WebSocket clients join the same room and see one another;
- AI players fill unused room seats and use the same input contract;
- reconnect tokens recover the same player during a grace window;
- forged position fields are rejected and movement remains speed-bounded;
- unknown reconnect tokens fail closed.
- server snapshots own the collectible field, arena radius, player score, and
  the human/AI roster rendered by the browser;
- released players are respawned by server policy rather than a client command.
- protocol v4 publishes Echo producer identity, Collector beacon metadata, and
  the exact server-owned active Collector interval;
- every room seeds one deterministic zero-mass Collector beacon and publishes a
  replacement five seconds after the collected effect expires;
- the shared game core remains the only reach authority: Collector can extend
  neutral/own-boost reach but never vacuums rival remains or another beacon.

## Protocol v4 ground-loop additions

All additions are optional fields so ordinary neutral drops and players without
an active role do not pay repeated JSON cost.

| Surface | Additive field | Semantics |
| --- | --- | --- |
| `PublicDropState` | `originPlayerId?: string` | Producer of a Boost Echo or Rival Echo; not ownership or reservation |
| `PublicDropState` | `specialist?: "collector"` | Marks a visible, zero-mass Collector beacon |
| `PublicDropState` | `specialistDurationTicks?: number` | Exact effect duration granted by that beacon |
| `PublicPlayerState` | `specialist?: ActiveSpecialist` | `{ kind, activatedAtTick, expiresAtTick, durationTicks }` from authoritative state |

Clients calculate remaining Collector time from `SnapshotMessage.tick` and
`specialist.expiresAtTick`; wall clocks are not authoritative. The initial
30 Hz tuning is 360 active ticks (12 seconds). While that role is active there
is no second ground beacon. A replacement appears five seconds after normal
expiry. If the carrier dies early, the already bounded original expiry-plus-five
schedule remains in force rather than minting an immediate replacement.

The room publishes `source: "arena"`, `mass: 0`, no `originPlayerId`, and
`specialist: "collector"` for a beacon. Boost/death Echoes publish their
producer through `originPlayerId`. This metadata is descriptive only; clients
cannot set it and the room does not reproduce the core's pickup-radius law.

The WebSocket boundary also fails closed under common low-cost abuse:

- at most 256 accepted sockets are retained by one process;
- every socket has a 60-message/second token budget with a 300-message burst;
- a socket must complete its `join` handshake within 5 seconds;
- protocol ping/pong checks run every 15 seconds and silent application
  sessions retire after 45 seconds;
- payloads are capped at 8 KiB and binary payloads are rejected as `BAD_JSON`;
- policy closures use explicit WebSocket close codes and are force-terminated
  after a short grace period if a peer ignores the close handshake.

Those checks are deliberately global or per-socket. They do not trust source
IP or `Origin` headers, so they remain compatible with a TLS/reverse-proxy path
such as DigitalOcean App Platform. Volumetric protection still belongs at the
managed edge, not inside this Node process.

Run:

```text
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
corepack pnpm start
```

Runtime settings can be supplied with `PORT`, `HOST`, `TARGET_POPULATION`,
`TARGET_DROP_COUNT`, `SNAPSHOT_HZ`, and `ARENA_RADIUS`.

`AuthoritativeArenaServer` also accepts these programmatic boundary options:

| Option | Default | Purpose |
| --- | ---: | --- |
| `maxConnections` | 256 | Global accepted-socket ceiling |
| `messagesPerSecond` | 60 | Per-socket sustained token refill |
| `messageBurst` | 300 | Per-socket bounded burst allowance |
| `joinTimeoutMs` | 5,000 | Join-handshake deadline |
| `heartbeatIntervalMs` | 15,000 | WebSocket ping cadence |
| `idleTimeoutMs` | 45,000 | Maximum time without a client application message |

Protocol pong frames prove that the transport is alive, but they do not reset
the application-idle deadline. Normal game inputs and JSON ping messages do.

Health check: `GET /healthz`. WebSocket clients connect to the same host and
send a `join` message before inputs.

Not yet proven: internet deployment, regional latency, persistence, matchmaking,
long-duration soak capacity, managed-edge DDoS/WAF behavior, or human-player
scale.
