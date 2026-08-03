/**
 * Stacking treasure multipliers (owner spec 2026-08-03): multiplier pickups
 * are no longer a one-at-a-time relic — every token ADDS its duration to that
 * tier's own timer with no cap ("2x lasts 20 seconds, another 2x is 40"),
 * different tiers run at the same time, and the active stack shows as chips
 * at the top of the screen. Tiers multiply together while they overlap.
 *
 * Pure shared module: the server room and the solo arena both run it through
 * core.ts, so live and solo behave identically.
 */
import type { TreasureMultiplierTier } from "./types";
import { isTreasureMultiplierTier } from "./relics";

/** Owner-specified seconds granted per pickup, per tier. */
export const TREASURE_BOOST_DURATION_SECONDS: Readonly<Record<TreasureMultiplierTier, number>> =
  Object.freeze({ 2: 20, 3: 15, 4: 10, 5: 10, 10: 5 });

/** tier -> authoritative expiry tick. Absent or past-tick means inactive. */
export type TreasureBoostStack = Partial<Record<TreasureMultiplierTier, number>>;

export const TREASURE_BOOST_TIERS = Object.freeze(
  [2, 3, 4, 5, 10] as const,
) satisfies readonly TreasureMultiplierTier[];

/**
 * Adds one pickup's duration to its tier timer. Stacking is additive with no
 * cap: the new expiry extends from the CURRENT expiry when the tier is
 * already running, from now when it is not.
 */
export function grantTreasureBoost(
  stack: TreasureBoostStack,
  tier: TreasureMultiplierTier,
  tick: number,
  fixedStepSeconds: number,
): TreasureBoostStack {
  if (!isTreasureMultiplierTier(tier)) return stack;
  if (!Number.isFinite(tick) || !Number.isFinite(fixedStepSeconds) || fixedStepSeconds <= 0) {
    return stack;
  }
  const durationTicks = Math.round(
    TREASURE_BOOST_DURATION_SECONDS[tier] / fixedStepSeconds,
  );
  const currentExpiry = stack[tier];
  const base = typeof currentExpiry === "number" && currentExpiry > tick ? currentExpiry : tick;
  stack[tier] = base + durationTicks;
  return stack;
}

/** Product of every running tier. 1 when nothing is active. */
export function effectiveTreasureBoost(
  stack: Readonly<TreasureBoostStack> | undefined,
  tick: number,
): number {
  if (!stack) return 1;
  let product = 1;
  for (const tier of TREASURE_BOOST_TIERS) {
    const expiry = stack[tier];
    if (typeof expiry === "number" && expiry > tick) product *= tier;
  }
  return product;
}

export interface TreasureBoostChip {
  tier: TreasureMultiplierTier;
  remainingSeconds: number;
}

/** The HUD chip list, highest tier first, only running tiers. */
export function activeTreasureBoostChips(
  stack: Readonly<TreasureBoostStack> | undefined,
  tick: number,
  fixedStepSeconds: number,
): TreasureBoostChip[] {
  if (!stack || !Number.isFinite(fixedStepSeconds) || fixedStepSeconds <= 0) return [];
  const chips: TreasureBoostChip[] = [];
  for (const tier of TREASURE_BOOST_TIERS) {
    const expiry = stack[tier];
    if (typeof expiry === "number" && expiry > tick) {
      chips.push({
        tier,
        remainingSeconds: Math.max(0, Math.ceil((expiry - tick) * fixedStepSeconds)),
      });
    }
  }
  return chips.sort((first, second) => second.tier - first.tier);
}

/** Drops expired tiers so long-lived players never accumulate dead keys. */
export function pruneTreasureBoosts(stack: TreasureBoostStack, tick: number): void {
  for (const tier of TREASURE_BOOST_TIERS) {
    const expiry = stack[tier];
    if (typeof expiry === "number" && expiry <= tick) delete stack[tier];
  }
}

/** Wire shape for the per-recipient snapshot field: [tier, remainingSeconds]. */
export function packTreasureBoostChips(
  stack: Readonly<TreasureBoostStack> | undefined,
  tick: number,
  fixedStepSeconds: number,
): Array<[number, number]> {
  return activeTreasureBoostChips(stack, tick, fixedStepSeconds)
    .map((chip) => [chip.tier, chip.remainingSeconds]);
}

/** Parses the wire field defensively; garbage becomes an empty chip list. */
export function parseTreasureBoostChips(value: unknown): TreasureBoostChip[] {
  if (!Array.isArray(value)) return [];
  const chips: TreasureBoostChip[] = [];
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2) continue;
    const [tier, remainingSeconds] = entry;
    if (!isTreasureMultiplierTier(tier)) continue;
    if (typeof remainingSeconds !== "number" || !Number.isFinite(remainingSeconds) || remainingSeconds < 0) continue;
    chips.push({ tier, remainingSeconds: Math.ceil(remainingSeconds) });
  }
  return chips.sort((first, second) => second.tier - first.tier);
}
