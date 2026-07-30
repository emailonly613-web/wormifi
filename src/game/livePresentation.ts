import type { PublicPlayerState, SnapshotMessage } from "../../server/src/protocol";
import type { Vec2 } from "./types";

const MIN_INTERVAL_MS = 40;
const MAX_INTERVAL_MS = 125;
const SNAP_GAP_MS = 220;
const TELEPORT_DISTANCE = 420;

export interface LivePresentationBuffer {
  previous: SnapshotMessage | null;
  previousPlayersById: ReadonlyMap<string, PublicPlayerState>;
  latest: SnapshotMessage | null;
  latestReceivedAtMs: number;
  intervalMs: number;
}

export function createLivePresentationBuffer(): LivePresentationBuffer {
  return {
    previous: null,
    previousPlayersById: new Map(),
    latest: null,
    latestReceivedAtMs: 0,
    intervalMs: 1_000 / 15,
  };
}

export function resetLivePresentationBuffer(buffer: LivePresentationBuffer): void {
  buffer.previous = null;
  buffer.previousPlayersById = new Map();
  buffer.latest = null;
  buffer.latestReceivedAtMs = 0;
  buffer.intervalMs = 1_000 / 15;
}

export function pushAuthoritativeSnapshot(
  buffer: LivePresentationBuffer,
  snapshot: SnapshotMessage,
  receivedAtMs: number,
  fixedStepSeconds: number,
): void {
  const prior = buffer.latest;
  const sameTimeline = prior !== null &&
    prior.roomId === snapshot.roomId &&
    snapshot.tick > prior.tick;
  const tickGap = sameTimeline ? snapshot.tick - prior.tick : 0;
  const authoritativeGapMs = tickGap * fixedStepSeconds * 1_000;
  const canBlend = sameTimeline && authoritativeGapMs <= SNAP_GAP_MS;

  buffer.previous = canBlend ? prior : null;
  buffer.previousPlayersById = canBlend && prior
    ? new Map(prior.players.map((player) => [player.id, player]))
    : new Map();
  buffer.latest = snapshot;
  buffer.latestReceivedAtMs = receivedAtMs;
  buffer.intervalMs = canBlend
    ? clamp(authoritativeGapMs, MIN_INTERVAL_MS, MAX_INTERVAL_MS)
    : 1_000 / 15;
}

export function getPresentedSnapshot(
  buffer: Readonly<LivePresentationBuffer>,
  nowMs: number,
): SnapshotMessage | null {
  const latest = buffer.latest;
  const previous = buffer.previous;
  if (!latest || !previous) return latest;
  const alpha = clamp(
    (nowMs - buffer.latestReceivedAtMs) / Math.max(1, buffer.intervalMs),
    0,
    1,
  );
  if (alpha >= 1) return latest;

  return {
    ...latest,
    players: latest.players.map((player) =>
      interpolatePlayer(buffer.previousPlayersById.get(player.id), player, alpha),
    ),
  };
}

function interpolatePlayer(
  previous: PublicPlayerState | undefined,
  latest: PublicPlayerState,
  alpha: number,
): PublicPlayerState {
  if (
    !previous ||
    !previous.alive ||
    !latest.alive ||
    Math.hypot(
      latest.position.x - previous.position.x,
      latest.position.y - previous.position.y,
    ) > TELEPORT_DISTANCE
  ) {
    return latest;
  }

  const priorTail = previous.body.at(-1) ?? previous.position;
  return {
    ...latest,
    position: lerpVec(previous.position, latest.position, alpha),
    direction: normalizedLerp(previous.direction, latest.direction, alpha),
    body: latest.body.map((target, index) =>
      lerpVec(previous.body[index] ?? priorTail, target, alpha),
    ),
    mass: lerp(previous.mass, latest.mass, alpha),
  };
}

function normalizedLerp(first: Vec2, second: Vec2, alpha: number): Vec2 {
  const mixed = lerpVec(first, second, alpha);
  const length = Math.hypot(mixed.x, mixed.y);
  if (length < 1e-9) return { ...second };
  return { x: mixed.x / length, y: mixed.y / length };
}

function lerpVec(first: Vec2, second: Vec2, alpha: number): Vec2 {
  return {
    x: lerp(first.x, second.x, alpha),
    y: lerp(first.y, second.y, alpha),
  };
}

function lerp(first: number, second: number, alpha: number): number {
  return first + (second - first) * alpha;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
