import type { PublicPlayerState, SnapshotMessage } from "../../server/src/protocol";
import type { Vec2 } from "./types";

const MIN_INTERVAL_MS = 40;
const MAX_INTERVAL_MS = 160;
const SNAP_GAP_MS = 220;
const TELEPORT_DISTANCE = 420;
const PRESENTATION_HEADROOM = 1.5;
const LOCAL_RESPONSE_HALF_LIFE_MS = 42;
export const LOCAL_PREDICTION_HORIZON_MS = 180;

export interface LocalPresentationOptions {
  playerId: string;
  direction: Readonly<Vec2>;
  baseSpeed: number;
  boostSpeed: number;
  arenaRadius?: number;
  headRadius?: number;
  bodyRadius?: number;
}

interface LocalPredictionState {
  playerId?: string;
  position: Vec2;
  direction: Vec2;
  initialized: boolean;
  lastFrameAtMs?: number;
  lastAuthoritativeTick?: number;
}

export interface LivePresentationBuffer {
  previous: SnapshotMessage | null;
  previousPlayersById: ReadonlyMap<string, PublicPlayerState>;
  latest: SnapshotMessage | null;
  latestReceivedAtMs: number;
  intervalMs: number;
  localPrediction: LocalPredictionState;
}

export function createLivePresentationBuffer(): LivePresentationBuffer {
  return {
    previous: null,
    previousPlayersById: new Map(),
    latest: null,
    latestReceivedAtMs: 0,
    intervalMs: 1_000 / 15,
    localPrediction: createLocalPredictionState(),
  };
}

export function resetLivePresentationBuffer(buffer: LivePresentationBuffer): void {
  buffer.previous = null;
  buffer.previousPlayersById = new Map();
  buffer.latest = null;
  buffer.latestReceivedAtMs = 0;
  buffer.intervalMs = 1_000 / 15;
  buffer.localPrediction = createLocalPredictionState();
}

export function pushAuthoritativeSnapshot(
  buffer: LivePresentationBuffer,
  snapshot: SnapshotMessage,
  receivedAtMs: number,
  fixedStepSeconds: number,
): void {
  const prior = buffer.latest;
  const priorReceivedAtMs = buffer.latestReceivedAtMs;
  const sameTimeline = prior !== null &&
    prior.roomId === snapshot.roomId &&
    snapshot.tick > prior.tick;
  const tickGap = sameTimeline ? snapshot.tick - prior.tick : 0;
  const authoritativeGapMs = tickGap * fixedStepSeconds * 1_000;
  const canBlend = sameTimeline && authoritativeGapMs <= SNAP_GAP_MS;
  // Preserve the exact pose already on screen when a new packet arrives.
  // Restarting from the last raw authority snapshot creates a visible jump
  // whenever delivery is a little early or late, even though every server tick
  // arrived correctly.
  const presentedAtArrival = canBlend
    ? getPresentedSnapshot(buffer, receivedAtMs)
    : null;
  const observedGapMs = canBlend
    ? Math.max(0, receivedAtMs - priorReceivedAtMs)
    : 0;

  buffer.previous = canBlend ? (presentedAtArrival ?? prior) : null;
  buffer.previousPlayersById = canBlend && buffer.previous
    ? new Map(buffer.previous.players.map((player) => [player.id, player]))
    : new Map();
  buffer.latest = snapshot;
  buffer.latestReceivedAtMs = receivedAtMs;
  buffer.intervalMs = canBlend
    ? clamp(
      Math.max(authoritativeGapMs * PRESENTATION_HEADROOM, observedGapMs),
      MIN_INTERVAL_MS,
      MAX_INTERVAL_MS,
    )
    : 1_000 / 15;
}

export function getPresentedSnapshot(
  buffer: Readonly<LivePresentationBuffer>,
  nowMs: number,
  localOptions?: LocalPresentationOptions,
): SnapshotMessage | null {
  const latest = buffer.latest;
  const previous = buffer.previous;
  if (!latest || !previous) return latest;
  const alpha = clamp(
    (nowMs - buffer.latestReceivedAtMs) / Math.max(1, buffer.intervalMs),
    0,
    1,
  );
  const presented = alpha >= 1
    ? latest
    : {
      ...latest,
      players: latest.players.map((player) =>
        interpolatePlayer(buffer.previousPlayersById.get(player.id), player, alpha),
      ),
    };
  return localOptions
    ? applyLocalPrediction(buffer as LivePresentationBuffer, presented, nowMs, localOptions)
    : presented;
}

function createLocalPredictionState(): LocalPredictionState {
  return {
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    initialized: false,
  };
}

function applyLocalPrediction(
  buffer: LivePresentationBuffer,
  presented: SnapshotMessage,
  nowMs: number,
  options: LocalPresentationOptions,
): SnapshotMessage {
  const latest = buffer.latest;
  if (!latest) return presented;
  const authority = latest.players.find((player) => player.id === options.playerId);
  const visible = presented.players.find((player) => player.id === options.playerId);
  const state = buffer.localPrediction;
  if (!authority || !visible || !authority.alive || !visible.alive) {
    state.initialized = false;
    state.playerId = options.playerId;
    return presented;
  }

  const inputDirection = finiteUnit(options.direction, authority.direction);
  const speed = authority.boosting === true ? options.boostSpeed : options.baseSpeed;
  const predictionMs = clamp(
    nowMs - buffer.latestReceivedAtMs + buffer.intervalMs * 0.5,
    0,
    LOCAL_PREDICTION_HORIZON_MS,
  );
  const predictionSeconds = predictionMs / 1_000;
  const target = {
    x: authority.position.x + inputDirection.x * Math.max(0, speed) * predictionSeconds,
    y: authority.position.y + inputDirection.y * Math.max(0, speed) * predictionSeconds,
  };

  const timelineReset = state.playerId !== options.playerId ||
    state.lastAuthoritativeTick === undefined ||
    latest.tick < state.lastAuthoritativeTick ||
    Math.hypot(target.x - state.position.x, target.y - state.position.y) > TELEPORT_DISTANCE;
  if (!state.initialized || timelineReset) {
    state.position.x = visible.position.x;
    state.position.y = visible.position.y;
    state.direction = { ...visible.direction };
    state.initialized = true;
    state.lastFrameAtMs = nowMs;
  } else {
    const deltaMs = clamp(nowMs - (state.lastFrameAtMs ?? nowMs), 0, 100);
    const response = 1 - Math.pow(0.5, deltaMs / LOCAL_RESPONSE_HALF_LIFE_MS);
    state.position.x += (target.x - state.position.x) * response;
    state.position.y += (target.y - state.position.y) * response;
    state.direction = normalizedLerp(state.direction, inputDirection, response);
    state.lastFrameAtMs = nowMs;
  }
  state.playerId = options.playerId;
  state.lastAuthoritativeTick = latest.tick;

  let offsetX = state.position.x - visible.position.x;
  let offsetY = state.position.y - visible.position.y;
  const boundaryScale = allowedBoundaryTranslationScale(
    visible,
    offsetX,
    offsetY,
    options,
  );
  offsetX *= boundaryScale;
  offsetY *= boundaryScale;
  state.position.x = visible.position.x + offsetX;
  state.position.y = visible.position.y + offsetY;

  return {
    ...presented,
    players: presented.players.map((player) => player.id === options.playerId
      ? {
        ...player,
        position: { x: state.position.x, y: state.position.y },
        direction: { ...state.direction },
        body: player.body.map((point) => ({
          x: point.x + offsetX,
          y: point.y + offsetY,
        })),
      }
      : player),
  };
}

function allowedBoundaryTranslationScale(
  player: PublicPlayerState,
  offsetX: number,
  offsetY: number,
  options: LocalPresentationOptions,
): number {
  const arenaRadius = options.arenaRadius;
  if (!Number.isFinite(arenaRadius) || (arenaRadius ?? 0) <= 0) return 1;
  const offsetLengthSquared = offsetX * offsetX + offsetY * offsetY;
  if (offsetLengthSquared < 1e-9) return 1;

  let scale = 1;
  const points = [player.position, ...player.body];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const radius = index === 0 ? options.headRadius : options.bodyRadius;
    const limit = Math.max(0, (arenaRadius ?? 0) - Math.max(0, radius ?? 0));
    const finalX = point.x + offsetX * scale;
    const finalY = point.y + offsetY * scale;
    if (finalX * finalX + finalY * finalY <= limit * limit) continue;
    const b = 2 * (point.x * offsetX + point.y * offsetY);
    const c = point.x * point.x + point.y * point.y - limit * limit;
    const discriminant = Math.max(0, b * b - 4 * offsetLengthSquared * c);
    const root = (-b + Math.sqrt(discriminant)) / (2 * offsetLengthSquared);
    scale = Math.max(0, Math.min(scale, root));
  }
  return scale;
}

function finiteUnit(value: Readonly<Vec2>, fallback: Readonly<Vec2>): Vec2 {
  const length = Math.hypot(value.x, value.y);
  if (!Number.isFinite(length) || length < 1e-9) return { ...fallback };
  return { x: value.x / length, y: value.y / length };
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
