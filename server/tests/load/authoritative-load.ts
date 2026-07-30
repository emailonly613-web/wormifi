import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, freemem, platform, release, totalmem } from "node:os";
import { dirname, resolve } from "node:path";
import {
  monitorEventLoopDelay,
  performance,
  type IntervalHistogram,
} from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

import {
  decodeSnapshotFromWire,
  type ErrorMessage,
  type PongMessage,
  type PublicDropState,
  type ServerMessage,
  type SnapshotMessage,
  type WelcomeMessage,
} from "../../src/protocol.ts";
import { AuthoritativeArenaServer } from "../../src/server.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPORT_PATH = resolve(HERE, "../../proof/load/authoritative-load-latest.json");
const MAX_WORLD_PAYLOAD_BYTES = 160 * 1024;
const MAX_SNAPSHOT_PAYLOAD_BYTES = 24 * 1024;
const MAX_ESTIMATED_SNAPSHOT_WIRE_MIB_PER_SECOND = 4;

interface LoadConfiguration {
  clients: number;
  rooms: number;
  durationSeconds: number;
  inputHz: number;
  pingHz: number;
  fixedStepHz: number;
  snapshotHz: number;
  targetPopulationPerRoom: number;
  reconnectClients: number;
  invalidBurstMessages: number;
  reconnectPauseMs: number;
  bootstrapTimeoutMs: number;
  joinBatchSize: number;
  joinBatchDelayMs: number;
  allowCapacityMiss: boolean;
  reportPath: string;
}

interface Percentiles {
  samples: number;
  min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
}

interface Metrics {
  initialJoinMs: number[];
  reconnectMs: number[];
  pingRttMs: number[];
  snapshotInterArrivalMs: number[];
  snapshotDeliveryLagMs: number[];
  snapshotBytes: number[];
  worldSyncBytes: number[];
  roomTickRatesHz: number[];
  inputsSent: number;
  pingsSent: number;
  pongsReceived: number;
  snapshotsReceived: number;
  worldSyncsReceived: number;
  roomContamination: number;
  collectorBeaconWorlds: number;
  activeCollectorSnapshots: number;
  echoOriginDropsSeen: number;
  groundLoopMetadataViolations: number;
  errorCounts: Map<string, number>;
}

interface TickSample {
  tick: number;
  receivedAtMs: number;
}

interface Report {
  verdict: "LOCAL_CAPACITY_GATE_PASS" | "LOCAL_CAPACITY_GATE_MISS";
  claim: "bounded-local-authoritative-network-proof-only";
  configuration: Omit<LoadConfiguration, "reportPath">;
  measured: {
    runtimeMs: number;
    initialJoinMs: Percentiles;
    reconnectMs: Percentiles;
    pingRoundTripMs: Percentiles;
    snapshotInterArrivalMs: Percentiles;
    snapshotDeliveryLagMs: Percentiles;
    snapshotPayloadBytes: Percentiles;
    worldSyncPayloadBytes: Percentiles;
    observedRoomTickRateHz: Percentiles;
    inputsSent: number;
    inputMessagesPerSecond: number;
    pingsSent: number;
    pongsReceived: number;
    snapshotsReceived: number;
    worldSyncsReceived: number;
    snapshotsPerClientSecond: number;
    estimatedSnapshotWireMiBPerSecond: number;
    capacityGate: {
      pass: boolean;
      minimumTargetRatio: number;
      fixedStepTargetHz: number;
      observedMedianTickRateHz: number;
      fixedStepTargetRatio: number;
      snapshotTargetHz: number;
      observedSnapshotsPerClientSecond: number;
      snapshotTargetRatio: number;
    };
    eventLoopDelayMs: {
      min: number;
      p50: number;
      p95: number;
      p99: number;
      max: number;
      mean: number;
    };
    process: {
      cpuPercentOfOneCore: number;
      userCpuMs: number;
      systemCpuMs: number;
      baselineHeapMiB: number;
      endingHeapMiB: number;
      peakHeapMiB: number;
      baselineRssMiB: number;
      endingRssMiB: number;
      peakRssMiB: number;
    };
    invalidAndBurstProbe: {
      expectedErrorCodesObserved: string[];
      boundedInvalidBurstMessages: number;
      responsiveAfterBurst: boolean;
      healthCheckAfterBurst: boolean;
    };
    reconnect: {
      attempted: number;
      recoveredSamePlayer: number;
    };
    collectorGroundLoop: {
      beaconWorldSyncs: number;
      activeCollectorSnapshots: number;
      echoOriginDropsSeen: number;
      metadataViolations: number;
      bandwidthBudget: {
        pass: boolean;
        maximumWorldPayloadBytes: number;
        observedWorldP99Bytes: number;
        maximumSnapshotPayloadBytes: number;
        observedSnapshotP99Bytes: number;
        maximumEstimatedSnapshotWireMiBPerSecond: number;
        observedEstimatedSnapshotWireMiBPerSecond: number;
      };
    };
    roomIsolationViolations: number;
  };
  environment: {
    node: string;
    platform: string;
    release: string;
    architecture: string;
    logicalCpuCount: number;
    cpuModel: string;
    totalMemoryGiB: number;
    freeMemoryGiBAtReport: number;
  };
  assertions: string[];
  caveats: string[];
  measuredAtUtc: string;
}

type MessagePredicate<T extends ServerMessage> = (message: ServerMessage) => message is T;

interface MessageWaiter<T extends ServerMessage = ServerMessage> {
  predicate: MessagePredicate<T>;
  resolve: (message: T) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

function numericEnvironment(name: string, fallback: number, minimum: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`${name} must be a finite number greater than or equal to ${minimum}.`);
  }
  return value;
}

function integerEnvironment(name: string, fallback: number, minimum: number): number {
  return Math.floor(numericEnvironment(name, fallback, minimum));
}

function loadConfiguration(): LoadConfiguration {
  const clients = integerEnvironment("WORMIFI_LOAD_CLIENTS", 24, 2);
  const rooms = integerEnvironment("WORMIFI_LOAD_ROOMS", 4, 2);
  assert.ok(clients >= rooms, "The harness needs at least one synthetic client per room.");

  return {
    clients,
    rooms,
    durationSeconds: numericEnvironment("WORMIFI_LOAD_SECONDS", 10, 3),
    inputHz: numericEnvironment("WORMIFI_LOAD_INPUT_HZ", 20, 1),
    pingHz: numericEnvironment("WORMIFI_LOAD_PING_HZ", 2, 0.2),
    fixedStepHz: integerEnvironment("WORMIFI_LOAD_FIXED_STEP_HZ", 30, 1),
    snapshotHz: integerEnvironment("WORMIFI_LOAD_SNAPSHOT_HZ", 15, 1),
    targetPopulationPerRoom: integerEnvironment(
      "WORMIFI_LOAD_TARGET_POPULATION",
      Math.max(12, Math.ceil(clients / rooms)),
      1,
    ),
    reconnectClients: Math.min(
      clients,
      integerEnvironment("WORMIFI_LOAD_RECONNECT_CLIENTS", 4, 1),
    ),
    invalidBurstMessages: integerEnvironment("WORMIFI_LOAD_INVALID_BURST", 250, 1),
    reconnectPauseMs: integerEnvironment("WORMIFI_LOAD_RECONNECT_PAUSE_MS", 150, 25),
    bootstrapTimeoutMs: integerEnvironment("WORMIFI_LOAD_BOOTSTRAP_TIMEOUT_MS", 3_000, 500),
    joinBatchSize: Math.min(
      clients,
      integerEnvironment("WORMIFI_LOAD_JOIN_BATCH_SIZE", clients, 1),
    ),
    joinBatchDelayMs: integerEnvironment("WORMIFI_LOAD_JOIN_BATCH_DELAY_MS", 0, 0),
    allowCapacityMiss: process.env.WORMIFI_LOAD_ALLOW_CAPACITY_MISS === "1",
    reportPath: resolve(process.env.WORMIFI_LOAD_REPORT ?? DEFAULT_REPORT_PATH),
  };
}

function round(value: number, digits = 3): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

function percentile(sorted: readonly number[], quantile: number): number {
  if (sorted.length === 0) return 0;
  const position = Math.max(0, Math.min(sorted.length - 1, (sorted.length - 1) * quantile));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower] ?? 0;
  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? lowerValue;
  return lowerValue + (upperValue - lowerValue) * (position - lower);
}

function summarize(values: readonly number[]): Percentiles {
  const sorted = [...values].filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) {
    return { samples: 0, min: 0, p50: 0, p95: 0, p99: 0, max: 0, mean: 0 };
  }
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    samples: sorted.length,
    min: round(sorted[0] ?? 0),
    p50: round(percentile(sorted, 0.5)),
    p95: round(percentile(sorted, 0.95)),
    p99: round(percentile(sorted, 0.99)),
    max: round(sorted.at(-1) ?? 0),
    mean: round(sum / sorted.length),
  };
}

function histogramMilliseconds(histogram: IntervalHistogram): Report["measured"]["eventLoopDelayMs"] {
  const nanosecondsToMilliseconds = (value: number): number => round(value / 1_000_000);
  return {
    min: nanosecondsToMilliseconds(histogram.min),
    p50: nanosecondsToMilliseconds(histogram.percentile(50)),
    p95: nanosecondsToMilliseconds(histogram.percentile(95)),
    p99: nanosecondsToMilliseconds(histogram.percentile(99)),
    max: nanosecondsToMilliseconds(histogram.max),
    mean: nanosecondsToMilliseconds(histogram.mean),
  };
}

function megabytes(bytes: number): number {
  return round(bytes / 1024 / 1024);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function waitUntil(
  predicate: () => boolean,
  description: string,
  timeoutMs = 4_000,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if (predicate()) return;
    await delay(20);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

function isWelcome(message: ServerMessage): message is WelcomeMessage {
  return message.type === "welcome";
}

function isPong(message: ServerMessage): message is PongMessage {
  return message.type === "pong";
}

function isErrorCode(code: ErrorMessage["code"]): MessagePredicate<ErrorMessage> {
  return (message): message is ErrorMessage => message.type === "error" && message.code === code;
}

function inspectGroundDropMetadata(drops: readonly PublicDropState[], metrics: Metrics): void {
  for (const drop of drops) {
    if (drop.source === "boost" || drop.source === "death") {
      if (typeof drop.originPlayerId === "string" && drop.originPlayerId.length > 0) {
        metrics.echoOriginDropsSeen += 1;
      } else {
        metrics.groundLoopMetadataViolations += 1;
      }
    }
    if (drop.specialist === "collector" && (
      drop.mass !== 0 ||
      drop.source !== "arena" ||
      drop.originPlayerId !== undefined ||
      !Number.isSafeInteger(drop.specialistDurationTicks) ||
      (drop.specialistDurationTicks ?? 0) <= 0
    )) {
      metrics.groundLoopMetadataViolations += 1;
    }
  }
}

class SyntheticClient {
  readonly socket: WebSocket;
  readonly expectedRoom: string;
  readonly name: string;
  readonly playerId: string;
  readonly reconnectToken: string;

  lastSnapshot?: SnapshotMessage;
  private readonly metrics: Metrics;
  private readonly waiters: MessageWaiter[] = [];
  private readonly pendingPingStartedAt = new Map<string, number>();
  private readonly recentMessages: ServerMessage[] = [];
  private capturing = false;
  private lastSnapshotReceivedAt?: number;
  private firstTickSample?: TickSample;
  private lastTickSample?: TickSample;
  private sequence: number;
  private pingNumber = 0;

  private constructor(
    socket: WebSocket,
    metrics: Metrics,
    roomId: string,
    name: string,
    welcome: WelcomeMessage,
    startingSequence: number,
  ) {
    this.socket = socket;
    this.metrics = metrics;
    this.expectedRoom = roomId;
    this.name = name;
    this.playerId = welcome.playerId;
    this.reconnectToken = welcome.reconnectToken;
    this.sequence = startingSequence;
  }

  static async connect(
    url: string,
    metrics: Metrics,
    options: {
      roomId: string;
      name: string;
      reconnectToken?: string;
      startingSequence?: number;
      recordInitialJoin?: boolean;
      bootstrapTimeoutMs?: number;
    },
  ): Promise<SyntheticClient> {
    const startedAt = performance.now();
    const socket = new WebSocket(url);
    const bootstrap = new BootstrapSocket(socket);
    await bootstrap.open();
    const welcomePromise = bootstrap.next(
      isWelcome,
      options.bootstrapTimeoutMs ?? 3_000,
      `join welcome for ${options.name} in ${options.roomId}`,
    );
    socket.send(JSON.stringify({
      type: "join",
      roomId: options.roomId,
      name: options.name,
      reconnectToken: options.reconnectToken,
    }));
    const welcome = await welcomePromise;
    const client = new SyntheticClient(
      socket,
      metrics,
      options.roomId,
      options.name,
      welcome,
      options.startingSequence ?? 0,
    );
    bootstrap.transferTo(client);
    if (options.recordInitialJoin !== false) {
      metrics.initialJoinMs.push(performance.now() - startedAt);
    }
    return client;
  }

  static async openUnjoined(
    url: string,
    metrics: Metrics,
    roomId: string,
    name: string,
  ): Promise<UnjoinedProbe> {
    const socket = new WebSocket(url);
    const probe = new UnjoinedProbe(socket, metrics, roomId, name);
    await probe.open();
    return probe;
  }

  receive(raw: WebSocket.RawData): void {
    let message: ServerMessage;
    try {
      const decoded = decodeSnapshotFromWire(JSON.parse(raw.toString()));
      if (decoded === null) return;
      message = decoded as ServerMessage;
    } catch {
      return;
    }

    if (message.type === "error") {
      this.metrics.errorCounts.set(message.code, (this.metrics.errorCounts.get(message.code) ?? 0) + 1);
    }

    if (message.type === "pong") {
      const startedAt = message.nonce ? this.pendingPingStartedAt.get(message.nonce) : undefined;
      if (message.nonce) this.pendingPingStartedAt.delete(message.nonce);
      if (startedAt !== undefined) {
        this.metrics.pingRttMs.push(performance.now() - startedAt);
        this.metrics.pongsReceived += 1;
      }
    }

    if (message.type === "snapshot") {
      this.lastSnapshot = message as SnapshotMessage;
      if (message.roomId !== this.expectedRoom) this.metrics.roomContamination += 1;
      inspectGroundDropMetadata(message.dropUpserts, this.metrics);
      for (const player of message.players) {
        if (!player.specialist) continue;
        if (
          player.specialist.kind !== "collector" ||
          player.specialist.durationTicks <= 0 ||
          player.specialist.activatedAtTick > message.tick ||
          player.specialist.expiresAtTick <= message.tick
        ) {
          this.metrics.groundLoopMetadataViolations += 1;
        } else {
          this.metrics.activeCollectorSnapshots += 1;
        }
      }
      if (this.capturing) {
        const receivedAt = performance.now();
        this.metrics.snapshotsReceived += 1;
        this.metrics.snapshotBytes.push(Buffer.byteLength(raw.toString()));
        this.metrics.snapshotDeliveryLagMs.push(Math.max(0, Date.now() - message.serverTimeMs));
        if (this.lastSnapshotReceivedAt !== undefined) {
          this.metrics.snapshotInterArrivalMs.push(receivedAt - this.lastSnapshotReceivedAt);
        }
        this.lastSnapshotReceivedAt = receivedAt;
        this.firstTickSample ??= { tick: message.tick, receivedAtMs: receivedAt };
        this.lastTickSample = { tick: message.tick, receivedAtMs: receivedAt };
      }
    }

    if (message.type === "world") {
      this.metrics.worldSyncsReceived += 1;
      this.metrics.worldSyncBytes.push(Buffer.byteLength(raw.toString()));
      inspectGroundDropMetadata(message.drops, this.metrics);
      const beacons = message.drops.filter((drop) => drop.specialist === "collector");
      if (beacons.length === 1) this.metrics.collectorBeaconWorlds += 1;
      if (beacons.length > 1) this.metrics.groundLoopMetadataViolations += 1;
    }

    const waiterIndex = this.waiters.findIndex((waiter) => waiter.predicate(message));
    if (waiterIndex >= 0) {
      const [waiter] = this.waiters.splice(waiterIndex, 1);
      if (waiter) {
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
      return;
    }

    if (message.type !== "snapshot" && message.type !== "pong") {
      this.recentMessages.push(message);
      if (this.recentMessages.length > 100) this.recentMessages.shift();
    }
  }

  beginMeasurement(): void {
    this.capturing = true;
    this.lastSnapshotReceivedAt = undefined;
    this.firstTickSample = undefined;
    this.lastTickSample = undefined;
  }

  endMeasurement(): void {
    this.capturing = false;
    if (
      this.firstTickSample &&
      this.lastTickSample &&
      this.lastTickSample.receivedAtMs > this.firstTickSample.receivedAtMs
    ) {
      const ticks = this.lastTickSample.tick - this.firstTickSample.tick;
      const seconds =
        (this.lastTickSample.receivedAtMs - this.firstTickSample.receivedAtMs) / 1_000;
      if (ticks > 0 && seconds > 0) this.metrics.roomTickRatesHz.push(ticks / seconds);
    }
  }

  sendInput(nowMs: number): void {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    this.sequence += 1;
    const angle = nowMs / 1_370 + this.playerId.length * 0.73;
    this.socket.send(JSON.stringify({
      type: "input",
      sequence: this.sequence,
      clientTick: this.lastSnapshot?.tick,
      direction: { x: Math.cos(angle), y: Math.sin(angle) },
      boost: Math.floor(nowMs / 1_500 + this.playerId.length) % 4 === 0,
    }));
    this.metrics.inputsSent += 1;
  }

  sendPing(): void {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    this.pingNumber += 1;
    const nonce = `${this.playerId}:${this.pingNumber}:${Math.round(performance.now() * 1000)}`;
    this.pendingPingStartedAt.set(nonce, performance.now());
    this.socket.send(JSON.stringify({ type: "ping", nonce }));
    this.metrics.pingsSent += 1;
  }

  next<T extends ServerMessage>(
    predicate: MessagePredicate<T>,
    timeoutMs = 3_000,
  ): Promise<T> {
    const queuedIndex = this.recentMessages.findIndex(predicate);
    if (queuedIndex >= 0) return Promise.resolve(this.recentMessages.splice(queuedIndex, 1)[0] as T);

    return new Promise<T>((resolveMessage, rejectMessage) => {
      const waiter = {
        predicate,
        resolve: (message: ServerMessage) => resolveMessage(message as T),
        reject: rejectMessage,
        timer: setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) this.waiters.splice(index, 1);
          rejectMessage(new Error(`Timed out waiting for a server message for ${this.name}.`));
        }, timeoutMs),
      } satisfies MessageWaiter;
      this.waiters.push(waiter);
    });
  }

  getSequence(): number {
    return this.sequence;
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise<void>((resolveClose) => this.socket.once("close", () => resolveClose()));
    this.socket.close(1000, "load harness reconnect/cleanup");
    await closed;
  }
}

class BootstrapSocket {
  private readonly queued: WebSocket.RawData[] = [];
  private readonly waiters: Array<{
    predicate: MessagePredicate<ServerMessage>;
    resolve: (message: ServerMessage) => void;
  }> = [];
  private transferred = false;

  constructor(private readonly socket: WebSocket) {
    socket.on("message", (raw) => {
      if (this.transferred) return;
      const message = JSON.parse(raw.toString()) as ServerMessage;
      const waiterIndex = this.waiters.findIndex((waiter) => waiter.predicate(message));
      if (waiterIndex >= 0) {
        const [waiter] = this.waiters.splice(waiterIndex, 1);
        waiter?.resolve(message);
      } else {
        this.queued.push(raw);
      }
    });
  }

  async open(): Promise<void> {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise<void>((resolveOpen, rejectOpen) => {
      this.socket.once("open", () => resolveOpen());
      this.socket.once("error", rejectOpen);
    });
  }

  next<T extends ServerMessage>(
    predicate: MessagePredicate<T>,
    timeoutMs = 3_000,
    description = "bootstrap message",
  ): Promise<T> {
    for (const [index, raw] of this.queued.entries()) {
      const message = JSON.parse(raw.toString()) as ServerMessage;
      if (predicate(message)) {
        this.queued.splice(index, 1);
        return Promise.resolve(message);
      }
    }
    return new Promise<T>((resolveMessage, rejectMessage) => {
      const waiter = {
        predicate: predicate as MessagePredicate<ServerMessage>,
        resolve: (message: ServerMessage) => {
          clearTimeout(timer);
          resolveMessage(message as T);
        },
      };
      this.waiters.push(waiter);
      const timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        rejectMessage(new Error(`Timed out waiting for ${description}.`));
      }, timeoutMs);
    });
  }

  transferTo(client: SyntheticClient): void {
    this.transferred = true;
    this.socket.removeAllListeners("message");
    this.socket.on("message", (raw) => client.receive(raw));
    for (const raw of this.queued) client.receive(raw);
    this.queued.length = 0;
  }
}

class UnjoinedProbe {
  private readonly bootstrap: BootstrapSocket;

  constructor(
    readonly socket: WebSocket,
    private readonly metrics: Metrics,
    readonly roomId: string,
    readonly name: string,
  ) {
    this.bootstrap = new BootstrapSocket(socket);
  }

  open(): Promise<void> {
    return this.bootstrap.open();
  }

  sendJson(value: unknown): void {
    this.socket.send(JSON.stringify(value));
  }

  sendRaw(value: string): void {
    this.socket.send(value);
  }

  sendBinary(value: Uint8Array): void {
    this.socket.send(value, { binary: true });
  }

  async nextError(code: ErrorMessage["code"]): Promise<ErrorMessage> {
    const error = await this.bootstrap.next(
      isErrorCode(code),
      3_000,
      `${code} safety response for ${this.name} in ${this.roomId}`,
    );
    this.metrics.errorCounts.set(error.code, (this.metrics.errorCounts.get(error.code) ?? 0) + 1);
    return error;
  }

  nextWelcome(): Promise<WelcomeMessage> {
    return this.bootstrap.next(
      isWelcome,
      3_000,
      `safety-probe welcome for ${this.name} in ${this.roomId}`,
    );
  }

  async nextPong(): Promise<PongMessage> {
    return await this.bootstrap.next(
      isPong,
      3_000,
      `post-burst pong for ${this.name} in ${this.roomId}`,
    );
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise<void>((resolveClose) => this.socket.once("close", () => resolveClose()));
    this.socket.close(1000, "safety probe complete");
    await closed;
  }
}

async function runInvalidAndBurstProbe(
  websocketUrl: string,
  httpUrl: string,
  configuration: LoadConfiguration,
  metrics: Metrics,
): Promise<{
  expectedErrorCodesObserved: string[];
  boundedInvalidBurstMessages: number;
  responsiveAfterBurst: boolean;
  healthCheckAfterBurst: boolean;
}> {
  const preJoin = await SyntheticClient.openUnjoined(
    websocketUrl,
    metrics,
    "safety-room",
    "Pre-join probe",
  );
  preJoin.sendJson({
    type: "input",
    sequence: 1,
    direction: { x: 1, y: 0 },
    boost: false,
  });
  await preJoin.nextError("JOIN_REQUIRED");
  await preJoin.close();

  const probe = await SyntheticClient.openUnjoined(
    websocketUrl,
    metrics,
    "safety-room",
    "Safety probe",
  );
  const welcomePromise = probe.nextWelcome();
  probe.sendJson({ type: "join", roomId: "safety-room", name: "Safety probe" });
  await welcomePromise;

  probe.sendRaw("{not valid json");
  await probe.nextError("BAD_JSON");

  probe.sendJson({
    type: "input",
    sequence: 1,
    direction: { x: null, y: 0 },
    boost: false,
  });
  await probe.nextError("MALFORMED_INPUT");

  probe.sendJson({
    type: "input",
    sequence: 1,
    direction: { x: 1, y: 0 },
    boost: false,
    mass: 999_999,
  });
  await probe.nextError("UNSUPPORTED_FIELD");

  probe.sendJson({
    type: "input",
    sequence: 1,
    direction: { x: 1, y: 0 },
    boost: false,
  });
  await delay(30);
  probe.sendJson({
    type: "input",
    sequence: 1,
    direction: { x: 1, y: 0 },
    boost: false,
  });
  await probe.nextError("STALE_INPUT");

  probe.sendJson({
    type: "input",
    sequence: 20_002,
    direction: { x: 1, y: 0 },
    boost: false,
  });
  await probe.nextError("RATE_LIMITED");

  probe.sendBinary(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  await probe.nextError("BAD_JSON");

  const burstRejections = Array.from(
    { length: configuration.invalidBurstMessages },
    async () => await probe.nextError("STALE_INPUT"),
  );
  for (let index = 0; index < configuration.invalidBurstMessages; index += 1) {
    probe.sendJson({
      type: "input",
      sequence: 1,
      direction: { x: 1, y: 0 },
      boost: false,
    });
  }
  await Promise.all(burstRejections);

  const postBurstNonce = `after-burst-${Date.now()}`;
  const pongPromise = probe.nextPong();
  probe.sendJson({ type: "ping", nonce: postBurstNonce });
  const pong = await pongPromise;
  const responsiveAfterBurst = pong.nonce === postBurstNonce;

  const response = await fetch(`${httpUrl}/healthz`);
  const health = await response.json() as { ok?: boolean; authority?: string };
  const healthCheckAfterBurst =
    response.ok && health.ok === true && health.authority === "server";

  await probe.close();
  return {
    expectedErrorCodesObserved: [
      "JOIN_REQUIRED",
      "BAD_JSON",
      "MALFORMED_INPUT",
      "UNSUPPORTED_FIELD",
      "STALE_INPUT",
      "RATE_LIMITED",
    ].filter((code) => (metrics.errorCounts.get(code) ?? 0) > 0),
    boundedInvalidBurstMessages: configuration.invalidBurstMessages,
    responsiveAfterBurst,
    healthCheckAfterBurst,
  };
}

function createMetrics(): Metrics {
  return {
    initialJoinMs: [],
    reconnectMs: [],
    pingRttMs: [],
    snapshotInterArrivalMs: [],
    snapshotDeliveryLagMs: [],
    snapshotBytes: [],
    worldSyncBytes: [],
    roomTickRatesHz: [],
    inputsSent: 0,
    pingsSent: 0,
    pongsReceived: 0,
    snapshotsReceived: 0,
    worldSyncsReceived: 0,
    roomContamination: 0,
    collectorBeaconWorlds: 0,
    activeCollectorSnapshots: 0,
    echoOriginDropsSeen: 0,
    groundLoopMetadataViolations: 0,
    errorCounts: new Map(),
  };
}

async function reconnectSubset(
  clients: SyntheticClient[],
  indexes: readonly number[],
  websocketUrl: string,
  metrics: Metrics,
  configuration: LoadConfiguration,
): Promise<number> {
  let recoveredSamePlayer = 0;
  await Promise.all(indexes.map(async (index) => {
    const previous = clients[index];
    assert.ok(previous);
    const priorPlayerId = previous.playerId;
    const token = previous.reconnectToken;
    const sequence = previous.getSequence();
    const roomId = previous.expectedRoom;
    const name = previous.name;
    previous.endMeasurement();

    const startedAt = performance.now();
    await previous.close();
    await delay(configuration.reconnectPauseMs);
    const replacement = await SyntheticClient.connect(websocketUrl, metrics, {
      roomId,
      name,
      reconnectToken: token,
      startingSequence: sequence,
      recordInitialJoin: false,
      bootstrapTimeoutMs: configuration.bootstrapTimeoutMs,
    });
    metrics.reconnectMs.push(performance.now() - startedAt);
    assert.equal(replacement.playerId, priorPlayerId, "reconnect must recover the same player");
    replacement.beginMeasurement();
    clients[index] = replacement;
    recoveredSamePlayer += 1;
  }));
  return recoveredSamePlayer;
}

async function main(): Promise<void> {
  const configuration = loadConfiguration();
  const metrics = createMetrics();
  const server = new AuthoritativeArenaServer({
    host: "127.0.0.1",
    port: 0,
    maxRooms: configuration.rooms + 2,
    targetPopulation: configuration.targetPopulationPerRoom,
    fixedStepHz: configuration.fixedStepHz,
    snapshotHz: configuration.snapshotHz,
    reconnectGraceMs: Math.max(2_000, configuration.reconnectPauseMs * 5),
  });

  const socketsToClose: SyntheticClient[] = [];
  let inputTimer: NodeJS.Timeout | undefined;
  let pingTimer: NodeJS.Timeout | undefined;
  let memoryTimer: NodeJS.Timeout | undefined;
  const eventLoop = monitorEventLoopDelay({ resolution: 10 });

  try {
    const startedServer = await server.start();
    const clients: SyntheticClient[] = [];
    for (let batchStart = 0; batchStart < configuration.clients; batchStart += configuration.joinBatchSize) {
      const batchEnd = Math.min(configuration.clients, batchStart + configuration.joinBatchSize);
      const batch = await Promise.all(
        Array.from({ length: batchEnd - batchStart }, async (_, batchIndex) => {
          const index = batchStart + batchIndex;
        const roomIndex = index % configuration.rooms;
        return await SyntheticClient.connect(startedServer.websocketUrl, metrics, {
          roomId: `load-room-${roomIndex + 1}`,
          name: `Synthetic ${index + 1}`,
          bootstrapTimeoutMs: configuration.bootstrapTimeoutMs,
        });
        }),
      );
      clients.push(...batch);
      if (batchEnd < configuration.clients && configuration.joinBatchDelayMs > 0) {
        await delay(configuration.joinBatchDelayMs);
      }
    }
    socketsToClose.push(...clients);

    const expectedHumansByRoom = new Map<string, number>();
    for (const client of clients) {
      expectedHumansByRoom.set(
        client.expectedRoom,
        (expectedHumansByRoom.get(client.expectedRoom) ?? 0) + 1,
      );
    }
    await waitUntil(
      () => clients.every((client) => {
        const expectedHumans = expectedHumansByRoom.get(client.expectedRoom) ?? 0;
        const players = client.lastSnapshot?.players ?? [];
        return (
          players.length === configuration.targetPopulationPerRoom &&
          players.filter((player) => player.kind === "human").length === expectedHumans
        );
      }),
      "every room to show its final human count and bot backfill",
      configuration.bootstrapTimeoutMs,
    );

    const baselineMemory = process.memoryUsage();
    let peakHeap = baselineMemory.heapUsed;
    let peakRss = baselineMemory.rss;
    const baselineCpu = process.cpuUsage();
    const runtimeStartedAt = performance.now();
    eventLoop.enable();
    eventLoop.reset();
    clients.forEach((client) => client.beginMeasurement());

    memoryTimer = setInterval(() => {
      const memory = process.memoryUsage();
      peakHeap = Math.max(peakHeap, memory.heapUsed);
      peakRss = Math.max(peakRss, memory.rss);
    }, 100);

    inputTimer = setInterval(() => {
      const nowMs = performance.now();
      for (const client of clients) client.sendInput(nowMs);
    }, 1_000 / configuration.inputHz);

    pingTimer = setInterval(() => {
      for (const client of clients) client.sendPing();
    }, 1_000 / configuration.pingHz);

    const reconnectIndexes = Array.from(
      { length: configuration.reconnectClients },
      (_, index) => index,
    );
    const reconnectTask = (async () => {
      await delay(configuration.durationSeconds * 1_000 * 0.42);
      return await reconnectSubset(
        clients,
        reconnectIndexes,
        startedServer.websocketUrl,
        metrics,
        configuration,
      );
    })();
    const invalidProbeTask = (async () => {
      await delay(Math.min(1_000, configuration.durationSeconds * 1_000 * 0.2));
      return await runInvalidAndBurstProbe(
        startedServer.websocketUrl,
        startedServer.httpUrl,
        configuration,
        metrics,
      );
    })();

    await delay(configuration.durationSeconds * 1_000);
    const [recoveredSamePlayer, invalidProbe] = await Promise.all([
      reconnectTask,
      invalidProbeTask,
    ]);

    if (inputTimer) clearInterval(inputTimer);
    if (pingTimer) clearInterval(pingTimer);
    if (memoryTimer) clearInterval(memoryTimer);
    inputTimer = undefined;
    pingTimer = undefined;
    memoryTimer = undefined;
    clients.forEach((client) => client.endMeasurement());
    eventLoop.disable();

    const runtimeMs = performance.now() - runtimeStartedAt;
    const endingMemory = process.memoryUsage();
    peakHeap = Math.max(peakHeap, endingMemory.heapUsed);
    peakRss = Math.max(peakRss, endingMemory.rss);
    const cpu = process.cpuUsage(baselineCpu);
    const totalCpuMicroseconds = cpu.user + cpu.system;
    const expectedErrorCodes = [
      "JOIN_REQUIRED",
      "BAD_JSON",
      "MALFORMED_INPUT",
      "UNSUPPORTED_FIELD",
      "STALE_INPUT",
      "RATE_LIMITED",
    ];

    assert.equal(metrics.roomContamination, 0, "snapshots must never cross room boundaries");
    assert.equal(recoveredSamePlayer, configuration.reconnectClients);
    assert.deepEqual(invalidProbe.expectedErrorCodesObserved, expectedErrorCodes);
    assert.equal(invalidProbe.responsiveAfterBurst, true);
    assert.equal(invalidProbe.healthCheckAfterBurst, true);
    assert.ok(
      metrics.pingRttMs.length >= configuration.clients,
      "each synthetic client should contribute ping samples",
    );
    assert.ok(
      metrics.snapshotInterArrivalMs.length >=
        configuration.clients * configuration.durationSeconds * configuration.snapshotHz * 0.45,
      "snapshot cadence sample count is unexpectedly low",
    );
    const snapshotCadence = summarize(metrics.snapshotInterArrivalMs);
    const expectedIntervalMs = 1_000 / configuration.snapshotHz;
    assert.ok(
      snapshotCadence.p50 >= expectedIntervalMs * 0.45 &&
        snapshotCadence.p50 <= expectedIntervalMs * 2.2,
      `median snapshot cadence ${snapshotCadence.p50} ms is outside the broad local proof window`,
    );

    const tickRate = summarize(metrics.roomTickRatesHz);
    const snapshotsPerClientSecond =
      metrics.snapshotsReceived /
      configuration.clients /
      (runtimeMs / 1_000);
    const snapshotPayload = summarize(metrics.snapshotBytes);
    const worldPayload = summarize(metrics.worldSyncBytes);
    const estimatedSnapshotWireMiBPerSecond = round(
      snapshotPayload.mean *
        metrics.snapshotsReceived /
        (runtimeMs / 1_000) /
        1024 /
        1024,
    );
    const groundLoopBandwidthPass =
      worldPayload.p99 <= MAX_WORLD_PAYLOAD_BYTES &&
      snapshotPayload.p99 <= MAX_SNAPSHOT_PAYLOAD_BYTES &&
      estimatedSnapshotWireMiBPerSecond <= MAX_ESTIMATED_SNAPSHOT_WIRE_MIB_PER_SECOND;
    assert.ok(metrics.collectorBeaconWorlds > 0, "load clients must observe authoritative Collector metadata");
    assert.ok(metrics.echoOriginDropsSeen > 0, "load snapshots must expose at least one producer-owned Echo");
    assert.equal(metrics.groundLoopMetadataViolations, 0, "ground-loop metadata must remain coherent");
    assert.equal(groundLoopBandwidthPass, true, "Collector metadata exceeded the bounded payload budget");
    const minimumTargetRatio = 0.98;
    const fixedStepTargetRatio = tickRate.p50 / configuration.fixedStepHz;
    const snapshotTargetRatio = snapshotsPerClientSecond / configuration.snapshotHz;
    const capacityGatePass =
      fixedStepTargetRatio >= minimumTargetRatio &&
      snapshotTargetRatio >= minimumTargetRatio;
    const machineCpus = cpus();
    const report: Report = {
      verdict: capacityGatePass
        ? "LOCAL_CAPACITY_GATE_PASS"
        : "LOCAL_CAPACITY_GATE_MISS",
      claim: "bounded-local-authoritative-network-proof-only",
      configuration: {
        clients: configuration.clients,
        rooms: configuration.rooms,
        durationSeconds: configuration.durationSeconds,
        inputHz: configuration.inputHz,
        pingHz: configuration.pingHz,
        fixedStepHz: configuration.fixedStepHz,
        snapshotHz: configuration.snapshotHz,
        targetPopulationPerRoom: configuration.targetPopulationPerRoom,
        reconnectClients: configuration.reconnectClients,
        invalidBurstMessages: configuration.invalidBurstMessages,
        reconnectPauseMs: configuration.reconnectPauseMs,
        bootstrapTimeoutMs: configuration.bootstrapTimeoutMs,
        joinBatchSize: configuration.joinBatchSize,
        joinBatchDelayMs: configuration.joinBatchDelayMs,
        allowCapacityMiss: configuration.allowCapacityMiss,
      },
      measured: {
        runtimeMs: round(runtimeMs),
        initialJoinMs: summarize(metrics.initialJoinMs),
        reconnectMs: summarize(metrics.reconnectMs),
        pingRoundTripMs: summarize(metrics.pingRttMs),
        snapshotInterArrivalMs: snapshotCadence,
        snapshotDeliveryLagMs: summarize(metrics.snapshotDeliveryLagMs),
        snapshotPayloadBytes: snapshotPayload,
        worldSyncPayloadBytes: worldPayload,
        observedRoomTickRateHz: tickRate,
        inputsSent: metrics.inputsSent,
        inputMessagesPerSecond: round(metrics.inputsSent / (runtimeMs / 1_000)),
        pingsSent: metrics.pingsSent,
        pongsReceived: metrics.pongsReceived,
        snapshotsReceived: metrics.snapshotsReceived,
        worldSyncsReceived: metrics.worldSyncsReceived,
        snapshotsPerClientSecond: round(snapshotsPerClientSecond),
        estimatedSnapshotWireMiBPerSecond,
        capacityGate: {
          pass: capacityGatePass,
          minimumTargetRatio,
          fixedStepTargetHz: configuration.fixedStepHz,
          observedMedianTickRateHz: tickRate.p50,
          fixedStepTargetRatio: round(fixedStepTargetRatio),
          snapshotTargetHz: configuration.snapshotHz,
          observedSnapshotsPerClientSecond: round(snapshotsPerClientSecond),
          snapshotTargetRatio: round(snapshotTargetRatio),
        },
        eventLoopDelayMs: histogramMilliseconds(eventLoop),
        process: {
          cpuPercentOfOneCore: round(
            totalCpuMicroseconds / (runtimeMs * 1_000) * 100,
          ),
          userCpuMs: round(cpu.user / 1_000),
          systemCpuMs: round(cpu.system / 1_000),
          baselineHeapMiB: megabytes(baselineMemory.heapUsed),
          endingHeapMiB: megabytes(endingMemory.heapUsed),
          peakHeapMiB: megabytes(peakHeap),
          baselineRssMiB: megabytes(baselineMemory.rss),
          endingRssMiB: megabytes(endingMemory.rss),
          peakRssMiB: megabytes(peakRss),
        },
        invalidAndBurstProbe: invalidProbe,
        reconnect: {
          attempted: configuration.reconnectClients,
          recoveredSamePlayer,
        },
        collectorGroundLoop: {
          beaconWorldSyncs: metrics.collectorBeaconWorlds,
          activeCollectorSnapshots: metrics.activeCollectorSnapshots,
          echoOriginDropsSeen: metrics.echoOriginDropsSeen,
          metadataViolations: metrics.groundLoopMetadataViolations,
          bandwidthBudget: {
            pass: groundLoopBandwidthPass,
            maximumWorldPayloadBytes: MAX_WORLD_PAYLOAD_BYTES,
            observedWorldP99Bytes: worldPayload.p99,
            maximumSnapshotPayloadBytes: MAX_SNAPSHOT_PAYLOAD_BYTES,
            observedSnapshotP99Bytes: snapshotPayload.p99,
            maximumEstimatedSnapshotWireMiBPerSecond:
              MAX_ESTIMATED_SNAPSHOT_WIRE_MIB_PER_SECOND,
            observedEstimatedSnapshotWireMiBPerSecond: estimatedSnapshotWireMiBPerSecond,
          },
        },
        roomIsolationViolations: metrics.roomContamination,
      },
      environment: {
        node: process.version,
        platform: platform(),
        release: release(),
        architecture: process.arch,
        logicalCpuCount: machineCpus.length,
        cpuModel: machineCpus[0]?.model ?? "unknown",
        totalMemoryGiB: round(totalmem() / 1024 / 1024 / 1024),
        freeMemoryGiBAtReport: round(freemem() / 1024 / 1024 / 1024),
      },
      assertions: [
        `${configuration.clients} real WebSocket clients were distributed across ${configuration.rooms} isolated rooms.`,
        `${configuration.reconnectClients} reconnects recovered the same server-owned player identity.`,
        `The server stayed responsive after ${configuration.invalidBurstMessages} deliberately stale messages.`,
        "Malformed, forged-field, binary, stale, pre-join, and excessive-sequence messages failed closed.",
        "Snapshot cadence, local ping RTT, event-loop delay, CPU, heap, RSS, and payload sizes were measured.",
        "Collector beacon/active-state metadata and Echo producer identity stayed coherent under room load.",
        "World, snapshot, and estimated snapshot-wire payloads stayed inside the published regression budget.",
        capacityGatePass
          ? "Observed simulation and snapshot delivery both reached at least 98% of their configured local targets."
          : "CAPACITY GATE MISS: observed simulation or snapshot delivery fell below 98% of its configured local target.",
      ],
      caveats: [
        "This is a bounded localhost measurement, not a production capacity result or a parity claim.",
        "Synthetic clients and the server share one process and machine; CPU, heap, RSS, and event-loop numbers include both sides of the harness.",
        "Ping RTT and snapshot inter-arrival are measured. Input-to-authoritative-ack latency is not measured because the current protocol does not acknowledge each input.",
        "Loopback traffic does not test WAN latency, packet loss, jitter, TLS termination, proxies, mobile radios, or geographic distance.",
        "The bounded invalid-message burst is a safety regression probe, not DDoS, WAF, bandwidth-exhaustion, or sustained abuse certification.",
        "No multi-node room routing, persistence, rolling deployment, regional failover, or reconnect across server replacement was tested.",
        "Synthetic sockets are not external humans and do not establish retention, fairness, fun, monetization, or Wormate-level market parity.",
        "A separate deployment soak with external load generators, 100/200/350 ms network profiles, packet loss, and long-duration monitoring remains required.",
      ],
      measuredAtUtc: new Date().toISOString(),
    };

    await mkdir(dirname(configuration.reportPath), { recursive: true });
    await writeFile(configuration.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.info(JSON.stringify(report, null, 2));
    console.info(`\nWrote non-production load report: ${configuration.reportPath}`);
    if (!capacityGatePass && !configuration.allowCapacityMiss) {
      process.exitCode = 2;
      console.error(
        "\nCapacity gate missed. The report was written, but this command fails until " +
          "both tick and snapshot delivery reach 98% of configured targets. " +
          "Set WORMIFI_LOAD_ALLOW_CAPACITY_MISS=1 only for diagnostic profiling.",
      );
    }

    socketsToClose.length = 0;
    socketsToClose.push(...clients);
  } finally {
    if (inputTimer) clearInterval(inputTimer);
    if (pingTimer) clearInterval(pingTimer);
    if (memoryTimer) clearInterval(memoryTimer);
    eventLoop.disable();
    await Promise.allSettled(socketsToClose.map(async (client) => await client.close()));
    await server.stop();
  }
}

await main();
