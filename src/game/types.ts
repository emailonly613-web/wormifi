export type PlayerId = string;
export type DropId = string;

export interface Vec2 {
  x: number;
  y: number;
}

export type PlayerKind = "human" | "bot";
export type SpecialistKind = "collector";
export type PirateRelicKind =
  | "loot-compass"
  | "emerald-spyglass"
  | "pepper-cutlass"
  | "gale-pennant"
  | "maelstrom-wheel"
  | "gilded-ledger";
export type TreasureMultiplierTier = 2 | 5 | 10;
export type ChargingStationKind = "capstan" | "harbor";

/**
 * Static, server-owned geometry and tuning for a wrap charging station. A
 * board with an empty station list is behaviorally identical to the original
 * open arena.
 */
export interface ChargingStationConfig {
  id: string;
  name: string;
  /** Omitted legacy/custom stations retain the original capstan behavior. */
  kind?: ChargingStationKind;
  position: Vec2;
  coreRadius: number;
  wrapRadius: number;
  wrapTolerance: number;
  dockAngleRadians: number;
  dockRadius: number;
  requiredWrapRadians: number;
  minimumWrappedSegments: number;
  chargeDurationSeconds: number;
  massReward: number;
  interruptionGraceSeconds: number;
  interruptionDecayTicksPerTick: number;
  completionCooldownSeconds: number;
  resetCooldownSeconds: number;
}

export interface GameBoardConfig {
  id: string;
  name: string;
  chargingStations: ChargingStationConfig[];
}

export type ChargingStationPhase =
  | "ready"
  | "charging"
  | "interrupted"
  | "cooldown";

/** Dynamic station truth; only the deterministic core mutates this state. */
export interface ChargingStationState {
  stationId: string;
  phase: ChargingStationPhase;
  playerId?: PlayerId;
  windingDirection: -1 | 0 | 1;
  progressTicks: number;
  requiredTicks: number;
  graceTicksRemaining: number;
  cooldownTicksRemaining: number;
  massAwarded: number;
  /** Legacy harbor-lap snapshot fields retained for replay compatibility. */
  lapStartAngleRadians?: number;
  lapLastAngleRadians?: number;
  lapAccumulatedRadians?: number;
}

/** Inspectable geometry result used by tests and future renderer feedback. */
export interface ChargingWrapGeometry {
  docked: boolean;
  wrappedSegments: number;
  windingRadians: number;
  windingDirection: -1 | 0 | 1;
  directionConsistency: number;
  valid: boolean;
}

export interface ActiveSpecialist {
  kind: SpecialistKind;
  /**
   * Optional protocol-v5 extension. Absent on legacy Collector state, which
   * means Loot Compass exactly. The outer kind stays `collector` so older
   * clients can safely retain the single timed-slot envelope.
   */
  relicKind?: PirateRelicKind;
  /** Present only for an active Treasure Multiplier. */
  relicTier?: TreasureMultiplierTier;
  activatedAtTick: number;
  expiresAtTick: number;
  durationTicks: number;
}

/**
 * The single input contract used by browsers, recorded replays, bots, and the
 * future authoritative multiplayer server. Directions do not need to be
 * normalized; the core sanitizes them before simulation.
 */
export interface PlayerInput {
  sequence: number;
  clientTick?: number;
  direction: Vec2;
  boost: boolean;
}

export type PlayerInputMap = Readonly<Partial<Record<PlayerId, PlayerInput>>>;

export interface PlayerStats {
  kills: number;
  collectedMass: number;
  peakMass: number;
  survivalTicks: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  kind: PlayerKind;
  position: Vec2;
  previousPosition: Vec2;
  direction: Vec2;
  body: Vec2[];
  previousBody: Vec2[];
  mass: number;
  alive: boolean;
  shieldTicksRemaining: number;
  spawnedAtTick: number;
  diedAtTick?: number;
  killedBy?: PlayerId;
  deathCause?: "collision" | "boundary";
  lastInput: PlayerInput;
  shedMassRemainder: number;
  specialist?: ActiveSpecialist;
  stats: PlayerStats;
}

export interface DropState {
  id: DropId;
  position: Vec2;
  mass: number;
  /** Authoritative age clock used by neutral treasure phase-in. */
  spawnedAtTick: number;
  /** Present only on ordinary arena treasure that will relocate. */
  expiresAtTick?: number;
  /**
   * Conserved transient Echo mass waiting behind the visible pickup chunk.
   * This is authoritative simulation state and is never serialized to clients.
   */
  bankedMass?: number;
  radius: number;
  /** arena = neutral Pulse Mote, boost = Boost Echo, death = Rival Echo. */
  source: "arena" | "boost" | "death";
  /** Tracks whose mass produced an Echo without changing its ownership rules. */
  originPlayerId?: PlayerId;
  /** A zero-mass, explicitly telegraphed specialist pickup. */
  specialist?: SpecialistKind;
  specialistDurationTicks?: number;
  /** New named Relics use additive fields old protocol-v5 clients ignore. */
  relicKind?: PirateRelicKind;
  relicDurationTicks?: number;
  /** Present only for a Treasure Multiplier ground item. */
  relicTier?: TreasureMultiplierTier;
  /** Collector range may affect neutral motes, the producer only, or nobody. */
  collectorReachPolicy: "neutral" | "owner" | "none";
  blockedPlayerId?: PlayerId;
  blockedUntilTick: number;
  /** Optional all-player lock used when compacting multiple owners together. */
  pickupBlockedUntilTick?: number;
}

export interface GameConfig {
  fixedStepSeconds: number;
  arenaRadius: number;
  spawnRadiusFactor: number;
  spawnAttempts: number;
  startMass: number;
  minimumMass: number;
  minimumBoostMass: number;
  baseSpeed: number;
  boostSpeed: number;
  boostMassPerSecond: number;
  shedDropMass: number;
  shedPickupLockSeconds: number;
  maximumTurnRadiansPerSecond: number;
  minimumTurnRadiansPerSecond: number;
  turnMassScale: number;
  baseRadius: number;
  massRadiusFactor: number;
  bodyRadiusFactor: number;
  segmentSpacingFactor: number;
  startingBodySegments: number;
  minimumBodySegments: number;
  maximumBodySegments: number;
  massPerSegment: number;
  spawnShieldSeconds: number;
  dropRadius: number;
  deathDropTargetMass: number;
  maximumDeathDrops: number;
  /** Global live-world cap for short-lived sprint trail Echoes. */
  maximumBoostDropsInWorld: number;
  /** Global live-world cap for crash-loot Echoes across repeated defeats. */
  maximumDeathDropsInWorld: number;
  collectorDurationSeconds: number;
  collectorPickupRadiusMultiplier: number;
}

/** Static values that define the exact solid head and body collision circles. */
export type CollisionRadiusConfig = Pick<
  GameConfig,
  "baseRadius" | "massRadiusFactor" | "bodyRadiusFactor"
>;

export interface GameState {
  config: GameConfig;
  board: GameBoardConfig;
  chargingStations: Record<string, ChargingStationState>;
  initialSeed: string | number;
  randomState: number;
  tick: number;
  accumulatorSeconds: number;
  nextEntityNumber: number;
  players: Record<PlayerId, PlayerState>;
  drops: DropState[];
}

export interface SpawnPlayerOptions {
  id?: PlayerId;
  name?: string;
  kind?: PlayerKind;
  position?: Vec2;
  direction?: Vec2;
  mass?: number;
  shieldSeconds?: number;
}

export interface SpawnDropOptions {
  id?: DropId;
  position: Vec2;
  mass: number;
  /** Optional lifetime for ordinary neutral treasure. Echoes and Relics omit it. */
  lifetimeTicks?: number;
  bankedMass?: number;
  radius?: number;
  source?: DropState["source"];
  originPlayerId?: PlayerId;
  specialist?: SpecialistKind;
  specialistDurationSeconds?: number;
  relicKind?: PirateRelicKind;
  relicDurationSeconds?: number;
  relicTier?: TreasureMultiplierTier;
  collectorReachPolicy?: DropState["collectorReachPolicy"];
  blockedPlayerId?: PlayerId;
  blockedUntilTick?: number;
  pickupBlockedUntilTick?: number;
}

export interface BotInputContext {
  tick: number;
  deltaSeconds: number;
  config: Readonly<GameConfig>;
  self: Readonly<PlayerState>;
  players: readonly Readonly<PlayerState>[];
  drops: readonly Readonly<DropState>[];
  /** Deterministic capped-pressure target; absent for every unassigned bot. */
  assignedHumanTargetId?: PlayerId;
}

/**
 * Bots deliberately emit the exact same PlayerInput packets as remote humans.
 * A networking layer can therefore replace a bot with a socket client without
 * adding a second movement or collision path.
 */
export interface BotInputProvider {
  nextInput(context: BotInputContext): PlayerInput;
}

export type BotInputProviderMap = Readonly<
  Partial<Record<PlayerId, BotInputProvider>>
>;

export type GameEvent =
  | {
      type: "playerSpawned";
      tick: number;
      playerId: PlayerId;
    }
  | {
      type: "massShed";
      tick: number;
      playerId: PlayerId;
      dropId: DropId;
      mass: number;
    }
  | {
      type: "dropCollected";
      tick: number;
      playerId: PlayerId;
      dropId: DropId;
      mass: number;
    }
  | {
      type: "specialistActivated";
      tick: number;
      playerId: PlayerId;
      dropId: DropId;
      specialist: SpecialistKind;
      relicKind?: PirateRelicKind;
      relicTier?: TreasureMultiplierTier;
      durationTicks: number;
    }
  | {
      type: "specialistExpired";
      tick: number;
      playerId: PlayerId;
      specialist: SpecialistKind;
      relicKind?: PirateRelicKind;
      relicTier?: TreasureMultiplierTier;
    }
  | {
      type: "chargingStarted";
      tick: number;
      stationId: string;
      playerId: PlayerId;
      windingDirection: -1 | 1;
      requiredTicks: number;
    }
  | {
      type: "chargingInterrupted";
      tick: number;
      stationId: string;
      playerId: PlayerId;
      progressTicks: number;
    }
  | {
      type: "chargingResumed";
      tick: number;
      stationId: string;
      playerId: PlayerId;
      progressTicks: number;
    }
  | {
      type: "chargingReset";
      tick: number;
      stationId: string;
      playerId: PlayerId;
      massAwarded: number;
    }
  | {
      type: "chargingCompleted";
      tick: number;
      stationId: string;
      playerId: PlayerId;
      massAwarded: number;
      cooldownTicks: number;
    }
  | {
      type: "playerDied";
      tick: number;
      playerId: PlayerId;
      cause: "collision" | "boundary";
      killerId?: PlayerId;
      collisionTime: number;
    };

export interface GameStepResult {
  tick: number;
  events: GameEvent[];
}

export interface RankedPlayer {
  rank: number;
  playerId: PlayerId;
  name: string;
  mass: number;
  score: number;
  kills: number;
}
