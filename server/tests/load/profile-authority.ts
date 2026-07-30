import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import {
  PROTOCOL_VERSION,
  type SnapshotMessage,
  type WorldMessage,
} from "../../src/protocol.ts";
import { ArenaRoom, type ArenaRoomOptions } from "../../src/room.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = resolve(
  process.env.WORMIFI_PROFILE_REPORT ??
    resolve(HERE, "../../proof/load/authority-profile-latest.json"),
);

interface ProfilableRoom {
  snapshot(): SnapshotMessage;
  publicDrops(): WorldMessage["drops"];
}

interface DurationSample {
  iterations: number;
  totalMs: number;
  meanMs: number;
  operationsPerSecond: number;
}

interface TimerSample {
  label: string;
  durationMs: number;
  ticks: number;
  observedHz: number;
  targetHz: number;
  targetRatio: number;
}

interface SnapshotSample {
  targetPopulation: number;
  targetDropCount: number;
  players: number;
  drops: number;
  bodySegments: number;
  oneTimeWorldPayloadBytes: number;
  oneTimeWorldWithoutDropsBytes: number;
  dropsApproximateBytes: number;
  dropsPercentOfWorldPayload: number;
  incrementalSnapshotPayloadBytes: number;
  incrementalSnapshotWithoutPlayersBytes: number;
  playersApproximateBytes: number;
  playersPercentOfIncrementalSnapshot: number;
  snapshotBuild: DurationSample;
  incrementalSnapshotJsonSerialization: DurationSample;
  oneTimeWorldJsonSerialization: DurationSample;
  serializationAtSixRecipients: {
    hypotheticalRepeatedCpuMsPerSnapshot: number;
    currentSerializeOnceCpuMsPerSnapshot: number;
    avoidedSerializationMultiplier: number;
  };
  estimatedNetworkAt15Hz: {
    mebibytesPerSecondPerClient: number;
    megabitsPerSecondPerClient: number;
    mebibytesPerSecondPerSixClientRoom: number;
    mebibytesPerSecondForFourSixClientRooms: number;
  };
}

function round(value: number, digits = 3): number {
  return Number(value.toFixed(digits));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function benchmark(iterations: number, operation: () => void): DurationSample {
  for (let index = 0; index < Math.min(20, iterations); index += 1) operation();
  const startedAt = performance.now();
  for (let index = 0; index < iterations; index += 1) operation();
  const totalMs = performance.now() - startedAt;
  return {
    iterations,
    totalMs: round(totalMs),
    meanMs: round(totalMs / iterations, 6),
    operationsPerSecond: round(iterations / (totalMs / 1_000)),
  };
}

async function baselineTimer(targetHz: number, durationMs: number): Promise<TimerSample> {
  let ticks = 0;
  const startedAt = performance.now();
  const timer = setInterval(() => {
    ticks += 1;
  }, 1_000 / targetHz);
  await delay(durationMs);
  clearInterval(timer);
  const actualDurationMs = performance.now() - startedAt;
  const observedHz = ticks / (actualDurationMs / 1_000);
  return {
    label: "bare-setInterval",
    durationMs: round(actualDurationMs),
    ticks,
    observedHz: round(observedHz),
    targetHz,
    targetRatio: round(observedHz / targetHz),
  };
}

async function roomTimer(
  label: string,
  options: ArenaRoomOptions,
  durationMs: number,
): Promise<TimerSample> {
  const room = new ArenaRoom(`profile-${label}`, options);
  const startedTick = room.state.tick;
  const startedAt = performance.now();
  room.start();
  await delay(durationMs);
  room.stop();
  const actualDurationMs = performance.now() - startedAt;
  const ticks = room.state.tick - startedTick;
  const observedHz = ticks / (actualDurationMs / 1_000);
  const targetHz = options.fixedStepHz ?? 30;
  return {
    label,
    durationMs: round(actualDurationMs),
    ticks,
    observedHz: round(observedHz),
    targetHz,
    targetRatio: round(observedHz / targetHz),
  };
}

function inspectSnapshot(targetPopulation: number, targetDropCount: number): SnapshotSample {
  const room = new ArenaRoom(
    `profile-p${targetPopulation}-d${targetDropCount}`,
    {
      targetPopulation,
      targetDropCount,
      fixedStepHz: 30,
      snapshotHz: 15,
    },
  );
  const profiledRoom = room as unknown as ProfilableRoom;
  const snapshot = profiledRoom.snapshot();
  const world: WorldMessage = {
    type: "world",
    protocolVersion: PROTOCOL_VERSION,
    authority: "server",
    roomId: room.id,
    tick: room.state.tick,
    arenaRadius: room.state.config.arenaRadius,
    collisionRadii: {
      baseRadius: room.state.config.baseRadius,
      massRadiusFactor: room.state.config.massRadiusFactor,
      bodyRadiusFactor: room.state.config.bodyRadiusFactor,
    },
    drops: profiledRoom.publicDrops(),
  };
  const snapshotJson = JSON.stringify(snapshot);
  const worldJson = JSON.stringify(world);
  const worldWithoutDropsJson = JSON.stringify({ ...world, drops: [] });
  const withoutPlayersJson = JSON.stringify({ ...snapshot, players: [] });
  const bodySegments = snapshot.players.reduce(
    (total, player) => total + player.body.length,
    0,
  );
  const oneTimeWorldPayloadBytes = Buffer.byteLength(worldJson);
  const oneTimeWorldWithoutDropsBytes = Buffer.byteLength(worldWithoutDropsJson);
  const incrementalSnapshotPayloadBytes = Buffer.byteLength(snapshotJson);
  const withoutPlayersBytes = Buffer.byteLength(withoutPlayersJson);
  const dropsApproximateBytes = Math.max(
    0,
    oneTimeWorldPayloadBytes - oneTimeWorldWithoutDropsBytes,
  );
  const playersApproximateBytes = Math.max(
    0,
    incrementalSnapshotPayloadBytes - withoutPlayersBytes,
  );
  const snapshotBuild = benchmark(250, () => {
    profiledRoom.snapshot();
  });
  const incrementalSnapshotJsonSerialization = benchmark(250, () => {
    JSON.stringify(snapshot);
  });
  const oneTimeWorldJsonSerialization = benchmark(250, () => {
    JSON.stringify(world);
  });
  const recipients = 6;
  const snapshotHz = 15;
  const bytesPerClientSecond = incrementalSnapshotPayloadBytes * snapshotHz;

  room.stop();
  return {
    targetPopulation,
    targetDropCount,
    players: snapshot.players.length,
    drops: world.drops.length,
    bodySegments,
    oneTimeWorldPayloadBytes,
    oneTimeWorldWithoutDropsBytes,
    dropsApproximateBytes,
    dropsPercentOfWorldPayload: round(
      dropsApproximateBytes / Math.max(1, oneTimeWorldPayloadBytes) * 100,
    ),
    incrementalSnapshotPayloadBytes,
    incrementalSnapshotWithoutPlayersBytes: withoutPlayersBytes,
    playersApproximateBytes,
    playersPercentOfIncrementalSnapshot: round(
      playersApproximateBytes / Math.max(1, incrementalSnapshotPayloadBytes) * 100,
    ),
    snapshotBuild,
    incrementalSnapshotJsonSerialization,
    oneTimeWorldJsonSerialization,
    serializationAtSixRecipients: {
      hypotheticalRepeatedCpuMsPerSnapshot: round(
        incrementalSnapshotJsonSerialization.meanMs * recipients,
      ),
      currentSerializeOnceCpuMsPerSnapshot: incrementalSnapshotJsonSerialization.meanMs,
      avoidedSerializationMultiplier: recipients,
    },
    estimatedNetworkAt15Hz: {
      mebibytesPerSecondPerClient: round(bytesPerClientSecond / 1024 / 1024),
      megabitsPerSecondPerClient: round(bytesPerClientSecond * 8 / 1_000_000),
      mebibytesPerSecondPerSixClientRoom: round(
        bytesPerClientSecond * recipients / 1024 / 1024,
      ),
      mebibytesPerSecondForFourSixClientRooms: round(
        bytesPerClientSecond * recipients * 4 / 1024 / 1024,
      ),
    },
  };
}

const timerDurationMs = 2_000;
const timerSamples: TimerSample[] = [];
timerSamples.push(await baselineTimer(30, timerDurationMs));
timerSamples.push(await roomTimer(
  "one-room-2-actors-0-drops-snapshot-15hz",
  { targetPopulation: 2, targetDropCount: 0, fixedStepHz: 30, snapshotHz: 15 },
  timerDurationMs,
));
timerSamples.push(await roomTimer(
  "one-room-2-actors-720-drops-snapshot-1hz",
  { targetPopulation: 2, targetDropCount: 720, fixedStepHz: 30, snapshotHz: 1 },
  timerDurationMs,
));
timerSamples.push(await roomTimer(
  "one-room-2-actors-720-drops-snapshot-15hz",
  { targetPopulation: 2, targetDropCount: 720, fixedStepHz: 30, snapshotHz: 15 },
  timerDurationMs,
));
timerSamples.push(await roomTimer(
  "one-room-12-actors-720-drops-snapshot-15hz",
  { targetPopulation: 12, targetDropCount: 720, fixedStepHz: 30, snapshotHz: 15 },
  timerDurationMs,
));

const snapshots = [
  inspectSnapshot(2, 0),
  inspectSnapshot(2, 720),
  inspectSnapshot(12, 720),
];

const report = {
  claim: "isolated-local-component-profile-only",
  timerSamples,
  snapshots,
  interpretation: [
    "Compare bare timer and zero-drop room rates to separate timer scheduling from simulation work.",
    "Compare 720-drop snapshot at 1 Hz and 15 Hz to expose snapshot construction overhead without WebSocket fanout.",
    "Snapshot byte attribution estimates the dominant JSON fields by removing one field group at a time.",
    "Fanout serialization compares the current serialize-once room broadcast with the avoided one-serialization-per-recipient pattern; actual socket overhead is not included.",
    "Network estimates are raw JSON payload only and exclude WebSocket framing, TCP/IP, TLS, retransmission, and compression.",
  ],
  caveats: [
    "This microprofile runs without connected sockets, so it does not replace the end-to-end load harness.",
    "Private room methods are invoked only by this diagnostic script and are not a supported application API.",
    "The profile is local, same-process, short-duration, and not a production capacity or parity claim.",
  ],
  measuredAtUtc: new Date().toISOString(),
};

await mkdir(dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.info(JSON.stringify(report, null, 2));
console.info(`\nWrote local authority profile: ${REPORT_PATH}`);
