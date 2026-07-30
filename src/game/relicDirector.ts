import { isRelicActive, spawnDrop } from "./core";
import {
  GILDED_LEDGER_TIERS,
  getDropRelicKind,
  getPirateRelicSpec,
  LEGACY_COLLECTOR_RELIC,
} from "./relics";
import { randomPointInCircle } from "./random";
import type { GameEvent, GameState, PirateRelicKind } from "./types";

export const PIRATE_RELIC_RESPAWN_SECONDS = 5;
export const PIRATE_RELIC_RADIUS = 9;

/** The server retains its separate proven owner for the legacy Collector. */
export const SERVER_DIRECTED_RELIC_KINDS = Object.freeze([
  "emerald-spyglass",
  "pepper-cutlass",
  "gale-pennant",
  "maelstrom-wheel",
  "gilded-ledger",
] as const satisfies readonly PirateRelicKind[]);

/** Local play owns the complete initial Relic set through one director. */
export const INITIAL_PIRATE_RELIC_KINDS = Object.freeze([
  LEGACY_COLLECTOR_RELIC,
  ...SERVER_DIRECTED_RELIC_KINDS,
] as const satisfies readonly PirateRelicKind[]);

function eventRelicKind(event: Extract<
  GameEvent,
  { type: "specialistActivated" | "specialistExpired" }
>): PirateRelicKind {
  return event.relicKind ?? LEGACY_COLLECTOR_RELIC;
}

/**
 * Deterministic ground-loop owner for pirate Relics. Its default set is the
 * server's two named additions; local play explicitly opts into all three.
 */
export class PirateRelicDirector {
  private readonly respawnTicks: number;
  private readonly relicKinds: readonly PirateRelicKind[];
  private readonly managedRelics: ReadonlySet<PirateRelicKind>;
  private readonly nextSpawnTick = new Map<PirateRelicKind, number>();
  private readonly spawnNumbers = new Map<PirateRelicKind, number>();

  constructor(
    private readonly state: GameState,
    relicKinds: readonly PirateRelicKind[] = SERVER_DIRECTED_RELIC_KINDS,
  ) {
    this.respawnTicks = Math.max(
      1,
      Math.ceil(PIRATE_RELIC_RESPAWN_SECONDS / state.config.fixedStepSeconds),
    );
    this.relicKinds = [...new Set(relicKinds)];
    this.managedRelics = new Set(this.relicKinds);
    for (const relicKind of this.relicKinds) this.spawn(relicKind);
  }

  reconcile(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (
        event.type !== "specialistActivated" &&
        event.type !== "specialistExpired"
      ) {
        continue;
      }
      const relicKind = eventRelicKind(event);
      if (!this.managedRelics.has(relicKind)) continue;
      const nextTick = event.type === "specialistActivated"
        ? event.tick + event.durationTicks + this.respawnTicks
        : event.tick + this.respawnTicks;
      this.nextSpawnTick.set(
        relicKind,
        Math.max(this.nextSpawnTick.get(relicKind) ?? 0, nextTick),
      );
    }

    for (const relicKind of this.relicKinds) {
      if (this.hasGroundRelic(relicKind)) continue;
      if (Object.values(this.state.players).some((player) =>
        isRelicActive(this.state, player, relicKind)
      )) continue;

      const nextTick = this.nextSpawnTick.get(relicKind) ??
        this.state.tick + this.respawnTicks;
      this.nextSpawnTick.set(relicKind, nextTick);
      if (this.state.tick < nextTick) continue;
      this.spawn(relicKind);
      this.nextSpawnTick.delete(relicKind);
    }
  }

  private hasGroundRelic(relicKind: PirateRelicKind): boolean {
    return this.state.drops.some((drop) => getDropRelicKind(drop) === relicKind);
  }

  private spawn(relicKind: PirateRelicKind): void {
    if (this.hasGroundRelic(relicKind)) return;
    const point = randomPointInCircle(
      this.state.randomState,
      Math.max(1, this.state.config.arenaRadius - 140),
    );
    this.state.randomState = point.state;
    const number = (this.spawnNumbers.get(relicKind) ?? 0) + 1;
    this.spawnNumbers.set(relicKind, number);
    const durationSeconds = getPirateRelicSpec(relicKind).durationSeconds;
    const relicTier = relicKind === "gilded-ledger"
      ? GILDED_LEDGER_TIERS[(number - 1) % GILDED_LEDGER_TIERS.length]
      : undefined;
    spawnDrop(this.state, {
      id: `${relicKind}-relic-${number}`,
      position: point.value,
      mass: 0,
      radius: PIRATE_RELIC_RADIUS,
      source: "arena",
      ...(relicKind === LEGACY_COLLECTOR_RELIC
        ? {
            specialist: "collector" as const,
            specialistDurationSeconds: durationSeconds,
          }
        : {
            relicKind,
            relicDurationSeconds: durationSeconds,
            ...(relicTier ? { relicTier } : {}),
          }),
    });
  }
}
