import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { platform, release } from "node:os";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import WebSocket, { WebSocketServer, type RawData } from "ws";

import {
  decodeSnapshotFromWire,
  PROTOCOL_VERSION,
  type ErrorMessage,
  type PongMessage,
  type ServerMessage,
  type SnapshotMessage,
  type WelcomeMessage,
  type WorldMessage,
} from "../../src/protocol.ts";
import { AuthoritativeArenaServer } from "../../src/server.ts";

const REPORT_PATH = resolve(
  process.env.WORMIFI_NETWORK_PROOF_REPORT ??
    fileURLToPath(new URL("../../proof/network/application-impairment-latest.json", import.meta.url)),
);
const INPUT_COUNT = 120;
const INPUT_INTERVAL_MS = 22;
const INTERRUPTION_MS = 400;
const PING_SAMPLES = 7;
const WAIT_MARGIN_MS = 1_500;

interface ImpairmentProfile {
  id: "rtt-100" | "rtt-200" | "rtt-350";
  targetRoundTripMs: number;
  oneWayDelayMs: number;
  oneWayJitterMs: number;
  inputDropEvery: number;
  inputReorderEvery: number;
  inputReorderExtraDelayMs: number;
  seed: number;
}

const PROFILES: readonly ImpairmentProfile[] = [
  {
    id: "rtt-100",
    targetRoundTripMs: 100,
    oneWayDelayMs: 50,
    oneWayJitterMs: 5,
    inputDropEvery: 0,
    inputReorderEvery: 0,
    inputReorderExtraDelayMs: 0,
    seed: 0x100_100,
  },
  {
    id: "rtt-200",
    targetRoundTripMs: 200,
    oneWayDelayMs: 100,
    oneWayJitterMs: 12,
    inputDropEvery: 100,
    inputReorderEvery: 20,
    inputReorderExtraDelayMs: 60,
    seed: 0x200_200,
  },
  {
    id: "rtt-350",
    targetRoundTripMs: 350,
    oneWayDelayMs: 175,
    oneWayJitterMs: 25,
    inputDropEvery: 33,
    inputReorderEvery: 10,
    inputReorderExtraDelayMs: 85,
    seed: 0x350_350,
  },
];

interface Distribution {
  count: number;
  min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
}

interface DirectionStats {
  receivedMessages: number;
  deliveredMessages: number;
  plannedDelayMs: number[];
}

interface ProxyStats {
  downstreamConnections: number;
  clientToServer: DirectionStats & {
    inputMessages: number;
    droppedInputs: number;
    injectedReorderedInputs: number;
    observedOutOfOrderInputDeliveries: number;
  };
  serverToClient: DirectionStats;
}

interface DirectionSchedule {
  lastOrderedDueAtMs: number;
  random: () => number;
}

interface ProxyConnection {
  downstream: WebSocket;
  upstream: WebSocket;
  clientSchedule: DirectionSchedule;
  serverSchedule: DirectionSchedule;
  pendingClientMessages: Array<{ data: Buffer; isBinary: boolean }>;
  timers: Set<NodeJS.Timeout>;
  inputOrdinal: number;
  lastDeliveredInputSequence?: number;
  closed: boolean;
}

interface ProfileResult {
  id: ImpairmentProfile["id"];
  configuration: {
    targetRoundTripMs: number;
    oneWayDelayMs: number;
    oneWayJitterMs: number;
    inputLossModel: string;
    inputReorderModel: string;
    seed: number;
    inputMessagesSent: number;
    interruptionMs: number;
  };
  measured: {
    initialApplicationJoinMs: Distribution;
    applicationPingRoundTripMs: Distribution;
    inputToObservedDirectionMs: number;
    initialTick: number;
    finalTick: number;
    tickProgress: number;
    reconnectApplicationMs: number;
    reconnectLastAcceptedSequence: number;
    staleInputErrorsObserved: number;
    proxy: {
      downstreamConnections: number;
      clientToServer: Omit<ProxyStats["clientToServer"], "plannedDelayMs"> & {
        plannedDelayMs: Distribution;
        scheduledButNotYetDelivered: number;
      };
      serverToClient: Omit<ProxyStats["serverToClient"], "plannedDelayMs"> & {
        plannedDelayMs: Distribution;
        scheduledButNotYetDelivered: number;
      };
    };
  };
  assertions: Record<string, true>;
}

interface ProofReport {
  schemaVersion: 1;
  verdict: "NETWORK_IMPAIRMENT_PROOF_PASS" | "NETWORK_IMPAIRMENT_PROOF_FAIL";
  claim: "non-production-application-level-websocket-impairment-proof-only";
  profiles: ProfileResult[];
  failure?: string;
  environment: {
    node: string;
    platform: string;
    release: string;
    architecture: string;
  };
  caveats: string[];
  measuredAtUtc: string;
}

type MessagePredicate<T extends ServerMessage> = (message: ServerMessage) => message is T;

interface MessageWaiter {
  predicate: (message: ServerMessage) => boolean;
  resolve: (message: ServerMessage) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function summarize(values: readonly number[]): Distribution {
  assert.ok(values.length > 0, "Cannot summarize an empty measurement set.");
  const sorted = [...values].sort((first, second) => first - second);
  const percentile = (quantile: number): number => {
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * quantile) - 1));
    return sorted[index] ?? 0;
  };
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    count: sorted.length,
    min: round(sorted[0] ?? 0),
    p50: round(percentile(0.5)),
    p95: round(percentile(0.95)),
    p99: round(percentile(0.99)),
    max: round(sorted[sorted.length - 1] ?? 0),
    mean: round(sum / sorted.length),
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function waitUntil(
  predicate: () => boolean,
  description: string,
  timeoutMs: number,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if (predicate()) return;
    await delay(20);
  }
  assert.fail(`Timed out waiting for ${description}.`);
}

function deterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function copyRawData(raw: RawData): Buffer {
  if (Array.isArray(raw)) return Buffer.concat(raw);
  if (raw instanceof ArrayBuffer) return Buffer.from(raw);
  return Buffer.from(raw);
}

function messageType(data: Buffer, isBinary: boolean): string | undefined {
  if (isBinary) return undefined;
  try {
    const parsed = JSON.parse(data.toString("utf8")) as { type?: unknown };
    return typeof parsed.type === "string" ? parsed.type : undefined;
  } catch {
    return undefined;
  }
}

function inputSequence(data: Buffer, isBinary: boolean): number | undefined {
  if (isBinary) return undefined;
  try {
    const parsed = JSON.parse(data.toString("utf8")) as { type?: unknown; sequence?: unknown };
    return parsed.type === "input" && typeof parsed.sequence === "number"
      ? parsed.sequence
      : undefined;
  } catch {
    return undefined;
  }
}

function emptyDirectionStats(): DirectionStats {
  return { receivedMessages: 0, deliveredMessages: 0, plannedDelayMs: [] };
}

class ApplicationImpairmentProxy {
  private readonly server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  private readonly connections = new Set<ProxyConnection>();
  private connectionNumber = 0;
  readonly stats: ProxyStats = {
    downstreamConnections: 0,
    clientToServer: {
      ...emptyDirectionStats(),
      inputMessages: 0,
      droppedInputs: 0,
      injectedReorderedInputs: 0,
      observedOutOfOrderInputDeliveries: 0,
    },
    serverToClient: emptyDirectionStats(),
  };

  constructor(
    private readonly upstreamUrl: string,
    private readonly profile: ImpairmentProfile,
  ) {}

  async start(): Promise<string> {
    this.server.on("connection", (downstream) => this.accept(downstream));
    this.server.on("error", () => undefined);
    if (!this.server.address()) {
      await new Promise<void>((resolveStart, rejectStart) => {
        this.server.once("listening", resolveStart);
        this.server.once("error", rejectStart);
      });
    }
    const address = this.server.address() as AddressInfo;
    return `ws://127.0.0.1:${address.port}`;
  }

  async stop(): Promise<void> {
    for (const connection of [...this.connections]) this.closeConnection(connection);
    if (this.server.clients.size > 0) {
      for (const socket of this.server.clients) socket.terminate();
    }
    await new Promise<void>((resolveStop) => this.server.close(() => resolveStop()));
  }

  private accept(downstream: WebSocket): void {
    this.connectionNumber += 1;
    this.stats.downstreamConnections += 1;
    const connectionSeed = this.profile.seed + this.connectionNumber * 0x9e37;
    const upstream = new WebSocket(this.upstreamUrl);
    const connection: ProxyConnection = {
      downstream,
      upstream,
      clientSchedule: {
        lastOrderedDueAtMs: 0,
        random: deterministicRandom(connectionSeed ^ 0xa5a5_a5a5),
      },
      serverSchedule: {
        lastOrderedDueAtMs: 0,
        random: deterministicRandom(connectionSeed ^ 0x5a5a_5a5a),
      },
      pendingClientMessages: [],
      timers: new Set(),
      inputOrdinal: 0,
      closed: false,
    };
    this.connections.add(connection);

    downstream.on("error", () => undefined);
    upstream.on("error", () => undefined);
    downstream.on("message", (raw, isBinary) => {
      const data = copyRawData(raw);
      if (upstream.readyState === WebSocket.OPEN) {
        this.scheduleClientToServer(connection, data, isBinary);
      } else if (upstream.readyState === WebSocket.CONNECTING) {
        connection.pendingClientMessages.push({ data, isBinary });
      }
    });
    upstream.on("open", () => {
      for (const pending of connection.pendingClientMessages.splice(0)) {
        this.scheduleClientToServer(connection, pending.data, pending.isBinary);
      }
    });
    upstream.on("message", (raw, isBinary) => {
      this.scheduleServerToClient(connection, copyRawData(raw), isBinary);
    });
    downstream.on("close", () => this.closeConnection(connection));
    upstream.on("close", () => this.closeConnection(connection));
  }

  private scheduleClientToServer(
    connection: ProxyConnection,
    data: Buffer,
    isBinary: boolean,
  ): void {
    this.stats.clientToServer.receivedMessages += 1;
    const kind = messageType(data, isBinary);
    let injectReorder = false;
    if (kind === "input") {
      connection.inputOrdinal += 1;
      this.stats.clientToServer.inputMessages += 1;
      if (
        this.profile.inputDropEvery > 0 &&
        connection.inputOrdinal % this.profile.inputDropEvery === 0
      ) {
        this.stats.clientToServer.droppedInputs += 1;
        return;
      }
      injectReorder =
        this.profile.inputReorderEvery > 0 &&
        connection.inputOrdinal % this.profile.inputReorderEvery === 0;
      if (injectReorder) this.stats.clientToServer.injectedReorderedInputs += 1;
    }

    this.schedule(
      connection,
      connection.clientSchedule,
      this.stats.clientToServer,
      connection.upstream,
      data,
      isBinary,
      injectReorder ? this.profile.inputReorderExtraDelayMs : 0,
      injectReorder,
      () => {
        const sequence = inputSequence(data, isBinary);
        if (sequence === undefined) return;
        if (
          connection.lastDeliveredInputSequence !== undefined &&
          sequence < connection.lastDeliveredInputSequence
        ) {
          this.stats.clientToServer.observedOutOfOrderInputDeliveries += 1;
        }
        connection.lastDeliveredInputSequence = Math.max(
          connection.lastDeliveredInputSequence ?? -1,
          sequence,
        );
      },
    );
  }

  private scheduleServerToClient(
    connection: ProxyConnection,
    data: Buffer,
    isBinary: boolean,
  ): void {
    this.stats.serverToClient.receivedMessages += 1;
    this.schedule(
      connection,
      connection.serverSchedule,
      this.stats.serverToClient,
      connection.downstream,
      data,
      isBinary,
      0,
      false,
    );
  }

  private schedule(
    connection: ProxyConnection,
    schedule: DirectionSchedule,
    stats: DirectionStats,
    destination: WebSocket,
    data: Buffer,
    isBinary: boolean,
    extraDelayMs: number,
    bypassOrderedQueue: boolean,
    onDelivery?: () => void,
  ): void {
    const jitter = (schedule.random() * 2 - 1) * this.profile.oneWayJitterMs;
    const ordinaryDelayMs = Math.max(0, this.profile.oneWayDelayMs + jitter);
    const nowMs = performance.now();
    let dueAtMs = nowMs + ordinaryDelayMs + extraDelayMs;
    if (!bypassOrderedQueue) {
      dueAtMs = Math.max(dueAtMs, schedule.lastOrderedDueAtMs + 0.01);
      schedule.lastOrderedDueAtMs = dueAtMs;
    }
    const plannedDelayMs = Math.max(0, dueAtMs - nowMs);
    stats.plannedDelayMs.push(plannedDelayMs);

    const timer = setTimeout(() => {
      connection.timers.delete(timer);
      if (connection.closed || destination.readyState !== WebSocket.OPEN) return;
      onDelivery?.();
      destination.send(data, { binary: isBinary });
      stats.deliveredMessages += 1;
    }, plannedDelayMs);
    connection.timers.add(timer);
  }

  private closeConnection(connection: ProxyConnection): void {
    if (connection.closed) return;
    connection.closed = true;
    for (const timer of connection.timers) clearTimeout(timer);
    connection.timers.clear();
    connection.pendingClientMessages.length = 0;
    if (connection.downstream.readyState !== WebSocket.CLOSED) connection.downstream.terminate();
    if (connection.upstream.readyState !== WebSocket.CLOSED) connection.upstream.terminate();
    this.connections.delete(connection);
  }
}

class ProofClient {
  private readonly messages: ServerMessage[] = [];
  private readonly waiters: MessageWaiter[] = [];
  readonly pingRoundTripMs: number[] = [];
  readonly errorCodes: ErrorMessage["code"][] = [];
  authorityViolations = 0;
  roomIsolationViolations = 0;
  humanIdentityViolations = 0;
  latestSnapshot?: SnapshotMessage;
  welcome?: WelcomeMessage;
  world?: WorldMessage;
  joinApplicationMs = 0;

  private constructor(
    readonly socket: WebSocket,
    readonly roomId: string,
    readonly expectedName: string,
  ) {
    socket.on("error", () => undefined);
    socket.on("message", (raw, isBinary) => {
      if (isBinary) return;
      let message: ServerMessage;
      try {
        const decoded = decodeSnapshotFromWire(JSON.parse(raw.toString()));
        if (decoded === null) return;
        message = decoded as ServerMessage;
      } catch {
        return;
      }
      this.inspect(message);
      const waiterIndex = this.waiters.findIndex((waiter) => waiter.predicate(message));
      if (waiterIndex >= 0) {
        const [waiter] = this.waiters.splice(waiterIndex, 1);
        if (waiter) {
          clearTimeout(waiter.timer);
          waiter.resolve(message);
        }
      } else {
        this.messages.push(message);
        if (this.messages.length > 750) this.messages.shift();
      }
    });
  }

  static async connect(
    url: string,
    roomId: string,
    name: string,
    reconnectToken?: string,
  ): Promise<ProofClient> {
    const socket = new WebSocket(url);
    const client = new ProofClient(socket, roomId, name);
    await new Promise<void>((resolveOpen, rejectOpen) => {
      const timer = setTimeout(() => rejectOpen(new Error(`Timed out opening ${name}.`)), 3_000);
      socket.once("open", () => {
        clearTimeout(timer);
        resolveOpen();
      });
      socket.once("error", (error) => {
        clearTimeout(timer);
        rejectOpen(error);
      });
    });

    const joinStartedAt = performance.now();
    socket.send(JSON.stringify({ type: "join", roomId, name, reconnectToken }));
    client.welcome = await client.next(
      (message): message is WelcomeMessage => message.type === "welcome",
      3_000,
    );
    client.joinApplicationMs = performance.now() - joinStartedAt;
    client.world = await client.next(
      (message): message is WorldMessage => message.type === "world",
      3_000,
    );
    client.latestSnapshot = await client.next(
      (message): message is SnapshotMessage => message.type === "snapshot",
      3_000,
    );
    return client;
  }

  sendInput(sequence: number, direction: { x: number; y: number }): void {
    this.socket.send(JSON.stringify({
      type: "input",
      sequence,
      clientTick: this.latestSnapshot?.tick,
      direction,
      boost: false,
    }));
  }

  async ping(nonce: string, timeoutMs: number): Promise<PongMessage> {
    const pongPromise = this.next(
      (message): message is PongMessage => message.type === "pong" && message.nonce === nonce,
      timeoutMs,
    );
    const startedAt = performance.now();
    this.socket.send(JSON.stringify({ type: "ping", nonce }));
    const pong = await pongPromise;
    this.pingRoundTripMs.push(performance.now() - startedAt);
    return pong;
  }

  next<T extends ServerMessage>(predicate: MessagePredicate<T>, timeoutMs: number): Promise<T> {
    const queuedIndex = this.messages.findIndex(predicate);
    if (queuedIndex >= 0) return Promise.resolve(this.messages.splice(queuedIndex, 1)[0] as T);

    return new Promise<T>((resolveMessage, rejectMessage) => {
      let waiter: MessageWaiter;
      const timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        rejectMessage(new Error(`Timed out waiting for ${this.expectedName} in ${this.roomId}.`));
      }, timeoutMs);
      waiter = {
        predicate,
        resolve: (message) => resolveMessage(message as T),
        reject: rejectMessage,
        timer,
      };
      this.waiters.push(waiter);
    });
  }

  async close(): Promise<void> {
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error(`${this.expectedName} closed before its awaited message arrived.`));
    }
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise<void>((resolveClose) => {
      const timer = setTimeout(() => {
        this.socket.terminate();
        resolveClose();
      }, 1_000);
      this.socket.once("close", () => {
        clearTimeout(timer);
        resolveClose();
      });
    });
    this.socket.close(1000, "network proof transition");
    await closed;
  }

  private inspect(message: ServerMessage): void {
    if (message.type === "error") this.errorCodes.push(message.code);
    if (message.type === "welcome" || message.type === "world" || message.type === "snapshot") {
      if (message.authority !== "server" || message.protocolVersion !== PROTOCOL_VERSION) {
        this.authorityViolations += 1;
      }
      if (message.roomId !== this.roomId) this.roomIsolationViolations += 1;
    }
    if (message.type === "snapshot") {
      this.latestSnapshot = message as SnapshotMessage;
      const humanNames = message.players
        .filter((player) => player.kind === "human")
        .map((player) => player.name);
      if (humanNames.some((name) => name !== this.expectedName)) {
        this.humanIdentityViolations += 1;
      }
    }
  }
}

function playerDirection(client: ProofClient, playerId: string): { x: number; y: number } | undefined {
  return client.latestSnapshot?.players.find((player) => player.id === playerId)?.direction;
}

function dot(first: { x: number; y: number }, second: { x: number; y: number }): number {
  return first.x * second.x + first.y * second.y;
}

function assertBootstrap(client: ProofClient, expectedReconnect: boolean): void {
  assert.ok(client.welcome, "welcome must arrive");
  assert.ok(client.world, "world must arrive");
  assert.ok(client.latestSnapshot, "initial snapshot must arrive");
  assert.equal(client.welcome.authority, "server");
  assert.equal(client.world.authority, "server");
  assert.equal(client.latestSnapshot.authority, "server");
  assert.equal(client.welcome.protocolVersion, PROTOCOL_VERSION);
  assert.equal(client.world.protocolVersion, PROTOCOL_VERSION);
  assert.equal(client.latestSnapshot.protocolVersion, PROTOCOL_VERSION);
  assert.equal(client.welcome.roomId, client.roomId);
  assert.equal(client.world.roomId, client.roomId);
  assert.equal(client.latestSnapshot.roomId, client.roomId);
  assert.equal(client.welcome.reconnected, expectedReconnect);
}

function proxyReport(stats: ProxyStats): ProfileResult["measured"]["proxy"] {
  return {
    downstreamConnections: stats.downstreamConnections,
    clientToServer: {
      receivedMessages: stats.clientToServer.receivedMessages,
      deliveredMessages: stats.clientToServer.deliveredMessages,
      inputMessages: stats.clientToServer.inputMessages,
      droppedInputs: stats.clientToServer.droppedInputs,
      injectedReorderedInputs: stats.clientToServer.injectedReorderedInputs,
      observedOutOfOrderInputDeliveries: stats.clientToServer.observedOutOfOrderInputDeliveries,
      scheduledButNotYetDelivered: Math.max(
        0,
        stats.clientToServer.receivedMessages -
          stats.clientToServer.droppedInputs -
          stats.clientToServer.deliveredMessages,
      ),
      plannedDelayMs: summarize(stats.clientToServer.plannedDelayMs),
    },
    serverToClient: {
      receivedMessages: stats.serverToClient.receivedMessages,
      deliveredMessages: stats.serverToClient.deliveredMessages,
      scheduledButNotYetDelivered: Math.max(
        0,
        stats.serverToClient.receivedMessages - stats.serverToClient.deliveredMessages,
      ),
      plannedDelayMs: summarize(stats.serverToClient.plannedDelayMs),
    },
  };
}

async function runProfile(profile: ImpairmentProfile): Promise<ProfileResult> {
  const server = new AuthoritativeArenaServer({
    host: "127.0.0.1",
    port: 0,
    maxRooms: 4,
    maxConnections: 12,
    targetPopulation: 0,
    targetDropCount: 0,
    arenaRadius: 8_000,
    fixedStepHz: 30,
    snapshotHz: 15,
    reconnectGraceMs: 5_000,
  });
  const startedServer = await server.start();
  const proxy = new ApplicationImpairmentProxy(startedServer.websocketUrl, profile);
  const proxyUrl = await proxy.start();
  const clientsToClose = new Set<ProofClient>();

  try {
    const roomA = `${profile.id}-room-a`;
    const roomB = `${profile.id}-room-b`;
    let alpha = await ProofClient.connect(proxyUrl, roomA, `${profile.id} Alpha`);
    const beta = await ProofClient.connect(proxyUrl, roomB, `${profile.id} Beta`);
    clientsToClose.add(alpha);
    clientsToClose.add(beta);
    assertBootstrap(alpha, false);
    assertBootstrap(beta, false);
    const initialJoinMs = [alpha.joinApplicationMs, beta.joinApplicationMs];
    const playerId = alpha.welcome?.playerId;
    const reconnectToken = alpha.welcome?.reconnectToken;
    assert.ok(playerId && reconnectToken, "initial join must provide identity and reconnect token");
    const initialTick = alpha.latestSnapshot?.tick ?? 0;
    const betaInitialTick = beta.latestSnapshot?.tick ?? 0;

    const initialDirection = playerDirection(alpha, playerId);
    assert.ok(initialDirection, "joined player must appear in the authoritative snapshot");
    const targetDirection = { x: -initialDirection.y, y: initialDirection.x };
    const inputStartedAt = performance.now();
    let inputObservedAt: number | undefined;
    for (let sequence = 1; sequence <= INPUT_COUNT; sequence += 1) {
      alpha.sendInput(sequence, targetDirection);
      await delay(INPUT_INTERVAL_MS);
      const currentDirection = playerDirection(alpha, playerId);
      if (inputObservedAt === undefined && currentDirection && dot(currentDirection, targetDirection) >= 0.8) {
        inputObservedAt = performance.now();
      }
    }

    await waitUntil(
      () => {
        const direction = playerDirection(alpha, playerId);
        if (!direction || dot(direction, targetDirection) < 0.8) return false;
        inputObservedAt ??= performance.now();
        return true;
      },
      `${profile.id} authoritative direction response`,
      profile.targetRoundTripMs + WAIT_MARGIN_MS,
    );
    assert.ok(inputObservedAt !== undefined);

    const pingTimeoutMs = profile.targetRoundTripMs + WAIT_MARGIN_MS;
    for (let sample = 0; sample < PING_SAMPLES; sample += 1) {
      const nonce = `${profile.id}-ping-${sample}`;
      const pong = await alpha.ping(nonce, pingTimeoutMs);
      assert.equal(pong.nonce, nonce);
      assert.ok(Number.isFinite(pong.serverTimeMs));
    }
    const pingDistribution = summarize(alpha.pingRoundTripMs);
    const minimumExpectedRtt = profile.targetRoundTripMs - profile.oneWayJitterMs * 2 - 25;
    const maximumExpectedRtt = profile.targetRoundTripMs + profile.oneWayJitterMs * 2 + 75;
    assert.ok(
      pingDistribution.p50 >= minimumExpectedRtt && pingDistribution.p50 <= maximumExpectedRtt,
      `${profile.id} median ping ${pingDistribution.p50} ms must approximate ${profile.targetRoundTripMs} ms RTT`,
    );

    await delay(profile.oneWayDelayMs + profile.oneWayJitterMs + profile.inputReorderExtraDelayMs + 150);
    const finalTickBeforeReconnect = alpha.latestSnapshot?.tick ?? initialTick;
    assert.ok(finalTickBeforeReconnect - initialTick >= 30, "authoritative ticks must progress under impairment");
    const oldAlpha = alpha;
    await oldAlpha.close();
    clientsToClose.delete(oldAlpha);
    await delay(INTERRUPTION_MS);

    const reconnectStartedAt = performance.now();
    alpha = await ProofClient.connect(proxyUrl, roomA, `${profile.id} Alpha`, reconnectToken);
    const reconnectApplicationMs = performance.now() - reconnectStartedAt;
    clientsToClose.add(alpha);
    assertBootstrap(alpha, true);
    assert.equal(alpha.welcome?.playerId, playerId, "reconnect must recover the same server-owned identity");
    assert.ok(
      (alpha.welcome?.lastAcceptedSequence ?? -1) > 0,
      "reconnect welcome must prove that authoritative input sequencing advanced",
    );
    const reconnectedSnapshot = alpha.latestSnapshot;
    assert.ok(reconnectedSnapshot);
    const matchingHumans = reconnectedSnapshot.players.filter(
      (player) => player.kind === "human" && player.id === playerId && player.connected,
    );
    assert.equal(matchingHumans.length, 1, "reconnect must not duplicate the player");
    assert.equal(
      reconnectedSnapshot.players.filter((player) => player.kind === "human").length,
      1,
      "reconnected room must contain exactly one human identity",
    );
    const reconnectPong = await alpha.ping(`${profile.id}-reconnect-ping`, pingTimeoutMs);
    assert.equal(reconnectPong.nonce, `${profile.id}-reconnect-ping`);

    await waitUntil(
      () => (beta.latestSnapshot?.tick ?? betaInitialTick) - betaInitialTick >= 30,
      `${profile.id} independent room tick progress`,
      profile.targetRoundTripMs + WAIT_MARGIN_MS,
    );
    const finalTick = Math.max(finalTickBeforeReconnect, alpha.latestSnapshot?.tick ?? 0);
    const allClients = [oldAlpha, alpha, beta];
    const authorityViolations = allClients.reduce((total, client) => total + client.authorityViolations, 0);
    const isolationViolations = allClients.reduce(
      (total, client) => total + client.roomIsolationViolations + client.humanIdentityViolations,
      0,
    );
    const unexpectedErrors = allClients.flatMap((client) => client.errorCodes)
      .filter((code) => code !== "STALE_INPUT");
    const staleInputErrors = allClients.flatMap((client) => client.errorCodes)
      .filter((code) => code === "STALE_INPUT").length;

    assert.equal(authorityViolations, 0, "all world state must retain server authority and protocol version");
    assert.equal(isolationViolations, 0, "messages and human identities must stay in their joined room");
    assert.deepEqual(unexpectedErrors, [], "impairment must not produce unexpected protocol errors");
    if (profile.inputDropEvery > 0) {
      assert.ok(proxy.stats.clientToServer.droppedInputs > 0, "configured input loss must be exercised");
    } else {
      assert.equal(
        proxy.stats.clientToServer.droppedInputs,
        0,
        `${profile.id} must not report dropped inputs when input loss is disabled`,
      );
    }
    if (profile.inputReorderEvery > 0) {
      assert.ok(proxy.stats.clientToServer.injectedReorderedInputs > 0, "configured reorder must be injected");
      assert.ok(
        proxy.stats.clientToServer.observedOutOfOrderInputDeliveries > 0,
        "proxy must observe actual out-of-order input delivery",
      );
      assert.ok(staleInputErrors > 0, "server must reject delayed lower-sequence input as stale");
    } else {
      assert.equal(
        proxy.stats.clientToServer.injectedReorderedInputs,
        0,
        `${profile.id} must not inject reorder when reordering is disabled`,
      );
      assert.equal(
        proxy.stats.clientToServer.observedOutOfOrderInputDeliveries,
        0,
        `${profile.id} must not observe out-of-order input delivery when reordering is disabled`,
      );
      assert.equal(
        staleInputErrors,
        0,
        `${profile.id} must not receive stale-input errors when reordering is disabled`,
      );
    }
    const healthResponse = await fetch(`${startedServer.httpUrl}/healthz`);
    const health = await healthResponse.json() as { ok?: boolean; authority?: string };
    assert.equal(healthResponse.ok, true);
    assert.equal(health.ok, true);
    assert.equal(health.authority, "server");

    return {
      id: profile.id,
      configuration: {
        targetRoundTripMs: profile.targetRoundTripMs,
        oneWayDelayMs: profile.oneWayDelayMs,
        oneWayJitterMs: profile.oneWayJitterMs,
        inputLossModel: profile.inputDropEvery > 0
          ? profile.inputDropEvery === 33
            ? "drop every 33rd client input per proxied connection"
            : `drop every ${profile.inputDropEvery}th client input per proxied connection`
          : "none",
        inputReorderModel: profile.inputReorderEvery > 0
          ? `delay every ${profile.inputReorderEvery}th client input by an additional ${profile.inputReorderExtraDelayMs} ms`
          : "none",
        seed: profile.seed,
        inputMessagesSent: INPUT_COUNT,
        interruptionMs: INTERRUPTION_MS,
      },
      measured: {
        initialApplicationJoinMs: summarize(initialJoinMs),
        applicationPingRoundTripMs: pingDistribution,
        inputToObservedDirectionMs: round(inputObservedAt - inputStartedAt),
        initialTick,
        finalTick,
        tickProgress: finalTick - initialTick,
        reconnectApplicationMs: round(reconnectApplicationMs),
        reconnectLastAcceptedSequence: alpha.welcome?.lastAcceptedSequence ?? -1,
        staleInputErrorsObserved: staleInputErrors,
        proxy: proxyReport(proxy.stats),
      },
      assertions: {
        joinCompletedThroughRealWebSockets: true,
        welcomeWorldAndSnapshotsRemainServerAuthoritative: true,
        authoritativeTicksProgressed: true,
        clientInputChangedAuthoritativeDirection: true,
        applicationPingReceivedMatchingPong: true,
        measuredPingApproximatedConfiguredRoundTrip: true,
        reconnectRecoveredSamePlayerExactlyOnce: true,
        reconnectPreservedAcceptedInputSequence: true,
        independentRoomsShowedNoCrossRoomMessagesOrHumans: true,
        serverHealthRemainedResponsive: true,
      },
    };
  } finally {
    await Promise.all([...clientsToClose].map(async (client) => client.close().catch(() => undefined)));
    await proxy.stop();
    await server.stop();
  }
}

async function main(): Promise<void> {
  const report: ProofReport = {
    schemaVersion: 1,
    verdict: "NETWORK_IMPAIRMENT_PROOF_PASS",
    claim: "non-production-application-level-websocket-impairment-proof-only",
    profiles: [],
    environment: {
      node: process.version,
      platform: platform(),
      release: release(),
      architecture: process.arch,
    },
    caveats: [
      "This is a deterministic localhost application-message impairment proof, not an OS packet shaper, WAN measurement, public capacity result, or production service-level claim.",
      "WebSocket runs over ordered TCP. Ordinary control and state messages remain ordered; deliberate reordering is restricted to client input messages to exercise the server's monotonic sequence rejection path.",
      "Input loss is injected by the proxy at the application-message boundary. It approximates missing gameplay updates but does not reproduce TCP retransmission, congestion control, head-of-line blocking, TLS termination, carrier networks, or radio handoffs.",
      "The configured RTT is symmetric planned message delay plus bounded jitter. Measured application ping includes local scheduling overhead and is asserted only inside a broad deterministic tolerance.",
      "Input-to-observed-direction measures the first authoritative snapshot whose player direction reflects the requested turn; protocol version 5 does not acknowledge every input sequence.",
      "Reconnect uses the same in-process room owner and does not prove multi-instance routing, external persistence, rolling deployment recovery, regional failover, or sticky-room infrastructure.",
      "Two isolated rooms and three downstream connections per profile prove bounded semantics only, not scale, retention, fairness, fun, or Wormate market parity.",
    ],
    measuredAtUtc: new Date().toISOString(),
  };

  try {
    for (const profile of PROFILES) {
      report.profiles.push(await runProfile(profile));
    }
  } catch (error) {
    report.verdict = "NETWORK_IMPAIRMENT_PROOF_FAIL";
    report.failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    process.exitCode = 1;
  }

  report.measuredAtUtc = new Date().toISOString();
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.info(JSON.stringify(report, null, 2));
  console.info(`\nWrote non-production network impairment proof: ${REPORT_PATH}`);
}

await main();
