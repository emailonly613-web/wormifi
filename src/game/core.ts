import {
  hashSeed,
  randomPointInCircle,
  randomUnitVector,
} from "./random";
import type {
  BotInputContext,
  BotInputProviderMap,
  CollisionRadiusConfig,
  DropState,
  GameConfig,
  GameEvent,
  GameState,
  GameStepResult,
  PlayerId,
  PlayerInput,
  PlayerInputMap,
  PlayerState,
  RankedPlayer,
  SpawnDropOptions,
  SpawnPlayerOptions,
  SpecialistKind,
  Vec2,
} from "./types";

const EPSILON = 1e-9;
const TAU = Math.PI * 2;

export const DEFAULT_GAME_CONFIG: Readonly<GameConfig> = Object.freeze({
  fixedStepSeconds: 1 / 30,
  arenaRadius: 5_000,
  spawnRadiusFactor: 0.62,
  spawnAttempts: 12,
  startMass: 100,
  minimumMass: 40,
  minimumBoostMass: 60,
  baseSpeed: 235,
  boostSpeed: 330,
  boostMassPerSecond: 12,
  shedDropMass: 2,
  shedPickupLockSeconds: 1.25,
  maximumTurnRadiansPerSecond: (270 * Math.PI) / 180,
  minimumTurnRadiansPerSecond: (145 * Math.PI) / 180,
  turnMassScale: 420,
  baseRadius: 9,
  massRadiusFactor: 0.42,
  bodyRadiusFactor: 0.88,
  segmentSpacingFactor: 1.35,
  startingBodySegments: 8,
  minimumBodySegments: 3,
  massPerSegment: 20,
  spawnShieldSeconds: 2.5,
  dropRadius: 4,
  deathDropTargetMass: 5,
  maximumDeathDrops: 80,
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
  if (config.minimumBodySegments < 1) {
    throw new Error("minimumBodySegments must be at least one");
  }
  if (config.startingBodySegments < config.minimumBodySegments) {
    throw new Error("startingBodySegments cannot be below minimumBodySegments");
  }
  if (config.maximumDeathDrops < 1 || config.deathDropTargetMass <= 0) {
    throw new Error("death drop settings must be positive");
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
): GameState {
  const config: GameConfig = { ...DEFAULT_GAME_CONFIG, ...overrides };
  validateConfig(config);

  return {
    config,
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

function getTargetBodyLength(player: PlayerState, config: GameConfig): number {
  const growthSegments = Math.floor(
    (player.mass - config.startMass) / config.massPerSegment,
  );
  return Math.max(
    config.minimumBodySegments,
    config.startingBodySegments + growthSegments,
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
  let bestPosition: Vec2 = { x: 0, y: 0 };
  let bestClearance = -Infinity;

  for (let attempt = 0; attempt < state.config.spawnAttempts; attempt += 1) {
    const candidate = randomPointInCircle(state.randomState, spawnRadius);
    state.randomState = candidate.state;

    const clearance = livingPlayers.length === 0
      ? state.config.arenaRadius
      : Math.min(
          ...livingPlayers.map((player) =>
            Math.sqrt(distanceSquared(candidate.value, player.position)),
          ),
        );

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
  const isSpecialistPickup = options.specialist !== undefined;
  if (
    !Number.isFinite(options.mass) ||
    options.mass < 0 ||
    (options.mass === 0 && !isSpecialistPickup) ||
    (isSpecialistPickup && options.mass !== 0)
  ) {
    throw new Error("Drop mass must be positive; specialist pickups must be zero-mass");
  }

  const source = options.source ?? "arena";
  const specialistDurationSeconds =
    options.specialistDurationSeconds ?? state.config.collectorDurationSeconds;
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

  const drop: DropState = {
    id: options.id ?? `drop-${state.nextEntityNumber++}`,
    position: cloneVec(options.position),
    mass: options.mass,
    radius: options.radius ?? state.config.dropRadius,
    source,
    originPlayerId: options.originPlayerId,
    specialist: options.specialist,
    specialistDurationTicks: isSpecialistPickup
      ? Math.max(
          1,
          Math.ceil(specialistDurationSeconds / state.config.fixedStepSeconds),
        )
      : undefined,
    collectorReachPolicy,
    blockedPlayerId: options.blockedPlayerId,
    blockedUntilTick: options.blockedUntilTick ?? 0,
  };

  if (state.drops.some((existing) => existing.id === drop.id)) {
    throw new Error(`Drop ${drop.id} already exists`);
  }
  state.drops.push(drop);
  return drop;
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
    const awayFromLeader = normalize(
      { x: segment.x - leader.x, y: segment.y - leader.y },
      { x: -player.direction.x, y: -player.direction.y },
    );
    segment.x = leader.x + awayFromLeader.x * spacing;
    segment.y = leader.y + awayFromLeader.y * spacing;
    leader = segment;
  }
}

function buildBotContext(state: GameState, player: PlayerState): BotInputContext {
  const playerIds = Object.keys(state.players).sort();
  return {
    tick: state.tick,
    deltaSeconds: state.config.fixedStepSeconds,
    config: state.config,
    self: player,
    players: playerIds.map((id) => state.players[id]),
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

function findCollisionDeaths(state: GameState): DeathCandidate[] {
  const players = Object.values(state.players)
    .filter((player) => player.alive)
    .sort((first, second) => first.id.localeCompare(second.id));
  const candidates = new Map<PlayerId, DeathCandidate>();

  for (const attacker of players) {
    if (attacker.shieldTicksRemaining > 0) continue;

    let earliest: DeathCandidate | undefined;
    for (const owner of players) {
      if (owner.id === attacker.id || owner.shieldTicksRemaining > 0) continue;

      const combinedRadius =
        getPlayerRadius(attacker, state.config) + getBodyRadius(owner, state.config);
      for (let index = 0; index < owner.body.length; index += 1) {
        const currentBody = owner.body[index];
        const previousBody = owner.previousBody[index] ?? currentBody;
        const collisionTime = sweptCircleHitTime(
          attacker.previousPosition,
          attacker.position,
          getPlayerRadius(attacker, state.config),
          previousBody,
          currentBody,
          getBodyRadius(owner, state.config),
        );
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
  const spread = Math.max(
    getPlayerRadius(player, state.config) * 2,
    Math.sqrt(count) * state.config.dropRadius * 2,
  );

  for (let index = 0; index < count; index += 1) {
    const randomOffset = randomPointInCircle(state.randomState, spread);
    state.randomState = randomOffset.state;
    spawnDrop(state, {
      position: {
        x: player.position.x + randomOffset.value.x,
        y: player.position.y + randomOffset.value.y,
      },
      mass: massPerDrop,
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
    state.tick < player.specialist.expiresAtTick
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
  // Snapshot at the start of collection so a beacon never expands reach for
  // later array entries in the same tick. Drop order cannot grant hidden range.
  const activeCollectors = new Set(
    livingPlayers
      .filter((player) => isSpecialistActive(state, player, "collector"))
      .map((player) => player.id),
  );

  for (const drop of state.drops) {
    let collector: PlayerState | undefined;
    let collectorDistance = Infinity;

    for (const player of livingPlayers) {
      if (
        drop.blockedPlayerId === player.id &&
        state.tick < drop.blockedUntilTick
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

    collector.mass += drop.mass;
    collector.stats.collectedMass += drop.mass;
    collector.stats.peakMass = Math.max(collector.stats.peakMass, collector.mass);
    events.push({
      type: "dropCollected",
      tick: state.tick,
      playerId: collector.id,
      dropId: drop.id,
      mass: drop.mass,
    });
    if (drop.specialist) {
      const durationTicks = drop.specialistDurationTicks ?? Math.max(
        1,
        Math.ceil(
          state.config.collectorDurationSeconds / state.config.fixedStepSeconds,
        ),
      );
      collector.specialist = {
        kind: drop.specialist,
        activatedAtTick: state.tick,
        expiresAtTick: state.tick + durationTicks,
        durationTicks,
      };
      events.push({
        type: "specialistActivated",
        tick: state.tick,
        playerId: collector.id,
        dropId: drop.id,
        specialist: drop.specialist,
        durationTicks,
      });
    }
  }

  state.drops = remainingDrops;
  for (const player of livingPlayers) syncBodyLength(player, state.config);
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

  for (const playerId of playerIds) {
    const player = state.players[playerId];
    if (!player.alive) continue;

    const botInput =
      !inputs[playerId] && player.kind === "bot"
        ? botProviders[playerId]?.nextInput(buildBotContext(state, player))
        : undefined;
    acceptInput(player, inputs[playerId] ?? botInput);
  }

  for (const playerId of playerIds) {
    const player = state.players[playerId];
    if (!player.alive) continue;

    player.previousPosition = cloneVec(player.position);
    player.previousBody = player.body.map(cloneVec);
    player.stats.survivalTicks += 1;

    const maximumTurn =
      getTurnRate(player, state.config) * state.config.fixedStepSeconds;
    player.direction = rotateToward(
      player.direction,
      normalize(player.lastInput.direction, player.direction),
      maximumTurn,
    );

    const canBoost =
      player.lastInput.boost && player.mass > state.config.minimumBoostMass + EPSILON;
    const speed = canBoost ? state.config.boostSpeed : state.config.baseSpeed;
    player.position.x += player.direction.x * speed * state.config.fixedStepSeconds;
    player.position.y += player.direction.y * speed * state.config.fixedStepSeconds;

    if (canBoost) {
      const massLost = Math.min(
        state.config.boostMassPerSecond * state.config.fixedStepSeconds,
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
