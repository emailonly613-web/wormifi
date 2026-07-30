# Wormifi smoothness, consistency, and no-lag release gate

Smoothness remains a non-negotiable release property, but the owner-directed
execution order in `WORMIFI-2026-PRODUCT-GOAL.md` governs: finish and accept the
body/growth baseline and moat features before entering smoothing optimization.
Correctness, load and regression measurements still run during feature work;
they do not justify polishing or certifying rejected placeholders. New skins,
ground systems, social features, and monetization do not ship when they make
steering or the arena feel uneven. "No lag" is an operating goal, not a literal
claim that any internet connection or device can have zero delay.

## Reproducible local gate

Run the real production-built 1440x900 Canvas2D client in Chromium against both
crowded scenes. The gate builds the candidate and serves it on isolated port
4183, so an already-open Vite development server cannot contaminate the result:

```powershell
corepack pnpm test:e2e:performance
```

The proof-only build embeds `ws://127.0.0.1:8790`; the test owns that bounded
loopback authority. It does not alter the production deployment configuration.

The default gate measures each scene for 60 seconds:

- **Crowded Practice:** the product's 28 labeled bots and 1,050-drop target.
- **Authoritative Live:** a real local WebSocket room with 24 actors, 720 target
  drops, 30 Hz simulation, and 15 Hz snapshots.

The versioned machine-readable result is written to
`proof/performance/smoothness-gate-latest.json`. A failed gate still writes the
report and then exits non-zero.

The performance configuration intentionally disables tracing and video, and its
autopilot steering runs inside the page. Recording every interaction can itself
create frame stalls; diagnostic trace/video should be captured in a separate
reproduction after the timing gate reports a miss.

For the mandatory preview and public-launch soaks, use the same harness rather
than a separate unverified script:

```powershell
$env:WORMIFI_PERF_SCENE_SECONDS = "3600"   # preview: 60 minutes per scene
corepack pnpm test:e2e:performance

$env:WORMIFI_PERF_SCENE_SECONDS = "21600"  # public launch: 6 hours per scene
corepack pnpm test:e2e:performance
```

`WORMIFI_PERF_REPORT` can point each long run to a timestamped JSON file so the
latest smoke result does not overwrite a launch-soak artifact.

When a Live-only miss needs attribution, run the same production scene with a
short Chromium CPU profile:

```powershell
$env:WORMIFI_PERF_SCENE_SECONDS = "15"
$env:WORMIFI_PERF_CPU_PROFILE = "1"
corepack pnpm test:e2e:performance
```

That writes `proof/performance/live-longtask-profile-latest.json` unless an
explicit report path is supplied. The profile reports WebSocket handler timing,
Long Animation Frame attribution when the browser exposes it, V8/GC self time,
and task/script/layout/style metric deltas. Profiling adds overhead, so its
artifact is diagnostic and never substitutes for the unprofiled release run.

## Local regression budgets

| Signal | Gate |
|---|---:|
| Actual canvas paints | average >= 55/s |
| Canvas frame gap | p95 <= 22 ms; p99 <= 40 ms |
| Frames slower than 34 ms | <= 2% |
| Animation callback cost | p95 <= 12 ms; p99 <= 20 ms |
| Keyboard event to next canvas paint | p95 <= 34 ms; p99 <= 50 ms |
| Main-thread long tasks | <= 2/min and <= 100 ms blocking time/min |
| Post-GC retained JavaScript heap | growth <= 12 MiB per scene |
| Sampled JavaScript heap trend | <= 8 MiB/min on 60-minute+ soaks |
| Live snapshot delivery | >= 14.7 snapshots/s |
| Live snapshot gap | p95 <= 100 ms; p99 <= 135 ms |
| Browser-applied Live ground set | never below 600 or above 1,500 drops |

The report also includes a 28 FPS / 35 ms p95 environment diagnostic so a
headless scheduler limitation can be distinguished from catastrophic stalls.
That diagnostic never changes `pass` or the release verdict. A candidate below
55 FPS or above the 22 ms p95 frame budget remains a release miss.

The frame-gap gate is intentionally stricter than an average-FPS claim. A game
can average 60 FPS and still feel bad when irregular long frames arrive during
turning, collisions, loot bursts, or crowded rendering.

Short runs collect only post-GC start/end heap values. Repeated external CDP heap
polling can perturb the same frame pacing this gate measures, while a one-minute
raw trend is dominated by garbage-collection phase. The harness records a
two-second raw-heap series and grades its slope only on 60-minute and longer
runs; post-GC retained growth remains graded on every run. The JSON report names
the active `samplingMode` and leaves short-run peak/slope fields `null` rather
than presenting two endpoints as a sampled trend.

The input number is event-to-next-canvas-paint, not photon latency and not an
input acknowledgement from the authority. The server protocol does not yet ack
every input, so the gate does not invent that measurement.

## Required release evidence beyond localhost

The local report is necessary, but it cannot certify the public experience.
Before a broad launch, the same source commit also needs:

1. 60-minute preview and six-hour launch-candidate soaks with no progressive
   heap, native-memory, ground-count, or cadence deterioration.
2. Physical low/mid/high-tier Android, iPhone, desktop, and a representative
   in-vehicle browser pass, including thermally sustained play.
3. Chromium, Firefox, and WebKit visual/control checks. This performance harness
   uses Chromium because its CDP heap collection is reproducible.
4. Public TLS/WebSocket tests at 0, 100, 200, and 350 ms RTT plus jitter, loss,
   reordering, interruption, reconnect, and overload conditions.
5. Real-user monitoring for frame gaps, join time, disconnects, reconnects,
   server tick health, snapshot cadence, regional latency, and crash-free runs.
6. A low-bandwidth and degraded-connection indicator that tells the truth instead
   of silently replacing a disconnected person with a bot.

## Release rule

Every feature must run this gate before and after its change. If the candidate
misses any threshold, it is not called smooth, reliable, parity-level, or 10/10.
Reduce visual cost, payload cost, or arena density—or ship the feature disabled—
until the exact candidate passes again. Synthetic evidence still cannot prove
fun, retention, virality, revenue, or superiority over another game.
