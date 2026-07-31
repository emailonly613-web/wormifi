import { hashSeed } from "./random";
import type { PlayerState } from "./types";

export const MAX_HUNTERS_PER_HUMAN = 3;
export const HUNTER_ROTATION_SECONDS = 6;
export const HUNTER_CANDIDATE_POOL_MULTIPLIER = 4;

export interface HumanHunterAssignmentOptions {
  maximumHuntersPerHuman?: number;
  rotationSeconds?: number;
  candidatePoolMultiplier?: number;
}

interface BotCandidate {
  bot: Readonly<PlayerState>;
  distanceSquared: number;
}

function distanceSquared(first: PlayerState["position"], second: PlayerState["position"]): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

function selectedForEpoch(
  humanId: string,
  candidates: readonly BotCandidate[],
  epoch: number,
  maximumHunters: number,
  candidatePoolMultiplier: number,
  excludedBotIds: ReadonlySet<string> = new Set(),
): BotCandidate[] {
  const poolSize = Math.max(maximumHunters, maximumHunters * candidatePoolMultiplier);
  const pool = candidates.slice(0, poolSize);
  const available = pool.filter((candidate) => !excludedBotIds.has(candidate.bot.id));
  const selectionPool = available.length >= maximumHunters ? available : pool;
  return selectionPool
    .slice()
    .sort((first, second) => {
      const firstRotation = hashSeed(`${epoch}:${humanId}:${first.bot.id}`);
      const secondRotation = hashSeed(`${epoch}:${humanId}:${second.bot.id}`);
      return firstRotation - secondRotation || first.bot.id.localeCompare(second.bot.id);
    })
    .slice(0, maximumHunters);
}

/**
 * Assigns each bot to at most one nearest human and caps human pressure. The
 * selected hunters rotate on a deterministic six-second epoch; when the nearby
 * pool is large enough, the previous trio receives a full epoch off.
 */
export function selectHumanHunterAssignments(
  players: readonly Readonly<PlayerState>[],
  tick: number,
  fixedStepSeconds: number,
  options: HumanHunterAssignmentOptions = {},
): ReadonlyMap<string, string> {
  const maximumHunters = Math.max(
    0,
    Math.floor(options.maximumHuntersPerHuman ?? MAX_HUNTERS_PER_HUMAN),
  );
  if (maximumHunters === 0 || !Number.isSafeInteger(tick) || tick < 0) return new Map();
  const rotationSeconds = Math.max(0.25, options.rotationSeconds ?? HUNTER_ROTATION_SECONDS);
  const candidatePoolMultiplier = Math.max(
    1,
    Math.floor(options.candidatePoolMultiplier ?? HUNTER_CANDIDATE_POOL_MULTIPLIER),
  );
  const humans = players
    .filter((player) => player.kind === "human" && player.alive)
    .sort((first, second) => first.id.localeCompare(second.id));
  const bots = players
    .filter((player) => player.kind === "bot" && player.alive)
    .sort((first, second) => first.id.localeCompare(second.id));
  if (humans.length === 0 || bots.length === 0) return new Map();

  const candidatesByHuman = new Map<string, BotCandidate[]>();
  for (const bot of bots) {
    let nearestHuman = humans[0];
    let nearestDistance = distanceSquared(bot.position, nearestHuman.position);
    for (let index = 1; index < humans.length; index += 1) {
      const human = humans[index];
      const candidateDistance = distanceSquared(bot.position, human.position);
      if (
        candidateDistance < nearestDistance ||
        (candidateDistance === nearestDistance && human.id.localeCompare(nearestHuman.id) < 0)
      ) {
        nearestHuman = human;
        nearestDistance = candidateDistance;
      }
    }
    const candidates = candidatesByHuman.get(nearestHuman.id) ?? [];
    candidates.push({ bot, distanceSquared: nearestDistance });
    candidatesByHuman.set(nearestHuman.id, candidates);
  }

  const safeStepSeconds = Number.isFinite(fixedStepSeconds) && fixedStepSeconds > 0
    ? fixedStepSeconds
    : 1 / 30;
  const rotationTicks = Math.max(1, Math.round(rotationSeconds / safeStepSeconds));
  const epoch = Math.floor(tick / rotationTicks);
  const assignments = new Map<string, string>();
  for (const human of humans) {
    const candidates = (candidatesByHuman.get(human.id) ?? [])
      .sort((first, second) =>
        first.distanceSquared - second.distanceSquared ||
        first.bot.id.localeCompare(second.bot.id)
      );
    const previous = epoch > 0
      ? selectedForEpoch(
          human.id,
          candidates,
          epoch - 1,
          maximumHunters,
          candidatePoolMultiplier,
        )
      : [];
    const previousIds = new Set(previous.map((candidate) => candidate.bot.id));
    const selected = selectedForEpoch(
      human.id,
      candidates,
      epoch,
      maximumHunters,
      candidatePoolMultiplier,
      previousIds,
    );
    for (const candidate of selected) assignments.set(candidate.bot.id, human.id);
  }
  return assignments;
}
