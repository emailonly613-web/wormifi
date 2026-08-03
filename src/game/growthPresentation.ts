/**
 * Growth easing for the DRAWN worm (owner 2026-08-03: "when any worm starts
 * to eat it grows out of control as if it's an obvious engineering flaw").
 *
 * Measured with the real engine: vacuuming a death hoard moves mass 49 -> 499
 * inside one second — radius +82%, a new body segment every other tick, every
 * step applied the same tick it happened. On screen that is a balloon
 * inflating, not a creature growing.
 *
 * This module eases the PRESENTED mass toward the authoritative mass in real
 * time. Only rendering reads it: collision, pickups, camera math and the
 * server stay on the true mass, so fairness is untouched. (During a burst the
 * drawn worm briefly trails its true hitbox — the standard genre trade, gone
 * in under half a second.)
 */

/** Presented growth half-life. Big meals swell over ~3 frames-of-thought. */
export const GROWTH_EASE_HALF_LIFE_SECONDS = 0.35;

/**
 * A shrink (death drops, boost spend) presents faster than growth — losing
 * mass is combat feedback and must not feel laggy.
 */
export const SHRINK_EASE_HALF_LIFE_SECONDS = 0.12;

/** Beyond this ratio jump, snap: respawn/teleport, never a meal. */
const SNAP_RATIO = 3;

interface EasedEntry {
  mass: number;
  lastFrameAtMs: number;
}

export interface GrowthEasingState {
  byId: Map<string, EasedEntry>;
  lastPruneAtMs: number;
}

export function createGrowthEasingState(): GrowthEasingState {
  return { byId: new Map(), lastPruneAtMs: 0 };
}

/**
 * Returns the eased presentation mass for one worm this frame and advances
 * its state. Invalid inputs present the authoritative mass unchanged.
 */
export function easedMassFor(
  state: GrowthEasingState,
  playerId: string,
  authoritativeMass: number,
  frameAtMs: number,
): number {
  if (!Number.isFinite(authoritativeMass) || authoritativeMass < 0) return authoritativeMass;
  if (!Number.isFinite(frameAtMs)) return authoritativeMass;
  const entry = state.byId.get(playerId);
  if (!entry) {
    state.byId.set(playerId, { mass: authoritativeMass, lastFrameAtMs: frameAtMs });
    return authoritativeMass;
  }
  const ratio = entry.mass > 0 ? authoritativeMass / entry.mass : SNAP_RATIO;
  if (ratio >= SNAP_RATIO || ratio <= 1 / SNAP_RATIO) {
    entry.mass = authoritativeMass;
    entry.lastFrameAtMs = frameAtMs;
    return entry.mass;
  }
  const deltaSeconds = Math.max(0, Math.min(0.25, (frameAtMs - entry.lastFrameAtMs) / 1_000));
  const halfLife = authoritativeMass >= entry.mass
    ? GROWTH_EASE_HALF_LIFE_SECONDS
    : SHRINK_EASE_HALF_LIFE_SECONDS;
  const response = 1 - Math.pow(0.5, deltaSeconds / halfLife);
  entry.mass += (authoritativeMass - entry.mass) * response;
  entry.lastFrameAtMs = frameAtMs;
  return entry.mass;
}

/** Drops worms not seen for two seconds (dead, culled, or left the room). */
export function pruneGrowthEasing(state: GrowthEasingState, frameAtMs: number): void {
  if (frameAtMs - state.lastPruneAtMs < 2_000) return;
  state.lastPruneAtMs = frameAtMs;
  for (const [id, entry] of state.byId) {
    if (frameAtMs - entry.lastFrameAtMs > 2_000) state.byId.delete(id);
  }
}
