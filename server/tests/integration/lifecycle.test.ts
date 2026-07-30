import assert from "node:assert/strict";
import { test } from "node:test";
import WebSocket from "ws";

import type {
  ErrorMessage,
  ServerMessage,
  SnapshotMessage,
  WelcomeMessage,
  WorldMessage,
} from "../../src/protocol.ts";
import { ArenaRoom } from "../../src/room.ts";
import { AuthoritativeArenaServer } from "../../src/server.ts";

class TestClient {
  readonly socket: WebSocket;
  private readonly messages: ServerMessage[] = [];
  private readonly waiters: Array<{
    predicate: (message: ServerMessage) => boolean;
    resolve: (message: ServerMessage) => void;
  }> = [];

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString()) as ServerMessage;
      const waiterIndex = this.waiters.findIndex((waiter) => waiter.predicate(message));
      if (waiterIndex >= 0) {
        const [waiter] = this.waiters.splice(waiterIndex, 1);
        waiter.resolve(message);
      } else {
        this.messages.push(message);
      }
    });
  }

  static async connect(url: string): Promise<TestClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.once("open", () => resolve());
      socket.once("error", reject);
    });
    return new TestClient(socket);
  }

  send(message: unknown): void {
    this.socket.send(JSON.stringify(message));
  }

  async next<T extends ServerMessage>(
    predicate: (message: ServerMessage) => message is T,
    timeoutMs = 2_000,
  ): Promise<T> {
    const queuedIndex = this.messages.findIndex(predicate);
    if (queuedIndex >= 0) return this.messages.splice(queuedIndex, 1)[0] as T;

    return await new Promise<T>((resolve, reject) => {
      const waiter = {
        predicate,
        resolve: (message: ServerMessage) => {
          clearTimeout(timeout);
          resolve(message as T);
        },
      };
      this.waiters.push(waiter);
      const timeout = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new Error(`Timed out waiting for message; queued: ${JSON.stringify(this.messages)}`));
      }, timeoutMs);
    });
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise<void>((resolve) => this.socket.once("close", () => resolve()));
    this.socket.close();
    await closed;
  }
}

interface HealthResponse {
  rooms: number;
  connections: number;
}

const isWelcome = (message: ServerMessage): message is WelcomeMessage => message.type === "welcome";
const isSnapshot = (message: ServerMessage): message is SnapshotMessage => message.type === "snapshot";
const isWorld = (message: ServerMessage): message is WorldMessage => message.type === "world";
const isError = (code: ErrorMessage["code"]) =>
  (message: ServerMessage): message is ErrorMessage => message.type === "error" && message.code === code;

const delay = async (milliseconds: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
};

async function health(httpUrl: string): Promise<HealthResponse> {
  const response = await fetch(`${httpUrl}/healthz`);
  assert.equal(response.status, 200);
  return await response.json() as HealthResponse;
}

async function roomCount(httpUrl: string): Promise<number> {
  return (await health(httpUrl)).rooms;
}

async function waitForRoomCount(httpUrl: string, expected: number, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let observed = -1;
  while (Date.now() <= deadline) {
    observed = await roomCount(httpUrl);
    if (observed === expected) return;
    await delay(15);
  }
  assert.equal(observed, expected, `room count did not reach ${expected} before timeout`);
}

async function waitForConnectionCount(httpUrl: string, expected: number, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let observed = -1;
  while (Date.now() <= deadline) {
    observed = (await health(httpUrl)).connections;
    if (observed === expected) return;
    await delay(15);
  }
  assert.equal(observed, expected, `connection count did not reach ${expected} before timeout`);
}

function roomsOf(server: AuthoritativeArenaServer): Map<string, ArenaRoom> {
  return (server as unknown as { rooms: Map<string, ArenaRoom> }).rooms;
}

test("the final human keeps reconnect grace, then retires to a stopped and fresh room", async () => {
  let roomNowMs = 0;
  const server = new AuthoritativeArenaServer({
    host: "127.0.0.1",
    port: 0,
    targetPopulation: 4,
    targetDropCount: 32,
    fixedStepHz: 60,
    snapshotHz: 30,
    reconnectGraceMs: 250,
    now: () => roomNowMs,
  });
  const { websocketUrl, httpUrl } = await server.start();
  let activeClient: TestClient | undefined;
  let tokenProbe: TestClient | undefined;

  try {
    activeClient = await TestClient.connect(websocketUrl);
    activeClient.send({ type: "join", roomId: "retirement-proof", name: "Alice" });
    const firstWelcome = await activeClient.next(isWelcome);
    await activeClient.next(isWorld);
    await activeClient.next(isSnapshot);
    assert.equal(firstWelcome.tick, 0, "the initial transactional join starts from a fresh room tick");

    const oldRoom = roomsOf(server).get("retirement-proof");
    assert.ok(oldRoom);
    const agedBot = Object.values(oldRoom.state.players).find((player) => player.kind === "bot");
    assert.ok(agedBot);
    agedBot.stats.peakMass = 100_000;
    agedBot.stats.collectedMass = 100_000;
    agedBot.stats.kills = 1_000;
    agedBot.stats.survivalTicks = 10_000_000;

    await activeClient.close();
    activeClient = undefined;
    await waitForConnectionCount(httpUrl, 0);
    assert.equal(await roomCount(httpUrl), 1, "the room must survive inside reconnect grace");

    activeClient = await TestClient.connect(websocketUrl);
    activeClient.send({
      type: "join",
      roomId: "retirement-proof",
      name: "Alice",
      reconnectToken: firstWelcome.reconnectToken,
    });
    const reconnectWelcome = await activeClient.next(isWelcome);
    assert.equal(reconnectWelcome.reconnected, true);
    assert.equal(reconnectWelcome.playerId, firstWelcome.playerId);
    await activeClient.next(isWorld);
    const agedSnapshot = await activeClient.next(isSnapshot);
    assert.ok(
      Math.max(...agedSnapshot.players.map((player) => player.score)) > 1_000_000,
      "the reconnect receives the same deliberately aged room",
    );

    await activeClient.close();
    activeClient = undefined;
    await waitForConnectionCount(httpUrl, 0);
    assert.equal(await roomCount(httpUrl), 1, "the final disconnect must not retire before grace expires");
    roomNowMs = 251;
    await waitForRoomCount(httpUrl, 0);

    const retiredTick = oldRoom.state.tick;
    await delay(100);
    assert.equal(oldRoom.state.tick, retiredTick, "retirement stops the old room scheduler");

    activeClient = await TestClient.connect(websocketUrl);
    activeClient.send({ type: "join", roomId: "retirement-proof", name: "Fresh Alice" });
    const freshWelcome = await activeClient.next(isWelcome);
    const freshWorld = await activeClient.next(isWorld);
    const freshSnapshot = await activeClient.next(isSnapshot);
    assert.equal(freshWelcome.reconnected, false);
    assert.equal(freshWelcome.tick, 0);
    assert.equal(freshWorld.tick, 0);
    assert.equal(
      freshWorld.drops.filter((drop) => drop.specialist === "collector").length,
      1,
      "a fresh room has exactly one initial Collector beacon",
    );
    assert.equal(
      Math.max(...freshSnapshot.players.map((player) => player.score)),
      0,
      "aged bot scores do not carry into the replacement room",
    );

    tokenProbe = await TestClient.connect(websocketUrl);
    tokenProbe.send({
      type: "join",
      roomId: "retirement-proof",
      name: "Old Alice",
      reconnectToken: firstWelcome.reconnectToken,
    });
    await tokenProbe.next(isError("INVALID_RECONNECT_TOKEN"));
    await tokenProbe.close();
    tokenProbe = undefined;
    await waitForConnectionCount(httpUrl, 1);
    assert.equal(await roomCount(httpUrl), 1, "rejecting the old token does not disturb the fresh human");

    await activeClient.close();
    activeClient = undefined;
    await waitForConnectionCount(httpUrl, 0);
    roomNowMs = 502;
    await waitForRoomCount(httpUrl, 0);
  } finally {
    await tokenProbe?.close();
    await activeClient?.close();
    await server.stop();
  }
});

test("one expired human cannot retire a room that still has another human", async () => {
  let roomNowMs = 0;
  const server = new AuthoritativeArenaServer({
    host: "127.0.0.1",
    port: 0,
    targetPopulation: 4,
    targetDropCount: 24,
    fixedStepHz: 60,
    snapshotHz: 30,
    reconnectGraceMs: 180,
    now: () => roomNowMs,
  });
  const { websocketUrl, httpUrl } = await server.start();
  let alice: TestClient | undefined;
  let bob: TestClient | undefined;

  try {
    alice = await TestClient.connect(websocketUrl);
    bob = await TestClient.connect(websocketUrl);
    alice.send({ type: "join", roomId: "two-humans", name: "Alice" });
    await alice.next(isWelcome);
    await alice.next(isWorld);
    await alice.next(isSnapshot);

    bob.send({ type: "join", roomId: "two-humans", name: "Bob" });
    const bobWelcome = await bob.next(isWelcome);
    await bob.next(isWorld);
    const bobInitial = await bob.next(isSnapshot);

    await alice.close();
    alice = undefined;
    await waitForConnectionCount(httpUrl, 1);
    roomNowMs = 181;
    assert.equal(await roomCount(httpUrl), 1);
    const continuingSnapshot = await bob.next(
      (message): message is SnapshotMessage =>
        message.type === "snapshot" &&
        message.tick > bobInitial.tick &&
        !message.players.some((player) => player.name === "Alice"),
    );
    assert.ok(continuingSnapshot.players.some((player) => player.id === bobWelcome.playerId));

    await bob.close();
    bob = undefined;
    await waitForConnectionCount(httpUrl, 0);
    roomNowMs = 361;
    assert.equal(await roomCount(httpUrl), 1, "the second human also receives full reconnect grace");
    roomNowMs = 362;
    await waitForRoomCount(httpUrl, 0);
  } finally {
    await alice?.close();
    await bob?.close();
    await server.stop();
  }
});

test("invalid reconnects against unseen room ids never start or consume room capacity", async () => {
  const server = new AuthoritativeArenaServer({
    host: "127.0.0.1",
    port: 0,
    maxRooms: 1,
    targetPopulation: 2,
    targetDropCount: 16,
    fixedStepHz: 30,
    snapshotHz: 15,
    reconnectGraceMs: 100,
  });
  const { websocketUrl, httpUrl } = await server.start();
  let client: TestClient | undefined;

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      client = await TestClient.connect(websocketUrl);
      client.send({
        type: "join",
        roomId: `never-created-${attempt}`,
        name: "Imposter",
        reconnectToken: "not-a-real-token",
      });
      await client.next(isError("INVALID_RECONNECT_TOKEN"));
      assert.equal(await roomCount(httpUrl), 0);
      await client.close();
      client = undefined;
    }

    client = await TestClient.connect(websocketUrl);
    client.send({ type: "join", roomId: "real-room", name: "Valid Player" });
    const welcome = await client.next(isWelcome);
    assert.equal(welcome.reconnected, false);
    assert.equal(await roomCount(httpUrl), 1, "failed reconnects did not consume the one-room capacity");
    await client.close();
    client = undefined;
    await waitForRoomCount(httpUrl, 0);
  } finally {
    await client?.close();
    await server.stop();
  }
});
