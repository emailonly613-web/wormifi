import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "public", "assets", "parent-worms-zone", "catalog.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

function invariant(condition, message) {
  if (!condition) throw new Error(`Flagship catalog verification failed: ${message}`);
}

invariant(catalog.sourceDivision === "worms.zone", "unexpected source division");
invariant(catalog.gameVersion === "6.26.1", "unexpected source game version");
invariant(catalog.totalSourceOffers === 248, "expected 248 source offers");
invariant(catalog.premiumWormCount === 84, "expected 84 premium worm offers");
invariant(catalog.verifiedArtworkCount === 63, "expected 63 verified artworks");
invariant(Array.isArray(catalog.items) && catalog.items.length === 84, "catalog item count mismatch");

const skus = new Set();
let verifiedCount = 0;
let placeholderCount = 0;

for (const item of catalog.items) {
  invariant(typeof item.sku === "string" && item.sku.startsWith("premium_worm"), `invalid SKU ${item.sku}`);
  invariant(!skus.has(item.sku), `duplicate SKU ${item.sku}`);
  skus.add(item.sku);
  invariant(typeof item.name === "string" && item.name.length > 0, `${item.sku} has no name`);
  invariant(Number.isFinite(item.sourcePriceUsd) && item.sourcePriceUsd > 0, `${item.sku} has invalid price`);
  invariant(item.sourcePriceLabel === `$${item.sourcePriceUsd.toFixed(2)}`, `${item.sku} price label mismatch`);

  if (item.artworkStatus === "source-placeholder") {
    placeholderCount += 1;
    invariant(!item.localAsset && !item.sha256 && !item.byteLength, `${item.sku} placeholder claims a local artwork`);
    continue;
  }

  invariant(item.artworkStatus === "verified-local", `${item.sku} has unknown artwork status`);
  invariant(typeof item.localAsset === "string" && item.localAsset.startsWith("/assets/parent-worms-zone/store/"), `${item.sku} has invalid local asset path`);
  invariant(typeof item.sha256 === "string" && /^[A-F0-9]{64}$/u.test(item.sha256), `${item.sku} has invalid SHA-256`);
  invariant(Number.isInteger(item.byteLength) && item.byteLength > 0, `${item.sku} has invalid byte length`);

  const diskPath = path.join(root, "public", ...item.localAsset.split("/").filter(Boolean));
  const bytes = await readFile(diskPath);
  invariant(bytes.length === item.byteLength, `${item.sku} byte length mismatch`);
  invariant(createHash("sha256").update(bytes).digest("hex").toUpperCase() === item.sha256, `${item.sku} SHA-256 mismatch`);

  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = bytes.subarray(0, 4).toString("ascii") === "RIFF"
    && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  invariant(isPng || isWebp, `${item.sku} is not a valid PNG or WebP asset`);
  verifiedCount += 1;
}

invariant(verifiedCount === 63, `verified artwork count is ${verifiedCount}, expected 63`);
invariant(placeholderCount === 21, `placeholder count is ${placeholderCount}, expected 21`);

console.log("Verified worms.zone flagship catalog: version 6.26.1, 84 offers, 63 exact local artworks, 21 honest source placeholders.");
