import type { DropState, GameState } from "./types";

export const AMBIENT_TREASURE_MIN_LIFETIME_SECONDS = 24;
export const AMBIENT_TREASURE_MAX_LIFETIME_SECONDS = 42;
export const AMBIENT_TREASURE_FADE_IN_SECONDS = 0.8;
export const AMBIENT_TREASURE_FADE_OUT_SECONDS = 2.6;

/**
 * Stagger ordinary treasure lifetimes without consuming simulation RNG. This
 * preserves deterministic placement while ensuring the field never refreshes
 * in one obvious wave.
 */
export function ambientTreasureLifetimeTicks(
  entityNumber: number,
  fixedStepSeconds: number,
): number {
  const safeEntity = Number.isFinite(entityNumber) ? Math.abs(Math.trunc(entityNumber)) : 0;
  const mixed = Math.imul(safeEntity ^ 0x45d9f3b, 0x27d4eb2d) >>> 0;
  const unit = mixed / 0xffff_ffff;
  const seconds = AMBIENT_TREASURE_MIN_LIFETIME_SECONDS +
    unit * (AMBIENT_TREASURE_MAX_LIFETIME_SECONDS - AMBIENT_TREASURE_MIN_LIFETIME_SECONDS);
  return Math.max(1, Math.round(seconds / Math.max(0.001, fixedStepSeconds)));
}

export function isExpiringAmbientTreasure(
  drop: Pick<DropState, "source" | "mass" | "specialist" | "relicKind" | "expiresAtTick">,
): boolean {
  return drop.source === "arena" &&
    drop.mass > 0 &&
    !drop.specialist &&
    !drop.relicKind &&
    drop.expiresAtTick !== undefined;
}

/** Remove only neutral arena treasure. Echo mass and timed Relics never move. */
export function expireAmbientTreasure(state: GameState): number {
  const before = state.drops.length;
  state.drops = state.drops.filter((drop) =>
    !isExpiringAmbientTreasure(drop) || drop.expiresAtTick! > state.tick
  );
  return before - state.drops.length;
}

export function ambientTreasureOpacity(
  drop: { spawnedAtTick?: number; expiresAtTick?: number },
  currentTick: number,
  fixedStepSeconds: number,
): number {
  if (drop.expiresAtTick === undefined) return 1;
  const safeStep = Math.max(0.001, fixedStepSeconds);
  const fadeInTicks = Math.max(1, Math.round(AMBIENT_TREASURE_FADE_IN_SECONDS / safeStep));
  const fadeOutTicks = Math.max(1, Math.round(AMBIENT_TREASURE_FADE_OUT_SECONDS / safeStep));
  const spawnedAtTick = drop.spawnedAtTick ?? currentTick - fadeInTicks;
  const fadeIn = Math.max(0, Math.min(1, (currentTick - spawnedAtTick) / fadeInTicks));
  const fadeOut = Math.max(0, Math.min(1, (drop.expiresAtTick - currentTick) / fadeOutTicks));
  return Math.min(fadeIn, fadeOut);
}
