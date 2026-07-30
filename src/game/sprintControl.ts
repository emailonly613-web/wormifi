/**
 * A fast tap must survive long enough to reach both the local fixed-step loop
 * and a live server tick. Holding the control still keeps sprint active until
 * release; this is only the minimum burst granted to a deliberate press.
 */
export const MINIMUM_SPRINT_BURST_MS = 240;

export function remainingSprintBurstMs(
  startedAtMs: number | undefined,
  releasedAtMs: number,
): number {
  if (startedAtMs === undefined || !Number.isFinite(startedAtMs)) return 0;
  if (!Number.isFinite(releasedAtMs)) return MINIMUM_SPRINT_BURST_MS;
  return Math.max(0, MINIMUM_SPRINT_BURST_MS - Math.max(0, releasedAtMs - startedAtMs));
}
