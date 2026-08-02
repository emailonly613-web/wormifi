import {
  WORMATE_PARENT_ABILITIES,
  WORMATE_PARENT_EYES,
  WORMATE_PARENT_GLASSES,
  WORMATE_PARENT_HATS,
  WORMATE_PARENT_MOUTHS,
  WORMATE_PARENT_PORTIONS,
  WORMATE_PARENT_REGIONS,
  WORMATE_PARENT_REVISION,
  WORMATE_PARENT_SKINS,
  WORMATE_PARENT_SKIN_GROUPS,
} from "./wormateParentCatalog.generated.ts";

export {
  WORMATE_PARENT_ABILITIES,
  WORMATE_PARENT_ABILITY_ATLAS_SIZE,
  WORMATE_PARENT_EYES,
  WORMATE_PARENT_GLASSES,
  WORMATE_PARENT_HATS,
  WORMATE_PARENT_MOUTHS,
  WORMATE_PARENT_PORTIONS,
  WORMATE_PARENT_PORTION_ATLAS_SIZE,
  WORMATE_PARENT_REGIONS,
  WORMATE_PARENT_REVISION,
  WORMATE_PARENT_SKINS,
  WORMATE_PARENT_SKIN_ATLAS_SIZE,
  WORMATE_PARENT_SKIN_GROUPS,
  WORMATE_PARENT_WEAR_ATLAS_SIZE,
} from "./wormateParentCatalog.generated.ts";

export type WormateParentSkin = typeof WORMATE_PARENT_SKINS[number];
export type WormateParentSkinId = WormateParentSkin["id"];
export type WormateParentSkinGroup = typeof WORMATE_PARENT_SKIN_GROUPS[number];
export type WormateParentEye = typeof WORMATE_PARENT_EYES[number];
export type WormateParentEyeId = WormateParentEye["id"];
export type WormateParentMouth = typeof WORMATE_PARENT_MOUTHS[number];
export type WormateParentMouthId = WormateParentMouth["id"];
export type WormateParentGlasses = typeof WORMATE_PARENT_GLASSES[number];
export type WormateParentGlassesId = WormateParentGlasses["id"];
export type WormateParentHat = typeof WORMATE_PARENT_HATS[number];
export type WormateParentHatId = WormateParentHat["id"];
export type WormateParentWearable =
  | WormateParentEye
  | WormateParentMouth
  | WormateParentGlasses
  | WormateParentHat;
export type WormateParentWearableKind = "eyes" | "mouth" | "glasses" | "hat";
export type WormateParentPortion = typeof WORMATE_PARENT_PORTIONS[number];
export type WormateParentPortionId = WormateParentPortion["id"];
export type WormateParentAbility = typeof WORMATE_PARENT_ABILITIES[number];
export type WormateParentAbilityId = WormateParentAbility["id"];
export type WormateParentRegionId = keyof typeof WORMATE_PARENT_REGIONS;
export type WormateParentThemeId =
  | `wormate-parent-${number}`
  | `wormate-parent-${number}-e${number}-m${number}-g${number}-h${number}`;

export interface WormateParentOutfit {
  eyeId: WormateParentEyeId;
  mouthId: WormateParentMouthId;
  glassesId: WormateParentGlassesId;
  hatId: WormateParentHatId;
}

export interface WormateParentAppearance {
  skinId: WormateParentSkinId;
  outfit: WormateParentOutfit;
}

export const DEFAULT_WORMATE_PARENT_SKIN_ID = 32 as WormateParentSkinId;
export const DEFAULT_WORMATE_PARENT_OUTFIT: WormateParentOutfit = Object.freeze({
  eyeId: 0,
  mouthId: 0,
  glassesId: 0,
  hatId: 0,
});
export const WORMATE_PARENT_THEME_PREFIX = "wormate-parent-" as const;

export const WORMATE_PARENT_WEARABLE_CATALOGS = Object.freeze({
  eyes: WORMATE_PARENT_EYES,
  mouth: WORMATE_PARENT_MOUTHS,
  glasses: WORMATE_PARENT_GLASSES,
  hat: WORMATE_PARENT_HATS,
});

const SKIN_BY_ID: ReadonlyMap<number, WormateParentSkin> = new Map(
  WORMATE_PARENT_SKINS.map((skin) => [skin.id, skin]),
);
const EYE_BY_ID: ReadonlyMap<number, WormateParentEye> = new Map(
  WORMATE_PARENT_EYES.map((item) => [item.id, item]),
);
const MOUTH_BY_ID: ReadonlyMap<number, WormateParentMouth> = new Map(
  WORMATE_PARENT_MOUTHS.map((item) => [item.id, item]),
);
const GLASSES_BY_ID: ReadonlyMap<number, WormateParentGlasses> = new Map(
  WORMATE_PARENT_GLASSES.map((item) => [item.id, item]),
);
const HAT_BY_ID: ReadonlyMap<number, WormateParentHat> = new Map(
  WORMATE_PARENT_HATS.map((item) => [item.id, item]),
);
const PORTION_BY_ID: ReadonlyMap<number, WormateParentPortion> = new Map(
  WORMATE_PARENT_PORTIONS.map((item) => [item.id, item]),
);
const ABILITY_BY_ID: ReadonlyMap<number, WormateParentAbility> = new Map(
  WORMATE_PARENT_ABILITIES.map((item) => [item.id, item]),
);

const THEME_PATTERN = /^wormate-parent-(0|[1-9]\d{0,4})(?:-e(0|[1-9]\d{0,4})-m(0|[1-9]\d{0,4})-g(0|[1-9]\d{0,4})-h(0|[1-9]\d{0,4}))?$/u;

export function isWormateParentSkinId(value: unknown): value is WormateParentSkinId {
  return Number.isSafeInteger(value) && SKIN_BY_ID.has(value as number);
}

export function isWormateParentEyeId(value: unknown): value is WormateParentEyeId {
  return Number.isSafeInteger(value) && EYE_BY_ID.has(value as number);
}

export function isWormateParentMouthId(value: unknown): value is WormateParentMouthId {
  return Number.isSafeInteger(value) && MOUTH_BY_ID.has(value as number);
}

export function isWormateParentGlassesId(value: unknown): value is WormateParentGlassesId {
  return Number.isSafeInteger(value) && GLASSES_BY_ID.has(value as number);
}

export function isWormateParentHatId(value: unknown): value is WormateParentHatId {
  return Number.isSafeInteger(value) && HAT_BY_ID.has(value as number);
}

export function getWormateParentSkin(value: unknown): WormateParentSkin {
  return SKIN_BY_ID.get(typeof value === "number" ? value : Number.NaN) ??
    SKIN_BY_ID.get(DEFAULT_WORMATE_PARENT_SKIN_ID) ??
    WORMATE_PARENT_SKINS[0];
}

export function getWormateParentWearable(
  kind: WormateParentWearableKind,
  value: unknown,
): WormateParentWearable {
  const numeric = typeof value === "number" ? value : Number.NaN;
  if (kind === "eyes") return EYE_BY_ID.get(numeric) ?? EYE_BY_ID.get(0) ?? WORMATE_PARENT_EYES[0];
  if (kind === "mouth") return MOUTH_BY_ID.get(numeric) ?? MOUTH_BY_ID.get(0) ?? WORMATE_PARENT_MOUTHS[0];
  if (kind === "glasses") return GLASSES_BY_ID.get(numeric) ?? GLASSES_BY_ID.get(0) ?? WORMATE_PARENT_GLASSES[0];
  return HAT_BY_ID.get(numeric) ?? HAT_BY_ID.get(0) ?? WORMATE_PARENT_HATS[0];
}

export function getWormateParentPortion(value: unknown): WormateParentPortion {
  return PORTION_BY_ID.get(typeof value === "number" ? value : Number.NaN) ??
    WORMATE_PARENT_PORTIONS[0];
}

export function getWormateParentAbility(value: unknown): WormateParentAbility {
  return ABILITY_BY_ID.get(typeof value === "number" ? value : Number.NaN) ??
    WORMATE_PARENT_ABILITIES[0];
}

export function wormateParentAppearanceFromThemeId(
  value: unknown,
): WormateParentAppearance | undefined {
  if (typeof value !== "string") return undefined;
  const match = THEME_PATTERN.exec(value);
  if (!match) return undefined;
  const skinId = Number(match[1]);
  const eyeId = Number(match[2] ?? 0);
  const mouthId = Number(match[3] ?? 0);
  const glassesId = Number(match[4] ?? 0);
  const hatId = Number(match[5] ?? 0);
  if (
    !isWormateParentSkinId(skinId) ||
    !isWormateParentEyeId(eyeId) ||
    !isWormateParentMouthId(mouthId) ||
    !isWormateParentGlassesId(glassesId) ||
    !isWormateParentHatId(hatId)
  ) return undefined;
  return { skinId, outfit: { eyeId, mouthId, glassesId, hatId } };
}

export function wormateParentThemeId(
  skinId: WormateParentSkinId,
  outfit: Readonly<WormateParentOutfit> = DEFAULT_WORMATE_PARENT_OUTFIT,
): WormateParentThemeId {
  if (
    outfit.eyeId === 0 &&
    outfit.mouthId === 0 &&
    outfit.glassesId === 0 &&
    outfit.hatId === 0
  ) return `${WORMATE_PARENT_THEME_PREFIX}${skinId}`;
  return [
    WORMATE_PARENT_THEME_PREFIX,
    skinId,
    "-e",
    outfit.eyeId,
    "-m",
    outfit.mouthId,
    "-g",
    outfit.glassesId,
    "-h",
    outfit.hatId,
  ].join("") as WormateParentThemeId;
}

export function wormateParentThemeIdWithSkin(
  currentThemeId: unknown,
  skinId: WormateParentSkinId,
): WormateParentThemeId {
  const current = wormateParentAppearanceFromThemeId(currentThemeId);
  return wormateParentThemeId(skinId, current?.outfit ?? DEFAULT_WORMATE_PARENT_OUTFIT);
}

export function wormateParentThemeIdWithWearable(
  currentThemeId: unknown,
  kind: WormateParentWearableKind,
  wearableId: number,
): WormateParentThemeId {
  const current = wormateParentAppearanceFromThemeId(currentThemeId) ?? {
    skinId: DEFAULT_WORMATE_PARENT_SKIN_ID,
    outfit: DEFAULT_WORMATE_PARENT_OUTFIT,
  };
  const outfit = { ...current.outfit };
  if (kind === "eyes" && isWormateParentEyeId(wearableId)) outfit.eyeId = wearableId;
  if (kind === "mouth" && isWormateParentMouthId(wearableId)) outfit.mouthId = wearableId;
  if (kind === "glasses" && isWormateParentGlassesId(wearableId)) outfit.glassesId = wearableId;
  if (kind === "hat" && isWormateParentHatId(wearableId)) outfit.hatId = wearableId;
  return wormateParentThemeId(current.skinId, outfit);
}

export function wormateParentSkinIdFromThemeId(value: unknown): WormateParentSkinId | undefined {
  return wormateParentAppearanceFromThemeId(value)?.skinId;
}

export function wormateParentOutfitFromThemeId(value: unknown): WormateParentOutfit | undefined {
  return wormateParentAppearanceFromThemeId(value)?.outfit;
}

export function isWormateParentThemeId(value: unknown): value is WormateParentThemeId {
  return wormateParentAppearanceFromThemeId(value) !== undefined;
}

export function wormateParentSkinLabel(skin: WormateParentSkin): string {
  return `${skin.groupLabel.toUpperCase()} · ${String(skin.id).padStart(4, "0")}`;
}

export function wormateParentWearableLabel(
  kind: WormateParentWearableKind,
  wearable: Readonly<WormateParentWearable>,
): string {
  const category = kind === "eyes" ? "EYES" : kind.toUpperCase();
  return `${category} · ${String(wearable.id).padStart(4, "0")}`;
}

function normalizedIdentity(identity: number): number {
  return Number.isFinite(identity) ? Math.abs(Math.trunc(identity)) : 0;
}

export function wormateParentSkinForIdentity(identity: number): WormateParentSkinId {
  return WORMATE_PARENT_SKINS[normalizedIdentity(identity) % WORMATE_PARENT_SKINS.length].id;
}

export function wormateParentOutfitForIdentity(identity: number): WormateParentOutfit {
  const seed = normalizedIdentity(identity);
  return {
    eyeId: WORMATE_PARENT_EYES[(seed * 7 + 3) % WORMATE_PARENT_EYES.length].id,
    mouthId: WORMATE_PARENT_MOUTHS[(seed * 11 + 5) % WORMATE_PARENT_MOUTHS.length].id,
    glassesId: WORMATE_PARENT_GLASSES[(seed * 13 + 1) % WORMATE_PARENT_GLASSES.length].id,
    hatId: WORMATE_PARENT_HATS[(seed * 17 + 2) % WORMATE_PARENT_HATS.length].id,
  };
}
