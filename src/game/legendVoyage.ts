import { PREMIUM_COSMETIC_THEME_IDS, getCosmeticTheme } from "./cosmeticThemes";

export const LEGEND_VOYAGE = Object.freeze({
  id: "legend-voyage-one",
  label: "LEGEND VOYAGE",
  permanent: true,
  purchasable: false,
});

export const LEGEND_VOYAGE_THEME_IDS = Object.freeze([
  "krakens-ink",
  "phoenix-wake",
  "leviathan-scale",
] as const);

export const LEGEND_VOYAGE_REWARDS = Object.freeze([
  { level: 1, label: "CHOOSE ONE COMPLETE LEGEND", detail: "Animated body, living face, and matched signature wake." },
  { level: 4, label: "RARE WAKE EFFECT", detail: "A readable cosmetic trail with reduced-motion and low-effects versions." },
  { level: 7, label: "SECOND COMPLETE LEGEND", detail: "A second full identity—not a recolor and never a gameplay boost." },
  { level: 10, label: "ARRIVAL FLOURISH", detail: "A short spawn celebration that never hides the safe-head ring." },
  { level: 13, label: "THIRD COMPLETE LEGEND", detail: "The full Kraken, Phoenix, and Leviathan trio is now yours." },
  { level: 16, label: "TRIUMPH BURST", detail: "An elimination flourish with no collision, damage, or visibility benefit." },
  { level: 20, label: "VOYAGE MASTER NAMEPLATE", detail: "Permanent animated title proving the route was completed." },
] as const);

for (const themeId of LEGEND_VOYAGE_THEME_IDS) {
  if (!PREMIUM_COSMETIC_THEME_IDS.has(themeId)) {
    throw new Error(`Legend Voyage theme ${themeId} is not a premium catalog entry.`);
  }
  if (getCosmeticTheme(themeId).tier !== "legend") {
    throw new Error(`Legend Voyage theme ${themeId} is not a legend.`);
  }
}
