import type {
  ActiveSpecialist,
  ChargingStationConfig,
  ChargingStationState,
  CollisionRadiusConfig,
  DropState,
  GameEvent,
  PlayerInput,
  Vec2,
} from "../../src/game/types.ts";
import {
  isCosmeticThemeId,
  type CosmeticThemeId,
} from "../../src/game/cosmeticThemes.ts";
import type { GamePaceId } from "../../src/game/gamePace.ts";

export const PROTOCOL_VERSION = 5 as const;
export const MAX_PACKED_BODY_SEGMENTS = 72;
/**
 * Backward-compatible public identity for a compacted Echo bank containing
 * more than one producer. It can never equal a real human-* or bot-* id.
 */
export const MIXED_ECHO_ORIGIN_ID = "echo-cache:mixed" as const;
const BODY_QUANTIZATION = 4;
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export interface JoinMessage {
  type: "join";
  roomId?: string;
  name?: string;
  reconnectToken?: string;
  /** Applied only when creating a new room; existing rooms keep their board. */
  boardId?: string;
  /** Applied only when creating a new room; existing rooms keep their pace. */
  paceId?: GamePaceId;
  /** Public-safe authored appearance only. Local photos are never a wire field. */
  themeId?: CosmeticThemeId;
  /** Opt-in capability: client can merge compact full-room presence with nearby bodies. */
  presenceV1?: true;
  /** Opt-in public matchmaking. Shared and manually entered rooms never set this. */
  matchmakingV1?: true;
  /** Opt-in compact nearby-player tuples. Cached v5 clients retain object snapshots. */
  snapshotTupleV1?: true;
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
  /** Server-confirmed active sprint, distinct from unfulfilled button intent. */
  boosting?: boolean;
  /** Catalog ID only; never a photo, data URL, filename, or local render plan. */
  themeId?: CosmeticThemeId;
  /** Server-owned timed role. Snapshot tick is the remaining-time clock. */
  specialist?: ActiveSpecialist;
}

/**
 * Low-frequency room-wide truth used by the radar, rank, and honest population
 * counter. Full animated body paths stay in the nearby SnapshotMessage stream.
 */
export type PublicPlayerPresence = Pick<
  PublicPlayerState,
  | "id"
  | "name"
  | "kind"
  | "connected"
  | "alive"
  | "position"
  | "mass"
  | "kills"
  | "score"
>;

export interface PublicDropState {
  id: string;
  position: Vec2;
  mass: number;
  radius: number;
  source: DropState["source"];
  /** Additive lifecycle metadata for neutral treasure phase-in/out. */
  spawnedAtTick?: number;
  expiresAtTick?: number;
  /**
   * Identity of the producer. Mixed caches use MIXED_ECHO_ORIGIN_ID so older
   * protocol-v5 clients keep the conserved pickup visible without granting it
   * to any real player.
   */
  originPlayerId?: DropState["originPlayerId"];
  /** True only when this visible Echo represents mass from multiple players. */
  mixedOrigin?: true;
  /** Present only for a visible, zero-mass Specialist beacon. */
  specialist?: DropState["specialist"];
  specialistDurationTicks?: number;
  /**
   * Additive protocol-v5 Relic fields. Older clients ignore these and retain
   * the safe Collector/ordinary-ground fallback without rejecting the frame.
   */
  relicKind?: DropState["relicKind"];
  relicDurationTicks?: number;
  /** Present only for a Gilded Ledger ground item. */
  relicTier?: DropState["relicTier"];
}

export interface PublicBoardState {
  id: string;
  name: string;
  chargingStations: ChargingStationConfig[];
}

export interface PublicPaceState {
  id: GamePaceId;
  name: string;
  baseSpeed: number;
  boostSpeed: number;
}

export type PublicChargingStationState = ChargingStationState;

/** Server-authored onboarding encounter; both participants remain ordinary bots. */
export interface PublicHeatRingState {
  phase: "active";
  theme: "corsair";
  center: Vec2;
  radius: number;
  /** No Heat Ring solid begins inside this disk around the first human. */
  safeSpawnRadius: number;
  botIds: readonly [string, string];
  startsAtTick: number;
  reverseAtTick: number;
  earliestResolveTick: number;
  deadlineTick: number;
}

export type HeatRingAbortReason =
  | "second-human"
  | "first-human-disconnected"
  | "unsafe-state"
  | "early-death"
  | "interrupted"
  | "timeout";

export type HeatRingEvent =
  | {
      type: "heatRingStarted";
      tick: number;
      heatRing: PublicHeatRingState;
    }
  | {
      type: "heatRingResolved";
      tick: number;
      botIds: readonly [string, string];
      /** Ordinary collision winner; additive for older protocol-v5 clients. */
      winnerId?: string;
      /** The one defeated participant whose real drops form the hoard. */
      defeatedId?: string;
      /** IDs of the real death drops still present in this authoritative frame. */
      dropIds: string[];
      /** Sum of those exact drops, not a presentation estimate. */
      totalMass: number;
    }
  | {
      type: "heatRingAborted";
      tick: number;
      botIds: readonly [string, string];
      reason: HeatRingAbortReason;
    };

export type AuthoritativeEvent = GameEvent | HeatRingEvent;

export interface WelcomeMessage {
  type: "welcome";
  protocolVersion: typeof PROTOCOL_VERSION;
  /** Exact deployment Git revision when the host provides it. Older servers
   * may omit this additive field, so clients must still gate on protocolVersion. */
  buildRevision?: string;
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
  /** Static board landmarks. Present on every real server world sync. */
  board?: PublicBoardState;
  /** Room-wide movement rule selected by the first successful join. */
  pace?: PublicPaceState;
  /** Present only while the fresh-room first-human encounter is active. */
  heatRing?: PublicHeatRingState;
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
  events: AuthoritativeEvent[];
  /** Dynamic progress/cooldown truth for board charging landmarks. */
  chargingStations?: PublicChargingStationState[];
  /**
   * The RECIPIENT'S own stacking Treasure Multiplier chips as
   * [tier, remainingSeconds] pairs. Per-recipient, additive: absent when no
   * boost is running; old clients ignore the extra key.
   */
  boosts?: Array<[number, number]>;
}

export interface PresenceMessage {
  type: "presence";
  protocolVersion: typeof PROTOCOL_VERSION;
  authority: "server";
  roomId: string;
  tick: number;
  players: PublicPlayerPresence[];
}

/** Compact wire-only shape. Game/client code always consumes SnapshotMessage. */
export interface PackedPublicPlayerState extends Omit<PublicPlayerState, "body"> {
  /** Int16 little-endian x/y offsets from the head, quantized to 1/4 unit. */
  bodyQ4: string;
}

/** Compact wire-only nearby player; decoded clients still consume PublicPlayerState. */
export type PackedPublicPlayerTuple = readonly [
  id: string,
  name: string,
  kind: 0 | 1,
  flags: number,
  x: number,
  y: number,
  directionX: number,
  directionY: number,
  bodyQ4: string,
  mass: number,
  kills: number,
  score: number,
  shieldTicksRemaining: number,
  themeId: CosmeticThemeId | null,
  specialist: ActiveSpecialist | null,
];

export interface PackedSnapshotMessage extends Omit<SnapshotMessage, "players"> {
  players: Array<PackedPublicPlayerState | PackedPublicPlayerTuple>;
}

/**
 * id, name, kind flag, connected/alive flags, q4 x/y, q10 mass, kills, score.
 * Tuple keys keep a complete 200-seat room comfortably below one full-body
 * snapshot while retaining deterministic, server-owned competitive truth.
 */
export type PackedPlayerPresence = readonly [
  id: string,
  name: string,
  kind: 0 | 1,
  flags: number,
  xQ4: number,
  yQ4: number,
  massQ10: number,
  kills: number,
  score: number,
];

export interface PackedPresenceMessage extends Omit<PresenceMessage, "players"> {
  players: PackedPlayerPresence[];
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
    | "ROOM_FULL"
    | "UNKNOWN_BOARD"
    | "ROOM_BOARD_MISMATCH"
    | "UNKNOWN_PACE"
    | "ROOM_PACE_MISMATCH"
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
  | PresenceMessage
  | SnapshotMessage
  | ErrorMessage
  | PongMessage;

const ROOM_ID_PATTERN = /^[a-z0-9-]{1,32}$/;
const MAX_NAME_LENGTH = 24;
const JOIN_KEYS = new Set([
  "type",
  "roomId",
  "name",
  "reconnectToken",
  "boardId",
  "paceId",
  "themeId",
  "presenceV1",
  "matchmakingV1",
  "snapshotTupleV1",
]);
const INPUT_KEYS = new Set(["type", "sequence", "clientTick", "direction", "boost"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteVec2(value: unknown): value is Vec2 {
  return isObject(value) &&
    typeof value.x === "number" && Number.isFinite(value.x) &&
    typeof value.y === "number" && Number.isFinite(value.y);
}

export function packSnapshotForWire(snapshot: SnapshotMessage): PackedSnapshotMessage {
  return {
    ...snapshot,
    players: snapshot.players.map(packPublicPlayerForWire),
  };
}

export function packPublicPlayerForWire(player: PublicPlayerState): PackedPublicPlayerState {
  const { body, ...publicPlayer } = player;
  return {
    ...publicPlayer,
    bodyQ4: packBodyQ4(player.position, body),
  };
}

export function packPublicPlayerTupleForWire(
  player: PublicPlayerState,
): PackedPublicPlayerTuple {
  return [
    player.id,
    player.name,
    player.kind === "human" ? 1 : 0,
    (player.connected ? 1 : 0) |
      (player.alive ? 2 : 0) |
      (player.boosting ? 4 : 0),
    player.position.x,
    player.position.y,
    player.direction.x,
    player.direction.y,
    packBodyQ4(player.position, player.body),
    player.mass,
    player.kills,
    player.score,
    player.shieldTicksRemaining,
    player.themeId ?? null,
    player.specialist ?? null,
  ];
}

export function packSnapshotTupleForWire(
  snapshot: SnapshotMessage,
  packedPlayersById?: ReadonlyMap<string, PackedPublicPlayerTuple>,
): PackedSnapshotMessage {
  return {
    ...snapshot,
    players: snapshot.players.map((player) =>
      packedPlayersById?.get(player.id) ?? packPublicPlayerTupleForWire(player)
    ),
  };
}

export function packPresenceForWire(presence: PresenceMessage): PackedPresenceMessage {
  return {
    ...presence,
    players: presence.players.map((player) => [
      player.id,
      player.name,
      player.kind === "human" ? 1 : 0,
      (player.connected ? 1 : 0) | (player.alive ? 2 : 0),
      Math.round(player.position.x * BODY_QUANTIZATION),
      Math.round(player.position.y * BODY_QUANTIZATION),
      Math.round(player.mass * 10),
      player.kills,
      player.score,
    ]),
  };
}

/**
 * Decodes protocol-v5 packed paths. Decoded in-process/mock snapshots are also
 * accepted so tests and replay fixtures use the same validation path.
 */
export function decodeSnapshotFromWire(value: unknown): unknown | null {
  if (isObject(value) && value.type === "presence" && Array.isArray(value.players)) {
    try {
      const players = value.players.map((candidate): PublicPlayerPresence => {
        if (
          isObject(candidate) &&
          typeof candidate.id === "string" &&
          typeof candidate.name === "string" &&
          (candidate.kind === "human" || candidate.kind === "bot") &&
          typeof candidate.connected === "boolean" &&
          typeof candidate.alive === "boolean" &&
          isFiniteVec2(candidate.position) &&
          typeof candidate.mass === "number" && Number.isFinite(candidate.mass) &&
          typeof candidate.kills === "number" && Number.isFinite(candidate.kills) &&
          typeof candidate.score === "number" && Number.isFinite(candidate.score)
        ) {
          return candidate as unknown as PublicPlayerPresence;
        }
        if (!Array.isArray(candidate) || candidate.length !== 9) {
          throw new Error("Packed presence player must be a nine-item tuple");
        }
        const [id, name, kind, flags, xQ4, yQ4, massQ10, kills, score] = candidate;
        if (
          typeof id !== "string" ||
          typeof name !== "string" ||
          (kind !== 0 && kind !== 1) ||
          !Number.isSafeInteger(flags) ||
          !Number.isSafeInteger(xQ4) ||
          !Number.isSafeInteger(yQ4) ||
          !Number.isSafeInteger(massQ10) ||
          !Number.isSafeInteger(kills) ||
          !Number.isFinite(score)
        ) {
          throw new Error("Packed presence player is invalid");
        }
        return {
          id,
          name,
          kind: kind === 1 ? "human" : "bot",
          connected: (flags & 1) !== 0,
          alive: (flags & 2) !== 0,
          position: {
            x: xQ4 / BODY_QUANTIZATION,
            y: yQ4 / BODY_QUANTIZATION,
          },
          mass: massQ10 / 10,
          kills,
          score,
        };
      });
      return { ...value, players };
    } catch {
      return null;
    }
  }
  if (!isObject(value) || value.type !== "snapshot" || !Array.isArray(value.players)) {
    return value;
  }
  try {
    const players = value.players.map((candidate) => {
      if (Array.isArray(candidate)) {
        if (candidate.length !== 15) throw new Error("Packed snapshot player tuple length is invalid");
        const [
          id,
          name,
          kind,
          flags,
          x,
          y,
          directionX,
          directionY,
          bodyQ4,
          mass,
          kills,
          score,
          shieldTicksRemaining,
          themeId,
          specialist,
        ] = candidate;
        if (
          typeof id !== "string" ||
          typeof name !== "string" ||
          (kind !== 0 && kind !== 1) ||
          !Number.isSafeInteger(flags) || flags < 0 || flags > 7 ||
          !Number.isFinite(x) || !Number.isFinite(y) ||
          !Number.isFinite(directionX) || !Number.isFinite(directionY) ||
          typeof bodyQ4 !== "string" ||
          !Number.isFinite(mass) ||
          !Number.isSafeInteger(kills) ||
          !Number.isFinite(score) ||
          !Number.isSafeInteger(shieldTicksRemaining) ||
          (themeId !== null && !isCosmeticThemeId(themeId)) ||
          (specialist !== null && !isObject(specialist))
        ) {
          throw new Error("Packed snapshot player tuple is invalid");
        }
        const position = { x: x as number, y: y as number };
        return {
          id,
          name,
          kind: kind === 1 ? "human" as const : "bot" as const,
          connected: (flags & 1) !== 0,
          alive: (flags & 2) !== 0,
          position,
          direction: { x: directionX as number, y: directionY as number },
          body: unpackBodyQ4(position, bodyQ4),
          mass: mass as number,
          kills: kills as number,
          score: score as number,
          shieldTicksRemaining: shieldTicksRemaining as number,
          boosting: (flags & 4) !== 0,
          themeId: themeId ?? undefined,
          specialist: (specialist as ActiveSpecialist | null) ?? undefined,
        } satisfies PublicPlayerState;
      }
      if (!isObject(candidate)) throw new Error("Packed player must be an object");
      if (Array.isArray(candidate.body)) return candidate;
      if (typeof candidate.bodyQ4 !== "string" || !isFiniteVec2(candidate.position)) {
        throw new Error("Packed player body is missing");
      }
      const { bodyQ4, ...player } = candidate;
      return {
        ...player,
        body: unpackBodyQ4(candidate.position, bodyQ4),
      };
    });
    return { ...value, players };
  } catch {
    return null;
  }
}

function packBodyQ4(head: Vec2, body: readonly Vec2[]): string {
  if (body.length > MAX_PACKED_BODY_SEGMENTS) {
    throw new Error(`Body exceeds ${MAX_PACKED_BODY_SEGMENTS} packed segments`);
  }
  const bytes = new Uint8Array(body.length * 4);
  const view = new DataView(bytes.buffer);
  body.forEach((segment, index) => {
    const x = Math.round((segment.x - head.x) * BODY_QUANTIZATION);
    const y = Math.round((segment.y - head.y) * BODY_QUANTIZATION);
    if (
      !Number.isFinite(x) || !Number.isFinite(y) ||
      x < -32_768 || x > 32_767 || y < -32_768 || y > 32_767
    ) {
      throw new Error("Body path exceeds q4 Int16 range");
    }
    view.setInt16(index * 4, x, true);
    view.setInt16(index * 4 + 2, y, true);
  });
  return encodeBase64(bytes);
}

function unpackBodyQ4(head: Vec2, encoded: string): Vec2[] {
  const bytes = decodeBase64(encoded);
  if (bytes.length % 4 !== 0 || bytes.length / 4 > MAX_PACKED_BODY_SEGMENTS) {
    throw new Error("Packed body length is invalid");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const body: Vec2[] = [];
  for (let offset = 0; offset < bytes.length; offset += 4) {
    body.push({
      x: head.x + view.getInt16(offset, true) / BODY_QUANTIZATION,
      y: head.y + view.getInt16(offset + 2, true) / BODY_QUANTIZATION,
    });
  }
  return body;
}

function encodeBase64(bytes: Uint8Array): string {
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const bits = (first << 16) | (second << 8) | third;
    encoded += BASE64_ALPHABET[(bits >>> 18) & 63];
    encoded += BASE64_ALPHABET[(bits >>> 12) & 63];
    encoded += index + 1 < bytes.length ? BASE64_ALPHABET[(bits >>> 6) & 63] : "=";
    encoded += index + 2 < bytes.length ? BASE64_ALPHABET[bits & 63] : "=";
  }
  return encoded;
}

function decodeBase64(encoded: string): Uint8Array {
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(encoded)) {
    throw new Error("Packed body is not canonical base64");
  }
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array(encoded.length / 4 * 3 - padding);
  let output = 0;
  for (let index = 0; index < encoded.length; index += 4) {
    const values = [0, 1, 2, 3].map((offset) => {
      const character = encoded[index + offset];
      return character === "=" ? 0 : BASE64_ALPHABET.indexOf(character);
    });
    if (values.some((entry) => entry < 0)) throw new Error("Packed body base64 is invalid");
    const bits = (values[0] << 18) | (values[1] << 12) | (values[2] << 6) | values[3];
    if (output < bytes.length) bytes[output++] = (bits >>> 16) & 255;
    if (output < bytes.length) bytes[output++] = (bits >>> 8) & 255;
    if (output < bytes.length) bytes[output++] = bits & 255;
  }
  return bytes;
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

  const unsupported = Object.keys(value).filter((key) => !JOIN_KEYS.has(key));
  if (unsupported.length > 0) {
    return {
      ok: false,
      error: {
        type: "error",
        code: "UNSUPPORTED_FIELD",
        message: `Join accepts room identity and an authored theme ID only; unsupported field: ${unsupported[0]}.`,
      },
    };
  }

  const roomId = value.roomId === undefined ? "public-1" : value.roomId;
  const name = value.name === undefined ? "Guest" : value.name;
  const themeId = value.themeId;
  if (
    typeof roomId !== "string" || !ROOM_ID_PATTERN.test(roomId) ||
    typeof name !== "string" || name.trim().length < 1 || name.trim().length > MAX_NAME_LENGTH ||
    (value.reconnectToken !== undefined && typeof value.reconnectToken !== "string") ||
    (value.boardId !== undefined &&
      (typeof value.boardId !== "string" || !ROOM_ID_PATTERN.test(value.boardId))) ||
    (value.paceId !== undefined &&
      (typeof value.paceId !== "string" || !ROOM_ID_PATTERN.test(value.paceId))) ||
    (themeId !== undefined && !isCosmeticThemeId(themeId)) ||
    (value.presenceV1 !== undefined && value.presenceV1 !== true) ||
    (value.matchmakingV1 !== undefined && value.matchmakingV1 !== true) ||
    (value.snapshotTupleV1 !== undefined && value.snapshotTupleV1 !== true)
  ) {
    return {
      ok: false,
      error: { type: "error", code: "INVALID_JOIN", message: "Room, name, reconnect token, board, pace, or authored theme is invalid." },
    };
  }

  return {
    ok: true,
    value: {
      type: "join",
      roomId,
      name: name.trim(),
      reconnectToken: value.reconnectToken,
      boardId: value.boardId as string | undefined,
      paceId: value.paceId as GamePaceId | undefined,
      themeId: themeId as CosmeticThemeId | undefined,
      presenceV1: value.presenceV1 as true | undefined,
      matchmakingV1: value.matchmakingV1 as true | undefined,
      snapshotTupleV1: value.snapshotTupleV1 as true | undefined,
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
