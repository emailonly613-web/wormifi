import type {
  ActiveSpecialist,
  CollisionRadiusConfig,
  DropState,
  GameEvent,
  PlayerInput,
  Vec2,
} from "../../src/game/types.ts";

export const PROTOCOL_VERSION = 4 as const;

export interface JoinMessage {
  type: "join";
  roomId?: string;
  name?: string;
  reconnectToken?: string;
}

export interface InputMessage extends PlayerInput {
  type: "input";
}

export interface PingMessage {
  type: "ping";
  nonce?: string;
}

export type ClientMessage = JoinMessage | InputMessage | PingMessage;

export interface PublicPlayerState {
  id: string;
  name: string;
  kind: "human" | "bot";
  connected: boolean;
  alive: boolean;
  position: Vec2;
  direction: Vec2;
  body: Vec2[];
  mass: number;
  kills: number;
  score: number;
  shieldTicksRemaining: number;
  /** Server-owned timed role. Snapshot tick is the remaining-time clock. */
  specialist?: ActiveSpecialist;
}

export interface PublicDropState {
  id: string;
  position: Vec2;
  mass: number;
  radius: number;
  source: DropState["source"];
  /** Identity of the player whose boost/death produced this Echo. */
  originPlayerId?: DropState["originPlayerId"];
  /** Present only for a visible, zero-mass Specialist beacon. */
  specialist?: DropState["specialist"];
  specialistDurationTicks?: number;
}

export interface WelcomeMessage {
  type: "welcome";
  protocolVersion: typeof PROTOCOL_VERSION;
  authority: "server";
  roomId: string;
  playerId: string;
  reconnectToken: string;
  reconnected: boolean;
  tick: number;
  fixedStepSeconds: number;
  lastAcceptedSequence: number;
}

/**
 * A full world sync is sent once after every successful join/reconnect. Static
 * arena configuration and the current collectible field do not ride on every
 * high-frequency player snapshot.
 */
export interface WorldMessage {
  type: "world";
  protocolVersion: typeof PROTOCOL_VERSION;
  authority: "server";
  roomId: string;
  tick: number;
  arenaRadius: number;
  collisionRadii: CollisionRadiusConfig;
  drops: PublicDropState[];
}

export interface SnapshotMessage {
  type: "snapshot";
  protocolVersion: typeof PROTOCOL_VERSION;
  authority: "server";
  roomId: string;
  tick: number;
  serverTimeMs: number;
  players: PublicPlayerState[];
  dropUpserts: PublicDropState[];
  removedDropIds: string[];
  events: GameEvent[];
}

export interface ErrorMessage {
  type: "error";
  code:
    | "BAD_JSON"
    | "JOIN_REQUIRED"
    | "ALREADY_JOINED"
    | "INVALID_JOIN"
    | "INVALID_RECONNECT_TOKEN"
    | "TOKEN_IN_USE"
    | "MALFORMED_INPUT"
    | "UNSUPPORTED_FIELD"
    | "STALE_INPUT"
    | "RATE_LIMITED";
  message: string;
}

export interface PongMessage {
  type: "pong";
  nonce?: string;
  serverTimeMs: number;
}

export type ServerMessage =
  | WelcomeMessage
  | WorldMessage
  | SnapshotMessage
  | ErrorMessage
  | PongMessage;

const ROOM_ID_PATTERN = /^[a-z0-9-]{1,32}$/;
const MAX_NAME_LENGTH = 24;
const INPUT_KEYS = new Set(["type", "sequence", "clientTick", "direction", "boost"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteVec2(value: unknown): value is Vec2 {
  return isObject(value) &&
    typeof value.x === "number" && Number.isFinite(value.x) &&
    typeof value.y === "number" && Number.isFinite(value.y);
}

export function parseJsonMessage(raw: string):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: ErrorMessage } {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: { type: "error", code: "BAD_JSON", message: "Message must be valid JSON." },
    };
  }

  if (!isObject(value) || typeof value.type !== "string") {
    return {
      ok: false,
      error: { type: "error", code: "BAD_JSON", message: "Message must be a JSON object with a type." },
    };
  }
  return { ok: true, value };
}

export function parseJoinMessage(value: Record<string, unknown>):
  | { ok: true; value: JoinMessage }
  | { ok: false; error: ErrorMessage } {
  if (value.type !== "join") {
    return {
      ok: false,
      error: { type: "error", code: "JOIN_REQUIRED", message: "Join a room before sending gameplay messages." },
    };
  }

  const roomId = value.roomId === undefined ? "public-1" : value.roomId;
  const name = value.name === undefined ? "Guest" : value.name;
  if (
    typeof roomId !== "string" || !ROOM_ID_PATTERN.test(roomId) ||
    typeof name !== "string" || name.trim().length < 1 || name.trim().length > MAX_NAME_LENGTH ||
    (value.reconnectToken !== undefined && typeof value.reconnectToken !== "string")
  ) {
    return {
      ok: false,
      error: { type: "error", code: "INVALID_JOIN", message: "Room, name, or reconnect token is invalid." },
    };
  }

  return {
    ok: true,
    value: {
      type: "join",
      roomId,
      name: name.trim(),
      reconnectToken: value.reconnectToken,
    },
  };
}

export function parseInputMessage(value: Record<string, unknown>):
  | { ok: true; value: InputMessage }
  | { ok: false; error: ErrorMessage } {
  const unsupported = Object.keys(value).filter((key) => !INPUT_KEYS.has(key));
  if (unsupported.length > 0) {
    return {
      ok: false,
      error: {
        type: "error",
        code: "UNSUPPORTED_FIELD",
        message: `Clients may steer and boost only; unsupported field: ${unsupported[0]}.`,
      },
    };
  }

  if (
    value.type !== "input" ||
    typeof value.sequence !== "number" || !Number.isSafeInteger(value.sequence) || value.sequence < 0 ||
    (value.clientTick !== undefined &&
      (typeof value.clientTick !== "number" || !Number.isSafeInteger(value.clientTick) || value.clientTick < 0)) ||
    !isFiniteVec2(value.direction) ||
    typeof value.boost !== "boolean"
  ) {
    return {
      ok: false,
      error: { type: "error", code: "MALFORMED_INPUT", message: "Input needs a sequence, finite direction, and boost flag." },
    };
  }

  return {
    ok: true,
    value: {
      type: "input",
      sequence: value.sequence,
      clientTick: value.clientTick,
      direction: value.direction,
      boost: value.boost,
    },
  };
}
