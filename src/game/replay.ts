import type {
  GameEvent,
  GameState,
  PlayerId,
  PlayerKind,
  Vec2,
} from "./types";

const DEFAULT_WINDOW_SECONDS = 12;
const DEFAULT_HIGHLIGHT_SECONDS = 6;
const HIGHLIGHT_LEAD_SECONDS = 4;
const MAX_CHALLENGE_TOKEN_LENGTH = 2_048;
const MAX_CHALLENGE_JSON_BYTES = 1_024;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type ChallengeMode = "live" | "rush" | "practice" | "private";
export type ChallengeMetric = "score" | "mass" | "survivalMs" | "eliminations";
export type HighlightReason = "elimination" | "death" | "personalPeak";

export interface PlayerLookMetadata {
  coreId: string;
  followerId: string;
  trailId: string;
  paletteId?: string;
}

export interface ChallengeTarget {
  metric: ChallengeMetric;
  value: number;
  playerId?: PlayerId;
}

export interface ChallengePayloadInput {
  seed: string | number;
  mode: ChallengeMode;
  target: ChallengeTarget;
  playerLook: PlayerLookMetadata;
}

export interface ChallengePayload extends ChallengePayloadInput {
  version: 1;
}

export type ChallengeParseError =
  | "empty"
  | "too_long"
  | "invalid_encoding"
  | "invalid_json"
  | "invalid_schema";

export type ChallengeParseResult =
  | { ok: true; value: ChallengePayload }
  | { ok: false; error: ChallengeParseError };

export interface ReplayPlayerSnapshot {
  id: PlayerId;
  name: string;
  kind: PlayerKind;
  position: Vec2;
  direction: Vec2;
  body: Vec2[];
  mass: number;
  alive: boolean;
  shieldTicksRemaining: number;
  look?: PlayerLookMetadata;
}

export interface ReplaySnapshot {
  tick: number;
  timeSeconds: number;
  players: ReplayPlayerSnapshot[];
}

export interface TimedReplayEvent {
  timeSeconds: number;
  event: GameEvent;
}

export interface ReplayHighlight {
  reason: HighlightReason;
  playerId: PlayerId;
  rivalId?: PlayerId;
  peakMass?: number;
  anchorTick: number;
  anchorTimeSeconds: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  snapshots: ReplaySnapshot[];
  events: TimedReplayEvent[];
}

interface CompactChallengePayload {
  v: 1;
  s: string | number;
  m: ChallengeMode;
  t: [ChallengeMetric, number, PlayerId?];
  l: [string, string, string, string?];
}

function cloneVec(vector: Vec2): Vec2 {
  return { x: vector.x, y: vector.y };
}

function cloneLook(look: PlayerLookMetadata | undefined): PlayerLookMetadata | undefined {
  return look ? { ...look } : undefined;
}

function cloneSnapshot(snapshot: ReplaySnapshot): ReplaySnapshot {
  return {
    tick: snapshot.tick,
    timeSeconds: snapshot.timeSeconds,
    players: snapshot.players.map((player) => ({
      ...player,
      position: cloneVec(player.position),
      direction: cloneVec(player.direction),
      body: player.body.map(cloneVec),
      look: cloneLook(player.look),
    })),
  };
}

function cloneTimedEvent(event: TimedReplayEvent): TimedReplayEvent {
  return { timeSeconds: event.timeSeconds, event: { ...event.event } };
}

export function createReplaySnapshot(
  state: GameState,
  playerLooks: Readonly<Partial<Record<PlayerId, PlayerLookMetadata>>> = {},
): ReplaySnapshot {
  return {
    tick: state.tick,
    timeSeconds: state.tick * state.config.fixedStepSeconds,
    players: Object.values(state.players)
      .sort((first, second) => first.id.localeCompare(second.id))
      .map((player) => ({
        id: player.id,
        name: player.name,
        kind: player.kind,
        position: cloneVec(player.position),
        direction: cloneVec(player.direction),
        body: player.body.map(cloneVec),
        mass: player.mass,
        alive: player.alive,
        shieldTicksRemaining: player.shieldTicksRemaining,
        look: cloneLook(playerLooks[player.id]),
      })),
  };
}

function highlightBounds(
  anchor: number,
  availableStart: number,
  availableEnd: number,
  duration: number,
): { start: number; end: number } {
  const availableDuration = Math.max(0, availableEnd - availableStart);
  const actualDuration = Math.min(duration, availableDuration);
  let start = anchor - Math.min(HIGHLIGHT_LEAD_SECONDS, actualDuration);
  let end = start + actualDuration;

  if (start < availableStart) {
    start = availableStart;
    end = start + actualDuration;
  }
  if (end > availableEnd) {
    end = availableEnd;
    start = end - actualDuration;
  }

  return { start, end };
}

export class RollingReplayBuffer {
  readonly windowSeconds: number;
  readonly highlightSeconds: number;
  private snapshots: ReplaySnapshot[] = [];
  private events: TimedReplayEvent[] = [];

  constructor(
    windowSeconds = DEFAULT_WINDOW_SECONDS,
    highlightSeconds = DEFAULT_HIGHLIGHT_SECONDS,
  ) {
    if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) {
      throw new Error("windowSeconds must be a positive finite number");
    }
    if (
      !Number.isFinite(highlightSeconds) ||
      highlightSeconds <= 0 ||
      highlightSeconds > windowSeconds
    ) {
      throw new Error("highlightSeconds must be positive and no longer than the window");
    }
    this.windowSeconds = windowSeconds;
    this.highlightSeconds = highlightSeconds;
  }

  record(snapshot: ReplaySnapshot, events: readonly GameEvent[] = []): void {
    if (
      !Number.isSafeInteger(snapshot.tick) ||
      snapshot.tick < 0 ||
      !Number.isFinite(snapshot.timeSeconds) ||
      snapshot.timeSeconds < 0
    ) {
      throw new Error("Replay snapshots require a valid tick and time");
    }

    const previous = this.snapshots.at(-1);
    if (
      previous &&
      (snapshot.tick <= previous.tick || snapshot.timeSeconds <= previous.timeSeconds)
    ) {
      throw new Error("Replay snapshots must be recorded in strictly increasing order");
    }

    for (const event of events) {
      if (event.tick !== snapshot.tick) {
        throw new Error("Replay events must match the snapshot tick they accompany");
      }
    }

    this.snapshots.push(cloneSnapshot(snapshot));
    for (const event of events) {
      this.events.push({ timeSeconds: snapshot.timeSeconds, event: { ...event } });
    }

    const cutoff = snapshot.timeSeconds - this.windowSeconds;
    this.snapshots = this.snapshots.filter(
      (recorded) => recorded.timeSeconds >= cutoff,
    );
    this.events = this.events.filter((recorded) => recorded.timeSeconds >= cutoff);
  }

  clear(): void {
    this.snapshots = [];
    this.events = [];
  }

  getSnapshots(): ReplaySnapshot[] {
    return this.snapshots.map(cloneSnapshot);
  }

  getEvents(): TimedReplayEvent[] {
    return this.events.map(cloneTimedEvent);
  }

  getHighlights(playerId: PlayerId): ReplayHighlight[] {
    if (this.snapshots.length === 0) return [];

    const elimination = [...this.events]
      .reverse()
      .find(
        ({ event }) =>
          event.type === "playerDied" && event.killerId === playerId,
      );
    const death = [...this.events]
      .reverse()
      .find(
        ({ event }) =>
          event.type === "playerDied" && event.playerId === playerId,
      );

    let peakSnapshot: ReplaySnapshot | undefined;
    let peakMass = -Infinity;
    for (const snapshot of this.snapshots) {
      const player = snapshot.players.find((candidate) => candidate.id === playerId);
      if (player && player.mass > peakMass) {
        peakMass = player.mass;
        peakSnapshot = snapshot;
      }
    }

    const highlights: ReplayHighlight[] = [];
    if (elimination && elimination.event.type === "playerDied") {
      highlights.push(
        this.buildHighlight(
          "elimination",
          playerId,
          elimination.event.tick,
          elimination.timeSeconds,
          elimination.event.playerId,
        ),
      );
    }
    if (death && death.event.type === "playerDied") {
      highlights.push(
        this.buildHighlight(
          "death",
          playerId,
          death.event.tick,
          death.timeSeconds,
          death.event.killerId,
        ),
      );
    }
    if (peakSnapshot && Number.isFinite(peakMass)) {
      highlights.push(
        this.buildHighlight(
          "personalPeak",
          playerId,
          peakSnapshot.tick,
          peakSnapshot.timeSeconds,
          undefined,
          peakMass,
        ),
      );
    }

    return highlights;
  }

  selectHighlight(playerId: PlayerId): ReplayHighlight | null {
    return this.getHighlights(playerId)[0] ?? null;
  }

  private buildHighlight(
    reason: HighlightReason,
    playerId: PlayerId,
    anchorTick: number,
    anchorTimeSeconds: number,
    rivalId?: PlayerId,
    peakMass?: number,
  ): ReplayHighlight {
    const availableStart = this.snapshots[0].timeSeconds;
    const availableEnd = this.snapshots.at(-1)?.timeSeconds ?? availableStart;
    const bounds = highlightBounds(
      anchorTimeSeconds,
      availableStart,
      availableEnd,
      this.highlightSeconds,
    );

    return {
      reason,
      playerId,
      rivalId,
      peakMass,
      anchorTick,
      anchorTimeSeconds,
      startTimeSeconds: bounds.start,
      endTimeSeconds: bounds.end,
      snapshots: this.snapshots
        .filter(
          (snapshot) =>
            snapshot.timeSeconds >= bounds.start && snapshot.timeSeconds <= bounds.end,
        )
        .map(cloneSnapshot),
      events: this.events
        .filter(
          (event) =>
            event.timeSeconds >= bounds.start && event.timeSeconds <= bounds.end,
        )
        .map(cloneTimedEvent),
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeIdentifier(value: unknown, maximumLength = 64): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= maximumLength &&
    ID_PATTERN.test(value)
  );
}

function isValidSeed(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isSafeInteger(value);
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 128 &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function isChallengeMode(value: unknown): value is ChallengeMode {
  return value === "live" || value === "rush" || value === "practice" || value === "private";
}

function isChallengeMetric(value: unknown): value is ChallengeMetric {
  return (
    value === "score" ||
    value === "mass" ||
    value === "survivalMs" ||
    value === "eliminations"
  );
}

function validateCompactPayload(value: unknown): ChallengePayload | null {
  if (!isRecord(value) || value.v !== 1) return null;
  if (!isValidSeed(value.s) || !isChallengeMode(value.m)) return null;
  if (!Array.isArray(value.t) || (value.t.length !== 2 && value.t.length !== 3)) {
    return null;
  }
  if (!isChallengeMetric(value.t[0])) return null;
  if (
    typeof value.t[1] !== "number" ||
    !Number.isSafeInteger(value.t[1]) ||
    value.t[1] < 0 ||
    value.t[1] > 1_000_000_000
  ) {
    return null;
  }
  if (value.t[2] !== undefined && !isSafeIdentifier(value.t[2], 80)) return null;

  if (!Array.isArray(value.l) || (value.l.length !== 3 && value.l.length !== 4)) {
    return null;
  }
  if (
    !isSafeIdentifier(value.l[0]) ||
    !isSafeIdentifier(value.l[1]) ||
    !isSafeIdentifier(value.l[2]) ||
    (value.l[3] !== undefined && !isSafeIdentifier(value.l[3]))
  ) {
    return null;
  }

  return {
    version: 1,
    seed: value.s,
    mode: value.m,
    target: {
      metric: value.t[0],
      value: value.t[1],
      playerId: value.t[2],
    },
    playerLook: {
      coreId: value.l[0],
      followerId: value.l[1],
      trailId: value.l[2],
      paletteId: value.l[3],
    },
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlToBytes(token: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(token) || token.length % 4 === 1) return null;
  const standard = token.replaceAll("-", "+").replaceAll("_", "/");
  const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4);

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function toCompactPayload(payload: ChallengePayloadInput): CompactChallengePayload {
  const target: CompactChallengePayload["t"] = payload.target.playerId
    ? [payload.target.metric, payload.target.value, payload.target.playerId]
    : [payload.target.metric, payload.target.value];
  const look: CompactChallengePayload["l"] = payload.playerLook.paletteId
    ? [
        payload.playerLook.coreId,
        payload.playerLook.followerId,
        payload.playerLook.trailId,
        payload.playerLook.paletteId,
      ]
    : [
        payload.playerLook.coreId,
        payload.playerLook.followerId,
        payload.playerLook.trailId,
      ];
  return { v: 1, s: payload.seed, m: payload.mode, t: target, l: look };
}

export function serializeChallengePayload(payload: ChallengePayloadInput): string {
  const compact = toCompactPayload(payload);
  if (!validateCompactPayload(compact)) {
    throw new Error("Cannot serialize an invalid challenge payload");
  }

  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  if (bytes.byteLength > MAX_CHALLENGE_JSON_BYTES) {
    throw new Error("Challenge payload exceeds the size limit");
  }
  return bytesToBase64Url(bytes);
}

export function parseChallengePayload(token: string): ChallengeParseResult {
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, error: "empty" };
  }
  if (token.length > MAX_CHALLENGE_TOKEN_LENGTH) {
    return { ok: false, error: "too_long" };
  }

  const bytes = base64UrlToBytes(token);
  if (!bytes || bytes.byteLength > MAX_CHALLENGE_JSON_BYTES) {
    return { ok: false, error: "invalid_encoding" };
  }

  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, error: "invalid_encoding" };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(decoded) as unknown;
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  const validated = validateCompactPayload(raw);
  return validated
    ? { ok: true, value: validated }
    : { ok: false, error: "invalid_schema" };
}
