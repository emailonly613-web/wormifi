import type { TreasureBoostChip } from "../game/treasureBoosts";
import "./BoostChips.css";

/**
 * The stacked Treasure Multiplier chips pinned to the top of the arena
 * (owner spec 2026-08-03): one gold chip per running tier with its remaining
 * seconds, plus the combined total while tiers overlap.
 */
export function BoostChips({
  chips,
  testId = "boost-chips",
}: {
  chips: readonly TreasureBoostChip[];
  testId?: string;
}) {
  if (chips.length === 0) return null;
  const total = chips.reduce((product, chip) => product * chip.tier, 1);
  return (
    <div
      className="boost-chip-row"
      data-testid={testId}
      role="status"
      aria-label={`Treasure multiplier ×${total} active`}
    >
      {chips.map((chip) => (
        <span key={chip.tier} className="boost-chip" data-tier={chip.tier}>
          <b>×{chip.tier}</b>
          <small>{chip.remainingSeconds}s</small>
        </span>
      ))}
      {chips.length > 1 && (
        <span className="boost-chip boost-chip--total">
          <b>×{total}</b>
          <small>TOTAL</small>
        </span>
      )}
    </div>
  );
}
