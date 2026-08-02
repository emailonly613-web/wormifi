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
- collision candidates resolve in sub-tick contact order; once a body owner is
  defeated it cannot earn a later reciprocal kill from the same tick, so one
  two-worm contact cannot kill both worms. Exact mathematical ties use stable
  server ordering and never size, payment, or client latency privilege;
- protocol v5 publishes a compact low-frequency full-room presence roster for
  honest rank/radar/population plus high-frequency packed body paths only for
  the local visible/collision neighborhood;
- Echo producer identity, Collector beacon metadata, and the exact server-owned
  active Collector interval remain authoritative in that split stream;
- every room seeds one deterministic zero-mass Collector beacon and publishes a
  replacement five seconds after the collected effect expires;
- the shared game core remains the only reach authority: Collector can extend
  neutral/own-boost reach but never vacuums rival remains or another beacon.
- a first human can receive one fail-closed Heat Ring: two ordinary AI inputs
  resolve to one ordinary collision winner and one loser, then expose only the
  loser's real, conserved Rival Hoard jewel IDs and mass.
- an opt-in room board can publish wrap charging landmarks; the shared core
  alone validates a docked head plus contiguous body coil, awards bounded match
  mass, and owns interruption, decay, reset and cooldown. Omitted board config
  remains the station-free `open-seas` arena.

## Protocol v5 ground-loop additions

All additions are optional fields so ordinary neutral drops and players without
an active role do not pay repeated JSON cost.

| Surface | Additive field | Semantics |
| --- | --- | --- |
| `PublicDropState` | `originPlayerId?: string` | Producer of a Boost Echo or Rival Echo; not ownership or reservation |
| `PublicDropState` | `specialist?: "collector"` | Marks a visible, zero-mass Collector beacon |
| `PublicDropState` | `specialistDurationTicks?: number` | Exact effect duration granted by that beacon |
| `PublicPlayerState` | `specialist?: ActiveSpecialist` | `{ kind, activatedAtTick, expiresAtTick, durationTicks }` from authoritative state |
| `PublicPlayerState` | `boosting?: boolean` | Server-confirmed sprint actually granted above the mass floor; never raw button intent |
| `PublicPlayerState` | `bodyQ4?: string` | Packed quarter-unit body path; the client may decode it but cannot author it |
| `PresenceMessage` | compact `players` tuples | Complete low-frequency room roster for rank, population, and full-board radar; no animated body paths |
| `WorldMessage` | `heatRing?: PublicHeatRingState` | Active duel geometry, labeled AI IDs, newcomer safe radius, and start tick |
| `SnapshotMessage.event` | `heatRingStarted`, `heatRingResolved`, or `heatRingAborted` | Authoritative lifecycle; resolution names exact real jewel IDs and conserved total mass |
| `WorldMessage` | `board?: PublicBoardState` | Static board ID/name and station core, wrap-lane, dock and tuning geometry for arena/radar rendering |
| `SnapshotMessage` | `chargingStations?: PublicChargingStationState[]` | Dynamic owner, phase, winding, progress, grace, reward and cooldown truth |
| `SnapshotMessage.events` | `chargingStarted`, `chargingInterrupted`, `chargingResumed`, `chargingReset`, `chargingCompleted` | Server-owned objective lifecycle; browsers never submit these values |

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

The Heat Ring is presentation around ordinary simulation, not a scripted kill.
It activates only for a safe first-human room, aborts if that premise changes,
and never grants collision immunity or synthetic treasure. A resolved event is
accepted by the browser only when its listed IDs, death origin, and summed mass
match the drops in the same authoritative state.

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
`MAX_HUMAN_PLAYERS_PER_ROOM`, `TARGET_DROP_COUNT`, `SNAPSHOT_HZ`,
`ARENA_RADIUS`, and `PLAYER_INTEREST_RADIUS`. The CLI defaults the human-seat
ceiling to the selected target population, so each arriving human replaces one
AI seat until that room is genuinely all-human.

`AuthoritativeArenaServer` also accepts these programmatic boundary options:

| Option | Default | Purpose |
| --- | ---: | --- |
| `maxConnections` | 256 | Global accepted-socket ceiling |
| `messagesPerSecond` | 60 | Per-socket sustained token refill |
| `messageBurst` | 300 | Per-socket bounded burst allowance |
| `joinTimeoutMs` | 5,000 | Join-handshake deadline |
| `heartbeatIntervalMs` | 15,000 | WebSocket ping cadence |
| `idleTimeoutMs` | 45,000 | Maximum time without a client application message |
| `presenceHz` | 2 | Complete roster/rank/radar refresh cadence |
| `playerInterestRadius` | disabled in the low-level class; CLI defaults to 1,000 | Radius whose intersecting full bodies enter each human's 15 Hz animation snapshot |
| `board` | `open-seas` | Immutable `GameBoardConfig`; pass an opt-in catalog profile to enable charging landmarks |

Protocol pong frames prove that the transport is alive, but they do not reset
the application-idle deadline. Normal game inputs and JSON ping messages do.

Health check: `GET /healthz`. It reports `protocolVersion` and the exact
deployment `buildRevision` in addition to room/connection state. Welcome frames
carry the same revision, so public proof can be tied to one immutable candidate.
WebSocket clients connect to the same host and send a `join` message before
inputs.

Not yet proven: internet deployment, regional latency, persistence, matchmaking,
long-duration soak capacity, managed-edge DDoS/WAF behavior, or human-player
scale.
