import { createServer, type Server as HttpServer } from "node:http";
import { performance } from "node:perf_hooks";
import { WebSocketServer, type WebSocket } from "ws";

import {
  parseInputMessage,
  parseJoinMessage,
  parseJsonMessage,
  type ErrorMessage,
  type ServerMessage,
} from "./protocol.ts";
import { ArenaRoom, type ArenaRoomOptions } from "./room.ts";

const DEFAULT_MAX_CONNECTIONS = 256;
const DEFAULT_MESSAGES_PER_SECOND = 60;
const DEFAULT_MESSAGE_BURST = 300;
const DEFAULT_JOIN_TIMEOUT_MS = 5_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;
const DEFAULT_IDLE_TIMEOUT_MS = 45_000;
const FORCED_CLOSE_GRACE_MS = 250;

function positiveInteger(value: number | undefined, fallback: number, minimum = 1): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.floor(value));
}

function positiveNumber(value: number | undefined, fallback: number, minimum = 1): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

interface ConnectionBinding {
  room: ArenaRoom;
  session: NonNullable<ReturnType<ArenaRoom["join"]>["session"]>;
}

interface ConnectionState {
  lastMessageAtMs: number;
  messageTokens: number;
  messageBudgetUpdatedAtMs: number;
  heartbeatAlive: boolean;
  closing: boolean;
  joinTimer?: NodeJS.Timeout;
  closeTimer?: NodeJS.Timeout;
}

export interface AuthoritativeServerOptions extends ArenaRoomOptions {
  host?: string;
  port?: number;
  maxRooms?: number;
  maxConnections?: number;
  messagesPerSecond?: number;
  messageBurst?: number;
  joinTimeoutMs?: number;
  heartbeatIntervalMs?: number;
  idleTimeoutMs?: number;
}

export interface StartedServer {
  host: string;
  port: number;
  httpUrl: string;
  websocketUrl: string;
}

export class AuthoritativeArenaServer {
  private readonly host: string;
  private readonly port: number;
  private readonly maxRooms: number;
  private readonly maxConnections: number;
  private readonly messagesPerSecond: number;
  private readonly messageBurst: number;
  private readonly joinTimeoutMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly idleTimeoutMs: number;
  private readonly roomOptions: ArenaRoomOptions;
  private readonly rooms = new Map<string, ArenaRoom>();
  private readonly bindings = new Map<WebSocket, ConnectionBinding>();
  private readonly connections = new Map<WebSocket, ConnectionState>();
  private httpServer?: HttpServer;
  private websocketServer?: WebSocketServer;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(options: AuthoritativeServerOptions = {}) {
    this.host = options.host ?? "127.0.0.1";
    this.port = options.port ?? 0;
    this.maxRooms = positiveInteger(options.maxRooms, 32);
    this.maxConnections = positiveInteger(options.maxConnections, DEFAULT_MAX_CONNECTIONS);
    this.messagesPerSecond = positiveNumber(options.messagesPerSecond, DEFAULT_MESSAGES_PER_SECOND);
    this.messageBurst = positiveInteger(options.messageBurst, DEFAULT_MESSAGE_BURST);
    this.joinTimeoutMs = positiveInteger(options.joinTimeoutMs, DEFAULT_JOIN_TIMEOUT_MS, 25);
    this.heartbeatIntervalMs = positiveInteger(
      options.heartbeatIntervalMs,
      DEFAULT_HEARTBEAT_INTERVAL_MS,
      25,
    );
    this.idleTimeoutMs = Math.max(
      this.heartbeatIntervalMs * 2,
      positiveInteger(options.idleTimeoutMs, DEFAULT_IDLE_TIMEOUT_MS, 50),
    );
    this.roomOptions = {
      targetPopulation: options.targetPopulation,
      fixedStepHz: options.fixedStepHz,
      snapshotHz: options.snapshotHz,
      reconnectGraceMs: options.reconnectGraceMs,
      arenaRadius: options.arenaRadius,
      targetDropCount: options.targetDropCount,
      now: options.now,
    };
  }

  async start(): Promise<StartedServer> {
    if (this.httpServer) throw new Error("Server has already started.");

    this.httpServer = createServer((request, response) => {
      if (request.url === "/healthz") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({
          ok: true,
          authority: "server",
          rooms: this.rooms.size,
          connections: this.connections.size,
          maxConnections: this.maxConnections,
        }));
        return;
      }
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: false }));
    });
    this.httpServer.on("clientError", (_error, socket) => {
      if (socket.writable) {
        socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
      } else {
        socket.destroy();
      }
    });
    this.websocketServer = new WebSocketServer({ server: this.httpServer, maxPayload: 8 * 1024 });
    this.websocketServer.on("connection", (socket) => this.handleConnection(socket));
    // A listener is required because transport-level server errors are otherwise
    // emitted as uncaught EventEmitter errors. Per-socket failures are handled
    // separately and never stop the process.
    this.websocketServer.on("error", () => undefined);

    await new Promise<void>((resolve, reject) => {
      const server = this.httpServer;
      if (!server) {
        reject(new Error("HTTP server was not created."));
        return;
      }
      const onError = (error: Error): void => reject(error);
      server.once("error", onError);
      server.listen(this.port, this.host, () => {
        server.off("error", onError);
        resolve();
      });
    });

    this.heartbeatTimer = setInterval(() => this.sweepConnections(), this.heartbeatIntervalMs);
    this.heartbeatTimer.unref();

    const address = this.httpServer.address();
    if (!address || typeof address === "string") throw new Error("Server did not expose a TCP address.");
    return {
      host: this.host,
      port: address.port,
      httpUrl: `http://${this.host}:${address.port}`,
      websocketUrl: `ws://${this.host}:${address.port}`,
    };
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;

    for (const room of this.rooms.values()) room.stop();
    this.rooms.clear();

    if (this.websocketServer) {
      for (const socket of this.websocketServer.clients) this.safeClose(socket, 1001, "Server stopped");
      await new Promise<void>((resolve) => this.websocketServer?.close(() => resolve()));
    }
    if (this.httpServer?.listening) {
      await new Promise<void>((resolve, reject) => {
        this.httpServer?.close((error) => error ? reject(error) : resolve());
      });
    }
    for (const state of this.connections.values()) {
      if (state.joinTimer) clearTimeout(state.joinTimer);
      if (state.closeTimer) clearTimeout(state.closeTimer);
    }
    this.connections.clear();
    this.bindings.clear();
    this.websocketServer = undefined;
    this.httpServer = undefined;
  }

  private handleConnection(socket: WebSocket): void {
    socket.on("error", () => this.handleSocketError(socket));

    if (this.connections.size >= this.maxConnections) {
      this.send(socket, {
        type: "error",
        code: "RATE_LIMITED",
        message: "Connection capacity is temporarily full.",
      });
      this.safeClose(socket, 1013, "Connection capacity reached");
      return;
    }

    const connectedAtMs = performance.now();
    const state: ConnectionState = {
      lastMessageAtMs: connectedAtMs,
      messageTokens: this.messageBurst,
      messageBudgetUpdatedAtMs: connectedAtMs,
      heartbeatAlive: true,
      closing: false,
    };
    this.connections.set(socket, state);
    state.joinTimer = setTimeout(() => {
      if (this.bindings.has(socket) || state.closing) return;
      this.send(socket, {
        type: "error",
        code: "JOIN_REQUIRED",
        message: "The join handshake timed out.",
      });
      this.safeClose(socket, 1008, "Join handshake timed out");
    }, this.joinTimeoutMs);
    state.joinTimer.unref();

    socket.on("message", (data, isBinary) => {
      if (state.closing) return;
      const now = performance.now();
      if (!this.consumeMessageToken(state, now)) {
        this.send(socket, {
          type: "error",
          code: "RATE_LIMITED",
          message: "This connection exceeded its message budget.",
        });
        this.safeClose(socket, 1008, "Message rate exceeded");
        return;
      }
      state.lastMessageAtMs = now;
      state.heartbeatAlive = true;

      if (isBinary) {
        this.send(socket, { type: "error", code: "BAD_JSON", message: "Binary messages are not supported." });
        return;
      }
      try {
        this.handleMessage(socket, data.toString());
      } catch {
        this.safeClose(socket, 1011, "Server message handling failed");
      }
    });
    socket.on("pong", () => {
      state.heartbeatAlive = true;
    });
    socket.on("close", () => this.cleanupConnection(socket));
  }

  private handleMessage(socket: WebSocket, raw: string): void {
    const parsed = parseJsonMessage(raw);
    if (!parsed.ok) {
      this.send(socket, parsed.error);
      return;
    }

    const binding = this.bindings.get(socket);
    if (!binding) {
      const join = parseJoinMessage(parsed.value);
      if (!join.ok) {
        this.send(socket, join.error);
        return;
      }

      let room = this.rooms.get(join.value.roomId ?? "public-1");
      if (!room) {
        if (this.rooms.size >= this.maxRooms) {
          this.send(socket, { type: "error", code: "RATE_LIMITED", message: "Room capacity is temporarily full." });
          return;
        }
        room = new ArenaRoom(join.value.roomId ?? "public-1", this.roomOptions);
        room.start();
        this.rooms.set(room.id, room);
      }

      const result = room.join(socket, join.value);
      if (result.error || !result.session) {
        this.send(socket, result.error ?? {
          type: "error", code: "INVALID_JOIN", message: "Unable to join the room.",
        });
        return;
      }
      this.bindings.set(socket, { room, session: result.session });
      const state = this.connections.get(socket);
      if (state?.joinTimer) clearTimeout(state.joinTimer);
      if (state) state.joinTimer = undefined;
      return;
    }

    if (parsed.value.type === "join") {
      this.send(socket, { type: "error", code: "ALREADY_JOINED", message: "This socket already joined a room." });
      return;
    }
    if (parsed.value.type === "ping") {
      const nonce = typeof parsed.value.nonce === "string" ? parsed.value.nonce.slice(0, 64) : undefined;
      binding.room.send(binding.session, { type: "pong", nonce, serverTimeMs: Date.now() });
      return;
    }

    const input = parseInputMessage(parsed.value);
    if (!input.ok) {
      binding.room.send(binding.session, input.error);
      return;
    }
    const error = binding.room.acceptInput(binding.session, input.value);
    if (error) binding.room.send(binding.session, error);
  }

  private send(socket: WebSocket, message: ServerMessage | ErrorMessage): void {
    if (socket.readyState !== socket.OPEN) return;
    try {
      socket.send(JSON.stringify(message));
    } catch {
      this.handleSocketError(socket);
    }
  }

  private consumeMessageToken(state: ConnectionState, now: number): boolean {
    const elapsedMs = Math.max(0, now - state.messageBudgetUpdatedAtMs);
    state.messageBudgetUpdatedAtMs = now;
    state.messageTokens = Math.min(
      this.messageBurst,
      state.messageTokens + elapsedMs * this.messagesPerSecond / 1_000,
    );
    if (state.messageTokens < 1) return false;
    state.messageTokens -= 1;
    return true;
  }

  private sweepConnections(): void {
    const now = performance.now();
    for (const [socket, state] of this.connections) {
      if (state.closing) continue;
      if (socket.readyState === socket.CLOSED) {
        this.cleanupConnection(socket);
        continue;
      }
      if (socket.readyState !== socket.OPEN) continue;

      if (now - state.lastMessageAtMs >= this.idleTimeoutMs) {
        this.safeClose(socket, 1001, "Application idle timeout");
        continue;
      }
      if (!state.heartbeatAlive) {
        this.terminateConnection(socket);
        continue;
      }

      state.heartbeatAlive = false;
      try {
        // WebSocket protocol pings are proxy-safe and browser clients answer
        // them automatically; they do not depend on forwarded IP headers.
        socket.ping();
      } catch {
        this.handleSocketError(socket);
      }
    }
  }

  private handleSocketError(socket: WebSocket): void {
    const state = this.connections.get(socket);
    if (state) state.closing = true;
    if (socket.readyState === socket.OPEN) {
      this.safeClose(socket, 1011, "WebSocket transport failed");
      return;
    }
    if (socket.readyState !== socket.CLOSED) this.scheduleForcedTermination(socket);
  }

  private safeClose(socket: WebSocket, code: number, reason: string): void {
    const state = this.connections.get(socket);
    if (state?.closing && state.closeTimer) return;
    if (state) state.closing = true;

    if (socket.readyState === socket.CLOSED) {
      this.cleanupConnection(socket);
      return;
    }
    if (socket.readyState === socket.OPEN) {
      try {
        socket.close(code, reason);
      } catch {
        this.terminateConnection(socket);
        return;
      }
    }
    this.scheduleForcedTermination(socket);
  }

  private scheduleForcedTermination(socket: WebSocket): void {
    const state = this.connections.get(socket);
    if (state?.closeTimer) return;
    const timer = setTimeout(() => {
      if (socket.readyState !== socket.CLOSED) this.terminateConnection(socket);
    }, FORCED_CLOSE_GRACE_MS);
    timer.unref();
    if (state) state.closeTimer = timer;
  }

  private terminateConnection(socket: WebSocket): void {
    try {
      socket.terminate();
    } finally {
      this.cleanupConnection(socket);
    }
  }

  private cleanupConnection(socket: WebSocket): void {
    const state = this.connections.get(socket);
    if (state?.joinTimer) clearTimeout(state.joinTimer);
    if (state?.closeTimer) clearTimeout(state.closeTimer);

    const binding = this.bindings.get(socket);
    if (binding) binding.room.disconnect(binding.session, socket);
    this.bindings.delete(socket);
    this.connections.delete(socket);
  }
}
