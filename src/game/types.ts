export type PlayerId = string;
export type DropId = string;

export interface Vec2 {
  x: number;
  y: number;
}

export type PlayerKind = "human" | "bot";
export type SpecialistKind = "collector";

export interface ActiveSpecialist {
  kind: SpecialistKind;
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
  radius: number;
  /** arena = neutral Pulse Mote, boost = Boost Echo, death = Rival Echo. */
  source: "arena" | "boost" | "death";
  /** Tracks whose mass produced an Echo without changing its ownership rules. */
  originPlayerId?: PlayerId;
  /** A zero-mass, explicitly telegraphed specialist pickup. */
  specialist?: SpecialistKind;
  specialistDurationTicks?: number;
  /** Collector range may affect neutral motes, the producer only, or nobody. */
  collectorReachPolicy: "neutral" | "owner" | "none";
  blockedPlayerId?: PlayerId;
  blockedUntilTick: number;
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
  massPerSegment: number;
  spawnShieldSeconds: number;
  dropRadius: number;
  deathDropTargetMass: number;
  maximumDeathDrops: number;
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
  radius?: number;
  source?: DropState["source"];
  originPlayerId?: PlayerId;
  specialist?: SpecialistKind;
  specialistDurationSeconds?: number;
  collectorReachPolicy?: DropState["collectorReachPolicy"];
  blockedPlayerId?: PlayerId;
  blockedUntilTick?: number;
}

export interface BotInputContext {
  tick: number;
  deltaSeconds: number;
  config: Readonly<GameConfig>;
  self: Readonly<PlayerState>;
  players: readonly Readonly<PlayerState>[];
  drops: readonly Readonly<DropState>[];
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
      durationTicks: number;
    }
  | {
      type: "specialistExpired";
      tick: number;
      playerId: PlayerId;
      specialist: SpecialistKind;
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
