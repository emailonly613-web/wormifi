import type {
  ChargingStationConfig,
  ChargingStationState,
  ChargingWrapGeometry,
  GameBoardConfig,
  PlayerState,
  Vec2,
} from "./types";

const TAU = Math.PI * 2;
const EPSILON = 1e-9;
const MINIMUM_DIRECTION_CONSISTENCY = 0.82;
const BOARD_ID_PATTERN = /^[a-z0-9-]{1,40}$/;
export const HARBOR_PROGRESS_UNITS_PER_RADIAN = 1_000;

/** Default arena: three progressively riskier one-lap island rewards. */
export const OPEN_SEAS_BOARD: Readonly<GameBoardConfig> = Object.freeze({
  id: "open-seas",
  name: "Open Seas",
  chargingStations: Object.freeze([
    Object.freeze({
      id: "coin-cay",
      name: "Coin Cay",
      kind: "harbor",
      position: Object.freeze({ x: -360, y: -210 }),
      coreRadius: 8,
      wrapRadius: 22,
      wrapTolerance: 7,
      dockAngleRadians: 0,
      dockRadius: 12,
      requiredWrapRadians: 5.3,
      minimumWrappedSegments: 6,
      chargeDurationSeconds: 1 / 30,
      massReward: 2.5,
      interruptionGraceSeconds: 0,
      interruptionDecayTicksPerTick: 1,
      completionCooldownSeconds: 4,
      resetCooldownSeconds: 1,
    }),
    Object.freeze({
      id: "coral-key",
      name: "Coral Key",
      kind: "harbor",
      position: Object.freeze({ x: 360, y: 220 }),
      coreRadius: 14,
      wrapRadius: 42,
      wrapTolerance: 9,
      dockAngleRadians: Math.PI,
      dockRadius: 14,
      requiredWrapRadians: 5.45,
      minimumWrappedSegments: 10,
      chargeDurationSeconds: 1 / 30,
      massReward: 4,
      interruptionGraceSeconds: 0,
      interruptionDecayTicksPerTick: 1,
      completionCooldownSeconds: 6,
      resetCooldownSeconds: 1,
    }),
    Object.freeze({
      id: "kraken-atoll",
      name: "Kraken Atoll",
      kind: "harbor",
      position: Object.freeze({ x: 0, y: -440 }),
      coreRadius: 24,
      wrapRadius: 72,
      wrapTolerance: 14,
      dockAngleRadians: Math.PI / 2,
      dockRadius: 18,
      requiredWrapRadians: 5.55,
      minimumWrappedSegments: 14,
      chargeDurationSeconds: 1 / 30,
      massReward: 7,
      interruptionGraceSeconds: 0,
      interruptionDecayTicksPerTick: 1,
      completionCooldownSeconds: 8,
      resetCooldownSeconds: 1,
    }),
  ]) as unknown as ChargingStationConfig[],
});

/**
 * First opt-in pirate relay board. Hosting code must select it explicitly;
 * merely importing this profile never changes a normal room.
 */
export const BLACK_PEARL_RELAY_BOARD: Readonly<GameBoardConfig> = Object.freeze({
  id: "black-pearl-relay",
  name: "Black Pearl Relay",
  chargingStations: Object.freeze([
    Object.freeze({
      id: "port-capstan",
      name: "Port Capstan",
      position: Object.freeze({ x: -620, y: 300 }),
      coreRadius: 38,
      wrapRadius: 92,
      wrapTolerance: 26,
      dockAngleRadians: 0,
      dockRadius: 22,
      requiredWrapRadians: (5 * Math.PI) / 3,
      minimumWrappedSegments: 12,
      chargeDurationSeconds: 2.4,
      massReward: 24,
      interruptionGraceSeconds: 0.35,
      interruptionDecayTicksPerTick: 2,
      completionCooldownSeconds: 20,
      resetCooldownSeconds: 4,
    }),
    Object.freeze({
      id: "starboard-capstan",
      name: "Starboard Capstan",
      position: Object.freeze({ x: 620, y: -300 }),
      coreRadius: 38,
      wrapRadius: 92,
      wrapTolerance: 26,
      dockAngleRadians: Math.PI,
      dockRadius: 22,
      requiredWrapRadians: (5 * Math.PI) / 3,
      minimumWrappedSegments: 12,
      chargeDurationSeconds: 2.4,
      massReward: 24,
      interruptionGraceSeconds: 0.35,
      interruptionDecayTicksPerTick: 2,
      completionCooldownSeconds: 20,
      resetCooldownSeconds: 4,
    }),
  ]) as unknown as ChargingStationConfig[],
});

export type GameBoardId = "open-seas" | "black-pearl-relay";

/** Public immutable board catalog. Rooms select one profile only at creation. */
export const GAME_BOARD_CATALOG: Readonly<Record<GameBoardId, Readonly<GameBoardConfig>>> =
  Object.freeze({
    "open-seas": OPEN_SEAS_BOARD,
    "black-pearl-relay": BLACK_PEARL_RELAY_BOARD,
  });

export function getGameBoardProfile(
  boardId: string,
): Readonly<GameBoardConfig> | undefined {
  return GAME_BOARD_CATALOG[boardId as GameBoardId];
}

function finitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number`);
  }
}

function finiteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number`);
  }
}

export function cloneAndValidateBoard(
  board: Readonly<GameBoardConfig>,
  fixedStepSeconds: number,
  arenaRadius: number,
): { board: GameBoardConfig; states: Record<string, ChargingStationState> } {
  if (!BOARD_ID_PATTERN.test(board.id)) {
    throw new Error("board id must contain only lowercase letters, numbers, and hyphens");
  }
  if (!board.name.trim()) throw new Error("board name is required");
  if (!Array.isArray(board.chargingStations)) {
    throw new Error("board chargingStations must be an array");
  }

  const seenIds = new Set<string>();
  const chargingStations = board.chargingStations.map((station) => {
    if (!BOARD_ID_PATTERN.test(station.id) || seenIds.has(station.id)) {
      throw new Error(`charging station id ${station.id} is invalid or duplicated`);
    }
    seenIds.add(station.id);
    if (!station.name.trim()) throw new Error(`charging station ${station.id} needs a name`);
    if (station.kind !== undefined && station.kind !== "capstan" && station.kind !== "harbor") {
      throw new Error(`charging station ${station.id} kind is invalid`);
    }
    if (!Number.isFinite(station.position.x) || !Number.isFinite(station.position.y)) {
      throw new Error(`charging station ${station.id} position must be finite`);
    }
    finitePositive(station.coreRadius, `${station.id}.coreRadius`);
    finitePositive(station.wrapRadius, `${station.id}.wrapRadius`);
    finitePositive(station.wrapTolerance, `${station.id}.wrapTolerance`);
    finitePositive(station.dockRadius, `${station.id}.dockRadius`);
    finitePositive(station.requiredWrapRadians, `${station.id}.requiredWrapRadians`);
    finitePositive(station.chargeDurationSeconds, `${station.id}.chargeDurationSeconds`);
    finitePositive(station.massReward, `${station.id}.massReward`);
    finiteNonNegative(
      station.interruptionGraceSeconds,
      `${station.id}.interruptionGraceSeconds`,
    );
    finiteNonNegative(
      station.completionCooldownSeconds,
      `${station.id}.completionCooldownSeconds`,
    );
    finiteNonNegative(station.resetCooldownSeconds, `${station.id}.resetCooldownSeconds`);
    if (!Number.isFinite(station.dockAngleRadians)) {
      throw new Error(`${station.id}.dockAngleRadians must be finite`);
    }
    if (station.wrapRadius - station.wrapTolerance <= station.coreRadius) {
      throw new Error(`charging station ${station.id} wrap lane must clear its core`);
    }
    if (station.requiredWrapRadians > TAU * 2) {
      throw new Error(`charging station ${station.id} cannot require more than two wraps`);
    }
    if (
      !Number.isSafeInteger(station.minimumWrappedSegments) ||
      station.minimumWrappedSegments < 2
    ) {
      throw new Error(`${station.id}.minimumWrappedSegments must be an integer of at least two`);
    }
    if (
      !Number.isSafeInteger(station.interruptionDecayTicksPerTick) ||
      station.interruptionDecayTicksPerTick < 1
    ) {
      throw new Error(
        `${station.id}.interruptionDecayTicksPerTick must be a positive integer`,
      );
    }
    const landmarkReach = Math.hypot(station.position.x, station.position.y) +
      station.wrapRadius + station.wrapTolerance;
    if (landmarkReach >= arenaRadius) {
      throw new Error(`charging station ${station.id} wrap lane must fit inside the arena`);
    }

    return {
      ...station,
      position: { ...station.position },
    };
  });

  const clonedBoard: GameBoardConfig = {
    id: board.id,
    name: board.name,
    chargingStations,
  };
  const states: Record<string, ChargingStationState> = {};
  for (const station of chargingStations) {
    states[station.id] = {
      stationId: station.id,
      phase: "ready",
      windingDirection: 0,
      progressTicks: 0,
      requiredTicks: station.kind === "harbor"
        ? Math.max(1, Math.ceil(
            station.requiredWrapRadians * HARBOR_PROGRESS_UNITS_PER_RADIAN,
          ))
        : Math.max(1, Math.ceil(station.chargeDurationSeconds / fixedStepSeconds)),
      graceTicksRemaining: 0,
      cooldownTicksRemaining: 0,
      massAwarded: 0,
    };
  }
  return { board: clonedBoard, states };
}

export function getChargingDockPosition(
  station: Readonly<ChargingStationConfig>,
): Vec2 {
  return {
    x: station.position.x + Math.cos(station.dockAngleRadians) * station.wrapRadius,
    y: station.position.y + Math.sin(station.dockAngleRadians) * station.wrapRadius,
  };
}

function distance(first: Readonly<Vec2>, second: Readonly<Vec2>): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function wrappedAngleDelta(next: number, previous: number): number {
  let delta = (next - previous + Math.PI) % TAU;
  if (delta < 0) delta += TAU;
  return delta - Math.PI;
}

export function getChargingLoopAngle(
  position: Readonly<Vec2>,
  station: Readonly<ChargingStationConfig>,
): number {
  return Math.atan2(
    position.y - station.position.y,
    position.x - station.position.x,
  );
}

export function getChargingLoopAngleDelta(next: number, previous: number): number {
  return wrappedAngleDelta(next, previous);
}

export function isPointInChargingLoopLane(
  position: Readonly<Vec2>,
  station: Readonly<ChargingStationConfig>,
): boolean {
  const radialDistance = distance(position, station.position);
  return radialDistance + EPSILON >= station.wrapRadius - station.wrapTolerance &&
    radialDistance <= station.wrapRadius + station.wrapTolerance + EPSILON;
}

/**
 * Proves an actual contiguous coil from the docked head through the body. A
 * nearby head, a body outside the marked lane, a back-and-forth scribble, or a
 * sparse angular jump cannot satisfy the objective.
 */
export function evaluateChargingWrap(
  player: Readonly<PlayerState>,
  station: Readonly<ChargingStationConfig>,
): ChargingWrapGeometry {
  const docked = distance(player.position, getChargingDockPosition(station)) <=
    station.dockRadius + EPSILON;
  let previousAngle = Math.atan2(
    player.position.y - station.position.y,
    player.position.x - station.position.x,
  );
  let signedTravel = 0;
  let absoluteTravel = 0;
  let wrappedSegments = 0;

  for (const segment of player.body) {
    const radialDistance = distance(segment, station.position);
    if (
      radialDistance < station.wrapRadius - station.wrapTolerance - EPSILON ||
      radialDistance > station.wrapRadius + station.wrapTolerance + EPSILON
    ) {
      break;
    }

    const angle = Math.atan2(
      segment.y - station.position.y,
      segment.x - station.position.x,
    );
    const delta = wrappedAngleDelta(angle, previousAngle);
    // A real body link cannot teleport across half of the landmark.
    if (Math.abs(delta) > Math.PI / 2 + EPSILON) break;
    signedTravel += delta;
    absoluteTravel += Math.abs(delta);
    wrappedSegments += 1;
    previousAngle = angle;
  }

  const directionConsistency = absoluteTravel <= EPSILON
    ? 0
    : Math.abs(signedTravel) / absoluteTravel;
  const windingDirection: -1 | 0 | 1 = Math.abs(signedTravel) <= EPSILON
    ? 0
    : signedTravel < 0
      ? -1
      : 1;
  const windingRadians = Math.abs(signedTravel);

  return {
    docked,
    wrappedSegments,
    windingRadians,
    windingDirection,
    directionConsistency,
    valid: docked &&
      wrappedSegments >= station.minimumWrappedSegments &&
      windingRadians + EPSILON >= station.requiredWrapRadians &&
      directionConsistency + EPSILON >= MINIMUM_DIRECTION_CONSISTENCY &&
      windingDirection !== 0,
  };
}
