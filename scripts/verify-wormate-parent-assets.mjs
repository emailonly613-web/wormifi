import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const assetRoot = resolve(repositoryRoot, "public/assets/parent-wormate");
const expected = new Map([
  ["registry.json", { hash: "57A25035625F6AA57739B89D1CF70262C2108C3BD6503B4B68B7EC5BFB7C7FD1" }],
  ["100700_skins.png", { hash: "0968BD8354F067B7E7422CB1A9F669A2F45277E8312DCE11B4C8C4E7DF5D3D0F", size: [4096, 2048] }],
  ["100700_wear.png", { hash: "8DFCB945C28F332BCE34A07A9405A5D7EB4F4AE4E9A8CF2D9412387A22A13F84", size: [2048, 2048] }],
  ["100700_abilities.png", { hash: "F290DD9E7C4D4B72AAE8164F3F3A8EA8034C77F0279CEF242CF6F3BD982F4458", size: [256, 128] }],
  ["100700_portions.png", { hash: "5D0BB0329AC7E701AF3E2A69879B4000EE9903C0A6546918301F9AFD6417B0F9", size: [512, 512] }],
]);

for (const [name, contract] of expected) {
  const bytes = await readFile(resolve(assetRoot, name));
  const actualHash = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  if (actualHash !== contract.hash) {
    throw new Error(`${name} integrity mismatch: ${actualHash}`);
  }
  if (name.endsWith(".png")) {
    const signature = bytes.subarray(0, 8).toString("hex");
    if (signature !== "89504e470d0a1a0a") throw new Error(`${name} is not a PNG`);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const expectedSize = contract.size;
    if (width !== expectedSize[0] || height !== expectedSize[1]) {
      throw new Error(`${name} dimensions changed: ${width}x${height}`);
    }
  }
}

const registry = JSON.parse(await readFile(resolve(assetRoot, "registry.json"), "utf8"));
if (registry.revision !== 100700) throw new Error(`Unexpected parent revision ${registry.revision}`);
if (registry.skinArrayDict?.length !== 190) {
  throw new Error(`Expected 190 parent skins, found ${registry.skinArrayDict?.length ?? 0}`);
}
if (registry.skinGroupArrayDict?.length !== 9) {
  throw new Error(`Expected 9 parent groups, found ${registry.skinGroupArrayDict?.length ?? 0}`);
}
const exactCounts = [
  ["eyes", registry.eyesDict, 20],
  ["mouths", registry.mouthDict, 94],
  ["glasses", registry.glassesDict, 28],
  ["hats", registry.hatDict, 119],
  ["portions", registry.portionDict, 51],
  ["abilities", registry.abilityDict, 7],
];
for (const [label, dictionary, count] of exactCounts) {
  const actual = Object.keys(dictionary ?? {}).length;
  if (actual !== count) throw new Error(`Expected ${count} parent ${label}, found ${actual}`);
}

console.log("Parent assets verified: revision 100700, 190 skins, 261 wearables, 51 portions, 7 abilities, exact SHA-256 and PNG dimensions.");
