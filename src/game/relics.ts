import type {
  ActiveSpecialist,
  DropState,
  PirateRelicKind,
  PlayerState,
  TreasureMultiplierTier,
} from "./types";

export interface PirateRelicSpec {
  kind: PirateRelicKind;
  name: string;
  durationSeconds: number;
}

/**
 * `collector` shipped before named pirate Relics. On protocol v5 it remains
 * the compatibility envelope for an active slot; an absent `relicKind` means
 * Treasure Magnet exactly, so recorded replays and older clients keep working.
 */
export const LEGACY_COLLECTOR_RELIC: PirateRelicKind = "loot-compass";

export const PIRATE_RELIC_SPECS: Readonly<Record<PirateRelicKind, PirateRelicSpec>> =
  Object.freeze({
    "loot-compass": Object.freeze({
      kind: "loot-compass",
      name: "Treasure Magnet",
      durationSeconds: 12,
    }),
    "emerald-spyglass": Object.freeze({
      kind: "emerald-spyglass",
      name: "Emerald Spyglass",
      durationSeconds: 10,
    }),
    "pepper-cutlass": Object.freeze({
      kind: "pepper-cutlass",
      name: "Pepper Cutlass",
      durationSeconds: 8,
    }),
    "gale-pennant": Object.freeze({
      kind: "gale-pennant",
      name: "Gale Pennant",
      durationSeconds: 8,
    }),
    "maelstrom-wheel": Object.freeze({
      kind: "maelstrom-wheel",
      name: "Maelstrom Wheel",
      durationSeconds: 8,
    }),
    "storm-battery": Object.freeze({
      kind: "storm-battery",
      name: "Twin Turbo Lightning",
      // One launch-size Turbo tank is 3.5 seconds. Seven seconds is exactly
      // two full tanks of authoritative zero-cost sprint at launch tuning.
      durationSeconds: 7,
    }),
    "gilded-ledger": Object.freeze({
      kind: "gilded-ledger",
      name: "Treasure Multiplier",
      durationSeconds: 8,
    }),
  });

export const PEPPER_CUTLASS_BOOST_COST_MULTIPLIER = 0.75;
export const GALE_PENNANT_SPEED_MULTIPLIER = 1.18;
export const SPYGLASS_CAMERA_ZOOM_MULTIPLIER = 0.8;
export const GILDED_LEDGER_TIERS = Object.freeze([
  2,
  3,
  4,
  5,
  10,
  2,
  3,
  2,
  4,
  2,
] as const satisfies readonly TreasureMultiplierTier[]);

export function isTreasureMultiplierTier(
  value: unknown,
): value is TreasureMultiplierTier {
  return value === 2 || value === 3 || value === 4 || value === 5 || value === 10;
}

export function getPirateRelicSpec(kind: PirateRelicKind): PirateRelicSpec {
  return PIRATE_RELIC_SPECS[kind];
}

export function getActiveRelicKind(
  active: Readonly<ActiveSpecialist> | undefined,
): PirateRelicKind | undefined {
  if (!active || active.kind !== "collector") return undefined;
  return active.relicKind ?? LEGACY_COLLECTOR_RELIC;
}

export function getDropRelicKind(
  drop: Pick<DropState, "specialist" | "relicKind">,
): PirateRelicKind | undefined {
  if (drop.relicKind) return drop.relicKind;
  return drop.specialist === "collector" ? LEGACY_COLLECTOR_RELIC : undefined;
}

export function isRelicActiveAtTick(
  active: Readonly<ActiveSpecialist> | undefined,
  tick: number,
  relicKind: PirateRelicKind,
): boolean {
  return Boolean(
    active &&
      tick < active.expiresAtTick &&
      getActiveRelicKind(active) === relicKind,
  );
}

export function getBoostMassCostMultiplier(
  active: Readonly<ActiveSpecialist> | undefined,
  tick: number,
): number {
  if (isRelicActiveAtTick(active, tick, "storm-battery")) return 0;
  return isRelicActiveAtTick(active, tick, "pepper-cutlass")
    ? PEPPER_CUTLASS_BOOST_COST_MULTIPLIER
    : 1;
}

export function getMovementSpeedMultiplier(
  active: Readonly<ActiveSpecialist> | undefined,
  tick: number,
): number {
  return isRelicActiveAtTick(active, tick, "gale-pennant")
    ? GALE_PENNANT_SPEED_MULTIPLIER
    : 1;
}

export function getCameraZoomMultiplier(
  active: Readonly<ActiveSpecialist> | undefined,
  tick: number,
): number {
  return isRelicActiveAtTick(active, tick, "emerald-spyglass")
    ? SPYGLASS_CAMERA_ZOOM_MULTIPLIER
    : 1;
}

export function getTreasureMassMultiplier(
  active: Readonly<ActiveSpecialist> | undefined,
  tick: number,
): 1 | TreasureMultiplierTier {
  if (!isRelicActiveAtTick(active, tick, "gilded-ledger")) return 1;
  return isTreasureMultiplierTier(active?.relicTier) ? active.relicTier : 1;
}

export type SpyglassDangerSector =
  | "E"
  | "SE"
  | "S"
  | "SW"
  | "W"
  | "NW"
  | "N"
  | "NE";

export interface SpyglassDangerBearing {
  sector: SpyglassDangerSector;
  distanceBand: "near" | "far";
  threatCount: number;
}

const SPYGLASS_SECTORS: readonly SpyglassDangerSector[] = [
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
  "N",
  "NE",
];

/**
 * Produces deliberately coarse, position-free radar intelligence. The caller
 * supplies its actual visible radius; contacts already on screen and contacts
 * beyond three screens are omitted. No rival id or exact coordinate escapes.
 */
export function getSpyglassDangerBearings(
  carrier: Pick<PlayerState, "id" | "position" | "specialist">,
  rivals: readonly Pick<PlayerState, "id" | "position" | "alive">[],
  tick: number,
  visibleRadius: number,
): SpyglassDangerBearing[] {
  if (
    !Number.isFinite(visibleRadius) ||
    visibleRadius <= 0 ||
    !isRelicActiveAtTick(carrier.specialist, tick, "emerald-spyglass")
  ) {
    return [];
  }

  const maximumRadius = visibleRadius * 3;
  const sectors = new Map<SpyglassDangerSector, {
    nearestDistance: number;
    threatCount: number;
  }>();

  for (const rival of rivals) {
    if (!rival.alive || rival.id === carrier.id) continue;
    const deltaX = rival.position.x - carrier.position.x;
    const deltaY = rival.position.y - carrier.position.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance <= visibleRadius || distance > maximumRadius) continue;

    const rawIndex = Math.round(Math.atan2(deltaY, deltaX) / (Math.PI / 4));
    const sector = SPYGLASS_SECTORS[(rawIndex + 8) % 8];
    const current = sectors.get(sector);
    sectors.set(sector, {
      nearestDistance: Math.min(current?.nearestDistance ?? Infinity, distance),
      threatCount: (current?.threatCount ?? 0) + 1,
    });
  }

  return SPYGLASS_SECTORS.flatMap((sector) => {
    const contact = sectors.get(sector);
    if (!contact) return [];
    return [{
      sector,
      distanceBand: contact.nearestDistance <= visibleRadius * 2 ? "near" : "far",
      threatCount: contact.threatCount,
    } satisfies SpyglassDangerBearing];
  });
}
