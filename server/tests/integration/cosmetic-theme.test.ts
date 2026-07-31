import assert from "node:assert/strict";
import { test } from "node:test";
import WebSocket from "ws";

import {
  decodeSnapshotFromWire,
  parseJoinMessage,
  type ErrorMessage,
  type ServerMessage,
  type SnapshotMessage,
  type WelcomeMessage,
} from "../../src/protocol.ts";
import { AuthoritativeArenaServer } from "../../src/server.ts";

class ThemeClient {
  readonly socket: WebSocket;
  private readonly queued: ServerMessage[] = [];
  private readonly waiters: Array<{
    predicate: (message: ServerMessage) => boolean;
    resolve: (message: ServerMessage) => void;
  }> = [];

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.on("message", (data) => {
      const decoded = decodeSnapshotFromWire(JSON.parse(data.toString()));
      if (decoded === null) return;
      const message = decoded as ServerMessage;
      const waiterIndex = this.waiters.findIndex((waiter) => waiter.predicate(message));
      if (waiterIndex < 0) {
        this.queued.push(message);
        return;
      }
      const [waiter] = this.waiters.splice(waiterIndex, 1);
      waiter.resolve(message);
    });
  }

  static async connect(url: string): Promise<ThemeClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.once("open", () => resolve());
      socket.once("error", reject);
    });
    return new ThemeClient(socket);
  }

  send(message: unknown): void {
    this.socket.send(JSON.stringify(message));
  }

  async next<T extends ServerMessage>(
    predicate: (message: ServerMessage) => message is T,
    timeoutMs = 3_000,
  ): Promise<T> {
    const queuedIndex = this.queued.findIndex(predicate);
    if (queuedIndex >= 0) return this.queued.splice(queuedIndex, 1)[0] as T;
    return await new Promise<T>((resolve, reject) => {
      let timeout: NodeJS.Timeout;
      const waiter = {
        predicate,
        resolve: (message: ServerMessage) => {
          clearTimeout(timeout);
          resolve(message as T);
        },
      };
      this.waiters.push(waiter);
      timeout = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new Error(`Timed out waiting for theme proof; queued: ${JSON.stringify(this.queued)}`));
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

const isWelcome = (message: ServerMessage): message is WelcomeMessage =>
  message.type === "welcome";
const isError = (message: ServerMessage): message is ErrorMessage =>
  message.type === "error";

test("join parsing accepts only catalog theme IDs and rejects every photo or unknown field", () => {
  const valid = parseJoinMessage({
    type: "join",
    roomId: "theme-proof",
    name: "Anne",
    themeId: "sunken-crown",
  });
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.value.themeId, "sunken-crown");

  const presenceCapable = parseJoinMessage({
    type: "join",
    roomId: "theme-proof",
    name: "Current Browser",
    presenceV1: true,
  });
  assert.equal(presenceCapable.ok, true);
  if (presenceCapable.ok) assert.equal(presenceCapable.value.presenceV1, true);

  const matchmakingCapable = parseJoinMessage({
    type: "join",
    roomId: "public-1",
    name: "Current Browser",
    matchmakingV1: true,
  });
  assert.equal(matchmakingCapable.ok, true);
  if (matchmakingCapable.ok) assert.equal(matchmakingCapable.value.matchmakingV1, true);

  const invalidPresenceCapability = parseJoinMessage({
    type: "join",
    roomId: "theme-proof",
    name: "Forged Browser",
    presenceV1: false,
  });
  assert.equal(invalidPresenceCapability.ok, false);
  if (!invalidPresenceCapability.ok) assert.equal(invalidPresenceCapability.error.code, "INVALID_JOIN");

  const invalidMatchmakingCapability = parseJoinMessage({
    type: "join",
    roomId: "public-1",
    name: "Forged Browser",
    matchmakingV1: false,
  });
  assert.equal(invalidMatchmakingCapability.ok, false);
  if (!invalidMatchmakingCapability.ok) {
    assert.equal(invalidMatchmakingCapability.error.code, "INVALID_JOIN");
  }

  for (const field of ["photo", "photos", "dataUrl", "renderPlan", "unknownField"]) {
    const rejected = parseJoinMessage({
      type: "join",
      roomId: "theme-proof",
      name: "Mallory",
      themeId: "coral-signal",
      [field]: field === "dataUrl" ? "data:image/webp;base64,private" : ["private"],
    });
    assert.equal(rejected.ok, false, `${field} must not enter a join`);
    if (!rejected.ok) {
      assert.equal(rejected.error.code, "UNSUPPORTED_FIELD");
      assert.match(rejected.error.message, new RegExp(field, "u"));
    }
  }

  const dataAsTheme = parseJoinMessage({
    type: "join",
    roomId: "theme-proof",
    name: "Mallory",
    themeId: "data:image/webp;base64,private",
  });
  assert.equal(dataAsTheme.ok, false);
  if (!dataAsTheme.ok) assert.equal(dataAsTheme.error.code, "INVALID_JOIN");
});

test("two clients see authored theme IDs only and reconnect may update that public ID", async () => {
  const server = new AuthoritativeArenaServer({
    targetPopulation: 3,
    targetDropCount: 0,
    heatRing: false,
    snapshotHz: 30,
  });
  const started = await server.start();
  const clients: ThemeClient[] = [];

  try {
    const rejected = await ThemeClient.connect(started.websocketUrl);
    clients.push(rejected);
    rejected.send({
      type: "join",
      roomId: "theme-proof",
      name: "No Photos",
      themeId: "coral-signal",
      photos: [{ dataUrl: "data:image/webp;base64,private" }],
    });
    const rejection = await rejected.next(isError);
    assert.equal(rejection.code, "UNSUPPORTED_FIELD");
    assert.match(rejection.message, /photos/u);

    const alice = await ThemeClient.connect(started.websocketUrl);
    const bob = await ThemeClient.connect(started.websocketUrl);
    clients.push(alice, bob);
    alice.send({
      type: "join",
      roomId: "theme-proof",
      name: "Alice",
      themeId: "sunken-crown",
    });
    const aliceWelcome = await alice.next(isWelcome);

    bob.send({
      type: "join",
      roomId: "theme-proof",
      name: "Bob",
      themeId: "coral-signal",
    });
    const bobWelcome = await bob.next(isWelcome);

    const bothThemes = (message: ServerMessage): message is SnapshotMessage => {
      if (message.type !== "snapshot") return false;
      const alicePlayer = message.players.find((player) => player.id === aliceWelcome.playerId);
      const bobPlayer = message.players.find((player) => player.id === bobWelcome.playerId);
      return alicePlayer?.themeId === "sunken-crown" && bobPlayer?.themeId === "coral-signal";
    };
    const [aliceSnapshot, bobSnapshot] = await Promise.all([
      alice.next(bothThemes),
      bob.next(bothThemes),
    ]);

    for (const snapshot of [aliceSnapshot, bobSnapshot]) {
      const humans = snapshot.players.filter((player) => player.kind === "human");
      const bots = snapshot.players.filter((player) => player.kind === "bot");
      assert.deepEqual(
        humans.map((player) => player.themeId).sort(),
        ["coral-signal", "sunken-crown"],
      );
      for (const player of humans) {
        assert.deepEqual(
          Object.keys(player).filter((key) => /photo|dataurl|renderplan/iu.test(key)),
          [],
        );
      }
      assert.doesNotMatch(JSON.stringify(humans), /data:image|dataUrl|photos|renderPlan/iu);
      assert.equal(bots.length, 1);
      assert.equal(bots[0]?.themeId, undefined, "bots retain their varied non-theme palette mapping");
    }

    await alice.close();
    const aliceReconnected = await ThemeClient.connect(started.websocketUrl);
    clients.push(aliceReconnected);
    aliceReconnected.send({
      type: "join",
      roomId: "theme-proof",
      name: "Alice",
      reconnectToken: aliceWelcome.reconnectToken,
      themeId: "tideglass-corsair",
    });
    const reconnectWelcome = await aliceReconnected.next(isWelcome);
    assert.equal(reconnectWelcome.reconnected, true);
    assert.equal(reconnectWelcome.playerId, aliceWelcome.playerId);

    const updatedTheme = (message: ServerMessage): message is SnapshotMessage =>
      message.type === "snapshot" &&
      message.players.find((player) => player.id === aliceWelcome.playerId)?.themeId ===
        "tideglass-corsair";
    const [reconnectedSnapshot, observerSnapshot] = await Promise.all([
      aliceReconnected.next(updatedTheme),
      bob.next(updatedTheme),
    ]);
    assert.equal(
      reconnectedSnapshot.players.find((player) => player.id === aliceWelcome.playerId)?.themeId,
      "tideglass-corsair",
    );
    assert.equal(
      observerSnapshot.players.find((player) => player.id === aliceWelcome.playerId)?.themeId,
      "tideglass-corsair",
    );
  } finally {
    await Promise.all(clients.map((client) => client.close().catch(() => undefined)));
    await server.stop();
  }
});
