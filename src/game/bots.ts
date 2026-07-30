import { spawnPlayer } from "./core";
import { hashSeed, nextRandom } from "./random";
import type {
  BotInputContext,
  BotInputProvider,
  BotInputProviderMap,
  DropState,
  GameState,
  PlayerInput,
  PlayerState,
  Vec2,
} from "./types";

export const BOT_NAMES = Object.freeze([
  "Captain Coral", "Cutlass Kit", "Ruby Rook", "Mako Mara", "Treasure Tess", "Sable Finn",
  "Anchor Ash", "Blackwake Bea", "Galleon Gray", "Pearl Pike", "Stormy Skye", "Bosun Blue",
  "Cannon Cade", "Mapmaker Mae", "Doubloon Dee", "Reef Ryder", "Harbor Hex", "Jolly Jules",
  "Kraken Kai", "Maroon Milo", "Compass Cora", "Riptide Rue", "Lantern Lux", "Deckhand Dotty",
  "Privateer Poppy", "Shipwreck Shane", "Tidecaller Tori", "Buccaneer Beck",
]) as readonly string[];

export const BOT_PERSONALITY_IDS = Object.freeze([
  "forager", "survivor", "hunter", "interceptor", "scavenger",
]) as readonly BotPersonalityId[];

export type BotPersonalityId =
  | "forager"
  | "survivor"
  | "hunter"
  | "interceptor"
  | "scavenger";

export type BotTacticalState =
  | "forage"
  | "evade"
  | "hunt"
  | "cut-off"
  | "scavenge"
  | "boundary-escape";

interface BotPersonality {
  id: BotPersonalityId;
  vision: number;
  reactionTicks: number;
  reactionJitter: number;
  safety: number;
  foodBias: number;
  aggression: number;
  interception: number;
  scavenging: number;
  boostReserve: number;
}

export const BOT_PERSONALITIES: Readonly<Record<BotPersonalityId, BotPersonality>> =
  Object.freeze({
    forager: { id: "forager", vision: 1_050, reactionTicks: 7, reactionJitter: 3, safety: 1, foodBias: 1.35, aggression: 0.16, interception: 0.12, scavenging: 0.62, boostReserve: 34 },
    survivor: { id: "survivor", vision: 1_180, reactionTicks: 4, reactionJitter: 2, safety: 1.5, foodBias: 0.72, aggression: 0.08, interception: 0.16, scavenging: 0.42, boostReserve: 48 },
    hunter: { id: "hunter", vision: 1_260, reactionTicks: 5, reactionJitter: 2, safety: 0.86, foodBias: 0.42, aggression: 1.45, interception: 0.58, scavenging: 0.35, boostReserve: 24 },
    interceptor: { id: "interceptor", vision: 1_340, reactionTicks: 3, reactionJitter: 2, safety: 0.92, foodBias: 0.38, aggression: 0.72, interception: 1.65, scavenging: 0.28, boostReserve: 28 },
    scavenger: { id: "scavenger", vision: 1_120, reactionTicks: 6, reactionJitter: 3, safety: 1.08, foodBias: 0.62, aggression: 0.22, interception: 0.18, scavenging: 1.8, boostReserve: 30 },
  });

interface Decision {
  state: BotTacticalState;
  direction: Vec2;
  boost: boolean;
}

const lengthSquared = (vector: Vec2) => vector.x * vector.x + vector.y * vector.y;
const distanceSquared = (first: Vec2, second: Vec2) =>
  (first.x - second.x) ** 2 + (first.y - second.y) ** 2;

function normalize(vector: Vec2, fallback: Vec2): Vec2 {
  const squared = lengthSquared(vector);
  if (!Number.isFinite(squared) || squared < 1e-9) return { ...fallback };
  const inverse = 1 / Math.sqrt(squared);
  return { x: vector.x * inverse, y: vector.y * inverse };
}

function toward(from: Vec2, to: Vec2): Vec2 {
  return { x: to.x - from.x, y: to.y - from.y };
}

function nearestBodyDistanceSquared(self: PlayerState, other: Readonly<PlayerState>): number {
  let nearest = distanceSquared(self.position, other.position);
  for (const segment of other.body) {
    nearest = Math.min(nearest, distanceSquared(self.position, segment));
  }
  return nearest;
}

function bestDrop(
  context: BotInputContext,
  source: DropState["source"] | "any",
  visionSquared: number,
): Readonly<DropState> | undefined {
  let winner: Readonly<DropState> | undefined;
  let winnerScore = -Infinity;
  for (const drop of context.drops) {
    if (source !== "any" && drop.source !== source) continue;
    if (drop.blockedPlayerId === context.self.id && context.tick < drop.blockedUntilTick) continue;
    const squared = distanceSquared(context.self.position, drop.position);
    if (squared > visionSquared) continue;
    const score = drop.mass / (Math.sqrt(squared) + 45);
    if (
      score > winnerScore ||
      (score === winnerScore && winner !== undefined &&
        drop.id.localeCompare(winner.id) < 0)
    ) {
      winner = drop;
      winnerScore = score;
    }
  }
  return winner;
}

function visibleRivals(context: BotInputContext, visionSquared: number): Readonly<PlayerState>[] {
  return context.players
    .filter((player) => player.id !== context.self.id && player.alive)
    .filter((player) => nearestBodyDistanceSquared(context.self as PlayerState, player) <= visionSquared)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function choosePrey(self: Readonly<PlayerState>, rivals: readonly Readonly<PlayerState>[]) {
  return rivals
    .filter((rival) => rival.mass <= self.mass * 1.18)
    .sort((a, b) => {
      const distance = distanceSquared(self.position, a.position) - distanceSquared(self.position, b.position);
      return Math.abs(distance) > 1e-9 ? distance : a.id.localeCompare(b.id);
    })[0];
}

class DeterministicBot implements BotInputProvider {
  private randomState: number;
  private nextDecisionTick = -1;
  private rememberedDirection: Vec2 | undefined;
  private rememberedBoost = false;
  private tacticalStateValue: BotTacticalState = "forage";

  constructor(
    readonly playerId: string,
    readonly personality: BotPersonality,
    seed: string | number,
  ) {
    this.randomState = hashSeed(`${seed}:${playerId}:${personality.id}`);
  }

  get tacticalState(): BotTacticalState {
    return this.tacticalStateValue;
  }

  nextInput(context: BotInputContext): PlayerInput {
    if (!this.rememberedDirection) this.rememberedDirection = { ...context.self.direction };
    if (context.tick >= this.nextDecisionTick) {
      const decision = this.decide(context);
      this.tacticalStateValue = decision.state;
      this.rememberedDirection = normalize(decision.direction, context.self.direction);
      this.rememberedBoost = decision.boost;
      const jitter = nextRandom(this.randomState);
      this.randomState = jitter.state;
      this.nextDecisionTick = context.tick + this.personality.reactionTicks +
        Math.floor(jitter.value * (this.personality.reactionJitter + 1));
    }

    return {
      sequence: context.tick,
      clientTick: context.tick,
      direction: { ...this.rememberedDirection },
      boost: this.rememberedBoost &&
        context.self.mass > context.config.minimumBoostMass + this.personality.boostReserve,
    };
  }

  private decide(context: BotInputContext): Decision {
    const self = context.self;
    const radialDistance = Math.sqrt(lengthSquared(self.position));
    const boundaryBuffer = Math.max(280, context.config.baseSpeed * 1.8);
    if (radialDistance > context.config.arenaRadius - boundaryBuffer) {
      return { state: "boundary-escape", direction: { x: -self.position.x, y: -self.position.y }, boost: false };
    }

    const visionSquared = this.personality.vision ** 2;
    const rivals = visibleRivals(context, visionSquared);
    let threat: Readonly<PlayerState> | undefined;
    let threatDistanceSquared = Infinity;
    for (const rival of rivals) {
      const squared = nearestBodyDistanceSquared(self as PlayerState, rival);
      if (squared < threatDistanceSquared) {
        threat = rival;
        threatDistanceSquared = squared;
      }
    }
    const dangerRadius = (125 + Math.sqrt(self.mass) * 5) * this.personality.safety;
    if (threat && threatDistanceSquared < dangerRadius ** 2) {
      const away = toward(threat.position, self.position);
      const centerPull = normalize({ x: -self.position.x, y: -self.position.y }, self.direction);
      return {
        state: "evade",
        direction: { x: away.x + centerPull.x * 80, y: away.y + centerPull.y * 80 },
        boost: threatDistanceSquared < (dangerRadius * 0.55) ** 2,
      };
    }

    const deathDrop = bestDrop(context, "death", visionSquared);
    const prey = choosePrey(self, rivals);
    const deathUtility = deathDrop
      ? this.personality.scavenging * deathDrop.mass /
        (Math.sqrt(distanceSquared(self.position, deathDrop.position)) + 40)
      : 0;
    const preyDistance = prey ? Math.sqrt(distanceSquared(self.position, prey.position)) : Infinity;
    const huntUtility = prey ? this.personality.aggression * (1 - preyDistance / this.personality.vision) : 0;
    const cutOffUtility = prey ? this.personality.interception * (1 - preyDistance / this.personality.vision) : 0;

    if (deathDrop && deathUtility > Math.max(0.018, huntUtility, cutOffUtility)) {
      return { state: "scavenge", direction: toward(self.position, deathDrop.position), boost: true };
    }
    if (prey && cutOffUtility > Math.max(0.22, huntUtility)) {
      const lead = Math.min(420, Math.max(100, preyDistance * 0.48));
      return {
        state: "cut-off",
        direction: toward(self.position, {
          x: prey.position.x + prey.direction.x * lead,
          y: prey.position.y + prey.direction.y * lead,
        }),
        boost: preyDistance > 320,
      };
    }
    if (prey && huntUtility > 0.2) {
      return { state: "hunt", direction: toward(self.position, prey.position), boost: preyDistance > 360 };
    }

    const food = bestDrop(context, "any", visionSquared);
    if (food) return { state: "forage", direction: toward(self.position, food.position), boost: false };

    const wander = nextRandom(this.randomState);
    this.randomState = wander.state;
    const angle = (wander.value - 0.5) * 0.9;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return {
      state: "forage",
      direction: {
        x: self.direction.x * cosine - self.direction.y * sine,
        y: self.direction.x * sine + self.direction.y * cosine,
      },
      boost: false,
    };
  }
}

export function spawnBotRoster(
  state: GameState,
  count: number,
): { providers: BotInputProviderMap; ids: string[] } {
  const safeCount = Math.max(0, Math.min(BOT_NAMES.length, Math.floor(count)));
  const providers: Record<string, BotInputProvider> = {};
  const ids: string[] = [];

  for (let index = 0; index < safeCount; index += 1) {
    const id = `bot-${String(index + 1).padStart(2, "0")}`;
    const personalityId = BOT_PERSONALITY_IDS[index % BOT_PERSONALITY_IDS.length];
    spawnPlayer(state, { id, name: BOT_NAMES[index], kind: "bot" });
    providers[id] = new DeterministicBot(id, BOT_PERSONALITIES[personalityId], state.initialSeed);
    ids.push(id);
  }

  return { providers: Object.freeze(providers), ids };
}
