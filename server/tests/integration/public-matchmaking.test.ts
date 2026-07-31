import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import WebSocket from "ws";

import {
  decodeSnapshotFromWire,
  type ErrorMessage,
  type ServerMessage,
  type SnapshotMessage,
  type WelcomeMessage,
} from "../../src/protocol.ts";
import { AuthoritativeArenaServer } from "../../src/server.ts";

class MatchmakingClient {
  private readonly messages: ServerMessage[] = [];

  private constructor(readonly socket: WebSocket) {
    socket.on("message", (data) => {
      const decoded = decodeSnapshotFromWire(JSON.parse(data.toString()));
      if (decoded) this.messages.push(decoded as ServerMessage);
    });
  }

  static async connect(url: string): Promise<MatchmakingClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.once("open", () => resolve());
      socket.once("error", reject);
    });
    return new MatchmakingClient(socket);
  }

  send(message: unknown): void {
    this.socket.send(JSON.stringify(message));
  }

  async next<T extends ServerMessage>(
    predicate: (message: ServerMessage) => message is T,
    timeoutMs = 2_000,
  ): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const index = this.messages.findIndex(predicate);
      if (index >= 0) return this.messages.splice(index, 1)[0] as T;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error(`Timed out waiting for message: ${JSON.stringify(this.messages)}`);
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise<void>((resolve) => this.socket.once("close", resolve));
    this.socket.close();
    await closed;
  }
}

const isWelcome = (message: ServerMessage): message is WelcomeMessage => message.type === "welcome";
const isSnapshot = (message: ServerMessage): message is SnapshotMessage => message.type === "snapshot";
const isRoomFull = (message: ServerMessage): message is ErrorMessage =>
  message.type === "error" && message.code === "ROOM_FULL";

let server: AuthoritativeArenaServer;
let websocketUrl: string;

before(async () => {
  server = new AuthoritativeArenaServer({
    host: "127.0.0.1",
    port: 0,
    targetPopulation: 2,
    maxHumanPlayers: 2,
    targetDropCount: 0,
    heatRing: false,
  });
  websocketUrl = (await server.start()).websocketUrl;
});

after(async () => server.stop());

test("public matchmaking fills one human arena before opening the next bot-backed arena", async () => {
  const first = await MatchmakingClient.connect(websocketUrl);
  const second = await MatchmakingClient.connect(websocketUrl);
  const third = await MatchmakingClient.connect(websocketUrl);

  first.send({ type: "join", roomId: "public-1", name: "One", matchmakingV1: true });
  second.send({ type: "join", roomId: "public-1", name: "Two", matchmakingV1: true });
  assert.equal((await first.next(isWelcome)).roomId, "public-1");
  assert.equal((await second.next(isWelcome)).roomId, "public-1");

  third.send({ type: "join", roomId: "public-1", name: "Three", matchmakingV1: true });
  assert.equal((await third.next(isWelcome)).roomId, "public-2");
  const thirdSnapshot = await third.next(isSnapshot);
  assert.equal(thirdSnapshot.roomId, "public-2");
  assert.equal(thirdSnapshot.players.length, 2);
  assert.equal(thirdSnapshot.players.filter((player) => player.kind === "human").length, 1);
  assert.equal(thirdSnapshot.players.filter((player) => player.kind === "bot").length, 1);

  await Promise.all([first.close(), second.close(), third.close()]);
});

test("pinned public and friend rooms never redirect", async () => {
  const pinned = await MatchmakingClient.connect(websocketUrl);
  pinned.send({ type: "join", roomId: "public-1", name: "Pinned" });
  assert.match((await pinned.next(isRoomFull)).message, /room is full/iu);

  const friend = await MatchmakingClient.connect(websocketUrl);
  friend.send({ type: "join", roomId: "crew-proof", name: "Friend", matchmakingV1: true });
  assert.equal((await friend.next(isWelcome)).roomId, "crew-proof");

  await Promise.all([pinned.close(), friend.close()]);
});
