import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const registryPath = resolve(
  repositoryRoot,
  "public/assets/parent-wormate/registry.json",
);
const outputPath = resolve(
  repositoryRoot,
  "src/game/wormateParentCatalog.generated.ts",
);

const registry = JSON.parse(await readFile(registryPath, "utf8"));
const groupBySkinId = new Map();
for (const group of registry.skinGroupArrayDict) {
  for (const skinId of group.list) groupBySkinId.set(skinId, group);
}

const skins = registry.skinArrayDict.map((skin) => {
  const group = groupBySkinId.get(skin.id);
  if (!group) throw new Error(`Parent skin ${skin.id} is missing a group`);
  if (!Array.isArray(skin.base) || skin.base.length === 0) {
    throw new Error(`Parent skin ${skin.id} has no base sprite sequence`);
  }
  if (!Array.isArray(skin.glow) || skin.glow.length === 0) {
    throw new Error(`Parent skin ${skin.id} has no glow sprite sequence`);
  }
  return {
    id: skin.id,
    groupId: group.id,
    groupLabel: group.name.en,
    guest: skin.guest === true,
    nonbuyable: skin.nonbuyable === true,
    prime: skin.prime,
    base: skin.base,
    glow: skin.glow,
  };
});

const groups = registry.skinGroupArrayDict.map((group) => ({
  id: group.id,
  label: group.name.en,
  skinIds: group.list,
}));

const wearableCatalog = (dictionary) => Object.entries(dictionary).map(([id, item]) => ({
  id: Number(id),
  guest: item.guest === true,
  nonbuyable: item.nonbuyable === true,
  ...(item.prime ? { prime: item.prime } : {}),
  base: item.base.map((part) => part.region),
}));

const eyes = wearableCatalog(registry.eyesDict);
const mouths = wearableCatalog(registry.mouthDict);
const glasses = wearableCatalog(registry.glassesDict);
const hats = wearableCatalog(registry.hatDict);
const portions = Object.entries(registry.portionDict).map(([id, item]) => ({
  id: Number(id),
  base: item.base,
  glow: item.glow,
}));
const abilities = Object.entries(registry.abilityDict).map(([id, item]) => ({
  id: Number(id),
  base: item.base,
}));

const requiredRegions = new Set([
  ...skins.flatMap((skin) => [...skin.base, ...skin.glow]),
  ...eyes.flatMap((item) => item.base),
  ...mouths.flatMap((item) => item.base),
  ...glasses.flatMap((item) => item.base),
  ...hats.flatMap((item) => item.base),
  ...portions.flatMap((item) => [item.base, item.glow]),
  ...abilities.map((item) => item.base),
]);

const textureName = (texture) => {
  if (texture === "A") return "wear";
  if (texture === "B") return "skins";
  if (texture === "C") return "abilities";
  if (texture === "D") return "portions";
  throw new Error(`Unsupported parent texture ${texture}`);
};

const regions = {};
for (const regionId of [...requiredRegions].sort()) {
  const region = registry.regionDict[regionId];
  if (!region) throw new Error(`Parent region ${regionId} is missing`);
  regions[regionId] = {
    texture: textureName(region.texture),
    x: region.x,
    y: region.y,
    w: region.w,
    h: region.h,
    ...(Number.isFinite(region.px) ? { px: region.px } : {}),
    ...(Number.isFinite(region.py) ? { py: region.py } : {}),
    ...(Number.isFinite(region.pw) ? { pw: region.pw } : {}),
    ...(Number.isFinite(region.ph) ? { ph: region.ph } : {}),
  };
}

const source = `/* eslint-disable */
/**
 * Generated from the authorized Wormate.io parent catalog.
 * Source: public/assets/parent-wormate/registry.json
 * Revision: ${registry.revision}
 * Do not hand-edit. Run: node scripts/generate-wormate-parent-catalog.mjs
 */

export const WORMATE_PARENT_REVISION = ${registry.revision} as const;
export const WORMATE_PARENT_SKIN_ATLAS_SIZE = { width: 4096, height: 2048 } as const;
export const WORMATE_PARENT_WEAR_ATLAS_SIZE = { width: 2048, height: 2048 } as const;
export const WORMATE_PARENT_ABILITY_ATLAS_SIZE = { width: 256, height: 128 } as const;
export const WORMATE_PARENT_PORTION_ATLAS_SIZE = { width: 512, height: 512 } as const;

export const WORMATE_PARENT_SKIN_GROUPS = ${JSON.stringify(groups, null, 2)} as const;

export const WORMATE_PARENT_SKINS = ${JSON.stringify(skins, null, 2)} as const;

export const WORMATE_PARENT_EYES = ${JSON.stringify(eyes, null, 2)} as const;
export const WORMATE_PARENT_MOUTHS = ${JSON.stringify(mouths, null, 2)} as const;
export const WORMATE_PARENT_GLASSES = ${JSON.stringify(glasses, null, 2)} as const;
export const WORMATE_PARENT_HATS = ${JSON.stringify(hats, null, 2)} as const;
export const WORMATE_PARENT_PORTIONS = ${JSON.stringify(portions, null, 2)} as const;
export const WORMATE_PARENT_ABILITIES = ${JSON.stringify(abilities, null, 2)} as const;

export const WORMATE_PARENT_REGIONS = ${JSON.stringify(regions, null, 2)} as const;
`;

await writeFile(outputPath, source, "utf8");
console.log(
  `Generated ${skins.length} skins, ${eyes.length + mouths.length + glasses.length + hats.length} wearables, ${portions.length} portions, ${abilities.length} abilities, and ${Object.keys(regions).length} sprite regions at ${outputPath}`,
);
