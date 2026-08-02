import { getBodyRadius, getPlayerRadius } from "../../src/game/core.ts";
import type {
  BotInputContext,
  BotInputProvider,
  DropState,
  GameEvent,
  GameState,
  PlayerInput,
  PlayerState,
  Vec2,
} from "../../src/game/types.ts";
import type {
  HeatRingAbortReason,
  HeatRingEvent,
  PublicHeatRingState,
} from "./protocol.ts";

const EPSILON = 1e-9;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export interface HeatRingConfig {
  enabled: boolean;
  leadDistance: number;
  orbitRadius: number;
  reverseAfterSeconds: number;
  earliestResolveSeconds: number;
  deadlineSeconds: number;
  safeSpawnRadius: number;
  normalBotExclusionRadius: number;
  normalBotGuardRadius: number;
  humanAvoidRadius: number;
  placementAttempts: number;
  lootClearRadius: number;
}

export const DEFAULT_HEAT_RING_CONFIG: Readonly<HeatRingConfig> = Object.freeze({
  enabled: true,
  leadDistance: 600,
  orbitRadius: 340,
  reverseAfterSeconds: 1,
  earliestResolveSeconds: 3,
  deadlineSeconds: 8,
  safeSpawnRadius: 380,
  normalBotExclusionRadius: 700,
  normalBotGuardRadius: 780,
  humanAvoidRadius: 240,
  placementAttempts: 64,
  // Keep the entire duel sweep clear, including finite-turn orbit overshoot and
  // the plump launch head's real pickup radius. This preserves the advertised
  // two mass-48 rivals instead of letting a wider body graze unrelated loot.
  lootClearRadius: 560,
});

interface StartingPose {
  position: Vec2;
  direction: Vec2;
}

interface HeatRingPlan {
  descriptor: PublicHeatRingState;
  heatPoses: Readonly<Record<string, StartingPose>>;
  normalPoses: Readonly<Record<string, StartingPose>>;
  relocatedDrops: readonly { drop: DropState; position: Vec2 }[];
}

function squaredMagnitude(vector: Vec2): number {
  return vector.x * vector.x + vector.y * vector.y;
}

function squaredDistance(first: Vec2, second: Vec2): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

function normalize(vector: Vec2, fallback: Vec2 = { x: 1, y: 0 }): Vec2 {
  const squared = squaredMagnitude(vector);
  if (!Number.isFinite(squared) || squared <= EPSILON) return { ...fallback };
  const inverse = 1 / Math.sqrt(squared);
  return { x: vector.x * inverse, y: vector.y * inverse };
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function resolveConfig(
  override: false | Partial<HeatRingConfig> | undefined,
): HeatRingConfig | undefined {
  if (override === false) return undefined;
  const config = { ...DEFAULT_HEAT_RING_CONFIG, ...override };
  if (!config.enabled) return undefined;
  if (
    !finitePositive(config.leadDistance) ||
    !finitePositive(config.orbitRadius) ||
    !finitePositive(config.reverseAfterSeconds) ||
    !finitePositive(config.earliestResolveSeconds) ||
    !finitePositive(config.deadlineSeconds) ||
    !finitePositive(config.safeSpawnRadius) ||
    !finitePositive(config.normalBotExclusionRadius) ||
    !finitePositive(config.normalBotGuardRadius) ||
    !finitePositive(config.humanAvoidRadius) ||
    !finitePositive(config.lootClearRadius) ||
    !Number.isSafeInteger(config.placementAttempts) ||
    config.placementAttempts < 1 ||
    config.reverseAfterSeconds >= config.earliestResolveSeconds ||
    config.earliestResolveSeconds >= config.deadlineSeconds ||
    config.normalBotGuardRadius <= config.normalBotExclusionRadius ||
    config.lootClearRadius >= config.normalBotExclusionRadius
  ) {
    return undefined;
  }
  return config;
}

function chainSpacing(state: Readonly<GameState>): number {
  return getBodyRadius({ mass: state.config.startMass }, state.config) *
    2 * state.config.segmentSpacingFactor;
}

function chainReach(state: Readonly<GameState>): number {
  return chainSpacing(state) * state.config.startingBodySegments;
}

function pointsForPose(state: Readonly<GameState>, pose: StartingPose): Vec2[] {
  const spacing = chainSpacing(state);
  const points = [{ ...pose.position }];
  for (let index = 1; index <= state.config.startingBodySegments; index += 1) {
    points.push({
      x: pose.position.x - pose.direction.x * spacing * index,
      y: pose.position.y - pose.direction.y * spacing * index,
    });
  }
  return points;
}

function poseFitsArena(state: Readonly<GameState>, pose: StartingPose): boolean {
  const headRadius = getPlayerRadius({ mass: state.config.startMass }, state.config);
  const bodyRadius = getBodyRadius({ mass: state.config.startMass }, state.config);
  return pointsForPose(state, pose).every((point, index) =>
    Math.sqrt(squaredMagnitude(point)) + (index === 0 ? headRadius : bodyRadius) <=
      state.config.arenaRadius
  );
}

function poseClearsDisk(
  state: Readonly<GameState>,
  pose: StartingPose,
  center: Vec2,
  radius: number,
): boolean {
  const headRadius = getPlayerRadius({ mass: state.config.startMass }, state.config);
  const bodyRadius = getBodyRadius({ mass: state.config.startMass }, state.config);
  return pointsForPose(state, pose).every((point, index) =>
    Math.sqrt(squaredDistance(point, center)) -
      (index === 0 ? headRadius : bodyRadius) >= radius
  );
}

function posesClearEachOther(
  state: Readonly<GameState>,
  first: StartingPose,
  second: StartingPose,
  margin: number,
): boolean {
  const headRadius = getPlayerRadius({ mass: state.config.startMass }, state.config);
  const bodyRadius = getBodyRadius({ mass: state.config.startMass }, state.config);
  const firstPoints = pointsForPose(state, first);
  const secondPoints = pointsForPose(state, second);
  return firstPoints.every((firstPoint, firstIndex) =>
    secondPoints.every((secondPoint, secondIndex) =>
      Math.sqrt(squaredDistance(firstPoint, secondPoint)) -
        (firstIndex === 0 ? headRadius : bodyRadius) -
        (secondIndex === 0 ? headRadius : bodyRadius) >= margin
    )
  );
}

function isPristineParticipant(player: Readonly<PlayerState>, state: Readonly<GameState>): boolean {
  return player.alive &&
    player.spawnedAtTick === 0 &&
    Math.abs(player.mass - state.config.startMass) <= EPSILON &&
    player.shedMassRemainder === 0 &&
    player.specialist === undefined &&
    player.stats.kills === 0 &&
    player.stats.collectedMass === 0 &&
    Math.abs(player.stats.peakMass - state.config.startMass) <= EPSILON &&
    player.stats.survivalTicks === 0;
}

function startingPoseOnOuterRing(
  state: Readonly<GameState>,
  angle: number,
): StartingPose | undefined {
  const boundaryMargin = chainReach(state) +
    getPlayerRadius({ mass: state.config.startMass }, state.config) + 100;
  const radius = state.config.arenaRadius - boundaryMargin;
  if (radius <= 0) return undefined;
  const position = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  return {
    position,
    // An inward-facing head leaves the initial body trailing toward the safer
    // outer margin and gives the normal AI time to choose its own route.
    direction: normalize({ x: -position.x, y: -position.y }),
  };
}

function findNormalPoses(
  state: Readonly<GameState>,
  normalIds: readonly string[],
  center: Vec2,
  humanPosition: Vec2,
  config: Readonly<HeatRingConfig>,
): Readonly<Record<string, StartingPose>> | undefined {
  if (normalIds.length === 0) return {};
  const seedPhase = (state.randomState >>> 0) / 0x1_0000_0000 * Math.PI * 2;
  const slotCount = Math.max(config.placementAttempts, normalIds.length * 3);

  for (let attempt = 0; attempt < config.placementAttempts; attempt += 1) {
    const phase = seedPhase + attempt / config.placementAttempts * Math.PI * 2;
    const poses: Record<string, StartingPose> = {};
    for (let slot = 0; slot < slotCount && Object.keys(poses).length < normalIds.length; slot += 1) {
      const pose = startingPoseOnOuterRing(
        state,
        phase + slot / slotCount * Math.PI * 2,
      );
      if (
        !pose ||
        !poseFitsArena(state, pose) ||
        !poseClearsDisk(state, pose, center, config.normalBotExclusionRadius) ||
        !poseClearsDisk(state, pose, humanPosition, config.humanAvoidRadius) ||
        Object.values(poses).some((other) =>
          !posesClearEachOther(state, other, pose, 24)
        )
      ) {
        continue;
      }
      const nextId = normalIds[Object.keys(poses).length];
      poses[nextId] = pose;
    }
    if (Object.keys(poses).length === normalIds.length) return poses;
  }
  return undefined;
}

function findRelocatedDrops(
  state: Readonly<GameState>,
  center: Vec2,
  humanPosition: Vec2,
  config: Readonly<HeatRingConfig>,
): readonly { drop: DropState; position: Vec2 }[] | undefined {
  const contested = state.drops.filter((drop) =>
    squaredDistance(drop.position, center) < config.lootClearRadius ** 2
  );
  const relocated: { drop: DropState; position: Vec2 }[] = [];
  for (let index = 0; index < contested.length; index += 1) {
    let accepted: Vec2 | undefined;
    for (let attempt = 0; attempt < config.placementAttempts; attempt += 1) {
      const angle = (index * config.placementAttempts + attempt) * GOLDEN_ANGLE;
      const radius = config.normalBotGuardRadius + 90 + (index % 5) * 16;
      const candidate = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
      if (
        Math.sqrt(squaredMagnitude(candidate)) + contested[index].radius <=
          state.config.arenaRadius - 12 &&
        Math.sqrt(squaredDistance(candidate, humanPosition)) >= config.humanAvoidRadius
      ) {
        accepted = candidate;
        break;
      }
    }
    if (!accepted) return undefined;
    relocated.push({ drop: contested[index], position: accepted });
  }
  return relocated;
}

function setStartingPose(
  player: PlayerState,
  pose: StartingPose,
  state: Readonly<GameState>,
  shieldTicksRemaining: number,
): void {
  player.position = { ...pose.position };
  player.previousPosition = { ...pose.position };
  player.direction = { ...pose.direction };
  player.body = pointsForPose(state, pose).slice(1);
  player.previousBody = player.body.map((point) => ({ ...point }));
  player.shieldTicksRemaining = shieldTicksRemaining;
  player.lastInput = {
    sequence: -1,
    clientTick: state.tick,
    direction: { ...pose.direction },
    boost: false,
  };
}

class OrbitProvider implements BotInputProvider {
  constructor(
    private readonly center: Vec2,
    private readonly radius: number,
    private readonly reverseAtTick: number,
    private readonly reverses: boolean,
  ) {}

  nextInput(context: BotInputContext): PlayerInput {
    const radial = {
      x: context.self.position.x - this.center.x,
      y: context.self.position.y - this.center.y,
    };
    const radialUnit = normalize(radial, context.self.direction);
    const sign = this.reverses && context.tick >= this.reverseAtTick ? -1 : 1;
    const tangent = {
      x: -radialUnit.y * sign,
      y: radialUnit.x * sign,
    };
    const radialCorrection =
      (Math.sqrt(squaredMagnitude(radial)) - this.radius) / (this.radius * 0.25);
    return {
      sequence: context.tick,
      clientTick: context.tick,
      direction: normalize({
        x: tangent.x - radialUnit.x * radialCorrection,
        y: tangent.y - radialUnit.y * radialCorrection,
      }, tangent),
      boost: false,
    };
  }
}

class GuardedProvider implements BotInputProvider {
  constructor(
    private readonly base: BotInputProvider,
    private readonly center: Vec2,
    private readonly guardRadius: number,
    private readonly humanAvoidRadius: number,
  ) {}

  nextInput(context: BotInputContext): PlayerInput {
    const fromCenter = {
      x: context.self.position.x - this.center.x,
      y: context.self.position.y - this.center.y,
    };
    if (squaredMagnitude(fromCenter) < this.guardRadius ** 2) {
      return {
        sequence: context.tick,
        clientTick: context.tick,
        direction: normalize(fromCenter, context.self.direction),
        boost: false,
      };
    }

    const nearbyHuman = context.players
      .filter((player) => player.kind === "human" && player.alive)
      .sort((first, second) =>
        squaredDistance(context.self.position, first.position) -
          squaredDistance(context.self.position, second.position) ||
        first.id.localeCompare(second.id)
      )[0];
    if (
      nearbyHuman &&
      squaredDistance(context.self.position, nearbyHuman.position) < this.humanAvoidRadius ** 2
    ) {
      return {
        sequence: context.tick,
        clientTick: context.tick,
        direction: normalize({
          x: context.self.position.x - nearbyHuman.position.x,
          y: context.self.position.y - nearbyHuman.position.y,
        }, context.self.direction),
        boost: false,
      };
    }

    return this.base.nextInput({
      ...context,
      // Normal onboarding bots can contest treasure and one another, but they
      // receive no human position to remember, hunt, or intercept.
      players: context.players.filter((player) => player.kind === "bot"),
    });
  }
}

export class HeatRingController {
  readonly descriptor: PublicHeatRingState;
  readonly firstHumanId: string;
  readonly startingMass: number;

  private phaseValue: "active" | "resolved" | "aborted" = "active";
  private readonly originalProviders: Readonly<Record<string, BotInputProvider>>;

  private constructor(
    private readonly state: GameState,
    private readonly providers: Record<string, BotInputProvider>,
    firstHumanId: string,
    config: Readonly<HeatRingConfig>,
    plan: HeatRingPlan,
  ) {
    this.firstHumanId = firstHumanId;
    this.descriptor = plan.descriptor;
    this.startingMass = plan.descriptor.botIds.reduce(
      (sum, id) => sum + (state.players[id]?.mass ?? 0),
      0,
    );
    this.originalProviders = Object.fromEntries(
      Object.entries(providers).map(([id, provider]) => [id, provider]),
    );

    const [firstHeatId, secondHeatId] = this.descriptor.botIds;
    providers[firstHeatId] = new OrbitProvider(
      this.descriptor.center,
      this.descriptor.radius,
      this.descriptor.reverseAtTick,
      false,
    );
    providers[secondHeatId] = new OrbitProvider(
      this.descriptor.center,
      this.descriptor.radius,
      this.descriptor.reverseAtTick,
      true,
    );
    for (const [id, provider] of Object.entries(this.originalProviders)) {
      if (id === firstHeatId || id === secondHeatId) continue;
      providers[id] = new GuardedProvider(
        provider,
        this.descriptor.center,
        config.normalBotGuardRadius,
        config.humanAvoidRadius,
      );
    }
  }

  static prepare(
    state: GameState,
    firstHumanId: string,
    providers: Record<string, BotInputProvider>,
    override?: false | Partial<HeatRingConfig>,
  ): HeatRingController | undefined {
    const config = resolveConfig(override);
    if (!config || state.tick !== 0) return undefined;
    const human = state.players[firstHumanId];
    const humans = Object.values(state.players).filter((player) => player.kind === "human");
    const allBotIds = Object.values(state.players)
      .filter((player) => player.kind === "bot")
      .map((player) => player.id)
      .sort();
    const botIds = Object.keys(providers)
      .filter((id) => state.players[id]?.kind === "bot")
      .sort();
    if (
      !human ||
      human.kind !== "human" ||
      humans.length !== 1 ||
      botIds.length < 2 ||
      allBotIds.length !== botIds.length ||
      !isPristineParticipant(human, state) ||
      botIds.some((id) => !isPristineParticipant(state.players[id], state))
    ) {
      return undefined;
    }

    const forward = normalize({ x: -human.position.x, y: -human.position.y });
    const perpendicular = { x: -forward.y, y: forward.x };
    const center = {
      x: human.position.x + forward.x * config.leadDistance,
      y: human.position.y + forward.y * config.leadDistance,
    };
    const heatIds = [botIds[0], botIds[1]] as const;
    const heatPoses: Record<string, StartingPose> = {
      [heatIds[0]]: {
        position: {
          x: center.x - perpendicular.x * config.orbitRadius,
          y: center.y - perpendicular.y * config.orbitRadius,
        },
        direction: { ...forward },
      },
      [heatIds[1]]: {
        position: {
          x: center.x + perpendicular.x * config.orbitRadius,
          y: center.y + perpendicular.y * config.orbitRadius,
        },
        direction: { x: -forward.x, y: -forward.y },
      },
    };
    const humanPose = { position: { ...human.position }, direction: { ...forward } };
    if (
      !poseFitsArena(state, humanPose) ||
      Object.values(heatPoses).some((pose) =>
        !poseFitsArena(state, pose) ||
        !poseClearsDisk(state, pose, human.position, config.safeSpawnRadius)
      )
    ) {
      return undefined;
    }

    const normalIds = botIds.slice(2);
    const normalPoses = findNormalPoses(
      state,
      normalIds,
      center,
      human.position,
      config,
    );
    const relocatedDrops = findRelocatedDrops(state, center, human.position, config);
    if (!normalPoses || !relocatedDrops) return undefined;

    const fixedStepSeconds = state.config.fixedStepSeconds;
    const descriptor: PublicHeatRingState = {
      phase: "active",
      theme: "corsair",
      center,
      radius: config.orbitRadius,
      safeSpawnRadius: config.safeSpawnRadius,
      botIds: heatIds,
      startsAtTick: state.tick,
      reverseAtTick: state.tick + Math.ceil(config.reverseAfterSeconds / fixedStepSeconds),
      earliestResolveTick: state.tick + Math.ceil(
        config.earliestResolveSeconds / fixedStepSeconds,
      ),
      deadlineTick: state.tick + Math.ceil(config.deadlineSeconds / fixedStepSeconds),
    };
    const plan: HeatRingPlan = {
      descriptor,
      heatPoses,
      normalPoses,
      relocatedDrops,
    };

    setStartingPose(
      human,
      humanPose,
      state,
      Math.ceil(state.config.spawnShieldSeconds / fixedStepSeconds),
    );
    for (const [id, pose] of Object.entries(plan.heatPoses)) {
      const bot = state.players[id];
      setStartingPose(bot, pose, state, 0);
    }
    state.players[heatIds[0]].name = "Ruby Wake";
    state.players[heatIds[1]].name = "Jade Jib";
    const normalShieldTicks = Math.ceil(
      state.config.spawnShieldSeconds / state.config.fixedStepSeconds,
    );
    for (const [id, pose] of Object.entries(plan.normalPoses)) {
      setStartingPose(state.players[id], pose, state, normalShieldTicks);
    }
    for (const relocation of plan.relocatedDrops) {
      relocation.drop.position = { ...relocation.position };
    }

    return new HeatRingController(state, providers, firstHumanId, config, plan);
  }

  get active(): boolean {
    return this.phaseValue === "active";
  }

  isHeatBot(id: string): boolean {
    return this.active && this.descriptor.botIds.includes(id);
  }

  startedEvent(): HeatRingEvent {
    return {
      type: "heatRingStarted",
      tick: this.state.tick,
      heatRing: this.descriptor,
    };
  }

  validateBeforeStep(): HeatRingEvent[] {
    if (!this.active) return [];
    const human = this.state.players[this.firstHumanId];
    const participants = this.descriptor.botIds.map((id) => this.state.players[id]);
    if (!human?.alive || participants.some((player) => !player?.alive)) {
      return this.abort("unsafe-state");
    }
    return [];
  }

  reconcileStep(
    coreEvents: readonly GameEvent[],
    previousDropIds: ReadonlySet<string>,
  ): HeatRingEvent[] {
    if (!this.active) return [];
    const heatIds = new Set<string>(this.descriptor.botIds);
    if (coreEvents.some((event) =>
      event.type === "playerDied" && event.playerId === this.firstHumanId
    )) {
      return this.abort("unsafe-state");
    }

    const heatDeaths = coreEvents.filter((event): event is Extract<GameEvent, { type: "playerDied" }> =>
      event.type === "playerDied" && heatIds.has(event.playerId)
    );
    if (heatDeaths.length > 0) {
      const [firstId, secondId] = this.descriptor.botIds;
      const firstDeath = heatDeaths.find((event) => event.playerId === firstId);
      const secondDeath = heatDeaths.find((event) => event.playerId === secondId);
      const mutualCollision = firstDeath?.cause === "collision" &&
        secondDeath?.cause === "collision" &&
        firstDeath.killerId === secondId &&
        secondDeath.killerId === firstId;
      if (
        this.state.tick < this.descriptor.earliestResolveTick ||
        !mutualCollision
      ) {
        return this.abort(
          this.state.tick < this.descriptor.earliestResolveTick
            ? "early-death"
            : "interrupted",
        );
      }
      if (this.state.tick > this.descriptor.deadlineTick) return this.abort("timeout");

      const drops = this.state.drops
        .filter((drop) =>
          !previousDropIds.has(drop.id) &&
          drop.source === "death" &&
          drop.originPlayerId !== undefined &&
          heatIds.has(drop.originPlayerId)
        )
        .sort((first, second) => first.id.localeCompare(second.id));
      if (
        drops.length === 0 ||
        !this.descriptor.botIds.every((id) => drops.some((drop) => drop.originPlayerId === id))
      ) {
        return this.abort("unsafe-state");
      }

      this.phaseValue = "resolved";
      this.restoreProviders();
      return [{
        type: "heatRingResolved",
        tick: this.state.tick,
        botIds: this.descriptor.botIds,
        dropIds: drops.map((drop) => drop.id),
        totalMass: drops.reduce((sum, drop) => sum + drop.mass, 0),
      }];
    }

    if (this.state.tick >= this.descriptor.deadlineTick) return this.abort("timeout");
    return [];
  }

  abort(reason: HeatRingAbortReason): HeatRingEvent[] {
    if (!this.active) return [];
    this.phaseValue = "aborted";
    this.restoreProviders();
    return [{
      type: "heatRingAborted",
      tick: this.state.tick,
      botIds: this.descriptor.botIds,
      reason,
    }];
  }

  private restoreProviders(): void {
    for (const [id, provider] of Object.entries(this.originalProviders)) {
      if (this.providers[id]) this.providers[id] = provider;
    }
  }
}
