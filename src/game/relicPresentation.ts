import {
  pirateSpritePath,
  type PirateSpriteName,
} from "./pirateSpriteAtlas";
import type {
  ActiveSpecialist,
  PirateRelicKind,
  SpecialistKind,
  TreasureMultiplierTier,
} from "./types";

const PUBLIC_ASSET_ROOT = import.meta.env.BASE_URL;

export type RelicCarrierTone =
  | "brass-current"
  | "emerald-watch"
  | "pepper-fire"
  | "gale-wind"
  | "maelstrom-current"
  | "storm-charge"
  | "gilded-fortune";

export interface RelicGroundSilhouette {
  spriteName: Extract<
    PirateSpriteName,
    | "loot-compass"
    | "emerald-spyglass"
    | "pepper-cutlass"
    | "shipwheel-shield"
    | "vortex-astrolabe"
  > | "treasure-multiplier" | "storm-battery";
  assetPath: string;
  accessibleLabel: string;
  scale: number;
  fallbackGlyph: string;
  motion:
    | "slow-turn"
    | "lens-gleam"
    | "ember-flicker"
    | "wind-stream"
    | "maelstrom-turn"
    | "lightning-pulse"
    | "multiplier-float";
  reducedMotionEquivalent: "static-high-contrast-outline";
}

export interface RelicPresentation {
  relicKind: PirateRelicKind;
  label: string;
  shortLabel: string;
  publishedDurationSeconds: 7 | 8 | 10 | 12;
  effectText: string;
  rivalDisclosure: string;
  carrierTone: RelicCarrierTone;
  carrierAccent: string;
  carrierHalo: string;
  ground: RelicGroundSilhouette;
}

export interface RelicStatusModel {
  presentation: RelicPresentation;
  remainingSeconds: number;
  roundedSeconds: number;
  durationSeconds: number;
  timerRatio: number;
  timerLabel: string;
  statusLabel: string;
  effectText: string;
  rivalDisclosure: string;
}

type RelicGroundIdentity = {
  specialist?: SpecialistKind;
  relicKind?: PirateRelicKind;
  relicTier?: TreasureMultiplierTier;
};

function presentation(
  relicKind: PirateRelicKind,
  values: Omit<RelicPresentation, "relicKind" | "ground"> & {
    ground: Omit<RelicGroundSilhouette, "assetPath">;
  },
): RelicPresentation {
  return Object.freeze({
    relicKind,
    ...values,
    ground: Object.freeze({
      ...values.ground,
      assetPath: values.ground.spriteName === "treasure-multiplier"
        ? ""
        : values.ground.spriteName === "storm-battery"
          ? `${PUBLIC_ASSET_ROOT}assets/relics/storm-battery.svg`
        : values.ground.spriteName === "loot-compass"
          ? `${PUBLIC_ASSET_ROOT}assets/relics/treasure-magnet.svg`
          : pirateSpritePath(values.ground.spriteName),
    }),
  });
}

export const RELIC_PRESENTATIONS: Readonly<
  Record<PirateRelicKind, RelicPresentation>
> = Object.freeze({
  "loot-compass": presentation("loot-compass", {
    label: "Treasure Magnet",
    shortLabel: "MAGNET",
    publishedDurationSeconds: 12,
    effectText: "PULLS GEMS + YOUR WAKE LOOT",
    rivalDisclosure: "EXTENDED PICKUP REACH",
    carrierTone: "brass-current",
    carrierAccent: "#ffd56a",
    carrierHalo: "rgba(255, 196, 73, 0.48)",
    ground: {
      spriteName: "loot-compass",
      accessibleLabel: "Treasure Magnet power-up on the arena floor",
      scale: 1.3,
      fallbackGlyph: "✦",
      motion: "slow-turn",
      reducedMotionEquivalent: "static-high-contrast-outline",
    },
  }),
  "emerald-spyglass": presentation("emerald-spyglass", {
    label: "Emerald Spyglass",
    shortLabel: "SPYGLASS",
    publishedDurationSeconds: 10,
    effectText: "25% FARTHER VIEW + DANGER BEARINGS",
    rivalDisclosure: "WIDER VIEW + BEARINGS ACTIVE",
    carrierTone: "emerald-watch",
    carrierAccent: "#56f2b3",
    carrierHalo: "rgba(42, 229, 163, 0.42)",
    ground: {
      spriteName: "emerald-spyglass",
      accessibleLabel: "Emerald Spyglass Relic on the arena floor",
      scale: 1.38,
      fallbackGlyph: "◇",
      motion: "lens-gleam",
      reducedMotionEquivalent: "static-high-contrast-outline",
    },
  }),
  "pepper-cutlass": presentation("pepper-cutlass", {
    label: "Pepper Cutlass",
    shortLabel: "CUTLASS",
    publishedDurationSeconds: 8,
    effectText: "BOOST COST -25% · SAME TOP SPEED",
    rivalDisclosure: "LOWER BOOST COST ACTIVE",
    carrierTone: "pepper-fire",
    carrierAccent: "#ff7459",
    carrierHalo: "rgba(255, 79, 55, 0.44)",
    ground: {
      spriteName: "pepper-cutlass",
      accessibleLabel: "Pepper Cutlass Relic on the arena floor",
      scale: 1.42,
      fallbackGlyph: "†",
      motion: "ember-flicker",
      reducedMotionEquivalent: "static-high-contrast-outline",
    },
  }),
  "gale-pennant": presentation("gale-pennant", {
    label: "Gale Pennant",
    shortLabel: "GALE",
    publishedDurationSeconds: 8,
    effectText: "MOVE +18% · COLLISIONS UNCHANGED",
    rivalDisclosure: "GALE SPEED ACTIVE",
    carrierTone: "gale-wind",
    carrierAccent: "#72dfff",
    carrierHalo: "rgba(72, 198, 255, 0.46)",
    ground: {
      spriteName: "shipwheel-shield",
      accessibleLabel: "Gale Pennant Relic on the arena floor",
      scale: 1.36,
      fallbackGlyph: "⚑",
      motion: "wind-stream",
      reducedMotionEquivalent: "static-high-contrast-outline",
    },
  }),
  "maelstrom-wheel": presentation("maelstrom-wheel", {
    label: "Maelstrom Wheel",
    shortLabel: "ZERO TURN",
    publishedDurationSeconds: 8,
    effectText: "ZERO-CLEARANCE TURNS · REPEAT FOR 8S",
    rivalDisclosure: "ZERO-TURN ACTIVE",
    carrierTone: "maelstrom-current",
    carrierAccent: "#b98cff",
    carrierHalo: "rgba(151, 94, 255, 0.48)",
    ground: {
      spriteName: "vortex-astrolabe",
      accessibleLabel: "Maelstrom Wheel Relic on the arena floor",
      scale: 1.38,
      fallbackGlyph: "↶",
      motion: "maelstrom-turn",
      reducedMotionEquivalent: "static-high-contrast-outline",
    },
  }),
  "storm-battery": presentation("storm-battery", {
    label: "Twin Turbo Lightning",
    shortLabel: "2× TANKS",
    publishedDurationSeconds: 7,
    effectText: "7S ZERO-COST TURBO · TWO FULL STARTING TANKS",
    rivalDisclosure: "TWIN TURBO CHARGE ACTIVE",
    carrierTone: "storm-charge",
    carrierAccent: "#ffe86b",
    carrierHalo: "rgba(84, 218, 255, 0.54)",
    ground: {
      spriteName: "storm-battery",
      accessibleLabel: "Twin Turbo Lightning power-up on the arena floor",
      scale: 1.4,
      fallbackGlyph: "ϟ",
      motion: "lightning-pulse",
      reducedMotionEquivalent: "static-high-contrast-outline",
    },
  }),
  "gilded-ledger": presentation("gilded-ledger", {
    label: "Treasure Multiplier",
    shortLabel: "MULTIPLIER",
    publishedDurationSeconds: 8,
    effectText: "2×, 3×, 4×, 5×, OR RARE 10× ALL TREASURE",
    rivalDisclosure: "TREASURE MULTIPLIER ACTIVE",
    carrierTone: "gilded-fortune",
    carrierAccent: "#ffe16b",
    carrierHalo: "rgba(255, 198, 45, 0.52)",
    ground: {
      spriteName: "treasure-multiplier",
      accessibleLabel: "Floating Treasure Multiplier on the arena floor",
      scale: 1.34,
      fallbackGlyph: "×",
      motion: "multiplier-float",
      reducedMotionEquivalent: "static-high-contrast-outline",
    },
  }),
});

export function isPirateRelicKind(value: unknown): value is PirateRelicKind {
  return value === "loot-compass" ||
    value === "emerald-spyglass" ||
    value === "pepper-cutlass" ||
    value === "gale-pennant" ||
    value === "maelstrom-wheel" ||
    value === "storm-battery" ||
    value === "gilded-ledger";
}

export function getRelicEffectText(
  relic: Readonly<RelicPresentation>,
  tier?: TreasureMultiplierTier,
): string {
  return relic.relicKind === "gilded-ledger" && tier
    ? `${tier}× ALL TREASURE`
    : relic.effectText;
}

export function getRelicRivalDisclosure(
  relic: Readonly<RelicPresentation>,
  tier?: TreasureMultiplierTier,
): string {
  return relic.relicKind === "gilded-ledger" && tier
    ? `${tier}× TREASURE ACTIVE`
    : relic.rivalDisclosure;
}

/** An absent protocol-v5 Relic identity is the original Treasure Magnet. */
export function resolveRelicPresentation(
  relicKind?: PirateRelicKind,
): RelicPresentation {
  return RELIC_PRESENTATIONS[relicKind ?? "loot-compass"];
}

export function getActiveRelicPresentation(
  active: Readonly<ActiveSpecialist> | undefined,
): RelicPresentation | undefined {
  if (!active || active.kind !== "collector") return undefined;
  return resolveRelicPresentation(active.relicKind);
}

export function getGroundRelicPresentation(
  drop: Readonly<RelicGroundIdentity>,
): RelicPresentation | undefined {
  if (drop.relicKind) return resolveRelicPresentation(drop.relicKind);
  if (drop.specialist === "collector") return resolveRelicPresentation();
  return undefined;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function createRelicStatusModel(
  active: Readonly<ActiveSpecialist> | undefined,
  currentTick: number,
  fixedStepSeconds: number,
): RelicStatusModel | undefined {
  const relic = getActiveRelicPresentation(active);
  if (
    !active ||
    !relic ||
    !Number.isSafeInteger(currentTick) ||
    currentTick < 0 ||
    !Number.isFinite(fixedStepSeconds) ||
    fixedStepSeconds <= 0 ||
    currentTick >= active.expiresAtTick ||
    active.durationTicks <= 0
  ) {
    return undefined;
  }

  const remainingSeconds = Math.max(
    0,
    (active.expiresAtTick - currentTick) * fixedStepSeconds,
  );
  const durationSeconds = active.durationTicks * fixedStepSeconds;
  const roundedSeconds = Math.max(1, Math.ceil(remainingSeconds - 1e-9));
  const effectText = getRelicEffectText(relic, active.relicTier);
  const rivalDisclosure = getRelicRivalDisclosure(relic, active.relicTier);
  return {
    presentation: relic,
    remainingSeconds,
    roundedSeconds,
    durationSeconds,
    timerRatio: clamp(remainingSeconds / durationSeconds, 0, 1),
    timerLabel: `${roundedSeconds} ${roundedSeconds === 1 ? "second" : "seconds"} remaining`,
    statusLabel: `${relic.label} active. ${effectText}.`,
    effectText,
    rivalDisclosure,
  };
}
