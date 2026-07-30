export const COMMON_TREASURE_MIN_MASS = 0.2;
export const COMMON_TREASURE_MAX_MASS = 0.6;
export const RARE_TREASURE_CHEST_MASS = 3.5;
export const RARE_TREASURE_CHEST_SIGNAL = 0.965;
export const STARTER_TREASURE_MASS = 0.4;
export const MASS_PER_BODY_SEGMENT = 30;

function unitSignal(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Math.abs(value)));
}

/**
 * Frequent food advances a long-run curve in small steps. A rare chest is a
 * deliberately visible acceleration moment, not the ordinary pickup rate.
 */
export function selectNeutralTreasureMass(
  sizeSignal: number,
  raritySignal: number,
): number {
  if (unitSignal(raritySignal) >= RARE_TREASURE_CHEST_SIGNAL) {
    return RARE_TREASURE_CHEST_MASS;
  }
  return COMMON_TREASURE_MIN_MASS +
    unitSignal(sizeSignal) * (COMMON_TREASURE_MAX_MASS - COMMON_TREASURE_MIN_MASS);
}
