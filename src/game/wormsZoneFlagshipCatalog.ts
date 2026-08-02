import {
  WORMS_ZONE_FLAGSHIP_GAME_VERSION,
  WORMS_ZONE_FLAGSHIP_SKINS as GENERATED_FLAGSHIP_SKINS,
  WORMS_ZONE_FLAGSHIP_TOTAL_SOURCE_OFFERS,
} from "./wormsZoneFlagshipCatalog.generated";

export { WORMS_ZONE_FLAGSHIP_GAME_VERSION, WORMS_ZONE_FLAGSHIP_TOTAL_SOURCE_OFFERS };

export interface WormsZoneFlagshipSkin {
  sku: string;
  name: string;
  description: string;
  sourcePriceUsd: number;
  sourcePriceLabel: string;
  sourceImageUrl: string;
  localAsset?: string;
  sha256?: string;
  byteLength?: number;
  artworkStatus: "verified-local" | "source-placeholder";
}

export const WORMS_ZONE_FLAGSHIP_SKINS = GENERATED_FLAGSHIP_SKINS as readonly WormsZoneFlagshipSkin[];
export const WORMS_ZONE_FLAGSHIP_SKIN_COUNT = WORMS_ZONE_FLAGSHIP_SKINS.length;
export const WORMS_ZONE_VERIFIED_SKINS = WORMS_ZONE_FLAGSHIP_SKINS.filter(
  (skin) => skin.artworkStatus === "verified-local",
);
export const WORMS_ZONE_SOURCE_PLACEHOLDER_SKINS = WORMS_ZONE_FLAGSHIP_SKINS.filter(
  (skin) => skin.artworkStatus === "source-placeholder",
);

export function flagshipSkinBySku(sku: string): WormsZoneFlagshipSkin | undefined {
  return WORMS_ZONE_FLAGSHIP_SKINS.find((skin) => skin.sku === sku);
}

export function flagshipArtworkPath(skin: WormsZoneFlagshipSkin): string | undefined {
  return skin.artworkStatus === "verified-local" ? skin.localAsset : undefined;
}
