import {
  hashSeed,
  randomPointInCircle,
  randomUnitVector,
} from "./random";
import {
  cloneAndValidateBoard,
  evaluateChargingWrap,
  OPEN_SEAS_BOARD,
} from "./chargingStations";
import {
  getBoostMassCostMultiplier,
  getDropRelicKind,
  getMovementSpeedMultiplier,
  getPirateRelicSpec,
  getTreasureMassMultiplier,
  isRelicActiveAtTick,
  isTreasureMultiplierTier,
} from "./relics";
import { MASS_PER_BODY_SEGMENT } from "./treasureEconomy";
import type {
  BotInputContext,
  BotInputProviderMap,
  CollisionRadiusConfig,
  DropState,
  GameConfig,
  GameBoardConfig,
  GameEvent,
  GameState,
  GameStepResult,
  PlayerId,
  PlayerInput,
  PlayerInputMap,
  PlayerState,
  PirateRelicKind,
  RankedPlayer,
  SpawnDropOptions,
  SpawnPlayerOptions,
  SpecialistKind,
  Vec2,
} from "./types";

const EPSILON = 1e-9;
const TAU = Math.PI * 2;

interface DropIdCache {
  drops: GameState["drops"];
  length: number;
  ids: Set<string>;
}

// Large local arenas add their deterministic ground field in one batch. Keep
// duplicate-ID validation O(1) across that batch; rebuilding after simulation
// replaces/removes the drop array preserves the existing validation contract.
const dropIdCaches = new WeakMap<GameState, DropIdCache>();

function getDropIdCache(state: GameState): DropIdCache {
  const current = dropIdCaches.get(state);
  if (current?.drops === state.drops && current.length === state.drops.length) {
    return current;
  }
  const rebuilt: DropIdCache = {
    drops: state.drops,
    length: state.drops.length,
    ids: new Set(state.drops.map((drop) => drop.id)),
  };
  dropIdCaches.set(state, rebuilt);
  return rebuilt;
}

export const DEFAULT_GAME_CONFIG: Readonly<GameConfig> = Object.freeze({
  fixedStepSeconds: 1 / 30,
  arenaRadius: 5_000,
  spawnRadiusFactor: 0.62,
  spawnAttempts: 48,
  startMass: 48,
  minimumMass: 24,
  minimumBoostMass: 34,
  baseSpeed: 100,
  boostSpeed: 200,
  boostMassPerSecond: 4,
  shedDropMass: 2,
  shedPickupLockSeconds: 1.25,
  maximumTurnRadiansPerSecond: (270 * Math.PI) / 180,
  minimumTurnRadiansPerSecond: (145 * Math.PI) / 180,
  turnMassScale: 420,
  // A compact spawn must still read as a healthy worm. These radii keep the
  // six-segment opener readable while giving it a plump, collision-faithful
  // silhouette; sqrt(mass) then makes sustained growth visibly add girth.
  baseRadius: 8,
  massRadiusFactor: 0.68,
  bodyRadiusFactor: 0.98,
  segmentSpacingFactor: 0.82,
  startingBodySegments: 6,
  minimumBodySegments: 4,
  maximumBodySegments: 72,
  massPerSegment: MASS_PER_BODY_SEGMENT,
  spawnShieldSeconds: 1.5,
  dropRadius: 4,
  deathDropTargetMass: 5,
  maximumDeathDrops: 80,
  maximumBoostDropsInWorld: 96,
  maximumDeathDropsInWorld: 192,
  collectorDurationSeconds: 12,
  collectorPickupRadiusMultiplier: 1.35,
});

interface DeathCandidate {
  victimId: PlayerId;
  cause: "collision" | "boundary";
  killerId?: PlayerId;
  collisionTime: number;
}

function cloneVec(vector: Vec2): Vec2 {
  return { x: vector.x, y: vector.y };
}

function magnitudeSquared(vector: Vec2): number {
  return vector.x * vector.x + vector.y * vector.y;
}

function normalize(vector: Vec2, fallback: Vec2 = { x: 1, y: 0 }): Vec2 {
  const lengthSquared = magnitudeSquared(vector);
  if (!Number.isFinite(lengthSquared) || lengthSquared <= EPSILON) {
    return cloneVec(fallback);
  }

  const inverseLength = 1 / Math.sqrt(lengthSquared);
  return { x: vector.x * inverseLength, y: vector.y * inverseLength };
}

function distanceSquared(first: Vec2, second: Vec2): number {
  const x = first.x - second.x;
  const y = first.y - second.y;
  return x * x + y * y;
}

function validateConfig(config: GameConfig): void {
  if (!Number.isFinite(config.fixedStepSeconds) || config.fixedStepSeconds <= 0) {
    throw new Error("fixedStepSeconds must be a positive finite number");
  }
  if (!Number.isFinite(config.arenaRadius) || config.arenaRadius <= 0) {
    throw new Error("arenaRadius must be a positive finite number");
  }
  if (!Number.isSafeInteger(config.minimumBodySegments) || config.minimumBodySegments < 1) {
    throw new Error("minimumBodySegments must be a positive safe integer");
  }
  if (
    !Number.isSafeInteger(config.startingBodySegments) ||
    config.startingBodySegments < config.minimumBodySegments
  ) {
    throw new Error("startingBodySegments cannot be below minimumBodySegments");
  }
  if (
    !Number.isSafeInteger(config.maximumBodySegments) ||
    config.maximumBodySegments < config.startingBodySegments
  ) {
    throw new Error("maximumBodySegments cannot be below startingBodySegments");
  }
  if (!Number.isFinite(config.massPerSegment) || config.massPerSegment <= 0) {
    throw new Error("massPerSegment must be a positive finite number");
  }
  if (config.maximumDeathDrops < 1 || config.deathDropTargetMass <= 0) {
    throw new Error("death drop settings must be positive");
  }
  if (
    !Number.isSafeInteger(config.maximumBoostDropsInWorld) ||
    config.maximumBoostDropsInWorld < 1 ||
    !Number.isSafeInteger(config.maximumDeathDropsInWorld) ||
    config.maximumDeathDropsInWorld < 1
  ) {
    throw new Error("world Echo caps must be positive safe integers");
  }
  if (
    !Number.isFinite(config.collectorDurationSeconds) ||
    config.collectorDurationSeconds <= 0
  ) {
    throw new Error("collectorDurationSeconds must be a positive finite number");
  }
  if (
    !Number.isFinite(config.collectorPickupRadiusMultiplier) ||
    config.collectorPickupRadiusMultiplier < 1
  ) {
    throw new Error("collectorPickupRadiusMultiplier must be at least one");
  }
}

export function createGameState(
  seed: string | number,
  overrides: Partial<GameConfig> = {},
  board: Readonly<GameBoardConfig> = OPEN_SEAS_BOARD,
): GameState {
  const config: GameConfig = { ...DEFAULT_GAME_CONFIG, ...overrides };
  validateConfig(config);
  const preparedBoard = cloneAndValidateBoard(
    board,
    config.fixedStepSeconds,
    config.arenaRadius,
  );

  return {
    config,
    board: preparedBoard.board,
    chargingStations: preparedBoard.states,
    initialSeed: seed,
    randomState: hashSeed(seed),
    tick: 0,
    accumulatorSeconds: 0,
    nextEntityNumber: 1,
    players: {},
    drops: [],
  };
}

export function getPlayerRadius(
  player: Pick<PlayerState, "mass">,
  config: Readonly<CollisionRadiusConfig>,
): number {
  return config.baseRadius + Math.sqrt(Math.max(0, player.mass)) * config.massRadiusFactor;
}

export function getBodyRadius(
  player: Pick<PlayerState, "mass">,
  config: Readonly<CollisionRadiusConfig>,
): number {
  return getPlayerRadius(player, config) * config.bodyRadiusFactor;
}

/**
 * Shared truth for whether sprint is really active this simulation tick. A
 * held button at the mass floor is intent only and must not be presented to
 * other players as movement the server did not grant.
 */
export function isPlayerBoosting(
  player: Pick<PlayerState, "alive" | "lastInput" | "mass">,
  config: Pick<GameConfig, "minimumBoostMass">,
): boolean {
  return player.alive &&
    player.lastInput.boost &&
    player.mass > config.minimumBoostMass + EPSILON;
}

/**
 * The visible Turbo reserve is the amount of size that can safely be burned.
 * A launch-size worm is full; extra growth stays full, while sprinting drains
 * toward the same server-enforced floor that already controls movement.
 */
export function getPlayerTurboReserveRatio(
  player: Pick<PlayerState, "mass">,
  config: Pick<GameConfig, "startMass" | "minimumBoostMass">,
): number {
  const fullReserveMass = Math.max(EPSILON, config.startMass - config.minimumBoostMass);
  return Math.max(0, Math.min(1, (player.mass - config.minimumBoostMass) / fullReserveMass));
}

export function getPlayerTurboSecondsRemaining(
  player: Pick<PlayerState, "mass">,
  config: Pick<GameConfig, "minimumBoostMass" | "boostMassPerSecond">,
): number {
  if (config.boostMassPerSecond <= EPSILON) return 0;
  return Math.max(0, player.mass - config.minimumBoostMass) / config.boostMassPerSecond;
}

function getTargetBodyLength(player: PlayerState, config: GameConfig): number {
  const growthSegments = Math.floor(
    (player.mass - config.startMass + EPSILON) / config.massPerSegment,
  );
  return Math.min(
    config.maximumBodySegments,
    Math.max(
      config.minimumBodySegments,
      config.startingBodySegments + growthSegments,
    ),
  );
}

function distanceToSegment(point: Vec2, start: Vec2, end: Vec2): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared <= EPSILON) return Math.sqrt(distanceSquared(point, start));
  const projection = Math.max(0, Math.min(1,
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
      lengthSquared,
  ));
  return Math.hypot(
    point.x - (start.x + segmentX * projection),
    point.y - (start.y + segmentY * projection),
  );
}

function getSegmentSpacing(player: PlayerState, config: GameConfig): number {
  return getBodyRadius(player, config) * 2 * config.segmentSpacingFactor;
}

function syncBodyLength(player: PlayerState, config: GameConfig): void {
  const targetLength = getTargetBodyLength(player, config);
  const spacing = getSegmentSpacing(player, config);

  if (player.body.length > targetLength) {
    player.body.length = targetLength;
  }

  while (player.body.length < targetLength) {
    const tail = player.body.at(-1) ?? player.position;
    const previous = player.body.at(-2) ?? player.position;
    const tailDirection = normalize(
      { x: tail.x - previous.x, y: tail.y - previous.y },
      { x: -player.direction.x, y: -player.direction.y },
    );
    player.body.push({
      x: tail.x + tailDirection.x * spacing,
      y: tail.y + tailDirection.y * spacing,
    });
  }
}

function pickSpawnPosition(state: GameState): Vec2 {
  const spawnRadius = state.config.arenaRadius * state.config.spawnRadiusFactor;
  const livingPlayers = Object.values(state.players).filter((player) => player.alive);
  const startingBodyRadius = getBodyRadius(
    { mass: state.config.startMass },
    state.config,
  );
  const startingChainReach =
    state.config.startingBodySegments *
      startingBodyRadius * 2 * state.config.segmentSpacingFactor +
    startingBodyRadius;
  let bestPosition: Vec2 = { x: 0, y: 0 };
  let bestClearance = -Infinity;

  for (let attempt = 0; attempt < state.config.spawnAttempts; attempt += 1) {
    const candidate = randomPointInCircle(state.randomState, spawnRadius);
    state.randomState = candidate.state;

    const clearance = livingPlayers.length === 0
      ? state.config.arenaRadius
      : Math.min(...livingPlayers.flatMap((player) => {
        const clearances = [
          Math.sqrt(distanceSquared(candidate.value, player.position)) -
            startingChainReach - getPlayerRadius(player, state.config),
        ];
        for (let index = 0; index < player.body.length; index += 1) {
          const start = index === 0 ? player.position : player.body[index - 1];
          const end = player.body[index];
          clearances.push(
            distanceToSegment(candidate.value, start, end) -
              startingChainReach - getBodyRadius(player, state.config),
          );
        }
        return clearances;
      }));

    if (clearance > bestClearance) {
      bestClearance = clearance;
      bestPosition = candidate.value;
    }
  }

  return bestPosition;
}

export function spawnPlayer(
  state: GameState,
  options: SpawnPlayerOptions = {},
): PlayerState {
  const id = options.id ?? `player-${state.nextEntityNumber++}`;
  if (state.players[id]) throw new Error(`Player ${id} already exists`);

  const position = options.position ? cloneVec(options.position) : pickSpawnPosition(state);
  let direction: Vec2;

  if (options.direction) {
    direction = normalize(options.direction);
  } else {
    const randomDirection = randomUnitVector(state.randomState);
    state.randomState = randomDirection.state;
    direction = randomDirection.value;
  }

  const mass = Math.max(
    state.config.minimumMass,
    options.mass ?? state.config.startMass,
  );
  const shieldSeconds = options.shieldSeconds ?? state.config.spawnShieldSeconds;
  const player: PlayerState = {
    id,
    name: options.name ?? id,
    kind: options.kind ?? "human",
    position,
    previousPosition: cloneVec(position),
    direction,
    body: [],
    previousBody: [],
    mass,
    alive: true,
    shieldTicksRemaining: Math.max(
      0,
      Math.ceil(shieldSeconds / state.config.fixedStepSeconds),
    ),
    spawnedAtTick: state.tick,
    lastInput: {
      sequence: -1,
      clientTick: state.tick,
      direction: cloneVec(direction),
      boost: false,
    },
    shedMassRemainder: 0,
    stats: {
      kills: 0,
      collectedMass: 0,
      peakMass: mass,
      survivalTicks: 0,
    },
  };

  const spacing = getSegmentSpacing(player, state.config);
  const bodyLength = getTargetBodyLength(player, state.config);
  for (let index = 1; index <= bodyLength; index += 1) {
    player.body.push({
      x: position.x - direction.x * spacing * index,
      y: position.y - direction.y * spacing * index,
    });
  }
  player.previousBody = player.body.map(cloneVec);
  state.players[id] = player;

  return player;
}

export function spawnDrop(
  state: GameState,
  options: SpawnDropOptions,
): DropState {
  if (options.specialist && options.relicKind) {
    throw new Error("Use either the legacy specialist field or relicKind, not both");
  }
  if (options.specialistDurationSeconds && options.relicDurationSeconds) {
    throw new Error("Use either specialist or Relic duration, not both");
  }
  const resolvedRelicKind = options.relicKind ??
    (options.specialist === "collector" ? "loot-compass" : undefined);
  if (
    (resolvedRelicKind === "gilded-ledger" && !isTreasureMultiplierTier(options.relicTier)) ||
    (resolvedRelicKind !== "gilded-ledger" && options.relicTier !== undefined)
  ) {
    throw new Error("Only Gilded Ledger may declare an x2, x3, or x5 tier");
  }
  const isSpecialistPickup = resolvedRelicKind !== undefined;
  const bankedMass = options.bankedMass ?? 0;
  if (
    !Number.isFinite(options.mass) ||
    options.mass < 0 ||
    (options.mass === 0 && !isSpecialistPickup) ||
    (isSpecialistPickup && options.mass !== 0)
  ) {
    throw new Error("Drop mass must be positive; specialist pickups must be zero-mass");
  }
  if (
    !Number.isFinite(bankedMass) ||
    bankedMass < 0 ||
    (isSpecialistPickup && bankedMass !== 0)
  ) {
    throw new Error("Banked drop mass must be finite and non-negative");
  }
  if (
    options.pickupBlockedUntilTick !== undefined &&
    (!Number.isSafeInteger(options.pickupBlockedUntilTick) ||
      options.pickupBlockedUntilTick < 0)
  ) {
    throw new Error("Global pickup lock must be a non-negative safe tick");
  }

  const source = options.source ?? "arena";
  const specialistDurationSeconds =
    options.relicDurationSeconds ??
    options.specialistDurationSeconds ??
    (resolvedRelicKind === "loot-compass"
      ? state.config.collectorDurationSeconds
      : resolvedRelicKind
        ? getPirateRelicSpec(resolvedRelicKind).durationSeconds
        : state.config.collectorDurationSeconds);
  if (
    isSpecialistPickup &&
    (!Number.isFinite(specialistDurationSeconds) || specialistDurationSeconds <= 0)
  ) {
    throw new Error("Specialist duration must be a positive finite number");
  }

  const collectorReachPolicy: DropState["collectorReachPolicy"] =
    isSpecialistPickup || source === "death"
      ? "none"
      : source === "boost"
        ? "owner"
        : options.collectorReachPolicy ?? "neutral";

  const id = options.id ?? `drop-${state.nextEntityNumber++}`;
  const idCache = getDropIdCache(state);
  if (idCache.ids.has(id)) {
    throw new Error(`Drop ${id} already exists`);
  }

  const drop: DropState = {
    id,
    position: cloneVec(options.position),
    mass: options.mass,
    ...(bankedMass > EPSILON ? { bankedMass } : {}),
    radius: options.radius ?? state.config.dropRadius,
    source,
    originPlayerId: options.originPlayerId,
    specialist: options.specialist,
    specialistDurationTicks: options.specialist
      ? Math.max(
          1,
          Math.ceil(specialistDurationSeconds / state.config.fixedStepSeconds),
        )
      : undefined,
    relicKind: options.relicKind,
    relicDurationTicks: options.relicKind
      ? Math.max(
          1,
          Math.ceil(specialistDurationSeconds / state.config.fixedStepSeconds),
        )
      : undefined,
    relicTier: options.relicTier,
    collectorReachPolicy,
    blockedPlayerId: options.blockedPlayerId,
    blockedUntilTick: options.blockedUntilTick ?? 0,
    ...(options.pickupBlockedUntilTick
      ? { pickupBlockedUntilTick: options.pickupBlockedUntilTick }
      : {}),
  };

  state.drops.push(drop);
  idCache.ids.add(drop.id);
  idCache.length = state.drops.length;
  return drop;
}

/** Exact authoritative mass represented by one visible pickup and its bank. */
export function getDropStoredMass(
  drop: Pick<DropState, "mass" | "bankedMass">,
): number {
  return drop.mass + (drop.bankedMass ?? 0);
}

function wrapAngle(angle: number): number {
  let wrapped = (angle + Math.PI) % TAU;
  if (wrapped < 0) wrapped += TAU;
  return wrapped - Math.PI;
}

function rotateToward(current: Vec2, desired: Vec2, maximumRadians: number): Vec2 {
  const currentAngle = Math.atan2(current.y, current.x);
  const desiredAngle = Math.atan2(desired.y, desired.x);
  const delta = wrapAngle(desiredAngle - currentAngle);
  const applied = Math.max(-maximumRadians, Math.min(maximumRadians, delta));
  const angle = currentAngle + applied;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function getTurnRate(player: PlayerState, config: GameConfig): number {
  const excessMass = Math.max(0, player.mass - config.startMass);
  return Math.max(
    config.minimumTurnRadiansPerSecond,
    config.maximumTurnRadiansPerSecond / (1 + excessMass / config.turnMassScale),
  );
}

function updateBodyPositions(player: PlayerState, config: GameConfig): void {
  const spacing = getSegmentSpacing(player, config);
  let leader = player.position;

  for (const segment of player.body) {
    const deltaX = segment.x - leader.x;
    const deltaY = segment.y - leader.y;
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;
    let awayX: number;
    let awayY: number;
    if (!Number.isFinite(lengthSquared) || lengthSquared <= EPSILON) {
      awayX = -player.direction.x;
      awayY = -player.direction.y;
    } else {
      const inverseLength = 1 / Math.sqrt(lengthSquared);
      awayX = deltaX * inverseLength;
      awayY = deltaY * inverseLength;
    }
    segment.x = leader.x + awayX * spacing;
    segment.y = leader.y + awayY * spacing;
    leader = segment;
  }
}

function snapshotPreviousGeometry(player: PlayerState): void {
  player.previousPosition.x = player.position.x;
  player.previousPosition.y = player.position.y;
  while (player.previousBody.length < player.body.length) {
    player.previousBody.push({ x: 0, y: 0 });
  }
  player.previousBody.length = player.body.length;
  for (let index = 0; index < player.body.length; index += 1) {
    const source = player.body[index];
    const target = player.previousBody[index];
    target.x = source.x;
    target.y = source.y;
  }
}

function buildBotContext(
  state: GameState,
  player: PlayerState,
  players: readonly Readonly<PlayerState>[],
): BotInputContext {
  return {
    tick: state.tick,
    deltaSeconds: state.config.fixedStepSeconds,
    config: state.config,
    self: player,
    players,
    drops: state.drops,
  };
}

function acceptInput(player: PlayerState, proposed: PlayerInput | undefined): void {
  if (!proposed || proposed.sequence < player.lastInput.sequence) return;

  player.lastInput = {
    sequence: proposed.sequence,
    clientTick: proposed.clientTick,
    direction: normalize(proposed.direction, player.direction),
    boost: Boolean(proposed.boost),
  };
}

function shedBoostMass(
  state: GameState,
  player: PlayerState,
  massLost: number,
  events: GameEvent[],
): void {
  player.shedMassRemainder += massLost;

  while (player.shedMassRemainder + EPSILON >= state.config.shedDropMass) {
    player.shedMassRemainder -= state.config.shedDropMass;
    if (Math.abs(player.shedMassRemainder) < EPSILON) player.shedMassRemainder = 0;

    const randomOffset = randomUnitVector(state.randomState);
    state.randomState = randomOffset.state;
    const tail = player.body.at(-1) ?? player.position;
    const offsetDistance = getBodyRadius(player, state.config) * 0.3;
    const drop = spawnDrop(state, {
      position: {
        x: tail.x + randomOffset.value.x * offsetDistance,
        y: tail.y + randomOffset.value.y * offsetDistance,
      },
      mass: state.config.shedDropMass,
      source: "boost",
      originPlayerId: player.id,
      blockedPlayerId: player.id,
      blockedUntilTick:
        state.tick +
        Math.ceil(
          state.config.shedPickupLockSeconds / state.config.fixedStepSeconds,
        ),
    });
    events.push({
      type: "massShed",
      tick: state.tick,
      playerId: player.id,
      dropId: drop.id,
      mass: drop.mass,
    });
  }
}

/**
 * Earliest normalized time where two moving circles overlap. Returning the
 * contact time, rather than only checking endpoints, prevents boost tunneling.
 */
export function sweptCircleHitTime(
  firstStart: Vec2,
  firstEnd: Vec2,
  firstRadius: number,
  secondStart: Vec2,
  secondEnd: Vec2,
  secondRadius: number,
): number | null {
  const relativeStart = {
    x: firstStart.x - secondStart.x,
    y: firstStart.y - secondStart.y,
  };
  const relativeVelocity = {
    x: firstEnd.x - firstStart.x - (secondEnd.x - secondStart.x),
    y: firstEnd.y - firstStart.y - (secondEnd.y - secondStart.y),
  };
  const radius = firstRadius + secondRadius;
  const c = magnitudeSquared(relativeStart) - radius * radius;
  if (c <= 0) return 0;

  const a = magnitudeSquared(relativeVelocity);
  if (a <= EPSILON) return null;

  const b = 2 * (
    relativeStart.x * relativeVelocity.x +
    relativeStart.y * relativeVelocity.y
  );
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const root = Math.sqrt(discriminant);
  const firstContact = (-b - root) / (2 * a);
  const secondContact = (-b + root) / (2 * a);

  if (firstContact >= -EPSILON && firstContact <= 1 + EPSILON) {
    return Math.max(0, Math.min(1, firstContact));
  }
  if (secondContact >= -EPSILON && secondContact <= 1 + EPSILON) {
    return Math.max(0, Math.min(1, secondContact));
  }
  return null;
}

/**
 * Sweeps a head against the complete visible body path, not only the follower
 * centers. The renderer joins the head and followers into one continuous
 * chain, so collision samples the same links densely enough that adjacent
 * solid circles overlap. Each sample still uses the single swept-circle law;
 * this closes spatial gaps without adding a second hit rule or frame-rate
 * dependence.
 */
function sweptHeadToBodyHitTime(
  attacker: Readonly<PlayerState>,
  owner: Readonly<PlayerState>,
  config: Readonly<GameConfig>,
): number | null {
  const attackerRadius = getPlayerRadius(attacker, config);
  const bodyRadius = getBodyRadius(owner, config);
  const maximumSampleSpacing = Math.max(EPSILON, bodyRadius * 0.9);
  let earliest: number | null = null;

  for (let index = 0; index < owner.body.length; index += 1) {
    const currentStart = index === 0 ? owner.position : owner.body[index - 1];
    const previousStart = index === 0
      ? owner.previousPosition
      : owner.previousBody[index - 1] ?? currentStart;
    const currentEnd = owner.body[index];
    const previousEnd = owner.previousBody[index] ?? currentEnd;
    const currentLength = Math.sqrt(distanceSquared(currentStart, currentEnd));
    const previousLength = Math.sqrt(distanceSquared(previousStart, previousEnd));
    const sampleCount = Math.max(
      1,
      Math.ceil(Math.max(currentLength, previousLength) / maximumSampleSpacing),
    );

    // Exclude the owner's head endpoint (alpha 0) because the shared law is
    // head-to-other-body. Include every follower endpoint and enough material
    // points between them to make the visible neck and body continuously solid.
    for (let sample = 1; sample <= sampleCount; sample += 1) {
      const alpha = sample / sampleCount;
      const bodyPrevious = {
        x: previousStart.x + (previousEnd.x - previousStart.x) * alpha,
        y: previousStart.y + (previousEnd.y - previousStart.y) * alpha,
      };
      const bodyCurrent = {
        x: currentStart.x + (currentEnd.x - currentStart.x) * alpha,
        y: currentStart.y + (currentEnd.y - currentStart.y) * alpha,
      };
      const collisionTime = sweptCircleHitTime(
        attacker.previousPosition,
        attacker.position,
        attackerRadius,
        bodyPrevious,
        bodyCurrent,
        bodyRadius,
      );
      if (
        collisionTime !== null &&
        (earliest === null || collisionTime < earliest - EPSILON)
      ) {
        earliest = collisionTime;
      }
    }
  }

  return earliest;
}

function findCollisionDeaths(state: GameState): DeathCandidate[] {
  const players = Object.values(state.players)
    .filter((player) => player.alive)
    .sort((first, second) => first.id.localeCompare(second.id));
  const candidates = new Map<PlayerId, DeathCandidate>();

  for (const attacker of players) {
    let earliest: DeathCandidate | undefined;
    if (attacker.shieldTicksRemaining <= 0) {
      for (const owner of players) {
        if (owner.id === attacker.id) continue;

        const collisionTime = sweptHeadToBodyHitTime(attacker, owner, state.config);
        if (collisionTime === null) continue;

        if (
          !earliest ||
          collisionTime < earliest.collisionTime - EPSILON ||
          (Math.abs(collisionTime - earliest.collisionTime) <= EPSILON &&
            owner.id.localeCompare(earliest.killerId ?? "") < 0)
        ) {
          earliest = {
            victimId: attacker.id,
            cause: "collision",
            killerId: owner.id,
            collisionTime,
          };
        }
      }
    }

    const maximumCenterDistance =
      state.config.arenaRadius - getPlayerRadius(attacker, state.config);
    if (magnitudeSquared(attacker.position) > maximumCenterDistance ** 2) {
      const boundaryDeath: DeathCandidate = {
        victimId: attacker.id,
        cause: "boundary",
        collisionTime: 1,
      };
      if (!earliest || boundaryDeath.collisionTime < earliest.collisionTime) {
        earliest = boundaryDeath;
      }
    }

    if (earliest) candidates.set(attacker.id, earliest);
  }

  return [...candidates.values()].sort((first, second) =>
    first.victimId.localeCompare(second.victimId),
  );
}

/**
 * Samples a defeated creature's final centerline from head through tail. The
 * result deliberately has no random radial offset: the collectible hoard must
 * retain the recognizable shape of the creature that produced it.
 */
export function sampleDeathTracePositions(
  player: Pick<PlayerState, "position" | "body">,
  count: number,
): Vec2[] {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error("Death trace sample count must be a positive safe integer");
  }
  const points = [player.position, ...player.body];
  const cumulativeLengths = [0];
  let totalLength = 0;
  for (let index = 1; index < points.length; index += 1) {
    totalLength += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
    cumulativeLengths.push(totalLength);
  }

  if (totalLength <= EPSILON) {
    return Array.from({ length: count }, () => cloneVec(player.position));
  }

  let segmentIndex = 1;
  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0.5 : index / (count - 1);
    const targetLength = totalLength * ratio;
    while (
      segmentIndex < cumulativeLengths.length - 1 &&
      cumulativeLengths[segmentIndex] < targetLength
    ) {
      segmentIndex += 1;
    }
    const previousLength = cumulativeLengths[segmentIndex - 1];
    const nextLength = cumulativeLengths[segmentIndex];
    const segmentRatio = nextLength - previousLength <= EPSILON
      ? 0
      : (targetLength - previousLength) / (nextLength - previousLength);
    const previous = points[segmentIndex - 1];
    const next = points[segmentIndex];
    return {
      x: previous.x + (next.x - previous.x) * segmentRatio,
      y: previous.y + (next.y - previous.y) * segmentRatio,
    };
  });
}

function createDeathDrops(state: GameState, player: PlayerState): void {
  // A boost can have shed less than one full configured drop when death occurs.
  // Release that buffered fraction here so simulation mass is never destroyed.
  const releasedMass = player.mass + player.shedMassRemainder;
  player.shedMassRemainder = 0;
  const count = Math.max(
    1,
    Math.min(
      state.config.maximumDeathDrops,
      Math.ceil(releasedMass / state.config.deathDropTargetMass),
    ),
  );
  const massPerDrop = releasedMass / count;
  const visibleMassPerDrop = Math.min(
    massPerDrop,
    state.config.deathDropTargetMass,
  );
  const spread = Math.max(
    getPlayerRadius(player, state.config) * 2,
    Math.sqrt(count) * state.config.dropRadius * 2,
  );
  const tracePositions = sampleDeathTracePositions(player, count);

  for (let index = 0; index < count; index += 1) {
    // Preserve the historical deterministic RNG stream so unrelated future
    // spawns do not change merely because drop placement became non-random.
    const randomOffset = randomPointInCircle(state.randomState, spread);
    state.randomState = randomOffset.state;
    spawnDrop(state, {
      position: tracePositions[index],
      mass: visibleMassPerDrop,
      bankedMass: massPerDrop - visibleMassPerDrop,
      source: "death",
      originPlayerId: player.id,
    });
  }
}

export function isSpecialistActive(
  state: Readonly<GameState>,
  player: Readonly<PlayerState>,
  specialist: SpecialistKind = "collector",
): boolean {
  return Boolean(
    player.alive &&
    player.specialist?.kind === specialist &&
    isRelicActiveAtTick(player.specialist, state.tick, "loot-compass")
  );
}

/**
 * Sprint and crash Echoes are arena drama, not an unbounded room-history list.
 * Array position is the authoritative age order. The oldest Echo becomes the
 * merge seed; overflow prefers the nearest Echoes from that same producer,
 * then nearest other Echoes, with original array order as the final tie-break.
 *
 * Only one ordinary-sized pickup remains visible. Every other unit of mass is
 * conserved in an authoritative bank which is deliberately omitted from the
 * public wire shape. A fresh replacement ID makes the removal/upsert explicit
 * to delta clients instead of silently mutating an already-broadcast drop.
 */
function compactTransientSource(
  state: GameState,
  source: "boost" | "death",
  maximum: number,
): void {
  const sourceDrops = state.drops.filter((drop) => drop.source === source);
  const overflow = sourceDrops.length - maximum;
  if (overflow <= 0) return;

  const seed = sourceDrops[0];
  const mergeCandidates = sourceDrops
    .slice(1)
    .map((drop, index) => ({
      drop,
      index,
      sameOrigin: drop.originPlayerId === seed.originPlayerId,
      distance: distanceSquared(drop.position, seed.position),
    }))
    .sort((first, second) =>
      Number(second.sameOrigin) - Number(first.sameOrigin) ||
      first.distance - second.distance ||
      first.index - second.index
    );
  // Folding overflow + the oldest seed into one replacement reduces the source
  // count by exactly `overflow` while keeping merge selection deterministic.
  const mergedDrops = [
    seed,
    ...mergeCandidates.slice(0, overflow).map((candidate) => candidate.drop),
  ];
  const mergedIds = new Set(mergedDrops.map((drop) => drop.id));
  const storedMass = mergedDrops.reduce(
    (sum, drop) => sum + getDropStoredMass(drop),
    0,
  );
  if (!Number.isFinite(storedMass) || storedMass <= 0) {
    throw new Error(`Compacted ${source} Echo mass must remain positive and finite`);
  }
  const weightedPosition = mergedDrops.reduce(
    (position, drop) => ({
      x: position.x + drop.position.x * getDropStoredMass(drop),
      y: position.y + drop.position.y * getDropStoredMass(drop),
    }),
    { x: 0, y: 0 },
  );
  const origins = new Set(mergedDrops.map((drop) => drop.originPlayerId));
  const sharedOrigin = origins.size === 1 ? mergedDrops[0].originPlayerId : undefined;
  const blockedPlayers = new Set(mergedDrops.map((drop) => drop.blockedPlayerId));
  const sharedBlockedPlayer = blockedPlayers.size === 1
    ? mergedDrops[0].blockedPlayerId
    : undefined;
  const latestOwnerLock = Math.max(
    0,
    ...mergedDrops.map((drop) => drop.blockedUntilTick),
  );
  const globalPickupLock = Math.max(
    0,
    ...mergedDrops.map((drop) => drop.pickupBlockedUntilTick ?? 0),
    ...(source === "boost" && !sharedBlockedPlayer ? [latestOwnerLock] : []),
  );
  const visibleMassLimit = source === "boost"
    ? state.config.shedDropMass
    : state.config.deathDropTargetMass;
  const visibleMass = Math.min(storedMass, visibleMassLimit);

  state.drops = state.drops.filter((drop) => !mergedIds.has(drop.id));
  spawnDrop(state, {
    position: {
      x: weightedPosition.x / storedMass,
      y: weightedPosition.y / storedMass,
    },
    mass: visibleMass,
    bankedMass: storedMass - visibleMass,
    radius: Math.max(...mergedDrops.map((drop) => drop.radius)),
    source,
    originPlayerId: sharedOrigin,
    blockedPlayerId: source === "boost" ? sharedBlockedPlayer : undefined,
    blockedUntilTick: source === "boost" && sharedBlockedPlayer
      ? latestOwnerLock
      : 0,
    pickupBlockedUntilTick: globalPickupLock,
  });
}

function compactTransientDrops(state: GameState): void {
  let boostDropCount = 0;
  let deathDropCount = 0;
  for (const drop of state.drops) {
    if (drop.source === "boost") boostDropCount += 1;
    else if (drop.source === "death") deathDropCount += 1;
  }

  // Practice advances the authoritative core in the browser. Avoid allocating
  // and sorting full drop lists on every fixed tick while both transient
  // classes are already inside their caps; the deterministic merge path is
  // needed only on the ticks that actually overflow.
  if (boostDropCount > state.config.maximumBoostDropsInWorld) {
    compactTransientSource(
      state,
      "boost",
      state.config.maximumBoostDropsInWorld,
    );
  }
  if (deathDropCount > state.config.maximumDeathDropsInWorld) {
    compactTransientSource(
      state,
      "death",
      state.config.maximumDeathDropsInWorld,
    );
  }
}

export function isRelicActive(
  state: Readonly<GameState>,
  player: Readonly<PlayerState>,
  relicKind: PirateRelicKind,
): boolean {
  return Boolean(
    player.alive &&
    isRelicActiveAtTick(player.specialist, state.tick, relicKind),
  );
}

export function getRelicSecondsRemaining(
  state: Readonly<GameState>,
  player: Readonly<PlayerState>,
  relicKind: PirateRelicKind,
): number {
  if (!isRelicActive(state, player, relicKind)) return 0;
  return Math.max(
    0,
    (player.specialist!.expiresAtTick - state.tick) * state.config.fixedStepSeconds,
  );
}

export function getSpecialistSecondsRemaining(
  state: Readonly<GameState>,
  player: Readonly<PlayerState>,
  specialist: SpecialistKind = "collector",
): number {
  if (!isSpecialistActive(state, player, specialist)) return 0;
  return Math.max(
    0,
    (player.specialist!.expiresAtTick - state.tick) * state.config.fixedStepSeconds,
  );
}

function expireSpecialists(state: GameState, events: GameEvent[]): void {
  const players = Object.values(state.players).sort((first, second) =>
    first.id.localeCompare(second.id),
  );
  for (const player of players) {
    const active = player.specialist;
    if (!active || state.tick < active.expiresAtTick) continue;
    player.specialist = undefined;
    events.push({
      type: "specialistExpired",
      tick: state.tick,
      playerId: player.id,
      specialist: active.kind,
      ...(active.relicKind ? { relicKind: active.relicKind } : {}),
      ...(active.relicTier ? { relicTier: active.relicTier } : {}),
    });
  }
}

function resolveDeaths(
  state: GameState,
  deaths: readonly DeathCandidate[],
  events: GameEvent[],
): void {
  for (const death of deaths) {
    const victim = state.players[death.victimId];
    if (!victim?.alive) continue;

    victim.alive = false;
    victim.diedAtTick = state.tick;
    victim.killedBy = death.killerId;
    victim.deathCause = death.cause;
    victim.specialist = undefined;

    if (death.killerId && state.players[death.killerId]) {
      state.players[death.killerId].stats.kills += 1;
    }
    createDeathDrops(state, victim);
    events.push({
      type: "playerDied",
      tick: state.tick,
      playerId: victim.id,
      cause: death.cause,
      killerId: death.killerId,
      collisionTime: death.collisionTime,
    });
  }
}

function collectDrops(state: GameState, events: GameEvent[]): void {
  const livingPlayers = Object.values(state.players)
    .filter((player) => player.alive)
    .sort((first, second) => first.id.localeCompare(second.id));
  const remainingDrops: DropState[] = [];
  const bankReleases: SpawnDropOptions[] = [];
  // Snapshot at the start of collection so a beacon never expands reach for
  // later array entries in the same tick. Drop order cannot grant hidden range.
  const activeCollectors = new Set(
    livingPlayers
      .filter((player) => isRelicActive(state, player, "loot-compass"))
      .map((player) => player.id),
  );

  for (const drop of state.drops) {
    let collector: PlayerState | undefined;
    let collectorDistance = Infinity;

    for (const player of livingPlayers) {
      if (
        state.tick < (drop.pickupBlockedUntilTick ?? 0) ||
        (
          drop.blockedPlayerId === player.id &&
          state.tick < drop.blockedUntilTick
        )
      ) {
        continue;
      }

      const collectorMayExtendReach =
        activeCollectors.has(player.id) &&
        (drop.collectorReachPolicy === "neutral" ||
          (drop.collectorReachPolicy === "owner" &&
            drop.originPlayerId === player.id));
      const basePickupRadius = getPlayerRadius(player, state.config) + drop.radius;
      const pickupRadius = collectorMayExtendReach
        ? basePickupRadius * state.config.collectorPickupRadiusMultiplier
        : basePickupRadius;
      const squaredDistance = distanceSquared(player.position, drop.position);
      if (squaredDistance > pickupRadius * pickupRadius) continue;

      if (
        squaredDistance < collectorDistance - EPSILON ||
        (Math.abs(squaredDistance - collectorDistance) <= EPSILON &&
          player.id.localeCompare(collector?.id ?? "") < 0)
      ) {
        collector = player;
        collectorDistance = squaredDistance;
      }
    }

    if (!collector) {
      remainingDrops.push(drop);
      continue;
    }

    const storedMass = getDropStoredMass(drop);
    const collectedMass = drop.source === "boost"
      ? Math.min(storedMass, state.config.shedDropMass)
      : drop.source === "death"
        ? Math.min(storedMass, state.config.deathDropTargetMass)
        : storedMass;
    const bankRemainder = storedMass - collectedMass;
    const treasureMultiplier = drop.source === "arena" && collectedMass > 0
      ? getTreasureMassMultiplier(collector.specialist, state.tick)
      : 1;
    const awardedMass = collectedMass * treasureMultiplier;
    collector.mass += awardedMass;
    collector.stats.collectedMass += awardedMass;
    collector.stats.peakMass = Math.max(collector.stats.peakMass, collector.mass);
    events.push({
      type: "dropCollected",
      tick: state.tick,
      playerId: collector.id,
      dropId: drop.id,
      mass: awardedMass,
    });
    if (bankRemainder > EPSILON) {
      const visibleMassLimit = drop.source === "boost"
        ? state.config.shedDropMass
        : state.config.deathDropTargetMass;
      const nextVisibleMass = Math.min(bankRemainder, visibleMassLimit);
      bankReleases.push({
        position: drop.position,
        mass: nextVisibleMass,
        bankedMass: bankRemainder - nextVisibleMass,
        radius: drop.radius,
        source: drop.source,
        originPlayerId: drop.originPlayerId,
        collectorReachPolicy: drop.collectorReachPolicy,
        blockedPlayerId: drop.blockedPlayerId,
        blockedUntilTick: drop.blockedUntilTick,
        pickupBlockedUntilTick: Math.max(
          drop.pickupBlockedUntilTick ?? 0,
          state.tick + 1,
        ),
      });
    }
    const relicKind = getDropRelicKind(drop);
    if (relicKind) {
      const durationTicks = drop.relicDurationTicks ??
        drop.specialistDurationTicks ??
        Math.max(
          1,
          Math.ceil(
            (relicKind === "loot-compass"
              ? state.config.collectorDurationSeconds
              : getPirateRelicSpec(relicKind).durationSeconds) /
              state.config.fixedStepSeconds,
          ),
        );
      const previousRelic = collector.specialist;
      if (previousRelic && state.tick < previousRelic.expiresAtTick) {
        events.push({
          type: "specialistExpired",
          tick: state.tick,
          playerId: collector.id,
          specialist: previousRelic.kind,
          ...(previousRelic.relicKind
            ? { relicKind: previousRelic.relicKind }
            : {}),
          ...(previousRelic.relicTier ? { relicTier: previousRelic.relicTier } : {}),
        });
      }
      collector.specialist = {
        kind: "collector",
        ...(relicKind === "loot-compass" ? {} : { relicKind }),
        ...(drop.relicTier ? { relicTier: drop.relicTier } : {}),
        activatedAtTick: state.tick,
        expiresAtTick: state.tick + durationTicks,
        durationTicks,
      };
      events.push({
        type: "specialistActivated",
        tick: state.tick,
        playerId: collector.id,
        dropId: drop.id,
        specialist: "collector",
        ...(relicKind === "loot-compass" ? {} : { relicKind }),
        ...(drop.relicTier ? { relicTier: drop.relicTier } : {}),
        durationTicks,
      });
    }
  }

  state.drops = remainingDrops;
  for (const release of bankReleases) spawnDrop(state, release);
  for (const player of livingPlayers) syncBodyLength(player, state.config);
}

function getChargingStationConfig(state: Readonly<GameState>, stationId: string) {
  const station = state.board.chargingStations.find((candidate) => candidate.id === stationId);
  if (!station) throw new Error(`Missing charging station config for ${stationId}`);
  return station;
}

/**
 * A completed physical wrap latches to the dock while it charges. Boost is the
 * universal cast-off input: it releases the latch and resumes ordinary motion.
 * The latch freezes no rival and grants no collision or shield exception.
 */
function isPlayerMooredForCharging(
  state: Readonly<GameState>,
  player: Readonly<PlayerState>,
): boolean {
  if (player.lastInput.boost) return false;
  for (const chargingState of Object.values(state.chargingStations)) {
    if (
      chargingState.phase !== "charging" ||
      chargingState.playerId !== player.id
    ) {
      continue;
    }
    const station = getChargingStationConfig(state, chargingState.stationId);
    const geometry = evaluateChargingWrap(player, station);
    if (
      geometry.valid &&
      geometry.windingDirection === chargingState.windingDirection
    ) {
      return true;
    }
  }
  return false;
}

function cooldownTicks(seconds: number, fixedStepSeconds: number): number {
  return Math.max(0, Math.ceil(seconds / fixedStepSeconds));
}

function resetChargingStateToReady(
  chargingState: GameState["chargingStations"][string],
): void {
  chargingState.phase = "ready";
  chargingState.playerId = undefined;
  chargingState.windingDirection = 0;
  chargingState.progressTicks = 0;
  chargingState.graceTicksRemaining = 0;
  chargingState.cooldownTicksRemaining = 0;
  chargingState.massAwarded = 0;
}

function advanceValidCharge(
  state: GameState,
  chargingState: GameState["chargingStations"][string],
  player: PlayerState,
  events: GameEvent[],
): void {
  const station = getChargingStationConfig(state, chargingState.stationId);
  if (chargingState.phase === "interrupted") {
    chargingState.phase = "charging";
    events.push({
      type: "chargingResumed",
      tick: state.tick,
      stationId: station.id,
      playerId: player.id,
      progressTicks: chargingState.progressTicks,
    });
  }

  chargingState.phase = "charging";
  chargingState.graceTicksRemaining = cooldownTicks(
    station.interruptionGraceSeconds,
    state.config.fixedStepSeconds,
  );
  chargingState.progressTicks = Math.min(
    chargingState.requiredTicks,
    chargingState.progressTicks + 1,
  );

  // Award against the progress high-water mark. Decay and resume can never
  // mint the same partial reward twice.
  const targetMassAward = station.massReward *
    (chargingState.progressTicks / chargingState.requiredTicks);
  const incrementalMass = Math.max(0, targetMassAward - chargingState.massAwarded);
  if (incrementalMass > EPSILON) {
    chargingState.massAwarded = targetMassAward;
    player.mass += incrementalMass;
    player.stats.peakMass = Math.max(player.stats.peakMass, player.mass);
    syncBodyLength(player, state.config);
  }

  if (chargingState.progressTicks < chargingState.requiredTicks) return;

  // Set the configured total exactly on completion so floating-point addition
  // cannot drift the public result between different render chunking.
  const finalAdjustment = station.massReward - chargingState.massAwarded;
  if (finalAdjustment > EPSILON) {
    chargingState.massAwarded = station.massReward;
    player.mass += finalAdjustment;
    player.stats.peakMass = Math.max(player.stats.peakMass, player.mass);
    syncBodyLength(player, state.config);
  }
  const completedMass = chargingState.massAwarded;
  chargingState.phase = "cooldown";
  chargingState.cooldownTicksRemaining = cooldownTicks(
    station.completionCooldownSeconds,
    state.config.fixedStepSeconds,
  );
  chargingState.graceTicksRemaining = 0;
  events.push({
    type: "chargingCompleted",
    tick: state.tick,
    stationId: station.id,
    playerId: player.id,
    massAwarded: completedMass,
    cooldownTicks: chargingState.cooldownTicksRemaining,
  });
}

function updateChargingStations(state: GameState, events: GameEvent[]): void {
  if (state.board.chargingStations.length === 0) return;

  const reservedPlayers = new Set(
    Object.values(state.chargingStations)
      .filter((station) =>
        (station.phase === "charging" || station.phase === "interrupted") &&
        station.playerId !== undefined
      )
      .map((station) => station.playerId as PlayerId),
  );
  const players = Object.values(state.players)
    .filter((player) => player.alive)
    .sort((first, second) => first.id.localeCompare(second.id));
  const stations = [...state.board.chargingStations]
    .sort((first, second) => first.id.localeCompare(second.id));

  for (const station of stations) {
    const chargingState = state.chargingStations[station.id];
    if (!chargingState) continue;

    if (chargingState.phase === "cooldown") {
      chargingState.cooldownTicksRemaining = Math.max(
        0,
        chargingState.cooldownTicksRemaining - 1,
      );
      if (chargingState.cooldownTicksRemaining === 0) {
        resetChargingStateToReady(chargingState);
      }
      continue;
    }

    if (chargingState.playerId) {
      const player = state.players[chargingState.playerId];
      const geometry = player?.alive
        ? evaluateChargingWrap(player, station)
        : undefined;
      const remainsValid = Boolean(
        player?.alive &&
        !player.lastInput.boost &&
        geometry?.valid &&
        geometry.windingDirection === chargingState.windingDirection,
      );

      if (remainsValid && player) {
        advanceValidCharge(state, chargingState, player, events);
        continue;
      }

      if (chargingState.phase === "charging") {
        chargingState.phase = "interrupted";
        chargingState.graceTicksRemaining = cooldownTicks(
          station.interruptionGraceSeconds,
          state.config.fixedStepSeconds,
        );
        events.push({
          type: "chargingInterrupted",
          tick: state.tick,
          stationId: station.id,
          playerId: chargingState.playerId,
          progressTicks: chargingState.progressTicks,
        });
        continue;
      }

      if (chargingState.graceTicksRemaining > 0) {
        chargingState.graceTicksRemaining -= 1;
        continue;
      }
      chargingState.progressTicks = Math.max(
        0,
        chargingState.progressTicks - station.interruptionDecayTicksPerTick,
      );
      if (chargingState.progressTicks > 0) continue;

      const interruptedPlayerId = chargingState.playerId;
      const awardedMass = chargingState.massAwarded;
      chargingState.phase = "cooldown";
      chargingState.playerId = undefined;
      chargingState.windingDirection = 0;
      chargingState.cooldownTicksRemaining = cooldownTicks(
        station.resetCooldownSeconds,
        state.config.fixedStepSeconds,
      );
      chargingState.graceTicksRemaining = 0;
      chargingState.massAwarded = 0;
      events.push({
        type: "chargingReset",
        tick: state.tick,
        stationId: station.id,
        playerId: interruptedPlayerId,
        massAwarded: awardedMass,
      });
      continue;
    }

    const candidate = players.find((player) => {
      if (reservedPlayers.has(player.id) || player.lastInput.boost) return false;
      return evaluateChargingWrap(player, station).valid;
    });
    if (!candidate) continue;

    const geometry = evaluateChargingWrap(candidate, station);
    if (!geometry.valid || geometry.windingDirection === 0) continue;
    reservedPlayers.add(candidate.id);
    chargingState.playerId = candidate.id;
    chargingState.windingDirection = geometry.windingDirection;
    chargingState.progressTicks = 0;
    chargingState.massAwarded = 0;
    chargingState.phase = "charging";
    events.push({
      type: "chargingStarted",
      tick: state.tick,
      stationId: station.id,
      playerId: candidate.id,
      windingDirection: geometry.windingDirection,
      requiredTicks: chargingState.requiredTicks,
    });
    advanceValidCharge(state, chargingState, candidate, events);
  }
}

export function stepGame(
  state: GameState,
  inputs: PlayerInputMap = {},
  botProviders: BotInputProviderMap = {},
): GameStepResult {
  state.tick += 1;
  const events: GameEvent[] = [];
  expireSpecialists(state, events);
  const playerIds = Object.keys(state.players).sort();
  const playerRefs = playerIds.map((playerId) => state.players[playerId]);

  for (const playerId of playerIds) {
    const player = state.players[playerId];
    if (!player.alive) continue;

    const botInput =
      !inputs[playerId] && player.kind === "bot"
        ? botProviders[playerId]?.nextInput(buildBotContext(state, player, playerRefs))
        : undefined;
    acceptInput(player, inputs[playerId] ?? botInput);
  }

  for (const playerId of playerIds) {
    const player = state.players[playerId];
    if (!player.alive) continue;

    snapshotPreviousGeometry(player);
    player.stats.survivalTicks += 1;

    if (isPlayerMooredForCharging(state, player)) {
      continue;
    }

    const maximumTurn = isRelicActiveAtTick(
        player.specialist,
        state.tick,
        "maelstrom-wheel",
      )
      ? Math.PI
      : getTurnRate(player, state.config) * state.config.fixedStepSeconds;
    player.direction = rotateToward(
      player.direction,
      normalize(player.lastInput.direction, player.direction),
      maximumTurn,
    );

    const canBoost = isPlayerBoosting(player, state.config);
    const speed = (canBoost ? state.config.boostSpeed : state.config.baseSpeed) *
      getMovementSpeedMultiplier(player.specialist, state.tick);
    player.position.x += player.direction.x * speed * state.config.fixedStepSeconds;
    player.position.y += player.direction.y * speed * state.config.fixedStepSeconds;

    if (canBoost) {
      const massLost = Math.min(
        state.config.boostMassPerSecond *
          getBoostMassCostMultiplier(player.specialist, state.tick) *
          state.config.fixedStepSeconds,
        player.mass - state.config.minimumBoostMass,
      );
      player.mass -= massLost;
      shedBoostMass(state, player, massLost, events);
      syncBodyLength(player, state.config);
    }

    updateBodyPositions(player, state.config);
  }

  resolveDeaths(state, findCollisionDeaths(state), events);
  collectDrops(state, events);
  compactTransientDrops(state);
  updateChargingStations(state, events);

  for (const player of Object.values(state.players)) {
    if (player.alive && player.shieldTicksRemaining > 0) {
      player.shieldTicksRemaining -= 1;
    }
  }

  return { tick: state.tick, events };
}

export function advanceGame(
  state: GameState,
  elapsedSeconds: number,
  inputs: PlayerInputMap = {},
  botProviders: BotInputProviderMap = {},
): GameStepResult[] {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new Error("elapsedSeconds must be a non-negative finite number");
  }

  state.accumulatorSeconds += elapsedSeconds;
  const results: GameStepResult[] = [];

  while (state.accumulatorSeconds + EPSILON >= state.config.fixedStepSeconds) {
    results.push(stepGame(state, inputs, botProviders));
    state.accumulatorSeconds -= state.config.fixedStepSeconds;
    if (Math.abs(state.accumulatorSeconds) < EPSILON) {
      state.accumulatorSeconds = 0;
    }
  }

  return results;
}

export function calculateScore(
  player: PlayerState,
  config: Readonly<GameConfig>,
): number {
  const growth = Math.max(0, player.stats.peakMass - config.startMass);
  const survivalSeconds = player.stats.survivalTicks * config.fixedStepSeconds;
  return Math.round(
    growth * 10 +
      player.stats.collectedMass * 2 +
      player.stats.kills * 500 +
      survivalSeconds * 3,
  );
}

export function getRankings(
  state: GameState,
  metric: "mass" | "score" = "mass",
  includeDead = false,
): RankedPlayer[] {
  const ranked = Object.values(state.players)
    .filter((player) => includeDead || player.alive)
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      mass: player.mass,
      score: calculateScore(player, state.config),
      kills: player.stats.kills,
    }))
    .sort((first, second) => {
      const primary = metric === "mass"
        ? second.mass - first.mass
        : second.score - first.score;
      if (Math.abs(primary) > EPSILON) return primary;
      if (second.kills !== first.kills) return second.kills - first.kills;
      return first.playerId.localeCompare(second.playerId);
    });

  return ranked.map((player, index) => ({ ...player, rank: index + 1 }));
}

export function getPlayerRank(
  state: GameState,
  playerId: PlayerId,
  metric: "mass" | "score" = "mass",
  includeDead = false,
): number | null {
  return getRankings(state, metric, includeDead).find(
    (player) => player.playerId === playerId,
  )?.rank ?? null;
}
