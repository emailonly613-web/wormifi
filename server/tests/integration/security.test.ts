import assert from "node:assert/strict";
import { test } from "node:test";
import WebSocket from "ws";

import type {
  ErrorMessage,
  PongMessage,
  ServerMessage,
  WelcomeMessage,
} from "../../src/protocol.ts";
import {
  AuthoritativeArenaServer,
  type AuthoritativeServerOptions,
  type StartedServer,
} from "../../src/server.ts";

interface CloseInfo {
  code: number;
  reason: string;
}

type MessagePredicate<T extends ServerMessage> = (message: ServerMessage) => message is T;

interface MessageWaiter {
  predicate: (message: ServerMessage) => boolean;
  resolve: (message: ServerMessage) => void;
  timer: NodeJS.Timeout;
}

class SecurityClient {
  private readonly messages: ServerMessage[] = [];
  private readonly messageWaiters: MessageWaiter[] = [];
  private closeInfo?: CloseInfo;
  private readonly closeWaiters: Array<(info: CloseInfo) => void> = [];

  private constructor(readonly socket: WebSocket) {
    socket.on("error", () => undefined);
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as ServerMessage;
      const index = this.messageWaiters.findIndex((waiter) => waiter.predicate(message));
      if (index < 0) {
        this.messages.push(message);
        return;
      }
      const [waiter] = this.messageWaiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
    });
    socket.on("close", (code, reason) => {
      this.closeInfo = { code, reason: reason.toString() };
      for (const resolve of this.closeWaiters.splice(0)) resolve(this.closeInfo);
    });
  }

  static async connect(url: string): Promise<SecurityClient> {
    const client = new SecurityClient(new WebSocket(url));
    await new Promise<void>((resolve, reject) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      const onOpen = (): void => {
        client.socket.off("error", onError);
        resolve();
      };
      const onError = (error: Error): void => {
        client.socket.off("open", onOpen);
        reject(error);
      };
      client.socket.once("open", onOpen);
      client.socket.once("error", onError);
    });
    return client;
  }

  sendJson(message: unknown): void {
    this.socket.send(JSON.stringify(message));
  }

  sendBinary(bytes: Uint8Array): void {
    this.socket.send(bytes, { binary: true });
  }

  sendRaw(message: string): void {
    this.socket.send(message);
  }

  async next<T extends ServerMessage>(predicate: MessagePredicate<T>, timeoutMs = 2_000): Promise<T> {
    const queuedIndex = this.messages.findIndex(predicate);
    if (queuedIndex >= 0) return this.messages.splice(queuedIndex, 1)[0] as T;

    return await new Promise<T>((resolve, reject) => {
      let waiter: MessageWaiter;
      const timer = setTimeout(() => {
        const index = this.messageWaiters.indexOf(waiter);
        if (index >= 0) this.messageWaiters.splice(index, 1);
        reject(new Error(`Timed out waiting for server message; queued: ${JSON.stringify(this.messages)}`));
      }, timeoutMs);
      waiter = {
        predicate,
        resolve: (message) => resolve(message as T),
        timer,
      };
      this.messageWaiters.push(waiter);
    });
  }

  async closed(timeoutMs = 2_000): Promise<CloseInfo> {
    if (this.closeInfo) return this.closeInfo;
    return await new Promise<CloseInfo>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for WebSocket close.")), timeoutMs);
      this.closeWaiters.push((info) => {
        clearTimeout(timer);
        resolve(info);
      });
    });
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    this.socket.close(1000, "test complete");
    await this.closed();
  }
}

const isWelcome = (message: ServerMessage): message is WelcomeMessage => message.type === "welcome";
const isPong = (message: ServerMessage): message is PongMessage => message.type === "pong";
const isError = (code: ErrorMessage["code"]) =>
  (message: ServerMessage): message is ErrorMessage => message.type === "error" && message.code === code;

async function withServer(
  options: AuthoritativeServerOptions,
  run: (started: StartedServer) => Promise<void>,
): Promise<void> {
  const server = new AuthoritativeArenaServer({
    host: "127.0.0.1",
    port: 0,
    targetPopulation: 0,
    targetDropCount: 0,
    fixedStepHz: 10,
    snapshotHz: 5,
    ...options,
  });
  const started = await server.start();
  try {
    await run(started);
  } finally {
    await server.stop();
  }
}

test("the global connection ceiling rejects excess sockets and recovers capacity", async () => {
  await withServer({ maxConnections: 1, joinTimeoutMs: 1_000 }, async ({ websocketUrl, httpUrl }) => {
    const first = await SecurityClient.connect(websocketUrl);
    first.sendJson({ type: "join", roomId: "capacity-room", name: "First" });
    await first.next(isWelcome);

    const excess = await SecurityClient.connect(websocketUrl);
    const capacityError = await excess.next(isError("RATE_LIMITED"));
    assert.match(capacityError.message, /connection capacity/i);
    assert.deepEqual(await excess.closed(), {
      code: 1013,
      reason: "Connection capacity reached",
    });

    const healthResponse = await fetch(`${httpUrl}/healthz`);
    const health = await healthResponse.json() as {
      ok?: boolean;
      connections?: number;
      maxConnections?: number;
    };
    assert.equal(health.ok, true);
    assert.equal(health.connections, 1);
    assert.equal(health.maxConnections, 1);

    await first.close();
    const replacement = await SecurityClient.connect(websocketUrl);
    replacement.sendJson({ type: "join", roomId: "capacity-room", name: "Replacement" });
    await replacement.next(isWelcome);
    await replacement.close();
  });
});

test("a per-socket token budget closes a message flood without stopping the server", async () => {
  await withServer({ messagesPerSecond: 1, messageBurst: 1 }, async ({ websocketUrl, httpUrl }) => {
    const client = await SecurityClient.connect(websocketUrl);
    client.sendJson({ type: "join", roomId: "budget-room", name: "Budget probe" });
    await client.next(isWelcome);

    client.sendJson({ type: "ping", nonce: "one" });
    client.sendJson({ type: "ping", nonce: "two" });
    const error = await client.next(isError("RATE_LIMITED"));
    assert.match(error.message, /message budget/i);
    assert.deepEqual(await client.closed(), {
      code: 1008,
      reason: "Message rate exceeded",
    });

    const healthResponse = await fetch(`${httpUrl}/healthz`);
    assert.equal(healthResponse.ok, true);
  });
});

test("an unjoined socket is closed when its handshake deadline expires", async () => {
  await withServer({
    joinTimeoutMs: 50,
    heartbeatIntervalMs: 25,
    idleTimeoutMs: 500,
  }, async ({ websocketUrl }) => {
    const client = await SecurityClient.connect(websocketUrl);
    const error = await client.next(isError("JOIN_REQUIRED"));
    assert.match(error.message, /handshake timed out/i);
    assert.deepEqual(await client.closed(), {
      code: 1008,
      reason: "Join handshake timed out",
    });
  });
});

test("protocol heartbeat remains healthy while application-idle sockets are retired", async () => {
  await withServer({
    joinTimeoutMs: 500,
    heartbeatIntervalMs: 25,
    idleTimeoutMs: 100,
  }, async ({ websocketUrl }) => {
    const client = await SecurityClient.connect(websocketUrl);
    client.sendJson({ type: "join", roomId: "idle-room", name: "Idle probe" });
    await client.next(isWelcome);

    assert.deepEqual(await client.closed(), {
      code: 1001,
      reason: "Application idle timeout",
    });
  });
});

test("binary and oversized payloads fail safely without taking down health checks", async () => {
  await withServer({ joinTimeoutMs: 1_000 }, async ({ websocketUrl, httpUrl }) => {
    const binaryClient = await SecurityClient.connect(websocketUrl);
    binaryClient.sendJson({ type: "join", roomId: "payload-room", name: "Binary probe" });
    await binaryClient.next(isWelcome);
    binaryClient.sendBinary(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    const binaryError = await binaryClient.next(isError("BAD_JSON"));
    assert.match(binaryError.message, /binary messages/i);
    binaryClient.sendJson({ type: "ping", nonce: "still-alive" });
    const pong = await binaryClient.next(isPong);
    assert.equal(pong.nonce, "still-alive");
    await binaryClient.close();

    const oversizedClient = await SecurityClient.connect(websocketUrl);
    oversizedClient.sendRaw("x".repeat(9 * 1024));
    const oversizedClose = await oversizedClient.closed();
    assert.equal(oversizedClose.code, 1009, "ws should close payloads above the 8 KiB boundary");

    const healthResponse = await fetch(`${httpUrl}/healthz`);
    const health = await healthResponse.json() as { ok?: boolean; authority?: string };
    assert.equal(healthResponse.ok, true);
    assert.equal(health.ok, true);
    assert.equal(health.authority, "server");
  });
});
