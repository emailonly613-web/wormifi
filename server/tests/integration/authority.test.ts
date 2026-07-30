import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import WebSocket from "ws";

import type {
  ErrorMessage,
  ServerMessage,
  SnapshotMessage,
  WelcomeMessage,
  WorldMessage,
} from "../../src/protocol.ts";
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

const isWelcome = (message: ServerMessage): message is WelcomeMessage => message.type === "welcome";
const isSnapshot = (message: ServerMessage): message is SnapshotMessage => message.type === "snapshot";
const isWorld = (message: ServerMessage): message is WorldMessage => message.type === "world";
const isError = (code: ErrorMessage["code"]) =>
  (message: ServerMessage): message is ErrorMessage => message.type === "error" && message.code === code;

let server: AuthoritativeArenaServer;
let websocketUrl: string;

before(async () => {
  server = new AuthoritativeArenaServer({
    host: "127.0.0.1",
    port: 0,
    targetPopulation: 4,
    fixedStepHz: 30,
    snapshotHz: 15,
    reconnectGraceMs: 1_000,
  });
  websocketUrl = (await server.start()).websocketUrl;
});

after(async () => {
  await server.stop();
});

test("two independent clients share one server-owned arena with bot backfill and reconnect", async () => {
  const alice = await TestClient.connect(websocketUrl);
  const bob = await TestClient.connect(websocketUrl);

  alice.send({ type: "join", roomId: "proof-room", name: "Alice" });
  const aliceWelcome = await alice.next(isWelcome);
  assert.equal(aliceWelcome.authority, "server");
  assert.equal(aliceWelcome.reconnected, false);
  assert.ok(aliceWelcome.reconnectToken.length >= 24);
  const aliceWorld = await alice.next(isWorld);
  assert.ok(aliceWorld.drops.length > 0, "the one-time world sync owns the collectible field");
  const collectorBeacons = aliceWorld.drops.filter((drop) => drop.specialist === "collector");
  assert.equal(collectorBeacons.length, 1, "each authoritative room exposes one initial Collector beacon");
  assert.equal(collectorBeacons[0]?.mass, 0);
  assert.equal(collectorBeacons[0]?.originPlayerId, undefined);
  assert.ok((collectorBeacons[0]?.specialistDurationTicks ?? 0) > 0);
  assert.ok(aliceWorld.arenaRadius >= 600);
  assert.deepEqual(aliceWorld.collisionRadii, {
    baseRadius: 9,
    massRadiusFactor: 0.42,
    bodyRadiusFactor: 0.88,
  });

  bob.send({ type: "join", roomId: "proof-room", name: "Bob" });
  const bobWelcome = await bob.next(isWelcome);
  assert.notEqual(bobWelcome.playerId, aliceWelcome.playerId);

  const bothPlayers = (snapshot: ServerMessage): snapshot is SnapshotMessage =>
    snapshot.type === "snapshot" &&
    snapshot.players.some((player) => player.id === aliceWelcome.playerId) &&
    snapshot.players.some((player) => player.id === bobWelcome.playerId);
  const aliceShared = await alice.next(bothPlayers);
  const bobShared = await bob.next(bothPlayers);

  for (const snapshot of [aliceShared, bobShared]) {
    assert.equal(snapshot.authority, "server");
    assert.equal(snapshot.players.length, 4, "bots backfill the four-player proof room");
    assert.equal(snapshot.players.filter((player) => player.kind === "human").length, 2);
    assert.equal(snapshot.players.filter((player) => player.kind === "bot").length, 2);
    assert.ok(Array.isArray(snapshot.dropUpserts));
    assert.ok(Array.isArray(snapshot.removedDropIds));
  }

  const before = aliceShared.players.find((player) => player.id === aliceWelcome.playerId);
  assert.ok(before);

  alice.send({
    type: "input",
    sequence: 1,
    direction: { x: 1, y: 0 },
    boost: false,
    position: { x: 999_999_999, y: 999_999_999 },
  });
  const rejection = await alice.next(isError("UNSUPPORTED_FIELD"));
  assert.match(rejection.message, /steer and boost only/i);

  alice.send({
    type: "input",
    sequence: 2,
    clientTick: aliceShared.tick,
    direction: { x: 10_000, y: 0 },
    boost: false,
  });
  bob.send({
    type: "input",
    sequence: 1,
    clientTick: bobShared.tick,
    direction: { x: -1, y: 0 },
    boost: false,
  });

  const afterMovement = await alice.next(
    (message): message is SnapshotMessage => message.type === "snapshot" && message.tick >= aliceShared.tick + 6,
  );
  const after = afterMovement.players.find((player) => player.id === aliceWelcome.playerId);
  assert.ok(after);
  const elapsedTicks = afterMovement.tick - aliceShared.tick;
  const displacement = Math.hypot(after.position.x - before.position.x, after.position.y - before.position.y);
  const maximumServerMovement = 235 * aliceWelcome.fixedStepSeconds * elapsedTicks + 0.001;
  assert.ok(displacement <= maximumServerMovement, "movement is bounded by the server simulation speed");
  assert.ok(Math.abs(after.position.x) < 10_000 && Math.abs(after.position.y) < 10_000,
    "the forged client position never enters authoritative state");

  await alice.close();
  const aliceReconnected = await TestClient.connect(websocketUrl);
  aliceReconnected.send({
    type: "join",
    roomId: "proof-room",
    name: "Alice",
    reconnectToken: aliceWelcome.reconnectToken,
  });
  const reconnectWelcome = await aliceReconnected.next(isWelcome);
  assert.equal(reconnectWelcome.reconnected, true);
  assert.equal(reconnectWelcome.playerId, aliceWelcome.playerId);
  assert.equal(reconnectWelcome.lastAcceptedSequence, 3);
  const reconnectWorld = await aliceReconnected.next(isWorld);
  assert.equal(reconnectWorld.roomId, "proof-room");
  assert.ok(reconnectWorld.drops.length > 0);

  const rejoinedSnapshot = await aliceReconnected.next(bothPlayers);
  assert.equal(rejoinedSnapshot.players.length, 4);
  assert.equal(
    rejoinedSnapshot.players.find((player) => player.id === aliceWelcome.playerId)?.connected,
    true,
  );

  await Promise.all([bob.close(), aliceReconnected.close()]);
});

test("unknown reconnect tokens fail closed instead of creating a new player", async () => {
  const client = await TestClient.connect(websocketUrl);
  client.send({
    type: "join",
    roomId: "proof-room",
    name: "Imposter",
    reconnectToken: "not-a-real-token",
  });
  const error = await client.next(isError("INVALID_RECONNECT_TOKEN"));
  assert.match(error.message, /invalid or expired/i);
  await client.close();
});
