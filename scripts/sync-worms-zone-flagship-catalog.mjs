import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const assetRoot = resolve(repositoryRoot, "public/assets/parent-worms-zone/store");
const catalogPath = resolve(repositoryRoot, "public/assets/parent-worms-zone/catalog.json");
const generatedPath = resolve(repositoryRoot, "src/game/wormsZoneFlagshipCatalog.generated.ts");
const projectId = "201682";
const gameVersion = "6.26.1";
const catalogEndpoint = `https://store.xsolla.com/api/v2/project/${projectId}/items/virtual_items`;

await mkdir(assetRoot, { recursive: true });

const products = [];
for (let offset = 0; ; offset += 50) {
  const url = new URL(catalogEndpoint);
  url.searchParams.set("limit", "50");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("locale", "en");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Flagship catalog request failed: ${response.status}`);
  const page = await response.json();
  products.push(...page.items);
  if (!page.has_more) break;
}

const premiumWorms = products.filter((item) => item.sku.startsWith("premium_worm"));
if (premiumWorms.length !== 84) {
  throw new Error(`Expected 84 premium worm products, found ${premiumWorms.length}`);
}

const items = new Array(premiumWorms.length);
let cursor = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < premiumWorms.length) {
    const index = cursor;
    cursor += 1;
    const item = premiumWorms[index];
    const placeholder = item.image_url.includes("virtual_item_default_image");
    let localAsset;
    let sha256;
    let byteLength = 0;
    if (!placeholder) {
      const response = await fetch(item.image_url);
      if (!response.ok) throw new Error(`Artwork request failed for ${item.sku}: ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const sourceExtension = extname(new URL(item.image_url).pathname).toLowerCase();
      const extension = sourceExtension === ".webp" ? ".webp" : ".png";
      const fileName = `${item.sku}${extension}`;
      await writeFile(resolve(assetRoot, fileName), bytes);
      localAsset = `/assets/parent-worms-zone/store/${fileName}`;
      sha256 = createHash("sha256").update(bytes).digest("hex").toUpperCase();
      byteLength = bytes.length;
    }
    items[index] = {
      sku: item.sku,
      name: item.name.replace(/^Premium\s+worm\s+/iu, "").replace(/^Premium\s+Worm\s+/u, ""),
      description: item.description,
      sourcePriceUsd: Number(item.price.amount),
      sourcePriceLabel: `$${Number(item.price.amount).toFixed(2)}`,
      sourceImageUrl: item.image_url,
      ...(localAsset ? { localAsset, sha256, byteLength } : {}),
      artworkStatus: placeholder ? "source-placeholder" : "verified-local",
    };
  }
}));

const catalog = {
  sourceDivision: "worms.zone",
  gameVersion,
  importedAt: "2026-08-02",
  projectId,
  sourceCatalogUrl: `${catalogEndpoint}?limit=50&offset=0&locale=en`,
  totalSourceOffers: products.length,
  premiumWormCount: items.length,
  verifiedArtworkCount: items.filter((item) => item.artworkStatus === "verified-local").length,
  items,
};

await mkdir(dirname(catalogPath), { recursive: true });
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
await writeFile(
  generatedPath,
  `/* eslint-disable */\n/** Generated from the authorized worms.zone public flagship catalog. */\nexport const WORMS_ZONE_FLAGSHIP_GAME_VERSION = ${JSON.stringify(gameVersion)} as const;\nexport const WORMS_ZONE_FLAGSHIP_TOTAL_SOURCE_OFFERS = ${products.length} as const;\nexport const WORMS_ZONE_FLAGSHIP_SKINS = ${JSON.stringify(items, null, 2)} as const;\n`,
  "utf8",
);

console.log(
  `Synced ${items.length} flagship premium worm products (${catalog.verifiedArtworkCount} verified local artworks) from ${products.length} public offers.`,
);
