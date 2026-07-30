# Application-level network impairment proof

Run the bounded proof from `server/`:

```powershell
pnpm test:network:impairment
```

The harness starts the real authoritative server, a real WebSocket-to-WebSocket
impairment proxy, and real `ws` clients. It exercises three deterministic
profiles approximating 100, 200, and 350 ms application round-trip time. Every
profile asserts:

- successful join plus `welcome`, `world`, and `snapshot` server authority;
- authoritative tick progress and an observed direction change from client input;
- matching application `ping` / `pong` nonces and measured RTT;
- reconnect to the same player exactly once with accepted sequence continuity;
- continued progress in a second room with no cross-room messages or identities;
- responsive server health after the impaired session.

Normal WebSocket message ordering is preserved. Bounded jitter applies in both
directions. The 200 ms profile drops every 100th input and delays every 20th
input enough to arrive after a newer sequence. The 350 ms profile drops every
33rd input and similarly delays every 10th. Control messages are never
deliberately dropped or reordered. The server must reject delayed lower input
sequences as `STALE_INPUT` while continuing the authoritative room.

The machine-readable result is written to:

`proof/network/application-impairment-latest.json`

Override that location with `WORMIFI_NETWORK_PROOF_REPORT`. The report is
explicitly labeled
`non-production-application-level-websocket-impairment-proof-only`.

## Caveat boundary

This is not literal packet shaping. WebSocket uses ordered TCP, so independent
packet loss/reordering would normally become retransmission and head-of-line
delay below the application. The harness deliberately impairs gameplay
messages at the proxy boundary to test protocol behavior in a deterministic,
portable way. It does not reproduce kernel queues, TCP congestion control, TLS,
mobile radios, carrier proxies, geographic paths, public load, multi-instance
room ownership, or regional failover. Those require deployment-side tools such
as `tc netem`, a WAN load generator, and real regional clients.
